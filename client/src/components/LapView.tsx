import React, { useContext, useState } from "react";

import { Checkbox, Radio, Slider, Switch } from "antd";
import { CheckboxValueType } from "antd/lib/checkbox/Group";
import Plot from "react-plotly.js";
import { AppContext } from "../contexts/AppContext";
import { FilterOptions, getLapGraph } from "../utils/graph-utils";
import Div from "./Div";
import GraphContainer from "./GraphContainer";
import GraphOptionContainer from "./GraphOptionContainer";

const LapView: React.FC = () => {
  const {
    state: { lapsLoading, lapInfo, driverFilter, compLaps },
    actions: { setCompLaps },
  } = useContext(AppContext);

  const [lapRange, setLapRange] = useState<[number, number]>([0, 0]);
  const [mminLapNumber, setMMinLapNumber] = useState<number>(0);
  const [mmaxLapNumber, setMMaxLapNumber] = useState<number>(0);
  const [graphType, setGraphType] = useState<string>("lap-time");
  const [fuelLoad, setFuelLoad] = useState<number | undefined>();
  const [removeFilter, setRemoveFilter] = useState<FilterOptions>({});
  const [markFilter, setMarkFilter] = useState<FilterOptions>({});

  React.useEffect(() => {
    if (lapInfo) {
      const minLap = Math.max(Math.min(...Object.keys(lapInfo).map((d) => lapInfo[d].laps.LapNumber[0])), 1);
      const maxLap = Math.max(...Object.keys(lapInfo).map((d) => lapInfo[d].laps.LapNumber.slice(-1)[0]));
      setLapRange([minLap, maxLap]);
      setMMaxLapNumber(maxLap);
      setMMinLapNumber(minLap);
    }
  }, [lapInfo]);

  const setFilterOptions = (toSet: (_f: FilterOptions) => void, selected: CheckboxValueType[]) => {
    toSet(Object.fromEntries(selected.map((v) => [v, true])));
  };

  // TODO: add way to adjust lap time on race pace for simulation
  // thinking: need to make a way where if you click on one, set it as the one to add the clicked lap onto
  return (
    <Div display="flex" flexDirection="column" width="80%" alignItems="center">
      <GraphContainer defaultHeight="30vw" defaultWidth="100%" loading={lapsLoading}>
        {lapInfo && (
          <Plot
            onClick={(eventdata: any) => setCompLaps([...compLaps, eventdata.points[0].text.split("-")])}
            {...getLapGraph(
              lapInfo,
              driverFilter,
              graphType,
              fuelLoad,
              mmaxLapNumber,
              { lapRange, ...removeFilter },
              markFilter
            )}
          />
        )}
      </GraphContainer>
      <Div display="flex" flexDirection="row" justifyContent="center">
        <GraphOptionContainer>
          <p style={{ color: "white" }}>
            Current lap range: {lapRange[0]} to {lapRange[1]}
          </p>
          <Slider
            range
            min={mminLapNumber}
            max={mmaxLapNumber}
            step={1}
            value={lapRange}
            onChange={(value: [number, number]) => setLapRange(value)}
          />
        </GraphOptionContainer>
        <GraphOptionContainer width="24vw">
          <Radio.Group onChange={(e) => setGraphType(e.target.value)} defaultValue="lap-time">
            <Radio.Button value="lap-time">Lap Times</Radio.Button>
            <Radio.Button value="race-trace">Race Trace</Radio.Button>
            <Radio.Button value="stint-summary">Stint Summary</Radio.Button>
          </Radio.Group>
        </GraphOptionContainer>
        <GraphOptionContainer>
          <p style={{ color: "white" }}>Correct Lap Times for Fuel Load</p>
          <Switch onChange={() => setFuelLoad(fuelLoad === undefined ? 100 : undefined)} />
          {fuelLoad !== undefined && (
            <Slider value={fuelLoad} step={1} min={0} max={200} onChange={(value) => setFuelLoad(value)} />
          )}
        </GraphOptionContainer>
        <GraphOptionContainer width="35vw">
          <Checkbox.Group
            style={{
              width: "100%",
              color: "white",
            }}
            onChange={(e) => setFilterOptions(setRemoveFilter, e)}
          >
            <Div display="flex" flexDirection="row">
              <Div mr={3}>Remove:</Div>
              <Checkbox value="boxLaps" style={{ color: "white" }}>
                Box Laps
              </Checkbox>
              <Checkbox value="trackStatus" style={{ color: "white" }}>
                Status
              </Checkbox>
              <Checkbox value="hampel" style={{ color: "white" }}>
                Hampel
              </Checkbox>
              <Checkbox value="stddev" style={{ color: "white" }}>
                Std. Dev.
              </Checkbox>
            </Div>
          </Checkbox.Group>
          <Checkbox.Group
            style={{
              width: "100%",
              color: "white",
            }}
            onChange={(e) => setFilterOptions(setMarkFilter, e)}
          >
            <Div display="flex" flexDirection="row">
              <Div mr={3}>Mark:</Div>
              <Checkbox value="boxLaps" style={{ color: "white" }}>
                Box Laps
              </Checkbox>
              <Checkbox value="trackStatus" style={{ color: "white" }}>
                Status
              </Checkbox>
              <Checkbox value="hampel" style={{ color: "white" }}>
                Hampel
              </Checkbox>
              <Checkbox value="stddev" style={{ color: "white" }}>
                Std. Dev.
              </Checkbox>
            </Div>
          </Checkbox.Group>
        </GraphOptionContainer>
      </Div>
    </Div>
  );
};

export default LapView;
