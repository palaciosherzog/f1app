import { css } from "@emotion/css";
import React, { useContext } from "react";

import { Tag, TreeSelect } from "antd";
import { AppContext, LapSelectOption } from "../contexts/AppContext";

type LapSelectorProps = {
  value: string[];
  onChange: (_v: string[]) => void;
  combLaps?: { [_key: string]: string[][] };
};

const LapSelector: React.FC<LapSelectorProps> = ({ value, onChange, combLaps }) => {
  const {
    state: { lapsList },
  } = useContext(AppContext);

  const [extraLaps, setExtraLaps] = React.useState<LapSelectOption>({ title: "COMB", value: "COMB" });

  React.useEffect(() => {
    if (combLaps) {
      setExtraLaps({
        title: "COMB",
        value: "COMB",
        children: Object.entries(combLaps).map(([ln, laps]) => ({
          title: `Lap ${ln}: ${JSON.stringify(laps)}`,
          value: ln,
        })),
      });
    }
  }, [combLaps]);

  return (
    <TreeSelect
      value={value}
      className={css`
        width: 100%;
      `}
      multiple
      treeData={[...(lapsList ?? []), extraLaps]}
      onChange={(v: string[]) => (v.at(-1) ?? "-").includes("-") && onChange(v)}
      maxTagCount="responsive"
      placeholder="Select Laps to Compare"
      tagRender={(v) => (
        <Tag
          className={css`
            font-size: 14px;
            box-sizing: border-box;
            max-width: 100%;
            height: 24px;
            margin-top: 2px;
            margin-bottom: 2px;
            line-height: 22px;
            background: #f5f5f5;
            border: 1px solid #f0f0f0;
            border-radius: 2px;
            cursor: default;
            transition: font-size 0.3s, line-height 0.3s, height 0.3s;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-margin-end: 4px;
            margin-inline-end: 4px;
            -webkit-padding-start: 8px;
            padding-inline-start: 8px;
            -webkit-padding-end: 4px;
            padding-inline-end: 4px;
          `}
          closable
          onClose={() => v.closable && v.onClose()}
        >{`${v.value.split("-")[0]} ${v.label}`}</Tag>
      )}
    />
  );
};

export default LapSelector;
