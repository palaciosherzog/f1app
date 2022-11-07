import React, { useContext, useEffect, useState } from "react";

import { Button, Input, Select, Slider, Switch } from "antd";
import { cloneDeep } from "lodash";
import Plot from "react-plotly.js";
import { AppContext, LapLabels } from "../contexts/AppContext";
import { getColDiff, getGraphCompData, getGraphHeight, Tel } from "../utils/graph-utils";
import ColorSelector from "./ColorSelector";
import Div from "./Div";
import GraphOptionContainer from "./GraphOptionContainer";

const { Option } = Select;

const GraphView: React.FC<{
  graphRef: React.MutableRefObject<HTMLElement | undefined>;
  onHover: (_eventData: any) => void;
}> = ({ graphRef, onHover }) => {
  const {
    state: { graphInfo, graphMarker, graphLabels, sectorDists, graphArgs },
    actions: { setGraphMarker, setGraphLabels },
  } = useContext(AppContext);

  const [showRollingGraph, setShowRollingGraph] = useState<boolean>(false);
  const [rollingGraph, setRollingGraph] = useState<number>(3);
  const [maxTDiff, setMaxTDiff] = useState<number>(1.0);
  const [mmaxTDiff, setMmaxTDiff] = useState<number>();
  const [otherYs, setOtherYs] = useState<string[]>([]);
  const [localGraphLabels, setLocalGraphLabels] = useState<LapLabels>({ title: "", colors: {}, labels: {} });

  useEffect(() => {
    if (graphInfo) {
      const time_diff = getColDiff(graphInfo, "Time");
      const absMax = Math.ceil(Math.max(...time_diff.map((a) => Math.abs(a)), 1000) / 100) / 10;
      setMmaxTDiff(absMax);
    }
  }, [graphInfo]);

  useEffect(() => {
    setLocalGraphLabels(cloneDeep(graphLabels));
  }, [graphLabels]);

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
              graphLabels,
              sectorDists,
              maxTDiff,
              graphArgs.x_axis as keyof Tel,
              showRollingGraph ? rollingGraph : undefined,
              graphMarker,
              otherYs
            )}
            onHover={(eventData: any) => onHover(eventData)}
            onClick={(eventData: any) => setGraphMarker(eventData.points[0].pointNumber)}
            // NOTE: currently, there's not an easy way to link the graph hover to the map hover
          />
        )}
      </Div>
      <Div display="flex" flexDirection="row" justifyContent="center" height="10vw" flexWrap="wrap">
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
        {
          // TODO: we probably wanna replace this with a form
          graphInfo && (
            <>
              <GraphOptionContainer>
                <Input
                  placeholder="Title of Graph"
                  value={localGraphLabels.title}
                  onChange={(e) => setLocalGraphLabels({ ...localGraphLabels, title: e.target.value })}
                />
              </GraphOptionContainer>
              <GraphOptionContainer>
                {/* TODO: add alert when two colors are too similar */}
                <ColorSelector
                  value={localGraphLabels.colors[0]}
                  setValue={(v) =>
                    setLocalGraphLabels({ ...localGraphLabels, colors: { ...localGraphLabels.colors, 0: v } })
                  }
                />
                <Input
                  placeholder="Label for Line 1"
                  value={localGraphLabels.labels[0]}
                  onChange={(e) =>
                    setLocalGraphLabels({
                      ...localGraphLabels,
                      labels: { ...localGraphLabels.labels, 0: e.target.value },
                    })
                  }
                />
              </GraphOptionContainer>
              <GraphOptionContainer>
                <ColorSelector
                  value={localGraphLabels.colors[1]}
                  setValue={(v) =>
                    setLocalGraphLabels({ ...localGraphLabels, colors: { ...localGraphLabels.colors, 1: v } })
                  }
                />
                <Input
                  placeholder="Label for Line 1"
                  value={localGraphLabels.labels[1]}
                  onChange={(e) =>
                    setLocalGraphLabels({
                      ...localGraphLabels,
                      labels: { ...localGraphLabels.labels, 1: e.target.value },
                    })
                  }
                />
              </GraphOptionContainer>
              <GraphOptionContainer>
                <Button onClick={() => setGraphLabels(cloneDeep(localGraphLabels))}>Submit</Button>
              </GraphOptionContainer>
            </>
          )
        }
      </Div>
    </Div>
  );
};

export default GraphView;
