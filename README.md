# @mongez/react-form

> Headless React form handler for Web and React Native. `<Form>` / `<NativeForm>` own the state, validation, and value collection; you own the rendering. Same `useFormControl` hook on both platforms, a localized rule system, dot-notation `name` props that nest into objects, dirty/touched tracking, async validators, and a class-based engine (`BaseForm`) you can subclass for any other renderer.

## Install

```sh
yarn add @mongez/react-form
# peer: react >= 18
```

Runtime deps install transitively: `@mongez/events`, `@mongez/localization`, `@mongez/supportive-is`, `@mongez/reinforcements`.

## A 30-second tour

```tsx
import { extend } from "@mongez/localization";
import {
  Form,
  useFormControl,
  useSubmitButton,
  requiredRule,
  emailRule,
  enValidationTranslation,
  type FormControlProps,
} from "@mongez/react-form";

// 1. Register validation messages once at app entry (otherwise errors render as keys).
extend("en", { validation: enValidationTranslation });

// 2. Build a thin UI wrapper around useFormControl — this is YOUR component.
function TextInput(props: FormControlProps) {
  const { value, changeValue, id, error, inputRef, otherProps } =
    useFormControl({ rules: [requiredRule, emailRule], ...props });

  return (
    <>
      <input id={id} ref={inputRef} value={value}
             onChange={(e) => changeValue(e.target.value)} {...otherProps} />
      {error && <span className="error">{error}</span>}
    </>
  );
}

// 3. SubmitButton auto-disables while invalid or in-flight.
function SubmitButton({ children }: { children: React.ReactNode }) {
  const { disabled, isSubmitting } = useSubmitButton();
  return <button type="submit" disabled={disabled}>{isSubmitting ? "..." : children}</button>;
}

// 4. Drop them into a Form. `values` is collected by name, dot-notation supported.
<Form onSubmit={({ values, form }) =>
  api.signup(values).catch(() => form.submitting(false))
}>
  <TextInput name="user.firstName" required />
  <TextInput name="user.email" type="email" required />
  <SubmitButton>Sign up</SubmitButton>
</Form>
```

## What's in the box

| Export | Purpose |
|---|---|
| `<Form>`, `<NativeForm>` | Concrete form components — Web (`<form>` element) / React Native (Fragment by default). |
| `BaseForm` | Abstract engine. Subclass to support any other React renderer. |
| `useFormControl` | Register an input. Returns `value`, `changeValue`, `error`, `checked`, `inputRef`, `formControl`, `otherProps`, ... |
| `useForm` | Returns the active form from any descendant (`FormInterface \| null`). |
| `useSubmitButton` | Subscribes to form events; returns `disabled` / `isSubmitting` / `isDirty`. |
| `useRadioInput` | Per-radio child of a `RadioGroup` that owns one `useFormControl`. |
| `RadioGroupContext` | Context the radio group provides to its children. |
| `HiddenInput` | `useFormControl(props)` + `return null;` — for csrf / hidden ids. |
| `getActiveForm`, `getForm(id)` | Module-level form lookup. Last-mounted form is "active". |
| `setFormConfigurations` | Global flags (`ignoreEmptyValues`, `formComponent`). |
| `*ValidationTranslation` | Locale bundles (`en`, `ar`, `fr`, `es`, `it`, `de`). |
| Built-in rules | `requiredRule`, `minLengthRule`, `maxLengthRule`, `lengthRule`, `minRule`, `maxRule`, `emailRule`, `numberRule`, `integerRule`, `floatRule`, `urlRule`, `alphabetRule`, `patternRule`, `matchRule`, `strongRule`. |

For the dense API reference, see [`llms-full.txt`](./llms-full.txt). The rest of this README is recipe-driven.

## Picking a form component

- **Web** → `Form`. Renders `<form>` and listens for the browser's submit event.
- **React Native** → `NativeForm`. Renders a Fragment (no host element) so `react-native` is not a peer dep. Submission is always programmatic.

