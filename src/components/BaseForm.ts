import { FormEngine } from "../engine/FormEngine";

/**
 * @deprecated Since v4. `BaseForm` was an abstract `React.Component`; the
 * platform-agnostic logic now lives in the React-free {@link FormEngine} class,
 * and `Form` / `NativeForm` are function components built over it.
 *
 * Migration:
 * - To access the engine instance from a `ref`, the type is `FormEngine`
 *   (still assignable to `FormInterface`).
 * - To support a custom renderer, subclass `FormEngine` and render a thin
 *   function component that lazy-inits it (see `useFormEngine`), instead of
 *   subclassing `BaseForm`.
 *
 * This alias is kept for one major version to ease the migration and will be
 * removed in v5.
 */
export const BaseForm = FormEngine;

/**
 * @deprecated Since v4. Use `FormEngine` instead.
 */
export type BaseForm = FormEngine;
