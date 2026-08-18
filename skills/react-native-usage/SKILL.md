---
name: mongez-react-form-react-native-usage
description: |
  Use when integrating @mongez/react-form into a React Native (or Expo) project. Explains the NativeForm component (a v4 forwardRef function component over the React-free FormEngine), the Fragment-by-default behavior, programmatic-only submission, how to wire a RN TextInput through useFormControl (including getInputProps), and the two cross-platform caveats (auto-touch listener, isVisible).
---

# Using @mongez/react-form in React Native

Apply this skill any time the user is integrating the library into a React Native or Expo project. The form engine, validation rules, events, and the `useFormControl` hook are 100% identical between Web and RN — only the top-level form component and the input host element differ.

> **v4.** `NativeForm` is a `forwardRef` **function component** over the React-free **`FormEngine`** class; a `ref` to it resolves to the engine (typed `FormInterface`). Everything else below is unchanged from the v3 surface — plus the new v4 hooks (`useFieldArray`, `useWatch`) and engine methods (`fill`, `setValues`, `setErrors`) work identically on RN.

## Import the right component

Web uses `Form`. React Native uses `NativeForm`. Same props, same context, same `FormInterface`:

```tsx
import { NativeForm } from "@mongez/react-form";
```

Do **not** mix them — use `NativeForm` exclusively in RN code paths.

## Why a separate component?

