import React from "react";
import { FormContext } from "../contexts/FormContext";
import { FormContextProps } from "../types";

export function useForm(): FormContextProps {
  return React.useContext<FormContextProps>(FormContext);
}
