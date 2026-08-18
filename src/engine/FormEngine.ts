import events, { EventSubscription } from "@mongez/events";
import { debounce, get, merge, toInputName } from "@mongez/reinforcements";
import { isPlainObject } from "@mongez/supportive-is";
import React from "react";
import {
  addToFormsList,
  removeActiveForm,
  removeFromFormsList,
  setActiveForm,
} from "../active-form";
import { getFormConfig } from "../configurations";
import {
  issuePathToName,
  isStandardSchema,
  runStandardSchema,
} from "../standard-schema/adapter";
import { StandardSchemaV1 } from "../standard-schema/types";
import {
  FillOptions,
  FormControl,
  FormControlValues,
  FormEventType,
  FormInterface,
  ValidateOn,
} from "../types";

/**
 * Process-wide counter used only as the LAST resort for a form id (when the
 * host passes none and React's `useId()` is unavailable). Ids are otherwise
 * supplied by the host so they stay stable and SSR-safe.
 */
let engineCounter = 0;

/**
 * Mutable options synced into the engine each render by the host component.
 */
export type FormEngineOptions = {
  id?: string;
  defaultValue?: Record<string, any>;
  values?: Record<string, any>;
  schema?: StandardSchemaV1;
  validateOn?: ValidateOn;
  ignoreEmptyValues?: boolean;
  focusFirstError?: boolean;
  onSubmit?: (options: {
    form: FormInterface;
    event?: React.FormEvent;
    values: any;
    formData: FormData;
  }) => void | Promise<any>;
  onError?: (invalidControls: FormControl[]) => void;
};

/**
 * Platform-agnostic, **React-free** form engine — the controller object behind
 * every `<Form>` / `<NativeForm>`.
 *
 * It is a plain class (not a `React.Component`) so it can be unit-tested in
 * isolation and held in a `useRef` by the host function component. The host
 * owns rendering and the host element; the engine owns *everything else* —
 * registration, validation, value collection, dirty tracking, hydration, and
 * the submit pipeline.
 *
 * ## Mental model
 *
 * The engine never re-renders anything itself. It coordinates the form through
 * three cooperating mechanisms — keep these in mind when reading any method:
 *
 * 1. **Mutable instance state** (`formControls`, `invalidControls`,
 *    `dirtyControls`, `_isSubmitting`, …). Plain arrays/flags mutated in place.
 *    Mutating them is intentionally invisible to React; that is what keeps the
 *    library fast (registering a control or flipping validity does not re-render
 *    the tree).
 * 2. **A pub/sub event bus** (`@mongez/events`). Every event is namespaced under
 *    `form.{id}.{event}` (see {@link on} / {@link trigger}). Consumers like
 *    `useSubmitButton` / `useWatch` and the host subscribe via {@link on}; the
 *    engine emits via {@link trigger}. Per-control value changes flow on a
 *    separate key, `form.control.{controlId}.change`, owned by the control.
 * 3. **Control registration.** Each `useFormControl` builds a mutable
 *    `FormControl` object and calls {@link register} on mount / {@link unregister}
 *    on unmount. The engine reads/writes those objects directly (e.g.
 *    `control.value`, `control.validate()`); it never copies their state.
 *
 * ## Lifecycle (driven by the host component)
 *
 * ```text
 * new FormEngine(options)      // construct once, seed id + defaultValue + values + schema
 *   → activate()               // mount effect: register as the active form
 *   → setOptions(options)      // every render: re-sync scalar handlers (onSubmit/onError/…)
 *   → fill() / setDefaultValue()   // when the reactive `values` / `defaultValue` prop changes
 *   → register() / unregister()    // as controls mount / unmount
 *   → handleSubmit() / validate()  // on submit (native event or form.submit())
 *   → destroy()                // unmount effect: drop active-form registration
 * ```
 *
 * The host injects {@link submitHandler} so `form.submit()` can trigger a native
 * DOM submit on web vs. run the pipeline directly on React Native.
 */
export class FormEngine implements FormInterface {
  /**
   * Reference to the host element (HTMLFormElement on web, any on native).
   * Assigned by the host component via its ref callback.
   */
  public formElement: any = null;

  /**
   * Form id.
   */
  protected formId: string;

