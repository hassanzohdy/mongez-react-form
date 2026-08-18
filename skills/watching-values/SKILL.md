---
name: mongez-react-form-watching-values
description: |
  Use when a @mongez/react-form component needs to reactively read another field's value — dependent fields, conditional UI, live previews, computed summaries. Explains the three call shapes of useWatch (whole form, one name, many names), how it re-renders on the form-level change and reset events, its behavior outside a form, and when to prefer a raw change-event subscription instead.
---

# Watching values — `useWatch`

Apply this skill when one part of the form needs to react to another field's value — show/hide a section based on a checkbox, compute a total, mirror a value into a preview, etc. v4 added `useWatch`, backed by the engine's form-level `change` event (emitted on every control edit).

## Three call shapes

```ts
useWatch();                  // -> Record<string, any>  — the whole collected values object
useWatch("user.email");      // -> any                  — that single control's value
useWatch(["city", "zip"]);   // -> any[]                — those controls' values, in order
```

Each form returns the **current** value(s) and re-renders the calling component whenever **any** control changes (or the form resets). Must be used inside a `<Form>` / `<NativeForm>` to be reactive (it reads `useForm()`).

## How reactivity works

`useWatch` subscribes to two form events:

- `change` — the form-level broadcast the engine fires on every control value change.
- `reset` — so watchers re-read after `form.reset()`.

On either, it forces a re-render and re-reads via `form.values()` (whole form), `form.value(name)` (single), or a map of `form.value(name)` (array). It re-renders on *any* change, not just the watched field — fine for most UIs; if you watch one field in a hot form and want to minimize renders, prefer a raw subscription (below).

## Pattern — conditional field

```tsx
import { useWatch } from "@mongez/react-form";

function ShippingSection() {
  const sameAsBilling = useWatch("sameAsBilling");

  if (sameAsBilling) return null;

  return (
    <>
      <TextInput name="shipping.line1" required />
      <TextInput name="shipping.city" required />
    </>
  );
}
```

`sameAsBilling` is the checkbox control's value; toggling it re-renders `ShippingSection` and shows/hides the inputs. (Remember: a hidden/unmounted control is unregistered, so its value won't be collected — mount conditionally only when you *want* the field dropped from `values`.)

## Pattern — computed summary (multiple names)

```tsx
function PriceSummary() {
  const [qty, unitPrice] = useWatch(["qty", "unitPrice"]);
  const total = (Number(qty) || 0) * (Number(unitPrice) || 0);

  return <p>Total: {total.toFixed(2)}</p>;
}
```

## Pattern — live preview (whole form)

```tsx
function LivePreview() {
  const values = useWatch();
  return <pre>{JSON.stringify(values, null, 2)}</pre>;
}
```

`useWatch()` returns the dot-notation-nested object (same shape `onSubmit` receives), recomputed on every change.

## Behavior outside a form

If there's no surrounding form, `useWatch` returns safe defaults instead of throwing:

- `useWatch()` → `{}`
- `useWatch(name)` → `undefined`
- `useWatch(names)` → an array of `undefined`, one per name

This keeps a shared component that *might* be used outside a form from crashing — but it won't be reactive there.

## `useWatch` vs a raw `change` subscription

| Need | Use |
|---|---|
| read a value and **re-render UI** from it | `useWatch` |
| run a **side effect** on change (analytics, autosave, imperative DOM) | `form.on("change", cb)` — see the **form-events** skill |
| minimize re-renders while watching one field in a frequently-changing form | raw `change` subscription with your own equality check |

`useWatch` always re-renders on any change; a raw subscription lets you decide what to do (and whether to set state) per event.

## Not the same as `useInputValue`

`useInputValue(initialValue)` (also exported) is just a small local-state helper — `useState` plus an event-or-value unwrapper for an input's `onChange`. It is **not** a form-control reader: it doesn't take a control name and isn't tied to the form. For reading registered controls reactively, use `useWatch`.

## Anti-patterns

- **Calling `useWatch` to drive validation** — watching is for rendering/derived UI; cross-field validation belongs in a rule (`matchRule`, or a custom `InputRule` reading `form` in its `validate`). See the **validation-rules** and **recipes** skills.
- **Expecting reactivity outside a form** — outside `<Form>` it returns static defaults; mount the watcher inside the form.
- **Watching a heavy form with `useWatch()` (whole object) when you only need one field** — prefer `useWatch(name)` (or a raw subscription) to avoid re-serializing the whole form on every keystroke.
