import { trans } from "@mongez/localization";

export const integerRule = ({ value, type, errorKeys }: any) => {
  if (type !== "integer") return;

  if (isNaN(Number(value)) && !Number.isInteger(Number(value))) {
    const nameKey = errorKeys.name;

    return trans("validation.integer", { name: nameKey });
  }
};

integerRule.rule = "integer";
