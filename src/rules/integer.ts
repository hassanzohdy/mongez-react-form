import { trans } from "@mongez/localization";

export const integerRule = ({ value, type, errorKeys }: any) => {
  if (!value || type !== "integer") return;

  if (isNaN(Number(value)) && !Number.isInteger(Number(value))) {
    return trans("validation.integer", { input: errorKeys.name });
  }
};

integerRule.rule = "integer";
