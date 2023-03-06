import events, { EventSubscription } from "@mongez/events";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FormControl,
  FormControlChangeOptions,
  FormControlHook,
  FormControlOptions,
  FormControlProps,
  InputRuleOptions,
} from "../types";
import { useChecked, useId, useValue } from "./form-hooks";
import { useForm } from "./useForm";

export function useFormControl<T extends FormControlProps>(
  baseProps: T,
  formControlOptions: FormControlOptions = {
    uncheckedValue: "OK",
    collectUnchecked: true,
    transformValue: (value) => {
      return String(value);
    },
  }
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
    defaultValue,
    checked: _checked,
    defaultChecked: _defaultChecked,
    ...props
  } = baseProps;

  const id = useId(incomingId);
  const [name] = useState(() =>
    String(incomingName).replace("][", ".").replace("[", ".").replace("]", "")
  );

  const [checked, setChecked] = useChecked(props);

  const [value, setValue] = useValue(baseProps, formControlOptions);
  const [disabled, setDisabled] = useState(Boolean(incomingDisabled));

  const [error, updateError] = useState<React.ReactNode>(null);
  const inputRef = useRef<any>();
  const visibleElementRef = useRef<any>();
  const form = useForm();

  const setError = (error: React.ReactNode) => {
    updateError(error);
    formControl.isValid = !error;
    formControl.error = error;
    if (error) {
      form?.invalidControl(formControl);
    } else {
      form?.validControl(formControl);
    }

    // check for all other controls if they are valid
    // this is useful when we have a form with multiple controls and a submit button to determine whether to disable it or not
    form?.checkIfIsValid();

    onError?.(error);
  };

  const validate = async () => {
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

    let validationError: React.ReactNode;
    if (incomingValidate) {
      rules.unshift(incomingValidate);
    }

    for (const rule of rules) {
      validationError = await rule(validationData);

      if (validationError) {
        const errorMessage = errors[(rule as any).rule] || validationError;
        setError(errorMessage);
        return false;
      }
    }

    setError(null);

    return true;
  };

  const formControl: FormControl = useMemo(() => {
    const formControlData: FormControl = {
      initialValue: value,
      initialChecked: checked,
      value,
      multiple: Boolean(baseProps.multiple),
      isControlled:
        baseProps.value !== undefined || baseProps.checked !== undefined,
      id,
      name,
      checked,
      disabled,
      isValid: true,
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
        setChecked(checked);
        formControl.checked = checked;

        if (checked && formControl.error) {
          formControl.setError(null);
        }

        onChange?.(checked, {
          formControl,
          value: formControl.value,
        });
      },
      isVisible: () => {
        return visibleElementRef.current?.isHidden === false;
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
      },
      validate,
      change(
        value,
        {
          checked,
          updateState = true,
          validate = true,
          ...other
        }: FormControlChangeOptions = {}
      ) {
        value = formControlOptions.transformValue?.(value);
        if (value !== undefined) {
          formControl.value = value;
        }

        if (baseProps.type === "checkbox") {
          formControl.checked = Boolean(checked);
        }

        if (updateState) {
          setValue(value);

          if (baseProps.type === "checkbox") {
            setChecked(Boolean(checked));
          }
        }

        events.trigger(`form.control.${id}.change`, {
          value: formControl.value,
          checked: formControl.checked,
          ...other,
          formControl,
        });

        validate && this.validate();
      },
      onChange: (callback: any) => {
        return events.subscribe(`form.control.${id}.change`, callback);
      },
      onDestroy: (callback: any) => {
        return events.subscribe(`form.control.${id}.destroy`, callback);
      },
      unregister() {
        events.trigger(`form.control.${id}.destroy`, formControl);
      },
      isCollectable() {
        if (formControlOptions.isCollectable) {
          return formControlOptions.isCollectable(formControl);
        }

        if (formControl.disabled) return false;

        if (formControl.type === "checkbox" && formControl.checked === false) {
          return Boolean(formControlOptions.collectUnchecked);
        }

        return formControl.value !== undefined && formControl.value !== null;
      },
      collectValue() {
        if (formControlOptions.collectValue) {
          return formControlOptions.collectValue(formControl);
        }
        if (formControl.type === "checkbox") {
          if (
            !formControl.checked &&
            formControlOptions.uncheckedValue !== undefined
          ) {
            return formControlOptions.uncheckedValue;
          } else if (formControl.checked) {
            return formControl.value !== undefined ? formControl.value : true;
          }

          return false;
        }

        return formControl.value;
      },
    };

    return formControlData;
  }, []);

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
  }, [incomingValue]);

  useEffect(() => {
    if (!formControl.isControlled || formControl.rendered === false) return;

    formControl.change({ checked: baseProps.checked });
  }, [_checked]);

  useEffect(() => {
    formControl.disable(Boolean(incomingDisabled));
  }, [incomingDisabled]);

  useEffect(() => {
    setTimeout(() => {
      formControl.rendered = true;
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
    }, 0);
  }, [name]);

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
      if ((rule as any).preservedProps) {
        finalProps = except(finalProps, (rule as any).preservedProps);
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
    disable: formControl.disable.bind(formControl, true),
    enable: formControl.disable.bind(formControl, false),
    setChecked: formControl.setChecked.bind(formControl),
    otherProps: outputProps,
  };

  return output;
}
