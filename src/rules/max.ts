import { trans } from "@mongez/localization";
import { InputRule } from "../types";

export const maxRule: InputRule = {
  name: "max",
  preservedProps: ["max"],
  validate: ({ value, max, errorKeys }) => {
    if (isNaN(max) || !value) return;

    if (Number(value) > Number(max)) {
      return trans("validation.max", { input: errorKeys.name, max: max });
    }
  },
};
