---
name: mongez-react-form-create-form-control
description: |
  Use when building a new form input component (text, checkbox, radio, select, multi-value, file input, etc.) that needs to register itself with a parent Form or NativeForm. Explains the useFormControl hook contract, the controlled vs uncontrolled paths, the canonical input shape per type, error rendering, the otherProps pass-through, the v4 accessibility prop bags (getInputProps / getErrorProps), the isValidating async state, per-control validateOn, and per-field schema.
---

# Creating a form control with `useFormControl`

Apply this skill any time the user is writing a new input component intended to live inside a `<Form>` or `<NativeForm>`. Every input in this library is a thin UI wrapper around `useFormControl`.

## The contract

`useFormControl(props, options?)` registers the input with the surrounding form (via `FormContext`) and returns a stable hook object:

```ts
{
  id: string;              // generated or echoed back from props.id
  name: string;            // echoed back, dot-notation normalized (`__proto__` / `constructor` / `prototype` segments are refused)
  type: string;            // echoed back (default "text")
  value: any;              // current value
  changeValue: (value, options?) => void;  // call from onChange / onChangeText
  error: ReactNode;        // current validation error (or null)
  errorId: string;         // `${id}-error` — wire to the error node + aria-describedby
  errorsList: { [ruleName]: ReactNode };  // per-rule errors when validateAll is on
  setError: (error) => void;
  checked: boolean;        // for checkbox / radio
  setChecked: (checked: boolean) => void;
  inputRef: RefObject;     // attach to the host input — enables focus()/blur()
  visibleElementRef: RefObject;  // attach to the wrapper — enables isVisible() / validateVisible()
  formControl: FormControl;   // the underlying registration object — escape hatch
  disabled: boolean;
  disable: () => void;
  enable: () => void;
  isInvalid: boolean;      // true once touched AND validation has failed
  isValidating: boolean;   // (v4) true while an async rule is in-flight for this control
  onBlur: () => void;      // (v4) blur handler — marks touched + runs validateOn="blur"
  otherProps: object;      // every prop NOT consumed by the hook or by rules
  getInputProps: (overrides?) => object;  // (v4) a11y-complete prop bag for the host input
  getErrorProps: () => { id; role; "aria-live" };  // (v4) prop bag for the error node
}
```

## Pattern 1 — Text input (Web)

```tsx
import { useFormControl, type FormControlProps } from "@mongez/react-form";

export default function TextInput(props: FormControlProps) {
  const { value, changeValue, id, error, inputRef, otherProps } =
    useFormControl(props);

  return (
    <>
      <input
        id={id}
        ref={inputRef}
        value={value}
        onChange={(e) => changeValue(e.target.value)}
        {...otherProps}
      />
      {error && <span className="error">{error}</span>}
    </>
  );
}
```

Critical points:

- Spread `otherProps` (NOT raw `props`) onto the host `<input>`. `otherProps` excludes hook-internal props (`name`, `rules`, `errors`, `onChange`, `value`, `defaultValue`, **`validateOn`**, **`schema`**, etc.) and any props the active rules declared as `preservedProps` (e.g. `minLength`, `pattern`). In v4 the `validateOn` and `schema` props are destructured out, so they never leak onto the DOM element.
- Always wire `inputRef` if you want `formControl.focus()` / `formControl.blur()` to work.
- The hook is controlled internally — `value` from the hook is always the source of truth, regardless of whether the user passed a `value` prop or not.

## Pattern 1b — Accessible text input via `getInputProps` / `getErrorProps` (v4, recommended)

In v4 the hook returns two prop bags that wire id/value/onChange/onBlur/ref **and** the ARIA attributes for you. Prefer these over hand-spreading — you get `aria-invalid`, `aria-required`, and `aria-describedby` (linking the input to its error node) automatically.

