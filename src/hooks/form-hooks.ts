import { Random, toInputName } from "@mongez/reinforcements";
import { Rule } from "@mongez/validator";
import React from "react";
import { getFormConfig } from "../configurations";
import { FormInputProps, InputError } from "../types";
import { translatable } from "../utils";

export function useLabel(props: FormInputProps) {
  return React.useMemo(() => translatable(props.label, "label"), [props.label]);
}

export function useLabelPosition(props: FormInputProps) {
  return React.useMemo(
    () => props.labelPosition || getFormConfig("input.labelPosition", "inline"),
    [props.labelPosition]
  );
}

export function usePlaceholder(props: FormInputProps) {
  return React.useMemo(
    () => translatable(props.placeholder, "placeholder"),
    [props.placeholder]
  );
}

export function useName(props: FormInputProps) {
  return React.useMemo(() => toInputName(props.name || ""), [props.name]);
}

export function useId(props: FormInputProps) {
  return React.useMemo(() => props.id || Random.id(), [props.id]);
}

export function useValue<T>(
  props: FormInputProps,
  initialValue = ""
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = React.useState<T>(() => {
    if (![undefined, null].includes(props.value)) return props.value;

    if (![undefined, null].includes(props.defaultValue))
      return props.defaultValue;

    return initialValue || "";
  });

  return [value, setValue];
}

export function useError(): [InputError, (error: InputError) => void] {
  const [error, errorUpdater] = React.useState<InputError>(null);

  return [
    error,
    (error: InputError): void => {
      errorUpdater(error);
    },
  ];
}

export function useRules(
  props: FormInputProps,
  configRulesKey: string
): Rule[] {
  return React.useMemo(() => {
    return (props.rules ||
      getFormConfig("input.rules." + configRulesKey)) as Rule[];
  }, [props.rules, configRulesKey]);
}

export function useInputRules(props: FormInputProps) {
  return useRules(props, "list");
}
