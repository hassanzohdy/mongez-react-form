import { act, fireEvent, render, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { Form } from "../components/Form";
import { useForm } from "../hooks/useForm";
import { useFormControl } from "../hooks/useFormControl";
import type { FormControlProps, FormInterface } from "../types";

// ---------------------------------------------------------------------------
// Test-only TextInput. Same thin wrapper used by useFormControl.test.tsx /
// rules.test.tsx. Renders the validating flag and error so async behavior is
// observable from the DOM.
// ---------------------------------------------------------------------------
function TextInput(
  props: FormControlProps & {
    "data-testid"?: string;
    "data-error-testid"?: string;
  },
) {
  const { value, changeValue, id, error, inputRef, isValidating, otherProps } =
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
      {isValidating ? (
        <span data-testid={`validating-${props.name}`}>validating</span>
      ) : null}
      {error ? (
        <span data-testid={props["data-error-testid"] ?? `error-${props.name}`}>
          {error}
        </span>
      ) : null}
    </>
  );
}

// A TextInput that wires getInputProps() so onBlur/aria wiring is exercised
// straight from the a11y prop bag (used by the validateOn="blur" tests).
function A11yTextInput(props: FormControlProps) {
  const { getInputProps, error } = useFormControl(props);

  return (
    <>
      <input data-testid={`input-${props.name}`} {...getInputProps()} />
      {error ? (
        <span data-testid={`error-${props.name}`}>{error}</span>
      ) : null}
    </>
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

/**
 * Click the Submit button and flush a single microtask tick. Enough for the
 * sync-fast-path (validate() returns a Promise but resolves on the microtask
 * queue). Async rules need their own awaiting (see the deferred() helper).
 */
async function clickSubmit(getByText: any) {
  fireEvent.click(getByText("Submit"));
  await act(async () => {
    await Promise.resolve();
  });
}

/**
 * A manually-resolvable deferred — lets a test hold an async rule in-flight,
 * assert the gating/isValidating state, then resolve it deterministically.
 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: any) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// ===========================================================================
// Async validation gates submission (the headline v4 fix)
// ===========================================================================

describe("Async validation — submission gating", () => {
  it("does NOT call onSubmit while an async rule rejects the value", async () => {
    const onSubmit = vi.fn();
    const onError = vi.fn();

    // Async rule: simulates a server check that says the username is taken.
    const validate = async ({ value }: any) => {
      await Promise.resolve();
      return value === "taken" ? "Username is taken" : undefined;
    };

    const { getByTestId, getByText, findByTestId } = render(
      <Form onSubmit={onSubmit} onError={onError}>
        <TextInput name="username" validate={validate} />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-username"), {
      target: { value: "taken" },
    });

    fireEvent.click(getByText("Submit"));

    // The async rule must resolve, mark the control invalid, and block submit.
    const err = await findByTestId("error-username");
    expect(err.textContent).toBe("Username is taken");

    // Give any stray microtasks a chance — onSubmit must still not have run.
    await act(async () => {
      await Promise.resolve();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("DOES call onSubmit once the async rule accepts the value", async () => {
    const onSubmit = vi.fn();

    const validate = async ({ value }: any) => {
      await Promise.resolve();
      return value === "taken" ? "Username is taken" : undefined;
    };

    const { getByTestId, getByText } = render(
      <Form onSubmit={onSubmit}>
        <TextInput name="username" validate={validate} />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-username"), {
      target: { value: "available" },
    });

    fireEvent.click(getByText("Submit"));

    // The engine awaits control.validate() (a Promise) before invoking
    // onSubmit, so a couple of microtask ticks are enough.
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(onSubmit.mock.calls[0][0].values).toEqual({ username: "available" });
  });

  it("a slow async rule held in-flight blocks onSubmit until it resolves invalid", async () => {
    const onSubmit = vi.fn();
    const onError = vi.fn();
    const gate = deferred<string | undefined>();

    const validate = () => gate.promise;

    const { getByTestId, getByText, findByTestId } = render(
      <Form onSubmit={onSubmit} onError={onError}>
        <TextInput name="username" validate={validate} />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-username"), {
      target: { value: "whatever" },
    });

    fireEvent.click(getByText("Submit"));

    // Submission is pending on the in-flight async rule: neither handler fired.
    await act(async () => {
      await Promise.resolve();
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();

    // Resolve the gate with an error → submission must remain blocked.
    await act(async () => {
      gate.resolve("Rejected by server");
      await Promise.resolve();
    });

    const err = await findByTestId("error-username");
    expect(err.textContent).toBe("Rejected by server");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// isValidating lifecycle
// ===========================================================================

describe("Async validation — isValidating flag", () => {
  it("flips isValidating true while in-flight then false after it resolves", async () => {
    const gate = deferred<string | undefined>();
    const validate = () => gate.promise;

    const { getByTestId, queryByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput name="username" validate={validate} />
        <button>Submit</button>
      </Form>,
    );

    expect(queryByTestId("validating-username")).toBeNull();

    // Trigger validation via a change (validateOn defaults to "change").
    fireEvent.change(getByTestId("input-username"), {
      target: { value: "abc" },
    });

    // isValidating should now be true (async rule is in-flight).
    await waitFor(() => {
      expect(queryByTestId("validating-username")).not.toBeNull();
    });

    // Resolve the rule as valid → isValidating must flip back to false.
    await act(async () => {
      gate.resolve(undefined);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(queryByTestId("validating-username")).toBeNull();
    });
  });

  it("exposes isValidating on the FormControl while async validation runs", async () => {
    let capturedForm: FormInterface | undefined;
    const gate = deferred<string | undefined>();
    const validate = () => gate.promise;

    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <FormCapture onForm={(f) => (capturedForm = f)} />
        <TextInput name="username" validate={validate} />
      </Form>,
    );

    fireEvent.change(getByTestId("input-username"), {
      target: { value: "abc" },
    });

    await waitFor(() => {
      expect(capturedForm!.control("username")!.isValidating).toBe(true);
    });

    await act(async () => {
      gate.resolve(undefined);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(capturedForm!.control("username")!.isValidating).toBe(false);
    });
  });
});

// ===========================================================================
// Stale async results are discarded (validationSeq token)
// ===========================================================================

describe("Async validation — stale result discarding", () => {
  it("discards a stale async result when the value changes mid-flight", async () => {
    // Two gates: the first (stale) run is for value "first"; the second
    // (fresh) run is for value "second". We resolve the stale run AFTER the
    // fresh run has started — its result must be ignored entirely.
    //
    // KNOWN-BUG (kept asserting CORRECT v4 behavior, see suspectedBugs):
    // The per-control `validationSeq` token (useFormControl.ts:354/363) DOES
    // correctly bail the stale run's own commit. BUT both concurrent runs share
    // the single `formControl.errorsList` object (reset + written + read inside
    // runValidationRules, useFormControl.ts:271/283/298). When the stale run
    // resolves with an error it writes that message into the shared errorsList;
    // the fresh run's finalize() then reads it back and commits the STALE
    // message. So a discarded stale async rejection still poisons the fresh
    // result. Expected: the error never surfaces (it was superseded).
    const firstGate = deferred<string | undefined>();
    const secondGate = deferred<string | undefined>();
    let callCount = 0;

    const validate = () => {
      callCount += 1;
      return callCount === 1 ? firstGate.promise : secondGate.promise;
    };

    const { getByTestId, queryByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput name="staleField" validate={validate} />
      </Form>,
    );

    // First change → starts validation run #1 (firstGate).
    fireEvent.change(getByTestId("input-staleField"), {
      target: { value: "first" },
    });

    await waitFor(() => {
      expect(queryByTestId("validating-staleField")).not.toBeNull();
    });

    // Second change BEFORE the first resolves → starts validation run #2
    // (secondGate). validationSeq advances to 2.
    fireEvent.change(getByTestId("input-staleField"), {
      target: { value: "second" },
    });

    // Resolve the STALE first run with an error. A newer run has started, so
    // this result must be discarded — no error should appear from it.
    await act(async () => {
      firstGate.resolve("Stale error from first run");
      await Promise.resolve();
    });

    // Resolve the fresh second run as VALID. The control's displayed error must
    // be null: the only rule that resolved with a message was the superseded
    // stale run, which must not leak into the fresh result.
    await act(async () => {
      secondGate.resolve(undefined);
      await Promise.resolve();
    });

    // CORRECT v4 assertion — intentionally NOT weakened. Currently fails
    // because the shared errorsList lets the stale message surface.
    expect(queryByTestId("error-staleField")).toBeNull();
  });

  it("keeps the fresh result when the latest run resolves with an error", async () => {
    const firstGate = deferred<string | undefined>();
    const secondGate = deferred<string | undefined>();
    let callCount = 0;

    const validate = () => {
      callCount += 1;
      return callCount === 1 ? firstGate.promise : secondGate.promise;
    };

    // Mirror image of the test above: here the STALE run resolves VALID and
    // the FRESH run resolves with an error. This path passes because the stale
    // run writes nothing to the shared errorsList, so the fresh error is the
    // only message present when finalize() runs.
    const { getByTestId, findByTestId, queryByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput name="freshField" validate={validate} />
      </Form>,
    );

    fireEvent.change(getByTestId("input-freshField"), {
      target: { value: "first" },
    });
    await waitFor(() => {
      expect(queryByTestId("validating-freshField")).not.toBeNull();
    });

    fireEvent.change(getByTestId("input-freshField"), {
      target: { value: "second" },
    });

    // Stale run resolves valid; should be ignored either way.
    await act(async () => {
      firstGate.resolve(undefined);
      await Promise.resolve();
    });

    // Fresh run resolves with an error → THIS one must surface.
    await act(async () => {
      secondGate.resolve("Fresh error from second run");
      await Promise.resolve();
    });

    const err = await findByTestId("error-freshField");
    expect(err.textContent).toBe("Fresh error from second run");
  });
});

// ===========================================================================
// validateOn: "blur"
// ===========================================================================

describe("validateOn: blur", () => {
  it("does NOT validate on change before blur, then validates on blur", async () => {
    const validate = vi.fn(({ value }: any) =>
      value === "bad" ? "Bad value" : undefined,
    );

    const { getByTestId, queryByTestId, findByTestId } = render(
      <Form onSubmit={() => {}}>
        <A11yTextInput name="field" validateOn="blur" validate={validate} />
      </Form>,
    );

    const input = getByTestId("input-field");

    // Type a bad value — with validateOn="blur" no validation runs on change,
    // so no error appears yet.
    fireEvent.change(input, { target: { value: "bad" } });
    await act(async () => {
      await Promise.resolve();
    });
    expect(queryByTestId("error-field")).toBeNull();

    // Blur → validation runs now (onBlur is wired via getInputProps).
    fireEvent.blur(input);
    const err = await findByTestId("error-field");
    expect(err.textContent).toBe("Bad value");
  });

  it("revalidates on change AFTER the field has errored once", async () => {
    const validate = ({ value }: any) =>
      value === "bad" ? "Bad value" : undefined;

    const { getByTestId, queryByTestId, findByTestId } = render(
      <Form onSubmit={() => {}}>
        <A11yTextInput name="field" validateOn="blur" validate={validate} />
      </Form>,
    );

    const input = getByTestId("input-field");

    fireEvent.change(input, { target: { value: "bad" } });
    fireEvent.blur(input);
    await findByTestId("error-field");

    // Now that the control has errored, a subsequent change that fixes the
    // value should clear the error live (shouldValidateOnChange returns true
    // once isValid === false).
    fireEvent.change(input, { target: { value: "good" } });
    await waitFor(() => {
      expect(queryByTestId("error-field")).toBeNull();
    });
  });
});

// ===========================================================================
// validateOn: "submit"
// ===========================================================================

describe("validateOn: submit", () => {
  it("does NOT validate on change or blur — only on submit", async () => {
    const validate = ({ value }: any) =>
      value === "bad" ? "Bad value" : undefined;

    const { getByTestId, queryByTestId, getByText, findByTestId } = render(
      <Form onSubmit={() => {}}>
        <A11yTextInput name="field" validateOn="submit" validate={validate} />
        <button>Submit</button>
      </Form>,
    );

    const input = getByTestId("input-field");

    // Change → no validation.
    fireEvent.change(input, { target: { value: "bad" } });
    await act(async () => {
      await Promise.resolve();
    });
    expect(queryByTestId("error-field")).toBeNull();

    // Blur → still no validation (mode is "submit", not "blur").
    fireEvent.blur(input);
    await act(async () => {
      await Promise.resolve();
    });
    expect(queryByTestId("error-field")).toBeNull();

    // Submit → validation runs and the error appears.
    fireEvent.click(getByText("Submit"));
    const err = await findByTestId("error-field");
    expect(err.textContent).toBe("Bad value");
  });

  it("validateOn submit blocks onSubmit when the field is invalid", async () => {
    const onSubmit = vi.fn();
    const validate = ({ value }: any) =>
      value === "bad" ? "Bad value" : undefined;

    const { getByTestId, getByText, findByTestId } = render(
      <Form onSubmit={onSubmit}>
        <A11yTextInput name="field" validateOn="submit" validate={validate} />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-field"), { target: { value: "bad" } });
    fireEvent.click(getByText("Submit"));

    await findByTestId("error-field");
    expect(onSubmit).not.toHaveBeenCalled();

    // Fix the value and resubmit → onSubmit fires.
    fireEvent.change(getByTestId("input-field"), { target: { value: "good" } });
    await clickSubmit(getByText);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// form.setErrors({ name: message }) — server (HTTP 422) mapping
// ===========================================================================

describe("form.setErrors", () => {
  it("shows errors on the named controls", async () => {
    let capturedForm: FormInterface | undefined;

    const { findByTestId, queryByTestId } = render(
      <Form onSubmit={() => {}}>
        <FormCapture onForm={(f) => (capturedForm = f)} />
        <TextInput name="email" />
        <TextInput name="username" />
      </Form>,
    );

    act(() => {
      capturedForm!.setErrors({
        email: "Email already registered",
        username: "Username is taken",
      });
    });

    const emailErr = await findByTestId("error-email");
    expect(emailErr.textContent).toBe("Email already registered");

    const usernameErr = await findByTestId("error-username");
    expect(usernameErr.textContent).toBe("Username is taken");

    // Names with no matching control are ignored (no throw, no extra error).
    act(() => {
      capturedForm!.setErrors({ doesNotExist: "ignored" });
    });
    expect(queryByTestId("error-doesNotExist")).toBeNull();
  });

  it("setErrors marks the form invalid and blocks submit until cleared", async () => {
    const onSubmit = vi.fn();
    let capturedForm: FormInterface | undefined;

    const { getByTestId, getByText, queryByTestId } = render(
      <Form onSubmit={onSubmit}>
        <FormCapture onForm={(f) => (capturedForm = f)} />
        <TextInput name="email" />
        <button>Submit</button>
      </Form>,
    );

    act(() => {
      capturedForm!.setErrors({ email: "Server says no" });
    });

    expect(capturedForm!.control("email")!.isValid).toBe(false);

    // Re-validating (via submit) the control with a valid value clears the
    // server error. The control has no rules, so an empty value is valid and
    // submit proceeds.
    await clickSubmit(getByText);

    expect(queryByTestId("error-email")).toBeNull();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("setErrors error is cleared by a fresh validation pass", async () => {
    let capturedForm: FormInterface | undefined;

    const { getByTestId, queryByTestId, findByTestId } = render(
      <Form onSubmit={() => {}}>
        <FormCapture onForm={(f) => (capturedForm = f)} />
        <TextInput name="email" />
      </Form>,
    );

    act(() => {
      capturedForm!.setErrors({ email: "Server error" });
    });
    await findByTestId("error-email");

    // Changing the value triggers validation (validateOn defaults to "change")
    // because the control is now invalid (isValid === false), so the error
    // clears.
    fireEvent.change(getByTestId("input-email"), {
      target: { value: "ada@lovelace.io" },
    });

    await waitFor(() => {
      expect(queryByTestId("error-email")).toBeNull();
    });
  });
});
