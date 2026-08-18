"use client";

import { ReactNode, useEffect, useState } from "react";
import { FormContextData } from "../types";
import { useForm } from "./useForm";

export type FormState = {
  /** Whether the form currently has no invalid controls. */
  isValid: boolean;
  /** Whether any control has been changed from its initial value. */
  isDirty: boolean;
  /** Whether the form is mid-submit. */
  isSubmitting: boolean;
  /** Whether the form has attempted submission at least once. */
  isSubmitted: boolean;
  /** Whether any control has an async validation in flight. */
  isValidating: boolean;
  /** Form-level errors with no owning control (whole-form schema). */
  formErrors: ReactNode[];
};

const emptyState: FormState = {
  isValid: true,
  isDirty: false,
  isSubmitting: false,
  isSubmitted: false,
  isValidating: false,
  formErrors: [],
};

function readState(form: FormContextData): FormState {
  if (!form) return emptyState;

  return {
    isValid: form.isValid(),
    isDirty: form.isDirty,
    isSubmitting: form.isSubmitting(),
    isSubmitted: form.wasSubmitted,
    isValidating: form.controls().some((control) => control.isValidating),
    formErrors: form.formErrors,
  };
}

/**
 * One-stop reactive snapshot of form-level state — `isValid`, `isDirty`,
 * `isSubmitting`, `isSubmitted`, `isValidating`, and `formErrors` — for any
 * descendant of a `Form` / `NativeForm`.
 *
 * ```tsx
 * const { isValid, isSubmitting, isDirty } = useFormState();
 * <button disabled={!isValid || isSubmitting || !isDirty}>Save</button>
 * ```
 */
export function useFormState(): FormState {
  const form = useForm();
  const [state, setState] = useState<FormState>(() => readState(form));

  useEffect(() => {
    if (!form) return;

    const update = () => setState(readState(form));

    const subscriptions = [
      form.on("validControls", update),
      form.on("invalidControls", update),
      form.on("validation", update),
      form.on("dirty", update),
      form.on("submitting", update),
      form.on("submit", update),
      form.on("reset", update),
      form.on("change", update),
    ];

    // Sync once on mount in case state changed between render and effect.
    update();

    return () => {
      subscriptions.forEach((subscription) => subscription.unsubscribe());
    };
  }, [form]);

  return state;
}
