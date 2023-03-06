import { useEffect } from "react";
import { FormEventType } from "../types";
import { useForm } from "./useForm";

/**
 * Watch for form event change
 */
export function useFormEvent(event: FormEventType, callback: any) {
  const form = useForm();

  useEffect(() => {
    if (!form) return;

    const eventSubscription = form.on(event, callback);

    return () => eventSubscription.unsubscribe();
  }, [event]);
}
