import { act, fireEvent, render } from "@testing-library/react";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  extend,
  getTranslationsList,
  setTranslationsList,
  trans,
} from "@mongez/localization";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Form } from "../components/Form";
import { registerDefaultValidationMessages } from "../locales/register-defaults";
import { maxLengthRule, minLengthRule, patternRule } from "../rules";
import { useFormControl } from "../hooks/useFormControl";
import type { FormControlProps } from "../types";

function TextInput(props: FormControlProps) {
  const { value, changeValue, id, otherProps } = useFormControl(props);
  return (
    <input
      id={id}
      value={value ?? ""}
      onChange={(e) => changeValue(e.target.value)}
      {...otherProps}
    />
  );
}

describe("default validation messages never overwrite app translations", () => {
  it("fills only the missing keys", () => {
    const original = getTranslationsList();
    try {
      setTranslationsList({
        en: { validation: { required: "App required message" } },
      });

      registerDefaultValidationMessages();

      expect(trans("validation.required")).toBe("App required message");
      expect(trans("validation.email")).toBe("Invalid Email Address");
    } finally {
      setTranslationsList(original);
    }
  });
});

describe("length messages accept either placeholder", () => {
  it("renders :maxLength and :length", () => {
    extend("en", {
      validation: { maxLength: "max :maxLength / :length" },
    });

    const message = maxLengthRule.validate!({
      value: "abcdef",
      maxLength: 3,
      errorKeys: { name: "x" },
    } as any);

    expect(message).toBe("max 3 / 3");
  });

  it("renders :minLength and :length", () => {
    extend("en", {
      validation: { minLength: "min :minLength / :length" },
    });

    const message = minLengthRule.validate!({
      value: "a",
      minLength: 4,
      errorKeys: { name: "x" },
    } as any);

    expect(message).toBe("min 4 / 4");
  });
});

describe("<Form> default method", () => {
  it("renders method=post on the native form in SSR markup", () => {
    const html = renderToString(
      <Form onSubmit={() => {}}>
        <TextInput name="email" />
      </Form>,
    );

    expect(html).toContain('method="post"');
  });

  it("still posts when a wrapper passes method={undefined}", () => {
    const html = renderToString(
      <Form onSubmit={() => {}} {...({ method: undefined } as any)}>
        <TextInput name="email" />
      </Form>,
    );

    expect(html).toContain('method="post"');
  });

  it("keeps an explicit method", () => {
    const html = renderToString(
      <Form onSubmit={() => {}} {...({ method: "get" } as any)}>
        <TextInput name="q" />
      </Form>,
    );

    expect(html).toContain('method="get"');
    expect(html).not.toContain('method="post"');
  });

  it("does not add method to a custom component", () => {
    const Custom = (props: any) => (
      <section data-method={String(props.method)}>{props.children}</section>
    );

    const html = renderToString(
      <Form onSubmit={() => {}} component={Custom}>
        <TextInput name="q" />
      </Form>,
    );

    expect(html).toContain('data-method="undefined"');
  });
});

describe("async onSubmit rejection", () => {
  afterEach(() => vi.restoreAllMocks());

  it("is logged in development and does not crash", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(
      <Form onSubmit={() => Promise.reject(new Error("boom"))}>
        <TextInput name="a" />
        <button>Go</button>
      </Form>,
    );

    fireEvent.submit(container.querySelector("form")!);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(error).toHaveBeenCalledTimes(1);
    expect(String(error.mock.calls[0][0])).toContain("onSubmit");
  });
});

describe("pattern rule", () => {
  afterEach(() => vi.restoreAllMocks());

  it("warns in development when the pattern is invalid", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const options = {
      value: "x",
      pattern: "([unclosed-warn-test",
      errorKeys: { name: "x" },
    } as any;

    expect(patternRule.validate!(options)).toBeUndefined();
    patternRule.validate!(options);

    // Cached after the first compile, so it warns once.
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("keeps validating correctly after the cache overflows", () => {
    for (let i = 0; i < 600; i++) {
      patternRule.validate!({
        value: "a",
        pattern: `^a{${i + 1}}$`,
        errorKeys: { name: "x" },
      } as any);
    }

    expect(
      patternRule.validate!({
        value: "b",
        pattern: "^a$",
        errorKeys: { name: "x" },
      } as any),
    ).toBeTruthy();
  });
});
