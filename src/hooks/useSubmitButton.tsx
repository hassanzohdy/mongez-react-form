import { useEffect, useState } from "react";
import { useForm } from "./useForm";

export function useSubmitButton() {
  const [isSubmitting, setSubmitState] = useState(false);
  const [disabled, disable] = useState(false);
  const form = useForm();
  const [isDirty, setIsDirty] = useState(form?.isDirty ?? false);

  useEffect(() => {
    if (!form) return;

    const onSubmit = form.on("submit", () => {
      setSubmitState(form.isSubmitting());
      disable(form.isSubmitting());
    });

    const inValidControls = form.on("invalidControls", () => {
      disable(true);
    });

    const isDisabledEvent = form.on("disable", disable as any);
    const validControl = form.on("validControls", () => disable(false));
    const resetEvent = form.on("reset", () => disable(false));
    const dirtyEvent = form.on("dirty", () => setIsDirty(form.isDirty));

    return () => {
      onSubmit.unsubscribe();
      validControl.unsubscribe();
      inValidControls.unsubscribe();
      isDisabledEvent.unsubscribe();
      resetEvent.unsubscribe();
      dirtyEvent.unsubscribe();
    };
  }, [form]);

  return {
    isSubmitting,
    disabled,
    disable,
    setSubmitState,
    isDirty,
  };
}
