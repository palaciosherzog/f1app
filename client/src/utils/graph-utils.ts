import { getClosestIndex, getHampel, getMeanStd, groupBy, mean, rolling } from "./calc-utils";

export type MapInfo = {
  driver1: string;
  driver2: string;
  driver1color: string;
  driver2color: string;
  colorscale: string[];
  mapdata: {
    RelativeDistance: number[];
    X: number[];
    Y: number[];
    Z: number[];
    Speed_diff: number[];
  };
};

export const getMapCompData = (mapInfo: MapInfo, maxColor: number, rollingK?: number, graphMarker?: number) => {
  const rollingSpeedDiff = rollingK ? rolling(mapInfo.mapdata.Speed_diff, rollingK, mean) : mapInfo.mapdata.Speed_diff;
  let markerInfo = undefined;
  if (graphMarker) {
    const i = getClosestIndex(mapInfo.mapdata.RelativeDistance, graphMarker);
    markerInfo = {
      X: [mapInfo.mapdata.X[i]],
      Y: [mapInfo.mapdata.Y[i]],
      Z: [mapInfo.mapdata.Z[i]],
    };
  }
  return {
    data: [
      {
        x: mapInfo.mapdata.X,
        y: mapInfo.mapdata.Y,
        z: mapInfo.mapdata.Z,
        text: mapInfo.mapdata.RelativeDistance,
        type: "scatter3d",
        mode: "line",
        marker: { opacity: 0.001 },
        line: {
          color: rollingSpeedDiff,
          width: 10,
          opacity: 0.8,
          cmid: 0,
          cmin: -maxColor,
          cmax: maxColor,
          colorscale: mapInfo.colorscale.map((color, index) => [
            (index / (mapInfo.colorscale.length - 1)).toString(),
            color,
          ]),
          showscale: true,
          colorbar: {
            tickfont: { color: "#fff" },
            title: {
              text: `${mapInfo.driver2} faster <-- | Speed Difference (km/h) | --> ${mapInfo.driver1} faster`,
              side: "right",
              font: { color: "#fff" },
            },
          },
        },
        hoverinfo: "text",
      },
      ...(markerInfo
        ? [
            {
              x: markerInfo.X,
              y: markerInfo.Y,
              z: markerInfo.Z,
              type: "scatter3d",
              mode: "scatter",
              marker: { size: 8, color: "#000" },
              hoverinfo: "none",
            },
          ]
        : [{}]),
    ],
    layout: {
      paper_bgcolor: "#292625",
      plot_bgcolor: "#1e1c1b",
      scene: {
        camera: {
          eye: { x: 0.5, y: 0.5, z: 7 },
          up: { x: 0, y: 1, z: 0 },
        },
        aspectmode: "data",
        aspectratio: { xaxis: 1, yaxis: 1, zaxis: 1 },
      },
      margin: { l: 0, r: 0, b: 0, t: 0 },
      autosize: true,
      showlegend: false,
    },
    useResizeHandler: true,
    style: { width: "100%", height: "100%" },
  };
};

type lapTel = {
  Date: number[];
  SessionTime: number[];
  DriverAhead: string[];
  DistanceToDriverAhead: number[];
  Time: number[];
  RPM: number[];
  Speed: number[];
  nGear: number[];
  Throttle: number[];
  Brake: boolean[];
  DRS: number[];
  Source: string[];
  Distance: number[];
  RelativeDistance: number[];
  Status: string[];
  X: number[];
  Y: number[];
  Z: number[];
};
export type GraphInfo = {
  driver1: string;
  driver2: string;
  driver1color: string;
  driver2color: string;
  sectorcomp: {
    dists: number[];
    timeDiffs: number[];
  };
  driver1data: lapTel;
  driver2data: lapTel;
  timecomp: {
    Distance: number[];
    Time_diff: number[];
  };
};

const yAxisLabels: { [_name: string]: string } = {
  Speed: "Speed (km/h)",
  Throttle: "Throttle",
  Brake: "Brake ON",
  DRS: "DRS",
  nGear: "nGear",
};

const gapHeight = 1;

const yAxisHeights: { [_name: string]: number } = {
  Speed: 25,
  Throttle: 6,
  Brake: 3,
  DRS: 4,
  nGear: 5,
  sepTime: 8,
};

