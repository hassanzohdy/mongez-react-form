import { trans } from "@mongez/localization";

export const maxRule = ({ value, max, errorKeys }: any) => {
  if (Number(value) > Number(max)) {
    return trans("validation.max", { name: errorKeys.name, max: max });
  }
};

maxRule.toBePresent = ["max"];
maxRule.preserveProps = ["max"];
maxRule.rule = "max";
