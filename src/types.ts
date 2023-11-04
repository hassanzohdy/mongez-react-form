import { EventSubscription } from "@mongez/events";
import React, { ReactNode } from "react";

/**
 * Active forms list
 */
export type ActiveForms = {
  [key: string]: FormInterface;
};

export type HiddenInputProps = {
  /**
   * Input name
   */
  name: string;
  /**
   * Input value
   */
  value?: any;
  /**
   * Default value
   */
  defaultValue?: any;
};

export type FormSubmitOptions = {
  /**
   * Form instance
   */
  form: FormInterface;
  /**
   * Form submit event
   * Will be undefined if the form is submitted programmatically
   */
  event?: React.FormEvent;
  /**
   * Form values
   */
  values: Record<string, any>;
  /**
   * Get form values as FormData
   */
  formData: FormData;
};

// Form props will be default form element props + the following

export type FormProps = Omit<
  React.FormHTMLAttributes<HTMLFormElement>,
  "onSubmit" | "onError"
> & {
  /**
   * Triggered when form validation results to error
   */
  onError?: (invalidInputs: FormControl[]) => void;
  /**
   * Triggered when form validation is passed and now its in the submit process
   */
  onSubmit?: (options: FormSubmitOptions) => void;
  /**
   * Form element
   *
   * @default form
   */
  component?: React.ComponentType<any>;
  /**
   * Whether to ignore empty values
   *
   * @default false
   */
  ignoreEmptyValues?: boolean;
};

export type FormControlChangeOptions = {
  /**
   * Set current checked value
   * It's recommended to use `setChecked` method instead
   */
  checked?: boolean;
  /**
   * Whether to update the state or not
   *
   * @default true
   */
  updateState?: boolean;
  /**
   * Whether to perform form control validation or not
   *
   * @default true
   */
  validate?: boolean;
  [key: string]: any;
};

export type FormControlChange = FormControlChangeOptions & {
  formControl: FormControl;
};

export type FormControl = {
  /**
   * Form input name, it must be unique
   */
  name: string;
  /**
   * Form control type
   */
  type: string;
  /**
   * default value
   */
  defaultValue?: any;
  /**
   * Check if form control's value is changed
   */
  isDirty: boolean;
  /**
   * Check if form control is touched
   * Touched means that the user has focused on the input
   */
  isTouched: boolean;
  /**
   * Form input id, used as a form input flag determiner
   */
  id: string;
  /**
   * Form input value
   */
  value: any;
  /**
   * Input Initial value
   */
  initialValue: any;
  /**
   * Triggered when form starts validation
   */
  validate: () => Promise<boolean>;
  /**
   * Set form input error
   */
  setError: (error: React.ReactNode) => void;
  /**
   * Determine if current control is visible in the browser
   */
  isVisible: () => boolean;
  /**
   * Determine whether the form input is valid, this is checked after calling the validate method
   */
  isValid: boolean;
  /**
   * Focus on the element
   */
  focus: () => void;
  /**
   * Trigger blur event on the element
   */
  blur: () => void;
  /**
   * Triggered when form resets its values
   */
  reset: () => void;
  /**
   * Form Input Error
   */
  error: React.ReactNode;
  /**
   * Unregister form control
   */
  unregister: () => void;
  /**
   * Props list to this component
   */
  props: any;
  /**
   * Check if the input's value is marked as checked
   */
  checked: boolean;
  /**
   * Set checked value
   */
  setChecked: (checked: boolean) => void;
  /**
   * Initial checked value
   */
  initialChecked: boolean;
  /**
   * Determine if form control is multiple
   */
  multiple?: boolean;
  /**
   * Collect form control value
   */
  collectValue: () => any;
  /**
   * Check if input is collectable
   */
  isCollectable: () => boolean;
  /**
   * Determine if form control is controlled
   */
  isControlled: boolean;
  /**
   * Change form control value and any other related values
   */
  change: (value: any, changeOptions?: FormControlChangeOptions) => void;
  /**
   * Determine if form control is rendered
   */
  rendered: boolean;
  /**
   * Input Ref
   */
  inputRef: any;
  /**
   * Visible element ref
   */
  visibleElementRef: any;
  /**
   * Listen when form control value is changed
   */
  onChange: (callback: (value: FormControlChange) => void) => EventSubscription;
  /**
   * Listen when form control is destroyed
   */
  onDestroy: (callback: () => void) => EventSubscription;
  /**
   * Listen to form control when value is reset
   */
  onReset: (callback: () => void) => EventSubscription;
  /**
   * Disable/Enable form control
   */
  disable: (disable: boolean) => void;
  /**
   * Determine if form control is disabled
   */
  disabled: boolean;
  /**
   * Whether unchecked value should be collected
   *
   * Works only if type is `checkbox` or `radio`
   * @default false
   */
  collectUnchecked?: boolean;
  /**
   * Define the value if control checked state is false, If collectUnchecked is true
   */
  uncheckedValue?: any;
};

