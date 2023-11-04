import { useEffect, useState } from "react";
import { useForm } from "./useForm";

export function useSubmitButton() {
  const [isSubmitting, setSubmitState] = useState(false);
  const [disabled, disable] = useState(false);
  const form = useForm();

  useEffect(() => {
    if (!form) return;

    const onSubmit = form.on("submit", () => {
      setSubmitState(form.isSubmitting());
      disable(form.isSubmitting());
    });

    const inValidControls = form.on("invalidControls", () => {
      console.log("IFF");

      disable(true);
    });

    const isDisabledEvent = form.on("disable", disable as any);
    const validControl = form.on("validControls", () => disable(false));
    const resetEvent = form.on("reset", () => disable(false));

    return () => {
      onSubmit.unsubscribe();
      validControl.unsubscribe();
      inValidControls.unsubscribe();
      isDisabledEvent.unsubscribe();
      resetEvent.unsubscribe();
    };
  }, [form]);

  return {
    isSubmitting,
    disabled,
    disable,
    setSubmitState,
  };
}
