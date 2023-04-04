import { trans } from "@mongez/localization";

export const requiredRule = ({
  type,
  value,
  errorKeys,
  required,
  checked,
}: any) => {
  if (!required) return;

  if (
    (["checkbox", "radio"].includes(type) && checked === false) ||
    isEmpty(value)
  ) {
    return trans("validation.required", { input: errorKeys.name });
  }
};

requiredRule.rule = "required";
requiredRule.preservedProps = ["required"];

export const isEmpty = (value: any) => {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
};
