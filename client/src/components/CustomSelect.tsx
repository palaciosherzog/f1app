import { Select } from "antd";
import Div from "./Div";

const { Option } = Select;

const CustomSelect = (props: any) => {
  const { options, placeholder, isLoading, onChange, noOptionsMessage, mode, allowClear, value, ...rest } = props;
  return (
    <Div {...rest}>
      <Select
        mode={mode}
        allowClear={allowClear}
        placeholder={placeholder}
        loading={isLoading}
        onChange={onChange}
        value={value}
        style={{ width: "100%" }}
      >
        {options.map((opt: any, i: number) => (
          <Option key={`select-option-${i}`} value={opt.value}>
            {opt.label}
          </Option>
        ))}
      </Select>
    </Div>
  );
};

export default CustomSelect;
