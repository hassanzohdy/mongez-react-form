import { trans } from "@mongez/localization";
import { InputRule } from "../types";

export const alphabetRule: InputRule = {
  name: "alphabet",
  requiresType: "alphabet",
  validate: ({ value, errorKeys }) => {
    if (!/^[a-zA-Z]+$/.test(value)) {
      return trans("validation.alphabet", { input: errorKeys.name });
    }
  },
};