Same props, same `FormContext`, same `useFormControl` consumer — only the host element differs.

```tsx
type FormProps = {
  onSubmit?: (options: { form: FormInterface; event?: React.FormEvent;
                         values: Record<string, any>; formData: FormData }) => void;
  onError?: (invalidControls: FormControl[]) => void;
  component?: React.ComponentType<any>;        // override the rendered host element
  defaultValue?: Record<string, any>;          // shared defaults, indexed by control name
  ignoreEmptyValues?: boolean;                 // skip null/undefined/""/[] in form.values()
  id?: string;                                 // auto-generated if absent
  children: React.ReactNode;
};
```

`values` and `formData` on the `onSubmit` payload are **getters** — they re-collect on each access.

## One-time setup — locale registration

Validation messages flow through `@mongez/localization`. Without registering bundles, errors render as raw keys like `validation.required`.

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
// ...only the locales the app uses
```

## `useFormControl` — the canonical pattern

```tsx
import { useFormControl, type FormControlProps } from "@mongez/react-form";

function TextInput(props: FormControlProps) {
  const { value, changeValue, id, error, inputRef, otherProps } =
    useFormControl(props);

  return (
    <>
      <input id={id} ref={inputRef} value={value}
             onChange={(e) => changeValue(e.target.value)} {...otherProps} />
      {error && <span className="error">{error}</span>}
    </>
  );
}
```

Critical points:

- Spread **`otherProps`**, not raw `props`, onto the host element. `otherProps` excludes hook-internal keys (`name`, `rules`, `errors`, `onChange`, `value`, `defaultValue`, ...) and any `preservedProps` declared by the active rules (`minLength`, `pattern`, ...).
- Wire `inputRef` if you want `formControl.focus()` / `.blur()` to work.
- The hook is **always controlled internally** — `value` from the hook is the source of truth even when the consumer passes a `value` prop (controlled mode just adds an upstream sync effect).

### Hook return shape

```ts
{
  id: string;          // user-supplied or derived from name: `input-<sanitized-name>`
  name: string;        // dot-notation normalized
  type: string;        // default "text"
  value: any;
  changeValue: (v, opts?) => void;
  error: ReactNode | ReactNode[];   // array when { validateAll: true }
  errorsList: { [ruleName]: ReactNode };
  setError: (e) => void;
  checked: boolean;                  // for checkbox/radio
  setChecked: (b: boolean) => void;
  inputRef: RefObject;               // attach to host input
  visibleElementRef: RefObject;      // attach to wrapper for validateVisible()
  formControl: FormControl;          // escape hatch — full registration object
  disabled: boolean;
  disable: () => void; enable: () => void;
  isInvalid: boolean;                // touched AND validation failed
  otherProps: object;                // pass-through props
}
```

### Checkbox

```tsx
const { checked, setChecked, id } = useFormControl({ ...props, type: "checkbox" });
// then:
<input id={id} type="checkbox" checked={checked}
       onChange={(e) => setChecked(e.target.checked)} />
```

`type: "checkbox"` must be set explicitly. Optional collection behavior:

```ts
useFormControl(props, {
  uncheckedValue: 0,       // value emitted when unchecked
  collectUnchecked: true,  // include unchecked controls in form.values()
});
```

### Radio group

`useFormControl` owns the selected value; each radio button reads it via `useRadioInput`:

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

// Use:
<RadioGroup name="gender">
  <RadioInput value="male">Male</RadioInput>
  <RadioInput value="female">Female</RadioInput>
</RadioGroup>
```

### Multi-value control

```ts
useFormControl(props, { multiple: true });  // value is always an array
```

### Hidden input

```tsx
<HiddenInput name="csrfToken" value={token} />
```

## Validation

Rules are plain data — `InputRule` objects passed in the `rules` array. Each rule's `validate` returns either:

