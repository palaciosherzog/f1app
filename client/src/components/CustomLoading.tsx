import { LoadingOutlined } from "@ant-design/icons";
import { css } from "@emotion/css";
import { Spin } from "antd";
import React from "react";
import Div from "./Div";

const antIcon = (
  <LoadingOutlined
    className={css`
      font-size: 100px;
    `}
    spin
  />
);

const CustomLoading: React.FC = () => (
  <Div display="flex" width="100%" height="100%" justifyContent="center" alignItems="center">
    <Spin indicator={antIcon} />
  </Div>
);

export default CustomLoading;
