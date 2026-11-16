---
name: mongez-react-form-form-hydration
description: |
  Use when seeding a @mongez/react-form form with initial data — especially edit forms whose record loads asynchronously. Explains the difference between defaultValue (the reset baseline) and the reactive values prop, the imperative form.fill / setValues / setErrors methods, getInitialValue, how later-mounting controls seed themselves, and how server (HTTP 422) errors map back onto controls.
---

# Form hydration

Apply this skill when the user needs to pre-fill a form, re-hydrate it after data loads, or push server-side errors back onto controls. v4 separated two concerns that v3 conflated: the **reset baseline** (`defaultValue`) and the **current values** (`values` / `fill`).

## `defaultValue` vs `values` — the core distinction

| Prop / method | Role | Reactivity | Used by `reset()` |
|---|---|---|---|
| `defaultValue` | the **reset baseline** | re-hydrates only **pristine** (non-dirty) controls when its identity changes | **yes** — `form.reset()` restores controls to it |
| `values` | the **current** values | re-hydrates **all** mounted controls when its identity changes, and seeds later-mounting ones | no |

- Use **`defaultValue`** for static initial data known at first render, where "reset" should return to that data.
- Use **`values`** (or `form.fill()`) for an **edit form** whose record arrives after mount, or whenever you want to overwrite the live form, not the reset target.

```tsx
// Static initial data; reset() returns here.
<Form defaultValue={{ country: "EG", newsletter: true }}>

// Edit form — `user` loads async; changing its identity re-hydrates the form.
<Form values={user}>
```

## Reactive `values` — re-hydrate on identity change

When the `values` prop's object **identity** changes, the engine calls `form.fill(values, { dirty: false, validate: false })`:

- Already-mounted controls update to the new values.
- The snapshot (`engine.hydrationValues`) is updated so controls that mount **later** seed from it via `form.getInitialValue(name)`.

```tsx
function EditUserForm({ userId }: { userId: string }) {
  const { data: user } = useQuery(["user", userId], () => api.getUser(userId));

  // While loading, `user` is undefined; once it resolves, its new identity
  // re-hydrates every control (and pre-seeds any that mount after).
  return (
    <Form values={user} onSubmit={({ values }) => api.updateUser(userId, values)}>
      <TextInput name="name" />
      <TextInput name="email" type="email" />
      <SubmitButton>Save</SubmitButton>
    </Form>
  );
}
```

Pass a **new object** each time you want to re-hydrate (e.g. `{...user}` or a fresh query result). Mutating the same object in place won't trigger it — identity must change.

## Imperative hydration: `fill` / `setValues`

From a `ref` (or `useForm()`), write values onto controls in bulk without touching the reset baseline:

```ts
form.fill(values, { dirty?: false, validate?: false });
form.setValues(values, options); // alias of fill
```

- `dirty` (default `false`) — whether filled controls are marked dirty. Keep `false` for hydration so the form doesn't look "changed".
- `validate` (default `false`) — whether to validate after writing.

`fill` merges into the hydration snapshot, so later-mounting controls still pick up the value. Only keys present in `values` (resolved by dot-notation `get`) are written — missing controls are left alone.

```tsx
const formRef = useRef<FormInterface>(null);

const loadDraft = async () => {
  const draft = await api.getDraft();
  formRef.current?.fill(draft);            // hydrate, stays pristine
};

const importAndValidate = async () => {
  const data = await api.import();
  formRef.current?.fill(data, { dirty: true, validate: true });
};
```

## `getInitialValue(name)` — how controls seed themselves

Each control, on mount, resolves its starting value (when no `value` / `defaultValue` prop was passed on the control itself) via `form.getInitialValue(name)`, which checks, in order:

1. the reactive **hydration snapshot** (`hydrationValues`, seeded from the `values` prop and updated by `fill`), then
2. the **reset baseline** (`defaultValue`).

Returns `undefined` when neither has the key. This is why a control that mounts *after* a `fill()` / reactive `values` update still shows the right value — it reads the latest snapshot.

## `setDefaultValue` — moving the reset baseline

