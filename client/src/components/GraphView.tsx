import Plotly from "plotly.js-dist-min";
import React, { useContext, useState } from "react";

import { css } from "@emotion/css";
import { Button, InputNumber, Radio, Select, Slider, Switch } from "antd";
import { get, sortBy, uniq } from "lodash";
import Plot from "react-plotly.js";
import { AppContext } from "../contexts/AppContext";
import { get_best_colors } from "../utils/calc-utils";
import {
  getColDiff,
  getEqualSegmentPoints,
  getGraphCompData,
  getGraphHeight,
  getMapCompData,
  getSectionTimeDiffs,
  getSpeedChangePoints,
  Tel,
} from "../utils/graph-utils";
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
  const [mapMaxSDiff, setMapMaxSDiff] = useState<number>();
  const [mapMaxTDiff, setMapMaxTDiff] = useState<number>();
  const [showRollingMap, setShowRollingMap] = useState<boolean>(false);
  const [rollingMap, setRollingMap] = useState<number>(3);
  const [mapType, setMapType] = useState<string>("Binned");
  const [cameraPos, setCameraPos] = useState<object>({
    camera: {
      eye: { x: 0.5, y: 0.5, z: 7 },
      up: { x: 0, y: 1, z: 0 },
    },
    dragmode: "pan",
  });
  const [lineColors, setLineColors] = useState<string[]>([]);
  const [splitLap, setSplitLap] = useState<boolean>(false);
  const [splitPoints, setSplitPoints] = useState<number[]>([]);
  const [mapComp, setMapComp] = useState<string>("Speed");
  const [splitNum, setSplitNum] = useState<number>(3);

  const setLineColor = (index: number, color: string) => {
    const newLineColors = lineColors.slice();
    newLineColors[index] = color;
    setLineColors(newLineColors);
  };

  const graphPlot = React.useRef<HTMLElement>();
  const mapPlot = React.useRef<HTMLElement>();

  const onMapHover = (eventdata: any) => {
    if (graphInfo && eventdata.points[0].curveNumber === 0) {
      const relDist = graphInfo[0].tel.Distance[eventdata.points[0].pointNumber];
      //@ts-ignore
      Plotly.Fx.hover(
        "graphPlot",
        {
          xval: relDist,
        }
        // ["xy", ...otherYs.map((_, i) => `xy${i + 2}`)] syncing hovers is too messy
      );
    }
  };

  const onGraphHover = (eventdata: any) => {
    if (graphInfo) {
    }
  };

  React.useEffect(() => {
    if (graphInfo) {
      if (graphInfo.length !== 2) {
        setMapType("Binned");
      }
      const driverColors = get_best_colors(graphInfo.map(({ driver }) => driver));
      setLineColors(graphInfo.map(({ driver }) => driverColors[driver]));
      const speedDiff = getColDiff(graphInfo, "Speed");
      const absSpeedMax = Math.ceil(Math.max(...speedDiff.map((a) => Math.abs(a))));
      setMapMaxSDiff(absSpeedMax);
      const timeDiff = getColDiff(graphInfo, "Time");
      const absTimeMax = Math.ceil(Math.max(...timeDiff.map((a) => Math.abs(a)), 1000) / 100) / 10;
      setMmaxTDiff(absTimeMax);
    }
  }, [graphInfo]);

  React.useEffect(() => {
    if (graphInfo && mapComp === "Time") {
      const timeDiff = getSectionTimeDiffs(graphInfo, splitPoints);
      const absTimeMax = Math.max(...timeDiff.flat().map((a) => Math.abs(a)));
      setMapMaxTDiff(absTimeMax);
    }
  }, [graphInfo, mapComp, splitPoints]);

  // TODO - UI: use this instead of 30vw as the height
  const graphHeight = `${getGraphHeight(["Speed", ...otherYs])}vw`;
  // TODO: make the split points removed when you click on them again on the map
  const onGraphClick = (eventData: any) =>
    splitLap
      ? setSplitPoints(sortBy(uniq([...splitPoints, eventData.points[0].pointNumber])))
      : setGraphMarker(eventData.points[0].pointNumber);
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
              otherYs,
              splitPoints
            )}
            config={{ editable: true, edits: { shapePosition: false } }}
            onHover={(eventData: any) => onGraphHover(eventData)}
            onClick={onGraphClick}
            // NOTE: currently, there's not an easy way to link the graph hover to the map hover
          />
        )}
      </GraphContainer>
      <GraphContainer defaultHeight={"30vw"} defaultWidth={"35vw"} loading={graphsLoading}>
        {graphInfo && maxColor && (
          // TODO: option to plot map showing the biggest differences between the lines the two cars took
          <Plot
            ref={mapPlot}
            divId="mapPlot"
            {...getMapCompData(
              graphInfo,
              lineColors,
              cameraPos,
              mapType,
              maxColor,
              showRollingMap ? rollingMap : undefined,
              graphMarker,
              mapComp,
              splitPoints
            )}
            config={{ editable: true }}
            onRelayout={(eventData: any) =>
              setCameraPos({
                camera: get(eventData, "scene.camera", get(cameraPos, "camera")),
                dragmode: get(eventData, "scene.dragmode", get(cameraPos, "dragmode")),
              })
            }
            onHover={(eventData: any) => onMapHover(eventData)}
            onClick={onGraphClick}
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
          <p>
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
            className={css`
              width: 100%;
            `}
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
          <p>
            Current {mapComp.toLowerCase()} range: -{maxColor} to {maxColor}
          </p>
          <Slider
            min={1}
            step={1}
            value={maxColor}
            max={mapComp === "Speed" ? mapMaxSDiff : mapMaxTDiff}
            onChange={(value) => setMaxColor(value)}
          />
        </GraphOptionContainer>
        <GraphOptionContainer>
          <p>Rolling Mean for Map{showRollingMap && `: ${rollingMap}`}</p>
          <Switch onChange={() => setShowRollingMap(!showRollingMap)} />
          {showRollingMap && (
            <Slider value={rollingMap} step={1} min={1} max={300} onChange={(value) => setRollingMap(value)} />
          )}
        </GraphOptionContainer>
        <GraphOptionContainer>
          <Radio.Group onChange={(e) => setMapType(e.target.value)} value={mapType}>
            <Radio.Button value="Binned">Binned</Radio.Button>
            <Radio.Button value="Actual" disabled={(graphInfo ? graphInfo.length : 0) !== 2}>
              Actual
            </Radio.Button>
          </Radio.Group>
        </GraphOptionContainer>
        <GraphOptionContainer>
          Add marker<Switch checked={splitLap} onChange={setSplitLap}></Switch>Add split
        </GraphOptionContainer>
        <GraphOptionContainer>
          <Radio.Group onChange={(e) => setMapComp(e.target.value)} value={mapComp}>
            <Radio.Button value="Speed">Speed</Radio.Button>
            <Radio.Button value="Time">Time</Radio.Button>
          </Radio.Group>
        </GraphOptionContainer>
        <GraphOptionContainer>
          <Button onClick={() => setSplitPoints([])}>Clear Splits</Button>
        </GraphOptionContainer>
        {graphInfo && (
          <>
            <GraphOptionContainer>
              <InputNumber min={1} max={100} defaultValue={3} onChange={(v) => v && setSplitNum(v)} />
              <Button onClick={() => setSplitPoints(getEqualSegmentPoints(graphInfo, splitNum))}>
                Split into sections
              </Button>
            </GraphOptionContainer>
            <GraphOptionContainer>
              <Button
                onClick={() => setSplitPoints(getSpeedChangePoints(graphInfo, showRollingMap ? rollingMap : undefined))}
              >
                Split by speed change
              </Button>
            </GraphOptionContainer>
          </>
        )}
        {
          // TODO - UI: we probably wanna replace this with a form
          graphInfo && (
            <GraphOptionContainer>
              <Div display="flex" alignItems="center">
                {/* TODO - UI: add alert when two colors are too similar */}
                {lineColors.map((_, i) => (
                  <ColorSelector
                    key={`color-selector-${i}`}
                    value={lineColors[i]}
                    setValue={(v) => setLineColor(i, v)}
                  />
                ))}
                {/* <Button>Submit</Button> */}
              </Div>
            </GraphOptionContainer>
          )
        }
      </Div>
    </>
  );
};

export default GraphView;
