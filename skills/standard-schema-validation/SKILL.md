---
name: mongez-react-form-standard-schema-validation
description: |
  Use when validating a @mongez/react-form form with a Standard Schema validator — zod, valibot, arktype, or @warlock.js/seal. Covers whole-form validation via <Form schema>, per-field schema, how issues map back to controls by path, the validateVisible interaction, onSubmit type inference, and the inference/helper exports. Zero runtime dependency: the library only duck-types the ~standard property.
---

# Standard Schema validation

Apply this skill when the user wants to validate a form against a schema object (zod / valibot / arktype / `@warlock.js/seal`) instead of, or alongside, the built-in `InputRule` system. v4 added **[Standard Schema](https://standardschema.dev)** interop with **no runtime dependency** — the engine only checks for the `~standard` property at runtime, so any compliant library works.

## Two entry points

| Where | What it validates | When it runs |
|---|---|---|
| `<Form schema={...}>` | the **whole** collected values object | on submit (inside `form.validate()`) |
| `useFormControl({ schema })` or the `schema` **prop** on a control | that **single** field's value | per control, like any rule (see below) |

Both accept the same kind of schema object. Use the whole-form schema when your validation lives in one place (a shared zod object you also reuse server-side); use per-field schemas when each input owns its own constraint.

## Whole-form: `<Form schema>`

```tsx
import { Form, type InferFormValues } from "@mongez/react-form";
import { v } from "@warlock.js/seal";

const signupSchema = v.object({
  email: v.string().email(),
  password: v.string().min(8),
  age: v.number().min(18),
});

export default function Signup() {
  const onSubmit = ({ values }: { values: InferFormValues<typeof signupSchema> }) => {
    // `values` is typed as the schema's inferred OUTPUT shape
    api.signup(values);
  };

  return (
    <Form schema={signupSchema} onSubmit={onSubmit}>
      <TextInput name="email" type="email" />
      <TextInput name="password" type="password" />
      <TextInput name="age" type="number" />
      <SubmitButton>Sign up</SubmitButton>
    </Form>
  );
}
```

With zod the schema is identical in spirit:

```tsx
import { z } from "zod";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

<Form schema={signupSchema} onSubmit={({ values }) => api.signup(values)}>
```

### How it runs and maps errors

1. On submit, the engine first validates each control with its own rules (built-ins, per-instance `validate`, per-field `schema`).
2. Then, if a whole-form `schema` is present, it runs the schema against `form.values()` (the dot-notation-nested object).
3. For each issue, the issue **path** is converted to a dot-notation control name (`["user", { key: "address" }, 0, "city"]` → `user.address.0.city`) and the matching control's `setError` is called with `issue.message`.

So a schema error on `email` lands under the `email` input's existing `error` rendering — no extra wiring.

### Issues for fields not being validated are ignored

The whole-form schema only applies issues to controls **in the subset currently being validated**. This matters for `form.validateVisible()` (multi-step wizards): if a hidden step's field is missing, the schema would normally complain, but since that control isn't in the validated subset, its issue is **dropped**. That keeps `validateVisible()` from failing on fields the user hasn't reached yet.

If an issue's path matches no registered control at all, it's silently ignored too (you'll want a whole-form-level error display for those, or keep schema fields aligned with control names).

## Per-field schema

Pass `schema` as a control prop, or via the `useFormControl` options bag inside a reusable wrapper:

```tsx
import { v } from "@warlock.js/seal";

// As a prop on a control built over useFormControl:
<TextInput name="email" schema={v.string().email()} />
```

```tsx
// Baked into a wrapper through the options bag:
function EmailInput(props: FormControlProps) {
  const { error, getInputProps } = useFormControl(props, {
    schema: v.string().email(),
  });
  // ...
}
```

The schema is wrapped as an async `InputRule` named `"schema"` and **appended last** in the control's rule pipeline (after the per-instance `validate` and the `rules` array). The first issue's message becomes the rendered error. The wrapping rule has `requiresValue: false`, so empty values are still handed to the schema — the schema's own `optional()` / `required` semantics decide.

Because it's an async rule, it participates in the v4 async gating (`isValidating`, stale-result discarding) like any promise-returning rule. See the **validation-rules** and **create-form-control** skills.

## Type inference and helpers

Exported from `@mongez/react-form` (re-exported from the `standard-schema` module):

| Export | Purpose |
|---|---|
| `InferFormValues<Schema>` | the schema's **output** (post-validation) shape — what `onSubmit` receives |
| `InferFormInput<Schema>` | the schema's **input** (pre-validation) shape — what controls collect |
| `StandardSchemaV1` | the vendored spec interface (also a namespace with `InferInput` / `InferOutput` / `Result` / `Issue` / `PathSegment`) |
| `isStandardSchema(value)` | runtime duck-type guard (`true` when `value["~standard"].validate` is a function) |
| `standardSchemaToRule(schema, name?)` | wrap a single-field schema as an `InputRule` (what the per-field path uses internally) |
| `runStandardSchema(schema, value)` | run a schema and get a normalized `{ value } | { issues }` (always a Promise) |
| `issuePathToName(path)` | convert a Standard Schema issue path to a dot-notation control name |

`FormProps<Schema>` is generic over the schema, so `<Form schema={...}>` flows the inferred type into `onSubmit`'s `values` automatically — you usually don't need to annotate `values` by hand:

```tsx
<Form
  schema={signupSchema}
  onSubmit={({ values }) => {
    // values: { email: string; password: string; age: number }
  }}
/>
```

## Choosing a library

Any Standard-Schema-compliant validator works because the engine only reads `~standard`:

- **`@warlock.js/seal`** — `v.object({ ... })`, `v.string().email()`, etc. (`vendor: "seal"`).
- **zod** (v3.24+) and **valibot** and **arktype** all expose `~standard` natively.

The package takes **no** dependency on any of them — install whichever you already use.

## Combining schema with built-in rules

You can use both: built-in rules + per-field `schema`, or built-in rules + whole-form `schema`. They run independently. Avoid validating the same constraint twice (e.g. don't put both `required` + `minLength` rules *and* a `v.string().min(...)` schema on the same field unless you want two messages) — pick one source of truth per constraint to keep error messages clean.

## Anti-patterns

- **Expecting whole-form schema issues on hidden fields to surface during `validateVisible()`** — they're intentionally dropped for controls outside the validated subset. Validate the full form (`form.validate()`) at the final submit if you need those.
- **Pointing schema keys at names no control uses** — those issues vanish silently. Keep schema field names aligned with control `name`s (dot-notation included).
- **Passing `schema["~standard"]` directly** — pass the schema object itself; the engine reads `~standard` for you.