  /**
   * Form event prefix.
   */
  protected formEventPrefix: string;

  /**
   * Form controls.
   */
  protected formControls: FormControl[] = [];

  /**
   * Determine whether form validation is valid.
   */
  protected isValidForm = true;

  /**
   * Determine form submission state.
   */
  protected _isSubmitting = false;

  /**
   * Determine if form is disabled.
   */
  protected _isDisabled = false;

  /**
   * List of invalid controls.
   */
  protected invalidControls: FormControl[] = [];

  /**
   * List of valid controls.
   */
  protected validControls: FormControl[] = [];

  /**
   * Form-level error messages with no owning control — produced by whole-form
   * schema issues whose path maps to no control (cross-field / root errors).
   */
  public formErrors: React.ReactNode[] = [];

  /**
   * Dirty controls.
   */
  public dirtyControls: FormControl[] = [];

  /**
   * Default value (reset baseline).
   */
  public defaultValue: Record<string, any> | undefined;

  /**
   * Reactive hydration snapshot (nested object) — read by controls mounting
   * after a `fill()` / reactive `values` update.
   */
  public hydrationValues: Record<string, any> | undefined;

  /**
   * Whole-form Standard Schema validator.
   */
  public schema: StandardSchemaV1 | undefined;

  /**
   * Form-level default validation trigger.
   */
  public validateOn: ValidateOn | undefined;

  /**
   * Whether the form has attempted submission at least once.
   */
  public wasSubmitted = false;

  /**
   * Form control change subscriptions, keyed by control id/name.
   */
  protected formControlEvents: Record<string, EventSubscription[]> = {};

  /**
   * Current form dirty state.
   */
  public isDirty = false;

  /**
   * Latest mutable options synced from the host component.
   */
  protected formOptions: FormEngineOptions;

  // ───────────────────────────────────────────────────────────────────────
  // Lifecycle — construct once, sync each render, (de)activate on mount/unmount
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Seeds the one-time state: the (stable) form id + its event prefix, the
   * reset baseline (`defaultValue`), the initial hydration snapshot (cloned from
   * `values` so later `fill()` merges don't mutate the caller's object), the
   * whole-form schema, and the default validation trigger.
   *
   * Everything that can change between renders (the `onSubmit` / `onError`
   * handlers, `ignoreEmptyValues`, …) is re-read from {@link setOptions}, not
   * captured here.
   */
  public constructor(options: FormEngineOptions = {}) {
    this.formOptions = options;
    this.formId =
      options.id || `frm-${(++engineCounter).toString(36)}`;
    this.formEventPrefix = `form.${this.formId}`;
    this.defaultValue = options.defaultValue;
    this.hydrationValues = options.values
      ? merge({}, options.values)
      : undefined;
    this.schema = isStandardSchema(options.schema) ? options.schema : undefined;
    this.validateOn = options.validateOn;
  }

  /**
   * Sync the latest scalar options/handlers from the host component. Reactive
   * `values` / `defaultValue` identity changes are handled by the host calling
   * `fill()` / `setDefaultValue()` explicitly.
   */
  public setOptions(options: FormEngineOptions) {
    this.formOptions = options;
    this.schema = isStandardSchema(options.schema) ? options.schema : undefined;
    this.validateOn = options.validateOn;
  }

  /**
   * Register the engine as the active form. Called by the host on mount.
   */
  public activate() {
    setActiveForm(this);
    addToFormsList(this);
  }

  /**
   * Tear down active-form registration. Called by the host on unmount.
   */
  public destroy() {
    removeActiveForm(this);
    removeFromFormsList(this);
  }

  public change(name: string, value: any) {
    const formControl = this.control(name);

    if (!formControl) return;

    formControl.change(value);
  }

  // ───────────────────────────────────────────────────────────────────────
  // Validity tracking
  //
  // Two layers work together:
  //  - EAGER, per-control: invalidControl()/validControl() move a single control
  //    between the valid/invalid buckets the instant its own validation
  //    resolves, and fire the singular `invalidControl` / `validControl` events.
  //  - DEBOUNCED, aggregate: checkIfIsValid() coalesces a burst of per-control
  //    updates (e.g. validating the whole form) into ONE `validControls` /
  //    `invalidControls` event on the next tick, so a button bound to form
  //    validity flips once, not once per field.
  // ───────────────────────────────────────────────────────────────────────

