import { trans } from "@mongez/localization";
import { InputRule } from "../types";

export const patternRule: InputRule = {
  name: "pattern",
  preservedProps: ["pattern"],
  validate: ({ value, pattern, errorKeys }) => {
    if (!pattern) return;

    const regex = new RegExp(pattern);

    if (!regex.test(value)) {
      return trans("validation.pattern", {
        input: errorKeys.name,
        pattern: errorKeys.pattern || "pattern",
      });
    }
  },
};
