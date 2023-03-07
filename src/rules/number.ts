import { trans } from "@mongez/localization";

export const numberRule = ({ value, type, errorKeys }: any) => {
  if (!value || type !== "number") return;

  if (isNaN(Number(value))) {
    return trans("validation.number", { input: errorKeys.name });
  }
};

numberRule.rule = "number";