  /** Move a control into the invalid bucket and mark the form invalid. */
  public invalidControl(formControl: FormControl) {
    this.isValidForm = false;

    this.validControls = this.validControls.filter(
      (control) => control.id !== formControl.id
    );

    if (!this.invalidControls.includes(formControl)) {
      this.invalidControls.push(formControl);
    }

    this.trigger("invalidControl", formControl, this);
  }

  /**
   * Move a control into the valid bucket; the form is valid again only once the
   * invalid bucket is empty.
   */
  public validControl(formControl: FormControl) {
    this.invalidControls = this.invalidControls.filter(
      (control) => control.id !== formControl.id
    );

    if (!this.validControls.includes(formControl)) {
      this.validControls.push(formControl);
    }

    this.isValidForm = this.invalidControls.length === 0;

    this.trigger("validControl", formControl, this);
  }

  /**
   * Debounced aggregate validity check. Call it after a batch of per-control
   * validity changes; it emits a single `validControls` / `invalidControls`
   * event on the next tick. (A field initializer rather than a method so each
   * engine instance owns its own debounced function.)
   */
  public checkIfIsValid = this._checkIfIsValid();

  protected _checkIfIsValid() {
    return debounce(() => {
      const isValidForm = this.invalidControls.length === 0;

      this.isValidForm = isValidForm;

      if (this.isValidForm) {
        this.trigger("validControls", this.validControls, this);
      } else {
        this.trigger("invalidControls", this.invalidControls, this);
      }
    }, 0);
  }

  /**
   * Set the in-flight submit state and emit `submitting`. Clearing it
   * (`submitting(false)`) *also* emits `submit` — that is the single completion
   * signal for an async submit (see {@link handleSubmit}). Call this yourself in
   * a sync `onSubmit`'s success/failure path to re-enable a submit button.
   */
  public submitting(submitting: boolean) {
    this._isSubmitting = submitting;

    this.trigger("submitting", submitting, this);

    if (submitting === false) {
      this.trigger("submit", submitting, this);
    }
  }

  public disable(isDisabled = true) {
    const controls = this.formControls;

    this._isDisabled = isDisabled;

    controls.forEach((control) => {
      control.disable(isDisabled);
    });

    this.trigger("disable", isDisabled, this);

    return this;
  }

  public enable() {
    return this.disable(false);
  }

  /** Whether the whole form is currently disabled (via {@link disable}). */
  public isDisabled() {
    return this._isDisabled;
  }

  public isSubmitting() {
    return this._isSubmitting;
  }

  public isValid() {
    return this.isValidForm;
  }

  public get id() {
    return this.formId;
  }

  // ───────────────────────────────────────────────────────────────────────
  // Events — all keyed under `form.{id}.{event}` so multiple forms never collide
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Subscribe to a form event. Returns an `EventSubscription` — call
   * `.unsubscribe()` (typically in a `useEffect` cleanup) to detach.
   */
  public on(
    event: FormEventType,
    callback: (form: FormInterface) => void
  ): EventSubscription {
    return events.subscribe(`${this.formEventPrefix}.${event}`, callback);
  }

  /** Emit a form event (fire-and-forget; listener return values are ignored). */
  public trigger(event: FormEventType, ...values: any[]) {
    return events.trigger(`${this.formEventPrefix}.${event}`, ...values);
  }

  /**
   * Emit a form event and collect every listener's return value in
   * `response.results`. Used by {@link validate} for the `validating` veto: a
   * listener returning `false` aborts validation.
   */
  public triggerAll(event: FormEventType, ...values: any[]) {
    return events.triggerAll(`${this.formEventPrefix}.${event}`, ...values);
  }

