import { trans } from "@mongez/localization";
import { InputRule } from "../types";

export const matchRule: InputRule = {
  name: "match",
  preservedProps: ["match"],
  onInit: ({ formControl, form, match }) => {
    if (!match || !form) return;

    const matchingElement = form.control(match);

    if (!matchingElement) return;

    return matchingElement.onChange(() => {
      if (!formControl.isDirty) return;

      formControl.validate();
    });
  },
  validate: ({ value, match, form, errorKeys }) => {
    if (!form) return;

    const matchingElement = form.control(match);

    if (!matchingElement) return;

    if (matchingElement.value !== value) {
      const matchingName = errorKeys.matchingElement || matchingElement.name;

      return trans("validation.match", {
        input: errorKeys.name,
        matchingInput: matchingName,
      });
    }
  },
};
