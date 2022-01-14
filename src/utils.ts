import { getFormConfig } from "./configurations";

export function translatable(value: any, translationKey: string): any {
  if (!value) return "";

  if (
    typeof value === "string" ||
    !getFormConfig("translation.enabled") ||
    !getFormConfig("translation.translationFunction") ||
    !getFormConfig(`translation.translate.${translationKey}`)
  )
    return value;

  return getFormConfig("translation.translationFunction")(value);
}
