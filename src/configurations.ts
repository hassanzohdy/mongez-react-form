import { get, merge } from "@mongez/reinforcements";
import { FormConfigurations } from "./types";

export let formConfigurations: FormConfigurations = {};

export function setFormConfigurations(newConfigurations: FormConfigurations) {
  formConfigurations = merge(formConfigurations, newConfigurations);
}

export function getFormConfig(key: string, defaultValue?: any) {
  if (arguments.length === 0) return formConfigurations;

  return get(formConfigurations, key, defaultValue);
}

export function getFormConfigurations(): FormConfigurations {
  return formConfigurations;
}
