import events, { EventSubscription } from "@mongez/events";
import { validate } from "@mongez/validator";
import React, { useEffect, useRef } from "react";
import {
  ControlType,
  FormControl,
  FormControlEvent,
  FormInputHook,
  FormInputProps,
  InputError,
  UseFormInputOptions,
} from "./../types";
import { translatable } from "./../utils";
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
import useForm from "./useForm";

const predefinedProps = [
  "id",
  "ref",
  "name",
  "icon",
  "type",
  "value",
  "rules",
  "label",
  "placeholder",
  "classes",
  "onError",
  "onChange",
  "required",
  "iconPosition",
  "defaultValue",
  "labelPosition",
  "errorMessages",
];

export function useOtherProps(
  props: FormInputProps,
  excludeAlso: string[]
): any {
  return React.useMemo(() => {
    const otherProps: any = {};

    const excludedProps = [...predefinedProps, ...excludeAlso];

    for (const key in props) {
      if (excludedProps.includes(key)) continue;

      otherProps[key] = props[key];
    }

    return otherProps;
  }, [props, excludeAlso]);
}

export default function useFormInput(
  baseProps: FormInputProps,
  formInputOptions: UseFormInputOptions = {}
): FormInputHook {
  const props: FormInputProps = baseProps;

  const id = useId(props);
  const name = useName(props);
  const label = useLabel(props);
  const rules = useInputRules(props);

  const initialStartRef = useRef<boolean>(false);

  const inputRef = React.useRef<any>();

  const visibleElementRef = React.useRef<any>();

  const otherProps = useOtherProps(
    baseProps,
    formInputOptions.excludeFromOtherProps || []
  );

  const placeholder = usePlaceholder(props);
  const [value, setValue] = useValue(props);
  const [error, setError] = useError();
  const labelPosition = useLabelPosition(props);

  const [isDisabled, disable] = React.useState<boolean>(
    Boolean(props.disabled)
  );

  const [isReadOnly, readOnly] = React.useState<boolean>(
    Boolean(props.readOnly)
  );

  React.useEffect(() => {
    disable(Boolean(props.disabled));
  }, [props.disabled]);

  React.useEffect(() => {
    readOnly(Boolean(props.readOnly));
  }, [props.readOnly]);

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
    formInput.value = value;
    formInput.trigger("change", formInput.value, formInput);

    formInput.trigger("validation.start", formInput);
    validateInput();
    formInput.trigger("validation.end", formInput.isValid, formInput);

    if (formInput.isValid) {
      formInput.trigger("validation.success", formInput);
    } else {
      formInput.trigger("validation.error", formInput);
    }
  };

  /**
   * Validate input value and return true if input value is valid, otherwise set error response and return false
   *
   * @returns {boolean}
   */
  const validateInput = (validatedInputValue = formInput.value): InputError => {
    let error: InputError = null;

    if (props.onValidate) {
      error = props.onValidate(formInput);
    } else {
      const validator = validate(validatedInputValue, props, rules);
      if (validator.fails()) {
        error = validator.getError();
      }
    }

    if (error === null) {
      setError(null);
      formInput.isValid = true;
      if (formProvider) {
        formProvider.form.validControl(formInput);
        formProvider.form.checkIfIsValid();
      }

      return null;
    }

    const errors = props.errors;

    if (errors) {
      if (typeof errors === "function") {
        error.errorMessage = errors(error, formInput);
      } else if (errors[error.errorType] !== undefined) {
        error.errorMessage = errors[error.errorType];
      } else {
        error.errorMessage = translatable(error.errorMessage, "errorMessage");
      }
    } else {
      error.errorMessage = translatable(error.errorMessage, "errorMessage");
    }

    formInput.error = error;
    formInput.isValid = false;

    if (props.onError) {
      const output: any = props.onError(error, formInput);
      if (output) {
        error.errorMessage = output;
      }
    }

    setError(error);

    if (formProvider) {
      formProvider.form.invalidControl(formInput);
      formProvider.form.checkIfIsValid();
    }

    return error;
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
      on(event: FormControlEvent, callback): EventSubscription {
        return events.subscribe(`form.control.${name}.${event}`, callback);
      },
      trigger(event: FormControlEvent, ...args): void {
        return events.trigger(`form.control.${name}.${event}`, ...args);
      },
      unregister() {
        events.unsubscribeNamespace(`form.control.${name}`);
      },
      setError: (error: InputError) => {
        setError(error);
        if (error) {
          props.onError && props.onError(error, formInput);
        }
      },
      error,
      isDisabled,
      isValid: error === null,
      isDirty: false,
      oldValue: undefined,
      focus: (focus: boolean = true) => {
        if (!inputRef.current) return;

        if (focus) {
          inputRef.current.focus();
        } else {
          inputRef.current.blur();
        }
      },
      reset: () => {
        setInputValue(
          props.defaultValue !== undefined ? props.defaultValue : ""
        );
        setError(null);
        formInput.trigger("reset", formInput);
      },
      validate: validateInput,
      visibleElement: () => visibleElementRef.current,
      disable(isDisabled: boolean) {
        this.isDisabled = isDisabled;

        disable(isDisabled);
        formInput.trigger("disabled", isDisabled, formInput);
      },
      changeValue(newValue) {
        setInputValue(newValue);
      },
    };

    return formInput;
  }, []);

  useEffect(() => {
    formInput.id = id;
    formInput.name = name;
    formInput.value = value;
    formInput.isReadOnly = isReadOnly;
    formInput.isDisabled = isDisabled;
    formInput.error = error;
    formInput.isValid = error === null;
    formInput.props = props;
  }, [value, id, name, isDisabled, isReadOnly, error, props]);

  if (props.ref) {
    props.ref.current = formInput;
  }

  React.useEffect(() => {
    if (props.value === undefined) return;

    // this will prevent trigger onChange event when component is mounted for the first time
    if (initialStartRef.current === false) {
      initialStartRef.current = true;
      return;
    }

    setInputValue(props.value);
  }, [props.value]);

  React.useEffect(() => {
    if (!formProvider) return;

    formProvider.register(formInput);

    return () => {
      formInput.unregister();

      formProvider.unregister(formInput);
    };
  }, [formProvider]);

  return {
    id,
    name,
    label,
    labelPosition,
    rules,
    error,
    setError,
    formInput,
    inputRef,
    disabled: isDisabled,
    placeholder,
    ref: props.ref,
    classes: props.classes || {},
    value,
    setValue,
    type: props.type,
    required: props.required,
    visibleElementRef,
    onChange,
    onBlur,
    otherProps,
    validate: validateInput,
  } as FormInputHook;
}
