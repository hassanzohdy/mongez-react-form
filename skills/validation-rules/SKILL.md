---
description: Use when adding validation to form controls, choosing the right built-in rules, overriding error messages, or writing a custom rule. Covers the full rules list, the InputRule interface, async validation, per-instance message overrides via errors / errorKeys props, and the validateAll mode.
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
    matchingInput: "Password",  // -> "This input is not matching with Password"
  }}
/>
```

`errorKeys` replaces named placeholders (`:length`, `:matchingInput`, `:min`, etc.) inside the default localized message.

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

## `onInit` hook for rules

`InputRule.onInit` runs once when the form control mounts. Useful for cross-control rules that need to subscribe to another input's events (e.g. `matchRule` re-runs when the input it depends on changes). The return value should be an `EventSubscription` that the hook will unsubscribe on unmount.

## Anti-patterns

- **Putting `requiredRule` after value-dependent rules** — they'll never run because they skip on empty values. Always list `requiredRule` first.
- **Embedding business validation in the input component** — pass it via the `validate` prop or as a reusable `InputRule`, never hardcode.
- **Returning `false` from `validate`** — the rule must return a `ReactNode` (string, JSX, etc.) for the error, not a boolean. `false` is truthy enough to look like an error but won't render anything.
