import { act, fireEvent, render } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { Form } from "../components/Form";
import { useFormControl } from "../hooks/useFormControl";
import { useFormState } from "../hooks/useFormState";
import { requiredRule } from "../rules";
import type { FormControlProps } from "../types";

// Canonical getInputProps-based wrapper used across these tests.
function TextInput(props: FormControlProps) {
  const { error, getInputProps, getErrorProps } = useFormControl(props);
  return (
    <>
      <input {...getInputProps()} data-testid={`input-${props.name}`} />
      {error ? <span {...getErrorProps()}>{error}</span> : null}
    </>
  );
}

async function clickSubmit(getByText: any) {
  fireEvent.click(getByText("Submit"));
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

// ---------------------------------------------------------------------------
// useFormState — one-stop snapshot
// ---------------------------------------------------------------------------

describe("useFormState", () => {
  function StateProbe() {
    const state = useFormState();
    return (
      <div
        data-testid="state"
        data-valid={String(state.isValid)}
        data-dirty={String(state.isDirty)}
        data-submitting={String(state.isSubmitting)}
        data-submitted={String(state.isSubmitted)}
      />
    );
  }

  it("reflects dirty and submitted state reactively", async () => {
    const { container, getByTestId, getByText } = render(
      <Form onSubmit={() => {}}>
        <StateProbe />
        <TextInput name="firstName" rules={[requiredRule]} required />
        <button>Submit</button>
      </Form>
    );

    const probe = () => getByTestId("state");

    expect(probe().getAttribute("data-dirty")).toBe("false");
    expect(probe().getAttribute("data-submitted")).toBe("false");

    fireEvent.change(container.querySelector("input")!, {
      target: { value: "Ada" },
    });
    expect(probe().getAttribute("data-dirty")).toBe("true");

    await clickSubmit(getByText);
    expect(probe().getAttribute("data-submitted")).toBe("true");
  });
});

// ---------------------------------------------------------------------------
// <Form focusFirstError>
// ---------------------------------------------------------------------------

describe("<Form focusFirstError>", () => {
  it("focuses the first invalid control after a failed submit", async () => {
    const { container, getByText } = render(
      <Form onSubmit={() => {}} focusFirstError>
        <TextInput name="firstName" rules={[requiredRule]} required />
        <TextInput name="lastName" rules={[requiredRule]} required />
        <button>Submit</button>
      </Form>
    );

    await clickSubmit(getByText);

    const firstInput = container.querySelectorAll("input")[0];
    expect(document.activeElement).toBe(firstInput);
  });
});

// ---------------------------------------------------------------------------
// getInputProps a11y — aria-invalid follows the displayed error
// ---------------------------------------------------------------------------

describe("getInputProps accessibility", () => {
  it("marks the input invalid and describes the error after a failed submit", async () => {
    const { getByTestId, getByText, findByRole } = render(
      <Form onSubmit={() => {}}>
        <TextInput name="email" type="email" rules={[requiredRule]} required />
        <button>Submit</button>
      </Form>
    );

    const input = getByTestId("input-email");
    expect(input.getAttribute("aria-invalid")).toBeNull();

    await clickSubmit(getByText);

    const error = await findByRole("alert");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(error.id);
  });
});

// ---------------------------------------------------------------------------
// Default English messages render without an explicit extend() in the example
// ---------------------------------------------------------------------------

describe("readable default validation message", () => {
  it("renders an English message, not the raw key", async () => {
    const { getByText, findByRole } = render(
      <Form onSubmit={() => {}}>
        <TextInput name="x" rules={[requiredRule]} required />
        <button>Submit</button>
      </Form>
    );

    await clickSubmit(getByText);
    const error = await findByRole("alert");
    expect(error.textContent).not.toMatch(/^validation\./);
    expect(error.textContent).toMatch(/required/i);
  });
});
