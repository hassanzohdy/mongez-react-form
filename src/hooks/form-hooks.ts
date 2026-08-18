"use client";

import { useMemo } from "react";

/**
 * Derive a stable DOM id for a form control from its `id` prop or `name`.
 *
 * Renamed from `useId` in v4 so the package root no longer shadows React 18's
 * `useId` for `import { useId } from "@mongez/react-form"`.
 */
export function useControlId(data: { id?: string; name: string }) {
  return useMemo(() => {
    if (data.id) return data.id;

    const name = data.name
      // replace all . to -
      .replace(/\./g, "-")
      // remove any non-alphanumeric characters
      .replace(/[^a-zA-Z0-9-]/g, "")
      // reduce any dashes to a single dash
      .replace(/-+/g, "-")
      // remove any leading or trailing dashes
      .replace(/^-+|-+$/g, "");

    if (data.name) return `input-${name}`;

    return "input-" + Math.random().toString(36).substring(2, 9);
  }, [data.id, data.name]);
}
