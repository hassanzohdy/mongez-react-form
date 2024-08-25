import { trans } from "@mongez/localization";
import { InputRule } from "../types";

export const integerRule: InputRule = {
  name: "integer",
  requiresType: "integer",
  validate: ({ value, errorKeys }) => {
    if (isNaN(Number(value)) && !Number.isInteger(Number(value))) {
      return trans("validation.integer", { input: errorKeys.name });
    }
  },
};
