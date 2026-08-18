/**
 * Standard Schema V1 spec types.
 *
 * Vendored from https://standardschema.dev so the form engine can consume any
 * Standard-Schema-compliant validator (`@warlock.js/seal`, `zod`, `valibot`,
 * `arktype`, …) **without** taking a runtime dependency on any of them. We only
 * duck-type on the `~standard` property at runtime.
 */

/** The Standard Schema interface. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": StandardSchemaV1.Props<Input, Output>;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export declare namespace StandardSchemaV1 {
  /** The Standard Schema properties interface. */
  export interface Props<Input = unknown, Output = Input> {
    /** The version number of the standard. */
    readonly version: 1;
    /** The vendor name of the schema library. */
    readonly vendor: string;
    /** Inferred types associated with the schema. */
    readonly types?: Types<Input, Output> | undefined;
    /** Validates unknown input values. */
    readonly validate: (
      value: unknown
    ) => Result<Output> | Promise<Result<Output>>;
  }

  /** The result interface of the validate function. */
  export type Result<Output> = SuccessResult<Output> | FailureResult;

  /** The result interface if validation succeeds. */
  export interface SuccessResult<Output> {
    /** The typed output value. */
    readonly value: Output;
    /** The non-existent issues. */
    readonly issues?: undefined;
  }

  /** The result interface if validation fails. */
  export interface FailureResult {
    /** The issues of failed validation. */
    readonly issues: ReadonlyArray<Issue>;
  }

  /** The issue interface of the failure output. */
  export interface Issue {
    /** The error message of the issue. */
    readonly message: string;
    /** The path of the issue, if any. */
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
  }

  /** The path segment interface of the issue. */
  export interface PathSegment {
    /** The key representing a path segment. */
    readonly key: PropertyKey;
  }

  /** The Standard Schema types interface. */
  export interface Types<Input = unknown, Output = Input> {
    /** The input type of the schema. */
    readonly input: Input;
    /** The output type of the schema. */
    readonly output: Output;
  }

  /** Infers the input type of a Standard Schema. */
  export type InferInput<Schema extends StandardSchemaV1> = NonNullable<
    Schema["~standard"]["types"]
  >["input"];

  /** Infers the output type of a Standard Schema. */
  export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
    Schema["~standard"]["types"]
  >["output"];
}

/**
 * Convenience alias: infer the *output* (post-validation) shape of the values
 * a `<Form schema={...}>` will hand to `onSubmit`.
 */
export type InferFormValues<Schema extends StandardSchemaV1> =
  StandardSchemaV1.InferOutput<Schema>;

/**
 * Convenience alias: infer the *input* (pre-validation) shape of the values a
 * `<Form schema={...}>` collects from its controls.
 */
export type InferFormInput<Schema extends StandardSchemaV1> =
  StandardSchemaV1.InferInput<Schema>;
