import { trans } from "@mongez/localization";
import { InputRule } from "../types";

export const floatRule: InputRule = {
  name: "float",
  requiresType: "float",
  validate: ({ value, errorKeys }) => {
    if (isNaN(Number(value)) && !Number.isInteger(Number(value))) {
      return trans("validation.float", { input: errorKeys.name });
    }
  },
};
