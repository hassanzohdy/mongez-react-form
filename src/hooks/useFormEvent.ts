import useForm from "./useForm";
import { useEffect } from "react";
import { FormEventType } from "../types";

/**
 * Watch for form event change 
 */
export default function useFormEvent(event: FormEventType, callback: any) {
  const formProvider = useForm();

  useEffect(() => {
    if (!formProvider) return;

    const eventSubscription = formProvider.form.on(event, callback);

    return () => eventSubscription.unsubscribe();
  }, [event]);
}
