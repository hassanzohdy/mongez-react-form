import { trans } from "@mongez/localization";

export const patternRule = ({ value, pattern, errorKeys }: any) => {
  if (!pattern || !value) return;

  const regex = new RegExp(pattern);

  if (!regex.test(value)) {
    return trans("validation.pattern", {
      input: errorKeys.name,
      pattern: errorKeys.pattern || "pattern",
    });
  }
};

patternRule.preserveProps = ["pattern"];
patternRule.rule = "pattern";
