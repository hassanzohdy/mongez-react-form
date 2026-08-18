import { act, fireEvent, render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { Form } from "../components/Form";
import { useFieldArray } from "../hooks/useFieldArray";
import { useFormControl } from "../hooks/useFormControl";
import { useWatch } from "../hooks/useWatch";
import { requiredRule } from "../rules";
import type { FormControlProps, FormInterface } from "../types";

// ---------------------------------------------------------------------------
// Test-only TextInput. Mirrors the canonical wrapper used across the suite —
// thin layer over useFormControl that spreads otherProps onto the <input>.
// ---------------------------------------------------------------------------
function TextInput(
  props: FormControlProps & { "data-testid"?: string },
) {
  const { value, changeValue, id, error, inputRef, otherProps } =
    useFormControl(props);

  return (
    <>
      <input
        id={id}
        ref={inputRef}
        value={value ?? ""}
        onChange={(e) => changeValue(e.target.value)}
        data-testid={props["data-testid"] ?? `input-${props.name}`}
        {...otherProps}
      />
      {error ? (
        <span data-testid={`error-${props.name}`}>{error}</span>
      ) : null}
    </>
  );
}

/**
 * A11y-first input: drives the DOM purely from getInputProps()/getErrorProps()
 * so the test can assert the spread shape (value/onChange/id/name/aria-*).
 */
function A11yInput(
  props: FormControlProps & { "data-testid"?: string },
) {
  const { getInputProps, getErrorProps, error, errorId } =
    useFormControl(props);

  return (
    <>
      <input
        data-testid={props["data-testid"] ?? `input-${props.name}`}
        {...getInputProps()}
      />
      {error ? (
        <span data-testid={`error-${props.name}`} {...getErrorProps()}>
          {error}
        </span>
      ) : (
        // Keep errorId in scope so the lint sees it used; the element only
        // renders when there is an error.
        <span data-testid={`errorid-${props.name}`} hidden>
          {errorId}
        </span>
      )}
    </>
  );
}

/**
 * Submit the form by clicking its visible Submit button and let the
 * validation pipeline (which awaits each control.validate()) flush.
 */
async function clickSubmit(getByText: any) {
  fireEvent.click(getByText("Submit"));
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

// ===========================================================================
// useFieldArray
// ===========================================================================

describe("useFieldArray", () => {
  // A repeatable row list rendered from useFieldArray. Each row renders a
  // single text input named `${field.name}.city`. Buttons exercise the
  // helpers. type="button" so they never submit the form.
  function AddressList() {
    const { fields, append, prepend, remove, insert, move, swap } =
      useFieldArray("addresses");

    return (
      <div>
        {fields.map((field) => (
          <div key={field.key} data-key={field.key}>
            <TextInput
              name={`${field.name}.city`}
              data-testid={`city-${field.index}`}
            />
          </div>
        ))}
        <button type="button" onClick={() => append()}>
          append
        </button>
        <button type="button" onClick={() => prepend()}>
          prepend
        </button>
        <button type="button" onClick={() => insert(1)}>
          insert-1
        </button>
        <button type="button" onClick={() => remove(1)}>
          remove-1
        </button>
        <button type="button" onClick={() => move(0, 2)}>
          move-0-2
        </button>
        <button type="button" onClick={() => swap(0, 2)}>
          swap-0-2
        </button>
      </div>
    );
  }

  it("collects appended rows as an ordered array", async () => {
    const onSubmit = vi.fn();
    const { getByText, getByTestId } = render(
      <Form onSubmit={onSubmit}>
        <AddressList />
        <button>Submit</button>
      </Form>,
    );

    act(() => fireEvent.click(getByText("append")));
    act(() => fireEvent.click(getByText("append")));
    act(() => fireEvent.click(getByText("append")));

    fireEvent.change(getByTestId("city-0"), { target: { value: "Cairo" } });
    fireEvent.change(getByTestId("city-1"), { target: { value: "London" } });
    fireEvent.change(getByTestId("city-2"), { target: { value: "Paris" } });

    await clickSubmit(getByText);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].values).toEqual({
      addresses: [{ city: "Cairo" }, { city: "London" }, { city: "Paris" }],
    });
  });

  // KNOWN BUG (kept asserting the CORRECT v4 contract — do NOT weaken):
  // useFieldArray's contract: "a surviving row carries its own value when
  // others are removed or moved". Fixed in v4 — the registration effect
  // (deps include `name`) now syncs `formControl.name = name` before
  // re-registering, so a reindexed row is collected under its new name while
  // keeping its (persisted) value. Removing the middle row yields
  // [Cairo, Paris], not [Cairo, undefined, Paris].
  it(
    "removing a middle row drops its value; survivors keep theirs and reindex",
    async () => {
      const onSubmit = vi.fn();
      const { getByText, getByTestId } = render(
        <Form onSubmit={onSubmit}>
          <AddressList />
          <button>Submit</button>
        </Form>,
      );

      act(() => fireEvent.click(getByText("append")));
      act(() => fireEvent.click(getByText("append")));
      act(() => fireEvent.click(getByText("append")));

      fireEvent.change(getByTestId("city-0"), { target: { value: "Cairo" } });
      fireEvent.change(getByTestId("city-1"), { target: { value: "London" } });
      fireEvent.change(getByTestId("city-2"), { target: { value: "Paris" } });

      // Remove the middle row (index 1 => "London").
      act(() => fireEvent.click(getByText("remove-1")));

      await clickSubmit(getByText);

      // CORRECT v4 contract: only the survivors' values remain, reindexed.
      expect(onSubmit.mock.calls[0][0].values).toEqual({
        addresses: [{ city: "Cairo" }, { city: "Paris" }],
      });
    },
  );

  it("keys are stable across reorder/insert/remove (a surviving row keeps its key)", () => {
    const { getByText, container } = render(
      <Form onSubmit={() => {}}>
        <AddressList />
        <button>Submit</button>
      </Form>,
    );

    act(() => fireEvent.click(getByText("append")));
    act(() => fireEvent.click(getByText("append")));
    act(() => fireEvent.click(getByText("append")));

    const keysBefore = Array.from(
      container.querySelectorAll("[data-key]"),
    ).map((el) => el.getAttribute("data-key"));
    expect(keysBefore).toHaveLength(3);

    const firstKey = keysBefore[0];
    const lastKey = keysBefore[2];

    // Swap row 0 and row 2 — keys must travel with the rows, not the slots.
    act(() => fireEvent.click(getByText("swap-0-2")));

    const keysAfterSwap = Array.from(
      container.querySelectorAll("[data-key]"),
    ).map((el) => el.getAttribute("data-key"));
    expect(keysAfterSwap[0]).toBe(lastKey);
    expect(keysAfterSwap[2]).toBe(firstKey);
    // The middle row kept its identity.
    expect(keysAfterSwap[1]).toBe(keysBefore[1]);

    // Insert a row at index 1 — the existing keys are preserved and one new
    // key appears.
    act(() => fireEvent.click(getByText("insert-1")));

    const keysAfterInsert = Array.from(
      container.querySelectorAll("[data-key]"),
    ).map((el) => el.getAttribute("data-key"));
    expect(keysAfterInsert).toHaveLength(4);
    // Every key from before the insert still exists.
    for (const k of keysAfterSwap) {
      expect(keysAfterInsert).toContain(k);
    }
    // All keys are unique.
    expect(new Set(keysAfterInsert).size).toBe(4);
  });

  // Fixed alongside the remove test: with `formControl.name` synced on
  // reindex, the collected array reflects the moved order.
  it(
    "move preserves each row's value (values follow the moved row)",
    async () => {
      const onSubmit = vi.fn();
      const { getByText, getByTestId } = render(
        <Form onSubmit={onSubmit}>
          <AddressList />
          <button>Submit</button>
        </Form>,
      );

      act(() => fireEvent.click(getByText("append")));
      act(() => fireEvent.click(getByText("append")));
      act(() => fireEvent.click(getByText("append")));

      fireEvent.change(getByTestId("city-0"), { target: { value: "Cairo" } });
      fireEvent.change(getByTestId("city-1"), { target: { value: "London" } });
      fireEvent.change(getByTestId("city-2"), { target: { value: "Paris" } });

      // Move row 0 (Cairo) to index 2. Order becomes London, Paris, Cairo.
      act(() => fireEvent.click(getByText("move-0-2")));

      await clickSubmit(getByText);

      // CORRECT v4 contract: the collected array reflects the moved order.
      expect(onSubmit.mock.calls[0][0].values).toEqual({
        addresses: [{ city: "London" }, { city: "Paris" }, { city: "Cairo" }],
      });
    },
  );

  it("seeds initial rows from the form's defaultValue array", async () => {
    const onSubmit = vi.fn();
    const { getByText, getByTestId } = render(
      <Form
        onSubmit={onSubmit}
        defaultValue={{ addresses: [{ city: "Rome" }, { city: "Berlin" }] }}
      >
        <AddressList />
        <button>Submit</button>
      </Form>,
    );

    // Two rows should already exist, seeded from defaultValue.
    expect((getByTestId("city-0") as HTMLInputElement).value).toBe("Rome");
    expect((getByTestId("city-1") as HTMLInputElement).value).toBe("Berlin");

    await clickSubmit(getByText);
    expect(onSubmit.mock.calls[0][0].values).toEqual({
      addresses: [{ city: "Rome" }, { city: "Berlin" }],
    });
  });
});

