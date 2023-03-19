import axios from "axios";
import { YearInfo } from "../contexts/AppContext";
import { DriverLaps, LapTel } from "./graph-utils";
import { compData, lapData, multiCompData, raceData } from "./test-data";

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
  comb_laps: { [_key: string]: string[][] };
};

export const getRaceData = async (
  year: string | number,
  onError?: (_s: string) => void
): Promise<YearInfo | undefined> => {
  if (USE_TEST_DATA) {
    return new Promise((resolve) => {
      resolve(JSON.parse(raceData));
    });
  }
  const res = await apiClient.post("/races", { year: year });
  if (typeof res.data !== "object") {
    onError && onError(res.data);
    return undefined;
  }
  return res.data;
};

export const getLapData = async (
  reqData: SessionId,
  onError?: (_s: string) => void
): Promise<DriverLaps | undefined> => {
  if (USE_TEST_DATA) {
    return new Promise((resolve) => {
      resolve(JSON.parse(lapData));
    });
  }
  const res = await apiClient.post("/laps", reqData);
  if (typeof res.data !== "object") {
    onError && onError(res.data);
    return undefined;
  }
  return res.data;
};

export const getCompData = async (
  session: SessionId,
  laps: string[],
  graphArgs: GraphArgs,
  onError?: (_s: string) => void
): Promise<{ laptel: LapTel | undefined; sectorDists?: number[] }> => {
  if (USE_TEST_DATA) {
    return new Promise((resolve) => {
      laps.length !== 2 ? resolve(JSON.parse(multiCompData)) : resolve(JSON.parse(compData));
    });
  }
  const newLaps = laps.map((l) => l.split("-"));
  const res = await apiClient.post("/comp", {
    ...session,
    laps: newLaps,
    args: graphArgs,
  });
  if (!res?.data?.laptel) {
    onError && onError(res.data);
    return { laptel: undefined };
  }
  return res.data;
};
