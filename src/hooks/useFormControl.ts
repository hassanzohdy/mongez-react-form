"use client";

import events, { EventSubscription } from "@mongez/events";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { getFormConfig } from "../configurations";
import { standardSchemaToRule } from "../standard-schema/adapter";
import {
  FormContextData,
  FormControl,
  FormControlChangeOptions,
  FormControlHook,
  FormControlOptions,
  FormControlProps,
  InputRule,
  InputRuleOptions,
  ValidateOn,
} from "../types";
import { useControlId } from "./form-hooks";
import { useForm } from "./useForm";

export const defaultFormControlOptions = {
  collectUnchecked: true,
  uncheckedValue: false,
  transformValue: (value: any, formControl?: FormControl) => {
    if (formControl?.multiple && !Array.isArray(value)) {
      return [value];
    }

    return value;
  },
};

/**
 * Sentinel returned by the per-rule applier when a rule passed (or was a
 * non-short-circuiting failure under `validateAll`) so the pipeline keeps going.
 */
const VALIDATION_CONTINUE = Symbol("validation.continue");

const isDomAvailable = () =>
  typeof document !== "undefined" && typeof window !== "undefined";

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
  name: string
) => {
  if (![undefined, null].includes(props.value)) {
    return options.transformValue?.(props.value);
  }

  if (![undefined, null].includes(props.defaultValue)) {
    return options.transformValue?.(props.defaultValue);
  }

  if (form && name) {
    const value = form.getInitialValue(name);

    if (value !== undefined) return value;
  }

  return props.multiple ? [] : "";
};

