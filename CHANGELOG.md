# Changelog

All notable changes to `@mongez/react-form` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.0.0] — 2026-08-18

Major rewrite. The form's logic now lives in a **React-free `FormEngine` class**, and `Form` / `NativeForm` are **function components** built over it. Most apps upgrade with no code changes; the breaking items below are narrow. A migration guide follows the change lists.

### Added

- **`FormEngine`** — a plain, platform-agnostic class (not a `React.Component`) that owns all form logic: registration, validation, value collection, dirty tracking, events, hydration, and the submit pipeline. It implements `FormInterface` and can be unit-tested in isolation. `Form` / `NativeForm` hold one in a ref and expose it via `ref`.
- **Function-component `Form` and `NativeForm`** (`forwardRef`). The engine instance is reachable through the component `ref` (`useImperativeHandle`), so `ref.current` is a `FormEngine` / `FormInterface`.
- **Standard Schema support** (zero runtime dependency — schemas are duck-typed on the `~standard` property, so `@warlock.js/seal`, `zod`, `valibot`, `arktype`, … all work without being imported):
  - **Whole-form**: `<Form schema={...}>` validates the collected values on submit; each issue is mapped back to its control by `issue.path` → dot-notation name → `control.setError`. Issues whose control is **not** in the validated subset are ignored, so `validateVisible()` won't fail on hidden fields.
  - **Per-field**: `useFormControl({ schema })` (or `options.schema`) wraps the schema as an `InputRule` appended last in the control's pipeline.
  - **Type inference**: `FormProps<Schema>` types `onSubmit`'s `values` as the schema's inferred output. New helpers exported from `standard-schema`: `InferFormValues`, `InferFormInput`, `StandardSchemaV1`, `isStandardSchema`, `standardSchemaToRule`, `runStandardSchema`, `issuePathToName`.
- **Reactive hydration**: `<Form values={...}>` re-hydrates already-mounted controls when its object identity changes and seeds later-mounting controls (`engine.hydrationValues`, read via `form.getInitialValue(name)`). New engine helpers: `form.fill(values, { dirty?: false, validate?: false })`, `form.setValues(...)` (alias of `fill`), and `setDefaultValue(...)` (re-hydrates only pristine, non-dirty controls). `defaultValue` stays the reset baseline.
- **`form.setErrors({ "dot.name": message })`** — bulk server-error mapping (e.g. an HTTP 422 response) onto controls by dot-notation name; names with no matching control are ignored.
- **`useFieldArray(name)`** → `{ fields: [{ key, index, name }], append, prepend, remove, insert, move, swap, replace }`. Stable keys survive reordering/removal; input names derive from each row's index so the form collects the rows as an array.
- **`useWatch()`** — reactive value reads: `useWatch()` (whole values object), `useWatch(name)` (one control), `useWatch(names[])` (several). Re-renders on any control change or form reset.
- **`validateOn` modes** — `"change" | "blur" | "submit"`, resolved per-control prop > `<Form validateOn>` > `setFormConfigurations({ validateOn })` global > `"change"`. `"blur"` / `"submit"` still revalidate on change once the field has errored or the form has been submitted. New hook return `onBlur`; new engine flag `wasSubmitted`.
- **Accessibility helpers** on `useFormControl`: `getInputProps(overrides)` returns a complete prop bag (`id`, `name`, `value`/`checked`, `onChange`, `onBlur`, `ref`, `disabled`, `aria-invalid`, `aria-required`, `aria-describedby`), `getErrorProps()` returns `{ id, role: "alert", "aria-live": "polite" }`, plus `errorId`.
- **Awaited submit**: when `onSubmit` returns a Promise, the engine auto-clears the submitting state once it settles (success **or** failure) — no manual `form.submitting(false)` needed. Synchronous `onSubmit` behaves as before.
- **`isValidating`** — new in-flight async-validation flag, exposed on `FormControl`, on the engine's per-control state, and on the `useFormControl` hook return.
- **Form-level `"change"` event** — the engine now emits a single `change` event on every control change (consumed by `useWatch`).
- **SSR-safe form id** via React `useId()` (see Fixed).
- **Default English validation messages ship out of the box.** Importing the package registers the English `validation` bundle once (overridable by your own `extend("en", …)` at app entry), so errors render as readable text with **zero setup** instead of raw keys like `validation.required`.
- **`useFormState()`** — a one-stop reactive snapshot of form-level state: `{ isValid, isDirty, isSubmitting, isSubmitted, isValidating, formErrors }` (the `isValidating` here is the form-level aggregate across controls).
- **`<Form focusFirstError>`** — opt-in: moves focus to the first invalid control after a failed validation/submit.
- **`form.formErrors`** — form-level error messages with no owning control. Whole-form schema issues with a root/empty path (cross-field errors like "passwords don't match") now land here and block submission instead of being silently dropped.
- **`form.reset(values?)`** — reset to a new baseline (merged into `defaultValue`), e.g. after saving an edit form.
- **`form.validate(names?)`** — validate a subset by control name (in addition to passing `FormControl[]`).
- **`form.isDisabled()`** and **`enable()`** on the public `FormInterface`; **`form.control(...).onClear(cb)`** to observe `clear()`.
- **Next.js App Router support**: the client-only components and hooks now ship a `"use client"` directive at the leaf-module level, so they can be imported into a Server Component tree without the consumer marking their own file. Pure exports (rules, types, `standard-schema` helpers, `configurations`, `locales`, `FormEngine`) stay server-importable.
- **`"sideEffects"` allowlist** in `package.json` so the default-locale registration (`locales/register-defaults`) survives tree-shaking while the rest of the package stays tree-shakeable.