- `undefined` / `null` → valid
- `ReactNode` → invalid, this is the error
- `Promise<ReactNode | undefined>` → async; later rules block on it

Rules run in array order; first failure short-circuits the rest. `{ validateAll: true }` in the hook's second argument runs every rule and exposes results as `errorsList` + an array `error`.

### Built-in rules

| Rule | Activated by | Type-gated | Notes |
|---|---|---|---|
| `requiredRule` | `required` prop | — | Empty = null/undefined/""/[] |
| `minLengthRule` | `minLength` | — | Strings + arrays |
| `maxLengthRule` | `maxLength` | — | Strings + arrays |
| `lengthRule` | `length` | — | Exact length |
| `minRule` | `min` | — | Numeric `Number(value) < Number(min)` |
| `maxRule` | `max` | — | Numeric |
| `emailRule` | — | `type="email"` | |
| `numberRule` | — | `type="number"` | |
| `integerRule` | — | `type="integer"` | |
| `floatRule` | — | `type="float"` | |
| `urlRule` | — | `type="url"` | Uses `@mongez/supportive-is`'s `isUrl` |
| `alphabetRule` | — | `type="alphabet"` | Letters only |
| `patternRule` | `pattern` (RegExp) | — | |
| `matchRule` | `match` (other input's name) | — | Re-runs when the other input changes |
| `strongRule` | `strong` (bool or `StrongPasswordCriteria`) | `type="password"` | 5 composable criteria; per-criterion errors in `errorsList["strong.<key>"]` |

`requiresType: "X"` rules only run when the form control's `type` matches. `requiresValue: true` rules (the default) skip when the value is empty. **Always list `requiredRule` first** — it's the only rule with `requiresValue: false`, so anything after it skips empties automatically.

### Composing rules in a reusable component

```tsx
import {
  useFormControl, requiredRule, minLengthRule, emailRule,
  type FormControlProps,
} from "@mongez/react-form";

function TextInput({
  rules = [requiredRule, minLengthRule, emailRule],
  ...props
}: FormControlProps) {
  const { value, changeValue, error } = useFormControl({ ...props, rules });
  // ...
}

// Consumer activates each by passing the matching prop:
<TextInput name="email" type="email" required minLength={5} />
```

### Per-instance message overrides

```tsx
// Replace the whole rendered message for one rule
<TextInput pattern={/^[a-z]+$/} errors={{ pattern: "Lowercase letters only" }} />

// Replace a named placeholder inside the localized template
<TextInput match="password" errorKeys={{ matchingInput: "Password" }} />
```

### Per-instance custom validation

```tsx
<TextInput
  name="username"
  validate={async ({ value }) => {
    if (!value) return;
    if (await isTaken(value)) return "Username already taken";
  }}
/>
```

The `validate` prop runs as if it were the first rule (with `requiresValue: true`). Sync or async — async returns block downstream rules until they settle.

### Writing a custom rule

```ts
import { trans } from "@mongez/localization";
import type { InputRule } from "@mongez/react-form";

export const phoneNumberRule: InputRule = {
  name: "phoneNumber",
  requiresType: "phoneNumber",
  preservedProps: ["mask"],    // keep `mask` out of otherProps so it doesn't leak onto <input>
  validate: ({ value, errorKeys }) => {
    if (!/^01[0-2|5]{1}[0-9]{8}$/.test(value)) {
      return trans("validation.phoneNumber", { input: errorKeys.name });
    }
  },
};
```

### `strongRule` — composite password validation

One rule, five criteria, per-criterion errors so you can drive a password-strength checklist UI without composing five separate rules.

```tsx
import { useFormControl, requiredRule, strongRule } from "@mongez/react-form";

function PasswordInput(props: FormControlProps) {
  const { value, changeValue, errorsList } = useFormControl({
    ...props,
    rules: [requiredRule, strongRule],
  });

  const item = (key: string, label: string) => {
    const failing = Boolean(errorsList[`strong.${key}`]);
    return <li style={{ color: failing ? "red" : "green" }}>{label}</li>;
  };

  return (
    <>
      <input type="password" value={value} onChange={(e) => changeValue(e.target.value)} />
      <ul>
        {item("minLength", "At least 8 characters")}
        {item("uppercase", "Contains an uppercase letter")}
        {item("lowercase", "Contains a lowercase letter")}
        {item("digit",     "Contains a number")}
        {item("symbol",    "Contains a symbol")}
      </ul>
    </>
  );
}

// All defaults:
<PasswordInput name="password" type="password" strong />
// Override one:
<PasswordInput name="password" type="password" strong={{ minLength: 12, symbol: false }} />
```

Criteria defaults: `{ minLength: 8, uppercase: true, lowercase: true, digit: true, symbol: true }`. Set `minLength: 0` to disable the length check.

Don't combine `strongRule` with a separate `minLengthRule` — the criterion already covers length, you'd duplicate the error.

## `useSubmitButton`

```ts
const { disabled, isSubmitting, isDirty, disable, setSubmitState } = useSubmitButton();
```

| State | Flips `true` when | Flips back when |
|---|---|---|
| `disabled` | `submitting(true)`, `invalidControls` event, or `form.disable()` | `submitting(false)`, `validControls` event, `form.reset()`, `form.enable()` |
| `isSubmitting` | `submitting(true)` | `submitting(false)` |
| `isDirty` | `dirty` event with `true` | When all dirty controls reset / unregister |

The most common bug: API request fails but the button stays disabled forever because `submitting(false)` is never called. **Always** call it in the failure path:

```tsx
<Form onSubmit={({ values, form }) =>
  api.createAccount(values)
    .then(() => navigate("/welcome"))
    .catch((err) => {
      showToast(err.message);
      form.submitting(false);   // re-enables the button
    })
}>
```

Async/await equivalent uses `finally`:

```tsx
const handleSubmit = async ({ values, form }) => {
  try {
    await api.createAccount(values);
    navigate("/welcome");
  } catch (err) {
    showToast(err.message);
  } finally {
    form.submitting(false);
  }
};
```

To require a change before enabling (Settings-screen pattern):

```ts
const { disabled, isDirty } = useSubmitButton();
const finalDisabled = disabled || !isDirty;
```

### React Native submit button

There's no DOM submit event on RN, so the press handler must call `form.submit()` explicitly:

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

## Names and value collection

`name` supports dot-notation; values nest into objects:

```
user.firstName       → { user: { firstName: "..." } }
addresses.0.city     → { addresses: [{ city: "..." }] }
tags[0]              ≡ tags.0    // bracket form is normalized to dots
```

Repeated `name`s collect into an array; `multiple: true` forces array form even with a single value.

`form.formData()` emits the same nested structure as bracket notation on the wire:

```
{ user: { firstName: "X" } }  → user[firstName]=X
{ tags: ["a", "b"] }          → tags[]=a&tags[]=b
```

### Default values

Set at the form level (preferred for shared defaults):

```tsx
<Form defaultValue={{ user: { firstName: "John", lastName: "Doe" } }}>
```

Or per-control (overrides the form-level):

```tsx
<TextInput name="user.firstName" defaultValue="Jane" />
```

Per-control wins; otherwise the form-level value is looked up by name (dot-notation honored).

### Ignoring empty values

```tsx
<Form ignoreEmptyValues>...</Form>
// or globally:
setFormConfigurations({ ignoreEmptyValues: true });
```

Causes `form.values()` to skip `null` / `undefined` / `""` / `[]`. Does NOT affect `form.formData()`.

## Form events

Subscribe via `form.on(event, callback)`. Returns an `EventSubscription` with `.unsubscribe()` — call it in `useEffect` cleanup.

| Event | Payload | Fires |
|---|---|---|
| `registering` / `register` | `(formControl, form)` | A control registers |
| `unregister` | `(formControl, form)` | A control unregisters |
| `validating` | `(form)` | Pre-validation — return `false` to abort |
| `validation` | `(isValid, validatedInputs, form)` | Validation completed |
| `validControl` / `invalidControl` | `(formControl, form)` | Per-control transition |
| `validControls` / `invalidControls` | `(controls[], form)` | Debounced aggregate state |
| `submitting` | `(isSubmitting, form)` | In-flight state changes |
| `submit` | `(form)` | After submission completes (fires again on `submitting(false)`) |
| `resetting` / `reset` | `(form)` | Reset lifecycle |
| `dirty` | `(isDirty, form)` | Aggregate dirty state changed |
| `disable` | `(isDisabled, form)` | `form.disable()` / `form.enable()` |

### Ordering during a normal submit

`validating` → per-control validation (`validControl` / `invalidControl` each) → `validation` → `validControls` or `invalidControls` (debounced 0ms) → if invalid: `onError` prop → if valid: `submitting(true)` → `onSubmit` prop → `submit`.

The `submit` event may fire **twice** per user action — once at the end of the synchronous submission flow and once when `submitting(false)` is called later. Listeners must be idempotent.

### Per-control events

```ts
const { formControl } = useFormControl(props);

useEffect(() => {
  const subs = [
    formControl.onChange(({ value }) => log("changed", value)),
    formControl.onReset(() => log("reset")),
    formControl.onDestroy(() => log("destroyed")),
  ];
  return () => subs.forEach((s) => s.unsubscribe());
}, [formControl]);
```

### Recipes

```ts
// Scroll to the first invalid input
form.on("invalidControls", (invalidControls) => {
  invalidControls[0]?.inputRef?.current?.scrollIntoView({ behavior: "smooth" });
});

// Abort submission when offline
form.on("validating", () => {
  if (!networkReachable()) {
    showToast("You're offline");
    return false;            // <-- the ONLY event-level veto in the system
  }
});

// Debounced autosave
form.on("dirty", (isDirty) => {
  if (!isDirty) return;
  scheduleAutosave(() => persist(form.values()));
});
```

## Multi-step / stepper forms

Use `form.validateVisible()` between steps. Each control (or its wrapper) must attach `visibleElementRef`:

```tsx
const { visibleElementRef, value, changeValue, error } = useFormControl(props);

return (
  <div ref={visibleElementRef}>
    <input value={value} onChange={(e) => changeValue(e.target.value)} />
  </div>
);
```

```ts
await form.validateVisible();
if (form.isValid()) goToNextStep();
```

**Inactive steps must stay mounted but hidden** for this to work — `visibleElementRef.current.hidden` (or any ancestor's `hidden`) is what the check looks for. Unmounted steps are simply not registered.

On React Native, `validateVisible()` is identical to `validate()` (no DOM tree to walk). RN steppers typically unmount inactive steps, which already achieves the same effect.

## Active forms registry

```ts
import { getActiveForm, getForm } from "@mongez/react-form";

getActiveForm();          // most recently mounted form, or null
getForm("login-form");    // by id
```

When forms unmount, the previous active form (if still mounted) is restored. Useful for non-React code: deep-link handlers, global keyboard shortcuts, autosave drivers.

## React Native

Same API as Web — only the host component differs.

```tsx
import { NativeForm } from "@mongez/react-form";
import { View } from "react-native";

<NativeForm onSubmit={handle} component={View} style={{ padding: 16, gap: 12 }}>
  {/* ... */}
</NativeForm>
```

Two cross-platform caveats:

1. **`formControl.isVisible()` always returns `true` on RN.** There's no DOM tree to walk. `form.validateVisible()` is identical to `form.validate()`.
2. **The auto-touch DOM `focus` listener is a no-op on RN.** Set `formControl.isTouched = true` manually in your input's `onFocus` if you want touched-state tracking.

Writing an RN form control:

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
        onChangeText={changeValue}                          // emits string directly — don't unwrap
        onFocus={() => (formControl.isTouched = true)}      // see caveat #2
        editable={!disabled}
      />
      {error && <Text style={{ color: "red" }}>{error}</Text>}
    </View>
  );
}
```

## `BaseForm` — extending the engine

Both `Form` and `NativeForm` extend an abstract `BaseForm<P extends FormProps>` class that holds the platform-agnostic engine. Subclass it for any other React renderer (`react-three-fiber`, `ink`, a server-side validation pipeline, a custom host).

You inherit the full `FormInterface`: control registry, validation pipeline, value collection, dirty/submitting/disabled state tracking, the event bus, active-form registration, reset logic, default-value resolution, and the shared `handleSubmit()` pipeline.

You implement two surfaces:

1. **`submit(): void`** — programmatic submit trigger. Typically just `this.handleSubmit()`.
2. **`render()`** — must wrap children in `<FormContext.Provider value={this}>` so descendants find the form. Beyond that, render whatever fits the platform.

Minimal headless form:

```tsx
import { BaseForm, FormContext, type FormProps, type FormInterface } from "@mongez/react-form";

