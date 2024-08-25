import { useContext } from "react";
import { FormContext } from "../contexts/FormContext";
import { FormContextData } from "../types";

export function useForm(): FormContextData {
  return useContext<FormContextData>(FormContext);
}
