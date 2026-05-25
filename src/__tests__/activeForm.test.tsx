import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { getActiveForm, getForm } from "../active-form";
import { Form } from "../components/Form";

describe("Active form registry", () => {
  it("setActiveForm tracks the last mounted form", () => {
    const before = getActiveForm();

    const { unmount } = render(
      <Form onSubmit={() => {}} id="active-test-1">
        <span>x</span>
      </Form>,
    );

    const active = getActiveForm();
    expect(active).not.toBe(before);
    expect(active?.id).toBe("active-test-1");

    unmount();
    // After unmount, the previous active form (if any) is restored.
    // We just assert the id no longer matches.
    expect(getActiveForm()?.id).not.toBe("active-test-1");
  });

  it("getForm(id) returns the form by id", () => {
    render(
      <Form onSubmit={() => {}} id="active-test-2">
        <span>x</span>
      </Form>,
    );
    expect(getForm("active-test-2")?.id).toBe("active-test-2");
  });

  it("stack-restores the previous active form on unmount", () => {
    const { unmount: unmountA } = render(
      <Form onSubmit={() => {}} id="first">
        <span>x</span>
      </Form>,
    );
    const { unmount: unmountB } = render(
      <Form onSubmit={() => {}} id="second">
        <span>y</span>
      </Form>,
    );

    expect(getActiveForm()?.id).toBe("second");

    unmountB();
    expect(getActiveForm()?.id).toBe("first");

    unmountA();
  });
});
