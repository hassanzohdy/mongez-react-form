---
name: mongez-react-form-recipes
description: |
  Idiomatic composition recipes for `@mongez/react-form` — submitting and surfacing backend errors per-field, debounced async field validation, dynamic field arrays with add/remove, multi-step wizard forms with shared state, autosave on dirty, cross-field validation, and sharing rules between Web and React Native.
---

# Recipes

Cross-feature compositions for `@mongez/react-form` — patterns that come up when a form needs to do more than render and validate.

## Submit + display backend errors per field

The server returns a `422` with `{ errors: { email: "Already registered", … } }`. You want each error to appear under its matching input, not in a toast.

```tsx
function SignupForm() {
  const handleSubmit = async ({ form, values }) => {
    try {
      await http.post("/signup", { data: values });
      navigate("/welcome");
    } catch (error: any) {
      if (error?.status === 422 && error.body?.errors) {
        for (const [name, message] of Object.entries(error.body.errors)) {
          form.control(name)?.setError(message as string);
        }
        return;
      }
      toast.error("Signup failed");
    } finally {
      form.submitting(false);
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      <TextInput name="email" type="email" required />
      <TextInput name="password" type="password" required minLength={8} />
      <SubmitButton>Sign up</SubmitButton>
    </Form>
  );
}
```

`form.control(name)?.setError(...)` writes into the same error slot the rule system uses — the input's existing `error` rendering path picks it up automatically. The `onSubmit` payload is `{ form, event?, values, formData }` — `values` and `formData` are getters that re-collect on access.

## Debounced async field validation

A "username availability" check that hits the API only after the user stops typing. Use the per-instance `validate` prop (returns a `ReactNode` error or `undefined`).

```ts
import { debounce } from "@mongez/reinforcements";

const checkAvailability = debounce(async (value: string) => {
  const { data } = await http.get<{ available: boolean }>(`/users/check?u=${value}`);
  return data?.available;
}, 400);

// Usage
<TextInput
  name="username"
  required
  minLength={3}
  validate={async ({ value }) => {
    if (!value) return;
    const ok = await checkAvailability(value);
    if (!ok) return "That username is taken";
  }}
/>
```

`debounce` from `@mongez/reinforcements` collapses fast successive calls; the validator only awaits the final one. Rules must **return** the error message — do not call `formControl.setError` from inside `validate`. See `mongez-react-form-validation-rules` for the full rule contract.

## Dynamic field arrays — add/remove items

A repeating section (cart items, contact methods, education entries). Names use dot-notation; the form serializes nested values back as arrays.

```tsx
function ContactsForm() {
  const [rows, setRows] = useState([0]);

  return (
    <Form onSubmit={({ values }) => console.log(values.contacts)}>
      {rows.map(i => (
        <div key={i}>
          <TextInput name={`contacts.${i}.email`} type="email" required />
          <TextInput name={`contacts.${i}.label`} required />
          <button type="button" onClick={() => setRows(rs => rs.filter(r => r !== i))}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={() => setRows(rs => [...rs, Math.max(0, ...rs) + 1])}>
        Add contact
      </button>
      <SubmitButton>Save</SubmitButton>
    </Form>
  );
}
```

The form auto-aggregates `contacts.0.email`, `contacts.1.email`, … into `values.contacts: [{ email, label }, …]`. Removing a row unregisters its controls cleanly.

## Autosave on dirty (debounced)

`form.on("dirty", cb)` fires whenever the form's overall dirty state toggles. The callback receives `(isDirty, form)`. Debounce a serialize-and-POST.

```tsx
function ProfileForm({ initial }: { initial: Profile }) {
  const formRef = useRef<FormInterface>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const save = debounce(() => {
      http.put("/me", { data: form.values() });
    }, 800);
    const sub = form.on("dirty", (isDirty) => {
      if (isDirty) save();
    });
    return () => sub.unsubscribe();
  }, []);

  return (
    <Form ref={formRef as any} defaultValue={initial}>
      <TextInput name="name" required />
      <TextInput name="bio" />
    </Form>
  );
}
```

