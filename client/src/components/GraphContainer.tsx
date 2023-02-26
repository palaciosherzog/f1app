import { css } from "@emotion/css";
import { Resizable } from "re-resizable";
import React from "react";
import CustomLoading from "./CustomLoading";
import Div from "./Div";

interface GraphContainerProps {
  defaultHeight: string | number;
  defaultWidth: string | number;
  loading?: boolean;
  children?: React.ReactNode;
}

const GraphContainer = ({ defaultHeight, defaultWidth, loading, children }: GraphContainerProps) => {
  return (
    <Resizable
      className={css`
        border: #211f1e solid 1px;
        background-color: #262322;
        border-radius: 2px;
        margin: 15px;
        padding: 15px;
      `}
      defaultSize={{
        width: defaultWidth,
        height: defaultHeight,
      }}
      onResize={() => window.dispatchEvent(new Event("resize"))}
      // TODO - UI: make this resize with the graph a bit smoother
    >
      {loading ? (
        <CustomLoading />
      ) : (
        children ?? (
          <Div width="100%" height="100%" display="flex" alignItems="center" justifyContent="center" color="white">
            <p>Select options to view graph...</p>
          </Div>
        )
      )}
    </Resizable>
  );
};

export default GraphContainer;
