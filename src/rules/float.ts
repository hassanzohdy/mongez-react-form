import { trans } from "@mongez/localization";

export const floatRule = ({ value, type, errorKeys }: any) => {
  if (!value || type !== "float") return;

  if (isNaN(Number(value)) && !Number.isInteger(Number(value))) {
    return trans("validation.float", { input: errorKeys.name });
  }
};

floatRule.rule = "float";