// ===========================================================================
// useWatch
// ===========================================================================

describe("useWatch", () => {
  it("useWatch(name) re-renders with the latest value as the field changes", () => {
    function Mirror() {
      const value = useWatch("firstName");
      return <span data-testid="mirror">{value ?? ""}</span>;
    }

    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput name="firstName" />
        <Mirror />
      </Form>,
    );

    expect(getByTestId("mirror").textContent).toBe("");

    fireEvent.change(getByTestId("input-firstName"), {
      target: { value: "Ada" },
    });

    expect(getByTestId("mirror").textContent).toBe("Ada");

    fireEvent.change(getByTestId("input-firstName"), {
      target: { value: "Grace" },
    });
    expect(getByTestId("mirror").textContent).toBe("Grace");
  });

  it("useWatch(name) reacts to a DIFFERENT field changing (dependent field)", () => {
    // Renders a hint that depends on `country`. Changing `country` must
    // re-render the watcher even though it lives in a sibling component.
    function Hint() {
      const country = useWatch("country");
      return (
        <span data-testid="hint">
          {country === "EG" ? "Welcome to Egypt" : "Pick a country"}
        </span>
      );
    }

    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput name="country" />
        <TextInput name="city" />
        <Hint />
      </Form>,
    );

    expect(getByTestId("hint").textContent).toBe("Pick a country");

    fireEvent.change(getByTestId("input-country"), {
      target: { value: "EG" },
    });
    expect(getByTestId("hint").textContent).toBe("Welcome to Egypt");
  });

  it("useWatch(names[]) returns the array of watched values in order", () => {
    function Pair() {
      const [a, b] = useWatch(["a", "b"]);
      return (
        <span data-testid="pair">
          {String(a ?? "")}|{String(b ?? "")}
        </span>
      );
    }

    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput name="a" />
        <TextInput name="b" />
        <Pair />
      </Form>,
    );

    expect(getByTestId("pair").textContent).toBe("|");

    fireEvent.change(getByTestId("input-a"), { target: { value: "1" } });
    expect(getByTestId("pair").textContent).toBe("1|");

    fireEvent.change(getByTestId("input-b"), { target: { value: "2" } });
    expect(getByTestId("pair").textContent).toBe("1|2");
  });
});

