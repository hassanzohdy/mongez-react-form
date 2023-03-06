import { trans } from "@mongez/localization";

export const floatRule = ({ value, type, errorKeys }: any) => {
  if (type !== "float") return;

  if (isNaN(Number(value)) && !Number.isInteger(Number(value))) {
    const nameKey = errorKeys.name;

    return trans("validation.float", { name: nameKey });
  }
};

floatRule.rule = "float";
