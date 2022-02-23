import React from "react";
import serialize from "form-serialize";
import queryString from "query-string";
import { Random, toInputName } from "@mongez/reinforcements";
import events, { EventSubscription } from "@mongez/events";

import {
  FormEventType,
  FormControlValues,
  FormInterface,
  FormProps,
  FormContextProps,
  FormControl,
} from "../types";
import FormContext from "../contexts/FormContext";
import { ControlMode, ControlType } from "..";

export default class Form
  extends React.Component<FormProps>
  implements FormInterface
{
  /**
   * {@inheritdoc}
   */
  public formElement!: HTMLFormElement;

  /**
   * Form id
   */
  protected formId: string = Random.string(32);

  /**
   * Form event prefix
   */
  protected formEventPrefix: string = `form.${this.formId}`;

  /**
   * Form Controls
   */
  protected formControls: FormControl[] = [];

  /**
   * Invalid inputs list
   */
  protected invalidInputs: FormControl[] = [];

  /**
   * Determine whether form validation is valid
   */
  protected isValidForm: boolean = true;

  /**
   * Determine form submission state
   */
  protected isBeingSubmitted: boolean = false;

  /**
   * Determine if form is disabled
   */
  protected isBeingDisabled: boolean = false;

  /**
   * Determine if values of the form controls should be stored even if its unregistered
   * Useful with form wizards based
   */
  protected isStoringValues: boolean = false;

  /**
   * Stored values list
   */
  protected storedValuesList: FormControlValues = {};

  /**
   * Determine whether to keep storing input values even if it is unregistered
   */
  public keepValues(keepValues: boolean = true): void {
    this.isStoringValues = keepValues;
  }

  /**
   * Trigger form submission
   */
  public submitting(submitting: boolean): void {
    this.isBeingSubmitted = submitting;
  }

  /**
   * Trigger form disable/enable state
   */
  public disable(
    isDisabled: boolean = true,
    formControlNames: string[] = []
  ): void {
    this.trigger(
      "disabling",
      isDisabled,
      this.isBeingDisabled,
      formControlNames,
      this
    );

    this.isBeingDisabled = isDisabled;

    const controls = this.each(
      (input) => input.disable && input.disable(isDisabled),
      formControlNames
    );

    const totalControlNames = controls.map((control) => control.name);

    if (this.props.collectValuesFromDOM) {
      const elements = this.formElement.elements;

      for (let element of elements as any) {
        if (
          (!totalControlNames.includes(element["name"]) &&
            formControlNames.length > 0 &&
            totalControlNames.includes(element["name"])) ||
          formControlNames.length === 0
        ) {
          if (isDisabled) {
            element.setAttribute("disabled", "disabled");
          } else {
            element.removeAttribute("disabled");
          }
        }
      }
    }

    this.trigger("disable", isDisabled, controls, this);
  }

  /**
   * Mark form elements as read only
   */
  public readOnly(
    isReadOnly: boolean = true,
    formControlNames: string[] = []
  ): void {
    const controls = this.each(
      (input) => input.readOnly && input.readOnly(isReadOnly),
      formControlNames
    );

    const totalControlNames = controls.map((control) => control.name);

    if (this.props.collectValuesFromDOM) {
      for (let element of this.formElement.elements as any) {
        if (
          (!totalControlNames.includes(element["name"]) &&
            formControlNames.length > 0 &&
            totalControlNames.includes(element["name"])) ||
          formControlNames.length === 0
        ) {
          if (isReadOnly) {
            element.setAttribute("readonly", "readonly");
          } else {
            element.removeAttribute("readonly");
          }
        }
      }
    }
  }

  /**
   * Enable form
   */
  public enable(): void {
    return this.disable(false);
  }

  /**
   * Perform operation on each registered input
   */
  public each(
    callback: (input: FormControl) => void,
    formControlNames: string[] = []
  ): FormControl[] {
    let formControls: FormControl[] = this.formControls;
    if (formControlNames.length > 0) {
      formControls = formControls.filter((formControl) =>
        formControlNames.includes(formControl.name)
      );
    }

    for (let input of formControls) {
      callback(input);
    }

    return formControls;
  }

  /**
   * Determine whether the form is enabled
   */
  public isEnabled(): boolean {
    return this.isBeingDisabled === false;
  }

  /**
   * Determine whether the form is disabled
   */
  public isDisabled(): boolean {
    return this.isBeingDisabled;
  }

  /**
   * Determine whether the form is being submitted
   */
  public isSubmitting(): boolean {
    return this.isBeingSubmitted;
  }

  /**
   * Determine whether the form is valid, can be called after form validation
   */
  public isValid(): boolean {
    return this.isValidForm;
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
   * Change form control value using its name
   */
  public changeValue(name: string, value: any): void {
    const input = this.control(name, "name");

    if (!input || !input.changeValue) return;

    input.changeValue(value);
  }

  /**
   * Manually submit form
   */
  public submit(): void {
    if (!this.formElement) return;

    this.formElement.requestSubmit();
  }

  /**
   * Trigger form validation
   */
  public validate(formControlNames: string[] = []): void {
    this.trigger("validating", formControlNames, this);
    this.isValidForm = true;
    this.invalidInputs = [];

    const validatedInputs: FormControl[] = [];

    const controls = this.controls(formControlNames);

    for (const input of controls) {
      if (input.isDisabled) continue;

      validatedInputs.push(input);

      input.validate && input.validate();

      if (input.isValid === false) {
        this.isValidForm = false;
        this.invalidInputs.push(input);
      }
    }

    if (this.isValidForm === false && this.props.onError) {
      this.props.onError(this.invalidInputs);
    }

    this.trigger("validation", validatedInputs, this);
  }

  /**
   * Register form control
   */
  public register(formControl: FormControl): void {
    if (this.control(formControl.id!)) return;

    this.trigger("registering", formControl, this);

    this.formControls.push(formControl);

    this.trigger("register", formControl, this);
  }

  /**
   * Unregister form control from the form
   */
  public unregister(formControl: FormControl): void {
    const formControlIndex = this.formControls.findIndex(
      (input) => input.id === formControl.id
    );

    if (formControlIndex === -1) return;

    if (this.isStoringValues && formControl.isDisabled !== false) {
      this.storedValuesList[formControl.name] = formControl.value;
    }

    this.trigger("unregistering", formControl, this);

    this.formControls.splice(formControlIndex, 1);

    this.trigger("unregister", formControl, this);
  }

  /**
   * Get input by input value
   */
  public control(
    value: string,
    getBy: "name" | "id" = "id"
  ): FormControl | null {
    if (getBy === "name") {
      value = toInputName(value);
    }

    return this.formControls.find((input) => input[getBy] === value) || null;
  }

  /**
   * Reset all form values and properties
   */
  public reset(formControlNames: string[] = []): FormControl[] {
    this.trigger("resetting", formControlNames, this);

    this.isValidForm = true;
    this.isBeingSubmitted = false;
    this.isBeingDisabled = false;
    this.invalidInputs = [];
    this.storedValuesList = {};
    this.isStoringValues = false;

    const controls = this.each(
      (input) => input.reset && input.reset(),
      formControlNames
    );

    if (this.props.collectValuesFromDOM) {
      this.formElement.reset();
    }

    this.trigger("reset", controls, this);

    return controls;
  }

  /**
   * Get all form values
   */
  public values(formControlNames: string[] = []): FormControlValues {
    this.trigger("serializing", "object", formControlNames, this);
    let storedValuesList: FormControlValues = {};

    if (this.props.collectValuesFromDOM === true) {
      storedValuesList = serialize(this.formElement, true);

      if (formControlNames.length > 0) {
        for (let key in storedValuesList) {
          if (!formControlNames.includes(key)) {
            delete storedValuesList[key];
          }
        }
      }
    }

    for (const input of this.formControls) {
      if (input.isDisabled || formControlNames.includes(input.name)) continue;

      storedValuesList[input.name] = input.value;
    }

    const values = { ...storedValuesList, ...this.storedValuesList };

    this.trigger("serialize", "object", values, formControlNames, this);

    return values;
  }

  /**
   * Return form values as an object
   */
  public toObject(formControlNames: string[] = []): FormControlValues {
    return this.values(formControlNames);
  }

  /**
   * Return form values as a query string
   */
  public toString(formControlNames: string[] = []): string {
    return this.toQueryString(formControlNames);
  }

  /**
   * Return form values as a query string
   */
  public toQueryString(formControlNames: string[] = []): string {
    this.trigger("serializing", "queryString", formControlNames, this);

    const values = queryString.stringify(this.toObject(formControlNames), {
      arrayFormat: "bracket",
    });

    this.trigger("serializing", "queryString", values, formControlNames, this);

    return values;
  }

  /**
   * Return form values as json syntax
   */
  public toJSON(formControlNames: string[] = []): string {
    this.trigger("serializing", "json", formControlNames, this);

    const values = JSON.stringify(this.toObject(formControlNames));

    this.trigger("serializing", "json", values, formControlNames, this);

    return values;
  }

  /**
   * Get all form controls list
   */
  public controls(formControlNames: string[] = []): FormControl[] {
    return formControlNames.length > 0
      ? this.formControls.filter((formControl) =>
          formControlNames.includes(formControl.name)
        )
      : this.formControls;
  }

  /**
   * Getting list of control based on its type
   */
  public controlsOf(control: ControlMode, type?: ControlType): FormControl[] {
    return this.formControls.filter(
      (formControl) =>
        formControl.control === control &&
        (type ? formControl.type === type : true)
    );
  }

  /**
   * Shorthand method to get input controls
   */
  public inputs(type?: ControlType): FormControl[] {
    return this.controlsOf("input", type);
  }

  /**
   * Shorthand method to get buttons controls
   */
  public buttons(type?: ControlType): FormControl[] {
    return this.controlsOf("button", type);
  }

  /**
   * The onSubmit method that will be passed to the form element
   */
  protected triggerSubmit(e: React.FormEvent): void {
    this.trigger("submitting", e, this);

    e.preventDefault();
    e.stopPropagation();

    this.validate();

    if (this.isValidForm === false) return;

    if (this.props.onSubmit) {
      this.submitting(true);
      this.props.onSubmit(e, this as FormInterface);
    }

    this.trigger("submit", e, this);
  }

  /**
   * {@inheritdoc}
   */
  public render() {
    const {
      noValidate = true,
      className,
      id = "form-" + this.formId,
      onError,
      collectValuesFromDOM,
      keepValues,
      onSubmit,
      onValidating,
      component: Component = "form",
      children,
      ...otherProps
    } = this.props;

    const formContext: FormContextProps = {
      form: this as FormInterface,
      register: this.register.bind(this),
      unregister: this.unregister.bind(this),
    };

    return (
      <FormContext.Provider value={formContext}>
        <Component
          ref={(form: any) => (this.formElement = form)}
          className={className}
          id={id}
          noValidate={noValidate}
          onSubmit={this.triggerSubmit.bind(this)}
          {...otherProps}
        >
          {children}
        </Component>
      </FormContext.Provider>
    );
  }
}
