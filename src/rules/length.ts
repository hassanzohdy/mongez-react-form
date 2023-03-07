import { trans } from "@mongez/localization";

export const lengthRule = ({ value, length, errorKeys }: any) => {
  if (!value || isNaN(length) || value?.length === undefined) return;

  if (value.length !== length) {
    return trans("validation.length", { input: errorKeys.name, length });
  }
};

lengthRule.toBePresent = ["length"];
lengthRule.preserveProps = ["length"];
lengthRule.rule = "length";
