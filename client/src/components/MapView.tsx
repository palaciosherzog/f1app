import React, { useContext, useState } from "react";

import { Slider, Switch } from "antd";
import Plot from "react-plotly.js";
import { AppContext } from "../contexts/AppContext";
import { getColDiff, getMapCompData } from "../utils/graph-utils";
import Div from "./Div";
import GraphOptionContainer from "./GraphOptionContainer";

type MapViewProps = { mapRef: React.MutableRefObject<HTMLElement | undefined>; onMapHover: (_eventData: any) => void };

const MapView: React.FC<MapViewProps> = ({ mapRef, onMapHover }) => {
  const {
    state: { graphInfo, graphMarker },
    actions: { setGraphMarker },
  } = useContext(AppContext);

  const [maxColor, setMaxColor] = useState<number>(10);
  const [mmaxColor, setMmaxColor] = useState<number>();
  const [showRollingMap, setShowRollingMap] = useState<boolean>(false);
  const [rollingMap, setRollingMap] = useState<number>(3);

  React.useEffect(() => {
    if (graphInfo) {
      const speedDiff = getColDiff(graphInfo, "Speed");
      const absMax = Math.ceil(Math.max(...speedDiff.map((a) => Math.abs(a))));
      setMmaxColor(absMax);
    }
  }, [graphInfo]);

  return (
    <Div flexDirection="column" flexWrap="wrap" width="35vw" margin="25px">
      <Div width="100%" height="30vw">
        {graphInfo && maxColor && (
          // TODO: option to plot time_diff based on x y ?
          <Plot
            ref={mapRef}
            divId="mapPlot"
            {...getMapCompData(graphInfo, maxColor, showRollingMap ? rollingMap : undefined, graphMarker)}
            onHover={(eventData: any) => onMapHover(eventData)}
            onClick={(eventData: any) => setGraphMarker(eventData.points[0].pointNumber)}
          />
        )}
      </Div>
      <Div display="flex" flexDirection="row" justifyContent="center">
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
      </Div>
    </Div>
  );
};

export default MapView;
