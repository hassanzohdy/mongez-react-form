---
name: mongez-react-form-recipes
description: |
  Idiomatic composition recipes for `@mongez/react-form` — submitting and surfacing backend errors per-field, debounced async field validation, dynamic field arrays with add/remove, multi-step wizard forms with shared state, autosave on dirty, cross-field validation, and sharing rules between Web and React Native.
  TRIGGER when: code combines `Form`/`NativeForm` with `useFormControl`, `useForm`, `useSubmitButton`, or `form.on` events; user asks "how do I show server validation errors on the right field", "how do I debounce an async validator", "how do I add/remove inputs dynamically", "how do I autosave while typing", "how do I do a multi-step form", or "how do I share validation between Web and React Native".
  SKIP: per-feature dives — load `mongez-react-form-create-form-control`, `mongez-react-form-validation-rules`, `mongez-react-form-submit-button`, `mongez-react-form-form-events`, or `mongez-react-form-react-native-usage`; first-time setup — load `mongez-react-form-getting-started`; `react-hook-form` / `formik` / `final-form` projects.
---

# Recipes

Cross-feature compositions for `@mongez/react-form` — patterns that come up when a form needs to do more than render and validate.

## Submit + display backend errors per field

The server returns a `422` with `{ errors: { email: "Already registered", … } }`. You want each error to appear under its matching input, not in a toast.

```tsx
function SignupForm() {
  const formRef = useRef<FormInterface>(null);

  const handleSubmit = async (form: FormInterface, values: Record<string, any>) => {
    form.submitting(true);
    const { data, error } = await http.post("/signup", { data: values });
    form.submitting(false);

    if (error?.status === 422 && error.body?.errors) {
      for (const [name, message] of Object.entries(error.body.errors)) {
        form.control(name)?.setError(message as string);
      }
      return;
    }
    if (error) return toast.error("Signup failed");
    navigate("/welcome");
  };

  return (
    <Form ref={formRef} onSubmit={handleSubmit}>
      <TextInput name="email" rules={[required, email]} />
      <TextInput name="password" type="password" rules={[required, minLength(8)]} />
      <SubmitButton>Sign up</SubmitButton>
    </Form>
  );
}
```

`form.control(name)?.setError(...)` writes into the same error slot the rule system uses — the input's existing `error` rendering path picks it up automatically.

## Debounced async field validation

A "username availability" check that hits the API only after the user stops typing.

```ts
import { debounce } from "@mongez/reinforcements";

const checkAvailability = debounce(async (value: string) => {
  const { data } = await http.get<{ available: boolean }>(`/users/check?u=${value}`);
  return data?.available;
}, 400);

const usernameAvailable = {
  name: "available",
  validate: async ({ value, formControl }) => {
    if (!value) return;
    const ok = await checkAvailability(value);
    if (!ok) formControl.setError("That username is taken");
  },
};

// Usage
<TextInput name="username" rules={[required, minLength(3), usernameAvailable]} />
```

`debounce` from `@mongez/reinforcements` collapses fast successive calls; the rule only fires the final one. See `mongez-react-form-validation-rules` for the full rule contract.

## Dynamic field arrays — add/remove items

A repeating section (cart items, contact methods, education entries). Names use dot-notation; the form serializes nested values back as arrays.

```tsx
function ContactsForm() {
  const [rows, setRows] = useState([0]);

  return (
    <Form onSubmit={(_, values) => console.log(values.contacts)}>
      {rows.map(i => (
        <div key={i}>
          <TextInput name={`contacts.${i}.email`} rules={[required, email]} />
          <TextInput name={`contacts.${i}.label`} rules={[required]} />
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

`form.on("dirty")` fires whenever any control changes. Debounce a serialize-and-POST.

```tsx
function ProfileForm({ initial }: { initial: Profile }) {
  const formRef = useRef<FormInterface>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const save = debounce((f: FormInterface) => {
      const values = f.values();
      http.put("/me", { data: values });
    }, 800);
    const sub = form.on("dirty", save);
    return () => sub.unsubscribe();
  }, []);

  return (
    <Form ref={formRef} defaultValues={initial}>
      <TextInput name="name" rules={[required]} />
      <TextInput name="bio" />
    </Form>
  );
}
```

The 800 ms window prevents an HTTP request on every keystroke. `form.values()` reads the current registered state.

## Cross-field validation — `confirmPassword` matches `password`

Rules can reach into sibling controls via the form instance.

```ts
const sameAs = (otherFieldName: string) => ({
  name: "sameAs",
  validate: ({ value, formControl }) => {
    const other = formControl.form.control(otherFieldName)?.value;
    if (value !== other) formControl.setError("Must match " + otherFieldName);
  },
});

<TextInput name="password" type="password" rules={[required, minLength(8)]} />
<TextInput name="confirm"  type="password" rules={[required, sameAs("password")]} />
```

The rule re-runs whenever its own control changes. To re-run when `password` changes (so the confirm field re-validates if you edit password afterward), subscribe to `password`'s `change` event and re-validate `confirm` manually.

## Multi-step wizard with shared state

One `<Form>` wrapping the whole wizard; each step renders a different slice of inputs. Validation can be limited per-step via the controls' `visibleElementRef`.

```tsx
function Wizard() {
  const [step, setStep] = useState(1);
  const formRef = useRef<FormInterface>(null);

  const next = async () => {
    const form = formRef.current!;
    const ok = await form.validateVisible();    // only the currently-rendered inputs
    if (ok) setStep(s => s + 1);
  };

  return (
    <Form ref={formRef}>
      {step === 1 && <>
        <TextInput name="email" rules={[required, email]} />
        <TextInput name="password" type="password" rules={[required, minLength(8)]} />
      </>}
      {step === 2 && <>
        <TextInput name="profile.firstName" rules={[required]} />
        <TextInput name="profile.lastName"  rules={[required]} />
      </>}
      {step === 3 && <>
        <TextInput name="company" />
        <SubmitButton>Finish</SubmitButton>
      </>}
      {step < 3 && <button type="button" onClick={next}>Next</button>}
    </Form>
  );
}
```

Each step's inputs register on mount and unregister on unmount, but their values stay on the form instance — so `Finish` submits the union of all step values.

## Sharing rules between Web and React Native

Rules don't depend on DOM or React Native APIs — they're pure functions over `{ value, formControl }`. Author once, import twice.

```ts
// shared/rules/profile.ts
import { required, email, minLength } from "@mongez/react-form";

export const profileRules = {
  email:    [required, email],
  username: [required, minLength(3)],
  bio:      [],
};
```

```tsx
// web/SignupForm.tsx
import { profileRules } from "shared/rules/profile";

<TextInput name="email" rules={profileRules.email} />
```

```tsx
// native/SignupForm.native.tsx
import { profileRules } from "shared/rules/profile";

<NativeTextInput name="email" rules={profileRules.email} />
```

The validation translations (`enValidationTranslation`, …) are likewise platform-agnostic — register them once at app boot per platform. See `mongez-react-form-react-native-usage` for the RN-specific input wrappers.
