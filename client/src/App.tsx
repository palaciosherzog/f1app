import "antd/dist/antd.css";
import CompSelector from "./components/CompSelector";
import Div from "./components/Div";
import DriversSelector from "./components/DriversSelector";
import GraphView from "./components/GraphView";
import LapView from "./components/LapView";
import SessionSelector from "./components/SessionSelector";

// TODO: make the formatting nicer
// TODO: should we hide all options under dropdowns and stuff???
const App = () => {
  return (
    <Div display="flex" flexDirection="column" flexWrap="wrap" width="100%" minHeight="100vh" backgroundColor="#292625">
      <SessionSelector />
      <DriversSelector />
      <Div width="100%" display="flex" flexDirection="row" flexWrap="wrap" alignItems="center" justifyContent="center">
        <LapView />
      </Div>
      <CompSelector />
      <Div width="100%" display="flex" flexDirection="row" flexWrap="wrap" alignItems="center" justifyContent="center">
        <GraphView />
      </Div>
    </Div>
  );
};

export default App;
