import { act, fireEvent, render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { Form } from "../components/Form";
import {
  addToFormsList,
  getActiveForm,
  removeActiveForm,
  removeFromFormsList,
  setActiveForm,
} from "../active-form";
import { createNestedObjectFromDotNotation } from "../engine/FormEngine";
import { useFormControl } from "../hooks/useFormControl";
import { useForm } from "../hooks/useForm";
import { useWatch } from "../hooks/useWatch";
import { requiredRule } from "../rules";
import type {
  FormControlProps,
  FormInterface,
  StandardSchemaV1,
} from "../types";

function TextInput(props: FormControlProps) {
  const { value, changeValue, id, error, otherProps } = useFormControl(props);
  return (
    <>
      <input
        id={id}
        value={value ?? ""}
        onChange={(e) => changeValue(e.target.value)}
        data-testid={`input-${props.name}`}
        {...otherProps}
      />
      {error ? <span data-testid={`error-${props.name}`}>{error}</span> : null}
    </>
  );
}

function FormCapture({ onForm }: { onForm: (form: FormInterface) => void }) {
  const form = useForm();
  React.useEffect(() => {
    if (form) onForm(form);
  }, [form, onForm]);
  return null;
}

async function clickSubmit(getByText: any) {
  fireEvent.click(getByText("Submit"));
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

// ---------------------------------------------------------------------------
// active-form registry — out-of-order unmount (was leaking dead ids)
// ---------------------------------------------------------------------------

describe("active-form registry", () => {
  const fake = (id: string) => ({ id }) as unknown as FormInterface;

  it("purges ids on out-of-order unmount and never resurrects a dead id", () => {
    const a = fake("RF-A");
    const b = fake("RF-B");

    setActiveForm(a);
    addToFormsList(a);
    setActiveForm(b);
    addToFormsList(b);
    expect(getActiveForm()?.id).toBe("RF-B");

    // Unmount A while B is active (out of LIFO order).
    removeActiveForm(a);
    removeFromFormsList(a);
    expect(getActiveForm()?.id).toBe("RF-B"); // B still active

    // Unmount B — there is no live form left; must NOT resurrect dead "RF-A".
    removeActiveForm(b);
    removeFromFormsList(b);
    expect(getActiveForm()).toBeNull();
  });

  it("restores the most-recent still-live form when the active one unmounts", () => {
    const a = fake("RF-C");
    const b = fake("RF-D");
    const c = fake("RF-E");

    [a, b, c].forEach((f) => {
      setActiveForm(f);
      addToFormsList(f);
    });
    expect(getActiveForm()?.id).toBe("RF-E");

    // Unmount B (middle) out of order, then the active C.
    removeActiveForm(b);
    removeFromFormsList(b);
    removeActiveForm(c);
    removeFromFormsList(c);

    // A is still live and must be restored as active.
    expect(getActiveForm()?.id).toBe("RF-C");

    removeActiveForm(a);
    removeFromFormsList(a);
    expect(getActiveForm()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createNestedObjectFromDotNotation — falsy leaves + leaf/parent collision
// ---------------------------------------------------------------------------

describe("createNestedObjectFromDotNotation", () => {
  it("preserves falsy leaf values", () => {
    expect(
      createNestedObjectFromDotNotation({
        "user.age": 0,
        "user.active": false,
        "user.name": "",
      })
    ).toEqual({ user: { age: 0, active: false, name: "" } });
  });

  it("does not throw on a leaf/parent name collision (nested wins)", () => {
    let result: any;
    expect(() => {
      result = createNestedObjectFromDotNotation({ a: 5, "a.b": 2 });
    }).not.toThrow();
    expect(result).toEqual({ a: { b: 2 } });
  });

  it("still nests objects and arrays correctly", () => {
    expect(
      createNestedObjectFromDotNotation({
        "addresses.0.city": "Cairo",
        "addresses.1.city": "London",
      })
    ).toEqual({ addresses: [{ city: "Cairo" }, { city: "London" }] });
  });

  it("does not pollute Object.prototype via a `__proto__` segment", () => {
    createNestedObjectFromDotNotation({ "a.__proto__.polluted": "yes" });

    expect(({} as any).polluted).toBeUndefined();
    expect(Object.prototype).not.toHaveProperty("polluted");
  });

  it("does not pollute Object.prototype via a leading `__proto__` segment", () => {
    createNestedObjectFromDotNotation({ "__proto__.polluted": "yes" });

    expect(({} as any).polluted).toBeUndefined();
  });

  it("does not pollute via `constructor.prototype` segments", () => {
    createNestedObjectFromDotNotation({
      "constructor.prototype.polluted": "yes",
    });

    expect(({} as any).polluted).toBeUndefined();
  });

  it("still nests normal fields alongside a rejected polluting field", () => {
    expect(
      createNestedObjectFromDotNotation({
        "a.__proto__.polluted": "yes",
        "user.name": "Ada",
      })
    ).toEqual({ user: { name: "Ada" } });
  });

  it("treats a numeric segment above the array-index cap as a plain object key, not a sparse array index", () => {
    const result = createNestedObjectFromDotNotation({
      "items.4000000000.x": "boom",
    });

    expect(Array.isArray(result.items)).toBe(false);
    expect(result).toEqual({ items: { "4000000000": { x: "boom" } } });
  });

  it("still uses an array for numeric segments within the cap", () => {
    const result = createNestedObjectFromDotNotation({
      "items.0.x": "a",
      "items.1.x": "b",
    });

    expect(Array.isArray(result.items)).toBe(true);
    expect(result).toEqual({ items: [{ x: "a" }, { x: "b" }] });
  });
});

// ---------------------------------------------------------------------------
// reset(values) — reset to a NEW baseline
// ---------------------------------------------------------------------------

describe("reset(values)", () => {
  it("resets controls to the provided values and makes them the new baseline", () => {
    let form: FormInterface | undefined;
    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <FormCapture onForm={(f) => (form = f)} />
        <TextInput name="firstName" defaultValue="Old" />
      </Form>
    );

    fireEvent.change(getByTestId("input-firstName"), {
      target: { value: "Edited" },
    });

    act(() => {
      form!.reset({ firstName: "New" });
    });
    expect((getByTestId("input-firstName") as HTMLInputElement).value).toBe(
      "New"
    );

    // The new value is now the baseline: a plain reset() restores to it.
    fireEvent.change(getByTestId("input-firstName"), {
      target: { value: "Edited again" },
    });
    act(() => {
      form!.reset();
    });
    expect((getByTestId("input-firstName") as HTMLInputElement).value).toBe(
      "New"
    );
  });
});

// ---------------------------------------------------------------------------
// validate(names) — subset validation by control name
// ---------------------------------------------------------------------------

describe("validate(names)", () => {
  it("validates only the named subset", async () => {
    let form: FormInterface | undefined;
    render(
      <Form onSubmit={() => {}}>
        <FormCapture onForm={(f) => (form = f)} />
        <TextInput name="a" rules={[requiredRule]} required />
        <TextInput name="b" rules={[requiredRule]} required />
      </Form>
    );

    // Validate only "a" (empty, required) → invalid; "b" untouched.
    await act(async () => {
      await form!.validate(["a"]);
    });
    expect(form!.isValid()).toBe(false);

    // Fill "a"; validating only "a" should now be valid even though "b" is empty.
    act(() => form!.change("a", "filled"));
    await act(async () => {
      await form!.validate(["a"]);
    });
    expect(form!.isValid()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Whole-form schema — unmapped issue blocks submit + lands in formErrors
// ---------------------------------------------------------------------------

describe("whole-form schema unmapped issues", () => {
  // A schema that always fails with a cross-field/root issue (empty path).
  const crossFieldSchema: StandardSchemaV1 = {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: () => ({
        issues: [{ message: "passwords do not match", path: [] }],
      }),
    },
  };

  it("blocks submit and records a form-level error for a root-path issue", async () => {
    const onSubmit = vi.fn();
    let form: FormInterface | undefined;
    const { getByText } = render(
      <Form onSubmit={onSubmit} schema={crossFieldSchema as any}>
        <FormCapture onForm={(f) => (form = f)} />
        <TextInput name="password" />
        <button>Submit</button>
      </Form>
    );

    await clickSubmit(getByText);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(form!.formErrors).toContain("passwords do not match");
  });
});

// ---------------------------------------------------------------------------
// useWatch granularity — no re-render for an unrelated field change
// ---------------------------------------------------------------------------

describe("useWatch granularity", () => {
  it("re-renders only when the watched field changes", () => {
    const renders = vi.fn();

    function Watcher() {
      const value = useWatch("watched");
      renders(value);
      return <span data-testid="watched-value">{String(value)}</span>;
    }

    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <Watcher />
        <TextInput name="watched" />
        <TextInput name="other" />
      </Form>
    );

    // Settle the watched value first (the control isn't registered at the
    // watcher's very first render, so let it resolve to a known value).
    fireEvent.change(getByTestId("input-watched"), { target: { value: "hi" } });
    expect(getByTestId("watched-value").textContent).toBe("hi");

    const baseline = renders.mock.calls.length;

    // Change an UNRELATED field — the watcher must not re-render.
    fireEvent.change(getByTestId("input-other"), { target: { value: "x" } });
    expect(renders.mock.calls.length).toBe(baseline);

    // Change the watched field again — now it re-renders.
    fireEvent.change(getByTestId("input-watched"), { target: { value: "bye" } });
    expect(renders.mock.calls.length).toBeGreaterThan(baseline);
    expect(getByTestId("watched-value").textContent).toBe("bye");
  });
});