### Fixed

- **Async validation now genuinely gates submission.** `formControl.validate()` resolves the rendered error before submit proceeds, so a failing async rule blocks `onSubmit`. A sync-fast-path keeps purely-synchronous rules synchronous (no added microtask) and goes async only when a rule returns a Promise. Stale async results are discarded via a per-control monotonic sequence token (`validationSeq`).
- **`validateOn` no longer leaks onto the DOM.** `validateOn` (and `schema`) are destructured out of the props forwarded to the host element, so they no longer appear as unknown attributes on the rendered `<form>` / `<input>`.
- **SSR form-id hydration mismatch fixed.** The id now comes from `useId()` (`form-<id>`) instead of a construction-time `Math.random()` (`frm-<random>`), so the server and client render the same `id` attribute.
- **`removeFromFormsList` leak fixed.** Unmounting a form now removes it from the active-forms registry (`FormEngine.destroy()` calls both `removeActiveForm` and `removeFromFormsList`), so torn-down forms no longer linger in the global map.

### Security

- **Prototype pollution through dot-notation field names** (`src/engine/FormEngine.ts:1048`). Collecting values expanded a control's dot-notation `name` into nested objects by assigning into plain `{}` accumulators, so a control named `__proto__.isAdmin` (or `constructor.prototype.isAdmin`) wrote through to `Object.prototype` the moment the form's values were gathered. Field names are usually author-written, but not always: schema-driven and CMS-driven forms build them from server data, and a rendered form is exactly the kind of surface where "just data" becomes a name. Those key segments are now rejected, and the partial branch built before the rejected segment is discarded rather than left behind on the result.
- **ReDoS in the `pattern` rule** (`src/rules/pattern.ts`). The pattern was compiled to a fresh `RegExp` on **every keystroke** (no caching), and both the pattern and the value it ran against were unbounded — a catastrophically-backtracking pattern from server- or CMS-driven field config would pin the browser's main thread on a long input. Compiled patterns are now cached by source+flags, the pattern source is capped at 200 characters, a value over 2000 characters **fails the rule** rather than being truncated and matched (truncating first would let an anchored pattern like `^[0-9a-f]+$` pass on a valid prefix with an arbitrary tail), and an oversized or syntactically-invalid pattern **fails safe**: validation is skipped rather than blocking the user on what is a configuration problem, not their input.
- **Sparse-array memory blow-up via numeric field-name segments** (`src/engine/FormEngine.ts`, `createNestedObjectFromDotNotation`). A control named e.g. `items.4000000000.x` produced an array with `length` in the billions, which could exhaust memory or pin the main thread the first time the collected values were iterated or serialized. Numeric name segments above 10,000 are now treated as a plain object key instead of an array index.

### Changed / BREAKING

