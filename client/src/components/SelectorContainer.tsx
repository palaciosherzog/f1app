import React from "react";
import Div from "./Div";

interface SelectorContainerProps {
  children?: React.ReactNode;
}

const SelectorContainer = ({ children }: SelectorContainerProps) => {
  return (
    <Div display="flex" flexDirection="row" justifyContent="center" alignContent="center">
      <Div
        display="flex"
        flexDirection="row"
        backgroundColor="#252220"
        marginTop="15px"
        padding="5px"
        width={["95%", "80%", "75%", "60%", "60%", "900px"]}
        justifyContent="space-evenly"
        alignContent="center"
      >
        {children}
      </Div>
    </Div>
  );
};

export default SelectorContainer;
