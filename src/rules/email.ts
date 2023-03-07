import { trans } from "@mongez/localization";

const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

export const emailRule = ({ value, type, errorKeys }: any) => {
  if (!value || type !== "email") return;

  if (!emailRegex.test(value)) {
    return trans("validation.email", { input: errorKeys.name });
  }
};

emailRule.rule = "email";
