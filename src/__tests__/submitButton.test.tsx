import { act, fireEvent, render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { Form } from "../components/Form";
import { useForm } from "../hooks/useForm";
import { useFormControl } from "../hooks/useFormControl";
import { useSubmitButton } from "../hooks/useSubmitButton";
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

function SubmitButton({ children }: { children: React.ReactNode }) {
  const form = useForm();
  const { disabled, isSubmitting } = useSubmitButton();
  return (
    <button
      type="submit"
      disabled={disabled}
      data-testid="submit"
      onClick={() => form?.submit()}
    >
      {isSubmitting ? "..." : children}
    </button>
  );
}

function FormCapture({ onForm }: { onForm: (form: FormInterface) => void }) {
  const form = useForm();
  React.useEffect(() => {
    if (form) onForm(form);
  }, [form, onForm]);
  return null;
}

// Flush both microtasks AND the setTimeout-based debounce that
// BaseForm.checkIfIsValid uses to coalesce validControls/invalidControls
// emissions. Two ticks are needed on slower CI runners: the first flushes
// the debounced trigger; the second flushes the React state update that
// the event listener schedules.
async function flushDebounced() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });
}

describe("useSubmitButton", () => {
  it("starts enabled and disables after an invalid submit", async () => {
    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput name="firstName" rules={[requiredRule]} required />
        <SubmitButton>Save</SubmitButton>
      </Form>,
    );

    expect((getByTestId("submit") as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(getByTestId("submit"));
    await flushDebounced();

    expect((getByTestId("submit") as HTMLButtonElement).disabled).toBe(true);
  });

  it("submitting(true) flips form.isSubmitting() before onSubmit runs", async () => {
    // Documents the double-submit guard. BaseForm.handleSubmit calls
    // submitting(true) BEFORE invoking props.onSubmit, so by the time
    // the consumer's callback executes, form.isSubmitting() already
    // reports true.
    let observedDuring: boolean | undefined;
    const { getByTestId } = render(
      <Form
        onSubmit={({ form }) => {
          observedDuring = form.isSubmitting();
        }}
      >
        <TextInput name="firstName" defaultValue="Ada" rules={[requiredRule]} required />
        <SubmitButton>Save</SubmitButton>
      </Form>,
    );

    fireEvent.click(getByTestId("submit"));
    await act(async () => {
      await Promise.resolve();
    });
    expect(observedDuring).toBe(true);
  });

  it("submitting(false) re-enables the button", async () => {
    let capturedForm: FormInterface | undefined;
    const onSubmit = vi.fn(({ form }) => {
      // Simulate an API failure and recover.
      form.submitting(false);
    });
    const { getByTestId } = render(
      <Form onSubmit={onSubmit}>
        <FormCapture onForm={(f) => (capturedForm = f)} />
        <TextInput name="firstName" defaultValue="Ada" rules={[requiredRule]} required />
        <SubmitButton>Save</SubmitButton>
      </Form>,
    );

    fireEvent.click(getByTestId("submit"));
    await act(async () => { await Promise.resolve(); });

    expect(onSubmit).toHaveBeenCalled();
    expect(capturedForm!.isSubmitting()).toBe(false);
    expect((getByTestId("submit") as HTMLButtonElement).disabled).toBe(false);
  });

  it("disable() on the form toggles the button via the disable event", () => {
    let capturedForm: FormInterface | undefined;
    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <FormCapture onForm={(f) => (capturedForm = f)} />
        <TextInput name="firstName" />
        <SubmitButton>Save</SubmitButton>
      </Form>,
    );

    expect((getByTestId("submit") as HTMLButtonElement).disabled).toBe(false);

    act(() => {
      capturedForm!.disable(true);
    });
    expect((getByTestId("submit") as HTMLButtonElement).disabled).toBe(true);

    act(() => {
      capturedForm!.disable(false);
    });
    expect((getByTestId("submit") as HTMLButtonElement).disabled).toBe(false);
  });
});
