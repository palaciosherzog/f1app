import { css } from "@emotion/css";
import React, { useEffect, useRef, useState } from "react";
import { ColorResult, SketchPicker } from "react-color";
import { all_colors } from "../utils/calc-utils";
import Div from "./Div";

type ColorSelectorProps = {
  value: string;
  setValue: (_v: string) => void;
};

const ColorSelector: React.FC<ColorSelectorProps> = ({ value, setValue }) => {
  const ref = useRef<HTMLElement>();
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  useEffect(() => {
    document.addEventListener("click", handleClickOutside, true);
    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, []);

  const handleClickOutside = (event: any) => {
    if (ref.current && !ref.current.contains(event.target)) {
      setModalOpen(false);
    }
  };

  return (
    <Div position="relative" display="inline-block" ref={ref}>
      <div
        className={css`
          width: 20px;
          height: 20px;
          background-color: ${value};
          border-radius: 4px;
          border: 1px solid gray;
          margin: 5px;
        `}
        onClick={() => setModalOpen(!modalOpen)}
      ></div>
      {modalOpen && (
        <Div
          position="absolute"
          bottom="100%"
          zIndex={5}
          className={css`
            .sketch-picker {
              background-color: #161917 !important;
            }
            .sketch-picker input {
              background-color: #292625 !important;
            }
            .sketch-picker label {
              color: #fff !important;
            }
          `}
        >
          <SketchPicker
            disableAlpha={true}
            color={value}
            onChange={(color: ColorResult) => setValue(color.hex)}
            presetColors={all_colors}
          />
        </Div>
      )}
    </Div>
  );
};

export default ColorSelector;
