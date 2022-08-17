import { EventSubscription } from "@mongez/events";
import { Rule, RuleResponse } from "@mongez/validator";
import React from "react";

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
  name?: string;
  /**
   * Input value
   */
  value?: any;
};

export type FormProps = {
  /**
   * Form Id
   */
  id?: string;
  /**
   * Form no validate prop
   *
   * @default true
   */
  noValidate?: boolean;
  /**
   * Triggered when form validation results to error
   */
  onError?: (invalidInputs: FormControl[]) => void;
  /**
   * Triggered when form validation is passed and now its in the submit process
   */
  onSubmit?: (e: React.FormEvent, form: FormInterface) => void;
  /**
   * Triggered when form validation starts
   */
  onValidating?: any;
  /**
   * Form class
   */
  className?: string;
  /**
   * Form element
   *
   * @default form
   */
  component?: React.FC<any> | React.ComponentClass<any, any>;
  /**
   * If set to true, then all values in the form will be kept even if form inputs are unmounted
   * Useful with form wizard or steppers
   *
   * @default false
   */
  keepValues?: boolean;
  /**
   * Collect form input values from dom elements instead of registered inputs
   *
   * @default false
   */
  collectValuesFromDOM?: boolean;
  /**
   * Form Children list
   */
  children?: React.ReactNode;
  /**
   * Any other props
   */
  [key: string]: any;
};

/**
 * Reset form button props
 */
export type ResetFormButtonProps = {
  /**
   * Button component
   *
   * @default 'button'
   */
  component?: ReactComponent | string;
  /**
   * The onClick props
   */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /**
   * Determine what inputs to be reset, if not passed or passed as empty array
   * Then all form controls will be cleared
   *
   * @default []
   */
  resetOnly?: string[];
  /**
   * Other props
   */
  [key: string]: any;
};

/**
 * Available control modes
 */
export type ControlMode = "input" | "button";

/**
 * Available control types
 */
export type ControlType =
  | "text"
  | "color"
  | "date"
  | "time"
  | "dateTime"
  | "email"
  | "checkbox"
  | "radio"
  | "hidden"
  | "number"
  | "password"
  | "range"
  | "search"
  | "tel"
  | "url"
  | "week"
  | "select"
  | "autocomplete"
  | "file"
  | "image"
  | "button"
  | "reset"
  | "submit";

export type FormControl = {
  /**
   * Form input name, it must be unique
   */
  name: string;
  /**
   * Form control mode
   */
  control: ControlMode;
  /**
   * Form control type
   */
  type: ControlType;
  /**
   * Form input id, used as a form input flag determiner
   */
  id: string;
  /**
   * Form input value
   */
  value?: any;
  /**
   * Old Form control value
   */
  oldValue?: any;
  /**
   * Triggered when form is changing disabling / enabling mode
   */
  disable?: (isDisabling: boolean) => void;
  /**
   * Triggered when form is changing read only mode
   */
  readOnly?: (isReadingOnly: boolean) => void;
  /**
   * Triggered when form is changing a value to the form input
   */
  changeValue?: (newValue: any) => void;
  /**
   * Triggered when form starts validation
   */
  validate?: (newValue?: string) => RuleResponse | null;
  /**
   * Set form input error
   */
  setError: (error: RuleResponse) => void;
  /**
   * Determine whether the form input is valid, this is checked after calling the validate method
   */
  isValid?: boolean;
  /**
   * Determine whether form input is disabled
   */
  isDisabled?: boolean;
  /**
   * Determine whether form input is in read only state
   */
  isReadOnly?: boolean;
  /**
   * Determine whether form input's value has been changed
   */
  isDirty?: boolean;
  /**
   * Focus on the element
   */
  focus?: (focus: boolean) => void;
  /**
   * Triggered when form resets its values
   */
  reset?: () => void;
  /**
   * Form Input Error
   */
  error?: RuleResponse | null;
  /**
   * Form control event listener
   */
  on?: (event: FormControlEvent, callback: any) => EventSubscription;
  /**
   * Trigger Event
   */
  trigger: (event: FormControlEvent, ...values: any[]) => void;

  /**
   * Unregister form control
   */
  unregister: () => void;

  /**
   * Determine the visible element
   */
  visibleElement?: () => HTMLElement;
  /**
   * Props list to this component
   */
  props?: any;
};

export type FormControlType = string | FormControl;

/**
 * Form control events that can be subscribed to by the form control
 */
export type FormControlEvent =
  | "change"
  | "reset"
  | "disabled"
  | "unregister"
  | "validation.start"
  | "validation.success"
  | "validation.error"
  | "validation.end";

export type FormContextProps = null | {
  /**
   * Form component
   */
  form: FormInterface;
  /**
   * Register new form input
   */
  register: (formInput: FormControl) => void;
  /**
   * Unregister form input from the form
   */
  unregister: (formInput: FormControl) => void;
};

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
   * Triggered before form serializing form inputs as object or string
   */
  | "serializing"
  /**
   * Triggered after form serialization form inputs as object or string
   */
  | "serialize";

