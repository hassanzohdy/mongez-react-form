"use client";

import { useEffect, useRef, useState } from "react";
import { FieldArrayHelpers, FieldArrayItem } from "../types";
import { useForm } from "./useForm";

/**
 * Manage a dynamic list of repeated field rows (add / remove / reorder) with
 * **stable keys** that survive reordering and removal.
 *
 * Rows are keyed by a stable `key`; each row's input names derive from its
 * current `index` (`addresses.0.city`, `addresses.1.city`, …), so the form's
 * dot-notation collection nests them into an array automatically. Because rows
 * keep their identity, a surviving row carries its own value when others are
 * removed or moved.
 *
 * ```tsx
 * const { fields, append, remove } = useFieldArray("addresses");
 *
 * {fields.map((field) => (
 *   <div key={field.key}>
 *     <TextInput name={`${field.name}.city`} />
 *     <button type="button" onClick={() => remove(field.index)}>Remove</button>
 *   </div>
 * ))}
 * <button type="button" onClick={() => append()}>Add address</button>
 * ```
 */
export function useFieldArray(name: string): FieldArrayHelpers {
  const form = useForm();

  const keyCounter = useRef(0);

  const makeKey = () => `${name}-${keyCounter.current++}`;

  const makeKeys = (count: number) =>
    Array.from({ length: Math.max(0, count) }, () => makeKey());

  const [keys, setKeys] = useState<string[]>(() => {
    const initial = form?.getInitialValue(name);
    const length = Array.isArray(initial) ? initial.length : 0;
    return makeKeys(length);
  });

  // Snapshot of the initial row count, restored on form reset.
  const initialLength = useRef(keys.length);

  useEffect(() => {
    if (!form) return;

    // Grow rows to match data that arrives after mount (reactive `values` /
    // `form.fill()`), so async edit forms render every loaded row. Never
    // shrinks — explicit removal is the user's call.
    const changeEvent = form.on("change", () => {
      const hydrated = form.getInitialValue(name);
      const length = Array.isArray(hydrated) ? hydrated.length : 0;

      setKeys((current) =>
        length > current.length
          ? [...current, ...makeKeys(length - current.length)]
          : current
      );
    });

    const resetEvent = form.on("reset", () => {
      setKeys(makeKeys(initialLength.current));
    });

    return () => {
      changeEvent.unsubscribe();
      resetEvent.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const fields: FieldArrayItem[] = keys.map((key, index) => ({
    key,
    index,
    name: `${name}.${index}`,
  }));

  const append = (count = 1) =>
    setKeys((current) => [...current, ...makeKeys(count)]);

  const prepend = (count = 1) =>
    setKeys((current) => [...makeKeys(count), ...current]);

  const remove = (index?: number) =>
    setKeys((current) => {
      if (index === undefined) return current.slice(0, -1);
      const next = [...current];
      next.splice(index, 1);
      return next;
    });

  const insert = (index: number) =>
    setKeys((current) => {
      const next = [...current];
      next.splice(index, 0, makeKey());
      return next;
    });

  const move = (from: number, to: number) =>
    setKeys((current) => {
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

  const swap = (a: number, b: number) =>
    setKeys((current) => {
      const next = [...current];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });

  const replace = (count: number) => setKeys(makeKeys(count));

  return { fields, append, prepend, remove, insert, move, swap, replace };
}
