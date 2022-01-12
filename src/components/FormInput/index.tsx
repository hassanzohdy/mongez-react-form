import React from "react";
import BasicFormInput from "./BasicFormInput";
import { getFormConfig } from "../../configurations";
import { FormInputProps, ReactComponent } from "../../types";

function _FormInput(props: FormInputProps, ref: any) {
  const Input: ReactComponent = getFormConfig(
    "components.formInput",
    BasicFormInput
  ) as ReactComponent;

  return <Input ref={ref} {...props} />;
}

const FormInput: React.FC<FormInputProps> = React.forwardRef(_FormInput);

export default FormInput;
