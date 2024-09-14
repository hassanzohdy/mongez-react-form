import { trans } from "@mongez/localization";
import { InputRule } from "../types";

export const minLengthRule: InputRule = {
  name: "minLength",
  preservedProps: ["minLength"],
  validate: ({ value, minLength, errorKeys }) => {
    if (!minLength || value?.length === undefined) return;

    if (value.length < minLength) {
      return trans("validation.minLength", {
        input: errorKeys.name,
        length: minLength,
      });
    }
  },
};
