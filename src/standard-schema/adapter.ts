import { ReactNode } from "react";
import { InputRule } from "../types";
import { StandardSchemaV1 } from "./types";

/**
 * Duck-type guard: is `value` a Standard-Schema-compliant validator?
 *
 * We intentionally avoid importing any concrete library — anything exposing a
 * `~standard.validate` function is accepted (seal, zod, valibot, arktype, …).
 */
export function isStandardSchema(value: any): value is StandardSchemaV1 {
  return (
    !!value &&
    typeof value === "object" &&
    "~standard" in value &&
    typeof value["~standard"]?.validate === "function"
  );
}

/**
 * Run a Standard Schema against a value and normalize the result to a plain
 * `{ issues }` shape. Always returns a Promise — the spec allows `validate` to
 * be sync or async, so we await uniformly.
 */
export async function runStandardSchema<Output>(
  schema: StandardSchemaV1<unknown, Output>,
  value: unknown
): Promise<StandardSchemaV1.Result<Output>> {
  return await schema["~standard"].validate(value);
}

/**
 * Convert a Standard Schema issue path (e.g. `["user", { key: "addresses" }, 0,
 * "city"]`) into a dot-notation form-control name (`user.addresses.0.city`).
 */
export function issuePathToName(
  path: StandardSchemaV1.Issue["path"]
): string {
  if (!path || path.length === 0) return "";

  return path
    .map((segment) =>
      typeof segment === "object" && segment !== null && "key" in segment
        ? (segment as StandardSchemaV1.PathSegment).key
        : segment
    )
    .join(".");
}

/**
 * Wrap a **single-field** Standard Schema as an `InputRule` so it can run inside
 * the per-control rule pipeline. The first issue's message becomes the rendered
 * error.
 *
 * Used by `useFormControl({ schema })`. The rule is async (the spec permits an
 * async `validate`) and participates in the engine's async gating just like any
 * other promise-returning rule.
 */
export function standardSchemaToRule(
  schema: StandardSchemaV1,
  name = "schema"
): InputRule {
  return {
    name,
    // Empty values are still handed to the schema so `optional`/`required`
    // semantics defined by the schema itself are honored.
    requiresValue: false,
    validate: async ({ value }): Promise<ReactNode | undefined> => {
      const result = await runStandardSchema(schema, value);

      if (result.issues && result.issues.length > 0) {
        return result.issues[0].message;
      }

      return undefined;
    },
  };
}
