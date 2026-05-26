---
name: mongez-react-form-form-events
description: |
  Use when the user needs to subscribe to form lifecycle events — to react to submission, validation outcomes, dirty state, reset, or per-control register/unregister. Explains every event in FormEventType, what payload it carries, when it fires relative to others, and how to subscribe and unsubscribe.
  TRIGGER when: code calls `form.on(...)`, `useForm()`, `getActiveForm()`, or `getForm(...)`, or imports `FormEventType`, `FormInterface`, or `EventSubscription` from `@mongez/react-form`; references events like `submit`, `submitting`, `validating`, `validation`, `validControl`, `invalidControl`, `validControls`, `invalidControls`, `dirty`, `register`, `unregister`, `reset`, `resetting`, or `disable`; user asks "how do I autosave on dirty change", "how do I scroll to the first invalid input", "how do I block submission conditionally", or "how do I track form analytics on submit/validation failure".
  SKIP: `mongez-react-form-submit-button` when `useSubmitButton` already covers the disabled/submitting state derivation; `mongez-react-form-validation-rules` for writing/composing rules (rules fire validation events but the rule authoring topic is separate); `mongez-react-form-create-form-control` for the input component contract; raw `addEventListener` on a DOM `<form>`; `react-hook-form`'s `watch` / `formState` subscriptions.
---

# Form events

Apply this skill when the user needs side effects tied to the form lifecycle (analytics, autosave, toast notifications, scroll-to-error, etc.).

## Subscription API

Two ways to subscribe:

```ts
// 1. Via a ref to the form instance
formRef.current.on("submit", (form) => { ... });

// 2. Via useForm() from any descendant
const form = useForm();
useEffect(() => {
  const sub = form?.on("submit", (form) => { ... });
  return () => sub?.unsubscribe();
}, [form]);
```

`form.on(event, callback)` returns an `EventSubscription` with `.unsubscribe()`. Always unsubscribe in `useEffect` cleanup to prevent leaks across remounts.

## The event catalog

Event names are typed via `FormEventType` in [`src/types.ts` on GitHub](https://github.com/hassanzohdy/mongez-react-form/blob/main/src/types.ts).

| Event | Payload | Fires when |
|---|---|---|
| `init` | `(form)` | Form is initialized (not currently triggered by the package — reserved for future use / custom dispatch) |
| `registering` | `(formControl, form)` | A control is about to register (before push) |
| `register` | `(formControl, form)` | A control has registered |
| `unregistering` | `(formControl, form)` | (Reserved — currently not dispatched) |
| `unregister` | `(formControl, form)` | A control has unregistered |
| `change` | `(payload)` | (Form-level — currently dispatched on form-control level, see below) |
| `dirty` | `(isDirty, form)` | Form's overall dirty state changed |
| `validating` | `(form)` | About to validate (return `false` from a listener to abort the validation entirely) |
| `validation` | `(isValid, validatedInputs, form)` | Validation completed |
| `validControl` | `(formControl, form)` | A specific control transitioned to valid |
| `invalidControl` | `(formControl, form)` | A specific control transitioned to invalid |
| `validControls` | `(validControls[], form)` | All controls are valid (debounced) |
| `invalidControls` | `(invalidControls[], form)` | At least one control is invalid (debounced) |
| `submitting` | `(isSubmitting, form)` | Form entered or left the in-flight state |
| `submit` | `(form)` | Form has been submitted (also fires when `submitting(false)` is called) |
| `resetting` | `(form)` | About to reset |
| `reset` | `(form)` | Reset finished |
| `disable` | `(isDisabled, form)` | `form.disable()` / `form.enable()` was called |

## Ordering during a normal submit

1. User clicks submit.
2. `validating` (listeners can veto by returning `false`)
3. For each control: control's own validation runs; emits `validControl` / `invalidControl` per control.
4. `validation` with the boolean outcome + array of validated inputs.
5. `validControls` or `invalidControls` (debounced 0ms tick).
6. If invalid, the form's `onError` prop is called (not an event subscription).
7. If valid: `submitting(true)` → fires `submitting`. `onSubmit` prop is called.
8. After `onSubmit` returns: `submit` event fires.
9. (If `form.submitting(false)` is later called from the consumer code) `submitting` fires again with `false`, then `submit` fires again.

This means `submit` can fire twice for one user action — once at the end of the synchronous submission flow and once when in-flight completes. Listeners should be idempotent.

## Form control events (per-input)

Each form control also dispatches its own events on `formControl.onChange`, `formControl.onDestroy`, `formControl.onReset`. Subscribe from within a custom input:

```ts
const { formControl } = useFormControl(props);

useEffect(() => {
  const subs = [
    formControl.onChange(({ value }) => console.log("changed", value)),
    formControl.onReset(() => console.log("reset")),
    formControl.onDestroy(() => console.log("destroyed")),
  ];
  return () => subs.forEach((s) => s.unsubscribe());
}, [formControl]);
```

## Recipes

### Autosave on dirty change (debounced)

```tsx
useEffect(() => {
  if (!form) return;
  let timer: ReturnType<typeof setTimeout>;
  const sub = form.on("dirty", (isDirty) => {
    if (!isDirty) return;
    clearTimeout(timer);
    timer = setTimeout(() => persist(form.values()), 1000);
  });
  return () => {
    clearTimeout(timer);
    sub.unsubscribe();
  };
}, [form]);
```

### Scroll to first invalid input

```tsx
useEffect(() => {
  if (!form) return;
  const sub = form.on("invalidControls", (invalidControls) => {
    invalidControls[0]?.inputRef?.current?.scrollIntoView({ behavior: "smooth" });
  });
  return () => sub.unsubscribe();
}, [form]);
```

### Block submission conditionally

```tsx
form.on("validating", () => {
  if (!networkReachable()) {
    showToast("You're offline");
    return false;  // <-- aborts the validation, onSubmit will NOT fire
  }
});
```

Returning `false` from a `validating` listener is the only event-level veto in the system.

### Analytics — track form completion

```ts
form.on("submit", () => analytics.track("form_submitted", { id: form.id }));
form.on("invalidControls", (invalidControls) => {
  analytics.track("form_validation_failed", {
    id: form.id,
    fields: invalidControls.map((c) => c.name),
  });
});
```

## Active form globals (alternative to subscriptions)

`getActiveForm()` returns the most recently mounted form, and `getForm(id)` returns by id. Useful for hooking into form state from non-React code (background sync, deep links, etc.). Mind that `activeForm` can be null when nothing is mounted.

## Anti-patterns

- **Subscribing without unsubscribing** — leaks on remount, causes duplicate handler invocations after navigation.
- **Mutating `form.values()` results inside a listener and expecting controls to update** — `values()` returns a plain object; control state is owned by the controls themselves. Use `form.change(name, value)` or `formControl.change(value)`.
- **Relying on `submit` firing exactly once** — it fires after submission AND after `submitting(false)`. Listeners must be safe to run more than once.
