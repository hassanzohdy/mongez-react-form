import { createContext, useContext } from "react";

type Value = string | number | boolean;

export type RadioGroupContextOptions = {
  value: Value;
  changeValue: (value: Value) => void;
};

export const RadioGroupContext = createContext<RadioGroupContextOptions>({
  value: "",
  changeValue: () => {},
});

export type RadioInputHookOutput = {
  isSelected: boolean;
  changeValue: (value: Value) => void;
};

export function useRadioInput(value: Value): RadioInputHookOutput {
  const context = useContext(RadioGroupContext);

  if (!context) {
    throw new Error("useRadioInput must be used within a RadioGroupContext");
  }

  const { value: groupValue, changeValue } = context;

  return {
    isSelected: groupValue === value,
    changeValue,
  };
}
