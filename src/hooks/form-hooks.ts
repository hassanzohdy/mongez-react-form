"use client";

import { useId, useMemo } from "react";

/**
 * Turn any string into a fragment that is safe inside an HTML id: dots become
 * dashes, characters outside `[a-zA-Z0-9-]` are dropped, and repeated or outer
 * dashes are collapsed. React's `useId()` output (`:r0:`, `«r0»`, `_r_0_`) reduces
 * to its alphanumeric part this way.
 */
function toIdFragment(value: string): string {
  return (
    value
      // replace all . to -
      .replace(/\./g, "-")
      // remove any non-alphanumeric characters
      .replace(/[^a-zA-Z0-9-]/g, "")
      // reduce any dashes to a single dash
      .replace(/-+/g, "-")
      // remove any leading or trailing dashes
      .replace(/^-+|-+$/g, "")
  );
}

export type ControlIdData = {
  /**
   * Explicit `id` prop. Always wins over the derived id.
   */
  id?: string;
  /**
   * Field name. Empty for a nameless control.
   */
  name: string;
  /**
   * Id of the form the control belongs to (from the form context). When set,
   * the derived id is `<formId>-<name>`, so the same field name in two forms on
   * one page does not produce duplicate ids.
   */
  formId?: string;
};

/**
 * Derive a stable DOM id for a form control.
 *
 * - An explicit `id` is returned as-is.
 * - Inside a form: `<formId>-<name>`. The form id comes from `useId()` at the
 *   form level (or the form's own `id` prop), so it is unique per form and
 *   identical on server and client.
 * - Outside a form with a name: `input-<name>`.
 * - A nameless control gets `useId()`-based ids (`input-<reactId>`, or
 *   `<formId>-<reactId>` inside a form), so the fallback is SSR-stable.
 *
 * Renamed from `useId` in v4 so the package root no longer shadows React 18's
 * `useId` for `import { useId } from "@mongez/react-form"`.
 */
export function useControlId(data: ControlIdData) {
  // Called on every render so the hook order stays the same, even when the
  // control has an explicit id.
  const reactId = useId();

  return useMemo(() => {
    if (data.id) return data.id;

    const name = toIdFragment(data.name);
    const formId = data.formId ? toIdFragment(data.formId) : "";

    if (formId) {
      return `${formId}-${name || toIdFragment(reactId)}`;
    }

    if (data.name) return `input-${name}`;

    return `input-${toIdFragment(reactId)}`;
  }, [data.id, data.name, data.formId, reactId]);
}
