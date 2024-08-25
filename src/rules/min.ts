import { trans } from "@mongez/localization";
import { InputRule } from "../types";

export const minRule: InputRule = {
  name: "min",
  preservedProps: ["min"],
  validate: ({ value, min, errorKeys }) => {
    if (min === undefined) return;

    if (Number(value) < Number(min)) {
      return trans("validation.min", { input: errorKeys.name, min: min });
    }
  },
};
