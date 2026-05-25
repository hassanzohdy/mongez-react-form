import { act, fireEvent, render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { Form } from "../components/Form";
import { useForm } from "../hooks/useForm";
import { useFormControl } from "../hooks/useFormControl";
import { requiredRule } from "../rules";
import type { FormControlProps, FormInterface } from "../types";

function TextInput(props: FormControlProps) {
  const { value, changeValue, id, error, inputRef, otherProps } =
    useFormControl(props);
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

function FormCapture({ onForm }: { onForm: (form: FormInterface) => void }) {
  const form = useForm();
  React.useEffect(() => {
    if (form) onForm(form);
  }, [form, onForm]);
  return null;
}

describe("Form events", () => {
  it("fires register / unregister on mount and unmount", () => {
    let capturedForm: FormInterface | undefined;
    const onRegister = vi.fn();
    const onUnregister = vi.fn();

    function Wrapper({ mountInput }: { mountInput: boolean }) {
      return (
        <Form onSubmit={() => {}}>
          <FormCapture
            onForm={(f) => {
              if (capturedForm) return;
              capturedForm = f;
              f.on("register", onRegister);
              f.on("unregister", onUnregister);
            }}
          />
          {mountInput && <TextInput name="firstName" />}
        </Form>
      );
    }

    const { rerender } = render(<Wrapper mountInput />);
    expect(onRegister).toHaveBeenCalled();
    const registerCalls = onRegister.mock.calls.length;
    expect(registerCalls).toBeGreaterThanOrEqual(1);

    rerender(<Wrapper mountInput={false} />);
    expect(onUnregister).toHaveBeenCalled();
  });

  it("fires validating + validation events on submit", async () => {
    let capturedForm: FormInterface | undefined;
    const onValidating = vi.fn();
    const onValidation = vi.fn();

    const { getByTestId, getByText } = render(
      <Form onSubmit={() => {}}>
        <FormCapture
          onForm={(f) => {
            if (capturedForm) return;
            capturedForm = f;
            f.on("validating", onValidating);
            f.on("validation", onValidation);
          }}
        />
        <TextInput name="firstName" defaultValue="Ada" />
        <button>Submit</button>
      </Form>,
    );
    // touch input so the form has registered fully
    fireEvent.focus(getByTestId("input-firstName"));

    fireEvent.click(getByText("Submit"));
    await act(async () => {
      await Promise.resolve();
    });

    expect(onValidating).toHaveBeenCalled();
    expect(onValidation).toHaveBeenCalled();
    // Last arg of validation event is the form instance.
    const lastCall = onValidation.mock.calls[onValidation.mock.calls.length - 1];
    expect(lastCall[0]).toBe(true);                       // isValid
    expect(Array.isArray(lastCall[1])).toBe(true);        // validated inputs
  });

  it("validating listener returning false aborts the submission", async () => {
    const onSubmit = vi.fn();
    let capturedForm: FormInterface | undefined;
    const { getByText } = render(
      <Form onSubmit={onSubmit}>
        <FormCapture
          onForm={(f) => {
            if (capturedForm) return;
            capturedForm = f;
            f.on("validating", () => false as any);
          }}
        />
        <TextInput name="firstName" defaultValue="Ada" />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.click(getByText("Submit"));
    await act(async () => {
      await Promise.resolve();
    });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("invalidControls event fires when at least one control is invalid", async () => {
    let capturedForm: FormInterface | undefined;
    const onInvalidControls = vi.fn();
    const { getByText } = render(
      <Form onSubmit={() => {}}>
        <FormCapture
          onForm={(f) => {
            if (capturedForm) return;
            capturedForm = f;
            f.on("invalidControls", onInvalidControls);
          }}
        />
        <TextInput name="firstName" rules={[requiredRule]} required />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.click(getByText("Submit"));
    // checkIfIsValid is debounced 0ms; wait one task tick.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(onInvalidControls).toHaveBeenCalled();
    const [invalidControls] = onInvalidControls.mock.calls[0];
    expect(invalidControls.length).toBe(1);
    expect(invalidControls[0].name).toBe("firstName");
  });

  it("dirty event fires with true when a control changes", () => {
    let capturedForm: FormInterface | undefined;
    const onDirty = vi.fn();
    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <FormCapture
          onForm={(f) => {
            if (capturedForm) return;
            capturedForm = f;
            f.on("dirty", onDirty);
          }}
        />
        <TextInput name="firstName" />
      </Form>,
    );

    fireEvent.change(getByTestId("input-firstName"), {
      target: { value: "x" },
    });
    expect(onDirty).toHaveBeenCalledWith(true, capturedForm);
  });

  it("dirty(false) should fire after form.reset()", () => {
    let capturedForm: FormInterface | undefined;
    const onDirty = vi.fn();
    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <FormCapture
          onForm={(f) => {
            if (capturedForm) return;
            capturedForm = f;
            f.on("dirty", onDirty);
          }}
        />
        <TextInput name="firstName" defaultValue="Initial" />
      </Form>,
    );

    // Make the form dirty first.
    fireEvent.change(getByTestId("input-firstName"), {
      target: { value: "changed" },
    });
    expect(onDirty).toHaveBeenLastCalledWith(true, capturedForm);
    expect(capturedForm!.isDirty).toBe(true);

    // Reset and expect dirty(false) to fire and dirtyControls to empty.
    act(() => {
      capturedForm!.reset();
    });

    expect(capturedForm!.isDirty).toBe(false);
    expect(capturedForm!.dirtyControls).toHaveLength(0);
    expect(onDirty).toHaveBeenLastCalledWith(false, capturedForm);
  });
});
