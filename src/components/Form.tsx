import events, { EventSubscription } from "@mongez/events";
import React from "react";
import {
  addToFormsList,
  removeActiveForm,
  setActiveForm,
} from "../active-form";
import { getFormConfig } from "../configurations";
import { FormContext } from "../contexts/FormContext";
import {
  FormControl,
  FormControlValues,
  FormEventType,
  FormInterface,
  FormProps,
} from "./../types";

export class Form extends React.Component<FormProps> implements FormInterface {
  /**
   * {@inheritdoc}
   */
  public formElement!: HTMLFormElement;

  /**
   * Form id
   */
  protected formId: string = "";

  /**
   * Form event prefix
   */
  protected formEventPrefix: string = "";

  /**
   * Form Controls
   */
  protected formControls: FormControl[] = [];

  /**
   * Determine whether form validation is valid
   */
  protected isValidForm: boolean = true;

  /**
   * Determine form submission state
   */
  protected _isSubmitting: boolean = false;

  /**
   * Determine if form is disabled
   */
  protected _isDisabled: boolean = false;

  /**
   * List of invalid controls
   */
  protected invalidControls: FormControl[] = [];

  /**
   * List of valid controls
   */
  protected validControls: FormControl[] = [];

  /**
   * {@inheritDoc}
   */
  public constructor(props: FormProps) {
    super(props);

    this.formId = props.id || "frm-" + Math.random().toString(36).substr(2, 9);

    this.formEventPrefix = `form.${this.formId}`;

    setActiveForm(this as any);
    addToFormsList(this as any);
  }

  /**
   * {@inheritDoc}
   */
  public change(name: string, value: any) {
    const formControl = this.control(name);

    if (!formControl) return;

    formControl.change(value);
  }

  /**
   * {@inheritDoc}
   */
  public componentWillUnmount() {
    removeActiveForm(this as any);
  }

  /**
   * Mark the given form control as invalid control
   */
  public invalidControl(formControl: FormControl) {
    this.isValidForm = false;

    this.validControls = this.validControls.filter(
      (control) => control.id !== formControl.id
    );

    if (this.invalidControls.find((control) => control.id === formControl.id))
      return;

    this.invalidControls.push(formControl);

    this.trigger("invalidControl", formControl, this);
  }

  /**
   * Mark the given form control as valid control
   */
  public validControl(formControl: FormControl) {
    this.trigger("validControl", formControl, this);

    this.invalidControls = this.invalidControls.filter(
      (control) => control.id !== formControl.id
    );

    this.validControls.push(formControl);

    this.isValidForm = this.invalidControls.length === 0;
  }

  /**
   * Check and trigger form validation state
   */
  public checkIfIsValid() {
    const isValidForm = this.invalidControls.length === 0;

    this.isValidForm = isValidForm;

    if (this.isValidForm) {
      this.trigger("validControls", this.validControls, this);
    } else {
      this.trigger("invalidControls", this.invalidControls, this);
    }
  }

  /**
   * Trigger form submission
   */
  public submitting(submitting: boolean) {
    this._isSubmitting = submitting;
    this.trigger("submitting", submitting, this);

    if (submitting === false) {
      // Simulate form submit event
      this.trigger("submit", submitting, this);
    }
  }

  /**
   * Trigger form disable/enable state
   */
  public disable(isDisabled: boolean = true) {
    const controls = this.formControls;

    this._isDisabled = isDisabled;

    controls.forEach((control) => {
      control.disable(isDisabled);
    });

    return this;
  }

  /**
   * Enable form
   */
  public enable() {
    return this.disable(false);
  }

  /**
   * Determine whether the form is being submitted
   */
  public isSubmitting() {
    return this._isSubmitting;
  }

  /**
   * Determine whether the form is valid, can be called after form validation
   */
  public isValid() {
    return this.isValidForm;
  }

  /**
   * Get form id
   */
  public get id() {
    return this.formId;
  }

  /**
   * Form events method
   */
  public on(
    event: FormEventType,
    callback: (form: FormInterface) => void
  ): EventSubscription {
    return events.subscribe(`${this.formEventPrefix}.${event}`, callback);
  }

  /**
   * Trigger form events
   */
  public trigger(event: FormEventType, ...values: any[]) {
    return events.trigger(`${this.formEventPrefix}.${event}`, ...values);
  }

  /**
   * Trigger all form events
   */
  public triggerAll(event: FormEventType, ...values: any[]) {
    return events.triggerAll(`${this.formEventPrefix}.${event}`, ...values);
  }