```tsx
import { useFormControl, type FormControlProps } from "@mongez/react-form";

export default function TextInput(props: FormControlProps) {
  const { error, getInputProps, getErrorProps } = useFormControl(props);

  return (
    <>
      <input {...getInputProps()} />
      {error && (
        <span className="error" {...getErrorProps()}>
          {error}
        </span>
      )}
    </>
  );
}
```

What `getInputProps(overrides?)` returns:

- `id`, `name`, `ref` (the `inputRef`), `disabled`
- For text-like inputs: `value` (coerced to `""` when nullish) and an `onChange` that unwraps `e.target.value`.
- For `type="checkbox"` / `type="radio"`: `checked` and an `onChange` that unwraps `e.target.checked` instead.
- `onBlur` (marks touched + runs `validateOn="blur"`).
- `aria-invalid` (when touched and failing), `aria-required` (from the `required` prop), and `aria-describedby` (set to `errorId` only while an error is showing).
- Then spreads `otherProps`, then your `overrides` last — so `{...getInputProps({ className: "my-input", placeholder: "Email" })}` wins over the defaults.

`getErrorProps()` returns `{ id: errorId, role: "alert", "aria-live": "polite" }`. Putting it on the error node makes screen readers announce the message and matches the `aria-describedby` the input points at.

## Pattern 2 — Checkbox

```tsx
import { useFormControl, type FormControlProps } from "@mongez/react-form";

export default function Checkbox(props: FormControlProps) {
  const { checked, setChecked, id, error } = useFormControl({
    ...props,
    type: "checkbox",  // MUST be explicit
  });

  return (
    <>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
      />
      {error && <span className="error">{error}</span>}
    </>
  );
}
```

For checkboxes, use `checked` / `setChecked`, not `value` / `changeValue`. The `type: "checkbox"` setting changes how the value is collected:

- Checked → `value` prop is emitted (or `true` if no `value` prop).
- Unchecked → emits `uncheckedValue` (from the second argument of `useFormControl`) if `collectUnchecked` is true, otherwise the field is omitted entirely.

```tsx
const { checked, setChecked } = useFormControl(props, {
  uncheckedValue: 0,    // emit 0 when unchecked
  collectUnchecked: true,
});
```

## Pattern 3 — Multi-value control (multi-select, tag input)

Pass `multiple: true` in the options to declare a multi-value control:

```tsx
const { value, changeValue } = useFormControl(props, { multiple: true });
// value is always an array
```

Multi-value controls are collected as arrays in `form.values()` even when they hold a single item.

## Pattern 4 — Radio (use `useRadioInput` instead)

For radios, don't use `useFormControl` per radio button. Build a `RadioGroup` (one `useFormControl` call) that provides `RadioGroupContext`, and have each `RadioInput` consume it via `useRadioInput(value)`. See the `react-native-usage` and `validation-rules` skills for the full pattern.

## Pattern 5 — Custom per-instance validation

Pass a `validate` callback in props (NOT in rules) for one-off validation that should only apply to this instance:

```tsx
<TextInput
  name="username"
  validate={({ value }) => {
    if (!/^[a-zA-Z0-9]+$/.test(value)) return "Username must be alphanumeric";
  }}
/>
```

The callback receives the full `InputRuleOptions` object and may return a `ReactNode` (error) or a `Promise<ReactNode>` (async — blocks other rules until resolved). Returning nothing means valid.

## Pattern 5b — Showing an async-validation spinner (`isValidating`, v4)

When a rule (or the per-instance `validate`) returns a Promise, the hook flips `isValidating` to `true` until it resolves, and stale results from superseded runs are discarded. Use it to render a pending indicator without tracking state yourself:

```tsx
export default function UsernameInput(props: FormControlProps) {
  const { error, isValidating, getInputProps, getErrorProps } =
    useFormControl(props);

  return (
    <>
      <input {...getInputProps()} />
      {isValidating && <span className="spinner" aria-hidden />}
      {error && <span {...getErrorProps()}>{error}</span>}
    </>
  );
}
```

