"use client";

import { useEffect, useReducer, useRef } from "react";
import { useForm } from "./useForm";

/**
 * Shallow equality used to decide whether a watched value actually changed.
 * Primitives compare by `Object.is`; arrays compare element-wise (for the
 * `names[]` form). Two fresh objects (the `watch-all` case) never compare equal,
 * so `useWatch()` still re-renders on every change — that is inherent.
 */
function isSameWatched(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;

  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  }

  return false;
}

/**
 * Reactively read form values from any descendant of a `Form` / `NativeForm`.
 *
 * - `useWatch()` → the whole collected values object (re-renders on any change).
 * - `useWatch("user.email")` → that single control's current value.
 * - `useWatch(["a", "b"])` → an array of those controls' values.
 *
 * For the single / `names[]` forms the component re-renders **only when the
 * watched value(s) change**, not on every unrelated field change.
 */
export function useWatch(): Record<string, any>;
export function useWatch(name: string): any;
export function useWatch(names: string[]): any[];
export function useWatch(name?: string | string[]): any {
  const form = useForm();
  const [, rerender] = useReducer((count: number) => count + 1, 0);

  const read = () => {
    if (!form) {
      if (name === undefined) return {};
      return Array.isArray(name) ? name.map(() => undefined) : undefined;
    }

    if (name === undefined) return form.values();
    if (Array.isArray(name)) return name.map((control) => form.value(control));
    return form.value(name);
  };

  const current = read();

  // Latest rendered value, compared against on each change event.
  const latest = useRef(current);
  latest.current = current;

  // Stable dependency for the `names[]` form so a fresh array literal each
  // render does not re-subscribe.
  const nameKey = Array.isArray(name) ? name.join("|") : name;

  useEffect(() => {
    if (!form) return;

    const onChange = () => {
      const next = read();

      if (!isSameWatched(latest.current, next)) {
        latest.current = next;
        rerender();
      }
    };

    const changeEvent = form.on("change", onChange);
    const resetEvent = form.on("reset", onChange);

    return () => {
      changeEvent.unsubscribe();
      resetEvent.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, nameKey]);

  return current;
}
