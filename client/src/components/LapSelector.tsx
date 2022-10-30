import React, { useContext } from "react";

import { Cascader } from "antd";
import { AppContext } from "../contexts/AppContext";

type LapSelectorProps = {
  value?: string[][];
  onChange?: (_v: string[][]) => void;
};

const LapSelector: React.FC<LapSelectorProps> = ({ value, onChange }) => {
  const {
    state: { lapsList },
  } = useContext(AppContext);

  return (
    <Cascader
      value={value}
      style={{ width: "100%" }}
      multiple
      options={lapsList}
      //@ts-ignore
      onChange={(v: string[][]) => onChange(v)}
      maxTagCount="responsive"
      placeholder="Select Laps to Compare"
      displayRender={(label) => `${label[0]} - ${label[1]}`}
    />
  );
};

export default LapSelector;