export function useFormControl<T extends FormControlProps>(
  baseProps: T,
  incomingFormControlOptions: FormControlOptions = {}
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
    schema: incomingSchema,
    validateOn: incomingValidateOn,
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
    [incomingName]
  );

  const form = useForm();

  const id = useControlId({
    id: incomingId,
    // A nameless control has no field name; `useControlId` then uses its React id.
    name: incomingName === undefined || incomingName === null ? "" : name,
    formId: form?.id,
  });

  const errorId = `${id}-error`;

  const formControlOptions = {
    ...defaultFormControlOptions,
    ...incomingFormControlOptions,
  };

  const [disabled, setDisabled] = useState(Boolean(incomingDisabled));

  const inputRef = useRef<any>();
  const visibleElementRef = useRef<any>();

  // Monotonic token guarding against stale async validation results: each
  // validation run captures the current value; if a newer run starts before an
  // async rule resolves, the stale result is discarded.
  const validationSeq = useRef(0);

  // Count of async validation runs still in flight. `isValidating` clears only
  // when this returns to 0, so a sync run that supersedes an async run cannot
  // leave the flag stuck `true`.
  const asyncInFlight = useRef(0);

  const [state, setState] = useState<{
    error: ReactNode;
    value: any;
    checked: boolean;
    isValidating: boolean;
  }>(() => {
    return {
      error: null,
      isValidating: false,
      value: initializeValue(baseProps, formControlOptions, form, name),
      checked:
        _checked ??
        (_defaultChecked !== undefined
          ? _defaultChecked
          : (form && name ? form.getInitialValue(name) : undefined) ??
            (type === "checkbox" ? false : undefined)),
    };
  });

  const { value, checked, error, isValidating } = state;

  const updateError = (error: ReactNode) => {
    setState((state) => ({
      ...state,
      error,
    }));
  };

  const setError = (error: ReactNode) => {
    updateError(error);
    onError?.(error);
  };

  const setValidating = (isValidating: boolean) => {
    setState((state) => ({
      ...state,
      isValidating,
    }));
  };

  const setValue = (value = formControl.value) => {
    setState((state) => ({
      ...state,
      value,
    }));
  };

  const setCheckedState = (checked: boolean) => {
    setState((state) => ({
      ...state,
      checked,
    }));
  };

  const updateFormControlValidityState = (error: any) => {
    formControl.error = error;
    formControl.isValid = !error;

    if (error) {
      form?.invalidControl(formControl);
    } else {
      form?.validControl(formControl);
    }

    form?.checkIfIsValid();
  };

  /**
   * Resolve the active validation trigger: per-control > form-level > global
   * config > `"change"`.
   */
  const resolveValidateOn = (): ValidateOn =>
    (incomingValidateOn as ValidateOn) ||
    form?.validateOn ||
    (getFormConfig("validateOn", "change") as ValidateOn);

  /**
   * Whether a value change should trigger validation now. For `"blur"` /
   * `"submit"` modes we still revalidate on change once the field has already
   * errored or the form has been submitted — so cleared errors update live.
   */
  const shouldValidateOnChange = (): boolean => {
    const mode = resolveValidateOn();

    if (mode === "change") return true;

    return formControl.isValid === false || form?.wasSubmitted === true;
  };

  /**
   * Build the ordered rule list: per-instance `validate` first, then the
   * passed `rules`, then a per-field `schema` (if any) last.
   */
  const buildRules = (): InputRule[] => {
    const list: InputRule[] = [];

    if (incomingValidate) {
      list.push({
        validate: incomingValidate,
        name: "custom",
        requiresValue: true,
      });
    }

    list.push(...rules);

    const schema = incomingSchema || incomingFormControlOptions.schema;

    if (schema) {
      list.push(standardSchemaToRule(schema, "schema"));
    }

    return list;
  };

  /**
   * Run the rule pipeline. Returns `{ error, errorsList }` synchronously when
   * every rule resolves synchronously (preserving the engine's original
   * timing), and a `Promise` of the same shape only when a rule returns one —
   * so async validation genuinely gates submission without making the common
   * sync path async.
   *
   * Each run owns a fresh `errorsList` (assigned onto `formControl.errorsList`
   * up front so rules like `strongRule` that write per-criterion keys land in
   * it). The committer reassigns `formControl.errorsList` only for the latest
   * run, so a discarded stale async run cannot poison a fresh result.
   */
  const runValidationRules = ():
    | { error: ReactNode; errorsList: Record<string, ReactNode> }
    | Promise<{ error: ReactNode; errorsList: Record<string, ReactNode> }> => {
    if (!errorKeys.name) {
      errorKeys.name = String(baseProps.label || baseProps.placeholder || name);
    }

    const runErrors: Record<string, ReactNode> = {};

    // Expose this run's error map to the rules (strongRule et al. write here).
    formControl.errorsList = runErrors;

    const validationData: InputRuleOptions = {
      ...baseProps,
      value: formControl.value,
      name,
      checked: formControl.checked,
      formControl,
      errorKeys,
      form,
    };

    const rulesList = buildRules();

    const applyResult = (
      rule: InputRule,
      result: ReactNode
    ): ReactNode | typeof VALIDATION_CONTINUE => {
      if (result) {
        const ruleName = rule.name || "custom";
        const errorMessage = errors[ruleName] || result;

        runErrors[ruleName] = errorMessage;

        if (!incomingFormControlOptions.validateAll) {
          return errorMessage;
        }
      }

      return VALIDATION_CONTINUE;
    };

    const finalize = (): ReactNode => {
      if (
        Object.keys(runErrors).length > 0 &&
        !incomingFormControlOptions.validateAll
      ) {
        return Object.keys(runErrors).map((key) => runErrors[key]);
      }

      return null;
    };

    const process = (
      index: number
    ):
      | { error: ReactNode; errorsList: Record<string, ReactNode> }
      | Promise<{ error: ReactNode; errorsList: Record<string, ReactNode> }> => {
      for (let i = index; i < rulesList.length; i++) {
        const rule = rulesList[i];

        if (rule.requiresType && rule.requiresType !== formControl.type)
          continue;

        const requiresValue =
          rule.requiresValue === undefined || rule.requiresValue;

        if (
          requiresValue &&
          [undefined, null, ""].includes(formControl.value)
        ) {
          continue;
        }

        const result = rule.validate(validationData) as
          | ReactNode
          | Promise<ReactNode>;

        if (result instanceof Promise) {
          return result.then((resolved) => {
            const applied = applyResult(rule, resolved as ReactNode);

            if (applied !== VALIDATION_CONTINUE) {
              return { error: applied, errorsList: runErrors };
            }

            return process(i + 1);
          });
        }

        const applied = applyResult(rule, result as ReactNode);

        if (applied !== VALIDATION_CONTINUE) {
          return { error: applied, errorsList: runErrors };
        }
      }

      return { error: finalize(), errorsList: runErrors };
    };

    return process(0);
  };

  /**
   * Validate the control and commit the result (error + validity). Sync rules
   * commit synchronously; async rules flip `isValidating` and commit on resolve.
   *
   * Stale-result handling uses two independent guards:
   * - a sequence token (`validationSeq`) so only the latest run commits its
   *   error / validity / errorsList;
   * - an in-flight counter (`asyncInFlight`) so `isValidating` clears exactly
   *   when the last outstanding async run settles — even if a later *sync* run
   *   superseded it (which previously left the flag stuck `true`).
   */
  const validateFormControl = (): ReactNode | Promise<ReactNode> => {
    const seq = ++validationSeq.current;

    const outcome = runValidationRules();

    if (outcome instanceof Promise) {
      asyncInFlight.current++;
      formControl.isValidating = true;
      setValidating(true);

      return outcome.then((result) => {
        const isLatest = seq === validationSeq.current;
        const settledAll = --asyncInFlight.current === 0;

        if (settledAll) {
          formControl.isValidating = false;
          setValidating(false);
        }

        if (!isLatest) {
          // Superseded run: discard its error/validity/errorsList entirely.
          return result.error;
        }

        formControl.errorsList = result.errorsList;
        setError(result.error);
        updateFormControlValidityState(result.error);

        return result.error;
      });
    }

    // Sync completion. If an async run was superseded by this one, it stays
    // in-flight and will clear `isValidating` when it settles; only clear here
    // when nothing async is pending.
    if (asyncInFlight.current === 0 && formControl.isValidating) {
      formControl.isValidating = false;
      setValidating(false);
    }

    formControl.errorsList = outcome.errorsList;
    setError(outcome.error);
    updateFormControlValidityState(outcome.error);

    return outcome.error;
  };

  // Reset baseline — what `form.reset()` restores this control to. It prefers
  // an explicit `defaultValue` (control- then form-level) over the reactive
  // hydration snapshot, so live-loaded `values` never become the reset target.
  // Falls back to the initial display value when no default exists.
  const resetBaseline = (() => {
    if (![undefined, null].includes(baseProps.value)) {
      return formControlOptions.transformValue?.(baseProps.value);
    }

    if (![undefined, null].includes(baseProps.defaultValue)) {
      return formControlOptions.transformValue?.(baseProps.defaultValue);
    }

    if (form && name) {
      const baseline = form.getResetBaseline(name);
      if (baseline !== undefined) return baseline;
    }

    return value;
  })();

  const formControl: FormControl = useMemo(() => {
    const formControlData: FormControl = {
      initialValue: resetBaseline,
      initialChecked: checked,
      collectUnchecked: formControlOptions.collectUnchecked,
      uncheckedValue: formControlOptions.uncheckedValue,
      value,
      isDirty: false,
      isValidating: false,
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

        setCheckedState(checked);

        if (shouldValidateOnChange()) {
          validateFormControl();
        }

        onChange?.(checked, {
          formControl,
        });

        // Emit the same wrapper shape as change() so `formControl.onChange`
        // subscribers always receive `{ value, checked, formControl }`.
        events.trigger(`form.control.${id}.change`, {
          value: formControl.value,
          checked: formControl.checked,
          formControl,
        });
      },
      isVisible: () => {
        // On non-DOM platforms (e.g. React Native) we cannot inspect the
        // rendered tree for visibility, so treat every control as visible.
        if (!isDomAvailable()) return true;
        return isElementOrAncestorHidden(visibleElementRef.current) === false;
      },
      focus: () => {
        inputRef.current?.focus();
      },
      blur: () => {
        inputRef.current?.blur();
      },
      clear: () => {
        formControl.cancelValidation();

        formControl.change(formControl.multiple ? [] : "", {
          updateState: true,
          validate: false,
          checked: false,
        });

        formControl.setError(null);
        formControl.isValid = null;
        formControl.isDirty = false;
        formControl.isTouched = false;

        events.trigger(`form.control.${id}.clear`, formControl);
      },
      cancelValidation: () => {
        // Invalidate any in-flight async run (so it won't commit) and clear the
        // validating flag. The pending run still settles and decrements the
        // in-flight counter; it just won't apply its result.
        validationSeq.current++;

        if (formControl.isValidating) {
          formControl.isValidating = false;
          setValidating(false);
        }
      },
      reset: () => {
        formControl.cancelValidation();

        // Clear the dirty flag BEFORE firing change() so the form-level
        // listener registered in FormEngine.register sees `isDirty === false`
        // and removes this control from `dirtyControls`. We pass
        // `dirty: false` so change() does not clobber the flag back to true.
        formControl.isDirty = false;

        formControl.change(formControl.initialValue, {
          checked: formControl.initialChecked,
          updateState: true,
          validate: false,
          dirty: false,
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
          dirty = true,
          ...other
        }: FormControlChangeOptions = {}
      ) {
        if (value !== undefined) {
          value = formControlOptions.transformValue?.(value, formControl);
          formControl.value = value;
        }

        if (typeof other.checked !== "undefined") {
          formControl.checked = other.checked;
        }

        formControl.isDirty = dirty;

        events.trigger(`form.control.${id}.change`, {
          value: formControl.value,
          checked: formControl.checked,
          ...other,
          formControl,
        });

        if (updateState) {
          // Value updates synchronously so the rendered input and
          // `form.value(name)` reflect the change immediately. Validation is
          // separate and may resolve asynchronously.
          if (other.checked !== undefined) {
            setCheckedState(formControl.checked);
          }

          setValue(formControl.value);

          if (validate && shouldValidateOnChange()) {
            validateFormControl();
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
      onClear: (callback: any) => {
        return events.subscribe(`form.control.${id}.clear`, callback);
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

        if (formControl.multiple && !Array.isArray(formControl.value)) {
          return [formControl.value];
        }

        return formControl.value;
      },
    };

    return formControlData;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hold a stable reference to the latest rest props so the `onInit` effect
  // below does not need `props` (a fresh object every render) as a dep.
  const latestPropsRef = useRef(props);
  latestPropsRef.current = props;

  // Build a stable identity for `rules` so consumers passing a fresh
  // array literal each render do not retrigger the `onInit` subscription
  // loop below. Two arrays with the same rule names (in the same order)
  // are treated as equal.
  const rulesKey = useMemo(
    () =>
      rules.map((rule, index) => rule.name ?? `__anonymous_${index}`).join("|"),
    [rules]
  );

  useEffect(() => {
    // now find all rules that have onInit method and call it
    const subscriptions: EventSubscription[] = [];
    for (const rule of rules) {
      if ((rule as any).onInit) {
        const output = (rule as any).onInit({
          formControl,
          form,
          ...latestPropsRef.current,
        });

        if (output) {
          subscriptions.push(output);
        }
      }
    }

    return () => {
      subscriptions.forEach((subscription) => subscription?.unsubscribe());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, formControl, rulesKey]);

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

  /**
   * Blur handler — marks the control touched and triggers validation when the
   * resolved mode is `"blur"`.
   */
  const handleBlur = () => {
    formControl.isTouched = true;

    if (resolveValidateOn() === "blur") {
      validateFormControl();
    }
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

    formControl.checked = _checked;
    formControl.isDirty = true;

    setCheckedState(_checked as boolean);

    if (shouldValidateOnChange()) {
      validateFormControl();
    }

    // Consistent wrapper payload (see setChecked / change).
    events.trigger(`form.control.${id}.change`, {
      value: formControl.value,
      checked: formControl.checked,
      formControl,
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_checked]);

  useEffect(() => {
    formControl.disable(Boolean(incomingDisabled));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingDisabled]);

  useEffect(() => {
    // Check if the form control is touched.
    // This hook auto-binds a `focus` listener on the DOM input to mark the
    // control as touched. On React Native there is no DOM, so we skip it —
    // native inputs should set `formControl.isTouched = true` from their
    // own `onFocus` handler if touched-state tracking is needed.
    if (formControl.isTouched) return;
    if (!isDomAvailable()) return;

    const input: HTMLInputElement | undefined =
      formControl.inputRef?.current || document.getElementById(formControl.id);

    if (!input || typeof (input as any).addEventListener !== "function") return;

    const updateTouchState = () => (formControl.isTouched = true);

    input.addEventListener("focus", updateTouchState);

    return () => {
      input.removeEventListener("focus", updateTouchState);
    };
  }, [formControl]);

  useEffect(() => {
    // Keep the frozen formControl identity's name in sync with the latest
    // (memoized) name. This is what makes `useFieldArray` reorders/removals
    // carry each row's value: when a row's index shifts, its input name
    // changes, this effect re-runs, and the control is re-registered under the
    // new name while keeping its (persisted) value.
    formControl.name = name;

    // Mark as committed synchronously (post-commit) so the controlled-prop sync
    // effects above — which run before this on mount and bail while
    // `rendered === false` — proceed on subsequent updates.
    formControl.rendered = true;

    let resetEvent: EventSubscription | undefined;
    if (form) {
      form.register(formControl);
      resetEvent = form.on("reset", formControl.reset);
    }

    return () => {
      // Abandon any in-flight async validation so its `.then` doesn't retain
      // this (now unmounted) control's closure and won't setState after unmount.
      formControl.cancelValidation();

      if (form) {
        form.unregister(formControl);
      } else {
        formControl.unregister();
      }

      resetEvent?.unsubscribe();
    };
  }, [form, formControl, name]);

  // Stable signature of the rest props so `outputProps` keeps a stable identity
  // across renders when the props are shallowly unchanged (the raw `props`
  // object is a fresh literal every render, which would bust the memo).
  const propsSignature = Object.keys(props)
    .sort()
    .map((key) => `${key}=${String((props as any)[key])}`)
    .join("&");

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rulesKey, propsSignature]);

  const getInputProps = (overrides: Record<string, any> = {}) => {
    const isCheckable = ["checkbox", "radio"].includes(type);

    const base: Record<string, any> = {
      id,
      name,
      ref: inputRef,
      disabled,
      onBlur: handleBlur,
      // Drive both ARIA attributes off the displayed `error` so they stay
      // consistent: when an error is shown, the input is marked invalid AND
      // points at the error node (was previously gated on `isTouched`, which
      // left a submit-revealed error described but not marked invalid).
      "aria-invalid": error ? true : undefined,
      "aria-required": baseProps.required || undefined,
      "aria-describedby": error ? errorId : undefined,
    };

    if (isCheckable) {
      base.checked = Boolean(checked);
      base.onChange = (e: any) =>
        formControl.setChecked(e?.target ? e.target.checked : Boolean(e));
    } else {
      base.value = value ?? "";
      base.onChange = (e: any) =>
        changeValue(e?.target ? e.target.value : e, undefined);
    }

    return { ...base, ...outputProps, ...overrides };
  };

  const getErrorProps = () => ({
    id: errorId,
    role: "alert" as const,
    "aria-live": "polite" as const,
  });

  const output: FormControlHook = {
    id,
    name,
    value,
    type,
    error,
    errorId,
    setError,
    inputRef,
    visibleElementRef,
    formControl,
    validate: validateFormControl,
    changeValue,
    onBlur: handleBlur,
    checked,
    disabled,
    isValidating,
    errorsList: formControl.errorsList,
    disable: formControl.disable.bind(formControl, true),
    enable: formControl.disable.bind(formControl, false),
    setChecked: formControl.setChecked.bind(formControl),
    otherProps: outputProps,
    getInputProps,
    getErrorProps,
    get isInvalid() {
      return formControl.isTouched && formControl.isValid === false;
    },
  };

  return output;
}
