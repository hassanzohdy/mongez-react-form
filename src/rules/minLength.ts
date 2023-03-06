import { trans } from "@mongez/localization";

export const minLengthRule = ({ value, minLength, errorKeys }: any) => {
  if (value?.length === undefined) return;

  if (value.length < minLength) {
    const nameKey = errorKeys.name;
    return trans("validation.minLength", { name: nameKey, minLength });
  }
};

minLengthRule.preserveProps = ["minLength"];
minLengthRule.rule = "minLength";
