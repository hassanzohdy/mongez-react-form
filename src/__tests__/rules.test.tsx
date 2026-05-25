import { act, fireEvent, render } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { Form } from "../components/Form";
import { useFormControl } from "../hooks/useFormControl";
import {
  alphabetRule,
  emailRule,
  integerRule,
  lengthRule,
  matchRule,
  maxLengthRule,
  maxRule,
  minLengthRule,
  minRule,
  patternRule,
  requiredRule,
  strongRule,
  urlRule,
} from "../rules";
import type { FormControlProps } from "../types";

function TextInput(props: FormControlProps) {
  const { value, changeValue, id, error, inputRef, errorsList, otherProps } =
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
      {Object.entries(errorsList).map(([k, v]) => (
        <span key={k} data-testid={`err-${props.name}-${k}`}>{v}</span>
      ))}
    </>
  );
}

/**
 * Submit the form by clicking its hidden submit button. Returns when the
 * validation pipeline has flushed (one microtask is enough — the form's
 * validate() awaits each control.validate() but each is synchronous).
 */
async function submit(getByText: any) {
  fireEvent.click(getByText("Submit"));
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe("Validation rules", () => {
  it("requiredRule fires on empty input", async () => {
    const { findByTestId, getByText } = render(
      <Form onSubmit={() => {}}>
        <TextInput name="firstName" rules={[requiredRule]} required />
        <button>Submit</button>
      </Form>,
    );
    await submit(getByText);
    const e = await findByTestId("error-firstName");
    expect(e.textContent).toMatch(/required/i);
  });

  it("minLengthRule rejects short strings, passes long ones", async () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <Form onSubmit={() => {}}>
        <TextInput
          name="username"
          rules={[requiredRule, minLengthRule]}
          required
          minLength={5}
        />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-username"), { target: { value: "ab" } });
    await submit(getByText);
    expect(queryByTestId("error-username")?.textContent).toMatch(/5 characters/);

    fireEvent.change(getByTestId("input-username"), {
      target: { value: "abcdef" },
    });
    await submit(getByText);
    expect(queryByTestId("error-username")).toBeNull();
  });

  it("maxLengthRule rejects long strings", async () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <Form onSubmit={() => {}}>
        <TextInput
          name="bio"
          rules={[requiredRule, maxLengthRule]}
          required
          maxLength={5}
        />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-bio"), {
      target: { value: "way too long" },
    });
    await submit(getByText);
    expect(queryByTestId("error-bio")?.textContent).toMatch(/greater than 5/);
  });

  it("lengthRule requires exact length", async () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <Form onSubmit={() => {}}>
        <TextInput
          name="otp"
          rules={[requiredRule, lengthRule]}
          required
          length={6}
        />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-otp"), { target: { value: "123" } });
    await submit(getByText);
    expect(queryByTestId("error-otp")?.textContent).toMatch(/6 characters/);

    fireEvent.change(getByTestId("input-otp"), { target: { value: "123456" } });
    await submit(getByText);
    expect(queryByTestId("error-otp")).toBeNull();
  });

  it("minRule and maxRule check numeric bounds", async () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <Form onSubmit={() => {}}>
        <TextInput
          name="age"
          rules={[requiredRule, minRule, maxRule]}
          required
          min={18}
          max={120}
        />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-age"), { target: { value: "10" } });
    await submit(getByText);
    expect(queryByTestId("error-age")?.textContent).toMatch(/18/);

    fireEvent.change(getByTestId("input-age"), { target: { value: "200" } });
    await submit(getByText);
    expect(queryByTestId("error-age")?.textContent).toMatch(/120/);

    fireEvent.change(getByTestId("input-age"), { target: { value: "30" } });
    await submit(getByText);
    expect(queryByTestId("error-age")).toBeNull();
  });

  it("emailRule rejects non-emails, accepts emails — only when type=email", async () => {
    const { getByTestId, queryByTestId, getByText } = render(
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

    fireEvent.change(getByTestId("input-email"), {
      target: { value: "not-an-email" },
    });
    await submit(getByText);
    expect(queryByTestId("error-email")?.textContent).toMatch(/email/i);

    fireEvent.change(getByTestId("input-email"), {
      target: { value: "ada@lovelace.io" },
    });
    await submit(getByText);
    expect(queryByTestId("error-email")).toBeNull();
  });

  it("urlRule rejects non-URLs only when type=url", async () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <Form onSubmit={() => {}}>
        <TextInput
          name="website"
          type="url"
          rules={[requiredRule, urlRule]}
          required
        />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-website"), {
      target: { value: "not a url" },
    });
    await submit(getByText);
    expect(queryByTestId("error-website")?.textContent).toMatch(/url/i);

    fireEvent.change(getByTestId("input-website"), {
      target: { value: "https://lovelace.io" },
    });
    await submit(getByText);
    expect(queryByTestId("error-website")).toBeNull();
  });

  it("alphabetRule rejects digits and symbols", async () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <Form onSubmit={() => {}}>
        <TextInput
          name="name"
          type="alphabet"
          rules={[requiredRule, alphabetRule]}
          required
        />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-name"), {
      target: { value: "name123" },
    });
    await submit(getByText);
    expect(queryByTestId("error-name")?.textContent).toMatch(/alphabet/i);

    fireEvent.change(getByTestId("input-name"), { target: { value: "Ada" } });
    await submit(getByText);
    expect(queryByTestId("error-name")).toBeNull();
  });

  it("patternRule rejects non-matching values", async () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <Form onSubmit={() => {}}>
        <TextInput
          name="hex"
          rules={[requiredRule, patternRule]}
          required
          pattern={/^[0-9a-f]+$/}
        />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-hex"), { target: { value: "ZZZ" } });
    await submit(getByText);
    expect(queryByTestId("error-hex")).not.toBeNull();

    fireEvent.change(getByTestId("input-hex"), { target: { value: "deadbeef" } });
    await submit(getByText);
    expect(queryByTestId("error-hex")).toBeNull();
  });

  it("patternRule preserves the `pattern` prop from otherProps", () => {
    const { getByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput
          name="hex"
          rules={[patternRule]}
          pattern={/^[0-9a-f]+$/ as any}
        />
      </Form>,
    );
    // pattern is in preservedProps → must NOT land on <input>.
    expect(getByTestId("input-hex").getAttribute("pattern")).toBeNull();
  });

  it("matchRule compares against another control by name", async () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput name="password" type="password" rules={[requiredRule]} required />
        <TextInput
          name="confirm"
          type="password"
          rules={[requiredRule, matchRule]}
          required
          match="password"
        />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-password"), {
      target: { value: "abc123" },
    });
    fireEvent.change(getByTestId("input-confirm"), {
      target: { value: "different" },
    });
    await submit(getByText);
    expect(queryByTestId("error-confirm")?.textContent).toMatch(/matching/i);

    fireEvent.change(getByTestId("input-confirm"), {
      target: { value: "abc123" },
    });
    await submit(getByText);
    expect(queryByTestId("error-confirm")).toBeNull();
  });

  it("strongRule populates per-criterion errors in errorsList", async () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput
          name="password"
          type="password"
          rules={[requiredRule, strongRule]}
          required
          strong
        />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-password"), {
      target: { value: "short" },
    });
    await submit(getByText);

    // Each criterion that fails should be reflected in errorsList. With
    // value "short": all 5 criteria except lowercase fail.
    expect(queryByTestId("err-password-strong.minLength")).not.toBeNull();
    expect(queryByTestId("err-password-strong.uppercase")).not.toBeNull();
    expect(queryByTestId("err-password-strong.digit")).not.toBeNull();
    expect(queryByTestId("err-password-strong.symbol")).not.toBeNull();
    // lowercase passes for "short"
    expect(queryByTestId("err-password-strong.lowercase")).toBeNull();

    // A strong password passes everything.
    fireEvent.change(getByTestId("input-password"), {
      target: { value: "Pa$$w0rd!" },
    });
    await submit(getByText);
    expect(queryByTestId("error-password")).toBeNull();
  });

  it("strongRule respects custom criteria — disabling symbol", async () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <Form onSubmit={() => {}}>
        <TextInput
          name="password"
          type="password"
          rules={[requiredRule, strongRule]}
          required
          strong={{ symbol: false }}
        />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-password"), {
      target: { value: "Password1" },     // no symbol, but symbol is disabled
    });
    await submit(getByText);
    expect(queryByTestId("error-password")).toBeNull();
  });

  it("integerRule rejects non-integer numeric strings (e.g. 3.14)", async () => {
    const { getByTestId, queryByTestId, getByText } = render(
      <Form onSubmit={() => {}}>
        <TextInput
          name="count"
          type="integer"
          rules={[requiredRule, integerRule]}
          required
        />
        <button>Submit</button>
      </Form>,
    );

    // "3.14" is numeric (isNaN(Number("3.14")) === false) but not an integer.
    // Previously the predicate used `&&` which short-circuited and let it pass.
    fireEvent.change(getByTestId("input-count"), { target: { value: "3.14" } });
    await submit(getByText);
    expect(queryByTestId("error-count")?.textContent).toMatch(/integer/i);

    // Non-numeric strings should also fail.
    fireEvent.change(getByTestId("input-count"), { target: { value: "abc" } });
    await submit(getByText);
    expect(queryByTestId("error-count")?.textContent).toMatch(/integer/i);

    // Valid integer passes.
    fireEvent.change(getByTestId("input-count"), { target: { value: "42" } });
    await submit(getByText);
    expect(queryByTestId("error-count")).toBeNull();
  });

  it("maxRule treats numeric 0 as a real value, not as 'no value'", async () => {
    // Regression for the `!value` shortcut that swallowed 0. With max=-1,
    // a value of 0 (which would have been short-circuited as falsy) must
    // now trigger the error.
    const { getByTestId, queryByTestId, getByText } = render(
      <Form onSubmit={() => {}}>
        <TextInput
          name="offset"
          rules={[maxRule]}
          max={-1}
        />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-offset"), { target: { value: "0" } });
    await submit(getByText);
    expect(queryByTestId("error-offset")?.textContent).toMatch(/-1/);
  });

  it("rule.onInit runs once per mount, not per render (no subscription leak)", () => {
    // Regression for the `onInit` effect that listed `props` (a fresh
    // object each render) and `rules` (a literal array) as deps. Either
    // would re-run `onInit` on every render and stack subscriptions.
    let initCount = 0;
    let cleanupCount = 0;
    const trackingRule = {
      name: "tracking",
      requiresValue: false,
      onInit: () => {
        initCount += 1;
        return {
          unsubscribe: () => {
            cleanupCount += 1;
          },
        } as any;
      },
      validate: () => undefined,
    } as const;

    // Render with a fresh array literal AND a fresh inline prop on each render
    // (the parent re-renders below). If the effect deps were unstable, the
    // count would grow with every render.
    function Wrapper({ tick }: { tick: number }) {
      return (
        <Form onSubmit={() => {}}>
          <TextInput
            name="field"
            rules={[trackingRule]}
            // A fresh prop value each render to force props identity change.
            data-foo={tick}
          />
        </Form>
      );
    }

    const { rerender } = render(<Wrapper tick={0} />);
    const initialCount = initCount;
    expect(initialCount).toBe(1);

    // Re-render 5 times with new prop identities.
    for (let i = 1; i <= 5; i++) rerender(<Wrapper tick={i} />);

    // onInit should NOT have re-run.
    expect(initCount).toBe(1);
    expect(cleanupCount).toBe(0);
  });

  it("rule.onInit cleans up exactly once on unmount", () => {
    let initCount = 0;
    let cleanupCount = 0;
    const trackingRule = {
      name: "tracking",
      requiresValue: false,
      onInit: () => {
        initCount += 1;
        return {
          unsubscribe: () => {
            cleanupCount += 1;
          },
        } as any;
      },
      validate: () => undefined,
    } as const;

    const { unmount } = render(
      <Form onSubmit={() => {}}>
        <TextInput name="field" rules={[trackingRule]} />
      </Form>,
    );

    expect(initCount).toBe(1);

    unmount();

    expect(cleanupCount).toBe(1);
  });
});
