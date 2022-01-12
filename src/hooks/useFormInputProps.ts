import React from "react";
import { translatable } from "../utils";
import { getFormConfig } from "../configurations";
import { InputError, FormInputProps } from "../types";
import { Random, toInputName } from "@mongez/reinforcements";
import { requiredRule, Rule, rulesList } from "@mongez/validator";

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

export function useValue<T>(props: FormInputProps, initialValue = "") {
  const [value, setValue] = React.useState<T>(() => {
    return props.value || props.defaultValue || initialValue || "";
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
  configRulesKey: string,
  defaultRules: Rule[]
): Rule[] {
  return React.useMemo(() => {
    return (props.rules ||
      getFormConfig("input.rules." + configRulesKey, defaultRules)) as Rule[];
  }, [props.rules, configRulesKey, defaultRules]);
}

export function useBasicRules(props: FormInputProps) {
  return useRules(props, "list", [requiredRule]);
}

export function useInputRules(props: FormInputProps) {
  return useRules(props, "list", rulesList);
}
