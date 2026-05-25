import { act, fireEvent, render } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Form } from "../components/Form";
import { HiddenInput } from "../components/HiddenInput";
import { useFormControl } from "../hooks/useFormControl";
import { useForm } from "../hooks/useForm";
import { emailRule, minLengthRule, requiredRule } from "../rules";
import type { FormControlProps, FormInterface } from "../types";

// ---------------------------------------------------------------------------
// Test-only TextInput. Mirrors the canonical example from README. Generic
// enough that every test below can reuse it.
// ---------------------------------------------------------------------------
function TextInput(
  props: FormControlProps & { "data-testid"?: string; "data-error-testid"?: string },
) {
  const {
    value,
    changeValue,
    id,
    error,
    inputRef,
    otherProps,
  } = useFormControl(props);

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
        <span data-testid={props["data-error-testid"] ?? `error-${props.name}`}>
          {error}
        </span>
      ) : null}
    </>
  );
}

function Checkbox(props: FormControlProps) {
  const { checked, setChecked, id } = useFormControl({
    ...props,
    type: "checkbox",
  });
  return (
    <input
      id={id}
      type="checkbox"
      checked={Boolean(checked)}
      onChange={(e) => setChecked(e.target.checked)}
      data-testid={`input-${props.name}`}
    />
  );
}

// Captures the active form into a ref for test assertions.
function FormCapture({ onForm }: { onForm: (form: FormInterface) => void }) {
  const form = useForm();
  React.useEffect(() => {
    if (form) onForm(form);
  }, [form, onForm]);
  return null;
}

// ---------------------------------------------------------------------------
// useFormControl — value collection and dot-notation nesting
// ---------------------------------------------------------------------------

/**
 * Submit the form by clicking its visible Submit button. The button
 * defaults to type="submit" (HTML default for a <button> inside <form>),
 * so this dispatches the form's submit event. The pipeline awaits each
 * input.validate() — those are sync but return Promises — so a single
 * microtask tick is enough to let `onSubmit` complete.
 */
async function clickSubmit(getByText: any) {
  fireEvent.click(getByText("Submit"));
  await act(async () => {
    await Promise.resolve();
  });
}

describe("useFormControl — value collection", () => {
  it("collects values from registered controls by name", async () => {
    const onSubmit = vi.fn();
    const { getByTestId, getByText } = render(
      <Form onSubmit={onSubmit}>
        <TextInput name="firstName" />
        <TextInput name="lastName" />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-firstName"), { target: { value: "Ada" } });
    fireEvent.change(getByTestId("input-lastName"), { target: { value: "Lovelace" } });

    await clickSubmit(getByText);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].values).toEqual({
      firstName: "Ada",
      lastName: "Lovelace",
    });
  });

  it("nests dot-notation names into objects", async () => {
    const onSubmit = vi.fn();
    const { getByTestId, getByText } = render(
      <Form onSubmit={onSubmit}>
        <TextInput name="user.firstName" />
        <TextInput name="user.lastName" />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-user.firstName"), {
      target: { value: "Ada" },
    });
    fireEvent.change(getByTestId("input-user.lastName"), {
      target: { value: "Lovelace" },
    });
    await clickSubmit(getByText);

    expect(onSubmit.mock.calls[0][0].values).toEqual({
      user: { firstName: "Ada", lastName: "Lovelace" },
    });
  });

  it("nests numeric-segment names into arrays", async () => {
    const onSubmit = vi.fn();
    const { getByTestId, getByText } = render(
      <Form onSubmit={onSubmit}>
        <TextInput name="addresses.0.city" />
        <TextInput name="addresses.1.city" />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-addresses.0.city"), {
      target: { value: "Cairo" },
    });
    fireEvent.change(getByTestId("input-addresses.1.city"), {
      target: { value: "London" },
    });
    await clickSubmit(getByText);

    expect(onSubmit.mock.calls[0][0].values).toEqual({
      addresses: [{ city: "Cairo" }, { city: "London" }],
    });
  });

  it("ignoreEmptyValues skips null/undefined/empty-string fields", async () => {
    const onSubmit = vi.fn();
    const { getByTestId, getByText } = render(
      <Form onSubmit={onSubmit} ignoreEmptyValues>
        <TextInput name="firstName" />
        <TextInput name="middleName" />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-firstName"), { target: { value: "Ada" } });
    await clickSubmit(getByText);

    expect(onSubmit.mock.calls[0][0].values).toEqual({ firstName: "Ada" });
  });

  it("uses defaultValue at the control level", async () => {
    const onSubmit = vi.fn();
    const { getByText } = render(
      <Form onSubmit={onSubmit}>
        <TextInput name="firstName" defaultValue="Ada" />
        <button>Submit</button>
      </Form>,
    );
    await clickSubmit(getByText);
    expect(onSubmit.mock.calls[0][0].values).toEqual({ firstName: "Ada" });
  });

  it("uses defaultValue at the form level when control has none", async () => {
    const onSubmit = vi.fn();
    const { getByText } = render(
      <Form
        onSubmit={onSubmit}
        defaultValue={{ user: { firstName: "Ada", lastName: "Lovelace" } }}
      >
        <TextInput name="user.firstName" />
        <TextInput name="user.lastName" />
        <button>Submit</button>
      </Form>,
    );
    await clickSubmit(getByText);
    expect(onSubmit.mock.calls[0][0].values).toEqual({
      user: { firstName: "Ada", lastName: "Lovelace" },
    });
  });

  it("control-level defaultValue wins over form-level", async () => {
    const onSubmit = vi.fn();
    const { getByText } = render(
      <Form onSubmit={onSubmit} defaultValue={{ name: "FromForm" }}>
        <TextInput name="name" defaultValue="FromControl" />
        <button>Submit</button>
      </Form>,
    );
    await clickSubmit(getByText);
    expect(onSubmit.mock.calls[0][0].values).toEqual({ name: "FromControl" });
  });

  it("HiddenInput contributes a value with no rendered element", async () => {
    const onSubmit = vi.fn();
    const { container, getByText } = render(
      <Form onSubmit={onSubmit}>
        <HiddenInput name="csrfToken" defaultValue="abc123" />
        <TextInput name="firstName" defaultValue="Ada" />
        <button>Submit</button>
      </Form>,
    );

    // HiddenInput renders null — only the visible TextInput should land
    // in the DOM.
    expect(container.querySelectorAll('[data-testid^="input-"]').length).toBe(1);

    await clickSubmit(getByText);
    expect(onSubmit.mock.calls[0][0].values).toEqual({
      csrfToken: "abc123",
      firstName: "Ada",
    });
  });
});

