"use client";

import React, { forwardRef, useImperativeHandle } from "react";
import { getFormConfig } from "../configurations";
import { FormContext } from "../contexts/FormContext";
import { FormEngine } from "../engine/FormEngine";
import { StandardSchemaV1 } from "../standard-schema/types";
import { FormInterface, FormProps } from "../types";
import { useFormEngine } from "./useFormEngine";

/**
 * Web submit trigger. Dispatches a native `submit` event (so the browser-style
 * pipeline runs), falling back to the engine pipeline if there is no host
 * element.
 */
function webSubmit(engine: FormEngine) {
  const element: HTMLFormElement | null = engine.formElement;

  if (!element) {
    engine.handleSubmit();
    return;
  }

  if (engine.isSubmitting()) return;

  if (element.requestSubmit) {
    element.requestSubmit();
  } else {
    // polyfill for Edge and bloody safari
    const submitter = document.createElement("input");
    submitter.type = "submit";
    submitter.style.display = "none";
    element.appendChild(submitter);
    submitter.click();
    element.removeChild(submitter);
  }
}

/**
 * Generic call signature preserving schema inference and `ref` support.
 */
type FormComponent = <
  Schema extends StandardSchemaV1 | undefined = undefined,
>(
  props: FormProps<Schema> & { ref?: React.Ref<FormInterface> }
) => React.ReactElement | null;

/**
 * Web form. Renders an HTML `<form>` element by default, built over the
 * React-free {@link FormEngine}. The engine instance is exposed via `ref`.
 */
export const Form = forwardRef(function Form(
  props: FormProps<any>,
  ref: React.Ref<FormInterface>
) {
  const { engine, id } = useFormEngine(props, webSubmit);

  useImperativeHandle(ref, () => engine, [engine]);

  const {
    onError: _onError,
    onSubmit: _onSubmit,
    component: Component = getFormConfig("formComponent", "form"),
    children,
    ignoreEmptyValues: _ignoreEmptyValues,
    defaultValue: _defaultValue,
    values: _values,
    schema: _schema,
    validateOn: _validateOn,
    focusFirstError: _focusFirstError,
    id: _id,
    ...otherProps
  } = props;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();

    await engine.handleSubmit(event);
  };

  // A native `<form>` with no `method` submits as GET, which would put field
  // values (passwords included) in the URL if submitted before hydration or
  // with JavaScript off. Default to POST; an explicit `method` wins. Spread
  // after `otherProps` so a wrapper passing `method={undefined}` still posts.
  const defaultMethod =
    Component === "form" && (otherProps as any).method === undefined
      ? { method: "post" }
      : undefined;

  return (
    <FormContext.Provider value={engine}>
      <Component
        ref={(form: any) => {
          engine.formElement = form ? form.root || form : form;
        }}
        id={id}
        noValidate
        onSubmit={handleSubmit}
        {...otherProps}
        {...defaultMethod}
      >
        {children}
      </Component>
    </FormContext.Provider>
  );
}) as unknown as FormComponent;
