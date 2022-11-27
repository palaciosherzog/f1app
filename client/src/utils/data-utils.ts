import axios from "axios";
import { compData, lapData, multiCompData, raceData } from "./test-data";

const USE_TEST_DATA = true;
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

export const getRaceData = async (year: string | number): Promise<string> => {
  if (USE_TEST_DATA) {
    return new Promise((resolve) => {
      resolve(raceData);
    });
  }
  const res = await apiClient.post("/races", { year: year });
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

export const getCompData = async (session: SessionId, laps: string[], graphArgs: GraphArgs): Promise<string> => {
  if (USE_TEST_DATA) {
    return new Promise((resolve) => {
      laps.length !== 2 ? resolve(multiCompData) : resolve(compData);
    });
  }
  const newLaps = laps.map((l) => l.split("-"));
  const res = await apiClient.post("/comp", {
    ...session,
    laps: newLaps,
    args: graphArgs,
  });
  return JSON.stringify(res.data);
};