export const getGraphHeight = (colNames: string[]) => {
  return colNames.reduce((prev, colName) => prev + yAxisHeights[colName], 0) + gapHeight * (colNames.length - 1);
};

export const getGraphCompData = (
  graphInfo: GraphInfo,
  maxTDiff: number,
  rollingK?: number,
  graphMarker?: number,
  otherys?: boolean | string[]
) => {
  let timeDiffs = graphInfo.timecomp.Time_diff;
  if (graphMarker) {
    const lastDistance = graphInfo.timecomp.Distance[graphInfo.timecomp.Distance.length - 1];
    const closestInd = getClosestIndex(graphInfo.timecomp.Distance, graphMarker * lastDistance);
    const diffTo0 = graphInfo.timecomp.Time_diff[closestInd];
    timeDiffs = timeDiffs.map((td) => td - diffTo0);
  }
  if (rollingK) {
    timeDiffs = rolling(timeDiffs, rollingK, mean);
  }

  const driverNames = [graphInfo.driver1, graphInfo.driver2];
  const driverColors = [graphInfo.driver1color, graphInfo.driver2color];
  const driverData = [graphInfo.driver1data, graphInfo.driver2data];
  let columnsToPlot = ["Speed"];
  if (otherys === true) {
    columnsToPlot = [...columnsToPlot, "Throttle", "Brake", "DRS", "nGear"];
  } else if (otherys) {
    columnsToPlot = [...columnsToPlot, ...otherys];
  }
  const totalHeight = getGraphHeight(columnsToPlot);
  const heights = columnsToPlot.map((name) => yAxisHeights[name] / totalHeight).reverse();
  const gap = gapHeight / totalHeight;
  for (let i = 1; i < heights.length; i++) {
    heights[i] += heights[i - 1] + gap;
  }
  const startValues = [0, ...heights];
  const endValues = heights.map((v) => v - gap);
  const separateTime = columnsToPlot.indexOf("sepTime");

  const graphData = columnsToPlot
    .map((colName, i) =>
      driverData.map((data, j) =>
        colName !== "sepTime"
          ? {
              x: data.Distance,
              //@ts-ignore
              y: data[colName],
              xaxis: "x",
              yaxis: `y${i + 1}`,
              type: "scatter",
              mode: "lines",
              line: { color: driverColors[j] },
              name: driverNames[j],
              hovertemplate: "%{y:.3f}",
            }
          : {}
      )
    )
    .flat();
  return {
    data: [
      ...graphData,
      {
        x: graphInfo.timecomp.Distance,
        y: timeDiffs,
        type: "scatter",
        mode: "lines",
        yaxis: separateTime < 0 ? `y${columnsToPlot.length + 1}` : `y${separateTime + 1}`,
        line: { color: "white" },
        name: "Time Difference",
        hovertemplate: "%{y:.3f}",
      },
    ],
    layout: {
      font: { color: "#fff" },
      paper_bgcolor: "#292625",
      plot_bgcolor: "#1e1c1b",
      xaxis: {
        title: "Distance (m)",
        zerolinecolor: "#999",
        gridcolor: "#444",
        color: "#fff",
      },
      ...Object.fromEntries(
        columnsToPlot.map((colName, i) => [
          `yaxis${i + 1}`,
          {
            title: yAxisLabels[colName],
            domain: [startValues[heights.length - i - 1], endValues[heights.length - i - 1]],
            nticks: i > 0 ? 3 : undefined,
            dtick: i == 0 ? 50 : undefined,
            //gridcolor: "#303030",
          },
        ])
      ),
      ...(separateTime < 0
        ? {
            [`yaxis${columnsToPlot.length + 1}`]: {
              title: `${graphInfo.driver2} ahead <-- | Time Difference (s) | --> ${graphInfo.driver1} ahead`,
              overlaying: "y1",
              side: "right",
              zerolinecolor: "#999",
              gridcolor: "#444",
              color: "#fff",
              range: [-maxTDiff, maxTDiff],
            },
          }
        : {}),
      legend: {
        orientation: "h",
      },
      hovermode: "x",
      shapes: graphInfo?.sectorcomp?.dists
        ? [
            ...graphInfo.sectorcomp.dists,
            ...(graphMarker ? [graphMarker * graphInfo.driver1data.Distance.slice(-1)[0]] : []),
          ].map((d) => ({
            line: { color: "#777" },
            type: "line",
            xref: "x",
            yref: "paper",
            x0: d,
            y0: 0,
            x1: d,
            y1: 1,
          }))
        : [],
      margin: { l: 60, r: 60, b: 60, t: 60 },
      autosize: true,
      ...(otherys
        ? {
            grid: {
              rows: columnsToPlot.length,
              columns: 1,
              subplots: columnsToPlot.map((_c, i) => [`xy${i + 1}`]),
              ygap: 0.05,
            },
          }
        : {}),
      title: "VER vs SAI Fastest Lap Comparison",
    },
    useResizeHandler: true,
    style: { width: "100%", height: "100%" },
  };
};