  /**
   * Manually submit form
   */
  public submit() {
    if (!this.formElement) return;

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
   * Trigger form validation
   */
  public async validate(controls: FormControl[] = this.formControls) {
    this.isValidForm = true;
    this.validControls = [];
    this.invalidControls = [];

    const eventResponse = this.triggerAll("validating", this);

    const validatedInputs: FormControl[] = [];

    if (eventResponse.results.includes(false)) {
      this.isValidForm = false;
      return validatedInputs;
    }

    for (const input of controls) {
      validatedInputs.push(input);

      await input.validate();

      if (input.isValid === false) {
        this.invalidControl(input);
      } else {
        this.validControl(input);
      }
    }

    this.trigger("validation", this.isValidForm, validatedInputs, this);

    this.checkIfIsValid();

    if (!this.isValidForm) {
      if (this.props.onError) {
        this.props.onError(this.invalidControls);
      }
    }

    return validatedInputs;
  }

  /**
   * Trigger form validation only for visible elements in the dom
   * If formControlNames is passed, then it will be operated only on these names.
   */
  public async validateVisible() {
    let controls = this.formControls.filter((control) => {
      return control.isVisible();
    });

    return this.validate(controls);
  }

  /**
   * Register form control
   */
  public register(formControl: FormControl) {
    if (this.control(formControl.id, "id")) return;

    this.trigger("registering", formControl, this);

    this.formControls.push(formControl);

    this.trigger("register", formControl, this);
  }

  /**
   * Unregister form control from the form
   */
  public unregister(formControl: FormControl) {
    formControl.unregister();

    const formControlIndex = this.formControls.findIndex(
      (input) => input.id === formControl.id
    );

    if (formControlIndex === -1) return;

    this.formControls.splice(formControlIndex, 1);

    this.trigger("unregister", formControl, this);
  }

  /**
   * Get input by input value
   */
  public control(
    value: string,
    getBy: "name" | "id" = "name"
  ): FormControl | null {
    return this.formControls.find((input) => input[getBy] === value) || null;
  }

  /**
   * Reset all form values and properties
   */
  public reset() {
    this.trigger("resetting", this);
    this.formControls.forEach((input) => {
      input.reset();
    });

    this.isValidForm = true;
    this._isSubmitting = false;
    this._isDisabled = false;

    this.trigger("reset", this);

    return this;
  }

  /**
   * Reset form errors
   */
  public resetErrors() {
    this.formControls.forEach((formControl) => {
      formControl.setError(null);
    });

    return this;
  }

  /**
   * Get value from form controls
   *
   */
  public value(FormControlName: string): any {
    return this.control(FormControlName, "name")?.value;
  }

  /**
   * Get all form values
   */
  public values(formControlNames: string[] = []) {
    const formControls = this.controls(formControlNames);

    const values: FormControlValues = {};

    const ignoreEmptyValues =
      this.props.ignoreEmptyValues !== undefined
        ? this.props.ignoreEmptyValues
        : getFormConfig("ignoreEmptyValues", false);

    for (const formControl of formControls) {
      if (!formControl.isCollectable()) continue;
      const name = formControl.name;
      const value = formControl.collectValue();

      if (
        (ignoreEmptyValues && [null, undefined, ""].includes(value)) ||
        (Array.isArray(value) && value.length === 0)
      )
        continue;

      // we have 3 scenarios here
      // 1. we have a single value
      // 2. we have an array of values
      // 3. we have a nested object values
      // Nested values names are a dot notation syntax.
      // if we have a nested value, we need to split the name and create a nested object

      if (values[name] && !Array.isArray(values[name])) {
        values[name] = [values[name]];
      }

      if (Array.isArray(values[name])) {
        values[name].push(value);
      } else {
        values[name] = value;
      }
    }

    // convert any dot notation to nested objects
    for (const name in values) {
      if (name.includes(".")) {
        const nestedValue = values[name];
        const nestedName = name.split(".");
        const nestedNameLength = nestedName.length;

        let nestedObject = values;

        for (let i = 0; i < nestedNameLength; i++) {
          const nestedNamePart = nestedName[i];

          if (i === nestedNameLength - 1) {
            nestedObject[nestedNamePart] = nestedValue;
            continue;
          }

          if (!nestedObject[nestedNamePart]) {
            nestedObject[nestedNamePart] = {};
          }

          nestedObject = nestedObject[nestedNamePart];
        }

        delete values[name];
      }
    }
    return values;
  }

  /**
   * Return value in form data format
   */
  public formData() {
    const formData = new FormData();

    const values = this.values();

    for (const name in values) {
      const value = values[name];

      if (Array.isArray(value)) {
        value.forEach((v) => formData.append(name, v));
        continue;
      }

      formData.append(name, value);
    }

    return formData;
  }

  /**
   * Get all form controls list
   */
  public controls(formControls: string[] = []): FormControl[] {
    if (formControls?.length === 0) return this.formControls;

    return this.formControls.filter((formControl) =>
      formControls.includes(formControl.name)
    );
  }

  /**
   * The onSubmit method that will be passed to the form element
   */
  protected async triggerSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    await this.validate();

    if (this.isValidForm === false) return;

    if (this.props.onSubmit) {
      this.submitting(true);
      const form = this;
      this.props.onSubmit({
        form: this,
        event: e,
        get values() {
          return form.values();
        },
        get formData() {
          return form.formData();
        },
      });
    }

    this.trigger("submit", e, this);
  }

  /**
   * {@inheritdoc}
   */
  public render() {
    const {
      id = "form-" + this.formId,
      onError,
      onSubmit,
      component: Component = getFormConfig("formComponent", "form"),
      children,
      ...otherProps
    } = this.props;

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
