---
name: mongez-react-form-validation-rules
description: |
  Use when adding validation to form controls, choosing the right built-in rules, overriding error messages, or writing a custom rule. Covers the full rules list, the InputRule interface, async validation, per-instance message overrides via errors / errorKeys props, and the validateAll mode.
---

# Validation rules

Apply this skill whenever the user needs to validate input — whether by composing built-in rules or by writing new ones.

## How rules work

A rule is plain data: an `InputRule` object passed in the `rules` array to `useFormControl`. Each rule has a `validate` function that returns either:

- `undefined` / `null` → valid
- `ReactNode` → invalid, this is the error message
- `Promise<ReactNode | undefined>` → async; other rules block until it resolves

The hook runs rules in array order. The first failing rule short-circuits the rest, unless `{ validateAll: true }` is passed in the second argument.

## Built-in rules

All exported from `@mongez/react-form`. Each requires a corresponding prop on the input component.

| Rule | Required prop | Notes |
|---|---|---|
| `requiredRule` | `required` | Empty = null / undefined / "" / [] |
| `minLengthRule` | `minLength` | Strings and arrays |
| `maxLengthRule` | `maxLength` | Strings and arrays |
| `lengthRule` | `length` | Exact length |
| `minRule` | `min` | Numeric |
| `maxRule` | `max` | Numeric |
| `emailRule` | `type="email"` | |
| `numberRule` | `type="number"` | |
| `integerRule` | `type="integer"` | |
| `floatRule` | `type="float"` | |
| `urlRule` | `type="url"` | |
| `patternRule` | `pattern` (RegExp) | |
| `alphabetRule` | `type="alphabet"` | Letters only |
| `matchRule` | `match` (other input name) | Must equal that input's value |
| `strongRule` | `strong` (boolean or `StrongPasswordCriteria`); `type="password"` | Five composable criteria, per-criterion errors via `errorsList["strong.<key>"]` |

A rule with `requiresType: "X"` is only evaluated when the form control's `type` matches `X`. A rule with `requiresValue: true` (the default) is skipped when the value is empty — that's why `requiredRule` must be listed *before* other rules and is the only one with `requiresValue: false`.

## Composing rules in a reusable component

```tsx
import {
  useFormControl,
  requiredRule,
  minLengthRule,
  maxLengthRule,
  emailRule,
  type FormControlProps,
} from "@mongez/react-form";

export default function TextInput({
  rules = [requiredRule, minLengthRule, maxLengthRule, emailRule],
  ...props
}: FormControlProps) {
  const { value, changeValue, error } = useFormControl({ ...props, rules });
  // ...
}
```

A consumer activates each rule by passing the corresponding prop. Without the prop, the rule is a no-op.

## Overriding error messages per call

### Override the whole message

```tsx
<TextInput
  name="username"
  pattern={/^[a-zA-Z0-9]+$/}
  errors={{
    pattern: "Username must be letters and numbers only",
  }}
/>
```

`errors[ruleName]` replaces the message produced by that rule.

### Override a placeholder inside the default message

```tsx
<TextInput
  name="confirmPassword"
  match="password"
  errorKeys={{
    matchingElement: "Password",  // -> "This input is not matching with Password"
  }}
/>
```

`errorKeys` is consulted by rules for human-readable substitutions. The hook always populates `errorKeys.name` from `label`/`placeholder`/`name` and the message's `:input` placeholder is filled from it. `matchRule` additionally reads `errorKeys.matchingElement` to fill the `:matchingInput` placeholder. Numeric placeholders like `:length`, `:min`, `:max` are filled directly from the input's own props (`minLength`, `min`, `max`) and are not overridable via `errorKeys` — to change those values, pass a different prop; to change the surrounding text, replace the whole message via `errors[ruleName]` or override the locale bundle.

### Override globally via locale bundles

The package ships translation bundles (`enValidationTranslation`, `arValidationTranslation`, etc.) — extend or replace them via `@mongez/localization`'s `extend()` function. See `getting-started`.

## Writing a custom rule

```ts
import { trans } from "@mongez/localization";
import type { InputRule } from "@mongez/react-form";

export const phoneNumberRule: InputRule = {
  name: "phoneNumber",
  requiresType: "phoneNumber",   // only run when type="phoneNumber"
  requiresValue: true,           // skip on empty values
  validate: ({ value }) => {
    if (!/^01[0-2|5]{1}[0-9]{8}$/.test(value)) {
      return trans("validation.phoneNumber");
    }
  },
};
```

`InputRule` fields:

```ts
{
  name?: string;                        // rule identifier (used in errorsList and errors override)
  validate: (options) => ReactNode | undefined | Promise<...>;
  requiresValue?: boolean;              // default true: skip on empty value
  requiresType?: string;                // run only when formControl.type matches
  preservedProps?: string[];            // props NOT to forward via otherProps
  onInit?: (options) => EventSubscription | undefined;  // setup hook, runs once
}
```

