import events, { EventSubscription } from "@mongez/events";
import { debounce, toInputName } from "@mongez/reinforcements";
import { isPlainObject } from "@mongez/supportive-is";
import React from "react";
import {
  addToFormsList,
  removeActiveForm,
  setActiveForm,
} from "../active-form";
import { getFormConfig } from "../configurations";
import {
  FormControl,
  FormControlValues,
  FormEventType,
  FormInterface,
  FormProps,
} from "./../types";

/**
 * Platform-agnostic form engine.
 *
 * Holds all form logic that does not depend on the DOM (or on a specific host
 * element). Concrete subclasses implement `submit()` and `render()` for their
 * platform (web `<form>` element, React Native view, etc.).
 */
export abstract class BaseForm<P extends FormProps = FormProps>
  extends React.Component<P>
  implements FormInterface
{
  /**
   * Reference to the host element (HTMLFormElement on web, any on native).
   */
  public formElement: any;

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
   * Dirty controls
   */
  public dirtyControls: FormControl[] = [];

  /**
   * Default value for the form
   */
  public defaultValue: FormProps["defaultValue"];

  /**
   * Form control events
   */
  protected formControlEvents: Record<string, EventSubscription[]> = {};

  /**
   * Current form dirty state
   */
  public isDirty = false;

  public constructor(props: P) {
    super(props);

    this.formId = props.id || "frm-" + Math.random().toString(36).substr(2, 9);

    this.defaultValue = props.defaultValue;

    this.formEventPrefix = `form.${this.formId}`;

    setActiveForm(this as any);
    addToFormsList(this as any);
  }

  public change(name: string, value: any) {
    const formControl = this.control(name);

    if (!formControl) return;

    formControl.change(value);
  }

  public componentWillUnmount() {
    removeActiveForm(this as any);
  }

  public invalidControl(formControl: FormControl) {
    this.isValidForm = false;

    this.validControls = this.validControls.filter(
      (control) => control.id !== formControl.id
    );

    if (!this.invalidControls.includes(formControl)) {
      this.invalidControls.push(formControl);
    }

    this.trigger("invalidControl", formControl, this);
  }

  public validControl(formControl: FormControl) {
    this.invalidControls = this.invalidControls.filter(
      (control) => control.id !== formControl.id
    );

    if (!this.validControls.includes(formControl)) {
      this.validControls.push(formControl);
    }

    this.isValidForm = this.invalidControls.length === 0;

    this.trigger("validControl", formControl, this);
  }

  public checkIfIsValid = this._checkIfIsValid();

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

  public submitting(submitting: boolean) {
    this._isSubmitting = submitting;

    this.trigger("submitting", submitting, this);

    if (submitting === false) {
      this.trigger("submit", submitting, this);
    }
  }

  public disable(isDisabled = true) {
    const controls = this.formControls;

    this._isDisabled = isDisabled;

    controls.forEach((control) => {
      control.disable(isDisabled);
    });

    this.trigger("disable", isDisabled, this);

    return this;
  }

  public enable() {
    return this.disable(false);
  }

  public isSubmitting() {
    return this._isSubmitting;
  }

  public isValid() {
    return this.isValidForm;
  }

  public get id() {
    return this.formId;
  }

  public on(
    event: FormEventType,
    callback: (form: FormInterface) => void
  ): EventSubscription {
    return events.subscribe(`${this.formEventPrefix}.${event}`, callback);
  }

  public trigger(event: FormEventType, ...values: any[]) {
    return events.trigger(`${this.formEventPrefix}.${event}`, ...values);
  }

  public triggerAll(event: FormEventType, ...values: any[]) {
    return events.triggerAll(`${this.formEventPrefix}.${event}`, ...values);
  }

  /**
   * Manually submit form. Platform-specific behavior is implemented in subclasses.
   */
  public abstract submit(): void;

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

  public validateVisible() {
    const controls = this.formControls.filter((control) => {
      return control.isVisible();
    });

    return this.validate(controls);
  }

  public register(formControl: FormControl) {
    if (this.control(formControl.id, "id")) return;

    this.trigger("registering", formControl, this);

    this.formControls.push(formControl);

    const event = formControl.onChange(() => {
      if (formControl.isDirty && !this.dirtyControls.includes(formControl)) {
        this.dirtyControls.push(formControl);
      } else if (
        !formControl.isDirty &&
        this.dirtyControls.includes(formControl)
      ) {
        this.dirtyControls = this.dirtyControls.filter(
          (control) => control.id !== formControl.id
        );
      }

      this.setIsDirty(this.dirtyControls.length > 0);
    });

    this.formControlEvents[formControl.id || formControl.name] = [
      ...(this.formControlEvents[formControl.id || formControl.name] || []),
      event,
    ];

    this.trigger("register", formControl, this);
  }

  public unregister(formControl: FormControl) {
    formControl.unregister();

    const formControlIndex = this.formControls.findIndex(
      (input) => input.id === formControl.id
    );

    if (formControlIndex === -1) return;

    this.formControls.splice(formControlIndex, 1);

    this.invalidControls = this.invalidControls.filter(
      (control) => control.id !== formControl.id
    );

    const formControlKey = formControl.id || formControl.name;

    const controlEvents = this.formControlEvents[formControlKey];

    if (controlEvents) {
      controlEvents.forEach((event) => {
        event.unsubscribe();
      });

      delete this.formControlEvents[formControlKey];

      if (this.dirtyControls.includes(formControl)) {
        this.dirtyControls = this.dirtyControls.filter(
          (control) => control.id !== formControl.id
        );

        this.setIsDirty(this.dirtyControls.length > 0);
      }
    }

    this.checkIfIsValid();

    this.trigger("unregister", formControl, this);
  }

  protected setIsDirty(isDirty: boolean) {
    this.isDirty = isDirty;

    this.trigger("dirty", isDirty, this);
  }

  public control(
    value: string,
    getBy: "name" | "id" = "name"
  ): FormControl | null {
    return this.formControls.find((input) => input[getBy] === value) || null;
  }

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

  public resetErrors() {
    this.formControls.forEach((formControl) => {
      formControl.setError(null);
    });

    return this;
  }

  public value(FormControlName: string): any {
    return this.control(FormControlName, "name")?.value;
  }

  public values(formControlNames: string[] = []) {
    return createNestedObjectFromDotNotation(
      this.collectValues(formControlNames)
    );
  }

  public shouldIgnoreEmptyValues() {
    return (
      this.props.ignoreEmptyValues !== undefined
        ? this.props.ignoreEmptyValues
        : getFormConfig("ignoreEmptyValues", false)
    ) as boolean;
  }

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

  public formData(): FormData {
    const formData: FormData = new FormData();

    const values = this.collectValues();

    for (const name in values) {
      const value = values[name];
      const formControlName = toInputName(name);

      if (Array.isArray(value)) {
        for (const item of value) {
          formData.append(`${formControlName}[]`, item);
        }
        continue;
      } else if (isPlainObject(value)) {
        for (const key in value) {
          formData.append(`${formControlName}[${key}]`, value[key]);
        }
        continue;
      }

      formData.append(formControlName, value);
    }

    return formData;
  }

  public controls(formControls: string[] = []): FormControl[] {
    if (formControls?.length === 0) return this.formControls;

    return this.formControls.filter((formControl) =>
      formControls.includes(formControl.name)
    );
  }

  /**
   * Shared submit pipeline. Web overrides `triggerSubmit` to also call
   * `preventDefault`/`stopPropagation` on the DOM event before delegating here.
   */
  protected async handleSubmit(event?: React.FormEvent) {
    await this.validate();

    if (this.isValidForm === false) return;

    if (this.isSubmitting()) return;

    if (this.props.onSubmit) {
      this.submitting(true);

      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const form = this;
      this.props.onSubmit({
        form: this,
        event,
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