export const getMapCompData2 = (mapInfo: GraphInfo, maxColor: number, rollingK?: number, graphMarker?: number) => {
  //const rollingSpeedDiff = rollingK ? rolling(mapInfo.mapdata.Speed_diff, rollingK, mean) : mapInfo.mapdata.Speed_diff;
  let markerInfo = undefined;
  if (graphMarker) {
    const i = getClosestIndex(mapInfo.driver1data.RelativeDistance, graphMarker);
    markerInfo = {
      X: [mapInfo.driver1data.X[i]],
      Y: [mapInfo.driver1data.Y[i]],
      Z: [mapInfo.driver1data.Z[i]],
    };
  }
  return {
    data: [
      {
        x: mapInfo.driver1data.X,
        y: mapInfo.driver1data.Y,
        z: mapInfo.driver1data.Z,
        text: mapInfo.driver1data.RelativeDistance,
        type: "scatter3d",
        mode: "line",
        marker: { opacity: 0.001 },
        line: {
          color: "#f00",
          width: 10,
          opacity: 0.8,
          // cmid: 0,
          // cmin: -maxColor,
          // cmax: maxColor,
          // colorscale: "Viridis",
          // showscale: true,
          // colorbar: {
          //   tickfont: { color: "#fff" },
          //   title: {
          //     text: `${mapInfo.driver2} faster <-- | Speed Difference (km/h) | --> ${mapInfo.driver1} faster`,
          //     side: "right",
          //     font: { color: "#fff" },
          //   },
          // },
        },
        hoverinfo: "text",
        name: mapInfo.driver1,
      },
      {
        x: mapInfo.driver2data.X,
        y: mapInfo.driver2data.Y,
        z: mapInfo.driver2data.Z,
        text: mapInfo.driver2data.RelativeDistance,
        type: "scatter3d",
        mode: "line",
        marker: { opacity: 0.001 },
        line: {
          color: "#00f",
          width: 10,
          opacity: 0.8,
          // cmid: 0,
          // cmin: -maxColor,
          // cmax: maxColor,
          // colorscale: "Viridis",
          // showscale: true,
          // colorbar: {
          //   tickfont: { color: "#fff" },
          //   title: {
          //     text: `${mapInfo.driver2} faster <-- | Speed Difference (km/h) | --> ${mapInfo.driver1} faster`,
          //     side: "right",
          //     font: { color: "#fff" },
          //   },
          // },
        },
        hoverinfo: "text",
        name: mapInfo.driver2,
      },
      ...(markerInfo
        ? [
            {
              x: markerInfo.X,
              y: markerInfo.Y,
              z: markerInfo.Z,
              type: "scatter3d",
              mode: "scatter",
              marker: { size: 8, color: "#000" },
              hoverinfo: "none",
            },
          ]
        : [{}]),
    ],
    layout: {
      paper_bgcolor: "#292625",
      plot_bgcolor: "#1e1c1b",
      scene: {
        camera: {
          eye: { x: 0.5, y: 0.5, z: 7 },
          up: { x: 0, y: 1, z: 0 },
        },
        aspectmode: "data",
        aspectratio: { xaxis: 1, yaxis: 1, zaxis: 1 },
      },
      margin: { l: 0, r: 0, b: 0, t: 0 },
      autosize: true,
      //showlegend: false,
    },
    useResizeHandler: true,
    style: { width: "100%", height: "100%" },
  };
};

