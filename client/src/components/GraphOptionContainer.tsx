import React from "react";
import Div from "./Div";

interface SelectorContainerProps {
  children?: React.ReactNode;
  width?: string;
}

const GraphOptionContainer = ({ children, width }: SelectorContainerProps) => {
  return (
    <Div color="white" mx="10px" width={width ?? "12vw"}>
      {children}
    </Div>
  );
};

export default GraphOptionContainer;
