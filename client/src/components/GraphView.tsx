import Plotly from "plotly.js-dist-min";
import React, { useContext, useState } from "react";

import { Button, Select, Slider, Switch } from "antd";
import { get } from "lodash";
import Plot from "react-plotly.js";
import { AppContext } from "../contexts/AppContext";
import { get_best_colors } from "../utils/calc-utils";
import { getColDiff, getGraphCompData, getGraphHeight, getMapCompData, Tel } from "../utils/graph-utils";
import ColorSelector from "./ColorSelector";
import Div from "./Div";
import GraphContainer from "./GraphContainer";
import GraphOptionContainer from "./GraphOptionContainer";

const { Option } = Select;

const GraphView: React.FC = () => {
  const {
    state: { graphsLoading, graphInfo, sectorDists, graphArgs },
  } = useContext(AppContext);

  const [graphMarker, setGraphMarker] = useState<number | undefined>();
  const [showRollingGraph, setShowRollingGraph] = useState<boolean>(false);
  const [rollingGraph, setRollingGraph] = useState<number>(3);
  const [maxTDiff, setMaxTDiff] = useState<number>(1.0);
  const [mmaxTDiff, setMmaxTDiff] = useState<number>();
  const [otherYs, setOtherYs] = useState<string[]>([]);
  const [maxColor, setMaxColor] = useState<number>(10);
  const [mmaxColor, setMmaxColor] = useState<number>();
  const [showRollingMap, setShowRollingMap] = useState<boolean>(false);
  const [rollingMap, setRollingMap] = useState<number>(3);
  const [cameraPos, setCameraPos] = useState<object>({
    camera: {
      eye: { x: 0.5, y: 0.5, z: 7 },
      up: { x: 0, y: 1, z: 0 },
    },
    dragmode: "pan",
  });
  const [lineColors, setLineColors] = useState<string[]>([]);

  const setLineColor = (index: number, color: string) => {
    const newLineColors = lineColors.slice();
    newLineColors[index] = color;
    setLineColors(newLineColors);
  };

  const graphPlot = React.useRef<HTMLElement>();
  const mapPlot = React.useRef<HTMLElement>();

  const onMapHover = (eventdata: any) => {
    if (graphInfo) {
      const relDist = graphInfo[0].tel.Distance[eventdata.points[0].pointNumber];
      //@ts-ignore
      Plotly.Fx.hover("graphPlot", {
        xval: relDist,
      });
    }
  };

  const onGraphHover = (eventdata: any) => {
    if (graphInfo) {
    }
  };

  React.useEffect(() => {
    if (graphInfo) {
      const driverColors = get_best_colors(graphInfo.map(({ driver }) => driver));
      setLineColors(graphInfo.map(({ driver }) => driverColors[driver]));
      const speedDiff = getColDiff(graphInfo, "Speed");
      const absSpeedMax = Math.ceil(Math.max(...speedDiff.map((a) => Math.abs(a))));
      setMmaxColor(absSpeedMax);
      const time_diff = getColDiff(graphInfo, "Time");
      const absTimeMax = Math.ceil(Math.max(...time_diff.map((a) => Math.abs(a)), 1000) / 100) / 10;
      setMmaxTDiff(absTimeMax);
    }
  }, [graphInfo]);

  // TODO: use this instead of 30vw as the height
  const graphHeight = `${getGraphHeight(["Speed", ...otherYs])}vw`;

  return (
    // TODO: show where yellow flags are based off time overlap with sectors, on lap graph show all reds/scs/etc.
    <>
      <GraphContainer defaultHeight={"30vw"} defaultWidth={"55vw"} loading={graphsLoading}>
        {graphInfo && (
          <Plot
            ref={graphPlot}
            divId="graphPlot"
            {...getGraphCompData(
              graphInfo,
              lineColors,
              sectorDists,
              maxTDiff,
              graphArgs.x_axis as keyof Tel,
              showRollingGraph ? rollingGraph : undefined,
              graphMarker,
              otherYs
            )}
            config={{ editable: true }}
            onHover={(eventData: any) => onGraphHover(eventData)}
            onClick={(eventData: any) => setGraphMarker(eventData.points[0].pointNumber)}
            // NOTE: currently, there's not an easy way to link the graph hover to the map hover
          />
        )}
      </GraphContainer>
      <GraphContainer defaultHeight={"30vw"} defaultWidth={"35vw"} loading={graphsLoading}>
        {graphInfo && maxColor && (
          // TODO: option to plot time_diff based on x y ? -- click multiple times to create sections?
          <Plot
            ref={mapPlot}
            divId="mapPlot"
            {...getMapCompData(
              graphInfo,
              lineColors,
              cameraPos,
              maxColor,
              showRollingMap ? rollingMap : undefined,
              graphMarker
            )}
            config={{ editable: true }}
            onRelayout={(eventData: any) =>
              setCameraPos({
                camera: get(eventData, "scene.camera", get(cameraPos, "camera")),
                dragmode: get(eventData, "scene.dragmode", get(cameraPos, "dragmode")),
              })
            }
            onHover={(eventData: any) => onMapHover(eventData)}
            onClick={(eventData: any) => setGraphMarker(eventData.points[0].pointNumber)}
          />
        )}
      </GraphContainer>
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
          <Button onClick={() => setGraphMarker(undefined)}>Clear Marker</Button>
        </GraphOptionContainer>
        <GraphOptionContainer>
          <p style={{ color: "white" }}>
            Current speed range: -{maxColor} to {maxColor}
          </p>
          <Slider min={1} step={1} value={maxColor} max={mmaxColor} onChange={(value) => setMaxColor(value)} />
        </GraphOptionContainer>
        <GraphOptionContainer>
          <p style={{ color: "white" }}>Rolling Mean for Map{showRollingMap && `: ${rollingMap}`}</p>
          <Switch onChange={() => setShowRollingMap(!showRollingMap)} />
          {showRollingMap && (
            <Slider value={rollingMap} step={1} min={1} max={300} onChange={(value) => setRollingMap(value)} />
          )}
        </GraphOptionContainer>
        {
          // TODO: we probably wanna replace this with a form
          graphInfo && (
            <GraphOptionContainer>
              <Div display="flex" alignItems="center">
                {/* TODO: add alert when two colors are too similar */}
                <ColorSelector value={lineColors[0]} setValue={(v) => setLineColor(0, v)} />
                <ColorSelector value={lineColors[1]} setValue={(v) => setLineColor(1, v)} />
                <Button>Submit</Button>
              </Div>
            </GraphOptionContainer>
          )
        }
      </Div>
    </>
  );
};

export default GraphView;
