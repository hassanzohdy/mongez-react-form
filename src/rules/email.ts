import { trans } from "@mongez/localization";

export const emailRule = ({ value, type, errorKeys }: any) => {
  if (!value || type !== "email") return;

  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

  if (!emailRegex.test(value)) {
    return trans("validation.email");
  }
};

emailRule.rule = "email";