`isValidating` is also exposed on the underlying `formControl.isValidating`. Sync rules never flip it — the hook keeps a synchronous fast path and only goes async when a rule actually returns a Promise.

## Pattern 5c — Per-control `validateOn` (v4)

A control can declare when it validates via the `validateOn` prop: `"change"` (default), `"blur"`, or `"submit"`. Per-control beats the `<Form validateOn>` prop, which beats the global `setFormConfigurations({ validateOn })`, which falls back to `"change"`.

```tsx
<EmailInput name="email" type="email" required validateOn="blur" />
```

The hook returns an `onBlur` handler that you must wire for `"blur"` mode (already included in `getInputProps()`):

```tsx
const { value, changeValue, onBlur, error } = useFormControl(props);
<input value={value} onChange={(e) => changeValue(e.target.value)} onBlur={onBlur} />;
```

For `"blur"` and `"submit"` modes, once a field has errored (or the form was submitted), it **revalidates on every change** so a cleared error disappears live. `validateOn` is destructured out of `otherProps`, so it never reaches the DOM.

## Pattern 5d — Per-field Standard Schema (v4)

Validate a single control with a Standard Schema (zod / valibot / `@warlock.js/seal`) via the `schema` prop or the `schema` option. It's wrapped as a rule and appended last in the pipeline:

```tsx
import { v } from "@warlock.js/seal";

<TextInput name="email" schema={v.string().email()} />;
```

```tsx
// or bake it into a reusable wrapper through the options bag:
const { value } = useFormControl(props, { schema: v.string().min(3) });
```

The first schema issue's message becomes the rendered error. See the **standard-schema-validation** skill for whole-form schemas and type inference. Like `validateOn`, the `schema` prop is destructured out of `otherProps`.

## Pattern 6 — Showing per-rule errors

When `useFormControl(props, { validateAll: true })` is set, `error` becomes an array of all failing-rule messages and `errorsList[ruleName]` exposes each individually:

```tsx
const { errorsList } = useFormControl({
  ...props,
  rules: [requiredRule, minLengthRule],
}, { validateAll: true });

return (
  <>
    {errorsList.required && <p>{errorsList.required}</p>}
    {errorsList.minLength && <p>{errorsList.minLength}</p>}
  </>
);
```

## Pattern 7 — Hidden input (no UI)

Use the built-in `HiddenInput` component for values that should be collected but not rendered:

```tsx
import { HiddenInput } from "@mongez/react-form";

<HiddenInput name="csrfToken" value={token} />
```

It calls `useFormControl` and returns `null`. The value still appears in `form.values()`.

## Default `id` generation

If no `id` prop is provided, the hook derives one. Inside a `<Form>` it is `<formId>-<sanitized-name>` (the form's id, from its `id` prop or its `useId()` value, so the same field name in two forms yields different ids). Outside a form it is `input-<sanitized-name>`. Dots become dashes and non-alphanumerics are stripped. A nameless control gets a `useId()`-based id that matches between server and client. An explicit `id` prop always wins, and the error id is `<id>-error`. The derivation is the exported `useControlId({ id?, name, formId? })` hook — call it yourself if you need the same id outside `useFormControl`. **Renamed from `useId` in v4** so importing it no longer shadows React 18's own `useId`.

## Recap checklist before committing a new input component

- [ ] `useFormControl` called with props (and `type` explicitly set when not "text").
- [ ] Prefer `getInputProps()` + `getErrorProps()` (v4) for a free a11y wiring; otherwise spread `otherProps` (not raw `props`) and wire `inputRef`, `onBlur`, and the ARIA attributes yourself.
- [ ] `error` rendered conditionally; the error node carries `getErrorProps()` (or at least `id={errorId}`) so `aria-describedby` resolves.
- [ ] For checkbox/radio: `checked` / `setChecked` used, not `value` / `changeValue`.
- [ ] `name` prop is required and must be provided by the consumer.
