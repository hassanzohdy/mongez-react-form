import events, { EventSubscription } from "@mongez/events";
import { get } from "@mongez/reinforcements";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  FormContextData,
  FormControl,
  FormControlChangeOptions,
  FormControlHook,
  FormControlOptions,
  FormControlProps,
  InputRuleOptions,
} from "../types";
import { useId } from "./form-hooks";
import { useForm } from "./useForm";

export const defaultFormControlOptions = {
  collectUnchecked: true,
  uncheckedValue: false,
  transformValue: (value, formControl) => {
    if (formControl?.multiple && !Array.isArray(value)) {
      return [value];
    }

    return value;
  },
};

const isElementOrAncestorHidden = (element: HTMLElement) => {
  if (!element) {
    return false;
  }

  if (element.hidden) {
    return true;
  }

  if (!element.parentElement) {
    return false;
  }

  return isElementOrAncestorHidden(element.parentElement);
};

const initializeValue = (
  props: FormControlProps,
  options: FormControlOptions,
  form: FormContextData,
) => {
  if (![undefined, null].includes(props.value)) {
    return options.transformValue?.(props.value);
  }

  if (![undefined, null].includes(props.defaultValue)) {
    return options.transformValue?.(props.defaultValue);
  }

  if (form && props.name) {
    const value = getFormDefaultValue(form, props.name);

    if (value !== undefined) return value;
  }

  return props.multiple ? [] : "";
};

function getFormDefaultValue(form: FormContextData, name: string) {
  if (!form || !name) return;

  const value = get(form.defaultValue, name);

  if (value !== undefined) return value;

  return;
}

