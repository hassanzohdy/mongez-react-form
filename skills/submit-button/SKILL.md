---
name: mongez-react-form-submit-button
description: |
  Use when building a submit button or any UI element that needs to track form-level state (submitting, invalid controls, dirty, disabled). Explains the useSubmitButton hook, when each piece of state changes, and how to recover from a failed API request so the button re-enables.
---

# Building a smart submit button

Apply this skill when the user needs a submit button (or equivalent action element) that automatically disables itself while the form is invalid, submitting, or disabled — without manual wiring.

## The hook

`useSubmitButton()` subscribes to the parent form's events and returns:

```ts
{
  disabled: boolean;       // true while submitting OR any control is invalid OR form is disabled
  isSubmitting: boolean;   // true between form.submitting(true) and form.submitting(false)
  disable: (b: boolean) => void;   // manual override
  setSubmitState: (b: boolean) => void;
  isDirty: boolean;        // true if any control has been changed since mount/reset
}
```

It must be used inside a `<Form>` or `<NativeForm>` (or any descendant of `FormContext.Provider`).

## Pattern — Web

```tsx
import { useForm, useSubmitButton } from "@mongez/react-form";

export default function SubmitButton({ children }: { children: React.ReactNode }) {
  const form = useForm();
  const { disabled, isSubmitting } = useSubmitButton();

  return (
    <button type="submit" disabled={disabled}>
      {isSubmitting ? "Submitting..." : children}
    </button>
  );
}
```

With `type="submit"` and a click, the browser triggers the parent `<form>`'s submit event — no manual `form?.submit()` needed.

## Pattern — React Native

There's no DOM submit event in RN, so the press handler must call `form.submit()` explicitly:

```tsx
import { useForm, useSubmitButton } from "@mongez/react-form";
import { Pressable, Text, ActivityIndicator } from "react-native";

export default function SubmitButton({ children }: { children: React.ReactNode }) {
  const form = useForm();
  const { disabled, isSubmitting } = useSubmitButton();

  return (
    <Pressable
      disabled={disabled}
      onPress={() => form?.submit()}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      {isSubmitting && <ActivityIndicator />}
      <Text>{isSubmitting ? "Submitting..." : children}</Text>
    </Pressable>
  );
}
```

## When `disabled` flips to `true`

1. After form-level `submitting(true)` (entered the in-flight state).
2. When the `invalidControls` event fires (at least one registered control failed validation).
3. When `form.disable()` is called.

## When `disabled` flips back to `false`

1. After `form.submitting(false)` is called — typically in the `.catch()` or `.finally()` of the API request.
2. When the `validControls` event fires (all controls became valid again).
3. After `form.reset()`.
4. When `form.disable(false)` / `form.enable()` is called.

## Recovering from a failed submit

The most common bug: API request fails but the button stays disabled forever because `submitting(false)` was never called. Always call it in the failure path:

```tsx
const handleSubmit = ({ values, form }) => {
  api.createAccount(values)
    .then(() => navigate("/welcome"))
    .catch((err) => {
      showToast(err.message);
      form.submitting(false);  // <-- critical: re-enables the button
    });
};
```

Equivalent with async/await:

```tsx
const handleSubmit = async ({ values, form }) => {
  try {
    await api.createAccount(values);
    navigate("/welcome");
  } catch (err) {
    showToast(err.message);
  } finally {
    form.submitting(false);
  }
};
```

## Variant — disable until dirty

By default the submit button is enabled when the form mounts (because no controls have failed validation yet). To require a change first, gate on `isDirty`:

```tsx
const { disabled, isSubmitting, isDirty } = useSubmitButton();
const finalDisabled = disabled || !isDirty;
```

Useful for "Save" buttons in settings screens.

## Variant — independent of `useSubmitButton`

If you need to react to form events directly (e.g. show a toast on validation failure), subscribe to `form.on("invalidControls", ...)` instead. See the `form-events` skill for the full event list.

## Anti-patterns to avoid

- **Calling `useSubmitButton` outside a Form** — the hook returns safe defaults (`disabled: false`, `isSubmitting: false`) but the button won't react to form state. Always check that the button component is rendered inside a Form.
- **Storing `disabled` in local state and syncing manually** — `useSubmitButton` already does this. Don't double-track.
- **Forgetting `form?.submit()` on React Native** — `<Pressable onPress>` doesn't auto-trigger form submission like a Web `<button type="submit">` does.
