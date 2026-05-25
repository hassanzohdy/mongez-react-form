---
name: mongez-react-form-getting-started
description: Use when setting up @mongez/react-form for the first time in a Web or React Native project — covers installation, locale registration for validation messages, and the minimal "first form" snippet so a working baseline is in place before any other skill is invoked.
when_to_use: User is installing @mongez/react-form for the first time, asking how to set up a form in a new project, or asking why validation errors show as raw keys like "validation.required" instead of human-readable text.
---

# Getting Started with @mongez/react-form

Apply this skill when the user is integrating `@mongez/react-form` into a fresh project, or when they need to verify the baseline setup is in place before adding form controls / validation / submit logic.

## 1. Install

```bash
npm install @mongez/react-form
# or
yarn add @mongez/react-form
```

The package's runtime dependencies (`@mongez/events`, `@mongez/localization`, `@mongez/supportive-is`, `@mongez/reinforcements`) install transitively.

## 2. Register validation translations (one-time, at app entry)

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

If this step is skipped, validation will still run but errors will appear as raw translation keys (e.g. `validation.required`) instead of human-readable text.

## 3. Pick the right form component

- **Web** → import `Form` from `@mongez/react-form`. Renders an HTML `<form>` element. Submits via the standard browser submit event.
- **React Native** → import `NativeForm` from `@mongez/react-form`. Renders a Fragment by default (no host element). Submission is always programmatic.

Both expose the **same API** — the only differences are the rendered output and how submit is triggered.

## 4. Minimal first form (Web)

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

## 5. Verify the baseline

After completing steps 1–4, the user should be able to:

- Mount the form, type into both inputs, click Submit.
- See the `values` object logged with both names.
- Submit with an empty first name and see the localized "This input is required" error rendered inline.

If any of those fail, the likely cause is one of:

- Validation translations not registered → errors show as `validation.required` text.
- `name` prop missing on an input → it won't be collected into `values`.
- `<button>` placed outside the `<Form>` → click won't trigger form submission.

## Next skills to load

- **`create-form-control`** — patterns for text inputs, checkboxes, radios, multi-value controls, custom validation.
- **`submit-button`** — building a smart submit button with `useSubmitButton`.
- **`validation-rules`** — the rules system and writing custom rules.
- **`react-native-usage`** — switch from `Form` to `NativeForm` and wire `TextInput` from `react-native`.
