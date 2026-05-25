# Change Log

## Unreleased

### Docs

- **Rewrote `README.md`** from a 2800-line tutorial walkthrough to a ~500-line
  dense reference that mirrors the style of `@mongez/react-atom`:
  top-of-file pitch, a 30-second tour, a single canonical pattern for each
  hook/component, table-driven rule reference, and recipe-driven sections
  for SSR-style submit flows, multi-step forms, React Native usage, and the
  `BaseForm` extension path. Typos, dated examples, and code-block syntax
  errors in the old README are gone.
- The exhaustive API reference moved to `llms-full.txt` (already present);
  the README now points at it.

### Tests

- Added `vitest.config.ts` (happy-dom, sibling-package source aliasing for
  monorepo development, `node_modules` fallback in CI) matching the
  `@mongez/react-atom` configuration.
- Added `src/__tests__/setup.ts` that registers the English validation
  translations once, so tests assert on real localized error strings.
- Added a meaningful test suite under `src/__tests__/`:
  - `useFormControl.test.tsx` — value collection, dot-notation nesting
    into objects + arrays, `ignoreEmptyValues`, form-level vs control-level
    `defaultValue` precedence, `HiddenInput`, id derivation, required /
    email / per-instance custom validation, `preservedProps`, `errors`
    override, checkbox collection (checked + unchecked).
  - `submitButton.test.tsx` — initial enabled state, disable-on-invalid,
    intentional stay-disabled after a valid submit (double-submit guard),
    re-enable on `submitting(false)`, `disable()` round-trip.
  - `formEvents.test.tsx` — `register` / `unregister` lifecycle, `validating`
    / `validation` payloads, `validating` veto via `return false`,
    `invalidControls` event, `dirty(true)` propagation.
  - `nativeForm.test.tsx` — Fragment default, `component` host wrapping,
    programmatic `submit()` runs validation and gates `onSubmit`.
  - `rules.test.tsx` — every built-in rule with at least one
    rejection + one acceptance case, including the composite `strongRule`
    per-criterion errors in `errorsList["strong.<key>"]` and the
    `strong={{ symbol: false }}` opt-out.
  - `activeForm.test.tsx` — `getActiveForm()` / `getForm(id)` and the
    stack-restoration behavior on unmount.

### CI

- Added `.github/workflows/test.yml` matching the `@mongez/react-atom`
  matrix: Node 18/20/22 on Ubuntu, Node 20 on Windows, plus a Node 20
  Ubuntu job pinned to React 19 to surface concurrent-rendering or new-API
  regressions early.

### Package

- `package.json`:
  - Added `test` / `test:watch` scripts.
  - Added `@mongez/reinforcements` as an explicit `dependencies` entry
    (was already being imported by `BaseForm`/`useFormControl` and shipped
    via transitive resolution — now declared).
  - Updated `peerDependencies.react` from `>=16.8.0` to `>=18.0.0` to
    match the supported test matrix. The runtime code does not currently
    require any React-18-only API surface, but lower versions are not
    tested and are considered out of scope going forward.
  - Updated dev dependencies for the test stack: `vitest`, `happy-dom`,
    `@testing-library/react`, `@testing-library/dom`, `@vitejs/plugin-react`,
    `react-dom`, `@types/react`, `@types/react-dom`, `typescript`.
  - Removed marketing-only `keywords` entries (`material-io`, `semantic`,
    `formik`); kept the substantive ones and added `react-native`,
    `headless`.

### Fixed

- `src/rules/integer.ts:8` — predicate now uses `||` instead of `&&`.
  Previously `isNaN(Number(value)) && !Number.isInteger(Number(value))`
  short-circuited for numeric-but-non-integer inputs like `"3.14"`
  (because `isNaN` returned `false`), letting them pass as valid
  integers. The OR form fails both non-numeric AND non-integer values.
- `src/rules/max.ts:8` — replaced the falsy short-circuit (`!value`)
  with an explicit empty check
  (`value === null || value === undefined || value === ""`). The old
  guard treated numeric `0` as "no value" and skipped validation,
  which was logically wrong even if not exploitable in the common case.
- `src/hooks/useFormControl.ts:484` — `onInit` effect no longer lists
  `props` (a fresh object every render) in its deps. A `useRef` holds
  the latest props, so the effect reads them without rerun pressure.
- `src/hooks/useFormControl.ts:484` — `rules` dep replaced with a
  stable string key (`rules.map(r => r.name ?? '__anonymous_<i>').join('|')`).
  Consumers passing a fresh `rules={[...]}` literal each render no longer
  retrigger `onInit` subscriptions on every commit.
