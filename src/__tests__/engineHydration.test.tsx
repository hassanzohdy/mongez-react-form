import { act, fireEvent, render } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { Form } from "../components/Form";
import { FormEngine } from "../engine/FormEngine";
import { useFormControl } from "../hooks/useFormControl";
import { useForm } from "../hooks/useForm";
import type { FormControlOptions, FormControlProps, FormInterface } from "../types";

// ---------------------------------------------------------------------------
// Test-only TextInput, mirroring the established pattern in
// useFormControl.test.tsx / rules.test.tsx: a thin wrapper around
// useFormControl that renders an <input> + an error <span>.
// ---------------------------------------------------------------------------
function TextInput(
  props: FormControlProps & { options?: FormControlOptions },
) {
  const { options, ...rest } = props;
  const { value, changeValue, id, error, inputRef, otherProps } = useFormControl(
    rest,
    options,
  );

  return (
    <>
      <input
        id={id}
        ref={inputRef}
        value={value ?? ""}
        onChange={(e) => changeValue(e.target.value)}
        data-testid={`input-${props.name}`}
        {...otherProps}
      />
      {error ? <span data-testid={`error-${props.name}`}>{error}</span> : null}
    </>
  );
}

// Captures the active form into the supplied callback for test assertions.
function FormCapture({ onForm }: { onForm: (form: FormInterface) => void }) {
  const form = useForm();
  React.useEffect(() => {
    if (form) onForm(form);
  }, [form, onForm]);
  return null;
}

/**
 * Submit by clicking the visible Submit button and flush the validation
 * pipeline (a setTimeout(0) tick — same helper shape as rules.test.tsx).
 */
