import { trans } from "@mongez/localization";

export const requiredRule = ({
  type,
  value,
  errorKeys,
  required,
  checked,
}: any) => {
  if (!required) return;

  if ((type === "checkbox" && checked === false) || isEmpty(value)) {
    const errorKeyName = errorKeys.name;
    return trans("validation.required", { name: errorKeyName });
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
