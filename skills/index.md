---
description: "Headless React form engine: field registration, validation rules, submit state, field arrays and watched values. Exports `Form`, `FormEngine`, `useFormControl`, `useForm`, `useWatch`, `useFieldArray`, `useSubmitButton`, `useFormState`, `requiredRule`, `emailRule`, `standardSchemaToRule`, `setFormConfigurations`. Use for: \"build a form in React\", \"custom input component\", \"validate required or email field\", \"repeatable fields\", \"watch a field value\", \"disable submit while submitting\", \"React Native form\". Not this package: defining validation schemas (server or shared validation) → @warlock.js/seal; it plugs in via Standard Schema."
---
# @mongez/react-form

Headless: it owns state, validation and submission, and you own the markup. `Form` creates a `FormEngine` and exposes it by context; each input wraps `useFormControl` to register itself, so any UI kit or native input can join.

## The 80% path
1. Start with `getting-started.md`.
2. Build a reusable field with `create-form-control.md`.
3. Add per-field rules (`validation-rules.md`) or a whole schema (`standard-schema-validation.md`).
4. Dynamic and dependent UI: `watching-values.md`, `field-arrays.md`.
5. Submission: `submit-button.md`; lifecycle hooks: `form-events.md`.
6. Prefilling and server data: `form-hydration.md`; React Native: `react-native-usage.md`; examples: `recipes.md`.

## Conventions and pitfalls
- Every input must go through `useFormControl`, or the form never sees its value.
- Field names use dot notation and become nested objects in the submitted values.
- `useWatch` (no name, one name or a list) re-renders the calling component on any form change, not only the watched field; for a hot form see `watching-values.md` for a raw `change` subscription.
- Rules are for field-level checks. For shared or backend-consistent validation, write a schema in @warlock.js/seal and adapt it.
- Set app-wide defaults once with `setFormConfigurations`, not per form.
