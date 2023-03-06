import { trans } from "@mongez/localization";

export const lengthRule = ({ value, length, errorKeys }: any) => {
  if (value?.length === undefined) return;

  if (value.length !== length) {
    const nameKey = errorKeys.name;

    return trans("validation.length", { name: nameKey, length });
  }
};

lengthRule.toBePresent = ["length"];
lengthRule.preserveProps = ["length"];
lengthRule.rule = "length";
