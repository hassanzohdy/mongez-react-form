import React from "react";
import useForm from "./useForm";
import { translatable } from "../utils";
import { RuleResponse, validate } from "@mongez/validator";
import {
  FormControl,
  FormInputProps,
  InputError,
  ControlType,
  FormInputHook,
} from "./../types";
import {
  useError,
  useId,
  useInputRules,
  useLabel,
  useLabelPosition,
  useName,
  usePlaceholder,
  useValue,
} from "./form-hooks";

const predefinedProps = [
  "id",
  "ref",
  "name",
  "icon",
  "value",
  "rules",
  "label",
  "classes",
  "onError",
  "onChange",
  "required",
  "iconPosition",
  "defaultValue",
  "labelPosition",
  "errorMessages",
];

export function useOtherProps(props: FormInputProps): any {
  return React.useMemo(() => {
    const otherProps: any = {};

    for (const key in props) {
      if (predefinedProps.includes(key)) continue;
      otherProps[key] = props[key];
    }

    return otherProps;
  }, [props]);
}

export default function useFormInput(
  baseProps: FormInputProps,
  defaultProps: FormInputProps = {}
): FormInputHook {
  const props: FormInputProps = { ...defaultProps, ...baseProps };

  const id = useId(props);
  const name = useName(props);
  const label = useLabel(props);
  const rules = useInputRules(props);

  const otherProps = useOtherProps(baseProps);
  const placeholder = usePlaceholder(props);
  const [value, setValue] = useValue(props);
  const [error, setError] = useError();
  const labelPosition = useLabelPosition(props);

  const [isDisabled, disable] = React.useState<boolean>(
    props.disabled || false
  );

  const [isReadOnly, readOnly] = React.useState<boolean>(
    props.readOnly || false
  );

  const formProvider = useForm();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value: string = e.target.value;

    if (props.value === undefined) {
      if (props.validateOn !== "blur") {
        setInputValue(value);
      } else {
        setValue(value);
      }
    }

    props.onChange && props.onChange(e, formInput);
  };

  const onBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value: string = e.target.value;

    if (props.value === undefined) {
      if (props.validateOn === "blur") {
        setInputValue(value);
      } else {
        setValue(value);
      }
    }

    props.onBlur && props.onBlur(e, formInput);
  };

  /**
   * Set input value and validate it
   */
  const setInputValue = (value: any) => {
    setValue(value);
    validateInput(value);
  };

  /**
   * Validate input value and return true if input value is valid, otherwise set error response and return false
   *
   * @returns {boolean}
   */
  const validateInput = (inputValue?: string): RuleResponse | null => {
    let validatedInputValue = inputValue !== undefined ? inputValue : value;

    const validator = validate(validatedInputValue, props, rules);

    if (validator.passes()) {
      setError(null);
      formInput.isValid = true;
      if (formProvider) {
        formProvider.form.validControl(formInput);
      }
      return null;
    } else {
      const error = validator.getError();
      error.errorMessage = translatable(error.errorMessage, "errorMessage");
      formInput.error = error;
      formInput.isValid = false;
      setError(error);
      props.onError && props.onError(error, formInput);
      if (formProvider) {
        formProvider.form.invalidControl(formInput);
      }
      return error;
    }
  };

  const formInput = React.useMemo(() => {
    const formInput: FormControl = {
      value,
      id,
      name,
      control: "input",
      type: props.type as ControlType,
      isReadOnly,
      props: props,
      readOnly,
      setError: (error: InputError) => {
        setError(error);
        if (error) {
          props.onError && props.onError(error, formInput);
        }
      },
      error,
      isDisabled,
      isValid: error === null,
      reset: () => {
        setInputValue("");
        setError(null);
      },
      validate: validateInput,
      disable,
      changeValue(newValue) {
        setInputValue(newValue);
      },
    };

    return formInput;
  }, [value, id, name, error, isDisabled, isReadOnly]);

  if (props.ref) {
    props.ref.current = formInput;
  }

  React.useEffect(() => {
    if (props.value === undefined) return;
    setValue(props.value);
  }, [props.value]);

  React.useEffect(() => {
    if (!formProvider) return;

    formProvider.register(formInput);

    return () => formProvider.unregister(formInput);
  }, [value, id, name, isReadOnly, isDisabled, error]);

  return {
    id,
    name,
    label,
    labelPosition,
    rules,
    error,
    setError,
    formInput,
    disabled: isDisabled,
    placeholder,
    ref: props.ref,
    classes: props.classes || {},
    value,
    setValue,
    required: props.required,
    onChange,
    onBlur,
    otherProps,
  } as FormInputHook;
}
