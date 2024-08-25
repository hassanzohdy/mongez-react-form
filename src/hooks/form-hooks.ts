import React, { useMemo, useState } from "react";
import { FormControlOptions, FormControlProps } from "../types";

export function useId(data: { id?: string; name: string }) {
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

export function useValue<T>(
  props: FormControlProps,
  options: FormControlOptions
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (![undefined, null].includes(props.value)) {
      return options.transformValue?.(props.value);
    }

    if (![undefined, null].includes(props.defaultValue)) {
      return options.transformValue?.(props.defaultValue);
    }

    return props.multiple ? [] : "";
  });

  return [value, setValue];
}

export function useError(): [
  React.ReactNode,
  (error: React.ReactNode) => void
] {
  const [error, errorUpdater] = useState<React.ReactNode>(null);

  return [
    error,
    (error: React.ReactNode): void => {
      errorUpdater(error);
    },
  ];
}

export function useChecked(props: any) {
  const [isChecked, setChecked] = useState(() => {
    if (props.checked !== undefined) {
      return Boolean(props.checked);
    }

    if (props.defaultChecked !== undefined) {
      return Boolean(props.defaultChecked);
    }

    return false;
  });

  return [isChecked, setChecked] as const;
}
