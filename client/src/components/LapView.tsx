import React, { useContext, useState } from "react";

import { Button, Checkbox, InputNumber, Modal, Radio, Slider, Switch } from "antd";
import { CheckboxValueType } from "antd/lib/checkbox/Group";
import Plot from "react-plotly.js";
import { AppContext } from "../contexts/AppContext";
import { DriverLaps, FilterOptions, getLapGraph } from "../utils/graph-utils";
import Div from "./Div";
import GraphContainer from "./GraphContainer";
import GraphOptionContainer from "./GraphOptionContainer";

const LapView: React.FC = () => {
  const {
    state: { lapsLoading, lapInfo, driverFilter, compLaps },
    actions: { setCompLaps },
  } = useContext(AppContext);

  const [localLapInfo, setLocalLapInfo] = useState<DriverLaps>();
  const [lapRange, setLapRange] = useState<[number, number]>([0, 0]);
  const [mminLapNumber, setMMinLapNumber] = useState<number>(0);
  const [mmaxLapNumber, setMMaxLapNumber] = useState<number>(0);
  const [lapTimeRange, setLapTimeRange] = useState<[number, number]>([0, 0]);
  const [mminLapTimeNumber, setMMinLapTimeNumber] = useState<number>(0);
  const [mmaxLapTimeNumber, setMMaxLapTimeNumber] = useState<number>(0);
  const [graphType, setGraphType] = useState<string>("lap-time");
  const [fuelLoad, setFuelLoad] = useState<number | undefined>();
  const [removeFilter, setRemoveFilter] = useState<FilterOptions>({});
  const [removeLaps, setRemoveLaps] = useState<Array<[string, number]>>([]);
  const [markFilter, setMarkFilter] = useState<FilterOptions>({});
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedPoint, setSelectedPoint] = useState<any>();
  const [newLapTime, setNewLapTime] = useState<number>(0);
  const [hampelK, setHampelK] = useState<number>(7);
  const [hampelT0, setHampelT0] = useState<number>(3);
  const [stdDevT0, setStdDevT0] = useState<number>(3);

  React.useEffect(() => {
    if (lapInfo) {
      const minLap = Math.max(Math.min(...Object.keys(lapInfo).map((d) => lapInfo[d].laps.LapNumber[0])), 1);
      const maxLap = Math.max(...Object.keys(lapInfo).map((d) => lapInfo[d].laps.LapNumber.slice(-1)[0]));
      setLapRange([minLap, maxLap]);
      setHampelK(Math.floor((maxLap - minLap) / 5));
      setMMaxLapNumber(maxLap);
      setMMinLapNumber(minLap);
      const lapTimes = Object.keys(lapInfo)
        .map((d) => lapInfo[d].laps.Time.map((t, i) => t - lapInfo[d].laps.LapStartTime[i]))
        .flat();
      const minLapTime = Math.min(...lapTimes);
      const maxLapTime = Math.max(...lapTimes);
      setLapTimeRange([minLapTime, maxLapTime]);
      setMMaxLapTimeNumber(maxLapTime);
      setMMinLapTimeNumber(minLapTime);
      setLocalLapInfo(lapInfo);
    }
  }, [lapInfo]);

  const adjustLapTime = (driver: string, lapNumber: number, newLapTime: number) => {
    if (localLapInfo) {
      lapNumber -= 1; // adjust to get index
      const driverInfo = localLapInfo[driver];
      const newLapTimes = driverInfo.laps.LapTime.slice();
      newLapTimes[lapNumber] = newLapTime;
      // Calculate difference to current Time - LapStartTime
      const timeDiff = driverInfo.laps.Time[lapNumber] - driverInfo.laps.LapStartTime[lapNumber] - newLapTime;
      // Adjust all Time values from LapNumber on by difference
      const newTimes = driverInfo.laps.Time.map((v, i) => (i < lapNumber ? v : v - timeDiff));
      // Adjust all LapStartTime values past LapNumber by difference
      const newLapStartTimes = driverInfo.laps.LapStartTime.map((v, i) => (i <= lapNumber ? v : v - timeDiff));
      setLocalLapInfo({
        ...localLapInfo,
        [driver]: {
          ...driverInfo,
          laps: { ...driverInfo.laps, LapTime: newLapTimes, LapStartTime: newLapStartTimes, Time: newTimes },
        },
      });
    }
  };

  const setFilterOptions = (toSet: (_f: FilterOptions) => void, selected: CheckboxValueType[]) => {
    toSet(Object.fromEntries(selected.map((v) => [v, true])));
  };

  const getFilterOptions = (f: FilterOptions): FilterOptions => {
    return { ...f, hampel: f.hampel ? [hampelK, hampelT0] : undefined, stddev: f.stddev ? stdDevT0 : undefined };
  };

  return (
    <Div display="flex" flexDirection="column" width="80%" alignItems="center">
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title="Edit Lap"
        footer={[
          <Button
            key="filter"
            type="primary"
            onClick={() => {
              setRemoveLaps([...removeLaps, [selectedPoint?.Driver as string, selectedPoint?.LapNumber as number]]);
              setModalOpen(false);
            }}
          >
            Hide Point
          </Button>,
          <Button
            key="compare"
            type="primary"
            onClick={() => {
              setCompLaps([...compLaps, `${selectedPoint?.Driver}-${selectedPoint?.LapNumber}`]);
              setModalOpen(false);
            }}
          >
            Add to Compare
          </Button>,
        ]}
      >
        <p>Has information:</p>
        {selectedPoint &&
          Object.entries(selectedPoint).map(([key, val]) => <Div key={`point-${key}`}>{`${key} => ${val}`}</Div>)}
        <Div display="flex" flexDirection="row" alignItems="center">
          <Div>New Lap Time:</Div>
          <InputNumber value={newLapTime} onChange={(n) => n && setNewLapTime(n)}></InputNumber>
          <Button
            onClick={() => selectedPoint && adjustLapTime(selectedPoint.Driver, selectedPoint.LapNumber, newLapTime)}
          >
            Submit
          </Button>
        </Div>
      </Modal>
      <GraphContainer defaultHeight="30vw" defaultWidth="100%" loading={lapsLoading}>
        {localLapInfo && (
          <Plot
            onClick={(eventdata: any) => {
              setSelectedPoint(eventdata.points[0].text);
              setModalOpen(true);
            }}
            {...getLapGraph(
              localLapInfo,
              driverFilter,
              graphType,
              fuelLoad,
              mmaxLapNumber,
              { lapRange, lapTimeRange, ...getFilterOptions(removeFilter), laps: removeLaps },
              getFilterOptions(markFilter)
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
          <p style={{ color: "white" }}>
            Current lap time range: {lapTimeRange[0]} to {lapTimeRange[1]}
          </p>
          <Slider
            range
            min={mminLapTimeNumber}
            max={mmaxLapTimeNumber}
            step={1}
            value={lapTimeRange}
            onChange={(value: [number, number]) => setLapTimeRange(value)}
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
          <Div>Hampel k:</Div>
          <Slider min={1} max={100} step={1} value={hampelK} onChange={(value: number) => setHampelK(value)} />
          <Div>Hampel t0:</Div>
          <Slider min={0} max={5} step={0.5} value={hampelT0} onChange={(value: number) => setHampelT0(value)} />
          <Div>StdDev t0:</Div>
          <Slider min={0} max={5} step={0.5} value={stdDevT0} onChange={(value: number) => setStdDevT0(value)} />
        </GraphOptionContainer>
      </Div>
    </Div>
  );
};

export default LapView;
