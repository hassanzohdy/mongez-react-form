import { trans } from "@mongez/localization";
import { InputRule } from "../types";

const emailRegex =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export const emailRule: InputRule = {
  name: "email",
  requiresType: "email",
  validate: ({ value, errorKeys }) => {
    if (!emailRegex.test(value)) {
      return trans("validation.email", { input: errorKeys.name });
    }
  },
};
