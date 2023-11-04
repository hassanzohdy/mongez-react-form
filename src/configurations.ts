import { FormConfigurations } from "./types";

export let formConfigurations: FormConfigurations = {};

export function setFormConfigurations(newConfigurations: FormConfigurations) {
  formConfigurations = { ...formConfigurations, ...newConfigurations };
}

export function getFormConfig(
  key: keyof FormConfigurations,
  defaultValue?: any,
) {
  return formConfigurations[key] ?? defaultValue;
}

export function getFormConfigurations(): FormConfigurations {
  return formConfigurations;
}