// ===========================================================================
// a11y — getInputProps / getErrorProps
// ===========================================================================

describe("a11y — getInputProps / getErrorProps", () => {
  it("getInputProps spreads value/onChange/id/name onto the input", () => {
    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <A11yInput name="firstName" />
      </Form>,
    );

    const input = getByTestId("input-firstName") as HTMLInputElement;

    // id derives from the name; name is forwarded as-is.
    expect(input.id).toBe("input-firstName");
    expect(input.getAttribute("name")).toBe("firstName");

    // onChange is wired — typing updates the controlled value.
    fireEvent.change(input, { target: { value: "Ada" } });
    expect(input.value).toBe("Ada");
  });

  it("aria-required reflects the required prop", () => {
    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <A11yInput name="firstName" required />
      </Form>,
    );

    expect(
      getByTestId("input-firstName").getAttribute("aria-required"),
    ).toBe("true");
  });

  it("after a submit error, the input gets aria-invalid + aria-describedby and the error node has role=alert", async () => {
    const { getByText, getByTestId, findByTestId } = render(
      <Form onSubmit={() => {}}>
        <A11yInput name="firstName" rules={[requiredRule]} required />
        <button>Submit</button>
      </Form>,
    );

    const input = getByTestId("input-firstName") as HTMLInputElement;

    // aria-invalid only appears once the control is touched AND invalid.
    fireEvent.focus(input);

    await clickSubmit(getByText);

    const errorNode = await findByTestId("error-firstName");

    // aria-invalid is set on the input.
    expect(input.getAttribute("aria-invalid")).toBe("true");

    // aria-describedby points at the error node's id, and getErrorProps()
    // exposes that id with role="alert" + aria-live="polite".
    expect(input.getAttribute("aria-describedby")).toBe(
      errorNode.getAttribute("id"),
    );
    expect(errorNode.getAttribute("role")).toBe("alert");
    expect(errorNode.getAttribute("aria-live")).toBe("polite");
  });

  it("validateOn and schema do NOT leak onto the DOM input", () => {
    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <A11yInput
          name="firstName"
          validateOn="blur"
          // A duck-typed Standard Schema; must never reach the DOM.
          schema={
            {
              "~standard": {
                version: 1,
                vendor: "test",
                validate: (value: any) => ({ value }),
              },
            } as any
          }
        />
        <TextInput name="lastName" validateOn="submit" />
      </Form>,
    );

    const a11yInput = getByTestId("input-firstName");
    expect(a11yInput.getAttribute("validateOn")).toBeNull();
    expect(a11yInput.hasAttribute("schema")).toBe(false);

    // The classic TextInput wrapper (spreads otherProps) must also be clean.
    const textInput = getByTestId("input-lastName");
    expect(textInput.getAttribute("validateOn")).toBeNull();
  });
});

