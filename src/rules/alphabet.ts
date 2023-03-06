import { trans } from "@mongez/localization";

export const alphabetRule = ({ value, type, alphabet, errorKeys }: any) => {
  if (!alphabet) return;

  if (!/^[a-zA-Z]+$/.test(value)) {
    return trans("validation.alphabet", { name: errorKeys.name });
  }
};

alphabetRule.rule = "alphabet";
