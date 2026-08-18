"use client";

import { useEffect, useId, useRef } from "react";
import { FormEngine, FormEngineOptions } from "../engine/FormEngine";
import { FormProps } from "../types";

function buildOptions(props: FormProps<any>, id: string): FormEngineOptions {
  return {
    id,
    defaultValue: props.defaultValue,
    values: props.values,
    schema: props.schema,
    validateOn: props.validateOn,
    ignoreEmptyValues: props.ignoreEmptyValues,
    focusFirstError: props.focusFirstError,
    onSubmit: props.onSubmit,
    onError: props.onError,
  };
}

/**
 * Shared wiring for the `Form` / `NativeForm` function components:
 *
 * - Lazily instantiates a single {@link FormEngine} held in a ref (stable
 *   identity for context + the event bus).
 * - Derives an SSR-safe id from React's `useId()` when none is provided.
 * - Syncs the latest scalar options/handlers into the engine each render.
 * - Re-hydrates controls when the reactive `values` prop identity changes, and
 *   updates the reset baseline when `defaultValue` changes.
 * - Activates/destroys the active-form registry on mount/unmount.
 *
 * @param submitHandler platform-specific submit trigger invoked by `form.submit()`.
 */
export function useFormEngine(
  props: FormProps<any>,
  submitHandler: (engine: FormEngine) => void
) {
  const reactId = useId();
  const id = props.id ? String(props.id) : `form-${reactId}`;

  const engineRef = useRef<FormEngine>();

  if (!engineRef.current) {
    engineRef.current = new FormEngine(buildOptions(props, id));
  }

  const engine = engineRef.current;

  // Sync scalar options/handlers every render. This only mutates the engine's
  // option bag (no React state), so it is safe during render.
  engine.setOptions(buildOptions(props, id));
  engine.submitHandler = () => submitHandler(engine);

  // Reactive value hydration. Gate on the last-applied identity (not a
  // first-run boolean) so React StrictMode's double-mount does not fire a
  // spurious `fill()` with the unchanged initial `values`. The constructor
  // already seeded `hydrationValues` from the initial `props.values`.
  const lastValues = useRef(props.values);
  useEffect(() => {
    if (props.values === undefined || props.values === lastValues.current) {
      return;
    }

    lastValues.current = props.values;
    engine.fill(props.values, { dirty: false, validate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.values]);

  // Reactive reset baseline — same identity-gated pattern. The constructor
  // already applied the initial `props.defaultValue`.
  const lastDefaultValue = useRef(props.defaultValue);
  useEffect(() => {
    if (props.defaultValue === lastDefaultValue.current) {
      return;
    }

    lastDefaultValue.current = props.defaultValue;
    engine.setDefaultValue(props.defaultValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.defaultValue]);

  useEffect(() => {
    engine.activate();

    return () => {
      engine.destroy();
    };
  }, [engine]);

  return { engine, id };
}
