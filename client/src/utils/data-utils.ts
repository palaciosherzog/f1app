import axios from "axios";
import { bothData, driverData, graphData, lapData, mapData, raceData } from "./test-data";

const USE_TEST_DATA = false;
const apiClient = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

export type SessionId = {
  year: string;
  round: string;
  session: string;
};
export type GraphArgs = {
  use_acc: boolean;
  x_axis: string;
};

// NEW PLAN FOR DATA: Let's just get all of the information, interpolate all the channels, and then do the calculations ourselves

export const getRaceData = async (year: string | number): Promise<string> => {
  if (USE_TEST_DATA) {
    return new Promise((resolve) => {
      resolve(raceData);
    });
  }
  const res = await apiClient.post("/races", { year: year });
  return JSON.stringify(res.data);
};

export const getDriverData = async (reqData: SessionId): Promise<string> => {
  if (USE_TEST_DATA) {
    return new Promise((resolve) => {
      resolve(driverData);
    });
  }
  const res = await apiClient.post("/drivers", reqData);
  return JSON.stringify(res.data);
};

export const getLapData = async (reqData: SessionId): Promise<string> => {
  if (USE_TEST_DATA) {
    return new Promise((resolve) => {
      resolve(lapData);
    });
  }
  const res = await apiClient.post("/laps", reqData);
  return JSON.stringify(res.data);
};

export const getCompData = async (
  path: string,
  session: SessionId,
  laps: string[][],
  graphArgs: GraphArgs
): Promise<string> => {
  if (USE_TEST_DATA) {
    if (path === "/map") {
      return new Promise((resolve) => {
        resolve(mapData);
      });
    } else if (path === "/graph") {
      return new Promise((resolve) => {
        resolve(graphData);
      });
    } else if (path === "/both") {
      return new Promise((resolve) => {
        resolve(bothData);
      });
    }
  }
  const res = await apiClient.post(path, {
    ...session,
    laps: laps,
    args: graphArgs,
  });
  return JSON.stringify(res.data);
};
