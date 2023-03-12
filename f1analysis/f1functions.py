import colorsys

import matplotlib as mpl
import matplotlib.colors as mc
import numpy as np
import pandas as pd
import seaborn as sns
from matplotlib import pyplot as plt
from matplotlib.collections import LineCollection

# VARIABLES
races_so_far = 11
race_names = [
    'Bahrain Grand Prix',
    'Saudi Arabian Grand Prix',
    'Australian Grand Prix',
    'Emilia Romagna Grand Prix',
    'Miami Grand Prix',
    'Spanish Grand Prix',
    'Monaco Grand Prix',
    'Azerbaijan Grand Prix',
    'Canadian Grand Prix',
    'British Grand Prix',
    'Austrian Grand Prix',
    'French Grand Prix',
    'Hungarian Grand Prix',
    'Belgian Grand Prix',
    'Dutch Grand Prix',
    'Italian Grand Prix',
    'Singapore Grand Prix',
    'Japanese Grand Prix',
    'United States Grand Prix',
    'Mexico City Grand Prix',
    'São Paulo Grand Prix',
    'Abu Dhabi Grand Prix'
]

straight_dists = [
    # start distance (relative), end distance (relative), filter function
    # if start distance is more than end distance, we make the distances past the start distance part of the next lap
    (0.91, 0.12),
    (0.7, 0.88),
    (0.36, 0.61),
    (0.91, 0.16),
    (0.3, 0.55),
    (0.89, 0.15),
    (0.425, 0.59),
    (0.11, 0.23),
    (0.62, 0.86),
    (0.68, 0.84),
    (0.1, 0.29)
]

# COLOR STUFF
teams_in_order = ['mclaren', 'red bull', 'ferrari', 'mercedes', 'alpine',
                  'williams', 'aston martin', 'alphatauri', 'alfa romeo', 'haas']
teams_to_drivers = {
    'williams': ['ALB', 'LAT'],
    'alpine': ['ALO', 'OCO'],
    'alfa romeo': ['BOT', 'ZHO'],
    'alphatauri': ['GAS', 'TSU'],
    'mercedes': ['HAM', 'RUS'],
    'aston martin': ['HUL', 'STR', 'VET'],
    'ferrari': ['LEC', 'SAI'],
    'haas': ['MAG', 'MSC'],
    'mclaren': ['NOR', 'RIC'],
    'red bull': ['VER', 'PER']
}
teams_to_colors = {
    'mclaren': ['#ff7f0e'],
    'red bull': ['#1f77b4'],
    'ferrari': ['#d62728'],
    'mercedes': ['#17becf'],
    'alpine': ['#17becf', '#1f77b4', '#bcbd22'],
    'williams': ['#1f77b4', '#7f7f7f'],
    'aston martin': ['#2ca02c'],
    'alphatauri': ['#1f77b4', '#9467bd'],
    'alfa romeo': ['#d62728', '#2ca02c', '#bcbd22', '#8c564b'],
    'haas': ['#7f7f7f', '#d62728', '#1f77b4', '#e377c2']
}
secondary_colors = {
    '#1f77b4': '#aec7e8',
    '#aec7e8': '#ff7f0e',
    '#ff7f0e': '#ffbb78',
    '#ffbb78': '#2ca02c',
    '#2ca02c': '#98df8a',
    '#98df8a': '#d62728',
    '#d62728': '#ff9896',
    '#ff9896': '#9467bd',
    '#9467bd': '#c5b0d5',
    '#c5b0d5': '#8c564b',
    '#8c564b': '#c49c94',
    '#c49c94': '#e377c2',
    '#e377c2': '#f7b6d2',
    '#f7b6d2': '#7f7f7f',
    '#7f7f7f': '#c7c7c7',
    '#c7c7c7': '#bcbd22',
    '#bcbd22': '#dbdb8d',
    '#dbdb8d': '#17becf',
    '#17becf': '#8ac6d0'
}


def get_best_colors(drivers):
    set_drivers, set_colors = set(drivers), set()
    colors = {}
    for t in teams_in_order:
        team_color = next(c for c in teams_to_colors[t] if c not in set_colors)
        for i, d in enumerate([d for d in teams_to_drivers[t] if d in set_drivers]):
            colors[d] = team_color if i < 1 else secondary_colors[team_color]
            set_colors.add(team_color)
    for d in set_drivers:
        if d not in colors:
            colors[d] = '#fff'
    return colors


### GENERAL DATAFRAME FUNCTIONS ###


def timedelta_to_str(td):
    '''
    Returns pd.Timedelta as string formatted in mm:ss.sss.

    :param pd.Timedelta td: timedelta to format
    :return str: Formatted string
    '''
    return f"{int(td.total_seconds()/60):02d}:{td.total_seconds()%60:06.3f}"


def group_consecutive(df, cols):
    '''
    Performs groupby only on consecutive records with same values in cols.

    :param pd.Dataframe df: Dataframe to group
    :param List[string] cols: List of column names to group on
    :return pd.Groupby: groupby object that groups consecutively
    '''
    group_seq = pd.Series(
        zip(*(df[c] for c in cols))) if len(cols) > 1 else df[cols[0]]
    return df.groupby(list((group_seq != group_seq.shift(1)).cumsum()))

### GENERAL FASTF1 FUNCTIONS ###


def get_lap_data(orig_laps, which='car', add_distance=True, add_relative_distance=False,
                 add_driver_ahead=False, add_columns=None, **kwargs):
    '''
    Gets all telemetry information about each lap in orig_laps. Adds distance or 
    relative distance for this lap only, adds additional columns for all 
    general lap information specified. LapNumber and Driver are always added.

    :param fastf1.core.Laps orig_laps: Laps object with all laps to get.
    :param string which: 'car' to get car data, 'tel' or 'telemetry' to get telemetry
    :param bool add_distance: If should call add distance on each lap, defaults to True
    :param bool add_relative_distance: If should call add relative distance on each lap, defaults to False
    :param bool add_driver_ahead: If should call add driver ahead on each lap, defaults to False
    :param List[string] add_columns: Strings containing names of columns in laps to add to each row of telemetry, defaults to None
    :return pd.Dataframe: A dataframe with all telemetry data from the laps.
    '''
    new_laps = pd.DataFrame()
    for i, row in orig_laps.iterrows():  # for i in lap_nums
        cur_lap = row
        if which == 'car':
            cur_lap = cur_lap.get_car_data(**kwargs)
        elif which == 'tel' or which == 'telemetry':
            cur_lap = cur_lap.get_telemetry(**kwargs)
        elif which == 'pos':
            cur_lap = cur_lap.get_pos_data(**kwargs)
        else:
            return
        if add_distance:
            cur_lap = cur_lap.add_distance()
        if add_relative_distance:
            cur_lap = cur_lap.add_relative_distance()
        if add_driver_ahead:
            cur_lap = cur_lap.add_driver_ahead()
        if add_columns:
            for col in add_columns:
                cur_lap[col] = row[col]
        cur_lap['LapNumber'] = row['LapNumber']
        cur_lap['Driver'] = row['Driver']
        new_laps = pd.concat([new_laps, cur_lap], ignore_index=True)
    return new_laps


