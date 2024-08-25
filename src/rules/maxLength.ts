import { trans } from "@mongez/localization";
import { InputRule } from "../types";

export const maxLengthRule: InputRule = {
  name: "maxLength",
  preservedProps: ["maxLength"],
  validate: ({ value, maxLength, errorKeys }) => {
    if (value?.length === undefined) return;

    if (value.length > maxLength) {
      return trans("validation.maxLength", {
        input: errorKeys.name,
        length: maxLength,
      });
    }
  },
};
