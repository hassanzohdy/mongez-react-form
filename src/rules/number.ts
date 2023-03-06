import { trans } from "@mongez/localization";

export const numberRule = ({ value, type, errorKeys }: any) => {
  if (type !== "number") return;

  if (isNaN(Number(value))) {
    const nameKey = errorKeys.name;

    return trans("validation.number", { name: nameKey });
  }
};

numberRule.rule = "number";