Changing the `defaultValue` prop's identity (or calling `form.setDefaultValue(next)`) updates the reset target. It re-hydrates only **pristine** controls — dirty controls keep the user's edits, and their `initialValue` is updated so a later `reset()` lands on the new baseline.

```ts
form.setDefaultValue({ country: "SA" }); // pristine controls jump; edited ones don't
```

## Server errors: `setErrors` (HTTP 422)

After a failed submit, map a server validation response back onto controls in one call. Keys are dot-notation control names; values are the messages:

```tsx
const onSubmit = async ({ form, values }) => {
  try {
    await api.signup(values);
  } catch (error: unknown) {
    const { status, body } = (error ?? {}) as {
      status?: number;
      body?: { errors?: Record<string, string> };
    };

    if (status === 422 && body?.errors) {
      form.setErrors(body.errors); // { "email": "Already registered", ... }
      return;
    }
    toast.error("Signup failed");
  }
};
```

`setErrors`:

- forces each matching control invalid with the given message (same slot the rule system writes to, so the input's existing `error` rendering shows it),
- **ignores** names with no matching control,
- re-checks form validity and fires `invalidControls` if anything is now invalid (so a `useSubmitButton` re-disables).

For a single field, `form.control(name)?.setError(message)` still works; `setErrors` is the bulk version.

## Putting it together — async edit form

```tsx
function EditProfile({ id }: { id: string }) {
  const formRef = useRef<FormInterface>(null);

  const [loadError, setLoadError] = useState<string>();
  const [formError, setFormError] = useState<string>();

  useEffect(() => {
    let active = true; // a late response for a previous `id` must not fill the form

    setLoadError(undefined);

    api
      .getProfile(id)
      .then((profile) => {
        if (active) formRef.current?.fill(profile); // hydrate when data arrives
      })
      .catch(() => {
        if (active) setLoadError("Could not load the profile, try again.");
      });

    return () => {
      active = false;
    };
  }, [id]);

  const onSubmit = async ({ form, values }) => {
    setFormError(undefined);

    try {
      await api.saveProfile(id, values);
    } catch (e: unknown) {
      const { status, body } = (e ?? {}) as {
        status?: number;
        body?: { errors?: Record<string, string> };
      };

      if (status === 422 && body?.errors) {
        form.setErrors(body.errors);

        // `setErrors` skips names with no control: show those at form level.
        const unknown = Object.entries(body.errors)
          .filter(([name]) => !form.control(name))
          .map(([name, message]) => `${name}: ${message}`);

        if (unknown.length) setFormError(unknown.join(", "));
        return;
      }

      setFormError("Could not save the profile, try again.");
    }
  };

  return (
    <Form ref={formRef} method="post" onSubmit={onSubmit}>
      {loadError && <p role="alert">{loadError}</p>}
      {formError && <p role="alert">{formError}</p>}
      <TextInput name="firstName" required />
      <TextInput name="lastName" required />
      <TextInput name="bio" />
      <SubmitButton>Save</SubmitButton>
    </Form>
  );
}
```

(You can equally drive this with `<Form values={profile}>` and skip the manual `fill` — pick whichever fits your data flow.)

## SSR and the default `method`

When the rendered component is the native `"form"` and you pass no `method`, `<Form>` renders `method="post"`, so a submit before hydration (or with JavaScript off) does not put field values, passwords included, in the URL. An explicit `method` wins. Caveat: POST stops the URL leak, but it does not make an API-only form work without JavaScript. The browser posts to the current URL, so you need a server route that handles it, or accept that the form needs JavaScript. Custom `component`s and `NativeForm` are not touched.

## Anti-patterns

- **Using `defaultValue` for data that loads after mount, then expecting it to overwrite the form** — `defaultValue` only re-hydrates *pristine* controls on identity change and is the reset target. For live overwrite use `values` / `fill`.
- **Mutating the same `values` object** and expecting re-hydration — identity must change; pass a new object.
- **Calling `fill(values, { dirty: true })` for hydration** — that marks the form dirty (a "Save" gated on `isDirty` would enable immediately). Keep `dirty: false` (the default) for seeding.
- **Forgetting that `setErrors` skips unknown names** — a server error keyed to a field with no control on the page silently disappears; surface those at the form level.