const compoundColors: { [_c: string]: string } = {
  SOFT: "#C1221C",
  MEDIUM: "#E3D244",
  HARD: "#F1F4F8",
  INTERMEDIATE: "#58BF4B",
  WET: "#1763C1",
};

export type LapsInfo = {
  Driver: string[];
  Time: number[];
  LapTime: number[];
  LapNumber: number[];
  Stint: number[];
  Sector1Time: number[];
  Sector2Time: number[];
  Sector3Time: number[];
  Compound: string[];
  TyreLife: number[];
  LapStartTime: number[];
  PitOutTime: number[];
  PitInTime: number[];
  TrackStatus: string[];
};

export type LapInfo = {
  Driver: string;
  Time: number;
  LapTime: number;
  LapNumber: number;
  Stint: number;
  Sector1Time: number;
  Sector2Time: number;
  Sector3Time: number;
  Compound: string;
  TyreLife: number;
  LapStartTime: number;
  PitOutTime: number;
  PitInTime: number;
  TrackStatus: string;
};

export type DriverLaps = {
  [_d: string]: {
    laps: LapsInfo;
    color: string;
    fullName: string;
  };
};

// TODO: 1. add options to customize these filters (hampel & stddev mostly)
export type FilterOptions = {
  lapRange?: [number, number];
  boxLaps?: boolean;
  trackStatus?: boolean;
  hampel?: boolean;
  stddev?: boolean;
};

const longToWide = (lapInfo: LapsInfo): LapInfo[] => {
  return lapInfo.Driver.map((d, i) => ({
    Driver: lapInfo.Driver[i],
    Time: lapInfo.Time[i],
    LapTime: lapInfo.LapTime[i],
    LapNumber: lapInfo.LapNumber[i],
    Stint: lapInfo.Stint[i],
    Sector1Time: lapInfo.Sector1Time[i],
    Sector2Time: lapInfo.Sector2Time[i],
    Sector3Time: lapInfo.Sector3Time[i],
    Compound: lapInfo.Compound[i],
    TyreLife: lapInfo.TyreLife[i],
    LapStartTime: lapInfo.LapStartTime[i],
    PitOutTime: lapInfo.PitOutTime[i],
    PitInTime: lapInfo.PitInTime[i],
    TrackStatus: lapInfo.TrackStatus[i],
  }));
};

const getNormalization = (lapInfo: DriverLaps) => {
  // NOTE: starts at lapStartTime so doesn't start on 0 line
  const [minLap, minTime] = Object.entries(lapInfo).reduce(
    ([prevLap, prevTime], [_d, { laps }]) => {
      const lap = laps.LapNumber[0];
      const time = laps.LapStartTime[0];
      if (lap < prevLap || time < prevTime) return [lap, time];
      return [prevLap, prevTime];
    },
    [Infinity, Infinity]
  );
  const [maxLap, maxTime] = Object.entries(lapInfo).reduce(
    ([prevLap, prevTime], [_d, { laps }]) => {
      const lap = laps.LapNumber.slice(-1)[0];
      const time = laps.Time.slice(-1)[0];
      if (lap > prevLap || (lap === prevLap && time < prevTime)) return [lap, time];
      return [prevLap, prevTime];
    },
    [0, 0]
  );
  const slope = (maxTime - minTime) / (maxLap - minLap + 1);
  return Object.fromEntries(
    Array(maxLap - minLap + 1)
      .fill(0)
      .map((_v, i) => [i + minLap, minTime + slope * (i + 1)])
  );
};

const getFuelCorrection = (lapInfo: DriverLaps, maxLap: number, fuel: number = 100) => {
  const C = 32 * fuel; // or 30, whichever

  const fuelCorrection = Array(maxLap)
    .fill(0)
    .map((_v, i) => C * (1 - (i + 1) / maxLap));
  return fuelCorrection;
};

const subtractArrays = (arr1: number[], arr2: number[]) => arr1.map((v, i) => v - arr2[i]);

const fixLapTimes = (lapInfo: DriverLaps, fixFunc: (_laps: LapsInfo, _d: string) => number[]) => {
  return Object.fromEntries(
    Object.entries(lapInfo).map(([d, info]) => [d, { ...info, laps: { ...info.laps, LapTime: fixFunc(info.laps, d) } }])
  );
};

