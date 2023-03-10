import { adjustHue, parseToHsla } from "color2k";

export const mean = (arr: number[]) => arr.reduce((prev, cur) => prev + cur, 0) / arr.length;

export const rolling = (arr: number[], k: number, applyFunc: (_a: number[]) => number) => {
  const half = Math.floor(k / 2);
  let i = half + 1;
  const newArr = [];
  while (newArr.length < arr.length) {
    newArr.push(applyFunc(arr.slice(Math.max(0, i - k), Math.min(i, arr.length))));
    i += 1;
  }
  return newArr;
};

export const getClosestIndex = (a: number[], x: number) => {
  let lo = -1,
    hi = a.length;
  while (hi - lo > 1) {
    var mid = Math.round((lo + hi) / 2);
    if (a[mid] <= x) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  if (a[lo] === x) hi = lo;
  if (x - a[lo] > a[hi] - x) {
    return hi;
  }
  return lo;
};

export const groupBy = function (xs: any, fnc: (_x: any) => any) {
  return xs.reduce(function (rv: any, x: any) {
    (rv[fnc(x)] = rv[fnc(x)] || []).push(x);
    return rv;
  }, {});
};

export const getMeanStd = (arr: any[]) => {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return { mean: mean, std: Math.sqrt(arr.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / arr.length) };
};

const median = (arr: number[]) => {
  const sortedArr = [...arr].sort();
  const half = Math.floor(arr.length / 2);
  if (sortedArr.length % 2) {
    return sortedArr[half];
  }
  return (sortedArr[half - 1] + sortedArr[half]) / 2.0;
};

export const getHampel = (arr: number[], k = 7, t0 = 3) => {
  // https://stackoverflow.com/questions/46819260/filtering-outliers-how-to-make-median-based-hampel-function-faster
  const L = 1.4826;
  const rollingMedians = rolling(arr, k, median);
  const MAD = (x: number[]) => {
    const med = median(x);
    return median(x.map((v) => Math.abs(v - med)));
  };
  const rollingMADs = rolling(arr, k, MAD);
  const threshold = rollingMADs.map((v) => t0 * L * v);
  return arr.map((v, i) => Math.abs(v - rollingMedians[i]) <= threshold[i]);
  // returns list, where true indicates a value that is an outlier
};

// COLOR FUNCTIONALITY
const teams_in_order: string[] = [
  "mclaren",
  "red bull",
  "ferrari",
  "mercedes",
  "alpine",
  "williams",
  "aston martin",
  "alphatauri",
  "alfa romeo",
  "haas",
];
const teams_to_drivers: { [_t: string]: string[] } = {
  williams: ["ALB", "LAT"],
  alpine: ["ALO", "OCO"],
  "alfa romeo": ["BOT", "ZHO"],
  alphatauri: ["GAS", "TSU"],
  mercedes: ["HAM", "RUS"],
  "aston martin": ["HUL", "STR", "VET"],
  ferrari: ["LEC", "SAI"],
  haas: ["MAG", "MSC"],
  mclaren: ["NOR", "RIC"],
  "red bull": ["VER", "PER"],
};
const teams_to_colors: { [_t: string]: string[] } = {
  mclaren: ["#ff7f0e"],
  "red bull": ["#1f77b4"],
  ferrari: ["#d62728"],
  mercedes: ["#17becf"],
  alpine: ["#17becf", "#1f77b4", "#bcbd22"],
  williams: ["#1f77b4", "#7f7f7f"],
  "aston martin": ["#2ca02c"],
  alphatauri: ["#1f77b4", "#9467bd"],
  "alfa romeo": ["#d62728", "#2ca02c", "#bcbd22", "#8c564b"],
  haas: ["#7f7f7f", "#d62728", "#1f77b4", "#e377c2"],
};
export const all_colors: string[] = [
  "#1f77b4",
  "#aec7e8",
  "#ff7f0e",
  "#ffbb78",
  "#2ca02c",
  "#98df8a",
  "#d62728",
  "#ff9896",
  "#9467bd",
  "#c5b0d5",
  "#8c564b",
  "#c49c94",
  "#e377c2",
  "#f7b6d2",
  "#7f7f7f",
  "#c7c7c7",
  "#bcbd22",
  "#dbdb8d",
  "#17becf",
  "#8ac6d0",
];
const secondary_colors: { [_c: string]: string } = {
  "#1f77b4": "#aec7e8",
  "#aec7e8": "#ff7f0e",
  "#ff7f0e": "#ffbb78",
  "#ffbb78": "#2ca02c",
  "#2ca02c": "#98df8a",
  "#98df8a": "#d62728",
  "#d62728": "#ff9896",
  "#ff9896": "#9467bd",
  "#9467bd": "#c5b0d5",
  "#c5b0d5": "#8c564b",
  "#8c564b": "#c49c94",
  "#c49c94": "#e377c2",
  "#e377c2": "#f7b6d2",
  "#f7b6d2": "#7f7f7f",
  "#7f7f7f": "#c7c7c7",
  "#c7c7c7": "#bcbd22",
  "#bcbd22": "#dbdb8d",
  "#dbdb8d": "#17becf",
  "#17becf": "#8ac6d0",
};

export const get_best_colors = (drivers: string[]) => {
  const driverSet = new Set(drivers),
    colorSet = new Set();
  const colors: { [_d: string]: string } = {};
  teams_in_order.forEach((t: string) => {
    const team_color = teams_to_colors[t].find((c) => !colorSet.has(c)) ?? "";
    teams_to_drivers[t].forEach((d, i) => {
      if (driverSet.has(d)) {
        colors[d] = i < 1 ? team_color : secondary_colors[team_color];
        colorSet.add(team_color);
      }
    });
  });
  driverSet.forEach((d: string) => {
    if (!colors[d]) {
      colors[d] = "#fff";
    }
  });
  return colors;
};

export const separateColors = (color1: string, color2: string, hadj = 60) => {
  const hsla1 = parseToHsla(color1);
  const hsla2 = parseToHsla(color2);
  if (Math.abs(hsla1[0] - hsla2[0]) < hadj) {
    color2 = adjustHue(color1, hadj);
  }
  return [color1, color2];
};

export const transpose = (matrix: any[][]) => {
  const rows = matrix.length,
    cols = matrix[0].length;
  const grid = [];
  for (let j = 0; j < cols; j++) {
    grid[j] = Array(rows);
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      grid[j][i] = matrix[i][j];
    }
  }
  return grid;
};
