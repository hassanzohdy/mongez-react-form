import { act, fireEvent, render } from "@testing-library/react";
import React from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Form } from "../components/Form";
import { useControlId } from "../hooks/form-hooks";
import { useFormControl } from "../hooks/useFormControl";
import { requiredRule } from "../rules";
import type { FormControlProps, FormInterface } from "../types";

function TextInput(props: FormControlProps & { "data-testid"?: string }) {
  const { value, changeValue, id, error, getInputProps, getErrorProps } =
    useFormControl(props);

  return (
    <>
      <input
        {...getInputProps()}
        value={value ?? ""}
        onChange={(e) => changeValue(e.target.value)}
        data-testid={props["data-testid"] ?? `input-${props.name ?? "nameless"}`}
      />
      {error ? <span {...getErrorProps()} data-testid={`error-${id}`}>{error}</span> : null}
    </>
  );
}

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

describe("control ids — per form", () => {
  it("gives the same field name in two forms on one page different ids", () => {
    const { getAllByTestId } = render(
      <>
        <Form onSubmit={() => {}}>
          <TextInput name="email" />
        </Form>
        <Form onSubmit={() => {}}>
          <TextInput name="email" />
        </Form>
      </>,
    );

    const [first, second] = getAllByTestId("input-email") as HTMLInputElement[];

    expect(first.id).not.toBe("");
    expect(second.id).not.toBe("");
    expect(first.id).not.toBe(second.id);
    expect(first.id.endsWith("-email")).toBe(true);
    expect(second.id.endsWith("-email")).toBe(true);
  });

  it("derives the control id from the form id and the field name", () => {
    let form: FormInterface | null = null;

    const { getByTestId } = render(
      <Form
        id="signup"
        onSubmit={() => {}}
        ref={(instance: FormInterface) => {
          form = instance;
        }}
      >
        <TextInput name="user.email" />
      </Form>,
    );

    expect(form).not.toBeNull();
    expect(form!.id).toBe("signup");
    expect(getByTestId("input-user.email").id).toBe("signup-user-email");
  });

  it("uses the form's useId-based id when the form has no id prop", () => {
    let form: FormInterface | null = null;

    const { getByTestId } = render(
      <Form
        onSubmit={() => {}}
        ref={(instance: FormInterface) => {
          form = instance;
        }}
      >
        <TextInput name="email" />
      </Form>,
    );

    const formPrefix = form!.id.replace(/[^a-zA-Z0-9-]/g, "");

    expect(formPrefix.length).toBeGreaterThan(0);
    expect(getByTestId("input-email").id).toBe(`${formPrefix}-email`);
  });

  it("keeps an explicit id prop over the derived id", () => {
    const { getByTestId } = render(
      <Form id="signup" onSubmit={() => {}}>
        <TextInput name="email" id="my-email" />
      </Form>,
    );

    expect(getByTestId("input-email").id).toBe("my-email");
  });

  it("keeps the derived id for a control outside any form", () => {
    const { getByTestId } = render(<TextInput name="firstName" />);

    expect(getByTestId("input-firstName").id).toBe("input-firstName");
  });

  it("points the label-style association and aria-describedby at the same id after a failed submit", async () => {
    const { getByTestId, getByText } = render(
      <Form id="login" onSubmit={() => {}}>
        <TextInput name="email" rules={[requiredRule]} required />
        <button>Submit</button>
      </Form>,
    );

    fireEvent.click(getByText("Submit"));
    await flush();

    const input = getByTestId("input-email") as HTMLInputElement;
    const error = getByTestId(`error-${input.id}`);

    expect(input.id).toBe("login-email");
    expect(error.id).toBe("login-email-error");
    expect(input.getAttribute("aria-describedby")).toBe("login-email-error");
  });
});

describe("control ids — nameless fallback", () => {
  function Nameless() {
    const { id, getInputProps } = useFormControl({} as FormControlProps);

    return <input {...getInputProps()} data-testid={`nameless-${id}`} />;
  }

  it("uses a useId-based id that differs between two nameless controls", () => {
    const { container } = render(
      <Form onSubmit={() => {}}>
        <Nameless />
        <Nameless />
      </Form>,
    );

    const ids = Array.from(container.querySelectorAll("input")).map((el) => el.id);

    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
    expect(ids.every((id) => /^[a-zA-Z0-9-]+$/.test(id))).toBe(true);
  });

  it("keeps the same id when server HTML is hydrated on the client", () => {
    const tree = (
      <Form onSubmit={() => {}}>
        <Nameless />
      </Form>
    );

    const container = document.createElement("div");
    container.innerHTML = renderToString(tree);
    document.body.appendChild(container);

    const serverId = container.querySelector("input")?.id;

    let root: ReturnType<typeof hydrateRoot> | undefined;

    act(() => {
      root = hydrateRoot(container, tree);
    });

    const clientId = container.querySelector("input")?.id;

    act(() => root?.unmount());
    container.remove();

    expect(serverId).toBeTruthy();
    expect(clientId).toBe(serverId);
  });
});

describe("useControlId", () => {
  function Probe({ id, name, formId }: { id?: string; name: string; formId?: string }) {
    const controlId = useControlId({ id, name, formId });

    return <span data-testid="probe">{controlId}</span>;
  }

  it("keeps the input-<name> form outside a form", () => {
    const { getByTestId } = render(<Probe name="user.firstName" />);

    expect(getByTestId("probe").textContent).toBe("input-user-firstName");
  });

  it("prefixes the form id when one is given", () => {
    const { getByTestId } = render(<Probe name="email" formId="frm-1" />);

    expect(getByTestId("probe").textContent).toBe("frm-1-email");
  });

  it("returns the explicit id untouched", () => {
    const { getByTestId } = render(<Probe id="custom" name="email" formId="frm-1" />);

    expect(getByTestId("probe").textContent).toBe("custom");
  });
});