- **`Form` and `NativeForm` are now function components.** A `ref` on either yields the `FormEngine` (still assignable to `FormInterface`) rather than a class-component instance. If you relied on class-component semantics (e.g. subclassing the rendered component, calling React lifecycle methods on the ref), see the migration guide.
- **`BaseForm` is deprecated** and is now a type/value alias for `FormEngine`, kept for one major version (removed in v5). Custom renderers should subclass / compose `FormEngine` instead of subclassing `BaseForm`.
- **`formControl.validate()` now returns `ReactNode | Promise<ReactNode>`** (the engine's `FormControl.validate()` is typed `Promise<ReactNode>`). Code that treated the old return value as a synchronous error must `await` it (or handle the union) when an async rule or schema is in play.
- **`defaultValue` clarified as the reset baseline.** It seeds controls and is what `form.reset()` restores to. For data that arrives after mount (edit forms), use the reactive `values` prop or `form.fill()` instead — `defaultValue` is no longer the right tool for late-arriving values.
- **`useId` renamed to `useControlId`**, to stop shadowing React 18's own `useId`. `import { useId } from "@mongez/react-form"` no longer resolves.
- **`useValue`, `useError`, and `useChecked` hooks removed** with no alias. Use `useFormControl` (or `useWatch` for reactive reads) instead.

### Migration guide

Most apps need **no changes**. Review these only if they apply:

1. **Refs to `<Form>` / `<NativeForm>`.** The ref is now a `FormEngine` (typed `FormInterface`). All the existing methods (`validate`, `values`, `submit`, `reset`, `on`, `control`, …) are unchanged. Update any `ref` type annotations from the old class component to `FormInterface` (or `FormEngine`).
2. **`BaseForm` subclasses / imports.** `BaseForm` still imports and still works (it's an alias for `FormEngine`) but is deprecated. To customize rendering, render a thin function component that lazily instantiates a `FormEngine` (see `useFormEngine`) instead of subclassing `BaseForm`. Plan to migrate before v5.
3. **Manual `formControl.validate()` callers.** It may now return a `Promise`. If you call it directly and inspect the result, `await` it (or branch on the union) so async rules and schemas are handled. The built-in submit pipeline already awaits internally.
4. **Async submit handlers.** If your `onSubmit` is async, you can delete manual `form.submitting(false)` calls — the engine clears the submitting state when the returned Promise settles. (Keep them only if `onSubmit` is synchronous and you toggle submitting yourself.)
5. **Late-arriving form data (edit forms).** If you were stuffing fetched records into `defaultValue` after mount and expecting controls to update, switch to the reactive `values` prop (or call `form.fill(record)`). `defaultValue` is now strictly the reset baseline.
6. **Custom inputs forwarding all props to the DOM.** `validateOn` and `schema` are now stripped before forwarding, so if you previously filtered them yourself you can drop that workaround.
7. **`import { useId } from "@mongez/react-form"`.** Rename the import to `useControlId`; the return value and usage are unchanged.
8. **`useValue` / `useError` / `useChecked` imports.** These hooks are gone. Replace them with `useFormControl(props)` (destructure `value`, `error`, `checked` from its return) or `useWatch(name)` for a reactive read outside a control.

## [3.4.8] — 2026-06-18

### Docs

- **SSR: pass a static `id` to every `<Form>`.** Documented that an omitted `id` makes `<Form>` generate a random `frm-<random>` id at construction (via `Math.random()`), which differs between the server render and the client hydration and triggers a React hydration mismatch. A stable, unique `id` per form makes the rendered `<form id="form-…">` attribute deterministic on both sides. Added to the getting-started skill, `llms.txt`, and `llms-full.txt`. Input ids are already SSR-safe (derived from `name` as `input-<name>`), so only the `<Form>` wrapper needs an explicit id.
- Refreshed the **getting-started skill** into the highlight-cards format used across the other `@mongez` package skills — feature highlights, a 30-second quick peek, and step-by-step setup.
- Trimmed the `TRIGGER` / `SKIP` auto-trigger lines from every skill's frontmatter `description`, leaving one concise description per skill.

## [3.4.7] — 2026-05-27

### Docs

- Rewrote `README.md` from a ~2800-line tutorial into a ~500-line dense reference: top-of-file pitch, a 30-second tour, one canonical pattern per hook/component, a table-driven rule reference, and recipe-driven sections for submit flows, multi-step forms, React Native, and the `BaseForm` extension path. The exhaustive API reference now lives in `llms-full.txt`, which the README links to.

### Tests

- Added a Vitest suite (`vitest.config.ts` with happy-dom and sibling-package source aliasing, plus `src/__tests__/setup.ts` registering the English validation translations). Coverage spans value collection and dot-notation nesting into objects/arrays, `ignoreEmptyValues`, form-level vs control-level `defaultValue` precedence, `HiddenInput`, id derivation, every built-in rule (including the composite `strongRule` per-criterion errors), submit-button state, the form-events lifecycle, `NativeForm`, and the active-forms registry.

### CI

- Added `.github/workflows/test.yml` — Node 18/20/22 on Ubuntu, Node 20 on Windows, plus a Node 20 job pinned to React 19 to surface concurrent-rendering regressions early.

### Changed

- Declared `@mongez/reinforcements` as an explicit `dependencies` entry (it was already imported by `BaseForm`/`useFormControl` and resolved transitively).
- Raised `peerDependencies.react` from `>=16.8.0` to `>=18.0.0` to match the tested matrix.
- Cleaned `keywords` — removed marketing-only entries (`material-io`, `semantic`, `formik`) and added `react-native`, `headless`.

### Fixed

- `integerRule` — the predicate now uses `||` instead of `&&`, so numeric-but-non-integer inputs like `"3.14"` are correctly rejected (previously they passed as valid integers).
- `maxRule` — replaced the falsy short-circuit (`!value`) with an explicit empty check, so a numeric `0` is validated instead of skipped.
- `useFormControl` `onInit` effect — no longer re-runs on every render: the latest props are read through a ref, and the `rules` dependency is a stable name-based key, so consumers passing fresh `rules={[...]}` literals don't retrigger subscriptions each commit.
- `reset()` — now clears `formControl.isDirty` before writing the value (via a new `dirty: false` change option), so the per-control listener sees the cleared flag and the aggregate `dirty(false)` event fires as expected.

## [3.4.6 and earlier] — Earlier releases

Per-release notes for 3.4.6 and earlier predate this changelog format. The full version history is available via the git tags and [GitHub releases](https://github.com/hassanzohdy/mongez-react-form/releases).
