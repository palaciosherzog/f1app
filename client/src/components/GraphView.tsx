import React, { useContext, useState } from "react";

import { Button, Select, Slider, Switch } from "antd";
import Plot from "react-plotly.js";
import { AppContext } from "../contexts/AppContext";
import { getGraphCompData, getGraphHeight } from "../utils/graph-utils";
import Div from "./Div";
import GraphOptionContainer from "./GraphOptionContainer";

const { Option } = Select;

const GraphView: React.FC<{
  graphRef: React.MutableRefObject<HTMLElement | undefined>;
  onHover: (_eventData: any) => void;
}> = ({ graphRef, onHover }) => {
  const {
    state: { graphInfo, graphMarker },
    actions: { setGraphMarker },
  } = useContext(AppContext);

  const [showRollingGraph, setShowRollingGraph] = useState<boolean>(false);
  const [rollingGraph, setRollingGraph] = useState<number>(3);
  const [maxTDiff, setMaxTDiff] = useState<number>(1.0);
  const [mmaxTDiff, setMmaxTDiff] = useState<number>();
  const [otherYs, setOtherYs] = useState<string[]>([]);

  React.useEffect(() => {
    if (graphInfo) {
      const absMax = Math.ceil(Math.max(...graphInfo.timecomp.Time_diff.map((a) => Math.abs(a)), 1) * 10) / 10;
      setMmaxTDiff(absMax);
    }
  }, [graphInfo]);

  const getDistance = (eventData: any) => {
    if (graphInfo) {
      const point = eventData.points.filter((point: any) => point.curveNumber === 0)[0];
      return graphInfo.driver1data.RelativeDistance[point.pointNumber];
    }
  };

  const graphHeight = `${getGraphHeight(["Speed", ...otherYs])}vw`;

  return (
    // TODO: show where yellow flags are based off time overlap with sectors, on lap graph show all reds/scs/etc.
    <Div flexDirection="column" width="55vw" margin="25px">
      <Div width="100%" minHeight="30vw" height={graphHeight}>
        {graphInfo && (
          <Plot
            ref={graphRef}
            divId="graphPlot"
            {...getGraphCompData(
              graphInfo,
              maxTDiff,
              showRollingGraph ? rollingGraph : undefined,
              graphMarker,
              otherYs
            )}
            onHover={(eventData: any) => onHover(eventData)}
            onClick={(eventData: any) => setGraphMarker(getDistance(eventData))}
            // NOTE: currently, there's not an easy way to link the graph hover to the map hover
          />
        )}
      </Div>
      <Div display="flex" flexDirection="row" justifyContent="center" height="10vw">
        <GraphOptionContainer>
          <p>
            Current time range: -{maxTDiff} to {maxTDiff}
          </p>
          <Slider min={0.1} step={0.1} value={maxTDiff} max={mmaxTDiff} onChange={(value) => setMaxTDiff(value)} />
        </GraphOptionContainer>
        <GraphOptionContainer>
          <p style={{ color: "white" }}>
            Rolling Mean
            {showRollingGraph && `: ${rollingGraph}`}
          </p>
          <Switch onChange={() => setShowRollingGraph(!showRollingGraph)} />
          {showRollingGraph && (
            <Slider value={rollingGraph} step={1} min={1} max={300} onChange={(value) => setRollingGraph(value)} />
          )}
        </GraphOptionContainer>
        <GraphOptionContainer>
          <Select
            mode="multiple"
            allowClear
            style={{ width: "100%" }}
            placeholder="Other data..."
            onChange={(value: string[]) => setOtherYs(value)}
          >
            <Option value="Throttle">Throttle</Option>
            <Option value="Brake">Brake</Option>
            <Option value="DRS">DRS</Option>
            <Option value="nGear">nGear</Option>
            <Option value="sepTime">Separate Time Diff</Option>
          </Select>
        </GraphOptionContainer>
        <GraphOptionContainer>
          <Button onClick={() => setGraphMarker()}>Clear Marker</Button>
        </GraphOptionContainer>
      </Div>
    </Div>
  );
};

export default GraphView;
