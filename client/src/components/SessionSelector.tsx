import React, { useContext } from "react";

import { AppContext } from "../contexts/AppContext";
import CustomSelect from "./CustomSelect";
import Div from "./Div";
import SelectorContainer from "./SelectorContainer";

const SessionSelector: React.FC = () => {
  const {
    state: { sessionInfo, yearInfo, sessionsLoading },
    actions: { setSessionInfo },
  } = useContext(AppContext);

  const [localYear, setLocalYear] = React.useState<string | undefined>();
  const [localRound, setLocalRound] = React.useState<string | undefined>();
  const [localSession, setLocalSession] = React.useState<string | undefined>();

  return (
    <SelectorContainer>
      <Div flex={1} mx="5px">
        <CustomSelect
          flex={1}
          inputId="year-select"
          className="single-select"
          classNamePrefix="react-select"
          options={[
            { label: "2022", value: "2022" },
            { label: "2023", value: "2023" },
          ]}
          value={localYear}
          placeholder="Year..."
          onChange={(e: string) => {
            setLocalYear(e);
            setLocalRound(undefined);
            setLocalSession(undefined);
            setSessionInfo({ year: e ?? "", session: "", round: "" });
          }}
        />
      </Div>
      <Div flex={4} mr="5px">
        <CustomSelect
          flex={1}
          inputId="gp-select"
          className="single-select"
          classNamePrefix="react-select"
          options={
            yearInfo
              ? Object.entries(yearInfo)
                  .map(([key, value]) => {
                    return { label: value.EventName, value: key };
                  })
                  .reverse()
              : []
          }
          value={localRound}
          isLoading={sessionsLoading}
          placeholder="Race..."
          onChange={(e: string) => {
            setLocalRound(e);
            setLocalSession(undefined);
          }}
          noOptionsMessage={() => "CustomSelect a year first"}
        />
      </Div>
      <Div flex={3} mr="5px">
        <CustomSelect
          flex={1}
          inputId="gp-select"
          className="single-select"
          classNamePrefix="react-select"
          options={
            yearInfo && localRound
              ? yearInfo[localRound].Sessions.map((val) => {
                  return { label: val, value: val };
                })
              : []
          }
          value={localSession}
          placeholder="Session..."
          onChange={(e: string) => {
            setLocalSession(e);
            setSessionInfo({ year: localYear ?? "", round: localRound ?? "", session: e ?? "" });
          }}
          noOptionsMessage={() => "CustomSelect a race first"}
        />
      </Div>
    </SelectorContainer>
  );
};

export default SessionSelector;
