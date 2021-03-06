import React from "react";
import { FormContextProps } from "../types";
import FormContext from "../contexts/FormContext";

export default function useForm(): FormContextProps {
  return React.useContext<FormContextProps>(FormContext);
}