export type FormControlType = string | FormControl;

/**
 * Form control events that can be subscribed to by the form control
 */
export type FormControlEvent =
  | "change"
  | "reset"
  | "resetting"
  | "disabled"
  | "unregister"
  | "validation.start"
  | "validation.success"
  | "validation.error"
  | "validation.end";

export type FormContextDefinition = null | FormInterface;

/**
 * Returns when calling form.values() or form.toObject() to list all form inputs with its values
 */
export type FormControlValues = {
  [name: string]: any;
};

/**
 * Form events types
 */
export type FormEventType =
  /**
   * Triggered before form starts validation
   */
  | "validating"
  /**
   * Triggered when an invalid control is added to invalid controls
   */
  | "invalidControl"
  /**
   * Triggered when invalid controls has at least one invalid control
   */
  | "invalidControls"
  /**
   * Triggered when an invalid control becomes valid control
   */
  | "validControl"
  /**
   * Triggered when all invalid controls become valid controls
   */
  | "validControls"
  /**
   * Triggered after form validation
   */
  | "validation"
  /**
   * Triggered before form starts submitting and after form validation passes
   */
  | "submitting"
  /**
   * Triggered after form submission
   */
  | "submit"
  /**
   * Triggered before disabling/enabling form
   */
  | "disabling"
  /**
   * Triggered after disabling/enabling form
   */
  | "disable"
  /**
   * Triggered when at least one form inputs value has been changed
   */
  | "dirty"
  /**
   * Triggered before form resetting function
   */
  | "resetting"
  /**
   * Triggered after form resetting
   */
  | "reset"
  /**
   * Triggered before form registering form input
   */
  | "registering"
  /**
   * Triggered after form registering form input
   */
  | "register"
  /**
   * Triggered before form unregistering form input
   */
  | "unregistering"
  /**
   * Triggered after form unregistering form input
   */
  | "unregister"
  /**
   * Triggered when form control's value is changed
   */
  | "change"
  /**
   * Triggered before form values are collected
   */
  | "collecting"
  /**
   * Triggered after form values are collected
   */
  | "collected"
  /**
   * Triggered after form is initialized
   */
  | "init";

export type ReactComponent =
  | React.FC<FormControlProps>
  | React.ComponentClass<FormControlProps, any>;

export interface FormInterface {
  /**
   * Form element
   */
  formElement: HTMLFormElement;
  /**
   * Trigger form submission
   */
  submitting: (submitting: boolean) => void;
  /**
   * Trigger form validation
   */
  validate: (formControlNames?: FormControl[]) => Promise<FormControl[]>;
  /**
   * Trigger form validation only for visible elements in the dom
   * If formControlNames is passed, then it will be operated only on these names.
   */
  validateVisible: () => Promise<FormControl[]>;
  /**
   * Trigger form disable/enable state
   * If formControlNames is passed, then it will be operated only on these names.
   */
  disable: (isDisabled: boolean) => this;
  /**
   * Determine whether the form is being submitted
   */
  isSubmitting: () => boolean;
  /**
   * Determine whether the form is valid, can be called after form validation
   */
  isValid: () => boolean;
  /**
   * Change form input value using its name
   */
  change: (name: string, value: any) => void;
  /**
   * Manually submit form
   */
  submit: () => void;
  /**
   * Form events method
   */
  on: (
    event: FormEventType,
    callback: (form: FormInterface) => void,
  ) => EventSubscription;
  /**
   * Register new form input
   */
  register: (formInput: FormControl) => void;
  /**
   * Unregister form input from the form
   */
  unregister: (formInput: FormControl) => void;
  /**
   * Reset form values and validation state
   */
  reset: () => this;
  /**
   * Reset form errors
   */
  resetErrors: () => this;
  /**
   * Check and trigger form validation state
   */
  checkIfIsValid: () => void;
  /**
   * Get all form values
   * If formControlNames is passed, then it will be operated only on these names.
   */
  values: (formControlNames?: string[]) => FormControlValues;
  /**
   * Get value for the given control
   *
   */
  value: (FormControlName: string) => any;
  /**
   * Get form id
   */
  get id(): string;
  /**
   * Get input by input value
   *
   * @defaults getBy id
   */
  control: (value: string, getBy?: "name" | "id") => FormControl | null;
  /**
   * Get form controls list or only the given names
   */
  controls: (formControlNames?: string[]) => FormControl[];
  /**
   * Mark the given form control as invalid control
   */
  invalidControl: (formControl: FormControl) => void;
  /**
   * Mark the given form control as valid control
   */
  validControl: (formControl: FormControl) => void;
}