// ===========================================================================
// Form as a function component — engine exposed via ref
// ===========================================================================

describe("Form function component + ref", () => {
  it("exposes the FormEngine through ref (useRef + ref={r})", () => {
    let captured: FormInterface | undefined;

    function Harness() {
      const ref = React.useRef<FormInterface>(null);

      React.useEffect(() => {
        captured = ref.current ?? undefined;
      }, []);

      return (
        <Form ref={ref} onSubmit={() => {}}>
          <TextInput name="firstName" />
          <button>Submit</button>
        </Form>
      );
    }

    const { getByTestId } = render(<Harness />);

    expect(captured).toBeDefined();
    // The ref is the engine: it implements the FormInterface surface.
    expect(typeof captured!.values).toBe("function");
    expect(typeof captured!.isSubmitting).toBe("function");
    expect(typeof captured!.change).toBe("function");

    // Driving the engine through the ref reflects into the DOM and back.
    act(() => {
      captured!.change("firstName", "Ada");
    });
    expect((getByTestId("input-firstName") as HTMLInputElement).value).toBe(
      "Ada",
    );
    expect(captured!.value("firstName")).toBe("Ada");
  });

  it("ref.id is stable (SSR-safe id from React useId, not Math.random)", () => {
    const ids: string[] = [];

    function Harness() {
      const ref = React.useRef<FormInterface>(null);
      const [, force] = React.useReducer((c: number) => c + 1, 0);

      React.useEffect(() => {
        if (ref.current) ids.push(ref.current.id);
      });

      return (
        <Form ref={ref} onSubmit={() => {}}>
          <button type="button" onClick={() => force()}>
            rerender
          </button>
        </Form>
      );
    }

    const { getByText } = render(<Harness />);
    act(() => fireEvent.click(getByText("rerender")));

    // Same engine id across renders.
    expect(ids.length).toBeGreaterThanOrEqual(2);
    expect(new Set(ids).size).toBe(1);
  });
});

