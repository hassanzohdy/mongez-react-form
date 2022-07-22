import React, { useCallback } from "react";
import { useId } from "../hooks/form-hooks";
import { FormControl, ResetFormButtonProps } from "../types";
import useForm from "./../hooks/useForm";

export default function ResetFormButton({
  resetOnly,
  component: Component = "button",
  onClick,
  ...otherProps
}: ResetFormButtonProps) {
  const formHandler = useForm();
  const id = useId(otherProps);

  React.useEffect(() => {
    const formControl: FormControl = {
      trigger: () => {},
      unregister: () => {},
      name: otherProps.name || "resetButton",
      control: "button",
      type: "reset",
      id: id,
      setError: error => {},
      props: { resetOnly, component: Component, onClick, ...otherProps },
    };

    formHandler?.form.register(formControl);

    return () => formHandler?.form.unregister(formControl);
  }, []);

  const reset = useCallback(
    (e: any) => {
      formHandler?.form && formHandler.form.reset(resetOnly);
      onClick && onClick(e);
    },
    [formHandler],
  );

  return <Component type="button" onClick={reset} {...otherProps} id={id} />;
}
