import React from "react";
import { EventSubscription } from "@mongez/events";
import { Rule, RuleResponse } from "@mongez/validator";

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
  onError?: (invalidInputs: RegisteredFormInput[]) => void;
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

export type RegisteredFormInput = {
  /**
   * Form input name, it must be unique
   */
  name: string;
  /**
   * Form input id, used as a form input flag determiner
   */
  id: string;
  /**
   * Form input value
   */
  value: any;
  /**
   * Triggered when form is changing disabling / enabling mode
   */
  disable: (isDisabling: boolean) => void;
  /**
   * Triggered when form is changing read only mode
   */
  readOnly: (isReadingOnly: boolean) => void;
  /**
   * Triggered when form is changing a value to the form input
   */
  changeValue: (newValue: any) => void;
  /**
   * Triggered when form input value is changed
   */
  onChange?: (newValue: any) => void;
  /**
   * Triggered when form starts validation
   */
  validate: (newValue?: string) => RuleResponse | null;
  /**
   * Set form input error
   */
  setError: (error: RuleResponse) => void;
  /**
   * Determine whether the form input is valid, this is checked after calling the validate method
   */
  isValid: boolean;
  /**
   * Determine whether form input is disabled
   */
  isDisabled: boolean;
  /**
   * Determine whether form input is in read only state
   */
  isReadOnly: boolean;
  /**
   * Triggered when form resets its values
   */
  reset: () => void;
  /**
   * Form Input Error
   */
  error: RuleResponse | null;
};

export type FormContextProps = null | {
  /**
   * Form component
   */
  form: FormInterface;
  /**
   * Register new form input
   */
  register: (formInput: RegisteredFormInput) => void;
  /**
   * Unregister form input from the form
   */
  unregister: (formInput: RegisteredFormInput) => void;
};

/**
 * Returns when calling form.values() or form.toObject() to list all form inputs with its values
 */
export type FormInputsValues = {
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
  | "submission"
  /**
   * Triggered before disabling/enabling form
   */
  | "disabling"
  /**
   * Triggered after disabling/enabling form
   */
  | "disable"
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
  formElement: React.ReactNode;
  /**
   * Trigger form submission
   */
  submitting: (submitting: boolean) => void;
  /**
   * Trigger form validation
   */
  validate: () => void;
  /**
   * Validate only the given input names
   */
  validateOnly: (inputNames: string[]) => RegisteredFormInput[];
  /**
   * Trigger form disable/enable state
   */
  disable: (isDisabled: boolean) => void;
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
  register: (formInput: RegisteredFormInput) => void;
  /**
   * Unregister form input from the form
   */
  unregister: (formInput: RegisteredFormInput) => void;
  /**
   * Trigger form resetting
   */
  reset: () => void;
  /**
   * Get all form values
   */
  values: () => FormInputsValues;
  /**
   * Return form values as an object
   */
  toObject: () => FormInputsValues;
  /**
   * Return form values as a query string
   */
  toString: () => string;
  /**
   * Return form values as a query string
   */
  toQueryString: () => string;
  /**
   * Return form values as json syntax
   */
  toJSON: () => string;
  /**
   * Get input by input value
   *
   * @defaults getBy id
   */
  getInput: (
    value: string,
    getBy?: "name" | "id"
  ) => RegisteredFormInput | null;
  /**
   * Get all form inputs list
   */
  inputsList: () => RegisteredFormInput[];
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

export type FormInputProps = {
  /**
   * Input id attribute
   */
  id?: string;
  /**
   * Input ref
   */
  ref?: any;
  /**
   * Input name attribute, allows dot notation syntax
   * i.e user.name is valid, will be transformed into user[name]
   */
  name?: string;
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
  onError?: (error: RuleResponse, formInput: RegisteredFormInput) => void;
  /**
   * Input validation rules list
   */
  rules?: Rule[];
  /**
   * A callback function triggered on input value changes
   */
  onChange?: (
    event: React.ChangeEvent<HTMLInputElement>,
    formInput: RegisteredFormInput
  ) => void;
  /**
   * A callback function triggered on input blue
   */
  onBlur?: (
    event: React.ChangeEvent<HTMLInputElement>,
    formInput: RegisteredFormInput
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
  setError: (error: RuleResponse) => void;
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
   * Other props that will be passed to the component
   */
  otherProps: any;
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
