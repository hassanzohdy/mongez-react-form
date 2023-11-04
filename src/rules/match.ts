import { trans } from "@mongez/localization";
import { Form } from "src/form/components";
import { FormControl } from "src/form/types";

export const matchRule = ({ value, match, form, errorKeys }: any) => {
  if (!match || !form) return;

  const matchingElement = form.control(match);

  if (!matchingElement) return;

  if (matchingElement.value !== value) {
    const matchingName = errorKeys.matchingElement || matchingElement.name;

    return trans("validation.match", {
      input: errorKeys.name,
      matchingInput: matchingName,
    });
  }
};

matchRule.preserveProps = ["match"];
matchRule.rule = "match";
matchRule.onInit = ({
  formControl,
  form,
  match,
}: {
  form: Form;
  match?: string;
  formControl: FormControl;
}) => {
  if (!match || !form) return;

  const matchingElement = form.control(match);

  if (!matchingElement) return;

  return matchingElement.onChange(() => {
    if (!formControl.isDirty) return;

    formControl.validate();
  });
};
