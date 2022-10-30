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
    es = fastf1.get_event_schedule(year, include_testing=False)
    es = es[es.F1ApiSupport]
    return {str(row['RoundNumber']): {'EventName': row['EventName'],
                                      "Sessions": [row[f"Session{i}"] for i in range(1, 6) if row[f"Session{i}"] != "None"]}
            for _, row in es.iterrows() if row.EventDate <= pd.Timestamp('now') + pd.Timedelta(3, 'days') + pd.Timedelta(1, unit='d')}


def get_sector_comp(lap_comp):
    sector_dists, time_diffs = [], []
    for i in ['1', '2', '3']:
        sn = f"Sector{i}SessionTime"
        sdist = get_distance_from_time(
            lap_comp.lap1tel, lap_comp.lap1[sn] - lap_comp.lap1.LapStartTime)
        tdiff = (lap_comp.lap2[sn] - lap_comp.lap1[sn]).total_seconds() - (
            lap_comp.lap2.LapStartTime - lap_comp.lap1.LapStartTime).total_seconds()
        sector_dists.append(sdist)
        time_diffs.append(tdiff if str(tdiff) != 'nan' else None)
    return {'dists': sector_dists, 'timeDiffs': time_diffs}


def col_df(df):
    return {c: json.loads(df[c].to_json(orient="values")) for c in df.columns}


lap_info_cols = ['Driver', 'Time', 'LapTime', 'LapNumber', 'Stint',
                 'Sector1Time', 'Sector2Time', 'Sector3Time', 'Compound', 'TyreLife', 'LapStartTime', 'PitOutTime', 'PitInTime', 'TrackStatus']


def main(func_type, *args):
    if func_type == 'races':
        if len(args) != 1:
            sys.stderr.write('Has the wrong number of arguments for comp')
            return
        year = args[0]
        json.dump(get_all_sessions(int(year)), sys.stdout)
        return

    if func_type == 'drivers':
        if len(args) != 3:
            sys.stderr.write('Has the wrong number of arguments for comp')
            return
        year, round, session = args
        session = fastf1.get_session(
            int(year), round if not round.isdigit() else int(round), session)
        session.load(laps=False, telemetry=False,
                     weather=False, messages=False)
        json.dump(
            {"drivers": col_df(session.results[['Abbreviation', 'FullName']])}, sys.stdout)
    if func_type == 'laps':
        if len(args) != 3:
            sys.stderr.write('Has the wrong number of arguments for comp')
            return
        year, round, session = args
        session = fastf1.get_session(
            int(year), round if not round.isdigit() else int(round), session)
        session.load(laps=True, telemetry=False,
                     weather=False, messages=False)
        driver_colors = get_best_colors(session.laps.Driver)
        driver_names = {row['Abbreviation']: row['FullName'] for i, row in session.results[['Abbreviation', 'FullName']].iterrows()}
        json.dump(
            {driver: {"laps": col_df(laps[lap_info_cols]),
             "color": driver_colors[driver],
             "fullName": driver_names[driver]} for driver, laps in session.laps.groupby('Driver')}, sys.stdout)

    if func_type == 'comp':
        if len(args) != 9:
            sys.stderr.write('Has the wrong number of arguments for comp')
            return
        info_type, year, round, session, driver1, lap1, driver2, lap2, func_args = args
        arg_dict = json.loads(func_args)
        session = fastf1.get_session(
            int(year), round if not round.isdigit() else int(round), session)
        session.load(weather=False, messages=False)
        driver_colors = get_best_colors([driver1, driver2])
        lapcomp = LapComparison(
            lap1=get_lap(session, driver1, lap1),
            lap2=get_lap(session, driver2, lap2),
            color1=driver_colors[driver1],
            color2=driver_colors[driver2])

        if info_type == 'both':
            lapcomp.calculate_speed_comp(x_axis=arg_dict['x_axis'])
            json.dump({"graph": {
                "driver1": driver1,
                "driver2": driver2,
                "driver1color": lapcomp.color1,
                "driver2color": lapcomp.color2,
                "sectorcomp": get_sector_comp(lapcomp),
                "driver1data": col_df(lapcomp.lap1tel),
                "driver2data": col_df(lapcomp.lap2tel),
                "timecomp": col_df(lapcomp.get_graph_comp_info(**arg_dict)[['RelativeDistance', 'Distance', 'Time_diff']])
            },
                "map": {
                "driver1": driver1,
                "driver2": driver2,
                "driver1color": lapcomp.color1,
                "driver2color": lapcomp.color2,
                "colorscale": lapcomp.get_color_scale(),
                "mapdata": col_df(lapcomp.speed_comp[['RelativeDistance', 'Distance', 'X', 'Y', 'Z', 'Speed_diff']])
            }}, sys.stdout)
            return
        if info_type == 'graph':
            json.dump({
                "driver1": driver1,
                "driver2": driver2,
                "driver1color": lapcomp.color1,
                "driver2color": lapcomp.color2,
                "driver1lap": json.loads(lapcomp.lap1[lap_info_cols].to_json()),
                "driver2lap": json.loads(lapcomp.lap2[lap_info_cols].to_json()),
                "sectorcomp": get_sector_comp(lapcomp),
                "driver1data": col_df(lapcomp.lap1tel[['RelativeDistance', 'Distance', 'Speed']]),
                "driver2data": col_df(lapcomp.lap2tel[['RelativeDistance', 'Distance', 'Speed']]),
                "timecomp": col_df(lapcomp.get_graph_comp_info(**json.loads(func_args))[['Distance', 'Time_diff']])
            }, sys.stdout)
            return
        if info_type == 'map':
            lapcomp.calculate_speed_comp(**json.loads(func_args))
            json.dump({
                "driver1": driver1,
                "driver2": driver2,
                "driver1color": lapcomp.color1,
                "driver2color": lapcomp.color2,
                "colorscale": lapcomp.get_color_scale(),
                "mapdata": col_df(lapcomp.speed_comp[['X', 'Y', 'Z', 'Speed_diff']])
            }, sys.stdout)
            return


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.stderr.write(
            'Needs to be called with <filename> <function> <...other arguments>')
    else:
        main(sys.argv[1], *sys.argv[2:])
