---
name: mongez-react-form-getting-started
description: |
  @mongez/react-form — headless React form primitives. useFormControl, validation rules, form events, submit-button state. Web + React Native compatible. v4 rebuilt the form on a React-free FormEngine class exposed via ref, with SSR-safe ids, async validation that gates submission, Standard Schema (zod/valibot/seal) interop, reactive hydration, field arrays, and useWatch. This page covers install, locale registration for validation messages, and the minimal first form.
---

# @mongez/react-form — Get started

Headless React form primitives. `useFormControl` wires any custom input into a typed form context; `<Form>` (Web) or `<NativeForm>` (React Native) collects values; validation rules emit localized error messages. No `Formik` ceremony, no `react-hook-form` ref management — just hooks that read and write to a shared form context.

> **v4 (major).** `Form` and `NativeForm` are now **function components** (`forwardRef`) built over a plain, React-free **`FormEngine`** class — the engine instance is what a `ref` to the form gives you. Ids are SSR-safe via React's `useId()`. The old abstract `BaseForm` React component is now a **deprecated alias for `FormEngine`** (kept through v4, removed in v5). See [migration notes](#migrating-from-v3) at the end.

## Highlighted features

<div class="mongez-highlights">

<div class="mongez-highlight" data-accent="ice">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
  <h3>Headless controls via <code>useFormControl</code></h3>
  <p>Build any input shape — text, checkbox, radio, multi-value — by reading <code>value</code>, <code>changeValue</code>, <code>error</code> from the hook. Your component stays in charge of rendering.</p>
</div>

<div class="mongez-highlight" data-accent="ice">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  <h3>Composable validation rules</h3>
  <p><code>rules: [requiredRule, emailRule]</code> — combine built-ins or write your own. Error messages render through <code>@mongez/localization</code> (six locales ship: en, ar, fr, es, it, de).</p>
</div>

<div class="mongez-highlight" data-accent="fire">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
  <h3>Dot-notation names</h3>
  <p><code>name="user.firstName"</code> auto-nests into <code>values.user.firstName</code> on submit. No flat-key gymnastics for nested forms.</p>
</div>

<div class="mongez-highlight" data-accent="fire">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  <h3>Smart submit-button state</h3>
  <p><code>useSubmitButton</code> exposes <code>isSubmitting</code>, <code>disabled</code>, <code>isDirty</code> — drop into your button without prop-drilling form state. (For the full snapshot use <code>useFormState()</code>.)</p>
</div>

<div class="mongez-highlight" data-accent="bolt">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
  <h3>Web + React Native</h3>
  <p><code>&lt;Form&gt;</code> renders a real HTML form; <code>&lt;NativeForm&gt;</code> renders a fragment and submits programmatically. Same hooks, same validation, same API.</p>
</div>

<div class="mongez-highlight" data-accent="bolt">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
  <h3>Form lifecycle events</h3>
  <p><code>onSubmit</code> / <code>onError</code> props, plus <code>form.on("change" | "submit" | "validControls" | "invalidControls" | "dirty" | "reset", …)</code> — wire side effects without rebuilding a context provider.</p>
</div>

<div class="mongez-highlight" data-accent="ice">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
  <h3>Async validation that gates submit</h3>
  <p>A rule may return a <code>Promise&lt;ReactNode&gt;</code> — the engine awaits it before submitting, while sync rules stay synchronous. <code>isValidating</code> exposes the in-flight state.</p>
</div>

<div class="mongez-highlight" data-accent="fire">
  <svg class="mongez-highlight-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
  <h3>Standard Schema interop</h3>
  <p><code>&lt;Form schema={...}&gt;</code> validates the whole form on submit with zod / valibot / <code>@warlock.js/seal</code> — zero runtime dependency, with <code>onSubmit</code> values fully typed from the schema.</p>
</div>

</div>

## Install

```sh
npm install @mongez/react-form
# or: yarn add @mongez/react-form
# or: pnpm add @mongez/react-form
```

Peer dep: `react >= 18`. Runtime deps install transitively: `@mongez/events`, `@mongez/localization`, `@mongez/supportive-is`, `@mongez/reinforcements`.

## Quick peek

```tsx
import { Form, useFormControl, requiredRule, emailRule } from "@mongez/react-form";

function TextInput(props) {
  const { value, changeValue, error, otherProps } =
    useFormControl({ ...props, rules: [requiredRule, emailRule] });
  return (
    <>
      <input value={value} onChange={(e) => changeValue(e.target.value)} {...otherProps} />
      {error && <span>{error}</span>}
    </>
  );
}

<Form onSubmit={({ values }) => api.signup(values)}>
  <TextInput name="email" type="email" required />
  <button type="submit">Sign up</button>
</Form>
```

Wrap your own input around `useFormControl`, drop it inside `<Form>`, get typed values on submit.

## Full setup steps

### 1. Register validation translations (one-time, at app entry)

Validation rules emit error messages through `@mongez/localization`. The translation bundles must be registered under the `validation` namespace before any form mounts. Do this once at the root of the app (typically `src/main.tsx` or `App.tsx`):

```ts
import { extend } from "@mongez/localization";
import {
  enValidationTranslation,
  arValidationTranslation,
} from "@mongez/react-form";

extend("en", { validation: enValidationTranslation });
extend("ar", { validation: arValidationTranslation });
```

Six locales ship: `en`, `ar`, `fr`, `es`, `it`, `de`. Register only those you need.

If this step is skipped, validation still runs but errors appear as raw translation keys (e.g. `validation.required`) instead of human-readable text.

### 2. Pick the right form component

- **Web** → import `Form` from `@mongez/react-form`. Renders an HTML `<form>` element. Submits via the standard browser submit event.
- **React Native** → import `NativeForm` from `@mongez/react-form`. Renders a Fragment by default (no host element). Submission is always programmatic.

