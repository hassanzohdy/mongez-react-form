import { trans } from "@mongez/localization";

export const matchRule = ({ value, match, form, errorKeys }: any) => {
  if (!match || !form) return;

  const matchingElement = form.control(match);

  if (!matchingElement) return;

  if (matchingElement.value !== value) {
    const matchingName = errorKeys.matchingElement || matchingElement.name;

    return trans("validation.match", {
      input: errorKeys.name,
      matchingInput: matchingName,
    });
  }
};

matchRule.preserveProps = ["match"];
matchRule.rule = "match";
