import { trans } from "@mongez/localization";
import { InputRule } from "../types";

export const numberRule: InputRule = {
  name: "number",
  requiresType: "number",
  validate: ({ value, errorKeys }) => {
    if (isNaN(Number(value))) {
      return trans("validation.number", { input: errorKeys.name });
    }
  },
};