async function submit(getByText: any) {
  fireEvent.click(getByText("Submit"));
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const inputValue = (el: HTMLElement) => (el as HTMLInputElement).value;

// ---------------------------------------------------------------------------
// <Form values={...}> reactive hydration
// ---------------------------------------------------------------------------

describe("<Form values> reactive hydration", () => {
  it("seeds controls that mount AFTER values are present on the form", () => {
    // The form starts with `values` already supplied; the control mounts and
    // should read its seed via form.getInitialValue(name).
    const { getByTestId } = render(
      <Form onSubmit={() => {}} values={{ firstName: "Ada", lastName: "Lovelace" }}>
        <TextInput name="firstName" />
        <TextInput name="lastName" />
      </Form>,
    );

    expect(inputValue(getByTestId("input-firstName"))).toBe("Ada");
    expect(inputValue(getByTestId("input-lastName"))).toBe("Lovelace");
  });

  it("seeds a control that mounts LATER (after the form already has values)", () => {
    // Simulates a control that conditionally renders only after the record
    // has arrived. It must still pick up the seed from hydrationValues.
    function LateMount({ show }: { show: boolean }) {
      return (
        <Form onSubmit={() => {}} values={{ email: "ada@calc.io" }}>
          {show ? <TextInput name="email" /> : null}
          <button>Submit</button>
        </Form>
      );
    }

    const { rerender, getByTestId, queryByTestId } = render(<LateMount show={false} />);
    expect(queryByTestId("input-email")).toBeNull();

    rerender(<LateMount show={true} />);

    expect(inputValue(getByTestId("input-email"))).toBe("ada@calc.io");
  });

  it("re-hydrates already-mounted controls when the values identity changes (async edit-form load)", () => {
    // The form mounts empty, then a new `values` object arrives (e.g. the
    // edit record finished loading) and the form rerenders with a NEW object
    // identity. The mounted control must reflect the new value.
    function EditForm({ record }: { record: Record<string, any> | undefined }) {
      return (
        <Form onSubmit={() => {}} values={record}>
          <TextInput name="firstName" />
          <TextInput name="lastName" />
        </Form>
      );
    }

    const { rerender, getByTestId } = render(<EditForm record={undefined} />);

    // Empty initial render.
    expect(inputValue(getByTestId("input-firstName"))).toBe("");

    // The async load resolves: a brand-new object identity arrives.
    act(() => {
      rerender(<EditForm record={{ firstName: "Grace", lastName: "Hopper" }} />);
    });

    expect(inputValue(getByTestId("input-firstName"))).toBe("Grace");
    expect(inputValue(getByTestId("input-lastName"))).toBe("Hopper");
  });

  it("re-hydration submits the latest hydrated values", async () => {
    const submitted: any[] = [];

    function EditForm({ record }: { record: Record<string, any> | undefined }) {
      return (
        <Form onSubmit={({ values }) => submitted.push(values)} values={record}>
          <TextInput name="firstName" />
          <button>Submit</button>
        </Form>
      );
    }

    const { rerender, getByText } = render(<EditForm record={undefined} />);

    act(() => {
      rerender(<EditForm record={{ firstName: "Katherine" }} />);
    });

    await submit(getByText);

    expect(submitted).toHaveLength(1);
    expect(submitted[0]).toEqual({ firstName: "Katherine" });
  });
});

// ---------------------------------------------------------------------------
// form.fill() / form.setValues() bulk helpers
// ---------------------------------------------------------------------------

describe("form.fill() / form.setValues()", () => {
  it("fill() updates already-mounted controls", () => {
    let form: FormInterface | undefined;

    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <FormCapture onForm={(f) => (form = f)} />
        <TextInput name="firstName" />
        <TextInput name="lastName" />
      </Form>,
    );

    act(() => {
      form!.fill({ firstName: "Ada", lastName: "Lovelace" });
    });

    expect(inputValue(getByTestId("input-firstName"))).toBe("Ada");
    expect(inputValue(getByTestId("input-lastName"))).toBe("Lovelace");
  });

  it("fill() seeds controls that mount AFTER the fill via getInitialValue", () => {
    let form: FormInterface | undefined;

    function Harness({ show }: { show: boolean }) {
      return (
        <Form onSubmit={() => {}}>
          <FormCapture onForm={(f) => (form = f)} />
          {show ? <TextInput name="city" /> : null}
        </Form>
      );
    }

    const { rerender, getByTestId, queryByTestId } = render(<Harness show={false} />);
    expect(queryByTestId("input-city")).toBeNull();

    act(() => {
      form!.fill({ city: "Cairo" });
    });

    // The control mounts only now — it must read the filled value.
    rerender(<Harness show={true} />);

    expect(inputValue(getByTestId("input-city"))).toBe("Cairo");
    // getInitialValue should resolve from hydrationValues directly too.
    expect(form!.getInitialValue("city")).toBe("Cairo");
  });

  it("setValues() is an alias of fill()", () => {
    let form: FormInterface | undefined;

    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <FormCapture onForm={(f) => (form = f)} />
        <TextInput name="firstName" />
      </Form>,
    );

    act(() => {
      form!.setValues({ firstName: "Margaret" });
    });

    expect(inputValue(getByTestId("input-firstName"))).toBe("Margaret");
  });

  it("fill() does not mark controls dirty by default", () => {
    let form: FormInterface | undefined;

    render(
      <Form onSubmit={() => {}}>
        <FormCapture onForm={(f) => (form = f)} />
        <TextInput name="firstName" />
      </Form>,
    );

    act(() => {
      form!.fill({ firstName: "Ada" });
    });

    expect(form!.isDirty).toBe(false);
    expect(form!.dirtyControls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// defaultValue is the RESET baseline (not the filled values)
// ---------------------------------------------------------------------------

describe("defaultValue is the reset baseline", () => {
  it("reset() restores defaultValue, not the values that were filled in", () => {
    let form: FormInterface | undefined;

    const { getByTestId } = render(
      <Form onSubmit={() => {}} defaultValue={{ firstName: "Baseline" }}>
        <FormCapture onForm={(f) => (form = f)} />
        <TextInput name="firstName" />
      </Form>,
    );

    // Mounted control seeds from defaultValue.
    expect(inputValue(getByTestId("input-firstName"))).toBe("Baseline");

    // A later fill() overwrites the visible value...
    act(() => {
      form!.fill({ firstName: "Filled" });
    });
    expect(inputValue(getByTestId("input-firstName"))).toBe("Filled");

    // ...but reset() must go back to the defaultValue baseline, NOT the fill.
    act(() => {
      form!.reset();
    });
    expect(inputValue(getByTestId("input-firstName"))).toBe("Baseline");
  });

  // When BOTH `values` and `defaultValue` are supplied to <Form> at mount, the
  // control seeds (displays) the HYDRATED value but its reset baseline is the
  // `defaultValue` — so reset() restores "Baseline", not "Hydrated". Fixed in
  // v4 via FormEngine.getResetBaseline() (default-only, never the hydration
  // snapshot) feeding formControl.initialValue.
  it(
    "<Form values> hydration does not become the reset baseline",
    () => {
      let form: FormInterface | undefined;

      const { getByTestId } = render(
        <Form
          onSubmit={() => {}}
          defaultValue={{ firstName: "Baseline" }}
          values={{ firstName: "Hydrated" }}
        >
          <FormCapture onForm={(f) => (form = f)} />
          <TextInput name="firstName" />
        </Form>,
      );

      // value seeds win over defaultValue at mount.
      expect(inputValue(getByTestId("input-firstName"))).toBe("Hydrated");

      act(() => {
        form!.reset();
      });

      // CORRECT expectation: reset restores the defaultValue baseline, not the
      // hydrated value. Currently fails (observed: "Hydrated").
      expect(inputValue(getByTestId("input-firstName"))).toBe("Baseline");
    },
  );
});

// ---------------------------------------------------------------------------
// setDefaultValue() — re-hydrates ONLY non-dirty controls
// ---------------------------------------------------------------------------

describe("setDefaultValue()", () => {
  it("re-hydrates pristine controls but leaves dirty ones untouched", () => {
    let form: FormInterface | undefined;

    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <FormCapture onForm={(f) => (form = f)} />
        <TextInput name="firstName" />
        <TextInput name="lastName" />
      </Form>,
    );

    // The user edits lastName (it becomes dirty); firstName stays pristine.
    fireEvent.change(getByTestId("input-lastName"), {
      target: { value: "UserEdited" },
    });

    act(() => {
      form!.setDefaultValue({ firstName: "Ada", lastName: "FromBaseline" });
    });

    // Pristine control adopts the new baseline.
    expect(inputValue(getByTestId("input-firstName"))).toBe("Ada");
    // Dirty control keeps the user's edit.
    expect(inputValue(getByTestId("input-lastName"))).toBe("UserEdited");
  });

  it("a control re-hydrated by setDefaultValue resets to the NEW baseline", () => {
    let form: FormInterface | undefined;

    const { getByTestId } = render(
      <Form onSubmit={() => {}} defaultValue={{ firstName: "Old" }}>
        <FormCapture onForm={(f) => (form = f)} />
        <TextInput name="firstName" />
      </Form>,
    );

    expect(inputValue(getByTestId("input-firstName"))).toBe("Old");

    act(() => {
      form!.setDefaultValue({ firstName: "New" });
    });
    expect(inputValue(getByTestId("input-firstName"))).toBe("New");

    // Edit then reset — should fall back to the NEW baseline.
    fireEvent.change(getByTestId("input-firstName"), { target: { value: "typed" } });
    act(() => {
      form!.reset();
    });
    expect(inputValue(getByTestId("input-firstName"))).toBe("New");
  });
});

// ---------------------------------------------------------------------------
// Nested + array controls hydrate correctly
// ---------------------------------------------------------------------------

describe("nested + array hydration", () => {
  it("hydrates dot-notation nested controls from <Form values>", () => {
    const { getByTestId } = render(
      <Form
        onSubmit={() => {}}
        values={{ user: { firstName: "Ada", lastName: "Lovelace" } }}
      >
        <TextInput name="user.firstName" />
        <TextInput name="user.lastName" />
      </Form>,
    );

    expect(inputValue(getByTestId("input-user.firstName"))).toBe("Ada");
    expect(inputValue(getByTestId("input-user.lastName"))).toBe("Lovelace");
  });

  it("hydrates numeric-segment (array) controls from <Form values>", async () => {
    const onSubmit = vi_submit_capture();

    const { getByTestId, getByText } = render(
      <Form
        onSubmit={onSubmit.fn}
        values={{ addresses: [{ city: "Cairo" }, { city: "London" }] }}
      >
        <TextInput name="addresses.0.city" />
        <TextInput name="addresses.1.city" />
        <button>Submit</button>
      </Form>,
    );

    expect(inputValue(getByTestId("input-addresses.0.city"))).toBe("Cairo");
    expect(inputValue(getByTestId("input-addresses.1.city"))).toBe("London");

    await submit(getByText);

    expect(onSubmit.values).toEqual({
      addresses: [{ city: "Cairo" }, { city: "London" }],
    });
  });

  it("fill() hydrates a `multiple` control with an array value", () => {
    let form: FormInterface | undefined;

    function MultiInput(props: FormControlProps) {
      const { value, id, inputRef } = useFormControl(props, { multiple: true });
      return (
        <input
          id={id}
          ref={inputRef}
          readOnly
          value={Array.isArray(value) ? value.join(",") : String(value ?? "")}
          data-testid={`input-${props.name}`}
        />
      );
    }

    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <FormCapture onForm={(f) => (form = f)} />
        <MultiInput name="tags" />
      </Form>,
    );

    act(() => {
      form!.fill({ tags: ["red", "green", "blue"] });
    });

    expect(inputValue(getByTestId("input-tags"))).toBe("red,green,blue");
    expect(form!.value("tags")).toEqual(["red", "green", "blue"]);
  });
});

// ---------------------------------------------------------------------------
// React-free engine unit tests
// ---------------------------------------------------------------------------

describe("FormEngine (React-free)", () => {
  it("fill() merges into hydrationValues and getInitialValue reads it", () => {
    const engine = new FormEngine();

    engine.fill({ firstName: "Ada", user: { city: "Cairo" } });

    expect(engine.getInitialValue("firstName")).toBe("Ada");
    expect(engine.getInitialValue("user.city")).toBe("Cairo");
    expect(engine.getInitialValue("missing")).toBeUndefined();
  });

  it("getInitialValue precedence: hydration value wins over defaultValue", () => {
    const engine = new FormEngine({
      defaultValue: { firstName: "Baseline", lastName: "OnlyDefault" },
      values: { firstName: "Hydrated" },
    });

    // hydration present for firstName → hydration wins.
    expect(engine.getInitialValue("firstName")).toBe("Hydrated");
    // hydration absent for lastName → falls through to defaultValue.
    expect(engine.getInitialValue("lastName")).toBe("OnlyDefault");
  });

  it("fill() takes precedence over a constructed defaultValue", () => {
    const engine = new FormEngine({ defaultValue: { firstName: "Baseline" } });

    expect(engine.getInitialValue("firstName")).toBe("Baseline");

    engine.fill({ firstName: "Filled" });

    expect(engine.getInitialValue("firstName")).toBe("Filled");
  });

  it("setValues() is an alias of fill() on the engine", () => {
    const engine = new FormEngine();

    engine.setValues({ token: "abc" });

    expect(engine.getInitialValue("token")).toBe("abc");
  });

  it("setDefaultValue() updates the baseline read by getInitialValue", () => {
    const engine = new FormEngine();

    expect(engine.getInitialValue("firstName")).toBeUndefined();

    engine.setDefaultValue({ firstName: "Baseline" });

    expect(engine.getInitialValue("firstName")).toBe("Baseline");
  });
});

// ---------------------------------------------------------------------------
// Tiny helper: capture the submitted values without pulling in vi.fn ceremony.
// ---------------------------------------------------------------------------
function vi_submit_capture() {
  const capture: { values: any; fn: (opts: { values: any }) => void } = {
    values: undefined,
    fn: ({ values }) => {
      capture.values = values;
    },
  };
  return capture;
}
