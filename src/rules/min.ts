import { trans } from "@mongez/localization";

export const minRule = ({ value, min, errorKeys }: any) => {
  if (!value || min === undefined) return;

  if (Number(value) < Number(min)) {
    return trans("validation.min", { input: errorKeys.name, min: min });
  }
};

minRule.toBePresent = ["min"];
minRule.preserveProps = ["min"];
minRule.rule = "min";
