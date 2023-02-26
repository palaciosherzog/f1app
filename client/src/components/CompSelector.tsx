import React, { useContext } from "react";

import { Button, Checkbox, Radio } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import { AppContext } from "../contexts/AppContext";
import Div from "./Div";
import LapSelector from "./LapSelector";
import SelectorContainer from "./SelectorContainer";

interface Option {
  value: string;
  label: string;
  children?: Option[];
}

const DriverSelector = () => {
  const {
    state: { compLaps },
    actions: { setCompLaps, getGraphsInfo },
  } = useContext(AppContext);

  const [useAcc, setUseAcc] = React.useState<boolean>(false);
  const [xAxis, setXAxis] = React.useState<string>("Distance");

  // TODO: should add an option to compare averages of a bunch of laps --> i already have the algorithm set up
  return (
    <>
      <SelectorContainer>
        <Div flex={1} mx="5px">
          <LapSelector value={compLaps} onChange={setCompLaps} />
        </Div>
        <Div mt="5px" mx="5px">
          <Checkbox
            style={{ color: "white" }}
            checked={useAcc}
            onChange={(v: CheckboxChangeEvent) => setUseAcc(v.target.checked)}
          >
            Accurate Sectors
          </Checkbox>
        </Div>
        <Div mx="5px">
          <Radio.Group onChange={(e) => setXAxis(e.target.value)} defaultValue="Distance">
            <Radio.Button value="Distance">Distance</Radio.Button>
            <Radio.Button value="RelativeDistance">Relative</Radio.Button>
          </Radio.Group>
        </Div>
        <Button onClick={() => getGraphsInfo({ use_acc: useAcc, x_axis: xAxis })}>Submit</Button>
      </SelectorContainer>
    </>
  );
};

export default DriverSelector;
