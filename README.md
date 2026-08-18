<div align="center">

# @mongez/react-form

**Headless React form handler for Web and React Native — same hooks, same rules, same `<Form>` API on both platforms.**

[![npm](https://img.shields.io/npm/v/@mongez/react-form.svg)](https://www.npmjs.com/package/@mongez/react-form)
[![license](https://img.shields.io/npm/l/@mongez/react-form.svg)](LICENSE)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@mongez/react-form.svg)](https://bundlephobia.com/package/@mongez/react-form)
[![downloads](https://img.shields.io/npm/dw/@mongez/react-form.svg)](https://www.npmjs.com/package/@mongez/react-form)

</div>

---

## Why @mongez/react-form?

`react-hook-form` is fast because it leans on uncontrolled refs — but its API surface is huge and React Native support requires a separate adapter. `formik` is controlled by default and re-renders the whole tree on every keystroke. `react-final-form` works but is effectively unmaintained. Hand-rolling form state with `useState` per input means you rewrite empty-value handling, dirty tracking, and validation every project.

`@mongez/react-form` ships one `useFormControl` hook that owns the value, runs a localized rule pipeline, and registers itself with the nearest `<Form>` (web) or `<NativeForm>` (React Native) — same hooks, same rules, on both platforms. Validation rules are plain data objects, not strings, so you can compose them, override messages per instance, or write your own. Dot-notation `name` props (`user.email`, `addresses.0.city`) nest collected values into objects on submit. No schema layer, no `<Controller>` wrappers, no `register("name")` boilerplate.

You build your own input — the library stays headless. A thin wrapper around `useFormControl` + `getInputProps()` is ~3 lines, fully accessible, with no footguns (readable English errors render with **zero setup**):

```tsx
import { Form, useFormControl, requiredRule, emailRule, type FormControlProps } from "@mongez/react-form";

function TextInput(props: FormControlProps) {
  const { error, getInputProps, getErrorProps } =
    useFormControl({ rules: [requiredRule, emailRule], ...props });
  return (
    <>
      <input {...getInputProps()} />
      {error && <span {...getErrorProps()}>{error}</span>}
    </>
  );
}

<Form onSubmit={({ values }) => api.signup(values)}>
  <TextInput name="email" type="email" required />
  <button type="submit">Sign up</button>
</Form>
```

`getInputProps()` wires `id` / `value` / `onChange` / `onBlur` / `ref` / ARIA for you. Want full control over the wiring (and on React Native, where inputs emit values directly)? Spread the raw `value` / `changeValue` / `otherProps` instead — see [`useFormControl`](#useformcontrol) below.

---

## Features

| Feature | Description |
|---|---|
| **`<Form>` and `<NativeForm>`** | Function components (v4, `forwardRef`) for web (`<form>` element) and React Native (Fragment + optional `component` prop). SSR-safe ids via `useId()`. Same context, same hooks. |
| **`useFormControl`** | Register any input, get back `value` / `changeValue` / `error` / `checked` / `inputRef` / `otherProps`. v4 adds `getInputProps` / `getErrorProps` / `isValidating` / `onBlur`. Always controlled internally. |
| **`useFormState`** (v4) | One-stop reactive snapshot: `{ isValid, isDirty, isSubmitting, isSubmitted, isValidating, formErrors }`. |
| **Dot-notation `name`** | `user.email` and `addresses.0.city` nest into `{ user: { email }, addresses: [{ city }] }` on submit. |
| **Composable rule pipeline** | Plain `InputRule` data with `validate`, `requiresType`, `requiresValue`, `preservedProps`. Built-ins cover required, length, min/max, email, url, pattern, match, strong-password, and more. **Async validation genuinely gates submission** (v4). |
| **Standard Schema** (v4) | Validate the whole form (`<Form schema={...}>`) or a single field (`schema` prop) with `@warlock.js/seal`, `zod`, `valibot`, … — **zero runtime dependency**. Types `onSubmit` values. |
| **Locale-aware errors** | Messages flow through `@mongez/localization`. Bundles ship for `en`, `ar`, `fr`, `es`, `it`, `de`. |
| **Hydration** (v4) | Reactive `values` prop, `form.fill()` / `setValues()`, and `form.setErrors()` (bulk 422 mapping). `defaultValue` is the reset baseline. |
| **`useFieldArray`** (v4) | Dynamic, reorderable lists with stable keys: `append` / `remove` / `move` / `swap` / `insert` / `prepend` / `replace`. |
| **`useWatch`** (v4) | Reactively read live values (`useWatch()` / `useWatch(name)` / `useWatch(names[])`) via a form-level `change` event. |
| **`validateOn`** (v4) | `"change"` \| `"blur"` \| `"submit"`, per-control / per-form / global. |
| **`focusFirstError`** (v4) | `<Form focusFirstError>` moves focus to the first invalid control on a failed submit. |
| **`useRadioInput` + `RadioGroupContext`** | One `useFormControl` owns the selected value; each radio reads it through context. |
| **`HiddenInput`** | One-line component for csrf tokens, hidden ids, computed values. |
| **`useSubmitButton`** | Subscribes to `submitting` / `invalidControls` / `dirty` events; returns `disabled` / `isSubmitting` / `isDirty`. |
| **React Native support** | `react-native` is **not** a peer dep; `NativeForm` renders a Fragment unless you pass `component={View}`. |
| **`FormEngine`** (v4) | React-free engine class holding all form logic. Held in a ref by `Form` / `NativeForm` and exposed via `ref`. (`BaseForm` is a deprecated alias.) |

---

## Installation

```sh
npm install @mongez/react-form
```

```sh
yarn add @mongez/react-form
```

```sh
pnpm add @mongez/react-form
```

Peer: `react >= 18`. Runtime deps install transitively: `@mongez/events`, `@mongez/localization`, `@mongez/supportive-is`, `@mongez/reinforcements`.

---

## Quick start

```tsx
import {
  Form, useFormControl, useSubmitButton,
  requiredRule, emailRule,
  type FormControlProps,
} from "@mongez/react-form";

// 1. Build a thin UI wrapper around useFormControl — this is YOUR component.
//    getInputProps() wires id / value / onChange / onBlur / ref / ARIA for you.
function TextInput(props: FormControlProps) {
  const { error, getInputProps, getErrorProps } =
    useFormControl({ rules: [requiredRule, emailRule], ...props });

  return (
    <>
      <input {...getInputProps()} />
      {error && <span className="error" {...getErrorProps()}>{error}</span>}
    </>
  );
}

// 2. SubmitButton auto-disables while invalid or in-flight.
function SubmitButton({ children }: { children: React.ReactNode }) {
  const { disabled, isSubmitting } = useSubmitButton();
  return (
    <button type="submit" disabled={disabled}>
      {isSubmitting ? "Submitting..." : children}
    </button>
  );
}

// 3. Drop them into a Form. `values` is collected by name; dot-notation supported.
<Form onSubmit={async ({ values }) => { await api.signup(values); }}>
  <TextInput name="user.firstName" required />
  <TextInput name="user.email" type="email" required />
  <SubmitButton>Sign up</SubmitButton>
</Form>;
```

Validation errors render as readable English out of the box — **no setup**. To customize messages or add another locale, `extend("en", { validation: { ...enValidationTranslation, required: "Required" } })` at app entry (it overrides the shipped defaults). Returning a promise from `onSubmit` auto-clears the submitting state on settle.

That's the happy path. Everything below is depth on the same surface.

---

## Form components — Web vs React Native

Both are function components (v4) built over the same React-free `FormEngine` class — identical `FormContext`, `useFormControl` behavior, validation pipeline, and value collection. The engine instance is exposed via `ref` (typed `FormInterface`). Only the host element differs.

| | `Form` (web) | `NativeForm` (React Native) |
|---|---|---|
| Default host | `<form>` element | Fragment (no host) |
| Override host | `component` prop | `component` prop (typically `View`) |
| Submit trigger | Browser `submit` event + `form.submit()` | Programmatic — `form.submit()` only |
| `formControl.isVisible()` | Walks DOM for `hidden` ancestors | Always returns `true` |
| Auto-touch on focus | DOM `focus` listener | No-op — set `formControl.isTouched = true` manually |

```tsx
// Web
<Form onSubmit={handle}>...</Form>;

// React Native — react-native is NOT a peer dep
import { View } from "react-native";
<NativeForm onSubmit={handle} component={View} style={{ padding: 16, gap: 12 }}>
  ...
</NativeForm>;
```

`FormProps` (both): `onSubmit({ form, event?, values, formData })`, `onError(invalidControls)`, `component`, `defaultValue`, `values` (v4, reactive), `schema` (v4, Standard Schema), `validateOn` (v4), `ignoreEmptyValues`, `id`.

> **`values` and `formData` on the `onSubmit` payload are getters.** They re-collect on every access — don't reference them twice if collection is expensive.

> **SSR (v4):** ids are derived from `useId()`, so `<Form>` hydrates cleanly without a static `id`. Pass an explicit `id` only when you want a fixed, human-readable one (it also sets the event prefix `form.<id>`).
>
> **Next.js App Router:** the components and hooks ship a `"use client"` boundary, so you can import `<Form>` / `useFormControl` straight into a Server Component tree without marking your own file. The pure exports (rules, types, `standard-schema` helpers, `FormEngine`) stay server-importable. `getActiveForm()` / `getForm()` are client-only conveniences (populated by mount effects) — they return `null` during server render.

---

## `useFormControl`

The `TextInput` shown in Quick start above is the canonical wrapper pattern. Three things matter:

- **Spread `otherProps`, not raw `props`**, onto the host element. `otherProps` excludes hook-internal keys (`name`, `rules`, `errors`, `onChange`, `value`, `defaultValue`, `errorKeys`, ...) and any `preservedProps` declared by active rules (`minLength`, `pattern`, `match`, `strong`, ...).
- **Wire `inputRef`** if you want `formControl.focus()` / `.blur()` to work, or auto-touch tracking on web.
- The hook is **always controlled internally** — `value` from the hook is the source of truth even when the consumer passes a `value` prop. The `id` defaults to `input-<sanitized-name>` (dots become dashes), computed by the exported `useControlId({ id?, name })` hook — call it yourself if you need the same id outside `useFormControl`. **Renamed from `useId` in v4** so importing it no longer shadows React 18's own `useId`.

### Hook return shape

```ts
{
  id, name, type, value, error, errorId, errorsList, checked, disabled, isInvalid,
  changeValue, setError, setChecked, disable, enable,
  isValidating,       // v4: true while an async validation rule is in-flight
  onBlur,             // v4: blur handler — triggers validation when validateOn="blur"
  getInputProps,      // v4: a11y-complete prop bag for the host input
  getErrorProps,      // v4: { id, role: "alert", "aria-live": "polite" } for the error node
  inputRef,           // attach to host input — enables focus()/blur() and auto-touch
  visibleElementRef,  // attach to wrapper — enables validateVisible()
  formControl,        // escape hatch — full registration object
  otherProps,         // pass-through props (always spread these, not raw props)
}
```

`name` is dot-notation normalized (`tags[0]` → `tags.0`). `type` defaults to `"text"`. `error` is a `ReactNode` (or an array of `ReactNode` when the hook's second arg is `{ validateAll: true }`). `isInvalid` is `true` only when the control is both touched and failed validation.

### Accessibility prop bags (v4)

For a fully-wired, accessible input, spread `getInputProps()` onto the host input and `getErrorProps()` onto the error node — they handle `id`, `value`/`checked`, `onChange`, `onBlur`, `ref`, `disabled`, and `aria-invalid` / `aria-required` / `aria-describedby` for you:

```tsx
function TextInput(props: FormControlProps) {
  const { error, getInputProps, getErrorProps } = useFormControl(props);
  return (
    <>
      <input {...getInputProps()} />
      {error && <span {...getErrorProps()}>{error}</span>}
    </>
  );
}
```

`getInputProps(overrides)` merges your pass-through `otherProps`, then the overrides, so `getInputProps({ className: "field" })` works. `getErrorProps()` returns `{ id: errorId, role: "alert", "aria-live": "polite" }`.

### Checkbox

```tsx
const { checked, setChecked, id } = useFormControl({ ...props, type: "checkbox" });
<input id={id} type="checkbox" checked={checked}
       onChange={(e) => setChecked(e.target.checked)} />;
```

`type: "checkbox"` must be set explicitly. Configure collection via the hook's second argument:

```ts
useFormControl(props, {
  uncheckedValue: 0,       // value emitted when unchecked
  collectUnchecked: true,  // include unchecked controls in form.values()
});
```

### Radio group

```tsx
import { useFormControl, useRadioInput, RadioGroupContext, requiredRule } from "@mongez/react-form";

function RadioGroup({ children, ...props }) {
  const { value, changeValue } = useFormControl({ ...props, rules: [requiredRule] });
  return (
    <RadioGroupContext.Provider value={{ value, changeValue }}>
      {children}
    </RadioGroupContext.Provider>
  );
}

function RadioInput({ value, children }: { value: any; children: React.ReactNode }) {
  const { isSelected, changeValue } = useRadioInput(value);
  return (
    <label>
      <input type="radio" checked={isSelected} onChange={changeValue} />
      {children}
    </label>
  );
}

<RadioGroup name="gender">
  <RadioInput value="male">Male</RadioInput>
  <RadioInput value="female">Female</RadioInput>
</RadioGroup>;
```

### Multi-value control + hidden input

```ts
useFormControl(props, { multiple: true });  // hook.value is always an array
```

```tsx
import { HiddenInput } from "@mongez/react-form";
<HiddenInput name="csrfToken" value={token} />;
```

`HiddenInput` is `useFormControl(props)` + `return null` — perfect for tokens, computed ids, and any value you want collected without rendering.

---

## Validation rules

Rules are plain data — `InputRule` objects passed in the `rules` array. Each rule's `validate` returns one of:

- `undefined` / `null` → valid
- `ReactNode` → invalid; this is the rendered error
- `Promise<ReactNode | undefined>` → async; later rules block on it

Rules run in array order; the first failure short-circuits the rest unless you pass `{ validateAll: true }` to the hook (which runs every rule and exposes results as `errorsList` plus an array `error`).

### Built-in rules

| Rule | Activated by | Type-gated | Notes |
|---|---|---|---|
| `requiredRule` | `required` prop | — | Empty = `null` / `undefined` / `""` / `[]`. For checkboxes, empty = `!checked`. |
| `minLengthRule` / `maxLengthRule` / `lengthRule` | `minLength` / `maxLength` / `length` props | — | Strings and arrays. |
| `minRule` / `maxRule` | `min` / `max` props | — | Numeric — `Number(value) < Number(min)`. |
| `emailRule` / `urlRule` / `alphabetRule` | — | `type="email"` / `"url"` / `"alphabet"` | Built-in regex / `isUrl` from `@mongez/supportive-is`. |
| `numberRule` / `integerRule` / `floatRule` | — | `type="number"` / `"integer"` / `"float"` | Numeric coercion + `Number.isInteger` for integers. |
| `patternRule` | `pattern` prop | — | RegExp or string. Compiled patterns are cached by source+flags; the source is capped at 200 characters and a value over 2000 characters **fails the rule** instead of being matched on a truncated prefix (ReDoS guard). An oversized or invalid pattern skips validation (fails safe) rather than blocking every submission. |
| `matchRule` | `match` prop (other input's name) | — | Re-runs when the matched input changes. |
| `strongRule` | `strong` prop | `type="password"` | 5 composable criteria; per-criterion errors in `errorsList["strong.<key>"]`. |

`requiresType: "X"` rules only run when the form control's `type` matches. `requiresValue: true` rules (the default) skip when the value is empty. **Always list `requiredRule` first** — it is the only built-in with `requiresValue: false`, so anything after it auto-skips empties.

### Locale registration (one-time setup)

```ts
import { extend } from "@mongez/localization";
import {
  enValidationTranslation,
  arValidationTranslation,
  frValidationTranslation,
  esValidationTranslation,
  itValidationTranslation,
  deValidationTranslation,
} from "@mongez/react-form";

extend("en", { validation: enValidationTranslation });
extend("ar", { validation: arValidationTranslation });
// ... only the locales the app uses
```

### Composing rules in a reusable component

```tsx
function TextInput({
  rules = [requiredRule, minLengthRule, emailRule],
  ...props
}: FormControlProps) {
  const { value, changeValue, error, otherProps } = useFormControl({ ...props, rules });
  // ...
}

// Consumer activates each rule by passing the matching prop:
<TextInput name="email" type="email" required minLength={5} />;
```

### Per-instance overrides

```tsx
// Replace the whole rendered message for one rule:
<TextInput pattern={/^[a-z]+$/} errors={{ pattern: "Lowercase letters only" }} />;

// Replace a named placeholder inside the localized template:
<TextInput match="password" errorKeys={{ matchingInput: "Password" }} />;

// Per-instance custom validation (sync or async):
<TextInput
  name="username"
  validate={async ({ value }) => {
    if (!value) return;
    if (await isTaken(value)) return "Username already taken";
  }}
/>;
```

The `validate` prop runs as if it were the first rule (`requiresValue: true`).

### Writing a custom rule

```ts
import { trans } from "@mongez/localization";
import type { InputRule } from "@mongez/react-form";

export const phoneNumberRule: InputRule = {
  name: "phoneNumber",
  requiresType: "phoneNumber",
  preservedProps: ["mask"], // keeps `mask` out of otherProps so it doesn't leak onto <input>
  validate: ({ value, errorKeys }) => {
    if (!/^01[0-2|5]{1}[0-9]{8}$/.test(value)) {
      return trans("validation.phoneNumber", { input: errorKeys.name });
    }
  },
};
```

> **Add custom messages to the locale bundle.** When using `trans("validation.phoneNumber", ...)`, register the key alongside built-ins: `extend("en", { validation: { ...enValidationTranslation, phoneNumber: "..." } })`.

### Async validation gates submission (v4)

When a rule (or per-instance `validate`) returns a Promise, v4 **awaits it before submitting** — a failing async rule blocks `onSubmit`. Sync rules keep their synchronous timing (no extra microtask); the pipeline only goes async when a rule actually returns a Promise. While in flight, the control's `isValidating` flag is `true` (use it for a spinner), and stale async results are discarded if the value changes again before they resolve.

### `validateOn` (v4)

Control when a field validates: `"change"` (default), `"blur"`, or `"submit"`. Resolution order, most specific wins: per-control prop → `<Form validateOn>` → `setFormConfigurations({ validateOn })` → `"change"`. Wire the hook's `onBlur` (or use `getInputProps`) for `"blur"` mode. After a field errors once (or the form has been submitted), it reverts to live revalidation on change so cleared errors update immediately.

```tsx
<Form validateOn="blur">
  <TextInput name="email" type="email" required />
  <TextInput name="coupon" validateOn="change" /> {/* override per-control */}
</Form>
```

---

## Standard Schema validation (v4)

Validate with any [Standard Schema](https://standardschema.dev) validator — `@warlock.js/seal`, `zod`, `valibot`, `arktype`, … — with **zero runtime dependency** (the form duck-types on the `~standard` property).

**Whole-form** — `<Form schema={...}>` runs the schema against collected values on submit and maps each issue back to its control by `path`. It also types `onSubmit`'s `values` as the schema's inferred output:

```tsx
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  age: z.coerce.number(),
});

<Form schema={schema} onSubmit={({ values }) => {
  values.email; // string
  values.age;   // number
}}>
  <TextInput name="email" type="email" />
  <TextInput name="age" type="number" />
  <SubmitButton>Save</SubmitButton>
</Form>;
```

Issues whose control is not in the validated subset are ignored, so `form.validateVisible()` (multi-step wizards) won't fail on hidden fields.

**Per-field** — pass `schema` on one control to validate it with a single-field schema (wrapped as a rule, appended last):

```tsx
<TextInput name="email" schema={z.string().email("Bad email")} />
```

Type helpers exported from the package: `StandardSchemaV1`, `InferFormValues<Schema>`, `InferFormInput<Schema>`, `isStandardSchema`, `standardSchemaToRule`, `runStandardSchema`, `issuePathToName`.

---

## Hydration — `values`, `fill`, `setValues`, `setErrors` (v4)

**Which value setter do I use?**

| You want to… | Use |
|---|---|
| Set an initial value that's also the **reset baseline** | `defaultValue` (on `<Form>` for shared defaults, or per-control to override) |
| Hydrate from data that loads **after mount** (edit forms) | `<Form values={record}>` (reactive — re-hydrates on identity change) |
| Imperatively write many values (e.g. from an event handler) | `form.fill(values)` / `form.setValues(values)` |
| Change one field programmatically | `form.change(name, value)` |
| Map a server **422** error response onto controls | `form.setErrors({ "user.email": "Taken" })` |
| Reset to the original baseline / to **new** values | `form.reset()` / `form.reset(newValues)` |

`defaultValue` is the **reset baseline** (`form.reset()` restores it). For data that arrives *after* mount (edit forms whose record loads async), use the reactive **`values`** prop — changing its identity re-hydrates already-mounted controls and seeds later-mounting ones:

```tsx
function EditUser({ id }) {
  const { data: user } = useQuery(["user", id], () => api.getUser(id));
  return (
    <Form values={user} onSubmit={({ values }) => api.updateUser(id, values)}>
      <TextInput name="firstName" />
      <TextInput name="email" type="email" />
      <SubmitButton>Save</SubmitButton>
    </Form>
  );
}
```

Imperatively, `form.fill(values, { dirty?, validate? })` (alias `form.setValues`) bulk-writes onto controls without touching the reset baseline. `form.setErrors({ "dot.name": message })` maps a server 422 response onto controls in one call:

```tsx
catch (error) {
  if (error?.status === 422) form.setErrors(error.body.errors);
}
```

---

## Field arrays — `useFieldArray` (v4)

Dynamic, reorderable lists with **stable keys** (a surviving row keeps its value when others are removed/reordered). Row input names derive from the index, so the form collects them as an array.

```tsx
import { useFieldArray } from "@mongez/react-form";

function Addresses() {
  const { fields, append, remove } = useFieldArray("addresses");
  return (
    <>
      {fields.map((field) => (
        <div key={field.key}>
          <TextInput name={`${field.name}.city`} required />
          <button type="button" onClick={() => remove(field.index)}>Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => append()}>Add address</button>
    </>
  );
}
```

Full helper set: `{ fields, append, prepend, remove, insert, move, swap, replace }`. Key on `field.key`, name on `field.name`.

---

## Watching values — `useWatch` (v4)

Reactively read live values from any descendant — re-renders on any control change or form reset. Powered by a new form-level `change` event.

```tsx
import { useWatch } from "@mongez/react-form";

const all   = useWatch();              // whole values object
const email = useWatch("user.email");  // one control
const [a, b] = useWatch(["a", "b"]);   // several, in order
```

Use `useWatch()` in render (reactive); use `form.values()` in callbacks (one-shot). Keep watching components small — they re-render on every change.

---

## Submit button — `useSubmitButton`

```ts
const { disabled, isSubmitting, isDirty } = useSubmitButton();
```

| State | Flips `true` when | Flips back when |
|---|---|---|
| `disabled` | `submitting(true)`, `invalidControls` event, or `form.disable()` | `submitting(false)`, `validControls`, `form.reset()`, `form.enable()` |
| `isSubmitting` | `submitting(true)` | `submitting(false)` |
| `isDirty` | `dirty` event with `true` | When all dirty controls reset / unregister |

> **Awaited submit (v4):** if `onSubmit` **returns a Promise**, the engine auto-clears the submitting state when it settles (success or failure) — no manual `form.submitting(false)` needed. If `onSubmit` is synchronous (or you swallow the error inside the handler so nothing is returned), call `form.submitting(false)` yourself in the failure path or the button stays disabled forever.

```tsx
// v4: return the promise — the engine manages the submitting state
const handleSubmit = async ({ values }) => {
  await api.createAccount(values);
  navigate("/welcome");
};

// Or own it fully (sync handler, or error swallowed here):
const handleSubmitManual = async ({ values, form }) => {
  try {
    await api.createAccount(values);
    navigate("/welcome");
  } catch (err) {
    showToast(err.message);
    form.submitting(false); // re-enables the button
  }
};
```

To require a change before enabling (Settings-screen pattern):

```ts
const { disabled, isDirty } = useSubmitButton();
const finalDisabled = disabled || !isDirty;
```

### React Native submit button

There is no DOM submit event on RN, so the press handler must call `form.submit()` explicitly:

```tsx
import { useForm, useSubmitButton } from "@mongez/react-form";
import { Pressable, Text, ActivityIndicator } from "react-native";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const form = useForm();
  const { disabled, isSubmitting } = useSubmitButton();
  return (
    <Pressable disabled={disabled} onPress={() => form?.submit()}
               style={{ opacity: disabled ? 0.5 : 1 }}>
      {isSubmitting && <ActivityIndicator />}
      <Text>{isSubmitting ? "Submitting..." : children}</Text>
    </Pressable>
  );
}
```

---

## Names, defaults, events

`name` supports dot-notation; values nest into objects on submit:

```
user.firstName     → { user: { firstName: "..." } }
addresses.0.city   → { addresses: [{ city: "..." }] }
tags[0]            ≡ tags.0        // bracket form is normalized to dots
```

Repeated `name`s collect into an array; `multiple: true` forces array form. `form.formData()` emits the same nested structure as bracket notation on the wire (`user[firstName]=X`, `tags[]=a&tags[]=b`).

Default values: form-level (preferred for shared defaults) or per-control (overrides):

```tsx
<Form defaultValue={{ user: { firstName: "John" } }}>...</Form>
<TextInput name="user.firstName" defaultValue="Jane" />
```

`<Form ignoreEmptyValues>` (or globally, `setFormConfigurations({ ignoreEmptyValues: true })`) makes `form.values()` skip `null` / `undefined` / `""` / `[]`. Does **not** affect `form.formData()`.

> **Hardening (v4) for schema/CMS-driven field names.** Names are usually author-written, but when they're built from server or CMS data, dot-notation expansion is a surface worth guarding: a `__proto__` / `constructor` / `prototype` segment (e.g. `__proto__.isAdmin`) is now rejected rather than written through to `Object.prototype`, and a numeric segment above `10,000` (e.g. `items.4000000000.x`) is treated as a plain object key instead of an array index, so it can't force-allocate a sparse array. See the `patternRule` row above for the matching ReDoS guard on the `pattern` rule.

### Form events

Subscribe via `form.on(event, callback)`. Returns an `EventSubscription` with `.unsubscribe()` — call it in `useEffect` cleanup. Events: `register` / `unregister`, `validating` (return `false` to abort), `validation`, `validControl` / `invalidControl`, `validControls` / `invalidControls` (debounced 0ms aggregate), `submitting`, `submit`, `resetting` / `reset`, `dirty`, `disable`.

Order during a normal submit: `validating` → per-control validation → `validation` → `validControls` or `invalidControls` → on invalid: `onError` prop → on valid: `submitting(true)` → `onSubmit` prop → `submit`.

> **`submit` may fire twice per user action** — once at the end of the sync submission flow and once when `submitting(false)` is called later. Listeners must be idempotent.

> **`validating` is the only event with veto power.** Returning `false` aborts the pipeline before any control validates.

---

## React Native

`react-native` is not a peer dependency; `NativeForm` renders a Fragment by default so it works without RN installed (useful for cross-platform component libraries). The Web-vs-RN table earlier in this README covers the two cross-platform caveats: `formControl.isVisible()` always returns `true`, and the DOM `focus` auto-touch listener is a no-op — set `formControl.isTouched = true` manually in `onFocus` if you want touched-state tracking.

```tsx
import { useFormControl, type FormControlProps } from "@mongez/react-form";
import { TextInput as RNTextInput, Text, View } from "react-native";

export function TextInput(props: FormControlProps) {
  const { value, changeValue, inputRef, formControl, error, disabled } =
    useFormControl(props);

  return (
    <View>
      <RNTextInput
        ref={inputRef}
        value={value}
        onChangeText={changeValue}                       // emits string directly — don't unwrap
        onFocus={() => (formControl.isTouched = true)}
        editable={!disabled}
      />
      {error && <Text style={{ color: "red" }}>{error}</Text>}
    </View>
  );
}
```

---

## Recipes

### Build a sign-up form with email + strong-password validation

Reach for this when you want the password-strength checklist UX users now expect. `strongRule` exposes per-criterion errors in `errorsList["strong.<key>"]` so the UI can paint each requirement red or green.

```tsx
function PasswordInput(props: FormControlProps) {
  const { value, changeValue, errorsList, otherProps } = useFormControl(
    { rules: [requiredRule, strongRule, matchRule], ...props },
    { validateAll: true } // expose every failing criterion, not just the first
  );
  const item = (key: string, label: string) => (
    <li style={{ color: errorsList[`strong.${key}`] ? "red" : "green" }}>{label}</li>
  );
  return (
    <div>
      <input type="password" value={value}
             onChange={(e) => changeValue(e.target.value)} {...otherProps} />
      <ul>
        {item("minLength", "At least 8 characters")}
        {item("uppercase", "Contains an uppercase letter")}
        {item("lowercase", "Contains a lowercase letter")}
        {item("digit",     "Contains a number")}
        {item("symbol",    "Contains a symbol")}
      </ul>
    </div>
  );
}

<Form
  onSubmit={async ({ values, form }) => {
    try { await api.signup(values); }
    catch (err) { showToast(err.message); }
    finally { form.submitting(false); }
  }}
>
  <TextInput name="email" type="email" required />
  <PasswordInput name="password" type="password" strong required />
  <PasswordInput
    name="passwordConfirm" type="password" strong required
    match="password" errorKeys={{ matchingInput: "Password" }}
  />
  <SubmitButton>Sign up</SubmitButton>
</Form>;
```

Criteria default to `{ minLength: 8, uppercase: true, lowercase: true, digit: true, symbol: true }`. Override per-instance with `<PasswordInput strong={{ minLength: 12, symbol: false }} />`.

> **Do not combine `strongRule` with a separate `minLengthRule`** — the criterion already covers length, you'd duplicate the error.

### Submit and disable while pending, re-enable on failure

Reach for this when your backend can fail and you don't want users locked out of resubmitting.

```tsx
<Form
  onSubmit={async ({ values, form }) => {
    try {
      const order = await api.checkout(values);
      navigate(`/orders/${order.id}`);
    } catch (err) {
      showToast(err.message);
    } finally {
      form.submitting(false); // <-- ALWAYS — never trust the happy path alone
    }
  }}
>
  <TextInput name="cardNumber" required />
  <SubmitButton>Pay now</SubmitButton>
</Form>;
```

`useSubmitButton`'s `disabled` flips back to `false` automatically once `submitting(false)` fires — no second `useState` in the button.

### Settings screen — only enable Save when something changed

Combine `isDirty` with the disabled state when an inert "Save" on an unchanged form would confuse users.

```tsx
function SaveButton() {
  const { disabled, isDirty, isSubmitting } = useSubmitButton();
  return (
    <button type="submit" disabled={disabled || !isDirty}>
      {isSubmitting ? "Saving..." : "Save changes"}
    </button>
  );
}

<Form
  defaultValue={{ profile: { name: user.name, bio: user.bio } }}
  onSubmit={async ({ values, form }) => {
    try { await api.updateProfile(values.profile); }
    finally { form.submitting(false); }
  }}
>
  <TextInput name="profile.name" required />
  <TextInput name="profile.bio" />
  <SaveButton />
</Form>;
```

### Multi-step wizard with `validateVisible()`

Reach for this when a long form is split across steps but lives in one `<Form>` instance (so values persist between steps without lifting state). Each input wrapper must attach `visibleElementRef`, and **inactive steps must stay mounted but `hidden`** — unmounted controls aren't validated.

```tsx
function TextInput(props: FormControlProps) {
  const { value, changeValue, visibleElementRef, error, otherProps } =
    useFormControl(props);
  return (
    <div ref={visibleElementRef}>
      <input value={value} onChange={(e) => changeValue(e.target.value)} {...otherProps} />
      {error && <span className="error">{error}</span>}
    </div>
  );
}

function Wizard() {
  const [step, setStep] = useState(0);
  const formRef = useRef<FormInterface>(null);

  const next = async () => {
    const form = formRef.current;
    if (!form) return;
    await form.validateVisible();
    if (form.isValid()) setStep((s) => s + 1);
  };

  return (
    <Form ref={formRef as any} onSubmit={({ values }) => api.complete(values)}>
      <fieldset hidden={step !== 0}><TextInput name="account.email" type="email" required /></fieldset>
      <fieldset hidden={step !== 1}><TextInput name="profile.firstName" required /></fieldset>
      <fieldset hidden={step !== 2}><TextInput name="billing.cardNumber" required /></fieldset>
      {step < 2
        ? <button type="button" onClick={next}>Next</button>
        : <button type="submit">Finish</button>}
    </Form>
  );
}
```

`validateVisible()` walks up `visibleElementRef.current` looking for a `hidden` ancestor.

### Username-availability check with an async per-instance validator

Reach for this when one field needs a server round-trip (uniqueness, slug, coupon code). Debounce upstream of the form, then return a promise from `validate`.

```tsx
const checkUsername = debounce(async (value: string) => {
  const res = await fetch(`/api/users/check?u=${encodeURIComponent(value)}`);
  return res.json(); // { available: boolean }
}, 300);

<TextInput
  name="username"
  required
  validate={async ({ value }) => {
    if (!value) return;
    const { available } = await checkUsername(value);
    if (!available) return "That username is taken";
  }}
/>;
```

The async function blocks downstream rules until it settles.

### Submit a profile with a nested address using dot-notation

Reach for this when your API expects nested JSON (or PHP-style `user[address][city]` form data).

```tsx
<Form
  defaultValue={{ user: { firstName: "John", address: { city: "Cairo", country: "Egypt" } } }}
  onSubmit={({ values }) => api.updateUser(values.user)}
>
  <TextInput name="user.firstName" required />
  <TextInput name="user.address.city" required />
  <TextInput name="user.address.country" required />
  <button type="submit">Save</button>
</Form>
```

For `multipart/form-data` (file uploads), swap `values` for `formData` — the same nested structure becomes bracket notation on the wire (`user[address][city]=Cairo`):

```tsx
onSubmit={({ formData }) => fetch("/api/profile", { method: "POST", body: formData })}
```

### Scroll to the first invalid input on validation failure

Reach for this on long forms where the first error might be off-screen by the time the user submits.

```tsx
function ScrollToFirstError() {
  const form = useForm();
  useEffect(() => {
    if (!form) return;
    const sub = form.on("invalidControls", (invalidControls) => {
      invalidControls[0]?.inputRef?.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      invalidControls[0]?.focus();
    });
    return () => sub.unsubscribe();
  }, [form]);
  return null;
}

<Form onSubmit={handle}>
  <ScrollToFirstError />
  {/* ... fields ... */}
</Form>;
```

Web-only — on RN, replace `scrollIntoView` with `scrollToIndex` / `measureLayout` on your `ScrollView` ref.

---

## Migrating to v4

Most apps upgrade with **no code changes**. Review these only if they apply:

- **`Form` / `NativeForm` are now function components.** A `ref` yields the React-free `FormEngine` (still assignable to `FormInterface`) instead of a class-component instance. All methods (`validate`, `values`, `submit`, `reset`, `on`, `control`, …) are unchanged — just update the ref type to `FormInterface` / `FormEngine`.
- **`BaseForm` is deprecated** — it's now an alias of `FormEngine` (removed in v5). To customize rendering, compose a thin function component that lazily instantiates a `FormEngine` (see `useFormEngine`) instead of subclassing `BaseForm`.
- **`formControl.validate()` may return a `Promise<ReactNode>`.** If you call it directly and inspect the result, `await` it (or handle the union) so async rules/schemas are covered. The built-in submit pipeline already awaits internally.
- **Async `onSubmit` no longer needs manual `form.submitting(false)`** — return the promise and the engine clears the state when it settles. Keep manual calls only for synchronous handlers (or when you swallow the error inside the handler).
- **Late-arriving edit data** belongs in the reactive `values` prop (or `form.fill(record)`), not `defaultValue` — `defaultValue` is strictly the reset baseline now.
- **SSR ids are automatic** via `useId()`; you can drop the static-`id` workaround that older versions needed to avoid hydration mismatches (still fine to keep for readable ids).
- **`validateOn` / `schema` no longer leak onto the DOM** — if you filtered them out of forwarded props yourself, you can drop that workaround.
- **`useId` renamed to `useControlId`.** `import { useId } from "@mongez/react-form"` no longer resolves — rename the import to `useControlId`; the return value and usage are unchanged. (The rename stops the package from shadowing React 18's own `useId`.)
- **`useValue`, `useError`, and `useChecked` hooks removed with no alias.** Replace them with `useFormControl(props)` (destructure `value`, `error`, `checked` from its return) or `useWatch(name)` for a reactive read outside a control.

---

## Related packages

| Package | Use when you need |
|---|---|
| [`@mongez/localization`](https://github.com/hassanzohdy/mongez-localization) | The translation engine the rule pipeline uses for error messages. Required transitively; register validation bundles via `extend("en", { validation: enValidationTranslation })`. |
| [`@mongez/events`](https://github.com/hassanzohdy/events) | The pub/sub engine behind `form.on(...)` and `formControl.onChange(...)`. Returned `EventSubscription` objects come from this package. |
| [`@mongez/reinforcements`](https://github.com/hassanzohdy/mongez-reinforcements) | Provides `get`, `debounce`, `toInputName` used by the form engine. |
| [`@mongez/supportive-is`](https://github.com/hassanzohdy/supportive-is) | Validation helpers including `isUrl` used by `urlRule`. |
| [`@mongez/cache`](https://github.com/hassanzohdy/mongez-cache) | Pluggable cache layer — pair with form `onSubmit` to memoize expensive validation results or persist draft autosaves. |

For the full single-file API reference, see [`llms-full.txt`](./llms-full.txt). For release history, see [`CHANGELOG.md`](./CHANGELOG.md).

---

## License

MIT
