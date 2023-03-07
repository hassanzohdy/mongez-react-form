import { trans } from "@mongez/localization";

export const maxRule = ({ value, max, errorKeys }: any) => {
  if (isNaN(max) || !value) return;

  if (Number(value) > Number(max)) {
    return trans("validation.max", { input: errorKeys.name, max: max });
  }
};

maxRule.toBePresent = ["max"];
maxRule.preserveProps = ["max"];
maxRule.rule = "max";
