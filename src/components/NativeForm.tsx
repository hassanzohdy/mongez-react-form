"use client";

import React, { forwardRef, useImperativeHandle } from "react";
import { FormContext } from "../contexts/FormContext";
import { StandardSchemaV1 } from "../standard-schema/types";
import { FormInterface, FormProps } from "../types";
import { useFormEngine } from "./useFormEngine";

/**
 * Generic call signature preserving schema inference and `ref` support.
 */
type NativeFormComponent = <
  Schema extends StandardSchemaV1 | undefined = undefined,
>(
  props: FormProps<Schema> & { ref?: React.Ref<FormInterface> }
) => React.ReactElement | null;

/**
 * React Native form. Renders no host element by default (just a Fragment) so it
 * does not depend on `react-native` being installed; pass a `component` prop
 * (e.g. `View`) to wrap children with a host view.
 *
 * Same engine, context, hooks, validation, and value collection as the web
 * `Form`. Submission is programmatic only — call `form.submit()`.
 */
export const NativeForm = forwardRef(function NativeForm(
  props: FormProps<any>,
  ref: React.Ref<FormInterface>
) {
  const { engine } = useFormEngine(props, (formEngine) =>
    formEngine.handleSubmit()
  );

  useImperativeHandle(ref, () => engine, [engine]);

  const {
    onError: _onError,
    onSubmit: _onSubmit,
    component: Component,
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

  const content = Component ? (
    <Component
      ref={(node: any) => {
        engine.formElement = node;
      }}
      {...otherProps}
    >
      {children}
    </Component>
  ) : (
    <>{children}</>
  );

  return <FormContext.Provider value={engine}>{content}</FormContext.Provider>;
}) as unknown as NativeFormComponent;
