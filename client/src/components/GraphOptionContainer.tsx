import { css } from "@emotion/css";
import React from "react";
import Div from "./Div";

interface SelectorContainerProps {
  children?: React.ReactNode;
  width?: string;
}

const GraphOptionContainer = ({ children, width }: SelectorContainerProps) => {
  return (
    <Div
      color="white"
      mx="10px"
      width={width ?? "12vw"}
      className={css`
        div > p {
          color: white;
        }
      `}
    >
      {children}
    </Div>
  );
};

export default GraphOptionContainer;