def add_sectors(lap_overview, laps, add_lap_numbers=False):
    '''
    Adds sectors from lap_overview to laps

    :param fastf1.core.Laps lap_overview: Laps object with general information about laps
    :param fastf1.core.Telemetry laps: the dataframe to add the laps to --> must have SessionTime
    :param bool add_lap_numbers: whether or not to add the lap number alongside, defaults to False
    :return List[pd.Timedelta]: list of times for each sector from lap_overview df
    '''
    time_divs = (pd.Series(
        [lap_overview.iloc[0]['LapStartTime']] +
        list(lap_overview[['Sector1SessionTime', 'Sector2SessionTime',
             'Sector3SessionTime']].to_numpy().flatten())
    ).dt.total_seconds().interpolate(method='linear') * 1e9).astype("timedelta64[ns]")
    if add_lap_numbers:
        laps['LapNumber'] = pd.cut(
            laps.SessionTime, time_divs[::3], labels=list(lap_overview.LapNumber))
    laps['Sector'] = pd.cut(laps.SessionTime, time_divs, labels=[
                            1, 2, 3] * (len(time_divs) // 3), ordered=False)
    return time_divs


def get_pit_stops(laps):
    '''
    Get only the laps with pit stops

    :param fastf1.core.Laps laps: All laps of potential interest
    :return fastf1.core.Laps: laps with pit stop information
    '''
    return laps[(~laps.PitOutTime.isna()) | (~laps.PitInTime.isna())].iloc[1:]


def get_pit_times(pit_laps):
    '''
    Gets a list of pit times from a list of laps

    :param fastf1.core.Lpas pit_laps: Laps of interest
    :return List[Tuple(pd.Timedelta, pd.Timedelta)]: list of pit in, pit out times in terms of session time
    '''
    return [(pi, po) for pi, po in zip(list(pit_laps.PitInTime.dropna()), list(pit_laps.PitOutTime.dropna()))]

# ALIGNMENT FASTF1 FUNCTIONS


def fill_data(orig_df, ind_col, col_col):
    """
    Creates a pivoted dataframe with ind_col as the index and col_col as the
    columns. Fills all numeric columns with linear interpolation of the data. 
    Used to ensure that all col_col use the same time series. 
    """
    df_filled = orig_df.pivot(index=ind_col, columns=col_col)
    num_cols = df_filled.select_dtypes(
        include=['int16', 'int32', 'int64', 'float16', 'float32', 'float64']).columns.tolist()
    df_filled[num_cols] = df_filled[num_cols].interpolate()
    df_filled.bfill(inplace=True)
    return df_filled.stack().reset_index()


def resample_by_other(df1, df2, columns, sort_column):
    df2_to_merge = df2[columns].copy(deep=True)
    df2_to_merge['Source'] = 'merge'
    return df1.merge(df2_to_merge, how='outer').sort_values(sort_column, kind='mergesort') \
        .reset_index(drop=True).fill_missing()


def merge_by_dist(df1, df2, suffixes=('_x', '_y'), x_axis='RelativeDistance'):
    df1a = resample_by_other(
        df1, df2, ['RelativeDistance', 'Distance', 'X', 'Y', 'Z'], x_axis)
    df2a = resample_by_other(
        df2, df1, ['RelativeDistance', 'Distance', 'X', 'Y', 'Z'], x_axis)
    return df1a.merge(df2a, on=['X', 'Y', 'Z'], suffixes=suffixes)

### FASTF1 TIME FUNCTIONS ###


def interpolate_times(times):
    return pd.to_timedelta(times.dt.total_seconds().interpolate('index'), unit='s')


def compare_lap_times(lap1data, lap2data, drop_trailing_nas=True, add_zero=True, x_axis='Distance'):
    lap1times = lap1data[[x_axis, 'Time']].copy(deep=True)
    lap2times = lap2data[[x_axis, 'Time']].copy(deep=True)

    comblaptimes = pd.merge(lap1times, lap2times,
                            on=x_axis, how='outer').set_index(x_axis)
    if add_zero:
        comblaptimes.loc[0] = [pd.Timedelta(
            seconds=0), pd.Timedelta(seconds=0)]
    comblaptimes.sort_index(inplace=True)
    lastnotna = min(comblaptimes[~comblaptimes.Time_y.isna()].index[-1],
                    comblaptimes[~comblaptimes.Time_x.isna()].index[-1])
    comblaptimes['Time_x'] = interpolate_times(comblaptimes.Time_x)
    comblaptimes['Time_y'] = interpolate_times(comblaptimes.Time_y)
    comblaptimes['Time_diff'] = (
        comblaptimes.Time_y - comblaptimes.Time_x).dt.total_seconds()
    if drop_trailing_nas:
        comblaptimes = comblaptimes[(comblaptimes.index <= lastnotna)]
    comblaptimes.reset_index(inplace=True)

    if x_axis == 'RelativeDistance':
        comblaptimes['Distance'] = comblaptimes['RelativeDistance'] * \
            lap1data.Distance.iloc[-1]
    else:
        comblaptimes['RelativeDistance'] = comblaptimes['Distance'] / \
            comblaptimes.Distance.iloc[-1]

    return comblaptimes


def compare_lap_time_accurately(lap1, lap2, lap1data=None, lap2data=None):
    if lap1data is None:
        lap1data = lap1.get_car_data()
    if lap2data is None:
        lap2data = lap2.get_car_data()
    lap_comparison = pd.DataFrame()
    sector_names = ['LapStartTime', 'Sector1SessionTime',
                    'Sector2SessionTime', 'Sector3SessionTime']
    for sn1, sn2 in zip(sector_names, sector_names[1:]):
        sect1 = lap1data.slice_by_time(
            lap1[sn1], lap1[sn2], interpolate_edges=True).add_distance().add_relative_distance()
        sect2 = lap2data.slice_by_time(
            lap2[sn1], lap2[sn2], interpolate_edges=True).add_distance().add_relative_distance()
        sect1['Time'] += lap1[sn1] - lap1['LapStartTime']
        sect2['Time'] += lap2[sn1] - lap2['LapStartTime']
        sect1['RelativeDistance'] = sect1.RelativeDistance.fillna(0)
        sect2['RelativeDistance'] = sect2.RelativeDistance.fillna(0)
        sect_comparison = compare_lap_times(
            sect1, sect2, drop_trailing_nas=False, add_zero=False, x_axis='RelativeDistance')
        sect_comparison['Distance'] = sect_comparison.RelativeDistance * \
            (sect1.Distance.iloc[-1] + sect2.Distance.iloc[-1]) / 2
        if len(lap_comparison) > 0:
            sect_comparison['Distance'] += lap_comparison.Distance.iloc[-1]
        lap_comparison = pd.concat(
            [lap_comparison, sect_comparison], ignore_index=True)
    lap_comparison['RelativeDistance'] = lap_comparison['Distance'] / \
        lap_comparison['Distance'].iloc[-1]
    return lap_comparison


def get_distance_from_time(lap_data, time, relative=False):
    dist_col = 'Distance' if not relative else 'RelativeDistance'
    lap_data = lap_data.set_index('Time')
    try:
        for t in time:
            if t not in lap_data.index:
                lap_data.loc[t, dist_col] = np.nan
    except TypeError:
        lap_data.loc[time, dist_col] = np.nan
    lap_data.sort_index(inplace=True)
    return lap_data.Distance.interpolate('time')[time]


def get_time_from_distance(lap_data, distance, relative=False, sessiontime=False):
    time_col = 'Time' if not sessiontime else 'SessionTime'
    if relative and 'RelativeDistance' not in lap_data.columns:
        distance = distance * lap_data.Distance.iloc[-1]
        relative = False
    lap_data = lap_data.set_index(
        'Distance' if not relative else 'RelativeDistance')
    try:
        for d in distance:
            if d not in lap_data.index:
                lap_data.loc[d, time_col] = np.nan
    except TypeError:
        lap_data.loc[distance, time_col] = np.nan
    lap_data.sort_index(inplace=True)
    return interpolate_times(lap_data[time_col])[distance]

### FASTF1 DIVIDE TRACK FUNCTIONS ###


def loop_rolling(col, window):
    fill_top = list((col.shift(window).fillna(0) + col.shift(window-len(col)).fillna(0))
                    .rolling(window=window).mean().iloc[window:window*2])
    roll = col.rolling(window=window).mean()
    roll.iloc[:window] = fill_top
    return roll


def make_groups(col, window):
    '''If there is a group in a series that is less than window in length,
    makes all the values in the group negative.
    Note: just goes through once, so rolling is best to call before this.'''
    for i, r in col.reset_index().groupby(list((col != col.shift(1)).cumsum())) \
            .agg({'index': ['first', 'last']}).droplevel(level=0, axis=1).iterrows():
        f, l = r['first'], r['last'] + 1
        if l - f < window:
            col.iloc[f:l] = -col.iloc[f:l]
    return col


def get_twitter_sectors(col, num_minisectors=25):
    '''Getting the sectors the same way the twitter guy did it.
    (I think its the same person who made the fastf1 library, and is named 
    Jasper on medium.) An article describes the sector strategy, as detailed:
    https://medium.com/towards-formula-1-analysis/formula-1-data-analysis-
    tutorial-2021-russian-gp-to-box-or-not-to-box-da6399bd4a39
    It just evenly divides the distance into 25 sectors. WRONGLY.
     It counts every second half as part of the next category. '''
    # What is the total distance of a lap?
    total_distance = max(col)

    # Generate equally sized mini-sectors
    minisector_length = total_distance / num_minisectors

    minisectors = [0]
    for i in range(0, (num_minisectors - 1)):
        minisectors.append(minisector_length * (i + 1))

    # Return minisector of every row in the telemetry data
    return col.apply(
        lambda z: (
            minisectors.index(
                min(minisectors, key=lambda x: abs(x-z)))+1
        )
    )


def get_sector_time_list(df, sectors, first_time=None, last_time=None):
    '''Interpolates times to get sector times.
    Sectors for right now should be a number, I'll divide the distance into sectors.'''
    if isinstance(sectors, int):
        sectors = [i/sectors for i in range(sectors+1)]

    timedf = df[['Time', 'RelativeDistance']].set_index('RelativeDistance')
    timedf['Time'] = timedf['Time'].dt.total_seconds()
    timedf = pd.concat(
        [timedf, pd.DataFrame({'Time': [np.nan for _ in sectors]}, index=sectors)]).sort_index()
    if first_time is not None:
        timedf.iloc[0]['Time'] = first_time if isinstance(
            first_time, int) else first_time.total_seconds()
    if last_time is not None:
        timedf.iloc[-1]['Time'] = last_time if isinstance(
            last_time, int) else last_time.total_seconds()
    timedf = timedf.interpolate('index')
    timedf['Time'] = pd.to_timedelta(timedf.Time, unit='s')
    return pd.Series(data=timedf.loc[sectors, 'Time'], index=sectors)


def get_sector_times(lap, laptel=None, sectors=25):
    if laptel is None:
        laptel = lap.get_telemetry()
    times = pd.DataFrame(get_sector_time_list(laptel, sectors, 0, lap.LapTime))
    times['Time'] = times.Time.diff()
    # (times.index * sectors).astype(int)
    times['Sector'] = np.arange(sectors+1)
    times.reset_index(drop=True, inplace=True)
    times.drop(times.index[0], axis=0, inplace=True)
    return times


### FLAT OUT FASTF1 FUNCTIONS ###

def get_straight(laps, i=0):
    '''
    Gets the i-th longest straight (same gear, throttle, break)
    Adds column for if DRS used. (Assumes if any DRS value is 12, it was used.)

    :param laps: fastf1.core.Telemetry data to look inside of 
    :param i: int of which straight to get, defaults to 0
    :return: pd.Dataframe of the i-th longest straight for each lap
    ::note:: this may cause issues because of straights that cross over laps
    '''
    grouped = group_consecutive(
        laps, ['nGear', 'Throttle', 'Brake']).agg(['first', 'last'])
    grouped.loc[:, ('Distance', 'Difference')
                ] = grouped['Distance']['last'] - grouped['Distance']['first']
    grouped.sort_values([('Distance', 'Difference')],
                        ascending=False, inplace=True)

    straights = pd.DataFrame()
    for ln in laps['LapNumber'].unique():
        start_time, end_time = grouped.loc[grouped[(
            'LapNumber', 'first')] == ln].iloc[i].Time
        straight = laps[(laps.LapNumber == ln) & (laps.Time >= start_time) & (
            laps.Time <= end_time)].copy(deep=True)
        straight['Time'] -= straight.iloc[0].Time
        straight['DRSUsed'] = any(straight.DRS == 12)
        straights = pd.concat([straights, straight], ignore_index=True)
    return straights


def get_flat_out_overview(laps_data, crit=['LapNumber', 'nGear']):
    '''
    Gets summary of every flat out section in the telemetry data.
    Groups lap data based on Throttle, Brake, and column names in 'crit'
    and discards all groups without 100% Throttle and no brake. 
    Returns summary of flat out sections.

    :param fastf1.core.Telemetry laps_data: Telemetry data to find flat outs of
    :param list crit: criteria to groupby, defaults to ['LapNumber', 'nGear']
    :return pd.Dataframe: Dataframe with summary of important characteristics
    '''
    def used(x):
        return any(i == 12 for i in x)

    def total(dists):
        res = dists.iloc[-1] - dists.iloc[0]
        if dists.iloc[0] <= dists.iloc[-1]:
            return res
        return max(dists) + res

    grouped = group_consecutive(laps_data, ['Throttle', 'Brake'] + crit).agg({
        'RPM': ['first', 'last', 'mean'],
        'Speed': ['first', 'last', 'mean'],
        'nGear': ['first', 'last'],
        'Throttle': 'first',
        'Brake': 'first',
        'DRS': used,
        'Time': ['first', 'last'],
        'SessionTime': ['first', 'last'],
        'Distance': ['first', 'last', total],
        'LapNumber': 'first'
    })
    # grouped = grouped[(grouped[('Throttle', 'last')] > 95)
    # & (grouped[('Brake', 'first')] == False)]
    grouped.sort_values([('Distance', 'total')], ascending=False, inplace=True)
    return grouped


def get_flat_out(laps, sections, time_adjust=True):
    '''Goes through each row in sections and gets data in laps between 
    ('SessionTime', 'first') and ('SessionTime', 'last').
    If time adjust, makes time based on first sample of data in section.'''
    straights = pd.DataFrame()
    for i, row in sections.iterrows():
        start_time, end_time = row[(
            'SessionTime', 'first')], row[('SessionTime', 'last')]
        straight = laps[(laps.SessionTime >= start_time) & (
            laps.SessionTime <= end_time)].copy(deep=True)
        if time_adjust:
            straight['Time'] -= straight.iloc[0].Time
        straight['Group'] = i
        straights = pd.concat([straights, straight], ignore_index=True)
    return straights


def withinstddev(col):
    '''
    Select all values within a column within a standard deviation.

    :param pd.Series col: Values in column as pd.Series.
    :return pd.Series: Boolean mask to use for selection.
    '''
    mean = np.mean(col)
    std = np.std(col)
    return (col < mean + std) & (col > mean - std)


def select_flat_outs(laps_data, top=10, drs=False, limit_std_dev=False):
    ''' Unused function to select flat outs within a standard deviation.'''
    flat_outs = get_flat_out_overview(laps_data)
    drs_selector = flat_outs[('DRS', 'any_drs')
                             ] if drs else ~flat_outs[('DRS', 'any_drs')]
    selected_flat_outs = flat_outs[drs_selector].iloc[:top]
    if limit_std_dev:
        selected_flat_outs = selected_flat_outs[withinstddev(selected_flat_outs[(
            'Speed', 'first')]) & withinstddev(selected_flat_outs[('Speed', 'last')])]
    return get_flat_out(laps_data, selected_flat_outs)


### PLOTTING FUNCTIONS ###

def set_mpl_sizes(SMALL_SIZE=16, MEDIUM_SIZE=20, BIGGER_SIZE=24, FIG_SIZE=(20, 10)):
    '''Automatically sets a variety of font sizes, for rendering larger
    plots with large, readable text.'''
    plt.rc('font', size=SMALL_SIZE)          # controls default text sizes
    plt.rc('axes', titlesize=SMALL_SIZE)     # fontsize of the axes title
    plt.rc('axes', labelsize=MEDIUM_SIZE)    # fontsize of the x and y labels
    plt.rc('axes', titlesize=BIGGER_SIZE)
    plt.rc('xtick', labelsize=SMALL_SIZE)    # fontsize of the tick labels
    plt.rc('ytick', labelsize=SMALL_SIZE)    # fontsize of the tick labels
    plt.rc('legend', fontsize=SMALL_SIZE)    # legend fontsize
    plt.rc('figure', titlesize=BIGGER_SIZE)  # fontsize of the figure title
    plt.rc('figure', figsize=FIG_SIZE)


def plot_comparison(ax, lap1data, lap2data, filter_func=None, ax2=None,
                    lap1_color='white', lap2_color='red', diff_color='orange',
                    set_labels=True, add_zero=True):
    comblaptimes = compare_lap_times(lap1data, lap2data, add_zero=add_zero)
    if filter_func is not None:
        comblaptimes = filter_func(comblaptimes)

    if ax2 is None:
        ax.set_zorder(1)
        ax.patch.set_visible(False)

        ax2 = ax.twinx()
        ax2.set_zorder(0)
        ax2.patch.set_visible(True)

    if diff_color is not None:
        sns.lineplot(x='Distance', y='Time_diff',
                     data=comblaptimes, color=diff_color, ax=ax2)
        ax2.fill_between(comblaptimes.Distance.values,
                         comblaptimes.Time_diff.values, alpha=0.25, color=diff_color)

    if lap1_color is not None:
        sns.lineplot(x='Distance', y='Speed',
                     data=lap1data, color=lap1_color, ax=ax)
    if lap2_color is not None:
        sns.lineplot(x='Distance', y='Speed',
                     data=lap2data, color=lap2_color, ax=ax)

    if set_labels:
        ax.set_xlabel('Distance (m)')
        ax.set_ylabel('Speed (km/h)')
        ax2.set_ylabel('Time Difference (s)')

    return ax, ax2


def plot_track(ax, x, y, color, min_col, max_col, colormap):
    ''' Plots x and y on lines with colors'''
    # Create and plot segments
    points = np.array([x, y]).T.reshape(-1, 1, 2)
    segments = np.concatenate([points[:-1], points[1:]], axis=1)
    lc = LineCollection(segments, cmap=colormap, norm=plt.Normalize(
        min_col, max_col), linestyle='-', linewidth=5)

    # Set the values used for colormapping
    lc.set_array(color)

    # Merge all line segments together
    line = ax.add_collection(lc)
    return line,


def plot_dataframe(df, color_col, colormap=mpl.cm.plasma, eql_sides=False, min_col=None, max_col=None,
                   title=None, legend_cats=None, txt=None, return_legend=False, arrow=False, figsize=(12, 12)):
    # Create figure and axes
    fig, ax = plt.subplots(sharex=True, sharey=True, figsize=figsize, dpi=60)
    if title:
        fig.suptitle(title, size=24, y=0.97)

    # Adjust margins and turn of axis
    plt.axis('equal')
    plt.subplots_adjust(left=0.1, right=0.9, top=0.9, bottom=0.12)
    ax.axis('off')

    # Determine max and min colors for normalization
    if min_col is None:
        min_col, max_col = df[color_col].min(), df[color_col].max()
    if eql_sides:
        m_col = max(abs(min_col), abs(max_col))
        min_col, max_col = -m_col, m_col

    # Create background track line
    ax.plot(df['X'], df['Y'], color='black',
            linestyle='-', linewidth=16, zorder=0)

    # Call to plot colored line of track
    plot_track(ax, df['X'], df['Y'], df[color_col], min_col, max_col, colormap)

    if arrow:
        # adds arrow and line to indicate starting place
        x1, x2, y1, y2 = df['X'].iloc[0], df['X'].iloc[10], df['Y'].iloc[0], df['Y'].iloc[10]

        size = 600
        mag = size / (((x2-x1)**2 + (y2-y1)**2)**0.5)
        slope = (y2-y1)/(x2-x1)
        dy = (size**1.75/(slope**2+1))**0.5
        dx = -slope*dy
        ax.plot([x1+dx, x1-dx], [y1+dy, y1-dy], color='white',
                linestyle='-', linewidth=size/100)
        if abs(slope) > 1:
            x1, x2 = x1 + size * 1.2, x2 + size * 1.2
        else:
            y1, y2 = y1 + size * 1.2, y2 + size * 1.2
        ax.arrow(x1, y1, (x2-x1)*mag, (y2-y1)*mag, width=size/4,
                 head_width=size*3/4, head_length=size, fc='white', ec='white')

    if legend_cats:
        # Create colorbar for legend
        cbaxes = fig.add_axes([0.9, 0.15, 0.02, 0.75])
        normlegend = mpl.colors.Normalize(vmin=min_col, vmax=max_col)
        legend = mpl.colorbar.ColorbarBase(
            cbaxes, norm=normlegend, cmap=colormap, orientation="vertical")
        if legend_cats != 'default':
            legend.ax.set_yticks([min_col/2, max_col/2],
                                 legend_cats, fontsize=14)

    if txt:
        # adds yellow box with whatever text is passed
        ax.text(0.05, 0.95, txt, transform=ax.transAxes, fontsize=16,
                verticalalignment='top', bbox={'facecolor': '#ffcc00', 'lw': 0},
                color="#000000", fontname='Consolas')

    if return_legend and legend_cats:
        return fig, ax, legend

    return fig, ax


def add_vert_line(ax, xval, col='yellow', text=None, yval=275, **kwargs):
    ax.axvline(x=xval, color=col, linestyle='-.')
    if text is not None:
        x_min, x_max = ax.get_xlim()
        adj = (x_max - x_min) / 100
        if 'horizontalalignment' in kwargs:
            if kwargs['horizontalalignment'] == 'right':
                adj = -adj
            elif kwargs['horizontalalignment'] == 'center':
                adj = 0
        ax.text(xval + adj, yval, text, color=col, **kwargs)
    return xval


def adjust_lightness(color, amount=0.5):
    try:
        c = mc.cnames[color]
    except:
        c = color
    c = colorsys.rgb_to_hls(*mc.to_rgb(c))
    nc = colorsys.hls_to_rgb(c[0], amount, 0.7)
    return mc.to_hex(nc)


def separate_colors(color1, color2, hadj=0.125):
    '''Checks difference between colors, if not very large makes the difference bigger.
    Uses 0.125 as the amount because it keeps the colors in the same 'range'.'''
    h1, _, _ = colorsys.rgb_to_hls(*mc.to_rgb(color1))
    h2, l, s = colorsys.rgb_to_hls(*mc.to_rgb(color2))
    if abs(h1-h2) < hadj or 1-abs(h1-h2) < hadj:
        return color1, mc.to_hex(colorsys.hls_to_rgb((h2 + hadj) % 1, l, s))
    return color1, color2


def average_lap_tel(lap_data, rolling=True):
    comb_driver = ''.join(lap_data.Driver.unique())
    comb_driver_ahead = ''.join(lap_data.DriverAhead.unique())
    lap_data.sort_values('RelativeDistance', inplace=True)
    section_num = pd.cut(lap_data.RelativeDistance,
                         np.linspace(0, 1, 300), labels=False)
    section_num.loc[lap_data.drop_duplicates(
        ['Driver', 'LapNumber']).index] -= 1
    section_num.loc[lap_data.drop_duplicates(
        ['Driver', 'LapNumber'], keep='last').index] += 1
    lap_data.drop(['Source', 'Driver', 'DriverAhead',
                  'Status'], axis=1, inplace=True)
    avg_lap = lap_data.groupby(section_num).mean(numeric_only=False).reset_index(
        drop=True)  # around 300 samples in a standard lap
    if rolling:
        new_avg_lap = avg_lap.drop(['Date', 'SessionTime', 'Time'], axis=1)
        avg_lap[new_avg_lap.columns] = new_avg_lap.rolling(
            window=5, min_periods=1, center=True).mean()
    avg_lap['Source'] = 'average'
    avg_lap['Driver'] = comb_driver
    avg_lap['DriverAhead'] = comb_driver_ahead
    return avg_lap


def average_lap(laps):
    new_lap = laps.select_dtypes('number').mean()
    non_num = laps.select_dtypes('object').apply(
        lambda x: ''.join(x.astype(str).unique()))
    return pd.concat([new_lap, non_num])


class LapComparison:
    def __init__(self, sess=None, label1=None, label2=None, lap1=None, lap2=None, color1=None, color2=None, color_sep=0.125):
        if label1 is None and lap1 is None:
            raise Exception('One of label1 or lap1 is required')
        if label2 is None and lap2 is None:
            raise Exception('One of label1 or lap2 is required.')
        if (lap1 is None or lap2 is None) and sess is None:
            raise Exception("sess is required if drivers are provided")

        self.sess_name = f"\n{sess.event.OfficialEventName} - {sess.name}" if sess is not None else ""

        if isinstance(lap1, pd.DataFrame):
            self.lap1 = average_lap(lap1)
            self.lap1tel = average_lap_tel(get_lap_data(lap1, which='tel'))
        else:
            self.lap1 = lap1 if lap1 is not None else sess.laps.pick_driver(
                label1).pick_fastest()
            self.lap1tel = self.lap1.get_telemetry().reset_index(drop=True)
        if isinstance(lap2, pd.DataFrame):
            self.lap2 = average_lap(lap2)
            self.lap2tel = average_lap_tel(get_lap_data(lap2, which='tel'))
        else:
            self.lap2 = lap2 if lap2 is not None else sess.laps.pick_driver(
                label2).pick_fastest()
            self.lap2tel = self.lap2.get_telemetry().reset_index(drop=True)
        self.label1 = label1 if label1 is not None else self.lap1['Driver']
        self.label2 = label2 if label2 is not None else self.lap2['Driver']
        self.color1 = color1 if color1 is not None else '#f00'
        self.color2 = color2 if color2 is not None else '#00f'
        self.color1, self.color2 = separate_colors(
            self.color1, self.color2, color_sep)
        self.speed_comp = None
        self.speed_clip = (None, None)

    def calculate_speed_comp(self, clip=False, x_axis='RelativeDistance'):
        self.speed_comp = merge_by_dist(
            self.lap1tel, self.lap2tel, x_axis=x_axis)
        self.speed_comp['Speed_diff'] = self.speed_comp.Speed_x - \
            self.speed_comp.Speed_y
        self.speed_comp['RelativeDistance'] = self.speed_comp['RelativeDistance_x']
        self.speed_comp['Distance'] = self.speed_comp['Distance_x']
        # TODO: should we average the other one?
        if clip:
            if isinstance(clip, tuple):
                min_speed, max_speed = clip
            else:
                mn, st = self.speed_comp.Speed_diff.mean(), self.speed_comp.Speed_diff.std()
                min_speed, max_speed = mn - clip * st, mn + clip * st
            self.speed_comp['Speed_diff'] = np.clip(
                self.speed_comp.Speed_x - self.speed_comp.Speed_y, min_speed, max_speed)
            self.speed_clip = (min_speed, max_speed)
        else:
            self.speed_clip = (None, None)

    def get_color_scale(self):
        return [adjust_lightness(self.color2, 0.25), adjust_lightness(self.color2),
                adjust_lightness(self.color2, 0.75), adjust_lightness(
                    self.color2, 0.875), '#ffffff',
                adjust_lightness(self.color1, 0.875), adjust_lightness(
                    self.color1, 0.75),
                adjust_lightness(self.color1), adjust_lightness(self.color1, 0.25)]

    def get_map_comp(self, clip=False, arrow=False, x_axis='RelativeDistance', figsize=(12, 12)):
        if self.speed_comp is None or clip != self.speed_clip:
            print("Calculated Speed Comp")
            self.calculate_speed_comp(clip, x_axis=x_axis)
        cols = [adjust_lightness(self.color2, 0.25), adjust_lightness(self.color2),
                adjust_lightness(self.color2, 0.75), adjust_lightness(
                    self.color2, 0.875), '#ffffff',
                adjust_lightness(self.color1, 0.875), adjust_lightness(
                    self.color1, 0.75),
                adjust_lightness(self.color1), adjust_lightness(self.color1, 0.25)]
        cm = mc.LinearSegmentedColormap.from_list(
            f"{self.label1}{self.label2}cm", cols)
        lap1time, lap2time = self.lap1['LapTime'], self.lap2['LapTime']
        if pd.isna(lap1time):
            lap1time = self.lap1['Time'] - self.lap1['LapStartTime']
        if pd.isna(lap2time):
            lap2time = self.lap2['Time'] - self.lap2['LapStartTime']
        speed_title = "Raw Speed" if self.speed_clip[
            0] is None else f"Speed Clipped From {self.speed_clip[0]:.2f} To {self.speed_clip[1]:.2f}"
        fig, ax, leg = plot_dataframe(self.speed_comp, 'Speed_diff', cm, eql_sides=True, min_col=self.speed_clip[0], max_col=self.speed_clip[1],
                                      title=f"{self.label1} vs {self.label2} {speed_title}{self.sess_name}", legend_cats='default',
                                      txt=f"{self.label1} {timedelta_to_str(lap1time)}\n{self.label2} {timedelta_to_str(lap2time)}", return_legend=True,
                                      arrow=arrow, figsize=figsize)
        leg.ax.set_ylabel(
            f"{self.label2} faster <-- | Speed Difference (km/h) | --> {self.label1} faster")
        return fig

    def plot_map(self, clip=False, arrow=False, figsize=(12, 12)):
        if self.speed_comp is None or clip != self.speed_clip:
            print("Calculated Speed Comp")
            self.calculate_speed_comp(clip)
        cols = [adjust_lightness(self.color2, 0.25), adjust_lightness(self.color2),
                adjust_lightness(self.color2, 0.75), adjust_lightness(
                    self.color2, 0.875), '#ffffff',
                adjust_lightness(self.color1, 0.875), adjust_lightness(
                    self.color1, 0.75),
                adjust_lightness(self.color1), adjust_lightness(self.color1, 0.25)]
        cm = mc.LinearSegmentedColormap.from_list(
            f"{self.label1}{self.label2}cm", cols)
        lap1time, lap2time = self.lap1['LapTime'], self.lap2['LapTime']
        if pd.isna(lap1time):
            lap1time = self.lap1['Time'] - self.lap1['LapStartTime']
        if pd.isna(lap2time):
            lap2time = self.lap2['Time'] - self.lap2['LapStartTime']
        speed_title = "Raw Speed" if self.speed_clip[
            0] is None else f"Speed Clipped From {self.speed_clip[0]:.2f} To {self.speed_clip[1]:.2f}"
        fig, ax, leg = plot_dataframe(self.lap1tel, 'SectorTime_diff', cm, eql_sides=True, min_col=self.speed_clip[0], max_col=self.speed_clip[1],
                                      title=f"{self.label1} vs {self.label2} {speed_title}{self.sess_name}", legend_cats='default',
                                      txt=f"{self.label1} {timedelta_to_str(lap1time)}\n{self.label2} {timedelta_to_str(lap2time)}", return_legend=True,
                                      arrow=arrow, figsize=figsize)
        leg.ax.set_ylabel(
            f"{self.label2} faster <-- | Time Difference (s) | --> {self.label1} faster")
        return fig

    def get_graph_comp_info(self, x_axis='Distance', use_acc=False, smooth=False, limit_time_comp=None):
        lapcomp = compare_lap_time_accurately(self.lap1, self.lap2) if use_acc else compare_lap_times(
            self.lap1tel, self.lap2tel, x_axis=x_axis)
        if limit_time_comp:
            lapcomp = limit_time_comp(lapcomp)
        if smooth:
            lapcomp['Time_diff'] = lapcomp.Time_diff.rolling(window=21 if isinstance(
                smooth, bool) else smooth, min_periods=1, center=True).mean()
        return lapcomp

    def get_graph_comp(self, x_axis='Distance', use_acc=False, show_sectors=False,
                       plot_speed_comp=False, include_others=False, smooth=False, switch_yaxes=False, limit_time_comp=None,
                       other_lines=None, figsize=(20, 20)):
        if include_others:
            fig, axes = plt.subplots(figsize=figsize, nrows=5, gridspec_kw={
                                     'height_ratios': [6, 1, 1, 1, 1]})
        else:
            fig, ax = plt.subplots(figsize=(figsize[0], figsize[1]/10*6))
            axes = [ax]

        fig.suptitle(
            f"{self.label1} vs {self.label2} Speed{self.sess_name}", size=24, y=0.97)

        ax2 = axes[0].twinx()
        if switch_yaxes:
            axes[0], ax2 = ax2, axes[0]

        sns.lineplot(x=x_axis, y='Speed', data=self.lap1tel,
                     label=self.label1, ax=axes[0], color=self.color1)
        sns.lineplot(x=x_axis, y='Speed', data=self.lap2tel,
                     label=self.label2, ax=axes[0], color=self.color2)
        lapcomp = compare_lap_time_accurately(self.lap1, self.lap2) if use_acc else compare_lap_times(
            self.lap1tel, self.lap2tel, x_axis=x_axis)
        if limit_time_comp:
            lapcomp = limit_time_comp(lapcomp)
        if smooth:
            lapcomp['Time_diff'] = lapcomp.Time_diff.rolling(window=21 if isinstance(
                smooth, bool) else smooth, min_periods=1, center=True).mean()
        time_line = sns.lineplot(x=x_axis, y='Time_diff', data=lapcomp.dropna(
        ).reset_index(drop=True), color='white', ax=ax2)
        ax2.set_ylabel(
            f"{self.label2} ahead <-- | Time Difference (s) | --> {self.label1} ahead")
        if plot_speed_comp:
            ax3 = axes[0].twinx()
            sns.lineplot(x=f"{x_axis}_x", y='Speed_diff', data=self.speed_comp,
                         label='Speed Diff', ax=ax3, color='yellow')

        if show_sectors:
            for n in ['Sector1SessionTime', 'Sector2SessionTime', 'Sector3SessionTime']:
                sdist = get_distance_from_time(
                    self.lap1tel, self.lap1[n] - self.lap1.LapStartTime, relative=x_axis == 'RelativeDistance')
                tdiff = f'{((self.lap2[n] - self.lap1[n]).total_seconds() - (self.lap2.LapStartTime - self.lap1.LapStartTime).total_seconds()):+.3f}'
                add_vert_line(ax=axes[0], xval=sdist,
                              col='white', text=tdiff, yval=325, size=16)

        if other_lines:
            from bisect import bisect
            for d in other_lines:
                td = lapcomp.loc[bisect(lapcomp.Distance, d), 'Time_diff']
                tdiff = f'{td:+.3f}'
                add_vert_line(ax=axes[0], xval=d, col='white',
                              text=tdiff, yval=325, size=16)

        if include_others:
            sns.lineplot(x=x_axis, y='DRS', data=self.lap1tel,
                         label=self.label1, ax=axes[1], color=self.color1)
            sns.lineplot(x=x_axis, y='DRS', data=self.lap2tel,
                         label=self.label2, ax=axes[1], color=self.color2)

            sns.lineplot(x=x_axis, y='nGear', data=self.lap1tel,
                         label=self.label1, ax=axes[2], color=self.color1)
            sns.lineplot(x=x_axis, y='nGear', data=self.lap2tel,
                         label=self.label2, ax=axes[2], color=self.color2)

            sns.lineplot(x=x_axis, y='Throttle', data=self.lap1tel,
                         label=self.label1, ax=axes[3], color=self.color1)
            sns.lineplot(x=x_axis, y='Throttle', data=self.lap2tel,
                         label=self.label2, ax=axes[3], color=self.color2)

            sns.lineplot(x=x_axis, y='Brake', data=self.lap1tel,
                         label=self.label1, ax=axes[4], color=self.color1)
            sns.lineplot(x=x_axis, y='Brake', data=self.lap2tel,
                         label=self.label2, ax=axes[4], color=self.color2)

        for ax in axes:
            ax.legend()
        #ax2.legend([time_line.get_children()[0]], 'Time Difference')

        plt.tight_layout()
        return fig

    def get_driver_graphs(self, map={}, graph={}):
        return self.get_map_comp(**map), self.get_graph_comp(**graph)


# NEW STUFF
def hampel(vals_orig, k=7, t0=3):
    '''
    https://stackoverflow.com/questions/46819260/filtering-outliers-how-to-make-median-based-hampel-function-faster
    vals: pandas series of values from which to remove outliers
    k: size of window (including the sample; 7 is equal to 3 on either side of value)
    '''

    # Make copy so original not edited
    vals = vals_orig.copy()

    # Hampel Filter
    L = 1.4826
    rolling_median = vals.rolling(window=k, center=True).median()
    def MAD(x): return np.median(np.abs(x - np.median(x)))
    rolling_MAD = vals.rolling(window=k, center=True).apply(MAD)
    threshold = t0 * L * rolling_MAD
    difference = np.abs(vals - rolling_median)

    '''
    Perhaps a condition should be added here in the case that the threshold value
    is 0.0; maybe do not mark as outlier. MAD may be 0.0 without the original values
    being equal. See differences between MAD vs SDV.
    '''

    outlier_idx = difference > threshold
    vals[outlier_idx] = rolling_median[outlier_idx]
    return (vals)


class RacePace:
    def __init__(self, session=None, laps=None, num_laps=None, fuel_load=100, driver_colors=None, tyre_markers=None):
        '''Initialize race pace with all laps from a session, or with only the laps provided.'''
        if session is None and laps is None:
            raise Exception("Session or laps must be provided")
        if session is not None:
            if laps is None:
                laps = session.laps
            else:
                print("Session will be ignored in favor of laps")
        self.laps = laps.copy(deep=True)
        self.laps['LapTime'] = self.laps.LapTime.fillna(
            self.laps.Time - self.laps.LapStartTime)
        self.num_laps = num_laps if num_laps is not None else int(
            self.laps.LapNumber.max())
        self.fuel_load = fuel_load
        if driver_colors is None:
            self.driver_colors = get_best_colors(laps.Driver.unique())
        else:
            self.driver_colors = driver_colors
        self.tyre_markers = tyre_markers if tyre_markers is not None else {
            'SOFT': 'o', 'MEDIUM': 'D', 'HARD': 'v', 'INTERMEDIATE': 'P', 'WET': 's', 'UNKNOWN': 'X'}

    def _copy(self, new_laps):
        '''
        Creates deep copy of object with laps & every other variable copied over
        '''
        return RacePace(laps=new_laps, num_laps=self.num_laps, fuel_load=self.fuel_load,
                        driver_colors=self.driver_colors, tyre_markers=self.tyre_markers)

    def deep_copy(self):
        '''
        Creates deep copy of RacePace object.

        :return RacePace: New RacePace object with identical information.
        '''
        return self._copy(self.laps)

    def mark_outliers(self, algorithm):
        '''
        Adds T/F column that indicates whether or not the data point is an outlier.

        :param str algorithm: 'std' or 'hampel', the algorithm that will be used to determine outliers
        '''
        drop_inds = pd.Index([])
        for d, g in self.laps.groupby('Driver'):
            if algorithm == 'std':
                outlier_inds = g.LapTime[abs(
                    g.LapTime - np.mean(g.LapTime)) > 3 * np.std(g.LapTime)].index
            elif algorithm == 'hampel':
                outlier_inds = g[g.LapTime.dt.total_seconds() != hampel(
                    g.LapTime.dt.total_seconds(), k=self.num_laps//5)].index
            drop_inds = drop_inds.append(outlier_inds)
        self.laps['Outlier'] = False
        self.laps.loc[drop_inds, 'Outlier'] = True

    def prune_laps(self, box_laps=True, track_status="1", outlier_laps=False, prune_func=None, inplace=False):
        '''
        Removes all laps from data with any unwanted feature.

        :param bool box_laps: whether or not to remove out-laps and in-laps, defaults to True
        :param str track_status: which track status is needed to keep laps, defaults to "1", other options include "any" or some other thing to pass to fastf1
        :param object outlier_laps: whether or not to remove outlier laps, defaults to False, "hampel" will use hampel to remove odd laps, can also remove based on std deviation?
        :param function prune_func: custom function applied to laps object to remove unwanted laps, should return new object with unwanted laps removed, defaults to None
        :param bool inplace: whether or not to perform the operation in place, defaults to False
        '''
        pruned_laps = self.laps
        if box_laps:
            pruned_laps = pruned_laps[pruned_laps.PitOutTime.isna(
            ) & pruned_laps.PitInTime.isna()]
        if track_status != 'any':
            pruned_laps = pruned_laps[pruned_laps.TrackStatus == '1']
        if prune_func is not None:
            pruned_laps = prune_func(pruned_laps)
        if outlier_laps in ['hampel', 'std']:
            drop_inds = pd.Index([])
            for d, g in pruned_laps.groupby('Driver'):
                if outlier_laps == 'std':
                    outlier_inds = g.LapTime[abs(
                        g.LapTime - np.mean(g.LapTime)) > 3 * np.std(g.LapTime)].index
                elif outlier_laps == 'hampel':
                    outlier_inds = g[g.LapTime.dt.total_seconds() != hampel(
                        g.LapTime.dt.total_seconds(), k=self.num_laps//5)].index
                drop_inds = drop_inds.append(outlier_inds)
            pruned_laps = pruned_laps.drop(drop_inds)
        if inplace == 'keep':
            self.laps['Outlier'] = False
            self.laps.loc[~self.laps.index.isin(
                pruned_laps.index), 'Outlier'] = True
            return
        pruned_laps.reset_index(drop=True, inplace=True)
        if inplace:
            self.laps = pruned_laps
        else:
            return self._copy(pruned_laps)

    def add_gap_to_leader(self, min_lap=None, max_lap=None):
        min_lap, max_lap = int(self.laps.LapNumber.min()) if min_lap is None else min_lap, int(
            self.laps.LapNumber.max()) if max_lap is None else max_lap
        #print(min_lap, max_lap)
        norm_start = self.laps[self.laps.LapNumber ==
                               min_lap].LapStartTime.iloc[0]
        norm_end = self.laps[self.laps.LapNumber ==
                             max_lap].sort_values('Time').Time.iloc[0]
        #print(norm_start, norm_end)

        #times_adj = np.linspace(norm_start.total_seconds(), norm_end.total_seconds(), int(max_lap-min_lap)+1)
        times_adj = np.linspace(norm_start.total_seconds(
        ), norm_end.total_seconds(), int(max_lap-min_lap)+2)[1:]
        # print(times_adj)
        # print(list(self.laps[self.laps.Driver == 'VER'].Time.dt.total_seconds()))
        for i, g in self.laps.groupby('Driver'):
            # print(g.Time.dt.total_seconds())
            #print(pd.Series(times_adj[:len(g)], g.index))
            self.laps.loc[g.index, 'GapToLeader'] = g.Time.dt.total_seconds(
            ) - pd.Series(times_adj[:len(g)], g.index)

    def plot_race_trace(self, add_best_fit_lines=False):
        fig, ax = plt.subplots()

        if add_best_fit_lines:
            polys = {}
            for i, g in self.laps.pick_wo_box().groupby(['Driver', 'Stint']):
                x = g.LapNumber
                y = g.GapToLeader
                poly = np.poly1d(np.polyfit(x, y, 1))
                polys[i] = poly
                ax.plot(x, poly(x), color=self.driver_colors[i[0]])

        sns.lineplot(data=self.laps, x='LapNumber', y='GapToLeader',
                     hue='Driver', palette=self.driver_colors, legend=False)
        sns.scatterplot(data=self.laps, x='LapNumber', y='GapToLeader', hue='Driver',
                        palette=self.driver_colors, style='Compound', markers=self.tyre_markers, s=80)

        if 'Outlier' in self.laps.columns:
            sns.scatterplot(data=self.laps[self.laps.Outlier].reset_index(drop=True), x='LapNumber', y='GapToLeader', hue='Driver',
                            palette=self.driver_colors, style='Compound', markers=self.tyre_markers, s=80, linewidth=2, edgecolor='lime', legend=False)

        ax.legend(loc='upper left')
        ax.invert_yaxis()
        return fig, ax

    def plot_lap_times(self, add_trend=False):
        fig, ax = plt.subplots()
        if add_trend:
            poly = np.poly1d(np.polyfit(self.laps.LapNumber,
                             self.laps.LapTime.dt.total_seconds(), 1))
            ax.plot(self.laps.LapNumber, pd.to_timedelta(
                poly(self.laps.LapNumber), unit='s'), color='white')
        sns.lineplot(data=self.laps, x='LapNumber', y='LapTime',
                     hue='Driver', palette=self.driver_colors, legend=False)
        sns.scatterplot(data=self.laps, x='LapNumber', y='LapTime', hue='Driver',
                        palette=self.driver_colors, style='Compound', markers=self.tyre_markers, s=80)
        if 'Outlier' in self.laps.columns:
            sns.scatterplot(data=self.laps[self.laps.Outlier].reset_index(drop=True), x='LapNumber', y='LapTime', hue='Driver',
                            palette=self.driver_colors, style='Compound', markers=self.tyre_markers, s=80, linewidth=2, edgecolor='lime', legend=False)
        ax.invert_yaxis()
        return fig, ax

    def correct_lap_times(self, new_lap_times, start_time):
        new_times = start_time + new_lap_times.cumsum()
        new_start_times = new_times.shift(1)
        new_start_times.iloc[0] = start_time
        return new_lap_times, new_times, new_start_times

    def calculate_fuel_corrected(self, inplace=False, red_flags=None, fuel_load=None):
        '''
        Adjusts times for assumed fuel laod in terms of base timing.
        This will fill in lap times assuming lap is from LapStartTime to LapTime
        Then it will ajdust these times with the basic fuel correction.
        Then it will adjust LapStartTime and LapTime to align with this, based on the unified start time.
        '''
        # Notes about fuel correction:
        # You assume the cars finish with virtually no fuel. You know the maximum fuel they are allowed to use and assume they use most/all of that. You assume that the laptime loss is 0.3 seconds for every 10kg which is roughly the figure used for the last 30 years. You add that time to the actual lap time.

        # You don't take into account, probably, that a lighter car uses less fuel. You assume every lap uses the same fuel (but you might account for safety car fuel usage perhaps).

        # Max fuel load: 110 kg (someone said 100 on the reddit post)

        # "a tenth of a second per lap per litre of fuel".
        # "depends on temperature \ 100kg = ~100L (for water) \ but for petrol the density varies: 0.71–0.77 kg/L \ 125 to 140 liters"
        # 0.1s / litre * 140 litre / 100 kg = 0.14s / kg
        # 0.3 s / 10 kg = 0.03s / kg
        # hmmmmmmm
        # 0.03 is the common one, we'll just stick with that
        if fuel_load is not None:
            self.fuel_load = fuel_load
        all_new_laps = pd.DataFrame()
        if red_flags is None:
            red_flags = [0, float('inf')]
        else:
            red_flags = [0] + red_flags + [float('inf')]
        for sln, eln in zip(red_flags, red_flags[1:]):
            new_laps = self.laps[(self.laps.LapNumber > sln) & (
                self.laps.LapNumber <= eln)].copy(deep=True)
            times_fuel_adj = np.linspace(
                self.fuel_load, 0, self.num_laps+1)[1:] * 0.3 / 10
            for i, g in new_laps.groupby('Driver'):
                new_lap_times = pd.to_timedelta((g.LapTime).dt.total_seconds(
                ) - pd.Series(times_fuel_adj[:len(g)], index=g.index), unit='s')
                new_laps.loc[g.index, 'LapTime'] = new_lap_times
                start_time = g.LapStartTime.min()
                new_times = start_time + new_lap_times.cumsum()
                new_laps.loc[g.index, 'Time'] = new_times
                new_start_times = new_times.shift(1)
                new_start_times.iloc[0] = start_time
                new_laps.loc[g.index, 'LapStartTime'] = new_start_times
            all_new_laps = pd.concat([all_new_laps, new_laps])
        all_new_laps.reset_index(drop=True, inplace=True)
        if inplace:
            self.laps = all_new_laps
        else:
            return self._copy(all_new_laps)

    def calculate_limited_lap_times(self, inplace=False):
        '''
        Basically, we want to reduce all the lap times during a yellow or red flag.
        We'll start by selecting all their times finding the average, and reducing the laps by that.

        :param bool inplace: whether or not the operation should be performed inplace, defaults to False
        :return RacePace | None: the new object with 'corrected' times or None
        '''
        new_rp = self.deep_copy()

        if inplace:
            self.laps = new_rp.laps
        else:
            return new_rp

    def get_stint_summary(self):
        race_pace = self.laps.groupby(['Driver', 'Stint']).agg(
            Compound=('Compound', 'first'),
            FirstLapNum=('LapNumber', 'first'),
            LastLapNum=('LapNumber', 'last'),
            AverageLapTime=('LapTime', 'mean'),
            CountLaps=('LapNumber', 'count')
        ).reset_index()
        race_pace['AveragePctOff'] = (
            (race_pace.AverageLapTime / race_pace.AverageLapTime.min()) - 1) * 100
        race_pace['StintName'] = race_pace.Driver + ' S' + \
            race_pace.Stint.astype(str) + ' ' + race_pace.Compound
        return race_pace

    def plot_stint_summary(self, stint_summary_override=None):
        race_pace = self.get_stint_summary().sort_values(
            'AveragePctOff') if stint_summary_override is None else stint_summary_override
        graph_colors = {k: self.driver_colors[k[:3]]
                        for k in race_pace.StintName}
        fig, ax = plt.subplots()
        sns.barplot(data=race_pace, x='AveragePctOff',
                    y='StintName', palette=graph_colors)
        for (i, row), patch in zip(race_pace.iterrows(), ax.patches):
            ax.text(row['AveragePctOff']+0.02, patch.get_y()+0.6,
                    f"{row['CountLaps']} / {row['LastLapNum'] - row['FirstLapNum'] + 1}")
        return fig, ax

    def replace_pace(self, driver, lap_num, lap_time):
        '''Directly modifies object'''
        driver_laps = self.laps[self.laps.Driver == driver]
        wanted_lap = driver_laps[driver_laps.LapNumber == lap_num].iloc[0]
        lap_time_diff = lap_time - wanted_lap.LapTime
        self.laps.loc[wanted_lap.name, 'LapTime'] = lap_time
        self.laps.loc[wanted_lap.name, 'Time'] += lap_time_diff
        greater_inds = driver_laps[driver_laps.LapNumber > lap_num].index
        self.laps.loc[greater_inds, 'Time'] += lap_time_diff
        self.laps.loc[greater_inds, 'LapStartTime'] += lap_time_diff

    def adjust_pace(self, driver, lap_num, lap_time_diff):
        '''Directly modifies object'''
        driver_laps = self.laps[self.laps.Driver == driver]
        wanted_laps = driver_laps[driver_laps.LapNumber == lap_num]
        if len(wanted_laps) == 0:
            return None
        wanted_lap = wanted_laps.iloc[0]
        self.laps.loc[wanted_lap.name, 'LapTime'] += lap_time_diff
        self.laps.loc[wanted_lap.name, 'Time'] += lap_time_diff
        greater_inds = driver_laps[driver_laps.LapNumber > lap_num].index
        self.laps.loc[greater_inds, 'Time'] += lap_time_diff
        self.laps.loc[greater_inds, 'LapStartTime'] += lap_time_diff

    def reduce_lap_times(self, lap_nums, reduce_by=1.05):
        '''Directly modifies object'''
        for lap_num in lap_nums:
            reduce_to = self.laps[self.laps.LapNumber ==
                                  (lap_num-1)].LapTime.mean() * reduce_by
            lap_time_diff = reduce_to - \
                self.laps[self.laps.LapNumber == lap_num].LapTime.mean()
            wanted_laps = self.laps[self.laps.LapNumber == lap_num]
            self.laps.loc[wanted_laps.index, 'LapTime'] += lap_time_diff
            self.laps.loc[wanted_laps.index, 'Time'] += lap_time_diff
            greater_inds = self.laps[self.laps.LapNumber > lap_num].index
            self.laps.loc[greater_inds, 'Time'] += lap_time_diff
            self.laps.loc[greater_inds, 'LapStartTime'] += lap_time_diff


def replace_data(orig_df, orig_start=None, orig_end=None, replace_df=None, replace_start=None, replace_end=None):
    if orig_start is None:
        orig_start = orig_df.SessionTime.iloc[0]
    if orig_end is None:
        orig_end = orig_df.SessionTime.iloc[-1]
    if replace_df is None:
        replace_start, replace_end = pd.Timedelta(
            seconds=0), pd.Timedelta(seconds=0)
    if replace_start is None:
        replace_start = replace_df.SessionTime.iloc[0]
    if replace_end is None:
        replace_end = replace_df.SessionTime.iloc[-1]

    first_part = orig_df[orig_df.SessionTime < orig_start]
    if replace_df is not None:
        middle_part = replace_df[(replace_df.SessionTime >= replace_start)
                                 & (replace_df.SessionTime <= replace_end)].copy(deep=True)
        middle_adj = (replace_start - orig_start)
        middle_part.loc[:, ('Date', 'SessionTime', 'Time')] -= middle_adj
        middle_part.loc[:, 'Type'] = 'NewData'
    else:
        middle_part = pd.DataFrame()
    last_part = orig_df[orig_df.SessionTime > orig_end].copy(deep=True)
    last_adj = replace_end - replace_start - orig_end + orig_start
    last_part.loc[:, ('Date', 'SessionTime', 'Time')] += last_adj

    return pd.concat([first_part, middle_part, last_part], ignore_index=True)


def slice_by_distance(lap_data, start_dist, end_dist):
    start_time, end_time = get_time_from_distance(
        lap_data, [start_dist, end_dist], sessiontime=True)
    return lap_data.slice_by_time(start_time, end_time)


def slice_all(all_lap_data, func):
    res = pd.DataFrame()
    for i, g in all_lap_data.groupby('LapNumber'):
        res = pd.concat([res, func(g)], ignore_index=True)
    return res


def resample_2_by_dist(lap1data, lap2data, add_zero=True, x_axis='Distance'):
    # Expects to get two laps, where both the start and end are interpolated

    comblaptimes = pd.merge(lap1data[[x_axis, 'Time']], lap2data[[x_axis, 'Time']],
                            on=x_axis, how='outer').set_index(x_axis)

    if add_zero:
        comblaptimes.loc[0] = [pd.Timedelta(
            seconds=0), pd.Timedelta(seconds=0)]
    comblaptimes.sort_index(inplace=True)

    comblaptimes['Time_x'] = interpolate_times(comblaptimes.Time_x)
    comblaptimes['Time_y'] = interpolate_times(comblaptimes.Time_y)

    new_dates_x = (lap1data['Date'].iloc[0] +
                   comblaptimes['Time_x']).drop_duplicates()
    new_dates_y = (lap2data['Date'].iloc[0] +
                   comblaptimes['Time_y']).drop_duplicates()
    new_dates = pd.merge(new_dates_x, new_dates_y,
                         left_index=True, right_index=True).dropna()

    return (lap1data.resample_channels(new_date_ref=new_dates['Time_x']),
            lap2data.resample_channels(new_date_ref=new_dates['Time_y']))


def resample_all_by_dist(lap_datas, x_axis='Distance'):
    # For this function, we'll just sample every other lap off of the first lap that was passed
    ref_dists = lap_datas[0][[x_axis]].drop_duplicates().copy(deep=True)
    ref_dists['Time'] = pd.NA
    dists_index = pd.Index(ref_dists[x_axis])

    new_dates = []
    for i in range(1, len(lap_datas)):
        dist_times = pd.concat([lap_datas[i][[x_axis, 'Time']], ref_dists]).set_index(
            x_axis).sort_index()
        new_times = interpolate_times(
            dist_times.Time).bfill().loc[ref_dists[x_axis]].drop_duplicates()
        dists_index = dists_index.intersection(new_times.index)
        new_dates.append(lap_datas[i]['Date'].iloc[0] + new_times)

    return ([lap_datas[0].set_index(x_axis).loc[dists_index].reset_index()] +
            [lap_datas[i].resample_channels(new_date_ref=new_dates[i-1].loc[dists_index]).reset_index(drop=True)
             for i in range(1, len(lap_datas))])


def resample_2_by_sector(lap1, lap2, lap1data=None, lap2data=None, x_axis='Distance', return_dists=False):
    if lap1data is None:
        lap1data = lap1.get_telemetry()
    if lap2data is None:
        lap2data = lap2.get_telemetry()
    lap_comparison = [pd.DataFrame(), pd.DataFrame()]
    sector_names = ['LapStartTime', 'Sector1SessionTime',
                    'Sector2SessionTime', 'Sector3SessionTime']
    sector_dists = []
    for sn1, sn2 in zip(sector_names, sector_names[1:]):
        sect1 = lap1data.slice_by_time(
            lap1[sn1], lap1[sn2], interpolate_edges=True).add_distance().add_relative_distance()
        sect2 = lap2data.slice_by_time(
            lap2[sn1], lap2[sn2], interpolate_edges=True).add_distance().add_relative_distance()
        sect_comparison = resample_2_by_dist(
            sect1, sect2, add_zero=False, x_axis=x_axis)
        last_dist = 0
        for i in range(2):
            if len(lap_comparison[i]) > 0:
                last_dist += lap_comparison[i].Distance.iloc[-1]
                sect_comparison[i]['Distance'] += lap_comparison[i].Distance.iloc[-1]
                sect_comparison[i]['Time'] += lap_comparison[i].Time.iloc[-1]
            lap_comparison[i] = pd.concat(
                [lap_comparison[i], sect_comparison[i]], ignore_index=True)
        sector_dists.append(last_dist/2)
    last_dist = 0
    for i in range(2):
        lap_comparison[i]['RelativeDistance'] = lap_comparison[i]['Distance'] / \
            lap_comparison[i]['Distance'].iloc[-1]
        last_dist += lap_comparison[i]['Distance'].iloc[-1]
    sector_dists.append(last_dist/2)
    if return_dists:
        if x_axis == 'RelativeDistance':
            sector_dists = [d/sector_dists[-1] for d in sector_dists]
        return lap_comparison, sector_dists
    return lap_comparison


def resample_all_by_sector(laps, lapsdata=None, x_axis='Distance', return_dists=False):
    if lapsdata is None:
        lapsdata = [lap.get_telemetry() for lap in laps]
    lap_comparison = [pd.DataFrame() for _ in laps]
    sector_names = ['LapStartTime', 'Sector1SessionTime',
                    'Sector2SessionTime', 'Sector3SessionTime']
    sector_dists = []
    for sn1, sn2 in zip(sector_names, sector_names[1:]):
        sects = [lapsdata[i].slice_by_time(laps[i][sn1], laps[i][sn2], interpolate_edges=True).add_distance(
        ).add_relative_distance() for i in range(len(laps))]
        sect_comparison = resample_all_by_dist(sects, x_axis=x_axis)
        last_dist = 0
        for i in range(len(laps)):
            if len(lap_comparison[i]) > 0:
                last_dist += lap_comparison[i].Distance.iloc[-1]
                sect_comparison[i]['Distance'] += lap_comparison[i].Distance.iloc[-1]
                sect_comparison[i]['Time'] += lap_comparison[i].Time.iloc[-1]
            lap_comparison[i] = pd.concat(
                [lap_comparison[i], sect_comparison[i]], ignore_index=True)
        sector_dists.append(last_dist/len(laps))
    last_dist = 0
    for i in range(len(laps)):
        lap_comparison[i]['RelativeDistance'] = lap_comparison[i]['Distance'] / \
            lap_comparison[i]['Distance'].iloc[-1]
        last_dist += lap_comparison[i]['Distance'].iloc[-1]
    sector_dists.append(last_dist/len(laps))
    if return_dists:
        if x_axis == 'RelativeDistance':
            sector_dists = [d/sector_dists[-1] for d in sector_dists]
        return lap_comparison, sector_dists
    return lap_comparison


def get_lap(session, driver, lap_num):
    if lap_num == "-1":
        return session.laps.pick_driver(driver).pick_fastest()
    return session.laps[(session.laps.Driver == driver) & (session.laps.LapNumber == int(lap_num))].iloc[0]
