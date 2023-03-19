import { trans } from "@mongez/localization";

export const minLengthRule = ({ value, minLength, errorKeys }: any) => {
  if (!value || isNaN(length) || value?.length === undefined) return;

  if (value.length < minLength) {
    return trans("validation.minLength", {
      input: errorKeys.name,
      length: minLength,
    });
  }
};

minLengthRule.preserveProps = ["minLength"];
minLengthRule.rule = "minLength";
