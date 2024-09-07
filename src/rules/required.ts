import { trans } from "@mongez/localization";
import { type InputRule } from "../types";

const isEmpty = (value) => {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
};

export const requiredRule: InputRule = {
  name: "required",
  preservedProps: ["required"],
  requiresValue: false,
  validate: ({ type, value, errorKeys, required, checked }) => {
    if (!required) return;

    if (type === "checkbox") {
      if (!checked) {
        return trans("validation.required", { input: errorKeys.name });
      }

      return;
    }

    if (isEmpty(value)) {
      return trans("validation.required", { input: errorKeys.name });
    }
  },
};