export type ReactComponent =
  | React.FC<FormInputProps>
  | React.ComponentClass<FormInputProps, any>;

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
   * If formControlNames is passed, then it will be operated only on these names.
   */
  validate: (formControlNames?: FormControlType[]) => FormControl[];
  /**
   * Trigger form validation only for visible elements in the dom
   * If formControlNames is passed, then it will be operated only on these names.
   */
  validateVisible: (formControlNames?: FormControlType[]) => FormControl[];
  /**
   * Trigger form disable/enable state
   * If formControlNames is passed, then it will be operated only on these names.
   */
  disable: (isDisabled: boolean, formControlNames?: FormControlType[]) => void;
  /**
   * Determine whether the form is disabled
   */
  isDisabled: () => boolean;
  /**
   * Determine whether the form is enabled
   */
  isEnabled: () => boolean;
  /**
   * Determine whether the form is being submitted
   */
  isSubmitting: () => boolean;
  /**
   * Determine whether the form is valid, can be called after form validation
   */
  isValid: () => boolean;
  /**
   * Determine whether form controls'values has been changed, at least one
   */
  isDirty?: () => boolean;
  /**
   * Change form input value using its name
   */
  changeValue: (name: string, value: any) => void;
  /**
   * Manually submit form
   */
  submit: () => void;
  /**
   * Determine whether to keep storing input values even if it is unregistered
   */
  keepValues: (keepValues: boolean) => void;
  /**
   * Form events method
   */
  on: (
    event: FormEventType,
    callback: (form: FormInterface) => void
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
   * Trigger form resetting
   * If formControlNames is passed, then it will be operated only on these names.
   */
  reset: (formControlNames?: FormControlType[]) => void;
  /**
   * Check and trigger form validation state
   */
  checkIfIsValid: () => void;
  /**
   * Get all form values
   * If formControlNames is passed, then it will be operated only on these names.
   */
  values: (formControlNames?: FormControlType[]) => FormControlValues;

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
   * Return form values as an object
   * If formControlNames is passed, then it will be operated only on these names.
   */
  toObject: (formControlNames?: FormControlType[]) => FormControlValues;
  /**
   * Return form values as a query string
   * If formControlNames is passed, then it will be operated only on these names.
   */
  toString: (formControlNames?: FormControlType[]) => string;
  /**
   * Return form values as a query string
   * If formControlNames is passed, then it will be operated only on these names.
   */
  toQueryString: (formControlNames?: FormControlType[]) => string;
  /**
   * Return form values as json syntax
   * If formControlNames is passed, then it will be operated only on these names.
   */
  toJSON: (formControlNames?: FormControlType[]) => string;
  /**
   * Get input by input value
   *
   * @defaults getBy id
   */
  control: (value: string, getBy?: "name" | "id") => FormControl | null;
  /**
   * Get form controls list or only the given names
   */
  controls: (formControlNames?: FormControlType[]) => FormControl[];
  /**
   * Mark the given form control as invalid control
   */
  invalidControl: (formControl: FormControl) => void;
  /**
   * Mark the given form control as valid control
   */
  validControl: (formControl: FormControl) => void;
}

export type ErrorMessages = {
  [errorName: string]: string;
};

export type FormInputClasses = {
  /**
   * Error message class
   */
  errorMessage?: string;
  /**
   * Input class
   */
  input?: string;
  /**
   * Label class
   */
  label?: string;
  /**
   * Icon class
   */
  icon?: string;
  /**
   * root class
   */
  root?: string;
  /**
   * Other classes
   */
  [otherClass: string]: any;
};

/**
 * Label position
 */
export type LabelPosition = "top" | "inline";

export type ValidateOn = "change" | "blur";

export type UseFormInputOptions = {
  /**
   * List of props to be excluded from the otherProps object
   */
  excludeFromOtherProps?: string[];
};

