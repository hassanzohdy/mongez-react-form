import { act, fireEvent, render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { Form } from "../components/Form";
import {
  isStandardSchema,
  issuePathToName,
  runStandardSchema,
  standardSchemaToRule,
} from "../standard-schema/adapter";
import type { StandardSchemaV1 } from "../standard-schema/types";
import { useFormControl } from "../hooks/useFormControl";
import type { FormControlProps } from "../types";

// ---------------------------------------------------------------------------
// Test-only TextInput. Same thin wrapper around useFormControl used by the
// other test files.
// ---------------------------------------------------------------------------
function TextInput(props: FormControlProps & { "data-testid"?: string }) {
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
 * Submit the form by clicking its Submit button, then flush microtasks. We use
 * a setTimeout(0) macrotask tick because schema validation (and the per-control
 * async schema rule) genuinely awaits a Promise — a single microtask is not
 * always enough once an async rule and the whole-form schema both resolve.
 */
async function submit(getByText: any) {
  fireEvent.click(getByText("Submit"));
  await act(async () => {
    // Drain two macrotask rounds: an async schema validator (setTimeout-based)
    // is only reached several microtask hops into the submit pipeline, so its
    // timer can be queued AFTER a single-tick wait. Two rounds settle it
    // deterministically even under heavy parallel-suite load.
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
  });
}

// ---------------------------------------------------------------------------
// Hand-written minimal Standard Schema factories. We deliberately do NOT import
// seal/zod/valibot — we build the `~standard` contract by hand to prove the
// duck-typed interop works against any compliant object literal.
// ---------------------------------------------------------------------------

/**
 * Build a sync Standard Schema from a validate function that returns either
 * `{ value }` on success or `{ issues }` on failure.
 */
function makeSchema<Output = any>(
  validate: (
    value: unknown,
  ) => StandardSchemaV1.Result<Output>,
  vendor = "test",
): StandardSchemaV1<unknown, Output> {
  return {
    "~standard": {
      version: 1,
      vendor,
      validate,
    },
  };
}

/**
 * Build an async Standard Schema — `validate` returns a Promise. Used to prove
 * async schema validation genuinely gates submission.
 */
function makeAsyncSchema<Output = any>(
  validate: (
    value: unknown,
  ) => StandardSchemaV1.Result<Output>,
  vendor = "test-async",
): StandardSchemaV1<unknown, Output> {
  return {
    "~standard": {
      version: 1,
      vendor,
      async validate(value: unknown) {
        await new Promise((r) => setTimeout(r, 0));
        return validate(value);
      },
    },
  };
}

// ---------------------------------------------------------------------------
// isStandardSchema — duck-type guard
// ---------------------------------------------------------------------------

describe("isStandardSchema", () => {
  it("accepts an object exposing ~standard.validate as a function", () => {
    const schema = makeSchema(() => ({ value: 1 }));
    expect(isStandardSchema(schema)).toBe(true);
  });

  it("rejects null / undefined / primitives", () => {
    expect(isStandardSchema(null)).toBe(false);
    expect(isStandardSchema(undefined)).toBe(false);
    expect(isStandardSchema(42)).toBe(false);
    expect(isStandardSchema("schema")).toBe(false);
  });

  it("rejects an object missing ~standard", () => {
    expect(isStandardSchema({})).toBe(false);
    expect(isStandardSchema({ validate: () => ({}) })).toBe(false);
  });

  it("rejects when ~standard.validate is not a function", () => {
    expect(isStandardSchema({ "~standard": { validate: 123 } })).toBe(false);
    expect(isStandardSchema({ "~standard": {} })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// issuePathToName — path -> dot-notation control name
// ---------------------------------------------------------------------------

describe("issuePathToName", () => {
  it("joins plain string segments with dots", () => {
    expect(issuePathToName(["user", "email"])).toBe("user.email");
  });

  it("unwraps { key } PathSegment objects", () => {
    // Standard Schema permits either a bare PropertyKey or a { key } segment.
    expect(
      issuePathToName([{ key: "user" }, { key: "email" }]),
    ).toBe("user.email");
  });

  it("handles a mix of strings, { key } segments, and numeric indices", () => {
    expect(
      issuePathToName(["user", { key: "addresses" }, 0, "city"]),
    ).toBe("user.addresses.0.city");
  });

  it("returns an empty string for an empty or missing path", () => {
    expect(issuePathToName([])).toBe("");
    expect(issuePathToName(undefined)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// runStandardSchema — normalization
// ---------------------------------------------------------------------------

describe("runStandardSchema", () => {
  it("returns the success result for a passing sync schema", async () => {
    const schema = makeSchema((value) => ({ value }));
    const result = await runStandardSchema(schema, "ok");
    expect(result.issues).toBeUndefined();
    expect((result as any).value).toBe("ok");
  });

  it("returns issues for a failing schema", async () => {
    const schema = makeSchema(() => ({
      issues: [{ message: "bad", path: ["x"] }],
    }));
    const result = await runStandardSchema(schema, "anything");
    expect(result.issues).toHaveLength(1);
    expect(result.issues![0].message).toBe("bad");
  });

  it("awaits an async schema uniformly", async () => {
    const schema = makeAsyncSchema((value) =>
      value === "ok" ? { value } : { issues: [{ message: "nope" }] },
    );
    await expect(runStandardSchema(schema, "ok")).resolves.toMatchObject({
      value: "ok",
    });
    await expect(runStandardSchema(schema, "x")).resolves.toMatchObject({
      issues: [{ message: "nope" }],
    });
  });
});

// ---------------------------------------------------------------------------
// standardSchemaToRule — wrap a single-field schema as an InputRule
// ---------------------------------------------------------------------------

describe("standardSchemaToRule", () => {
  it("produces a rule with the given name and requiresValue=false", () => {
    const rule = standardSchemaToRule(makeSchema(() => ({ value: 1 })), "myRule");
    expect(rule.name).toBe("myRule");
    expect(rule.requiresValue).toBe(false);
    expect(typeof rule.validate).toBe("function");
  });

  it("defaults the rule name to 'schema'", () => {
    const rule = standardSchemaToRule(makeSchema(() => ({ value: 1 })));
    expect(rule.name).toBe("schema");
  });

  it("returns the first issue message on failure", async () => {
    const rule = standardSchemaToRule(
      makeSchema(() => ({
        issues: [{ message: "first" }, { message: "second" }],
      })),
    );
    const out = await rule.validate({ value: "x" } as any);
    expect(out).toBe("first");
  });

  it("returns undefined when the schema passes", async () => {
    const rule = standardSchemaToRule(makeSchema((value) => ({ value })));
    const out = await rule.validate({ value: "x" } as any);
    expect(out).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// <Form schema> — whole-form validation on submit
// ---------------------------------------------------------------------------

describe("<Form schema> — whole-form validation", () => {
  it("maps a failing issue's path back to the named control and blocks submit", async () => {
    const onSubmit = vi.fn();

    // The schema reads the COLLECTED (nested) form values and emits an issue
    // whose path points at the nested control by name "user.email".
    const schema = makeSchema((value: any) => {
      const email = value?.user?.email;
      if (!email || !String(email).includes("@")) {
        return {
          issues: [{ message: "Email is invalid", path: ["user", "email"] }],
        };
      }
      return { value };
    });

    const { getByTestId, getByText, findByTestId } = render(
      <Form onSubmit={onSubmit} schema={schema as any}>
        <TextInput name="user.email" />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-user.email"), {
      target: { value: "not-an-email" },
    });

    await submit(getByText);

    // The issue's path ["user","email"] is mapped to control "user.email"
    // via setError, the error renders, and submission is blocked.
    const err = await findByTestId("error-user.email");
    expect(err.textContent).toBe("Email is invalid");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("lets submit through and passes the collected values when the schema passes", async () => {
    const onSubmit = vi.fn();

    const schema = makeSchema((value: any) => {
      const email = value?.user?.email;
      if (!email || !String(email).includes("@")) {
        return {
          issues: [{ message: "Email is invalid", path: ["user", "email"] }],
        };
      }
      return { value };
    });

    const { getByTestId, getByText } = render(
      <Form onSubmit={onSubmit} schema={schema as any}>
        <TextInput name="user.email" />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-user.email"), {
      target: { value: "ada@lovelace.io" },
    });

    await submit(getByText);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].values).toEqual({
      user: { email: "ada@lovelace.io" },
    });
  });

  it("ignores issues whose control is not in the validated subset", async () => {
    // The schema emits an issue for a control that does NOT exist in the form
    // ("ghost"). Per v4 semantics the issue is dropped (the control is not in
    // the validated set), so submission must still succeed.
    const onSubmit = vi.fn();

    const schema = makeSchema(() => ({
      issues: [{ message: "ghost error", path: ["ghost"] }],
    }));

    const { getByTestId, getByText } = render(
      <Form onSubmit={onSubmit} schema={schema as any}>
        <TextInput name="title" />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-title"), { target: { value: "Hi" } });

    await submit(getByText);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("maps numeric array-index paths back to the indexed control name", async () => {
    const onSubmit = vi.fn();

    // Issue path ["tags", 1] -> control name "tags.1".
    const schema = makeSchema((value: any) => {
      const second = value?.tags?.[1];
      if (second !== "ok") {
        return { issues: [{ message: "tag 1 bad", path: ["tags", 1] }] };
      }
      return { value };
    });

    const { getByTestId, getByText, findByTestId } = render(
      <Form onSubmit={onSubmit} schema={schema as any}>
        <TextInput name="tags.0" />
        <TextInput name="tags.1" />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-tags.0"), { target: { value: "ok" } });
    fireEvent.change(getByTestId("input-tags.1"), { target: { value: "bad" } });

    await submit(getByText);

    const err = await findByTestId("error-tags.1");
    expect(err.textContent).toBe("tag 1 bad");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// <Form schema> — async whole-form validation gates submission
// ---------------------------------------------------------------------------

describe("<Form schema> — async whole-form validation", () => {
  it("blocks submit while the async schema reports an issue", async () => {
    const onSubmit = vi.fn();

    const schema = makeAsyncSchema((value: any) => {
      if (value?.code !== "1234") {
        return { issues: [{ message: "Wrong code", path: ["code"] }] };
      }
      return { value };
    });

    const { getByTestId, getByText, findByTestId } = render(
      <Form onSubmit={onSubmit} schema={schema as any}>
        <TextInput name="code" />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-code"), { target: { value: "0000" } });

    await submit(getByText);

    const err = await findByTestId("error-code");
    expect(err.textContent).toBe("Wrong code");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("lets submit through once the async schema passes", async () => {
    const onSubmit = vi.fn();

    const schema = makeAsyncSchema((value: any) => {
      if (value?.code !== "1234") {
        return { issues: [{ message: "Wrong code", path: ["code"] }] };
      }
      return { value };
    });

    const { getByTestId, getByText } = render(
      <Form onSubmit={onSubmit} schema={schema as any}>
        <TextInput name="code" />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-code"), { target: { value: "1234" } });

    await submit(getByText);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].values).toEqual({ code: "1234" });
  });
});

// ---------------------------------------------------------------------------
// Per-field useFormControl({ schema }) — single-value validation
// ---------------------------------------------------------------------------

describe("per-field useFormControl({ schema })", () => {
  it("validates a single value via the schema prop and blocks submit", async () => {
    const onSubmit = vi.fn();

    // Per-field schema sees the SINGLE control value, not the whole form.
    const fieldSchema = makeSchema((value: unknown) => {
      if (typeof value !== "string" || value.length < 3) {
        return { issues: [{ message: "Too short" }] };
      }
      return { value };
    });

    const { getByTestId, getByText, findByTestId } = render(
      <Form onSubmit={onSubmit}>
        <TextInput name="username" schema={fieldSchema as any} />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-username"), { target: { value: "ab" } });

    await submit(getByText);

    const err = await findByTestId("error-username");
    expect(err.textContent).toBe("Too short");
    expect(onSubmit).not.toHaveBeenCalled();

    // A long-enough value clears the error and lets submission proceed.
    fireEvent.change(getByTestId("input-username"), {
      target: { value: "ada" },
    });

    await submit(getByText);

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].values).toEqual({ username: "ada" });
  });

  it("supports an async per-field schema that gates submission", async () => {
    const onSubmit = vi.fn();

    const asyncFieldSchema = makeAsyncSchema((value: unknown) => {
      if (value === "taken") {
        return { issues: [{ message: "Already taken" }] };
      }
      return { value };
    });

    const { getByTestId, getByText, findByTestId } = render(
      <Form onSubmit={onSubmit}>
        <TextInput name="handle" schema={asyncFieldSchema as any} />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-handle"), { target: { value: "taken" } });

    await submit(getByText);

    const err = await findByTestId("error-handle");
    expect(err.textContent).toBe("Already taken");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("validates a single value via options.schema as well", async () => {
    const onSubmit = vi.fn();

    // Wrapper that passes the schema through the SECOND argument (options),
    // mirroring a reusable input that bakes in its own schema.
    function SchemaInput(props: FormControlProps & { fieldSchema: any }) {
      const { fieldSchema, ...rest } = props;
      const { value, changeValue, id, error, inputRef, otherProps } =
        useFormControl(rest, { schema: fieldSchema });

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
          {error ? (
            <span data-testid={`error-${props.name}`}>{error}</span>
          ) : null}
        </>
      );
    }

    const fieldSchema = makeSchema((value: unknown) => {
      if (value !== "valid") return { issues: [{ message: "options bad" }] };
      return { value };
    });

    const { getByTestId, getByText, findByTestId } = render(
      <Form onSubmit={onSubmit}>
        <SchemaInput name="opt" fieldSchema={fieldSchema} />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.change(getByTestId("input-opt"), { target: { value: "nope" } });

    await submit(getByText);

    const err = await findByTestId("error-opt");
    expect(err.textContent).toBe("options bad");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
