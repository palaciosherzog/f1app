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
