import { trans } from "@mongez/localization";
import { InputRule } from "../types";

export const lengthRule: InputRule = {
  name: "length",
  preservedProps: ["length"],
  validate: ({ value, length, errorKeys }) => {
    if (value?.length === undefined) return;

    if (value.length !== length) {
      return trans("validation.length", { input: errorKeys.name, length });
    }
  },
};