// ===========================================================================
// Awaited submit — auto-clears submitting when onSubmit's promise settles
// ===========================================================================

describe("Awaited submit", () => {
  it("auto-clears submitting when the returned promise RESOLVES (no manual submitting(false))", async () => {
    let captured: FormInterface | undefined;

    // A deferred promise we resolve by hand, so we can observe the
    // submitting flag flip true -> stay true -> false on settle.
    let resolveSubmit!: () => void;
    const pending = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });

    const states: boolean[] = [];

    const onSubmit = vi.fn(({ form }: { form: FormInterface }) => {
      captured = form;
      // At the moment onSubmit runs, the engine has already flagged submitting.
      states.push(form.isSubmitting());
      return pending;
    });

    const { getByText, getByTestId } = render(
      <Form onSubmit={onSubmit}>
        <TextInput name="firstName" />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-firstName"), {
      target: { value: "Ada" },
    });

    fireEvent.click(getByText("Submit"));

    // Let validation flush and onSubmit fire.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    // Inside onSubmit the form was already submitting.
    expect(states[0]).toBe(true);
    // Still submitting while the promise is pending — NOT cleared yet.
    expect(captured!.isSubmitting()).toBe(true);

    // Settle the promise; the engine must auto-clear submitting.
    await act(async () => {
      resolveSubmit();
      await pending;
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(captured!.isSubmitting()).toBe(false);
  });

  it("auto-clears submitting when the returned promise REJECTS", async () => {
    let captured: FormInterface | undefined;

    let rejectSubmit!: (e: any) => void;
    const pending = new Promise<void>((_, reject) => {
      rejectSubmit = reject;
    });
    // Pre-attach a catch so the rejection is never unhandled.
    pending.catch(() => {});

    const onSubmit = vi.fn(({ form }: { form: FormInterface }) => {
      captured = form;
      return pending;
    });

    const { getByText } = render(
      <Form onSubmit={onSubmit}>
        <TextInput name="firstName" defaultValue="Ada" />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.click(getByText("Submit"));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(captured!.isSubmitting()).toBe(true);

    await act(async () => {
      rejectSubmit(new Error("server down"));
      // Wait a tick for the rejection branch to run.
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(captured!.isSubmitting()).toBe(false);
  });

  it("a SYNC onSubmit leaves submitting true (caller still owns it)", async () => {
    let captured: FormInterface | undefined;

    const onSubmit = vi.fn(({ form }: { form: FormInterface }) => {
      captured = form;
      // Returns undefined (sync) — engine must NOT auto-clear.
    });

    const { getByText } = render(
      <Form onSubmit={onSubmit}>
        <TextInput name="firstName" defaultValue="Ada" />
        <button>Submit</button>
      </Form>,
    );

    await clickSubmit(getByText);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    // Sync handlers keep the legacy contract: submitting stays true until the
    // caller clears it explicitly.
    expect(captured!.isSubmitting()).toBe(true);
  });
});
