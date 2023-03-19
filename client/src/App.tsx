import { Modal } from "antd";
import "antd/dist/antd.css";
import CompSelector from "./components/CompSelector";
import Div from "./components/Div";
import DriversSelector from "./components/DriversSelector";
import GraphView from "./components/GraphView";
import LapView from "./components/LapView";
import SessionSelector from "./components/SessionSelector";
import { useAppContext } from "./contexts/AppContext";

// TODO - UI:  make the formatting nicer
// TODO - UI: should we hide all options under dropdowns and stuff???
const App = () => {
  const {
    state: { errorInfo },
    actions: { setErrorInfo },
  } = useAppContext();
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
      <Modal open={errorInfo !== undefined} onCancel={() => setErrorInfo(undefined)} title="ERROR" footer={null}>
        {errorInfo}
      </Modal>
    </Div>
  );
};

export default App;
