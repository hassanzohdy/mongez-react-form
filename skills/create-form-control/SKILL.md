---
name: mongez-react-form-create-form-control
description: |
  Use when building a new form input component (text, checkbox, radio, select, multi-value, file input, etc.) that needs to register itself with a parent Form or NativeForm. Explains the useFormControl hook contract, the controlled vs uncontrolled paths, the canonical input shape per type, error rendering, and the otherProps pass-through.
---

# Creating a form control with `useFormControl`

Apply this skill any time the user is writing a new input component intended to live inside a `<Form>` or `<NativeForm>`. Every input in this library is a thin UI wrapper around `useFormControl`.

## The contract

`useFormControl(props, options?)` registers the input with the surrounding form (via `FormContext`) and returns a stable hook object:

```ts
{
  id: string;              // generated or echoed back from props.id
  name: string;            // echoed back, dot-notation normalized
  type: string;            // echoed back (default "text")
  value: any;              // current value
  changeValue: (value, options?) => void;  // call from onChange / onChangeText
  error: ReactNode;        // current validation error (or null)
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
  otherProps: object;      // every prop NOT consumed by the hook or by rules
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

- Spread `otherProps` (NOT raw `props`) onto the host `<input>`. `otherProps` excludes hook-internal props (`name`, `rules`, `errors`, `onChange`, `value`, `defaultValue`, etc.) and any props the active rules declared as `preservedProps` (e.g. `minLength`, `pattern`).
- Always wire `inputRef` if you want `formControl.focus()` / `formControl.blur()` to work.
- The hook is controlled internally — `value` from the hook is always the source of truth, regardless of whether the user passed a `value` prop or not.

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

If no `id` prop is provided, the hook derives one from `name`: `input-<sanitized-name>` (dots become dashes, non-alphanumerics stripped). This is deliberate — it makes the input's `id` predictable for `<label htmlFor>` association.

## Recap checklist before committing a new input component

- [ ] `useFormControl` called with props (and `type` explicitly set when not "text").
- [ ] `otherProps` spread onto the host element (not raw `props`).
- [ ] `inputRef` wired to the host input.
- [ ] `error` rendered conditionally.
- [ ] For checkbox/radio: `checked` / `setChecked` used, not `value` / `changeValue`.
- [ ] `name` prop is required and must be provided by the consumer.
