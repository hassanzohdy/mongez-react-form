---
name: mongez-react-form-field-arrays
description: |
  Use when building a dynamic list of repeated field rows in @mongez/react-form — cart items, contact methods, education entries, anything add/remove/reorder. Explains the useFieldArray hook: the fields array with stable keys, the append/prepend/remove/insert/move/swap/replace helpers, how row names derive from index and collect into an array, seeding from initial values, and reset behavior.
---

# Field arrays — `useFieldArray`

Apply this skill when the user needs a repeating section of inputs with add / remove / reorder controls. v4 added `useFieldArray(name)`, which manages the **row identity** so values survive reordering and deletion — you no longer hand-roll an index array with `useState`.

## The contract

```ts
const {
  fields,   // FieldArrayItem[] — map over these to render
  append,   // (count = 1) => void  — add rows at the end
  prepend,  // (count = 1) => void  — add rows at the start
  remove,   // (index?) => void     — remove at index, or the last row when omitted
  insert,   // (index) => void      — insert one row at index
  move,     // (from, to) => void   — move a row
  swap,     // (a, b) => void       — swap two rows
  replace,  // (count) => void      — replace all rows with `count` fresh rows
} = useFieldArray("addresses");
```

Each `fields` item is:

```ts
type FieldArrayItem = {
  key: string;    // stable, unique — use as the React key (survives reorder/remove)
  index: number;  // current position in the array
  name: string;   // dot-notation prefix for this row, e.g. "addresses.0"
};
```

Must be called inside a `<Form>` / `<NativeForm>` (it reads `useForm()`).

## Why stable keys matter

Rows are keyed by a stable `key` (not the index). Input names derive from the row's **current `index`** (`addresses.0.city`, `addresses.1.city`, …), and the form's dot-notation collection nests them into an array automatically. Because each row keeps its identity across renders, removing or moving one row doesn't shuffle the others' state — a surviving row carries its own value.

> Use `field.key` as the React `key` and `field.name` as the input-name prefix. Never use `field.index` as the React key — that defeats the stability the hook gives you.

## Pattern — repeating address rows

```tsx
import { useFieldArray, Form, SubmitButton } from "@mongez/react-form";
import TextInput from "./TextInput";

export default function AddressesForm() {
  const { fields, append, remove, move } = useFieldArray("addresses");

  return (
    <Form onSubmit={({ values }) => console.log(values.addresses)}>
      {fields.map((field) => (
        <fieldset key={field.key}>
          <TextInput name={`${field.name}.city`} required />
          <TextInput name={`${field.name}.zip`} required />

          <button type="button" onClick={() => remove(field.index)}>
            Remove
          </button>
          <button
            type="button"
            disabled={field.index === 0}
            onClick={() => move(field.index, field.index - 1)}
          >
            Move up
          </button>
        </fieldset>
      ))}

      <button type="button" onClick={() => append()}>
        Add address
      </button>
      <SubmitButton>Save</SubmitButton>
    </Form>
  );
}
```

On submit, `values.addresses` is `[{ city, zip }, { city, zip }, …]` — the engine collects `addresses.0.city`, `addresses.1.city`, … and rebuilds the array (numeric segments become array indices).

## Seeding initial rows

`useFieldArray` reads `form.getInitialValue(name)` on mount: if the form was given an array for that name (via `defaultValue`, the `values` prop, or `fill`), it starts with that many rows. The inputs inside each row then seed their own values from the same hydration source by their dot-notation name.

```tsx
<Form values={{ addresses: [{ city: "Cairo" }, { city: "Giza" }] }}>
  {/* useFieldArray("addresses") starts with 2 rows, each pre-filled */}
</Form>
```

See the **form-hydration** skill for how that seeding resolves.

## Reset behavior

The hook snapshots the **initial row count** at mount and subscribes to the form's `reset` event: `form.reset()` restores that original number of rows (with fresh keys), and each control inside re-hydrates to its baseline. So adding three rows then resetting drops back to the starting count.

## The helpers at a glance

| Helper | Effect |
|---|---|
| `append(count = 1)` | add `count` rows at the end |
| `prepend(count = 1)` | add `count` rows at the start |
| `remove(index?)` | remove the row at `index`; with no argument, removes the **last** row |
| `insert(index)` | insert one row at `index` |
| `move(from, to)` | move a row from one position to another |
| `swap(a, b)` | swap rows at `a` and `b` |
| `replace(count)` | discard all rows and create `count` fresh ones |

All of them re-key only as needed and re-render the list; because names derive from index, the collected array re-orders to match the visual order.

## Manual alternative (when you don't need the helpers)

You can still drive a repeating section with your own `useState` index array (see the **recipes** skill). `useFieldArray` is the ergonomic, identity-stable version — prefer it for anything with reorder/insert, where a plain index array would scramble row values.

## Anti-patterns

- **Keying the mapped rows by `field.index`** — breaks the stable-identity guarantee; on remove/reorder, React reuses the wrong DOM and values smear across rows. Always key by `field.key`.
- **Deriving input names from anything other than `field.name`** — the array collection depends on the `name.<index>.field` shape. Compose as `` `${field.name}.city` ``.
- **Expecting `remove()` with no argument to remove a specific row** — it removes the **last** one. Pass `remove(field.index)` to target a row.
