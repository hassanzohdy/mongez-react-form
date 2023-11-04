import { trans } from "@mongez/localization";

export const alphabetRule = ({ value, type, errorKeys }: any) => {
  if (!value || type !== "alphabet") return;

  if (!/^[a-zA-Z]+$/.test(value)) {
    return trans("validation.alphabet", { input: errorKeys.name });
  }
};

alphabetRule.rule = "alphabet";
