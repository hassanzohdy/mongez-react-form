import React from "react";
import { getFormConfig } from "../configurations";
import { FormContext } from "../contexts/FormContext";
import { FormInterface, FormProps } from "./../types";
import { BaseForm } from "./BaseForm";

/**
 * Web form. Renders an HTML `<form>` element by default and handles the DOM
 * submit event (including the `requestSubmit` polyfill).
 */
export class Form extends BaseForm implements FormInterface {
  public formElement!: HTMLFormElement;

  public submit() {
    if (!this.formElement) return;

    if (this.isSubmitting()) return;

    if (this.formElement.requestSubmit) {
      this.formElement.requestSubmit();
    } else {
      // polyfill for Edge and bloody safari
      const submitter = document.createElement("input");
      submitter.type = "submit";
      submitter.style.display = "none";
      this.formElement.appendChild(submitter);
      submitter.click();
      this.formElement.removeChild(submitter);
    }
  }

  /**
   * onSubmit handler bound to the rendered `<form>` element. Cancels the
   * browser-default submit before delegating to the shared pipeline.
   */
  protected async triggerSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    await this.handleSubmit(e);
  }

  public render() {
    const {
      id = "form-" + this.formId,
      onError: _e,
      onSubmit: _s,
      component: Component = getFormConfig("formComponent", "form"),
      children,
      ignoreEmptyValues: _ignoreEmptyValues,
      ...otherProps
    } = this.props as FormProps;

    return (
      <FormContext.Provider value={this}>
        <Component
          ref={(form: any) => {
            this.formElement = form ? form.root || form : form;
          }}
          id={id}
          noValidate
          onSubmit={this.triggerSubmit.bind(this) as any}
          {...otherProps}
        >
          {children}
        </Component>
      </FormContext.Provider>
    );
  }
}
