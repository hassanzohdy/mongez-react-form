import React from "react";
import useForm from "./../hooks/useForm";
import { useId } from "../hooks/form-hooks";
import { FormControl, ResetFormButtonProps } from "../types";

export default function ResetFormButton({
  resetOnly,
  onClick,
  ...otherProps
}: ResetFormButtonProps) {
  const formHandler = useForm();
  const id = useId(otherProps);

  React.useEffect(() => {
    const formControl: FormControl = {
      name: "resetButton",
      control: "button",
      type: "reset",
      id: id,
      setError: (error) => {},
      props: { resetOnly, onClick, ...otherProps },
    };

    formHandler?.form.register(formControl);

    return () => formHandler?.form.unregister(formControl);
  }, []);

  const reset = React.useCallback(
    (e) => {
      formHandler?.form && formHandler.form.reset(resetOnly);
      onClick && onClick(e);
    },
    [formHandler]
  );

  return <button type="button" onClick={reset} {...otherProps} id={id} />;
}