const filterFunc = (lapInfo: LapsInfo, filterOpts?: FilterOptions) => {
  let lapInds = Array(lapInfo.LapNumber.length).fill(true); // keep all initially
  if (filterOpts?.lapRange) {
    const [startLapNum, endLapNum] = filterOpts.lapRange;
    lapInds = lapInds.map((b, i) => b && lapInfo.LapNumber[i] >= startLapNum && lapInfo.LapNumber[i] <= endLapNum);
  }
  filterOpts?.boxLaps &&
    (lapInds = lapInds.map((b, i) => b && lapInfo.PitInTime[i] === null && lapInfo.PitOutTime[i] === null));
  filterOpts?.trackStatus && (lapInds = lapInds.map((b, i) => b && lapInfo.TrackStatus[i] === "1"));
  if (filterOpts?.hampel) {
    const filteredIndexes = lapInfo.LapTime.map((_v, i) => i).filter((_v, i) => lapInds[i]);
    const isOutlier = getHampel(
      lapInfo.LapTime.filter((_v, i) => lapInds[i]),
      Math.floor(filteredIndexes.length / 5)
    );
    filteredIndexes.forEach((ind, i) => (lapInds[ind] = lapInds[ind] && isOutlier[i]));
  }
  if (filterOpts?.stddev) {
    const { mean, std } = getMeanStd(lapInfo.LapTime.filter((_v, i) => lapInds[i]));
    lapInds = lapInds.map((b, i) => b && Math.abs(lapInfo.LapTime[i] - mean) < 3 * std);
  }
  return lapInds; // same length array, true if should be included
};

const filterLapInfo = (lapInfo: DriverLaps, driverFilters: { [_d: string]: number[] }) => {
  return Object.fromEntries(
    Object.entries(lapInfo).map(([d, info]) => [
      d,
      {
        ...info,
        laps: Object.fromEntries(
          Object.entries(info.laps).map(([col, vals]: [string, (string | number)[]]) => {
            return [col, vals.filter((_v: any, i: number) => driverFilters[d][i])];
          })
        ) as LapsInfo,
      },
    ])
  );
};

const getStintSummary = (lapInfo: DriverLaps) => {
  const stintGroups: [string, [string, number[]][]][] = Object.entries(lapInfo).map(([driver, { laps }]) => [
    driver,
    Object.entries(
      groupBy(
        laps.LapNumber.map((_v, i) => i),
        (i) => laps.Stint[i]
      )
    ),
  ]);

  const stintInfo = stintGroups
    .map(([driver, stintInfo]) =>
      stintInfo.map(([stint, indexes]) => {
        return {
          driver: driver,
          stint: stint,
          compound: lapInfo[driver].laps.Compound[indexes[0]],
          firstLapNumber: lapInfo[driver].laps.LapNumber[indexes[0]],
          lastLapNumber: lapInfo[driver].laps.LapNumber[indexes.slice(-1)[0]],
          numberOfLaps: indexes.length,
          averageLapTime: indexes.reduce((prev, i) => prev + lapInfo[driver].laps.LapTime[i], 0) / indexes.length,
        };
      })
    )
    .flat();
  const minAvgLapTime = Math.min(...stintInfo.map((info) => info.averageLapTime));
  return stintInfo.map((info) => ({
    ...info,
    stintName: `${info.driver}-S${info.stint}`,
    averagePctOff: (info.averageLapTime / minAvgLapTime - 1) * 100,
  }));
};

export const getStintGraph = (lapInfo: DriverLaps) => {
  const stintSummary = getStintSummary(lapInfo);
  if (true) {
    stintSummary.sort((a, b) => a.averagePctOff - b.averagePctOff);
  }
  return {
    data: [
      {
        x: stintSummary.map((v) => v.stintName),
        y: stintSummary.map((v) => Math.max(v.averagePctOff, 0.03)),
        //orientation: "h",
        type: "bar",
        text: stintSummary.map((v) => `${v.numberOfLaps}-${v.compound}`),
        textposition: "auto",
        hoverinfo: "text",
        marker: {
          color: stintSummary.map((v) => lapInfo[v.driver].color),
          line: {
            color: stintSummary.map((v) => compoundColors[v.compound]),
            width: 3,
          },
        },
      },
    ],
    layout: {
      font: { color: "#fff" },
      paper_bgcolor: "#292625",
      plot_bgcolor: "#1e1c1b",
      xaxis: {
        title: "Stint",
        gridcolor: "#444",
        color: "#fff",
      },
      yaxis: {
        title: "Percent off Fastest Stint",
        gridcolor: "#444",
        color: "#fff",
      },
      margin: { l: 40, r: 0, b: 40, t: 0 },
      autosize: true,
    },
    useResizeHandler: true,
    style: { width: "100%", height: "100%" },
  };
};