  // ───────────────────────────────────────────────────────────────────────
  // Validation pipeline
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Validate `controls` (the whole form by default) and recompute form validity.
   *
   * Flow:
   *  1. Reset the valid/invalid buckets and optimistically assume valid.
   *  2. Fire `validating` — any listener returning `false` **vetoes** the run
   *     (the form is marked invalid and nothing else validates).
   *  3. `await` each control's `validate()` in turn. This is what makes async
   *     rules genuinely gate submission: a control whose rule returns a Promise
   *     is awaited here before the form decides it is valid. Each control sorts
   *     itself into the invalid/valid bucket via its resolved `isValid`.
   *  4. If a whole-form {@link schema} is set, run it and map issues back to
   *     controls (see {@link validateSchema}).
   *  5. Emit `validation`, schedule the debounced aggregate event, and call the
   *     `onError` handler when invalid.
   *
   * `validateVisible()` passes a filtered `controls` subset; schema issues for
   * controls outside that subset are ignored so hidden fields don't fail it.
   */
  public async validate(controls: FormControl[] | string[] = this.formControls) {
    // Accept control names as a convenience: validate(["email", "password"]).
    const targetControls: FormControl[] =
      controls.length > 0 && typeof controls[0] === "string"
        ? this.controls(controls as string[])
        : (controls as FormControl[]);

    this.isValidForm = true;
    this.validControls = [];
    this.invalidControls = [];
    this.formErrors = [];

    const eventResponse = this.triggerAll("validating", this);

    const validatedInputs: FormControl[] = [];

    if (eventResponse.results.includes(false)) {
      this.isValidForm = false;
      return validatedInputs;
    }

    for (const input of targetControls) {
      validatedInputs.push(input);

      // Awaited: a control with an async rule resolves its `isValid` before we
      // bucket it, so async validation actually blocks the form.
      await input.validate();

      if (input.isValid === false) {
        this.invalidControl(input);
      } else {
        this.validControl(input);
      }
    }

    // Whole-form schema validation. Issues are mapped back to controls by path;
    // issues whose control is not in the validated subset become form-level
    // errors (so a subset validation like `validateVisible()` still won't fail
    // on hidden fields' own messages, but a cross-field error still blocks).
    if (this.schema) {
      await this.validateSchema(targetControls);
    }

    this.trigger("validation", this.isValidForm, validatedInputs, this);

    this.checkIfIsValid();

    if (!this.isValidForm) {
      this.formOptions.onError?.(this.invalidControls);

      // Opt-in: move focus to the first invalid control so the user lands on
      // the problem without a manual scroll/focus recipe.
      if (this.formOptions.focusFirstError) {
        this.invalidControls[0]?.focus();
      }
    }

    return validatedInputs;
  }

  /**
   * Run the whole-form Standard Schema and distribute its issues. Three cases:
   *
   * - **Maps to a control in the validated subset** → shown on that control.
   * - **Maps to a control OUTSIDE the subset** (e.g. a hidden wizard step during
   *   `validateVisible()`) → ignored, so a subset validation isn't failed by
   *   fields it deliberately skipped.
   * - **Root / cross-field issue (empty path)** → there is no control to own it,
   *   so it becomes a {@link formErrors} entry and blocks submission. (These
   *   were previously dropped, letting the form submit schema-invalid.)
   *
   * A non-empty path matching no control is treated as a schema/form-name
   * mismatch and ignored, so a stray path can't make the form permanently
   * unsubmittable.
   */
  protected async validateSchema(controls: FormControl[]) {
    if (!this.schema) return;

    const result = await runStandardSchema(this.schema, this.values());

    if (!result.issues || result.issues.length === 0) return;

    for (const issue of result.issues) {
      const name = issuePathToName(issue.path);

      const control = name ? this.control(name) : null;

      if (control) {
        if (controls.includes(control)) {
          this.applyControlError(control, issue.message);
        }
        continue;
      }

      if (name === "") {
        this.formErrors.push(issue.message);
        this.isValidForm = false;
      }
    }
  }

  /**
   * Force a control into an invalid state with the given message.
   */
  protected applyControlError(control: FormControl, message: React.ReactNode) {
    control.setError(message);
    control.error = message;
    control.isValid = false;
    this.invalidControl(control);
  }

  public validateVisible() {
    const controls = this.formControls.filter((control) => {
      return control.isVisible();
    });

    return this.validate(controls);
  }