// ---------------------------------------------------------------------------
// useFormControl — id derivation
// ---------------------------------------------------------------------------

describe("useFormControl — id derivation", () => {
  it("derives id from name when none is supplied", () => {
    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput name="firstName" />
      </Form>,
    );
    expect(getByTestId("input-firstName").id).toBe("input-firstName");
  });

  it("sanitizes dots and brackets in derived ids", () => {
    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput name="user.firstName" />
      </Form>,
    );
    expect(getByTestId("input-user.firstName").id).toBe("input-user-firstName");
  });

  it("honors a user-supplied id", () => {
    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput name="firstName" id="custom-id" />
      </Form>,
    );
    expect(getByTestId("input-firstName").id).toBe("custom-id");
  });
});

// ---------------------------------------------------------------------------
// Validation — rules and onSubmit gating
// ---------------------------------------------------------------------------

describe("Validation", () => {
  it("blocks onSubmit when a required field is empty", async () => {
    const onSubmit = vi.fn();
    const onError = vi.fn();
    const { getByText, findByTestId } = render(
      <Form onSubmit={onSubmit} onError={onError}>
        <TextInput name="firstName" rules={[requiredRule]} required />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.click(getByText("Submit"));

    await findByTestId("error-firstName");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0].length).toBe(1);
  });

  it("submits when validation passes", async () => {
    const onSubmit = vi.fn();
    const { getByTestId, getByText } = render(
      <Form onSubmit={onSubmit}>
        <TextInput name="firstName" rules={[requiredRule]} required />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-firstName"), { target: { value: "Ada" } });
    fireEvent.click(getByText("Submit"));

    // Allow microtasks (validation pipeline awaits each input).
    await act(async () => { await Promise.resolve(); });

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("emailRule fails on a non-email value, passes on a valid one", async () => {
    const { getByTestId, findByTestId, queryByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput
          name="email"
          type="email"
          rules={[requiredRule, emailRule]}
          required
        />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-email"), { target: { value: "not-an-email" } });
    fireEvent.click(getByTestId("input-email"));      // touch
    fireEvent.blur(getByTestId("input-email"));

    // Trigger validation by submitting.
    const button = document.querySelector("button");
    fireEvent.click(button!);

    const err = await findByTestId("error-email");
    expect(err.textContent).toMatch(/email/i);

    fireEvent.change(getByTestId("input-email"), {
      target: { value: "ada@lovelace.io" },
    });
    fireEvent.click(button!);
    await act(async () => { await Promise.resolve(); });

    expect(queryByTestId("error-email")).toBeNull();
  });

  it("rules are skipped when their required prop is absent", async () => {
    // minLengthRule needs `minLength` prop. With no minLength, even an
    // empty value should not produce an error (requiresValue would skip it
    // anyway, but this also asserts the prop-gating layer.)
    const onSubmit = vi.fn();
    const { getByText } = render(
      <Form onSubmit={onSubmit}>
        <TextInput name="firstName" rules={[minLengthRule]} />
        <button>Submit</button>
      </Form>,
    );
    fireEvent.click(getByText("Submit"));
    await act(async () => { await Promise.resolve(); });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("requiredRule only fires when the `required` prop is true", async () => {
    const onSubmit = vi.fn();
    const { getByText, queryByTestId } = render(
      <Form onSubmit={onSubmit}>
        <TextInput name="firstName" rules={[requiredRule]} />
        <button>Submit</button>
      </Form>,
    );
    fireEvent.click(getByText("Submit"));
    await act(async () => { await Promise.resolve(); });
    expect(queryByTestId("error-firstName")).toBeNull();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("preservedProps prevents declared props from leaking into otherProps", () => {
    // patternRule declares `pattern` as preserved → should NOT land on <input>.
    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput
          name="username"
          rules={[
            { name: "p", preservedProps: ["pattern"], validate: () => undefined },
          ]}
          pattern="^[a-z]+$"
        />
      </Form>,
    );
    expect(getByTestId("input-username").getAttribute("pattern")).toBeNull();
  });

  it("per-instance validate prop runs and produces an error", async () => {
    const validate = vi.fn(({ value }: any) =>
      value === "taken" ? "Username is taken" : undefined,
    );
    const { getByTestId, findByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput name="username" validate={validate} />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-username"), { target: { value: "taken" } });
    fireEvent.click(document.querySelector("button")!);

    const err = await findByTestId("error-username");
    expect(err.textContent).toBe("Username is taken");
  });

  it("per-instance `errors` overrides the rule's default message", async () => {
    const { getByText, findByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput
          name="firstName"
          rules={[requiredRule]}
          required
          errors={{ required: "Custom message" }}
        />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.click(getByText("Submit"));
    const err = await findByTestId("error-firstName");
    expect(err.textContent).toBe("Custom message");
  });
});

// ---------------------------------------------------------------------------
// Checkbox
// ---------------------------------------------------------------------------

describe("Checkbox", () => {
  it("setChecked(true) collects the value as truthy", async () => {
    const onSubmit = vi.fn(({ form }) => form.submitting(false));
    const { getByText } = render(
      <Form onSubmit={onSubmit}>
        <Checkbox name="agree" defaultChecked />
        <button>Submit</button>
      </Form>,
    );

    await clickSubmit(getByText);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    // collectValue() returns `formControl.value || true` when checked.
    expect(onSubmit.mock.calls[0][0].values.agree).toBeTruthy();
  });

  it("setChecked(false) collects the unchecked value (default false)", async () => {
    const onSubmit = vi.fn(({ form }) => form.submitting(false));
    const { getByText } = render(
      <Form onSubmit={onSubmit}>
        <Checkbox name="agree" />
        <button>Submit</button>
      </Form>,
    );

    await clickSubmit(getByText);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    // With collectUnchecked: true (the default from
    // defaultFormControlOptions), uncheckedValue `false` is emitted.
    expect(onSubmit.mock.calls[0][0].values.agree).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Dirty state and form.change()
// ---------------------------------------------------------------------------

describe("Dirty state and form.change()", () => {
  it("tracks dirty state across controls", () => {
    let capturedForm: FormInterface | undefined;
    const onDirty = vi.fn();

    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <FormCapture
          onForm={(f) => {
            capturedForm = f;
            f.on("dirty", onDirty);
          }}
        />
        <TextInput name="firstName" />
      </Form>,
    );

    expect(capturedForm!.isDirty).toBe(false);

    fireEvent.change(getByTestId("input-firstName"), { target: { value: "Ada" } });

    expect(capturedForm!.isDirty).toBe(true);
    expect(onDirty).toHaveBeenCalledWith(true, capturedForm);
  });

  it("form.change(name, value) updates a registered control", () => {
    let capturedForm: FormInterface | undefined;
    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <FormCapture onForm={(f) => (capturedForm = f)} />
        <TextInput name="firstName" />
      </Form>,
    );

    act(() => {
      capturedForm!.change("firstName", "Programmatic");
    });

    expect((getByTestId("input-firstName") as HTMLInputElement).value).toBe(
      "Programmatic",
    );
    expect(capturedForm!.value("firstName")).toBe("Programmatic");
  });

  it("form.reset() restores initial values", () => {
    let capturedForm: FormInterface | undefined;
    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <FormCapture onForm={(f) => (capturedForm = f)} />
        <TextInput name="firstName" defaultValue="Initial" />
      </Form>,
    );

    fireEvent.change(getByTestId("input-firstName"), {
      target: { value: "Changed" },
    });
    expect(capturedForm!.isDirty).toBe(true);

    act(() => {
      capturedForm!.reset();
    });

    expect((getByTestId("input-firstName") as HTMLInputElement).value).toBe(
      "Initial",
    );
  });

  it("form.isDirty becomes false after reset()", () => {
    let capturedForm: FormInterface | undefined;
    const onDirty = vi.fn();
    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <FormCapture
          onForm={(f) => {
            capturedForm = f;
            f.on("dirty", onDirty);
          }}
        />
        <TextInput name="firstName" defaultValue="Initial" />
      </Form>,
    );

    fireEvent.change(getByTestId("input-firstName"), {
      target: { value: "Changed" },
    });
    expect(capturedForm!.isDirty).toBe(true);
    expect(onDirty).toHaveBeenLastCalledWith(true, capturedForm);

    act(() => {
      capturedForm!.reset();
    });

    expect(capturedForm!.isDirty).toBe(false);
    expect(capturedForm!.dirtyControls).toHaveLength(0);
    expect(onDirty).toHaveBeenLastCalledWith(false, capturedForm);
  });
});