Both expose the **same API** — the only differences are the rendered output and how submit is triggered.

### 3. Minimal first form (Web)

```tsx
import { Form, useFormControl, requiredRule, type FormControlProps } from "@mongez/react-form";

function TextInput(props: FormControlProps) {
  const { value, changeValue, id, error } = useFormControl({
    rules: [requiredRule],
    ...props,
  });

  return (
    <>
      <input id={id} value={value} onChange={(e) => changeValue(e.target.value)} />
      {error && <span style={{ color: "red" }}>{error}</span>}
    </>
  );
}

export default function App() {
  return (
    <Form onSubmit={({ values }) => console.log(values)}>
      <TextInput name="firstName" required />
      <TextInput name="lastName" />
      <button>Submit</button>
    </Form>
  );
}
```

The `name` prop on each `TextInput` becomes the key in the submitted `values` object. Dot notation (`user.firstName`) is supported and produces nested objects.

### 4. Verify the baseline

After completing steps 1–3, you should be able to:

- Mount the form, type into both inputs, click Submit.
- See the `values` object logged with both names.
- Submit with an empty first name and see the localized "This input is required" error rendered inline.

If any of those fail, the likely cause is one of:

- Validation translations not registered → errors show as `validation.required` text.
- `name` prop missing on an input → it won't be collected into `values`.
- `<button>` placed outside the `<Form>` → click won't trigger form submission.

### 5. SSR is safe by default (v4); pass a stable `id` when you need a deterministic one

v4 derives the `<Form>` wrapper id from React's **`useId()`** when you omit `id`, so the rendered `<form id="form-<react-id>">` attribute matches between the server render and the client hydration — **no hydration mismatch**, no manual id required. (In v3 the wrapper fell back to `Math.random()`, which differed across the two passes; that's fixed.)

You still want an explicit, stable `id` whenever you need the form's identity to be predictable rather than auto-generated:

```tsx
<Form id="signup" onSubmit={({ values }) => api.signup(values)}>
  <TextInput name="email" type="email" required />
  <SubmitButton>Sign up</SubmitButton>
</Form>
```

Rules of thumb:

- **Pass an `id` when you target the form** in tests, styles, or analytics — `useId()` produces opaque values like `form-:r3:`, while `id="signup"` renders the stable `signup` (and control ids such as `signup-email`).
- **Keep an explicit `id` unique on the page.** The id drives the engine's event prefix (`form.<id>`), so two forms sharing an `id` would cross-wire their events.
- **Inputs never need an `id`.** A control's id is derived from its form's id and its `name` (`<form-id>-<name>`, or `input-<name>` outside a form). Both are deterministic on the server and the client, and two forms on one page do not collide. Pass an explicit `id` only when you want a fixed value.

### 6. The engine behind the form (`FormEngine`)

A `ref` to `<Form>` / `<NativeForm>` resolves to the **`FormEngine`** instance (typed as `FormInterface`) — a plain, React-free class that owns registration, validation, value collection, dirty tracking, events, hydration, and the submit pipeline:

```tsx
import { Form, type FormInterface } from "@mongez/react-form";

const formRef = useRef<FormInterface>(null);

<Form ref={formRef} onSubmit={({ values }) => api.save(values)}>
  {/* ... */}
</Form>;

// later, imperatively:
formRef.current?.fill({ email: "a@b.co" });
formRef.current?.reset();
```

You rarely instantiate `FormEngine` yourself — the function components do it via `useFormEngine`. The deprecated `BaseForm` export is now just an alias for `FormEngine`; replace `extends BaseForm` usage with the function-component + engine pattern.

## Migrating from v3

- **`Form` / `NativeForm` are function components now.** If you held a `ref`, its type changed from the old `BaseForm` class instance to `FormEngine` (both satisfy `FormInterface`, so most code is unaffected).
- **`BaseForm` is deprecated.** It re-exports `FormEngine`. Subclassing it as a React component no longer works — subclass `FormEngine` and render a thin function component (mirror `useFormEngine`) for custom renderers.
- **Drop manual `id` workarounds for SSR.** The `useId()`-based default already fixes the v3 hydration mismatch.
- **`form.submitting(false)` is optional for awaited submits.** If `onSubmit` returns a Promise, the engine clears the submitting state when it settles. See [Submit button](../submit-button/).
- Everything else — `useFormControl`, rules, events, dot-notation names, `useForm`, `useSubmitButton` — keeps the same surface, plus new hooks (`useFieldArray`, `useWatch`) and new engine methods (`fill`, `setValues`, `setErrors`).

## Where to go next

- **[Create form control](../create-form-control/)** — patterns for text inputs, checkboxes, radios, multi-value controls, a11y prop bags, custom validation
- **[Form events](../form-events/)** — `change`, `submit`, `validation`, `dirty`, `reset` lifecycle hooks
- **[Submit button](../submit-button/)** — `useSubmitButton`, smart submit state, awaited-submit auto-clear
- **[Validation rules](../validation-rules/)** — built-in rules, async validation that gates submit, writing custom ones
- **[Standard Schema validation](../standard-schema-validation/)** — `<Form schema>`, per-field schema, type inference with zod / valibot / seal
- **[Form hydration](../form-hydration/)** — `values` prop, `form.fill` / `setValues` / `setErrors`, `defaultValue` as reset baseline
- **[Field arrays](../field-arrays/)** — `useFieldArray` for dynamic repeated rows
- **[Watching values](../watching-values/)** — `useWatch` for dependent fields and conditional UI
- **[React Native usage](../react-native-usage/)** — switching from `Form` to `NativeForm`
- **[Recipes](../recipes/)** — common patterns
