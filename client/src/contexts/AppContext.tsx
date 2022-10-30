import React, { useEffect, useState } from "react";
import { getCompData, getLapData, getRaceData, GraphArgs, SessionId } from "../utils/data-utils";
import { DriverLaps, GraphInfo, MapInfo } from "../utils/graph-utils";

export type MarkerInfo = number;

type YearInfo = {
  [rn: string]: { EventName: number; Sessions: string[] };
};

interface LapSelectOption {
  value: string;
  label: string;
  children?: LapSelectOption[];
}

export type AppContextType = {
  state: {
    yearInfo: YearInfo | undefined;
    lapInfo: DriverLaps | undefined;
    graphInfo: GraphInfo | undefined;
    mapInfo: MapInfo | undefined;
    sessionInfo: SessionId;
    compLaps: string[][];
    compLaps2: string[][];
    driverFilter: string[];
    sessionsLoading: boolean;
    lapsLoading: boolean;
    graphsLoading: boolean;
    graphMarker: MarkerInfo | undefined;
    lapsList: LapSelectOption[] | undefined;
  };
  actions: {
    getYearInfo: () => void;
    getLapInfo: () => void;
    getGraphsInfo: (_graphArgs: GraphArgs) => void;
    setSessionInfo: (_value: SessionId) => void;
    setCompLaps: (_value: string[][]) => void;
    setCompLaps2: (_value: string[][]) => void;
    setDriverFilter: (_value: string[]) => void;
    setGraphMarker: (_value?: MarkerInfo) => void;
  };
};

type AppContextProps = {
  children?: React.ReactNode;
};

export const AppContext = React.createContext<AppContextType>({} as AppContextType);

export const AppContextProvider: React.FC<AppContextProps> = (props) => {
  const [yearInfo, setYearInfo] = useState<YearInfo | undefined>();
  const [lapInfo, setLapInfo] = useState<DriverLaps | undefined>();
  const [graphInfo, setGraphInfo] = useState<GraphInfo | undefined>();
  const [mapInfo, setMapInfo] = useState<MapInfo | undefined>();
  const [sessionInfo, setSessionInfo] = useState<SessionId>({ year: "", session: "", round: "" });
  const [compLaps, setCompLaps] = useState<string[][]>([]);
  const [compLaps2, setCompLaps2] = useState<string[][]>([]);
  const [driverFilter, setDriverFilter] = useState<string[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(false);
  const [lapsLoading, setLapsLoading] = useState<boolean>(false);
  const [graphsLoading, setGraphsLoading] = useState<boolean>(false);
  const [graphMarker, setGraphMarker] = useState<MarkerInfo | undefined>();
  const [lapsList, setLapsList] = React.useState<LapSelectOption[]>();

  React.useEffect(() => {
    if (lapInfo) {
      setLapsList(
        Object.entries(lapInfo).map(([driver, ls]) => ({
          label: driver,
          value: driver,
          children: ls.laps.LapNumber.map((ln: number, i: number) => ({
            label: `Lap ${ln} [${ls.laps.LapTime[i]}]`,
            value: `${ln}`,
          })),
        }))
      );
    }
  }, [lapInfo]);

  useEffect(() => {
    if (sessionInfo.year && !sessionInfo.round && !sessionInfo.session) {
      getYearInfo();
    }
    if (sessionInfo.year && sessionInfo.round && sessionInfo.session) {
      getLapInfo();
    }
  }, [sessionInfo]);

  const getYearInfo = async () => {
    setSessionsLoading(true);
    if (sessionInfo.year) {
      const data = await getRaceData(sessionInfo.year);
      setYearInfo(JSON.parse(data));
    }
    setSessionsLoading(false);
  };

  const getLapInfo = async () => {
    setLapsLoading(true);
    if (sessionInfo.year && sessionInfo.round && sessionInfo.session) {
      const data = JSON.parse(await getLapData(sessionInfo));
      setLapInfo(data);
    }
    setLapsLoading(false);
  };

  const getGraphsInfo = async (graphArgs: GraphArgs) => {
    setGraphsLoading(true);
    if (sessionInfo.year && sessionInfo.round && sessionInfo.session && compLaps.length >= 2) {
      const compInfo = await getCompData(`/both`, sessionInfo, compLaps, graphArgs);
      const res = JSON.parse(compInfo);
      setMapInfo(res.map);
      setGraphInfo(res.graph);
    }
    setGraphsLoading(false);
  };

  const context = {
    state: {
      yearInfo,
      lapInfo,
      graphInfo,
      mapInfo,
      sessionInfo,
      compLaps,
      compLaps2,
      driverFilter,
      sessionsLoading,
      lapsLoading,
      graphsLoading,
      graphMarker,
      lapsList,
    },
    actions: {
      getYearInfo,
      getLapInfo,
      getGraphsInfo,
      setSessionInfo,
      setCompLaps,
      setCompLaps2,
      setDriverFilter,
      setGraphMarker,
    },
  };

  return <AppContext.Provider value={context}>{props.children}</AppContext.Provider>;
};

export const useAppContext = () => React.useContext(AppContext);

export const AppContextConsumer = AppContext.Consumer;