  // ───────────────────────────────────────────────────────────────────────
  // Control registration — controls call these from their mount/unmount effects
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Add a control to the form and wire its change subscription.
   *
   * - The leading guard makes registration idempotent (a control re-running its
   *   effect, e.g. a field-array row whose name/index changed, won't be added
   *   twice).
   * - The `onChange` subscription is the engine's link to per-control changes:
   *   it keeps `dirtyControls` (and thus `isDirty`) in sync and re-broadcasts a
   *   form-level `change` event for `useWatch` / `useFieldArray`.
   * - The subscription is stored under the control's key so {@link unregister}
   *   can tear it down.
   */
  public register(formControl: FormControl) {
    if (this.control(formControl.id, "id")) return;

    this.trigger("registering", formControl, this);

    this.formControls.push(formControl);

    const event = formControl.onChange(() => {
      if (formControl.isDirty && !this.dirtyControls.includes(formControl)) {
        this.dirtyControls.push(formControl);
      } else if (
        !formControl.isDirty &&
        this.dirtyControls.includes(formControl)
      ) {
        this.dirtyControls = this.dirtyControls.filter(
          (control) => control.id !== formControl.id
        );
      }

      this.setIsDirty(this.dirtyControls.length > 0);

      // Form-level change broadcast — consumed by `useWatch`.
      this.trigger("change", formControl, this);
    });

    this.formControlEvents[formControl.id || formControl.name] = [
      ...(this.formControlEvents[formControl.id || formControl.name] || []),
      event,
    ];

    this.trigger("register", formControl, this);
  }

  /**
   * Remove a control and undo everything {@link register} set up: notify the
   * control (`unregister`), drop it from `formControls` and the invalid bucket,
   * unsubscribe its change listener, and recompute dirty/validity so the form
   * doesn't stay blocked by a control that no longer exists.
   */
  public unregister(formControl: FormControl) {
    formControl.unregister();

    const formControlIndex = this.formControls.findIndex(
      (input) => input.id === formControl.id
    );

    if (formControlIndex === -1) return;

    this.formControls.splice(formControlIndex, 1);

    // Drop the control from BOTH validity buckets so an unmounted control's
    // object (and its DOM refs / closures) isn't retained until the next full
    // validate(). The valid bucket was previously only cleared wholesale by
    // validate(), so a valid-then-unmounted control leaked.
    this.invalidControls = this.invalidControls.filter(
      (control) => control.id !== formControl.id
    );
    this.validControls = this.validControls.filter(
      (control) => control.id !== formControl.id
    );

    const formControlKey = formControl.id || formControl.name;

    const controlEvents = this.formControlEvents[formControlKey];

    if (controlEvents) {
      controlEvents.forEach((event) => {
        event.unsubscribe();
      });

      delete this.formControlEvents[formControlKey];

      if (this.dirtyControls.includes(formControl)) {
        this.dirtyControls = this.dirtyControls.filter(
          (control) => control.id !== formControl.id
        );

        this.setIsDirty(this.dirtyControls.length > 0);
      }
    }

    this.checkIfIsValid();

    this.trigger("unregister", formControl, this);
  }

  protected setIsDirty(isDirty: boolean) {
    this.isDirty = isDirty;

    this.trigger("dirty", isDirty, this);
  }

  public control(
    value: string,
    getBy: "name" | "id" = "name"
  ): FormControl | null {
    return this.formControls.find((input) => input[getBy] === value) || null;
  }

  /**
   * Restore the form to its pristine state: each control resets to its
   * `initialValue` (the reset baseline — see {@link getResetBaseline}) and
   * clears its error/dirty/touched flags, then the form-level flags reset.
   * Brackets the work with `resetting` (before) and `reset` (after) events.
   *
   * Pass `values` to reset to a NEW baseline (e.g. after saving an edit form):
   * the new values are merged into `defaultValue` and become each control's
   * reset target, so subsequent resets restore to them too.
   */
  public reset(values?: Record<string, any>) {
    this.trigger("resetting", this);

    if (values !== undefined) {
      this.defaultValue = merge(this.defaultValue ?? {}, values);

      for (const control of this.formControls) {
        const baseline = get(this.defaultValue, control.name);
        if (baseline !== undefined) control.initialValue = baseline;
      }
    }

    this.formControls.forEach((input) => {
      input.reset();
    });

    this.isValidForm = true;
    this._isSubmitting = false;
    this._isDisabled = false;
    this.wasSubmitted = false;
    this.formErrors = [];

    this.trigger("reset", this);

    return this;
  }

