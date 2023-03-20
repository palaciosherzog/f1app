import json
import logging
import sys

import fastf1
from f1functions import *
from flask import Flask, request
from flask_cors import CORS, cross_origin

logging.getLogger().setLevel(logging.INFO)

# this has to be pointing to the file from the relative path of where it was run, so f1analysis
fastf1.Cache.enable_cache('./cache')

app = Flask(__name__)
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'


def col_df(df):
    return {c: json.loads(df[c].to_json(orient="values")) for c in df.columns}


lap_info_cols = ['Driver', 'Time', 'LapTime', 'LapNumber', 'Stint',
                 'Sector1Time', 'Sector2Time', 'Sector3Time', 'Compound',
                 'TyreLife', 'LapStartTime', 'PitOutTime', 'PitInTime', 'TrackStatus', 'IsPersonalBest']


sessions = {}
# TODO: make way for the sessions to clear out after some time


def get_session(year, round, session_name):
    hash_name = f"{year}-{round}-{session_name}"
    if hash_name in sessions:
        return sessions[hash_name]
    # TODO: add a way to get the testing session
    session = fastf1.get_session(
        int(year), round if not round.isdigit() else int(round), session_name)
    session.load(laps=True, telemetry=True, weather=False, messages=False)
    sessions[hash_name] = session
    return session


@app.route("/")
@cross_origin()
def helloWorld():
    return "Hello, cross-origin-world!"


# TODO: could make these all into 'GET' functions, it would make more sense, but for now, this'll do

@app.route("/races", methods=['POST'])
def get_all_session_for_year():
    year = int(request.json['year'])
    es = fastf1.get_event_schedule(year)
    es = es[es.F1ApiSupport]
    return json.dumps({str(row['RoundNumber']): {'EventName': row['EventName'],
                                                 "Sessions": [row[f"Session{i}"] for i in range(1, 6) if row[f"Session{i}"] != "None"]}
                      for _, row in es.iterrows() if row.EventDate <= pd.Timestamp('now') + pd.Timedelta(3, 'days') + pd.Timedelta(1, unit='d')})


@app.route("/laps", methods=["POST"])
def get_laps_for_session():
    content = request.json
    year, round, session_name = content['year'], content['round'], content['session']
    session = get_session(year, round, session_name)
    driver_colors = get_best_colors(session.laps.Driver)
    driver_names = {row['Abbreviation']: row['FullName']
                    for i, row in session.results[['Abbreviation', 'FullName']].iterrows()}
    return json.dumps(
        {driver: {"laps": col_df(laps[lap_info_cols]),
                  "color": driver_colors[driver],
                  "fullName": driver_names[driver]} for driver, laps in session.laps.groupby('Driver')})


@app.route("/comp", methods=["POST"])
def get_comp_for_laps():
    content = request.json
    year, round, session_name, laps, func_args = content['year'], content[
        'round'], content['session'], content['laps'], content['args']
    x_ax, by_sector, comb_laps = func_args['x_axis'], func_args['use_acc'], func_args['comb_laps']
    session = get_session(year, round, session_name)
    sector_dists = None
    comb_lap_dfs = {}
    for l in laps:
        if l[0] == 'COMB':
            comb_lap_dfs[l[1]] = pd.concat(
                [get_lap(session, lap[0], lap[1]) for lap in comb_laps[f"COMB-{l[1]}"]], ignore_index=True)
    driver_laps = [get_lap(session, l[0], l[1]).iloc[0] if l[0] != 'COMB' else average_lap(
        comb_lap_dfs[l[1]]) for l in laps]
    driver_tel = [lap.get_telemetry() if lap[0] != 'COMB' else average_lap_tel(
        get_lap_data(comb_lap_dfs[lap[1]], which="tel")) for lap in driver_laps]
    if by_sector:
        # if len(driver_tel) == 2 and not comb_lap_dfs:
        #     resampled_driver_tel, sector_dists = resample_2_by_sector(
        #         driver_laps[0], driver_laps[1], driver_tel[0], driver_tel[1], x_axis=x_ax, return_dists=True)
        # else:
        resampled_driver_tel, sector_dists = resample_all_by_sector(
            driver_laps, driver_tel, x_axis=x_ax, return_dists=True)
    else:
        # if len(driver_tel) == 2 and not comb_lap_dfs:
        #     resampled_driver_tel = resample_2_by_dist(
        #         driver_tel[0], driver_tel[1], x_axis=x_ax)
        # else:
        resampled_driver_tel = resample_all_by_dist(
            driver_tel, x_axis=x_ax)
    return_info = {
        "laptel": [
            {
                "driver": lap[0],
                "lapNumber": lap[1],
                "tel": col_df(resampled_driver_tel[i])
            }
            for i, lap in enumerate(laps)]}
    if sector_dists is not None:
        return_info['sectorDists'] = sector_dists
    return json.dumps(return_info)
