#!/usr/bin/python
import json
import logging
import sys

import fastf1
from f1functions import *

logging.getLogger(fastf1.__name__).setLevel(logging.CRITICAL)

# this has to be pointing to the file from the relative path of where it was run, so f1analysis
fastf1.Cache.enable_cache('../f1analysis/cache')


def get_all_sessions(year):
    es = fastf1.get_event_schedule(year, include_testing=True)
    es = es[es.F1ApiSupport]
    return {str(row['RoundNumber']): {'EventName': row['EventName'],
                                      "Sessions": [row[f"Session{i}"] for i in range(1, 6) if row[f"Session{i}"] != "None"]}
            for _, row in es.iterrows() if row.EventDate <= pd.Timestamp('now') + pd.Timedelta(3, 'days') + pd.Timedelta(1, unit='d')}


def col_df(df):
    return {c: json.loads(df[c].to_json(orient="values")) for c in df.columns}


lap_info_cols = ['Driver', 'Time', 'LapTime', 'LapNumber', 'Stint',
                 'Sector1Time', 'Sector2Time', 'Sector3Time', 'Compound', 'TyreLife', 'LapStartTime', 'PitOutTime', 'PitInTime', 'TrackStatus']


def main(func_type, json_args):
    arg_dict = json.loads(json_args)

    if func_type == 'races':
        json.dump(get_all_sessions(int(arg_dict['year'])), sys.stdout)
        return

    if func_type == 'laps':
        year, round, session = arg_dict['year'], arg_dict['round'], arg_dict['session']
        session = fastf1.get_session(
            int(year), round if not round.isdigit() else int(round), session) if round != "0" else fastf1.get_testing_session(int(year), 1, int(''.join(c for c in session if c.isdigit())))
        # TODO: make a more reliable way to get the session / testing session and make it a function
        session.load(laps=True, telemetry=False,
                     weather=False, messages=False)
        driver_colors = get_best_colors(session.laps.Driver)
        driver_names = {row['Abbreviation']: row['FullName']
                        for i, row in session.results[['Abbreviation', 'FullName']].iterrows()}
        json.dump(
            {driver: {"laps": col_df(laps[lap_info_cols]),
             "color": driver_colors[driver],
                      "fullName": driver_names[driver]} for driver, laps in session.laps.groupby('Driver')}, sys.stdout)

    if func_type == 'comp':
        year, round, session, laps, func_args = arg_dict['year'], arg_dict[
            'round'], arg_dict['session'], arg_dict['laps'], arg_dict['args']
        x_ax, by_sector, comb_laps = func_args['x_axis'], func_args['use_acc'], func_args['comb_laps']
        session = fastf1.get_session(
            int(year), round if not round.isdigit() else int(round), session) if round != "0" else fastf1.get_testing_session(int(year), 1, int(''.join(c for c in session if c.isdigit())))
        session.load(weather=False, messages=False)
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
            if len(driver_tel) == 2 and not comb_lap_dfs:
                resampled_driver_tel, sector_dists = resample_2_by_sector(
                    driver_laps[0], driver_laps[1], driver_tel[0], driver_tel[1], x_axis=x_ax, return_dists=True)
            else:
                resampled_driver_tel, sector_dists = resample_all_by_sector(
                    driver_laps, driver_tel, x_axis=x_ax, return_dists=True)
        else:
            if len(driver_tel) == 2 and not comb_lap_dfs:
                resampled_driver_tel = resample_2_by_dist(
                    driver_tel[0], driver_tel[1], x_axis=x_ax)
            else:
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
        json.dump(return_info, sys.stdout)
        return


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.stderr.write(
            'Needs to be called with <filename> <function> <JSON arguments>')
    else:
        main(sys.argv[1], sys.argv[2])
