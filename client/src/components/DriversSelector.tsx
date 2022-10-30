import React, { useContext } from "react";

import { AppContext } from "../contexts/AppContext";
import CustomSelect from "./CustomSelect";
import Div from "./Div";
import SelectorContainer from "./SelectorContainer";

export type DriverInfo = { Abbreviation: string[]; FullName: string[] };

const DriversSelector = () => {
  const {
    state: { lapInfo, driverFilter },
    actions: { setDriverFilter },
  } = useContext(AppContext);

  const [driverList, setDriverList] = React.useState<{ label: string; value: string }[]>([]);

  React.useEffect(() => {
    if (lapInfo) {
      setDriverList(Object.keys(lapInfo).map((d: string) => ({ label: lapInfo[d].fullName, value: d })));
    }
  }, [lapInfo]);

  return (
    <SelectorContainer>
      <Div flex={1} mx="5px">
        <CustomSelect
          flex={1}
          mode="multiple"
          options={driverList}
          placeholder="Filter Driver Laps..."
          isLoading={!driverList}
          value={driverFilter}
          onChange={(v: string[]) => setDriverFilter(v)}
          noOptionsMessage={() => "Choose a session first"}
        />
      </Div>
    </SelectorContainer>
  );
};

export default DriversSelector;