export type FormInputProps = {
  /**
   * Input id attribute
   */
  id?: string;
  /**
   * Override errors list
   */
  errors?:
    | ((error: RuleResponse, formControl: FormControl) => string)
    | {
        [key: string]: string;
      };
  /**
   * Input ref
   */
  ref?: any;
  /**
   * Determine whether the input should be auto focused
   */
  autoFocus?: boolean;
  /**
   * Input name attribute, allows dot notation syntax
   * i.e user.name is valid, will be transformed into user[name]
   */
  name?: string;
  /**
   * Form control type
   *
   * @default 'input'
   */
  control?: string;
  /**
   * Override error messages
   */
  errorMessages?: ErrorMessages;
  /**
   * List of available classes
   */
  classes?: FormInputClasses;
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
  placeholder?: React.ReactNode;
  /**
   * Input label
   */
  label?: React.ReactNode;
  /**
   * Label position
   *
   * @default top
   */
  labelPosition?: LabelPosition;
  /**
   * Input icon attribute
   */
  icon?: React.ReactNode;
  /**
   * Icon position, works only with when icon prop is passed
   *
   * @default start
   */
  iconPosition?: "start" | "end";
  /**
   * Triggered when input validation has an error
   */
  onError?: (error: RuleResponse, formInput: FormControl) => any;
  /**
   * Validate the form control, this will override the rules prop and disable the validation
   * the validate prop will receive a form control object and return a null for non validation,
   * or a RuleResponse object for error.
   *
   * The `onError` prop will be triggered though if the validation fails.
   */
  validate?: (formControl: FormControl) => InputError;
  /**
   * Input validation rules list
   */
  rules?: Rule[];
  /**
   * A callback function triggered on input value changes
   */
  onChange?: (
    event: React.ChangeEvent<HTMLInputElement>,
    formInput: FormControl
  ) => void;
  /**
   * A callback function triggered on input blue
   */
  onBlur?: (
    event: React.ChangeEvent<HTMLInputElement>,
    formInput: FormControl
  ) => void;
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

export type InputError = RuleResponse | null;

export type FormInputHook = FormInputProps & {
  /**
   * Input error
   */
  error: RuleResponse;
  /**
   * Set input error
   */
  setError: (error: InputError) => void;
  /**
   * Input Ref
   */
  inputRef?: any;
  /**
   * Input reference
   */
  ref: any;
  /**
   * Set input value
   */
  setValue: (newValue: any) => void;
  /**
   * Triggered when input's value is changed
   */
  onChange: (e: any) => void;
  /**
   * Form input handler
   */
  formInput: FormControl;
  /**
   * Other props that will be passed to the component
   */
  otherProps: any;
  /**
   * Visible element ref
   */
  visibleElementRef: React.RefObject<HTMLElement>;

  /**
   * Manually validate the input
   */
  validate?: (value: any) => void;
};

export type FormConfigurations = {
  /**
   * Translatable types
   */
  translation?: {
    /**
     * If set to true, then all props in `translate` property will be translated
     *
     * @default true
     */
    enabled?: boolean;
    /**
     * List of translatable props
     */
    translate?: {
      /**
       * Translate placeholder of passed as a string
       */
      placeholder?: boolean;
      /**
       * Translate label of passed as a string
       */
      label?: boolean;
      /**
       * If set to true, then error messages coming from @mongez/validator will be translated.
       * Don't forget to import validation translation list otherwise this will have no effect.
       */
      errorMessage?: boolean;
    };
    /**
     * Translation function
     */
    translationFunction?: Function;
  };
  components?: {
    formComponent?: ReactComponent;
    formErrorComponent?: ReactComponent;
    formInputComponent?: ReactComponent;
    inputLabelComponent?: ReactComponent;
    inputLabelInlineComponent?: ReactComponent;
    inputLabelTopComponent?: ReactComponent;
    submitButtonComponent?: ReactComponent;
    resetButtonComponent?: ReactComponent;
    textInputComponent?: ReactComponent;
    urlInputComponent?: ReactComponent;
    searchInputComponent?: ReactComponent;
    numberInputComponent?: ReactComponent;
    hiddenInputComponent?: ReactComponent;
    emailInputComponent?: ReactComponent;
    selectInputComponent?: ReactComponent;
    checkboxInputComponent?: ReactComponent;
    radioInputComponent?: ReactComponent;
    switchInputComponent?: ReactComponent;
    autoCompleteInputComponent?: ReactComponent;
    colorInputComponent?: ReactComponent;
    textareaInputComponent?: ReactComponent;
    fileInputComponent?: ReactComponent;
    imageInputComponent?: ReactComponent;
    datepickerInputComponent?: ReactComponent;
    timepickerInputComponent?: ReactComponent;
    dateTimePickerInputComponent?: ReactComponent;
    markdownInputComponent?: ReactComponent;
    richTextInputComponent?: ReactComponent;
    chipInputComponent?: ReactComponent;
    dragAndDropInputComponent?: ReactComponent;
  };
  input?: {
    /**
     * Default label position
     */
    labelPosition?: LabelPosition;
    /**
     * Default rules list
     */
    rules?: {
      /**
       * List of form input rules that will be used as default rules with FormInput Component
       */
      list?: Rule[];
    };
    /**
     * Validate the input based on type of change
     *
     * @default change
     */
    validateOn?: ValidateOn;
    /**
     * Determine whether to enable translation in the following keys list
     */
    translate?: {
      /**
       * Determine whether to translate the given placeholder (If string)
       *
       * @default true
       */
      placeholder?: boolean;
      /**
       * Determine whether to translate the given label (If string)
       *
       * @default true
       */
      label?: boolean;
    };
  };
};