  public resetErrors() {
    this.formControls.forEach((formControl) => {
      formControl.setError(null);
      formControl.isValid = null;
    });

    this.invalidControls = [];
    // Clear the valid bucket too — otherwise stale/unmounted controls linger
    // here until a full re-validate.
    this.validControls = [];
    this.formErrors = [];
    this.isValidForm = true;

    return this;
  }

  // ───────────────────────────────────────────────────────────────────────
  // Values & hydration
  //
  // Two distinct concepts that are easy to conflate:
  //  - DISPLAY seed (getInitialValue): what a control shows when it mounts.
  //    Live-loaded `values` (hydrationValues) win here so edit forms render the
  //    record.
  //  - RESET baseline (getResetBaseline): what `form.reset()` restores to. Only
  //    `defaultValue` counts — never the hydration snapshot — so loading a
  //    record never silently becomes the "reset" target.
  // Controls read the display seed for their initial value and the reset
  // baseline for `formControl.initialValue`.
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Resolve the seed (display) value for a control name: the reactive hydration
   * snapshot wins over the reset baseline.
   */
  public getInitialValue(name: string): any {
    if (this.hydrationValues !== undefined) {
      const value = get(this.hydrationValues, name);
      if (value !== undefined) return value;
    }

    if (this.defaultValue !== undefined) {
      return get(this.defaultValue, name);
    }

    return undefined;
  }

  /**
   * Resolve the **reset baseline** for a control name — from `defaultValue`
   * only, never the hydration snapshot. `form.reset()` restores controls to
   * this, so live-loaded `values` never become the reset target.
   */
  public getResetBaseline(name: string): any {
    if (this.defaultValue === undefined) return undefined;

    return get(this.defaultValue, name);
  }

  /**
   * Bulk-write values onto mounted controls and seed later-mounting controls.
   * Does not change the reset baseline (`defaultValue`).
   */
  public fill(values: Record<string, any>, options: FillOptions = {}) {
    const { dirty = false, validate = false } = options;

    this.hydrationValues = merge(this.hydrationValues ?? {}, values);

    for (const control of this.formControls) {
      const value = get(values, control.name);

      if (value === undefined) continue;

      control.change(value, { dirty, validate, updateState: true });
    }

    // Notify hydration listeners (useWatch, useFieldArray) even when no control
    // matched yet — e.g. a field array that needs to grow its rows to match a
    // freshly-loaded array.
    this.trigger("change", undefined, this);

    return this;
  }

  public setValues(values: Record<string, any>, options: FillOptions = {}) {
    return this.fill(values, options);
  }

  /**
   * Update the reset baseline. Pristine (non-dirty) controls re-hydrate to the
   * new baseline; dirty controls keep the user's edits.
   */
  public setDefaultValue(defaultValue: Record<string, any> | undefined) {
    this.defaultValue = defaultValue;

    if (!defaultValue) return this;

    for (const control of this.formControls) {
      if (control.isDirty) continue;

      const value = get(defaultValue, control.name);

      if (value === undefined) continue;

      control.initialValue = value;
      control.change(value, { dirty: false, validate: false, updateState: true });
    }

    return this;
  }

  public setErrors(errors: Record<string, React.ReactNode>) {
    for (const name in errors) {
      const control = this.control(name);

      if (!control) continue;

      this.applyControlError(control, errors[name]);
    }

    this.checkIfIsValid();

    if (this.invalidControls.length > 0) {
      this.trigger("invalidControls", this.invalidControls, this);
    }

    return this;
  }

  /** Current value of a single control by name (live, not collected). */
  public value(formControlName: string): any {
    return this.control(formControlName, "name")?.value;
  }

  /**
   * The collected form values as a nested object: takes the flat dot-notation
   * map from {@link collectValues} and expands it (`user.address.city` →
   * `{ user: { address: { city } } }`, numeric segments → arrays). This is what
   * `onSubmit` receives as `values`.
   */
  public values(formControlNames: string[] = []) {
    return createNestedObjectFromDotNotation(
      this.collectValues(formControlNames)
    );
  }

