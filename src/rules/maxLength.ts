import { trans } from "@mongez/localization";

export const maxLengthRule = ({ value, maxLength, errorKeys }: any) => {
  if (value?.length === undefined) return;

  if (value.length > maxLength) {
    return trans("validation.maxLength", {
      name: errorKeys.name,
      length: maxLength,
    });
  }
};

maxLengthRule.toBePresent = ["maxLength"];
maxLengthRule.preserveProps = ["maxLength"];
maxLengthRule.rule = "maxLength";
