import { mix } from "color2k";
import { getHampel, getMeanStd, groupBy, mean, rolling } from "./calc-utils";

export type Tel = {
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

export type LapTel = {
  driver: string;
  lapNumber: string;
  tel: Tel;
}[];

export const getColDiff = (
  lapTel: LapTel,
  col: keyof Tel,
  lap1 = 0,
  lap2 = 1,
  func?: (_a: number, _b: number) => number
) => {
  if (!func) {
    func = (a, b) => a - b;
  }
  //@ts-ignore
  return lapTel[lap1].tel[col].map((v, i) => func(v, lapTel[lap2].tel[col][i]));
};

export const getColMaxInds = (lapTel: LapTel, col: keyof Tel) => {
  let maxInds = [];
  for (let j = 0; j < lapTel[0].tel[col].length; j++) {
    let maxInd = -1,
      maxVal = -Infinity;
    for (let i = 0; i < lapTel.length; i++) {
      //@ts-ignore
      if (lapTel[i].tel[col][j] > maxVal) {
        //@ts-ignore
        maxVal = lapTel[i].tel[col][j];
        maxInd = i;
      }
    }
    maxInds.push(maxInd);
  }
  return maxInds;
};

export const getEqualSegmentPoints = (lapTel: LapTel, splitNum: number) => {
  const distances = lapTel[0].tel.Distance;
  const segmentLength = distances[distances.length - 1] / splitNum;
  let segNum = 1;
  const points: number[] = [];
  distances.forEach((d, i) => {
    if (d > segmentLength * segNum) {
      points.push(i);
      segNum++;
    }
  });
  return points;
};

export const getSpeedChangePoints = (lapTel: LapTel, rollingK?: number) => {
  let speedDiff;
  speedDiff = getColMaxInds(lapTel, "Speed");
  speedDiff = rollingK ? rolling(speedDiff, rollingK, mean) : speedDiff;
  const points: number[] = [];
  speedDiff.reduce((p, c, i) => {
    const nc = Math.floor(Math.min(c, 0.999) / 0.5);
    p !== nc && points.push(i);
    return nc;
  }, 0);
  return points;
};

export const getSectionTimeDiffs = (lapTel: LapTel, splitPoints: number[], lap1 = 0, lap2 = 1) => {
  splitPoints = [0, ...splitPoints, lapTel[lap1].tel.Time.length - 1];
  const lap1diffs: number[] = [];
  const lap2diffs: number[] = [];
  for (let i = 0; i < splitPoints.length - 1; i++) {
    lap1diffs.push(lapTel[lap1].tel.Time[splitPoints[i + 1]] - lapTel[lap1].tel.Time[splitPoints[i]]);
    lap2diffs.push(lapTel[lap2].tel.Time[splitPoints[i + 1]] - lapTel[lap2].tel.Time[splitPoints[i]]);
  }
  let j = 0;
  const res = lapTel[lap1].tel.Time.map((_v, ind) => {
    if (ind >= splitPoints[j + 1]) {
      j++;
    }
    return lap2diffs[j] - lap1diffs[j];
  });
  res[res.length - 1] = res[res.length - 2];
  return res;
};

export const getMapCompData = (
  lapTel: LapTel,
  lapColors: string[],
  cameraPos: object,
  mapType: string,
  maxColor: number,
  rollingK?: number,
  graphMarker?: number,
  mapComp?: string,
  splitPoints?: number[]
) => {
  let speedDiff;
  if (mapComp !== "Time") {
    if (mapType === "Actual") {
      speedDiff = getColDiff(lapTel, "Speed");
    } else {
      speedDiff = getColMaxInds(lapTel, "Speed");
    }
    speedDiff = rollingK ? rolling(speedDiff, rollingK, mean) : speedDiff;
    // TODO: fix the rolling speedDiff for multiple drivers (above too)
  } else if (splitPoints) {
    speedDiff = getSectionTimeDiffs(lapTel, splitPoints);
    if (mapType !== "Actual") {
      speedDiff = speedDiff.map((v) => -v);
    }
  }
  let markerInfo = undefined;
  if (graphMarker) {
    markerInfo = {
      X: [lapTel[0].tel.X[graphMarker]],
      Y: [lapTel[0].tel.Y[graphMarker]],
      Z: [lapTel[0].tel.Z[graphMarker]],
    };
  }
  const splitInfo = splitPoints && {
    X: splitPoints.map((i) => lapTel[0].tel.X[i]),
    Y: splitPoints.map((i) => lapTel[0].tel.Y[i]),
    Z: splitPoints.map((i) => lapTel[0].tel.Z[i]),
  };
  return {
    data: [
      {
        x: lapTel[0].tel.X,
        y: lapTel[0].tel.Y,
        z: lapTel[0].tel.Z,
        text: lapTel[0].tel.RelativeDistance,
        type: "scatter3d",
        mode: "line",
        marker: { opacity: 0.001 },
        line: {
          color: speedDiff,
          width: 10,
          ...(mapType === "Actual"
            ? {
                cmid: 0,
                cmin: -maxColor,
                cmax: maxColor,
                colorscale: [
                  ["0", lapColors[1]],
                  ["0.5", "#fff"],
                  ["1", lapColors[0]],
                ],
              }
            : {
                cmin: -0.5,
                cmax: lapColors.length - 0.5,
                colorscale: lapColors
                  .map((c, i) => [
                    [i / lapColors.length, c],
                    [(i + 1) / lapColors.length, c],
                  ])
                  .flat(1),
              }),
          showscale: true,
          colorbar: {
            tickfont: { color: "#fff" },
            ...(mapType === "Actual"
              ? {
                  title: {
                    text: `${lapTel[1].driver}-${lapTel[1].lapNumber} ${mapComp === "Speed" ? "faster" : ""} <-- | ${
                      mapComp === "Speed" ? "Speed Diff (km/h)" : "Time Gained (ms)"
                    } | --> ${lapTel[0].driver}-${lapTel[0].lapNumber} ${mapComp === "Speed" ? "faster" : ""}`,
                    side: "right",
                    font: { color: "#fff" },
                  },
                }
              : {
                  tick0: 0,
                  dtick: 1,
                  tickmode: "array",
                  ticktext: lapTel.map(({ driver, lapNumber }) => `${driver}-${lapNumber}`),
                  tickvals: lapTel.map((_, i) => i),
                }),
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
              mode: "markers",
              marker: { size: 8, color: markerColor },
              hoverinfo: "none",
            },
          ]
        : [{}]),
      ...(splitInfo
        ? [
            {
              x: splitInfo.X,
              y: splitInfo.Y,
              z: splitInfo.Z,
              type: "scatter3d",
              mode: "markers",
              marker: { size: 6, color: splitColor },
              hoverinfo: "none",
            },
          ]
        : [{}]),
    ],
    layout: {
      font: { color: "#292625" },
      title: {
        x: 0.4,
        y: 0.98,
        text: `${mapComp === "Speed" ? "Speed Comparison" : "Time Difference"} Through a Lap`,
        font: { color: "#fff" },
      },
      paper_bgcolor: "#292625",
      plot_bgcolor: "#1e1c1b",
      scene: {
        ...cameraPos,
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

const yAxisLabels: { [_name: string]: string } = {
  Speed: "Speed (km/h)",
  Throttle: "Throttle",
  Brake: "Brake ON",
  DRS: "DRS",
  nGear: "nGear",
  sepTime: "Interval",
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

const markerColor = "#000";
const splitColor = "#555";

export const getGraphHeight = (colNames: string[]) => {
  return colNames.reduce((prev, colName) => prev + yAxisHeights[colName], 0) + gapHeight * (colNames.length - 1);
};

export const getGraphCompData = (
  lapTel: LapTel,
  lapColors: string[],
  sectorDists: number[] | undefined,
  maxTDiff: number,
  xColumn: keyof Tel = "Distance",
  rollingK?: number,
  graphMarker?: number,
  otherys?: boolean | string[],
  splitPoints?: number[]
) => {
  let timeDiffs = lapTel.slice(1).map((_, i) => getColDiff(lapTel, "Time", 0, i + 1, (a, b) => (a - b) / 1000));
  if (graphMarker) {
    timeDiffs = timeDiffs.map((timeDiff) => {
      const diffTo0 = timeDiff[graphMarker];
      return timeDiff.map((td) => td - diffTo0);
    });
  }
  if (rollingK) {
    timeDiffs = timeDiffs.map((timeDiff) => rolling(timeDiff, rollingK, mean));
  }

  const driverData = lapTel.map((lt) => lt.tel);
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
  const timeAxis = separateTime < 0 ? `y${columnsToPlot.length + 1}` : `y${separateTime + 1}`;

  const graphData = columnsToPlot
    .map((colName, i) =>
      driverData.map((data, j) =>
        colName !== "sepTime"
          ? {
              x: data[xColumn],
              //@ts-ignore
              y: data[colName],
              xaxis: "x",
              yaxis: `y${i + 1}`,
              type: "scatter",
              mode: "lines",
              line: { color: lapColors[j] },
              name: `${lapTel[j].driver}-${lapTel[j].lapNumber}`,
              hovertemplate: "%{y:.3f}",
              showlegend: colName === "Speed",
            }
          : {}
      )
    )
    .flat();
  const timeDiffData = timeDiffs.map((timeDiff, i) => ({
    x: lapTel[0].tel[xColumn],
    y: timeDiff,
    type: "scatter",
    mode: "lines",
    yaxis: timeAxis,
    line: {
      color: lapColors[i + 1] && (separateTime >= 0 ? lapColors[i + 1] : mix(lapColors[i + 1], "white", 0.6)),
      dash: separateTime < 0 ? "dash" : undefined,
    },
    name:
      separateTime >= 0
        ? `${lapTel[i + 1].driver}-${lapTel[i + 1].lapNumber}`
        : `${lapTel[i + 1].driver}-${lapTel[i + 1].lapNumber} Interval`,
    hovertemplate: "%{y:+.3}",
    showlegend: separateTime < 0,
  }));
  return {
    data: [...graphData, ...timeDiffData],
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
              title: `Time Difference (s) (Interval)`,
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
        y: -0.3,
      },
      hovermode: "x",
      shapes: [
        ...(sectorDists || []).map((d) => ({ d: d, line: { color: "#777" } })),
        ...(graphMarker ? [lapTel[0].tel.Distance[graphMarker]] : []).map((d) => ({
          d: d,
          line: { color: markerColor, dash: "dash" },
        })),
        ,
        ...(splitPoints ? splitPoints.map((i) => lapTel[0].tel.Distance[i]) : []).map((d) => ({
          d: d,
          line: { color: splitColor, dash: "dash" },
        })),
        ,
      ].map((info) => ({
        line: info?.line,
        type: "line",
        xref: "x",
        yref: "paper",
        x0: info?.d,
        y0: 0,
        x1: info?.d,
        y1: 1,
      })),
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
      title: "Lap Comparison",
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

export type FilterOptions = {
  laps?: Array<[string, number]>;
  lapRange?: [number, number];
  lapTimeRange?: [number, number];
  boxLaps?: boolean;
  trackStatus?: boolean;
  hampel?: [number, number] | undefined;
  stddev?: undefined | number;
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

const filterFunc = (driver: string, lapInfo: LapsInfo, filterOpts?: FilterOptions) => {
  let lapInds = Array(lapInfo.LapNumber.length).fill(true); // keep all initially
  if (filterOpts?.lapRange) {
    const [startLapNum, endLapNum] = filterOpts.lapRange;
    lapInds = lapInds.map((b, i) => b && lapInfo.LapNumber[i] >= startLapNum && lapInfo.LapNumber[i] <= endLapNum);
  }
  if (filterOpts?.lapTimeRange) {
    const [minLapTime, maxLapTime] = filterOpts.lapTimeRange;
    lapInds = lapInds.map(
      (b, i) =>
        b &&
        lapInfo.Time[i] - lapInfo.LapStartTime[i] >= minLapTime &&
        lapInfo.Time[i] - lapInfo.LapStartTime[i] <= maxLapTime
    );
  }
  if (filterOpts?.laps) {
    filterOpts.laps.map(([d, ln]) => d === driver && (lapInds[ln - 1] = false));
  }
  filterOpts?.boxLaps &&
    (lapInds = lapInds.map((b, i) => b && lapInfo.PitInTime[i] === null && lapInfo.PitOutTime[i] === null));
  filterOpts?.trackStatus && (lapInds = lapInds.map((b, i) => b && lapInfo.TrackStatus[i] === "1"));
  if (filterOpts?.hampel) {
    const [k, t0] = filterOpts.hampel;
    const filteredIndexes = lapInfo.LapTime.map((_v, i) => i).filter((_v, i) => lapInds[i]);
    const isOutlier = getHampel(
      lapInfo.LapTime.filter((_v, i) => lapInds[i]),
      k,
      t0
    );
    filteredIndexes.forEach((ind, i) => (lapInds[ind] = lapInds[ind] && isOutlier[i]));
  }
  if (filterOpts?.stddev) {
    const t0 = filterOpts.stddev;
    const { mean, std } = getMeanStd(lapInfo.LapTime.filter((_v, i) => lapInds[i]));
    lapInds = lapInds.map((b, i) => b && Math.abs(lapInfo.LapTime[i] - mean) < t0 * std);
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
          compound: lapInfo[driver].laps.Compound[indexes.slice(-1)[0]],
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
        y: stintSummary.map((v) => Math.max(v.averagePctOff, 0.001)),
        //orientation: "h",
        type: "bar",
        text: stintSummary.map((v) => `${v.numberOfLaps}-${v.compound}`),
        textposition: "auto",
        hovertemplate: "<b>%{text}</b><br>%{y:.2f}% off<extra></extra>",
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
    Object.entries(lapInfo).map(([d, { laps }]) => [d, filterFunc(d, laps, removeFilterOpts)])
  );
  lapInfo = filterLapInfo(lapInfo, removeDriverFilter);
  const driverFilter = markFilterOpts
    ? Object.fromEntries(Object.entries(lapInfo).map(([d, { laps }]) => [d, filterFunc(d, laps, markFilterOpts)]))
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