  public shouldIgnoreEmptyValues() {
    return (
      this.formOptions.ignoreEmptyValues !== undefined
        ? this.formOptions.ignoreEmptyValues
        : getFormConfig("ignoreEmptyValues", false)
    ) as boolean;
  }

  /**
   * Collect a FLAT `{ dotNotationName: value }` map from the registered
   * controls — the raw material {@link values} nests into objects/arrays.
   *
   * Per control: skip the unnamed and the non-collectable (disabled, unchecked
   * boxes, …); optionally drop empties when `ignoreEmptyValues` is on; then
   * merge into the map. The merge collapses repeats into an array — if a name
   * already has a value (or the control is `multiple`), the slot is promoted to
   * an array and subsequent values are pushed. That is how N inputs sharing one
   * `name` (e.g. a checkbox group) become a single array value.
   */
  public collectValues(formControlNames: string[] = []) {
    const formControls = this.controls(formControlNames);

    const values: FormControlValues = {};

    const ignoreEmptyValues = this.shouldIgnoreEmptyValues();

    for (const formControl of formControls) {
      const name = formControl.name;
      if (!name || !formControl.isCollectable()) continue;

      const value = formControl.collectValue();

      if (
        ignoreEmptyValues &&
        ([null, undefined, ""].includes(value) ||
          (Array.isArray(value) && value.length === 0))
      )
        continue;

      if (
        (values[name] || formControl.multiple) &&
        !Array.isArray(values[name]) &&
        !Array.isArray(value)
      ) {
        values[name] = values[name] ? [values[name]] : [];
      }

      if (Array.isArray(values[name])) {
        values[name].push(value);
      } else {
        values[name] = value;
      }
    }

    return values;
  }

  /**
   * The collected values as a `FormData` for `multipart/form-data` submits.
   * Mirrors the nested shape using PHP/Rails-style bracket keys on the wire:
   * arrays as `name[]`, plain objects as `name[key]`.
   */
  public formData(): FormData {
    const formData: FormData = new FormData();

    const values = this.collectValues();

    for (const name in values) {
      const value = values[name];
      const formControlName = toInputName(name);

      if (Array.isArray(value)) {
        for (const item of value) {
          formData.append(`${formControlName}[]`, item);
        }
        continue;
      } else if (isPlainObject(value)) {
        for (const key in value) {
          formData.append(`${formControlName}[${key}]`, value[key]);
        }
        continue;
      }

      formData.append(formControlName, value);
    }

    return formData;
  }

  public controls(formControls: string[] = []): FormControl[] {
    if (formControls?.length === 0) return this.formControls;

    return this.formControls.filter((formControl) =>
      formControls.includes(formControl.name)
    );
  }

  // ───────────────────────────────────────────────────────────────────────
  // Submit pipeline
  //
  // Two entry points converge on handleSubmit():
  //  - Web: form.submit() → submitHandler() dispatches a native submit event →
  //    the host's onSubmit listener calls handleSubmit(event).
  //  - Native / programmatic: submitHandler() (or the host) calls handleSubmit()
  //    directly — there is no DOM event to dispatch.
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Manually submit the form. Delegates to the host-injected
   * {@link submitHandler} because only the host knows how to dispatch a native
   * submit on web vs. run the pipeline directly on React Native.
   */
  public submit() {
    this.submitHandler?.();
  }

  /**
   * Submit trigger injected by the host component (see {@link submit}).
   */
  public submitHandler: (() => void) | undefined;

