import React from "react";
import { FormContext } from "../contexts/FormContext";
import { FormInterface, FormProps } from "./../types";
import { BaseForm } from "./BaseForm";

/**
 * React Native form. Renders no host element by default (just a Fragment)
 * so it does not depend on `react-native` being installed; pass a
 * `component` prop (e.g. `View`) to wrap children with a host view.
 *
 * Use the same `Form` API otherwise — registration, validation, values
 * collection, events, and the `FormContext` are all identical to the web
 * `Form`.
 */
export class NativeForm extends BaseForm implements FormInterface {
  public formElement: any = null;

  public submit() {
    if (this.isSubmitting()) return;

    this.handleSubmit();
  }

  public render() {
    const {
      onError: _e,
      onSubmit: _s,
      component: Component,
      children,
      ignoreEmptyValues: _ignoreEmptyValues,
      defaultValue: _defaultValue,
      id: _id,
      ...otherProps
    } = this.props as FormProps;

    const content = Component ? (
      <Component
        ref={(node: any) => {
          this.formElement = node;
        }}
        {...otherProps}
      >
        {children}
      </Component>
    ) : (
      <>{children}</>
    );

    return (
      <FormContext.Provider value={this}>{content}</FormContext.Provider>
    );
  }
}