- `src/components/BaseForm.ts:354-367` /
  `src/hooks/useFormControl.ts:376-396` — `reset()` now clears
  `formControl.isDirty` BEFORE calling `change()`, and `change()`
  honours a new `dirty: false` option so the value write does not flip
  the flag back to `true`. The `BaseForm` per-control listener now
  sees `isDirty === false` when the change event fires, pops the
  control out of `dirtyControls`, and the aggregate `dirty(false)`
  event is fired as expected.
- `src/hooks/useFormControl.ts:486` — local `events: EventSubscription[]`
  renamed to `subscriptions` so it no longer shadows the imported
  `events` module from `@mongez/events`. Cosmetic — no behaviour change.

### Bugs noticed (still not fixed in this pass)

- `src/hooks/useFormControl.ts:268` — `requiresValue` skip condition
  uses `[undefined, null, ""].includes(formControl.value)`; the
  rule-level guards now use the same shape but the duplication remains.
  Could be consolidated to a single shared helper.

### React-18 tearing risk (still flagged, not fixed)

- `useSubmitButton` — uses the `useState + useEffect(on(event, ...))`
  pattern, the same shape as the recently-fixed bugs in
  `@mongez/react-atom`. The proper fix is `useSyncExternalStore`.
  Deliberately not refactored in this pass to keep the diff scoped;
  flagged here as a known concurrent-rendering hazard.
- `useFormControl` per-control state — held in component-local
  `useState` (lines 120, 126, 303) AND on the `formControl` object
  that lives in a `useMemo([])`. The two sources are kept in sync via
  `setState` after every change. In a concurrent render where a control
  mutates `formControl` synchronously (e.g. an action handler calling
  `form.change(name, value)`) between two reads in the same commit,
  sibling subscribers reading via `formControl.<x>` see the new value
  while the component reading via React state still sees the previous
  one. This is a real tear vector under concurrent mode but does not
  yet have a reproducer test — flagged here, not fixed.

## V3.0.0 (25 Aug 2024)

- Introduced new hook [useRadioInput](./README.md#useRadioInput)
- extracted validation translation objects to separate objects (needs to be imported manually)
- Enhanced `useFormControl` performance, reduced unnecessary re-renders
- Added `isInvalid` prop to `useFormControl` hook return output
- Allowed validation rules to be all executed or fails on first error
- New `errorsList` object is returned from `useFormControl` hook to return each rule with its rule name and error message
- Form component now can accept [defaultValue Object](./README.md#formDefaultValue) to initialize value for form fields
- New Structure for [validation rules](./README.md#validation-rules) to be more readable and maintainable
- Validation rules now can be synced and `async` functions

## V2.1.0 (05 Nov 2023)

- Added `isDirty` to form control.
- Added `isTouched` to form control.

## V2.0.0 (05 Mar 2023)

- Refactored code
- Replaced `useFormInput` with `useFormControl`
- Changed `onSubmit` callback options.
- Added `useSubmitButton` hook.
- Validation rules are now internally added in the package.
- Added `English` `Arabic` `French` `Italian` and `Spanish` translations.

## V1.5.25 (13 Nov 2022)

- Feat: when `validating` trigger callbacks returns `false` then the form will be marked as invalid and won't be submitted.

## V1.5.20 (06 Nov 2022)

- Added `formControl.element` to get the form control element.
- Added `formControl.isChecked` to check if the form control is checked or not.
- Added `formControl.blur` to blur the form control.
- Added `formControl.isHidden` to check if the form control is hidden or not.

## V 1.5.12 (17 Aug 2022)

- Added `checkIfIsValid` method to form interface

## V 1.5.11 (17 Aug 2022)

- Fixed form `validControls` and `invalidControls` validation events trigger.

## V 1.5.3 (12 July 2022)

- Fixed form control reset value.

## V 1.5.2 (12 July 2022)

- Fixed form submission.

## V 1.5.1 (12 July 2022)

- Fixed exclude props.

## V 1.5.0 (12 July 2022)

- Added Active Forms.
- Fixed some bugs.

## V 1.4.0 (09 July 2022)

- Added `validate` prop to form control.
- Added `errors` prop to form control.

## V 1.3.0 (03 July 2022)

- Added Form Control Events.

## V 1.2.4 (18 Jun 2022)

- Fixed form input registering.

## V 1.2.3 (18 Jun 2022)

- Fixed `disable` method.

## V 1.2.2 (17 Jun 2022)

- Fixed `each` method.

## V 1.2.1 (15 Jun 2022)

- `validate` and `validateVisible` methods return the validated form controls.

## V 1.2.0 (15 Jun 2022)

- Fixed `validate` method to allow calling it without any parameters.
- Added validateVisible method

## V 1.1.0 (16 May 2022)

- Added `change` form event.
- Added Dirty Form Controls.
- Added useFormEvent Hook

## V 1.0.11 (04 Mar 2022)

- Fixed Bugs

## V 1.0.7 (26 Jan 2022)

- Fixed Filtering form controls in `each` method.