  /**
   * The shared submit pipeline.
   *
   * Flow:
   *  1. Mark `wasSubmitted` (drives `validateOn: "submit"` revalidation).
   *  2. `await validate()` — async rules block here.
   *  3. Bail if invalid, or if a submit is already in flight (re-entrancy guard).
   *  4. With no `onSubmit`, emit `submit` immediately and stop.
   *  5. Otherwise flip submitting on and invoke `onSubmit` with lazy `values` /
   *     `formData` getters (re-collected on access).
   *     - **Async** `onSubmit`: defer clearing the submitting state AND the
   *       `submit` completion event until the returned promise settles, so
   *       `submit` fires exactly once, after the work is done. (`submitting(false)`
   *       is itself what emits `submit` here — see {@link submitting}.)
   *     - **Sync / void** `onSubmit`: completion is immediate; the caller owns
   *       clearing the submitting state.
   *     - A synchronous throw clears the submitting state and re-throws.
   */
  public async handleSubmit(event?: React.FormEvent) {
    this.wasSubmitted = true;

    await this.validate();

    if (this.isValidForm === false) return;

    if (this.isSubmitting()) return;

    const onSubmit = this.formOptions.onSubmit;

    if (!onSubmit) {
      // Nothing to run — emit the completion event immediately.
      this.trigger("submit", this);
      return;
    }

    this.submitting(true);

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const form = this;

    let result: void | Promise<any>;

    try {
      result = onSubmit({
        form: this,
        event,
        get values() {
          return form.values();
        },
        get formData() {
          return form.formData();
        },
      });
    } catch (error) {
      this.submitting(false);
      throw error;
    }

    if (result && typeof (result as any).then === "function") {
      // Async submit: defer the `submit` completion event (and clearing the
      // submitting state) until the promise settles, so `"submit"` fires once,
      // after the work is actually done.
      Promise.resolve(result).then(
        () => this.submitting(false),
        () => this.submitting(false)
      );
      return;
    }

    // Sync/void submit: completion is immediate.
    this.trigger("submit", this);
  }
}

// Segments that would let a dotted field name reach `Object.prototype` (or
// any other prototype) and pollute every plain object in the runtime.
// Writing through them is always rejected. Kept local/standalone (no
// cross-package dependency) — mirrors `@mongez/reinforcements`'s
// `isForbiddenKey` guard.
function isForbiddenKey(key: string): boolean {
  return key === "__proto__" || key === "constructor" || key === "prototype";
}

// Numeric segments above this are treated as plain object keys rather than
// array indices. Field names are attacker-controlled in schema/CMS-driven
// forms; without this cap a name like `items.4000000000.x` would create a
// sparse array with a `length` in the billions, blowing up memory/CPU the
// first time a consumer iterates or serializes the collected values.
const MAX_ARRAY_INDEX = 10000;

function isArrayIndexSegment(segment: string | undefined): boolean {
  if (!segment) return false;

  const index = Number(segment);

  return !isNaN(index) && index <= MAX_ARRAY_INDEX;
}

// create a function that receives an object
// each key is a dot notation syntax
// return an object with nested objects
// if the key is a dot notation syntax, then create a nested object
// if a segment of the key is a number, then create an array
// if the key is a number, then create an array
// i.e name.0.text => { name: [{ text: 'value' }] }
// name.firstName => { name: { firstName: 'value' } }
// name.addresses.0.city => { name: { addresses: [{ city: 'value' }] } }
export function createNestedObjectFromDotNotation(object: any) {
  const result: any = {};

  for (const key in object) {
    const value = object[key];

    if (key.includes(".")) {
      const nestedName = key.split(".");
      const nestedNameLength = nestedName.length;

      // Never write through/onto a prototype-pollution vector segment. Checked
      // up front so a blocked key doesn't leave a partial container (e.g. the
      // `a` in `a.__proto__.x`) behind on `result`.
      if (nestedName.some(isForbiddenKey)) continue;

      let nestedObject = result;

      for (let i = 0; i < nestedNameLength; i++) {
        const nestedNamePart = nestedName[i];
        const isLastSegment = i === nestedNameLength - 1;
        const nextSegment = nestedName[i + 1];

        if (isLastSegment) {
          // Always assign the leaf — even a falsy value (0, "", false). The old
          // truthiness guard treated falsy existing values as "absent" and
          // could overwrite them with a container.
          nestedObject[nestedNamePart] = value;
          break;
        }

        // Descending: ensure an object/array container exists. If a primitive
        // already sits here (a leaf/parent name collision, e.g. both `a` and
        // `a.b`), replace it with a container instead of crashing on the next
        // property write. Existing containers are preserved.
        const existing = nestedObject[nestedNamePart];

        if (typeof existing !== "object" || existing === null) {
          nestedObject[nestedNamePart] = isArrayIndexSegment(nextSegment)
            ? []
            : {};
        }

        nestedObject = nestedObject[nestedNamePart];
      }
    } else if (!isForbiddenKey(key)) {
      result[key] = value;
    }
  }

  return result;
}
