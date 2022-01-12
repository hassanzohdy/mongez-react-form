import React from "react";
import serialize from "form-serialize";
import { Random, toInputName } from "@mongez/reinforcements";
import events, { EventSubscription } from "@mongez/events";

import {
  FormEventType,
  FormInputsValues,
  FormInterface,
  FormProps,
  FormContextProps,
  RegisteredFormInput,
} from "../types";
import FormContext from "../contexts/FormContext";

export default class Form
  extends React.Component<FormProps>
  implements FormInterface
{
  /**
   * {@inheritdoc}
   */
  public formElement!: HTMLFormElement;

  /**
   * {@inheritDoc}
   */
  protected props: FormProps = {};

  /**
   * Form id
   */
  protected formId: string = Random.string(32);

  /**
   * Form event prefix
   */
  protected formEventPrefix: string = `form.${this.formId}`;

  /**
   * Inputs List
   */
  protected inputs: RegisteredFormInput[] = [];

  /**
   * Invalid inputs list
   */
  protected invalidInputs: RegisteredFormInput[] = [];

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
   * Determine if values of the form inputs should be stored even if its unregistered
   * Useful with form wizards based
   */
  protected isStoringValues: boolean = false;

  /**
   * Stored values list
   */
  protected storedValuesList: FormInputsValues = {};

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
  public disable(isDisabled: boolean): void {
    this.isBeingDisabled = isDisabled;
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
   * Change form input value using its name
   */
  public changeValue(name: string, value: any): void {
    const input = this.getInput(name, "name");

    if (!input) return;

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
  public validate(): void {
    this.isValidForm = true;
    this.invalidInputs = [];

    for (const input of this.inputs) {
      if (input.isDisabled) continue;

      input.validate();

      if (input.isValid === false) {
        this.isValidForm = false;
        this.invalidInputs.push(input);
      }
    }

    if (this.isValidForm === false && this.props.onError) {
      this.props.onError(this.invalidInputs);
    }
  }

  /**
   * Validate only the given inputs names
   */
  public validateOnly(inputNames: string[]): RegisteredFormInput[] {
    const inputsList: RegisteredFormInput[] = [];

    for (const name of inputNames) {
      const input = this.getInput(name, "name");
      if (!input) continue;
      input.validate();

      inputsList.push(input);
    }

    return inputsList;
  }

  /**
   * Register form input
   */
  public register(formInput: RegisteredFormInput): void {
    if (this.getInput(formInput.id)) return;

    this.inputs.push(formInput);
  }

  /**
   * Unregister form input from the form
   */
  public unregister(formInput: RegisteredFormInput): void {
    const formInputIndex = this.inputs.findIndex(
      (input) => input.id === formInput.id
    );

    if (formInputIndex === -1) return;

    if (this.isStoringValues && formInput.isDisabled !== false) {
      this.storedValuesList[formInput.name] = formInput.value;
    }

    this.inputs.splice(formInputIndex, 1);
  }

  /**
   * Get input by input value
   */
  public getInput(
    value: string,
    getBy: "name" | "id" = "id"
  ): RegisteredFormInput | null {
    if (getBy === "name") {
      value = toInputName(value);
    }

    return this.inputs.find((input) => input[getBy] === value) || null;
  }

  /**
   * Reset all form values and properties
   */
  public reset(): void {
    this.isValidForm = true;
    this.isBeingSubmitted = false;
    this.isBeingDisabled = false;
    this.invalidInputs = [];
    this.storedValuesList = {};
    this.isStoringValues = false;

    for (const input of this.inputs) {
      input.reset();
    }
  }

  /**
   * Get all form values
   */
  public values(): FormInputsValues {
    if (this.props.collectValuesFromDOM === true) {
      return serialize(this.formElement, true);
    }

    const storedValuesList: FormInputsValues = {};

    for (const input of this.inputs) {
      if (input.isDisabled) continue;

      storedValuesList[input.name] = input.value;
    }

    return { ...storedValuesList, ...this.storedValuesList };
  }

  /**
   * Return form values as an object
   */
  public toObject(): FormInputsValues {
    return this.values();
  }

  /**
   * Return form values as a query string
   */
  public toString(): string {
    return this.toQueryString();
  }

  /**
   * Return form values as a query string
   */
  public toQueryString(): string {
    if (this.props.collectValuesFromDOM === true) {
      return serialize(this.formElement);
    }

    return "";
  }

  /**
   * Return form values as json syntax
   */
  public toJSON(): string {
    return JSON.stringify(this.toObject());
  }

  /**
   * Get all form inputs list
   */
  public inputsList(): RegisteredFormInput[] {
    return this.inputs;
  }

  /**
   * The onSubmit method that will be passed to the form element
   */
  protected triggerSubmit(e: React.FormEvent): void {
    e.preventDefault();
    e.stopPropagation();

    this.validate();

    if (this.isValidForm === false) return;

    if (this.props.onSubmit) {
      this.submitting(true);
      this.props.onSubmit(e, this);
    }
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
      form: this,
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