export function useFormControl<T extends FormControlProps>(
  baseProps: T,
  incomingFormControlOptions: FormControlOptions = {},
) {
  const {
    id: incomingId,
    name: incomingName,
    onChange,
    rules = [],
    errors = {},
    type = "text",
    errorKeys = {},
    onError,
    disabled: incomingDisabled,
    validate: incomingValidate,
    value: incomingValue,
    defaultValue: _dv,
    checked: _checked,
    defaultChecked: _defaultChecked,
    ...props
  } = baseProps;

  const name = useMemo(
    () =>
      String(incomingName)
        .replace("][", ".")
        .replace("[", ".")
        .replace("]", ""),
    [incomingName],
  );

  const id = useId({
    id: incomingId,
    name,
  });

  const formControlOptions = {
    ...defaultFormControlOptions,
    ...incomingFormControlOptions,
  };

  const [disabled, setDisabled] = useState(Boolean(incomingDisabled));

  const inputRef = useRef<any>();
  const visibleElementRef = useRef<any>();
  const form = useForm();

  const [state, setState] = useState<{
    error: ReactNode;
    value: any;
    checked: boolean;
  }>(() => {
    return {
      error: null,
      value: initializeValue(baseProps, formControlOptions, form),
      checked:
        _defaultChecked !== undefined
          ? _defaultChecked
          : (getFormDefaultValue(form, name) ??
            (type === "checkbox" ? false : undefined)),
    };
  });

  const { value, checked, error } = state;

  const updateError = (error: ReactNode) => {
    setState(state => ({
      ...state,
      error,
    }));
  };

  const setError = (error: ReactNode) => {
    updateError(error);
    onError?.(error);
  };

  const setValue = (value = formControl.value) => {
    setState(state => ({
      ...state,
      value,
    }));
  };

  const validateFormControl = () => {
    const error = validate();

    setError(error);

    updateFormControlValidityState(error);

    return error;
  };

  const updateFormControlValidityState = (error: any) => {
    formControl.error = error;
    formControl.isValid = Boolean(!error);

    if (error) {
      form?.invalidControl(formControl);
    } else {
      form?.validControl(formControl);
    }

    form?.checkIfIsValid();
  };

  const validateAndSetValue = () => {
    const error = validate();

    if (error) {
      onError?.(error);

      setState(state => ({
        ...state,
        value: formControl.value,
        error,
      }));
    } else {
      setState(state => ({
        ...state,
        value: formControl.value,
        error: null,
      }));
    }

    updateFormControlValidityState(error);
  };

  const validateAndSetChecked = () => {
    const error = validate();

    if (error) {
      onError?.(error);

      setState(state => ({
        ...state,
        checked: formControl.checked,
        error,
      }));
    } else {
      setState(state => ({
        ...state,
        checked: formControl.checked,
        error: null,
      }));
    }

    updateFormControlValidityState(error);
  };

  const validate = () => {
    if (!errorKeys.name) {
      errorKeys.name = String(baseProps.label || baseProps.placeholder || name);
    }

    const validationData: InputRuleOptions = {
      ...baseProps,
      value: formControl.value,
      name,
      checked: formControl.checked,
      formControl,
      errorKeys,
      form,
    };

    let validationError: ReactNode | Promise<ReactNode> | null;

    const validatingRules = [...rules];

    formControl.errorsList = {};

    if (incomingValidate) {
      validatingRules.unshift(incomingValidate);
    }

    for (const rule of validatingRules) {
      if (rule.requiresType && rule.requiresType !== formControl.type) continue;

      const requiresValue =
        rule.requiresValue === undefined || rule.requiresValue;

      if (requiresValue && [undefined, null, ""].includes(formControl.value)) {
        continue;
      }

      validationError = rule.validate(validationData);

      if (validationError) {
        if (validationError instanceof Promise) {
          validationError.then((error: ReactNode) => {
            formControl.errorsList[rule.name || "custom"] = error;
            setError(error);
          });
        } else {
          const ruleName = rule.name || "custom";
          const errorMessage = errors[ruleName] || validationError;

          formControl.errorsList[ruleName] = errorMessage;

          if (!incomingFormControlOptions.validateAll) {
            return errorMessage;
          }
        }
      }
    }

    if (
      Object.keys(formControl.errorsList).length > 0 &&
      !incomingFormControlOptions.validateAll
    ) {
      return Object.keys(formControl.errorsList).map(
        key => formControl.errorsList[key],
      );
    }

    return;
  };

  const formControl: FormControl = useMemo(() => {
    const formControlData: FormControl = {
      initialValue: value,
      initialChecked: checked,
      collectUnchecked: formControlOptions.collectUnchecked,
      uncheckedValue: formControlOptions.uncheckedValue,
      value,
      isDirty: false,
      errorsList: {},
      isTouched: false,
      isControlled:
        baseProps.value !== undefined || baseProps.checked !== undefined,
      id,
      name,
      checked,
      defaultValue: _dv,
      disabled,
      isValid: null, // null means not validated yet
      disable(isDisabled) {
        isDisabled = Boolean(isDisabled);
        setDisabled(isDisabled);
        formControl.disabled = isDisabled;
      },
      type,
      inputRef,
      rendered: false,
      visibleElementRef,
      error,
      setError,
      props: baseProps,
      setChecked: (checked: boolean) => {
        formControl.checked = checked;
        formControl.isDirty = true;

        // if (formControl.isControlled) {
        //   onChange?.(checked);
        //   return;
        // }

        validateAndSetChecked();

        onChange?.(checked);

        events.trigger(`form.control.${id}.change`, formControl);
      },
      isVisible: () => {
        return isElementOrAncestorHidden(visibleElementRef.current) === false;
      },
      focus: () => {
        inputRef.current?.focus();
      },
      blur: () => {
        inputRef.current?.blur();
      },
      reset: () => {
        formControl.change(formControl.initialValue, {
          checked: formControl.initialChecked,
          updateState: true,
          validate: false,
        });

        formControl.setError(null);
        formControl.isValid = null;
        formControl.isDirty = false;
        formControl.isTouched = false;

        events.trigger(`form.control.${id}.reset`, formControl);
      },
      multiple: formControlOptions.multiple,
      validate: validateFormControl,
      change(
        value,
        {
          updateState = true,
          validate = true,
          ...other
        }: FormControlChangeOptions = {},
      ) {
        if (value !== undefined) {
          value = formControlOptions.transformValue?.(value, formControl);
          formControl.value = value;
        }

        formControl.isDirty = true;

        events.trigger(`form.control.${id}.change`, {
          value: formControl.value,
          checked: formControl.checked,
          ...other,
          formControl,
        });

        if (updateState) {
          if (validate) {
            validateAndSetValue();
          } else {
            setValue(value);
          }
        }
      },
      onChange: (callback: any) => {
        return events.subscribe(`form.control.${id}.change`, callback);
      },
      onDestroy: (callback: any) => {
        return events.subscribe(`form.control.${id}.destroy`, callback);
      },
      onReset: (callback: any) => {
        return events.subscribe(`form.control.${id}.reset`, callback);
      },
      unregister() {
        events.trigger(`form.control.${id}.destroy`, formControl);
      },
      isCollectable() {
        if (formControlOptions.isCollectable) {
          return formControlOptions.isCollectable(formControl);
        }

        if (formControl.disabled) return false;

        if (
          ["checkbox", "radio"].includes(formControl.type) &&
          !formControl.checked
        ) {
          return Boolean(formControlOptions.collectUnchecked);
        }

        return formControl.value !== undefined && formControl.value !== null;
      },
      collectValue() {
        if (formControlOptions.collectValue) {
          return formControlOptions.collectValue(formControl);
        }

        if (["checkbox", "radio"].includes(formControl.type)) {
          if (
            !formControl.checked &&
            formControlOptions.uncheckedValue !== undefined
          ) {
            return formControlOptions.uncheckedValue;
          } else if (formControl.checked) {
            return formControl.value || true;
          }

          return false;
        }

        if (formControl.multiple && !Array.isArray(value)) {
          return [value];
        }

        return formControl.value;
      },
    };

    return formControlData;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // now find all rules that have onInit method and call it
    const events: EventSubscription[] = [];
    for (const rule of rules) {
      if ((rule as any).onInit) {
        const output = (rule as any).onInit({
          formControl,
          form,
          ...props,
        });

        if (output) {
          events.push(output);
        }
      }
    }

    return () => {
      events.forEach(event => event?.unsubscribe());
    };
  }, [form, formControl, props, rules]);

  const changeValue = (value: any, options: any) => {
    formControl.change(value, {
      ...options,
      updateState: !formControl.isControlled,
    });

    onChange?.(value, {
      ...options,
      formControl,
    });
  };

  useEffect(() => {
    if (!formControl.isControlled || formControl.rendered === false) return;

    formControl.change(incomingValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingValue]);

  useEffect(() => {
    if (!formControl.isControlled || formControl.rendered === false) {
      return;
    }

    formControl.change(formControl.value, { checked: _checked });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_checked]);

  useEffect(() => {
    formControl.disable(Boolean(incomingDisabled));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingDisabled]);

  useEffect(() => {
    // Check if the form control is touched
    if (formControl.isTouched) return;

    const input: HTMLInputElement | undefined =
      formControl.inputRef?.current || document.getElementById(formControl.id);

    if (!input) return;

    const updateTouchState = () => (formControl.isTouched = true);

    input.addEventListener("focus", updateTouchState);

    return () => {
      input.removeEventListener("focus", updateTouchState);
    };
  }, [formControl]);

  useEffect(() => {
    setTimeout(() => {
      formControl.rendered = true;
    }, 0);

    let resetEvent: EventSubscription | undefined;
    if (form) {
      form.register(formControl);
      resetEvent = form.on("reset", formControl.reset);
    }

    return () => {
      if (form) {
        form.unregister(formControl);
      } else {
        formControl.unregister();
      }

      resetEvent?.unsubscribe();
    };
  }, [form, formControl, name]);

  const outputProps = useMemo(() => {
    let finalProps = { ...props };

    const except = (props: any, keys: string[]) => {
      const newProps = { ...props };
      for (const key of keys) {
        delete newProps[key];
      }
      return newProps;
    };

    for (const rule of rules) {
      if (rule.preservedProps) {
        finalProps = except(finalProps, rule.preservedProps);
      }
    }

    return finalProps;
  }, [rules, props]);

  const output: FormControlHook = {
    id,
    name,
    value,
    type,
    error,
    setError,
    inputRef,
    visibleElementRef,
    formControl,
    validate,
    changeValue,
    checked,
    disabled,
    errorsList: formControl.errorsList,
    disable: formControl.disable.bind(formControl, true),
    enable: formControl.disable.bind(formControl, false),
    setChecked: formControl.setChecked.bind(formControl),
    otherProps: outputProps,
    get isInvalid() {
      return formControl.isTouched && formControl.isValid === false;
    },
  };

  return output;
}