export type InputRuleOptions = {
  /**
   * Current value
   */
  value: any;
  /**
   * Form input name
   */
  name: string;
  /**
   * Form Control
   */
  formControl: FormControl;
  /**
   * Form instance
   */
  form: FormInterface | null;
  [key: string]: any;
};

export type FormContextProps = FormInterface | null;

export type InputRuleResult = React.ReactNode | undefined;

export type InputRule = (
  options: InputRuleOptions,
) => InputRuleResult | Promise<InputRuleResult>;

export type ErrorMessages = {
  [errorName: string]: string;
};

export type ErrorKeys = ErrorMessages;

export type ValidateOn = "change" | "blur";

export type FormControlOptions = {
  /**
   * Determine if form input value is multiple
   */
  multiple?: boolean;
  /**
   * Callback used to determine if input's value should be collected when calling form.values()
   */
  isCollectable?: (formControl: FormControl) => boolean;
  /**
   * Manually return the value that should be collected
   */
  collectValue?: (formControl: FormControl) => any;
  /**
   * Set unchecked value to be sent
   * If not set and input is not checked, then it will not be sent
   */
  uncheckedValue?: any;
  /**
   * Determine whether to collect unchecked value
   */
  collectUnchecked?: boolean;
  /**
   * Transform input value before setting it
   */
  transformValue?: (value: any, formControl?: FormControl) => any;
};

export type FormControlProps = {
  /**
   * Input name attribute, allows dot notation syntax
   * i.e user.name is valid, will be transformed into user[name]
   */
  name?: string;
  /**
   * Input id attribute
   */
  id?: string;
  /**
   * Override error messages
   */
  errors?: ErrorMessages;
  /**
   * Error keys
   * Used only when errorMessages is not set
   * Error key is the key that will be replaced on the validation error message.
   * Each rule can have its own error key.
   * But they all have `name` as default error key.
   */
  errorKeys?: ErrorKeys;
  /**
   * Input value, used with onChange
   */
  value?: any;
  /**
   * Input default value
   */
  defaultValue?: any;
  /**
   * Determine if the input is disabled
   */
  disabled?: boolean;
  /**
   * Determine if the input is read only
   */
  readOnly?: boolean;
  /**
   * Input type
   */
  type?: string;
  /**
   * Determine if the input is required
   */
  required?: boolean;
  /**
   * Input placeholder
   */
  placeholder?: string;
  /**
   * Input label
   */
  label?: React.ReactNode;
  /**
   * Triggered when input validation has an error
   */
  onError?: (error: React.ReactNode) => any;
  /**
   * Add manual validation
   */
  validate?: (options: InputRuleOptions) => React.ReactNode;
  /**
   * Input validation rules list
   */
  rules?: InputRule[];
  /**
   * A callback function triggered on input value changes
   */
  onChange?: (value: any, options?: FormControlChangeOptions) => void;
  /**
   * Validate the input based on type of change
   *
   * @default change
   */
  validateOn?: ValidateOn;
  /**
   * Any other props
   */
  [key: string]: any;
};

export type FormControlHook = {
  /**
   * Input id
   */
  id: string;
  /**
   * Input name
   */
  name: string;
  /**
   * Input type
   */
  type: string;
  /**
   * Input value
   */
  value: any;
  /**
   * Input error
   */
  error: ReactNode;
  /**
   * Set input error
   */
  setError: (error: React.ReactNode) => void;
  /**
   * Input Ref
   */
  inputRef: any;
  /**
   * Visible element ref
   */
  visibleElementRef: any;
  /**
   * Form input handler
   */
  formControl: FormControl;
  /**
   * Manually validate the input
   */
  validate: (value: any) => void;
  /**
   * Determine if input is checked
   */
  checked: boolean;
  /**
   * Update checked state
   */
  setChecked: (checked: boolean) => void;
  /**
   * Other props passed to the input
   */
  otherProps: any;
  /**
   * Change value
   */
  changeValue: (value: any, otherOptions?: FormControlChangeOptions) => void;
  /**
   * Determine if form control is disabled
   */
  disabled: boolean;
  /**
   * Disable form control
   */
  disable: () => void;
  /**
   * Enable form control
   */
  enable: () => void;
};

export type FormConfigurations = {
  /**
   * Whether to ignore empty values when calling form.values()
   *
   * @default false
   */
  ignoreEmptyValues?: boolean;
  /**
   * Set form component
   *
   * @default `form`
   */
  formComponent?: ReactComponent;
};
