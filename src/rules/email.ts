import { trans } from "@mongez/localization";

const emailRegex =
  /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export const emailRule = ({ value, type, errorKeys }: any) => {
  if (!value || type !== "email") return;

  if (!emailRegex.test(value)) {
    return trans("validation.email", { input: errorKeys.name });
  }
};

emailRule.rule = "email";