export class HeadlessForm extends BaseForm implements FormInterface {
  public formElement = null;
  public submit() { if (!this.isSubmitting()) this.handleSubmit(); }
  public render() {
    return (
      <FormContext.Provider value={this}>
        {(this.props as FormProps).children}
      </FormContext.Provider>
    );
  }
}
```

For a wider prop type:

```tsx
type MyFormProps = FormProps & { view: "modal" | "inline" };
export class MyForm extends BaseForm<MyFormProps> {
  public submit() { this.handleSubmit(); }
  public render() {
    const { view, children } = this.props;
    return (
      <FormContext.Provider value={this}>
        <div className={`form form-${view}`}>{children}</div>
      </FormContext.Provider>
    );
  }
}
```

If all you need is to swap the rendered element, **don't subclass** — use the `component` prop:

```tsx
<Form component={MyStyledForm}>...</Form>
<NativeForm component={View} style={{ padding: 16 }}>...</NativeForm>
```

Reference implementations: [`src/components/Form.tsx`](./src/components/Form.tsx) (~55 lines), [`src/components/NativeForm.tsx`](./src/components/NativeForm.tsx) (~45 lines), [`src/components/BaseForm.ts`](./src/components/BaseForm.ts) (the engine).

## AI agent skills

If you have Claude Code installed, the plugin ships invokable skills (`getting-started`, `create-form-control`, `submit-button`, `validation-rules`, `form-events`, `react-native-usage`) — each is a `SKILL.md` under [`skills/`](./skills) that loads on demand:

```
/plugin marketplace add hassanzohdy/mongez-react-form
/plugin install mongez-react-form@mongez-react-form
```

The same skill files are also shipped inside the npm tarball under `skills/` — copy them to `.claude/skills/` for non-Claude-Code agents (Cursor, Cline, Codex). See [`MARKETPLACE.md`](./MARKETPLACE.md) for distribution details.

The full single-file reference for direct LLM consumption is [`llms-full.txt`](./llms-full.txt).

## React version

React **18 or newer**. The package was historically pinned to `react > 16.8`; current code paths still work down to 16.8, but tests run on 18+ only and the peer range is `>=18` to match the supported matrix.

## What this package does NOT do

- The atom-style state primitive → [`@mongez/atom`](https://github.com/hassanzohdy/atom)
- Server-state caching (query keys, invalidation) → [`@mongez/atomic-query`](https://github.com/hassanzohdy/mongez-atomic-query)
- The event bus → [`@mongez/events`](https://github.com/hassanzohdy/events)
- Translation infrastructure → [`@mongez/localization`](https://github.com/hassanzohdy/mongez-localization)

## License

MIT