`preservedProps` is important when the rule's required prop should NOT leak onto the DOM element (e.g. `pattern` for `patternRule` — you don't want `<input pattern=/.../>` rendered, since the hook handles validation, not the browser).

## Async validation (server-side check)

```tsx
const validateUsername = async ({ value }) => {
  if (!value) return;
  try {
    await api.checkUsernameAvailable(value);
  } catch (err) {
    return err.message;
  }
};

<TextInput name="username" validate={validateUsername} />
```

When the validator returns a Promise, subsequent rules wait for it to resolve, and the error message is set once the promise settles. Use the `validate` prop (per-instance) for one-off async checks, or wrap as an `InputRule` for reusable async logic.

## `validateAll` mode

Default: rules run in order, first failure wins, `error` is the single message.

`validateAll: true`: every rule runs, every error is captured in `errorsList`, and `error` becomes an array of all messages.

```tsx
const { error, errorsList } = useFormControl(
  { rules: [requiredRule, minLengthRule, patternRule], ...props },
  { validateAll: true }
);
// error is ReactNode[] now
```

Use when you want to show all violations at once (password strength meters, multi-criteria checklists).

## `strongRule` — composite password validation

`strongRule` is a meta-rule: one rule that validates five criteria and emits per-criterion errors into `formControl.errorsList` so callers can render password-strength meters / checklists without composing five separate rules.

### Activation

Activated by the `strong` prop. Requires `type="password"`.

```tsx
const { value, changeValue, errorsList } = useFormControl({
  ...props,
  rules: [requiredRule, strongRule],
});
```

```tsx
<PasswordInput type="password" strong />                          // all defaults
<PasswordInput type="password" strong={{ minLength: 12 }} />      // override one
<PasswordInput type="password" strong={{ symbol: false }} />      // disable one
```

### Default criteria

```ts
{
  minLength: 8,   // set to 0 to disable
  uppercase: true,
  lowercase: true,
  digit: true,
  symbol: true,
}
```

### Per-criterion error access

`formControl.errorsList` contains both the canonical `strong` entry (whatever the first failing message is, same as every other rule) **and** namespaced sub-entries:

```ts
errorsList["strong"]           // first failing message (consumed by hook → `error`)
errorsList["strong.minLength"] // populated only if length check failed
errorsList["strong.uppercase"] // populated only if uppercase check failed
errorsList["strong.lowercase"]
errorsList["strong.digit"]
errorsList["strong.symbol"]
```

A criterion that passes does NOT appear in `errorsList`. Use that to drive a checklist UI:

```tsx
{["minLength", "uppercase", "lowercase", "digit", "symbol"].map((key) => {
  const failing = Boolean(errorsList[`strong.${key}`]);
  return <li style={{ color: failing ? "red" : "green" }}>{labels[key]}</li>;
})}
```

### Customizing messages

`strongRule` writes its per-criterion messages directly from the localization bundle (via `trans("validation.strongMinLength", ...)` etc.) and does NOT consult the per-instance `errors` prop for individual criteria — `errors["strong.minLength"]` will not be picked up. To change per-criterion text, override the locale keys globally:

```ts
import { extend } from "@mongez/localization";

extend("en", {
  validation: {
    strongMinLength: "Needs at least :length chars",
    strongSymbol: "Add ! @ # $ or similar",
  },
});
```

Per-instance, you can replace the whole rule's first-message via `errors.strong` (this hits the generic `errors[ruleName]` path in the hook, which only sees the first failing message), but there is no per-criterion override at the prop level.

### Translation keys (all 6 locales)

`validation.strongMinLength` (with `:length` placeholder), `validation.strongUppercase`, `validation.strongLowercase`, `validation.strongDigit`, `validation.strongSymbol`.

### Anti-pattern

Don't combine `strongRule` with separate `minLengthRule` — they'll produce duplicate length errors. The `minLength` criterion inside `strongRule` already covers length checking for passwords.

## `onInit` hook for rules

`InputRule.onInit` runs once when the form control mounts. Useful for cross-control rules that need to subscribe to another input's events (e.g. `matchRule` re-runs when the input it depends on changes). The return value should be an `EventSubscription` that the hook will unsubscribe on unmount.

## Anti-patterns

- **Putting `requiredRule` after value-dependent rules** — they'll never run because they skip on empty values. Always list `requiredRule` first.
- **Embedding business validation in the input component** — pass it via the `validate` prop or as a reusable `InputRule`, never hardcode.
- **Returning `false` from `validate`** — the rule must return a `ReactNode` (string, JSX, etc.) for the error, not a boolean. `false` is truthy enough to look like an error but won't render anything.
