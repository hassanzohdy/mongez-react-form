import React from "react";
import useForm from "./../hooks/useForm";
import { useId } from "../hooks/form-hooks";
import { FormControl, ResetFormButtonProps } from "../types";

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
      name: otherProps.name || "resetButton",
      control: "button",
      type: "reset",
      id: id,
      setError: (error) => {},
      props: { resetOnly, component: Component, onClick, ...otherProps },
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

  return <Component type="button" onClick={reset} {...otherProps} id={id} />;
}
