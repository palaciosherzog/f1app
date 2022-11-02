import "antd/dist/antd.css";
import Plotly from "plotly.js-dist-min";
import React, { useContext } from "react";
import CompSelector from "./components/CompSelector";
import CustomLoading from "./components/CustomLoading";
import Div from "./components/Div";
import DriversSelector from "./components/DriversSelector";
import GraphView from "./components/GraphView";
import LapView from "./components/LapView";
import MapView from "./components/MapView";
import SessionSelector from "./components/SessionSelector";
import { AppContext } from "./contexts/AppContext";

// TODO: make the formatting nicer
// TODO: should we hide all options under dropdowns and stuff???
const App = () => {
  const {
    state: { graphInfo, lapsLoading, graphsLoading },
  } = useContext(AppContext);

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

  return (
    <Div display="flex" flexDirection="column" flexWrap="wrap" width="100%" minHeight="100vh" backgroundColor="#292625">
      <SessionSelector />
      <DriversSelector />
      {lapsLoading ? <CustomLoading /> : <LapView />}
      <CompSelector />
      <Div width="100%" display="flex" flexDirection="row" flexWrap="wrap">
        {graphsLoading ? (
          <CustomLoading />
        ) : (
          <>
            <GraphView graphRef={graphPlot} onHover={onGraphHover} />
            <MapView mapRef={mapPlot} onMapHover={onMapHover} />
          </>
        )}
      </Div>
    </Div>
  );
};

export default App;
