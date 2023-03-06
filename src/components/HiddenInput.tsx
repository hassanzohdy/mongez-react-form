import { useFormControl } from "../hooks";
import { HiddenInputProps } from "../types";

export function HiddenInput(props: HiddenInputProps) {
  useFormControl(props);

  return null;
}