The 800 ms window prevents an HTTP request on every keystroke. `form.values()` reads the current registered state.

## Cross-field validation — `confirmPassword` matches `password`

Use the built-in `matchRule` — it's activated by the `match` prop (the name of the other input). The rule's `onInit` subscribes to the other control's `change` event so the confirm field re-validates automatically when `password` is edited.

```tsx
import { useFormControl, requiredRule, matchRule, minLengthRule } from "@mongez/react-form";

<TextInput name="password" type="password" required minLength={8} />
<TextInput
  name="confirm"
  type="password"
  required
  match="password"
  errorKeys={{ matchingElement: "Password" }}
/>
```

The wrapper component must include `matchRule` in its `rules` array (or accept `rules` from props) — `match` alone is just the prop that activates the rule.

For a custom cross-field rule, write your own `InputRule` and reach into the form via the `form` field in `validate`'s options (not `formControl.form`):

```ts
import type { InputRule } from "@mongez/react-form";

const sameAs = (otherFieldName: string): InputRule => ({
  name: "sameAs",
  validate: ({ value, form }) => {
    const other = form?.control(otherFieldName)?.value;
    if (value !== other) return `Must match ${otherFieldName}`;
  },
});
```

Without an `onInit` subscription, this rule only re-runs when its own control changes — not when the other field changes. Use `matchRule` (which already wires that subscription) for the password-confirm case.

## Multi-step wizard with shared state

One `<Form>` wrapping the whole wizard; each step renders a different slice of inputs. **Inactive steps must stay mounted but `hidden`** so their controls remain registered — `validateVisible()` walks `visibleElementRef.current` looking for a `hidden` ancestor. If you unmount inactive steps, their values are discarded on unregister.

```tsx
function Wizard() {
  const [step, setStep] = useState(0);
  const formRef = useRef<FormInterface>(null);

  const next = async () => {
    const form = formRef.current;
    if (!form) return;
    await form.validateVisible();
    if (form.isValid()) setStep(s => s + 1);
  };

  return (
    <Form ref={formRef as any} onSubmit={({ values }) => api.complete(values)}>
      <fieldset hidden={step !== 0}>
        <TextInput name="email" type="email" required />
        <TextInput name="password" type="password" required minLength={8} />
      </fieldset>
      <fieldset hidden={step !== 1}>
        <TextInput name="profile.firstName" required />
        <TextInput name="profile.lastName" required />
      </fieldset>
      <fieldset hidden={step !== 2}>
        <TextInput name="company" />
        <SubmitButton>Finish</SubmitButton>
      </fieldset>
      {step < 2 && <button type="button" onClick={next}>Next</button>}
    </Form>
  );
}
```

`validateVisible()` returns `Promise<FormControl[]>` (the inputs it validated). Use `form.isValid()` after it resolves to gate progression. Each input wrapper must attach `visibleElementRef` to its outer wrapper element.

## Sharing rules between Web and React Native

Rules don't depend on DOM or React Native APIs — they're plain `InputRule` data objects evaluated against `{ value, formControl, form, ... }`. Author once, import twice.

```ts
// shared/rules/profile.ts
import { requiredRule, emailRule, minLengthRule, type InputRule } from "@mongez/react-form";

export const profileRules: Record<string, InputRule[]> = {
  email:    [requiredRule, emailRule],
  username: [requiredRule, minLengthRule],
  bio:      [],
};
```

```tsx
// web/SignupForm.tsx
import { profileRules } from "shared/rules/profile";

<TextInput name="email" type="email" required rules={profileRules.email} />
```

```tsx
// native/SignupForm.native.tsx
import { profileRules } from "shared/rules/profile";

<NativeTextInput name="username" required minLength={3} rules={profileRules.username} />
```

Remember: built-in rules are gated by props (`requiredRule` needs `required`, `minLengthRule` needs `minLength={n}`, `emailRule` needs `type="email"`). Listing a rule without its activating prop is a no-op. The validation translations (`enValidationTranslation`, …) are likewise platform-agnostic — register them once at app boot per platform. See `mongez-react-form-react-native-usage` for the RN-specific input wrappers.
