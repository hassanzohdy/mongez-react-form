import { act, fireEvent, render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { NativeForm } from "../components/NativeForm";
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

describe("NativeForm", () => {
  it("renders no host element by default (Fragment wrapping)", () => {
    const { container } = render(
      <NativeForm onSubmit={() => {}}>
        <span data-testid="child">child</span>
      </NativeForm>,
    );
    // No <form> wrapper, no extra host.
    expect(container.querySelector("form")).toBeNull();
    expect(container.querySelector("[data-testid=child]")).not.toBeNull();
  });

  it("wraps in `component` when provided", () => {
    let capturedForm: FormInterface | undefined;
    const { container } = render(
      <NativeForm onSubmit={() => {}} component="section">
        <FormCapture onForm={(f) => (capturedForm = f)} />
        <span data-testid="child">child</span>
      </NativeForm>,
    );

    expect(container.querySelector("section")).not.toBeNull();
    expect(capturedForm).toBeDefined();
    // The host element ref lands on form.formElement when the component
    // is a host DOM element.
    expect(capturedForm!.formElement).toBeTruthy();
  });

  it("submit() runs validation and calls onSubmit when valid", async () => {
    let capturedForm: FormInterface | undefined;
    const onSubmit = vi.fn();
    const { getByTestId } = render(
      <NativeForm onSubmit={onSubmit}>
        <FormCapture onForm={(f) => (capturedForm = f)} />
        <TextInput name="firstName" defaultValue="Ada" rules={[requiredRule]} required />
      </NativeForm>,
    );

    // touch input so it registers fully (not strictly required, but harmless)
    fireEvent.focus(getByTestId("input-firstName"));

    act(() => {
      capturedForm!.submit();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].values).toEqual({ firstName: "Ada" });
  });

  it("submit() skips onSubmit when validation fails", async () => {
    let capturedForm: FormInterface | undefined;
    const onSubmit = vi.fn();
    const onError = vi.fn();
    render(
      <NativeForm onSubmit={onSubmit} onError={onError}>
        <FormCapture onForm={(f) => (capturedForm = f)} />
        <TextInput name="firstName" rules={[requiredRule]} required />
      </NativeForm>,
    );

    act(() => {
      capturedForm!.submit();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });
});
