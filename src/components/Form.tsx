import events, { EventSubscription } from "@mongez/events";
import { debounce, toInputName } from "@mongez/reinforcements";
import Is from "@mongez/supportive-is";
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
  protected formId = "";

  /**
   * Form event prefix
   */
  protected formEventPrefix = "";

  /**
   * Form Controls
   */
  protected formControls: FormControl[] = [];

  /**
   * Determine whether form validation is valid
   */
  protected isValidForm = true;

  /**
   * Determine form submission state
   */
  protected _isSubmitting = false;

  /**
   * Determine if form is disabled
   */
  protected _isDisabled = false;

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
      control => control.id !== formControl.id,
    );

    if (this.invalidControls.find(control => control.id === formControl.id))
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
      control => control.id !== formControl.id,
    );

    this.validControls.push(formControl);

    this.isValidForm = this.invalidControls.length === 0;
  }

  /**
   * Check and trigger form validation state
   */
  public checkIfIsValid = this._checkIfIsValid();

  /**
   * Check and trigger form validation state
   */
  protected _checkIfIsValid() {
    return debounce(() => {
      const isValidForm = this.invalidControls.length === 0;

      this.isValidForm = isValidForm;

      if (this.isValidForm) {
        this.trigger("validControls", this.validControls, this);
      } else {
        this.trigger("invalidControls", this.invalidControls, this);
      }
    }, 0);
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
  public disable(isDisabled = true) {
    const controls = this.formControls;

    this._isDisabled = isDisabled;

    controls.forEach(control => {
      control.disable(isDisabled);
    });

    this.trigger("disable", isDisabled, this);

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
    callback: (form: FormInterface) => void,
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

      if ((await input.validate()) === false) {
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
    const controls = this.formControls.filter(control => {
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
      input => input.id === formControl.id,
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
    getBy: "name" | "id" = "name",
  ): FormControl | null {
    return this.formControls.find(input => input[getBy] === value) || null;
  }

  /**
   * Reset all form values and properties
   */
  public reset() {
    this.trigger("resetting", this);
    this.formControls.forEach(input => {
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
    this.formControls.forEach(formControl => {
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
    return createNestedObjectFromDotNotation(
      this.collectValues(formControlNames),
    );
  }

  /**
   * Determine whether form should ignore empty values
   */
  public shouldIgnoreEmptyValues() {
    return (
      this.props.ignoreEmptyValues !== undefined
        ? this.props.ignoreEmptyValues
        : getFormConfig("ignoreEmptyValues", false)
    ) as boolean;
  }

  /**
   * Collect values for the given form control names
   */
  public collectValues(formControlNames: string[] = []) {
    const formControls = this.controls(formControlNames);

    const values: FormControlValues = {};

    const ignoreEmptyValues = this.shouldIgnoreEmptyValues();

    for (const formControl of formControls) {
      const name = formControl.name;
      if (!name || !formControl.isCollectable()) continue;

      const value = formControl.collectValue();

      if (
        ignoreEmptyValues &&
        ([null, undefined, ""].includes(value) ||
          (Array.isArray(value) && value.length === 0))
      )
        continue;

      // value must be converted into array in two scenarios:
      // if the `multiple` is set to true
      // or the values object already has the same name
      if (
        (values[name] || formControl.multiple) &&
        !Array.isArray(values[name]) &&
        !Array.isArray(value)
      ) {
        values[name] = values[name] ? [values[name]] : [];
      }

      if (Array.isArray(values[name])) {
        values[name].push(value);
      } else {
        values[name] = value;
      }
    }

    return values;
  }

  /**
   * Return value in form data format
   */
  public formData() {
    const formData = new FormData();

    const values = this.collectValues();

    for (const name in values) {
      const value = values[name];
      const formControlName = toInputName(name);

      if (Array.isArray(value)) {
        for (const item of value) {
          formData.append(`${formControlName}[]`, item);
        }
        continue;
      } else if (Is.plainObject(value)) {
        for (const key in value) {
          formData.append(`${formControlName}[${key}]`, value[key]);
        }
        continue;
      }

      formData.append(formControlName, value);
    }

    return formData;
  }

  /**
   * Get all form controls list
   */
  public controls(formControls: string[] = []): FormControl[] {
    if (formControls?.length === 0) return this.formControls;

    return this.formControls.filter(formControl =>
      formControls.includes(formControl.name),
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

      // eslint-disable-next-line @typescript-eslint/no-this-alias
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

    this.trigger("submit", this);
  }

  /**
   * {@inheritdoc}
   */
  public render() {
    const {
      id = "form-" + this.formId,
      onError: _e,
      onSubmit: _s,
      component: Component = getFormConfig("formComponent", "form"),
      children,
      ignoreEmptyValues: _ignoreEmptyValues,
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
          {...otherProps}>
          {children}
        </Component>
      </FormContext.Provider>
    );
  }
}

// create a function that receives an object
// each key is a dot notation syntax
// return an object with nested objects
// if the key is a dot notation syntax, then create a nested object
// if a segment of the key is a number, then create an array
// if the key is a number, then create an array
// i.e name.0.text => { name: [{ text: 'value' }] }
// name.firstName => { name: { firstName: 'value' } }
// name.addresses.0.city => { name: { addresses: [{ city: 'value' }] } }
function createNestedObjectFromDotNotation(object: any) {
  const result: any = {};

  for (const key in object) {
    const value = object[key];

    if (key.includes(".")) {
      const nestedName = key.split(".");
      const nestedNameLength = nestedName.length;

      let nestedObject = result;

      for (let i = 0; i < nestedNameLength; i++) {
        const nestedNamePart = nestedName[i];
        const isLastSegment = i === nestedNameLength - 1;
        const nextSegment = nestedName[i + 1];

        if (!nestedObject[nestedNamePart]) {
          if (isLastSegment) {
            nestedObject[nestedNamePart] = value;
            continue;
          }

          if (nextSegment && !isNaN(Number(nextSegment))) {
            nestedObject[nestedNamePart] = [];
          } else {
            nestedObject[nestedNamePart] = {};
          }
        }

        nestedObject = nestedObject[nestedNamePart];
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

// name.0.text
