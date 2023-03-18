import React, { useContext } from "react";

import { css } from "@emotion/css";
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
  const [laps, setLaps] = React.useState<string[]>([]);
  const [combLapsCount, setCombLapsCount] = React.useState<number>(1);
  const [combLaps, setCombLaps] = React.useState<{ [_key: string]: string[][] }>({});

  return (
    <>
      <SelectorContainer>
        <Div flex={1} mx="5px">
          <LapSelector value={laps} onChange={setLaps} />
        </Div>
        <Button
          onClick={() => {
            setCombLaps({ ...combLaps, [`COMB-${combLapsCount}`]: laps.map((l) => l.split("-")) });
            setCombLapsCount(combLapsCount + 1);
            setLaps([]);
          }}
        >
          Create Average Lap
        </Button>
      </SelectorContainer>
      <SelectorContainer>
        <Div flex={1} mx="5px">
          <LapSelector value={compLaps} onChange={setCompLaps} combLaps={combLaps} />
        </Div>
        <Div mt="5px" mx="5px">
          <Checkbox
            className={css`
              color: white;
            `}
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
        <Button onClick={() => getGraphsInfo({ use_acc: useAcc, x_axis: xAxis, comb_laps: combLaps })}>Submit</Button>
      </SelectorContainer>
    </>
  );
};

export default DriverSelector;