export const getLapGraph = (
  lapInfo: DriverLaps,
  drivers: string[],
  type: string = "lap-time",
  fuelLoad?: number,
  maxLaps?: number,
  removeFilterOpts?: FilterOptions,
  markFilterOpts?: FilterOptions
) => {
  const filteredDrivers = drivers.length > 0 ? drivers : Object.keys(lapInfo);
  lapInfo = Object.fromEntries(filteredDrivers.map((d) => [d, lapInfo[d]]));
  lapInfo = fixLapTimes(lapInfo, (laps, _d) => subtractArrays(laps.Time, laps.LapStartTime));
  if (fuelLoad) {
    const fuelCorrection = getFuelCorrection(lapInfo, maxLaps ?? 50, fuelLoad);
    lapInfo = fixLapTimes(lapInfo, (laps, _d) => subtractArrays(laps.LapTime, fuelCorrection));
  }
  const removeDriverFilter = Object.fromEntries(
    Object.entries(lapInfo).map(([d, { laps }]) => [d, filterFunc(laps, removeFilterOpts)])
  );
  lapInfo = filterLapInfo(lapInfo, removeDriverFilter);
  const driverFilter = markFilterOpts
    ? Object.fromEntries(Object.entries(lapInfo).map(([d, { laps }]) => [d, filterFunc(laps, markFilterOpts)]))
    : undefined;

  if (type === "race-trace") {
    const normalization = getNormalization(lapInfo);
    lapInfo = fixLapTimes(lapInfo, (laps, d) => laps.LapNumber.map((ln, i) => laps.Time[i] - normalization[ln]));
  }
  if (type === "stint-summary") {
    return getStintGraph(lapInfo);
  }
  const wideLapInfo = Object.fromEntries(Object.keys(lapInfo).map((d) => [d, longToWide(lapInfo[d].laps)]));
  return {
    data: filteredDrivers.map((driver) => ({
      x: lapInfo[driver].laps.LapNumber,
      y: lapInfo[driver].laps.LapTime,
      //text: lapInfo[driver].laps.LapNumber.map((ln) => `${driver}-${ln}`),
      type: "scatter",
      mode: "lines+markers",
      name: driver,
      line: { color: lapInfo[driver].color },
      marker: {
        color: lapInfo[driver].laps.Compound.map((c) => compoundColors[c] ?? "#555"),
        line: {
          color: lapInfo[driver].laps.Compound.map((c, i) =>
            driverFilter && driverFilter[driver][i] ? compoundColors[c] ?? "#555" : "#B72CC7"
          ),
          width: 2,
        },
      },
      hovertemplate:
        "<b>%{text.Driver}-%{text.LapNumber}</b>" +
        [
          "LapTime",
          "TrackStatus",
          "Compound",
          "TyreLife",
          "Stint",
          "PitInTime",
          "PitOutTime",
          "Sector1Time",
          "Sector2Time",
          "Sector3Time",
        ]
          .map((s) => `<br>    <b>${s}</b>: %{text.${s}}`)
          .join(""),
      text: wideLapInfo[driver],
    })),
    layout: {
      font: { color: "#fff" },
      paper_bgcolor: "#292625",
      plot_bgcolor: "#1e1c1b",
      xaxis: {
        title: "Lap Number",
        gridcolor: "#444",
        color: "#fff",
      },
      yaxis: {
        title: "Lap Time (s)",
        gridcolor: "#444",
        color: "#fff",
      },
      legend: {
        orientation: "h",
      },
      margin: { l: 60, r: 0, b: 0, t: 0 },
      autosize: true,
    },
    useResizeHandler: true,
    style: { width: "100%", height: "100%" },
  };
};
