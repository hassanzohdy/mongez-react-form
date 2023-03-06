import { trans } from "@mongez/localization";

export const patternRule = ({ value, pattern, errorKeys }: any) => {
  if (!pattern) return;

  const regex = new RegExp(pattern);

  if (!regex.test(value)) {
    const nameKey = errorKeys.name;
    const patternError = errorKeys.pattern;
    if (patternError) {
      return trans("validation.pattern", {
        name: nameKey,
        pattern: patternError,
      });
    }

    return `The ${nameKey} is invalid`;
  }
};

patternRule.preserveProps = ["pattern"];
patternRule.rule = "pattern";