`Form` renders an HTML `<form>` element, calls `requestSubmit()`, and uses `event.preventDefault()` to cancel the browser-default submit. None of those exist in RN. Both components share the same `FormEngine` and only inject a platform-specific submit trigger (web dispatches a native submit event; native calls the engine's pipeline directly). `NativeForm`:

- Renders a React Fragment by default (no host element added to the tree).
- Has no DOM submit event; `form.submit()` delegates to the engine's `handleSubmit()` pipeline (validate → `onSubmit`).
- Does **not** add `react-native` as a peer dependency — the Fragment default keeps the package usable without RN installed.

## Minimal RN form

```tsx
import { NativeForm } from "@mongez/react-form";
import TextInput from "./components/TextInput";
import SubmitButton from "./components/SubmitButton";

export default function App() {
  const handleSubmit = ({ values }) => {
    console.log(values);
  };

  return (
    <NativeForm onSubmit={handleSubmit}>
      <TextInput name="firstName" required />
      <TextInput name="lastName" />
      <SubmitButton>Submit</SubmitButton>
    </NativeForm>
  );
}
```

## Adding a wrapper `View`

Pass `component={View}` to wrap children in a real host element. The ref of that component lands on `form.formElement`:

```tsx
import { View } from "react-native";

<NativeForm onSubmit={handleSubmit} component={View} style={{ padding: 16, gap: 12 }}>
  {/* ... */}
</NativeForm>
```

Any extra props (`style`, `accessibilityRole`, etc.) flow through to `View`.

## Writing an RN form control

```tsx
import { useFormControl, type FormControlProps } from "@mongez/react-form";
import { TextInput as RNTextInput, Text, View } from "react-native";

export default function TextInput(props: FormControlProps) {
  const { value, changeValue, inputRef, formControl, error, disabled } =
    useFormControl(props);

  return (
    <View>
      <RNTextInput
        ref={inputRef}
        value={value}
        onChangeText={changeValue}
        onFocus={() => (formControl.isTouched = true)}
        editable={!disabled}
      />
      {error && <Text style={{ color: "red" }}>{error}</Text>}
    </View>
  );
}
```

Wiring notes:

- `onChangeText` on RN's `TextInput` emits the string directly — pass it straight to `changeValue`. Do NOT use `onChange` (which emits an event object) unless you handle the unwrap yourself.
- `ref={inputRef}` enables `formControl.focus()` / `formControl.blur()` (RN's `TextInput` ref exposes both methods natively).
- The auto-touch listener that Web uses (a DOM `focus` event) is a no-op on RN. If you want `formControl.isTouched` to track, set it from `onFocus` as shown.
- For numeric inputs, set `keyboardType="numeric"` on the `RNTextInput` AND `type="number"` on the form control (so `numberRule` / `integerRule` / `floatRule` apply).

### `getInputProps` on React Native (v4)

`getInputProps()` works on RN too, but its `onChange` unwraps a DOM-style `e.target.value`, which RN's `TextInput` does not emit. Override `onChange` with an RN-friendly handler (and read the rest of the bag for `ref` / `value` / `disabled` / ARIA-equivalent props):

```tsx
const { changeValue, onBlur, getInputProps } = useFormControl(props);

<RNTextInput
  {...getInputProps({
    onChange: undefined,          // drop the DOM-style handler
    onChangeText: changeValue,    // RN emits the string directly
    onBlur,                       // keep blur wiring (validateOn="blur")
  })}
/>;
```

Or skip the bag entirely on RN and wire `value` / `onChangeText` / `inputRef` / `onBlur` by hand as in the example above — both are valid. The `aria-*` keys from `getInputProps` are harmless on RN (ignored by `TextInput`); use `accessibilityState`/`accessibilityLabel` for native a11y instead.

## Submit button for RN

```tsx
import { useForm, useSubmitButton } from "@mongez/react-form";
import { Pressable, Text } from "react-native";

export default function SubmitButton({ children }: { children: React.ReactNode }) {
  const form = useForm();
  const { disabled, isSubmitting } = useSubmitButton();

  return (
    <Pressable
      disabled={disabled}
      onPress={() => form?.submit()}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Text>{isSubmitting ? "Submitting..." : children}</Text>
    </Pressable>
  );
}
```

`form?.submit()` is **required** — there is no equivalent of `<button type="submit">` on RN. See the `submit-button` skill for details.

## Two caveats vs Web

1. **`formControl.isVisible()` always returns `true` on RN.** There is no DOM tree to walk, so the visibility check cannot detect hidden ancestors. This means `form.validateVisible()` behaves identically to `form.validate()` on RN. Usually fine because RN steppers typically unmount inactive steps rather than hide them.
2. **The auto-touch DOM listener is a no-op.** Set `formControl.isTouched = true` manually in your input's `onFocus` (as shown above) if you need touched-state tracking.

## Checkboxes on RN

There's no native checkbox primitive in RN. Build one from `Pressable` + `useFormControl({ type: "checkbox" })`:

```tsx
import { useFormControl, type FormControlProps } from "@mongez/react-form";
import { Pressable, Text } from "react-native";

export default function Checkbox(props: FormControlProps & { label: string }) {
  const { checked, setChecked } = useFormControl({ ...props, type: "checkbox" });

  return (
    <Pressable onPress={() => setChecked(!checked)}>
      <Text>{checked ? "[x]" : "[ ]"} {props.label}</Text>
    </Pressable>
  );
}
```

## What carries over unchanged from Web

- The validation rules system, including all built-in rules, async validation, and per-field Standard Schema.
- `useForm`, `useSubmitButton`, `useRadioInput`, `useFormControl`, and the v4 hooks `useFieldArray` / `useWatch`.
- `FormContext` and `useForm()` consumption.
- `getActiveForm()`, `getForm(id)` helpers.
- All form events (`submit`, `submitting`, `validating`, `validation`, `dirty`, `reset`, the v4 `change`, etc.) — see `form-events`.
- Default-value collection via `<NativeForm defaultValue={{ ... }}>`, the reactive `values` prop, and `form.fill` / `setValues` / `setErrors` hydration — see `form-hydration`.
- Whole-form Standard Schema via `<NativeForm schema={...}>` — see `standard-schema-validation`.
- Dot-notation `name="user.firstName"` produces nested values.

## Cross-platform shared components

If you need a single input component that works on both Web and RN (e.g. a shared component library), branch on `Platform.OS` inside the component, or build separate `.web.tsx` / `.native.tsx` files and let Metro/the bundler pick the right one. The `useFormControl` call itself is identical between them — only the host element changes.
