import { ActiveForms, FormInterface } from "./types";

// Current active form
let activeForm: FormInterface | null = null;

// Active forms ids
const activeFormsIds: string[] = [];

/**
 * List of all active forms
 */
const activeForms: ActiveForms = {};

/**
 * Get the current active form
 */
export function getActiveForm(): FormInterface | null {
  return activeForm;
}

/**
 * Set the current active form
 */
export function setActiveForm(form: FormInterface): void {
  activeForm = form;
  if (!activeFormsIds.includes(form.id)) {
    activeFormsIds.push(form.id);
  }
}

/**
 * Remove the given form from being active form.
 *
 * The id is purged from `activeFormsIds` **unconditionally** — not only when the
 * form is the current active one — otherwise a form unmounted while a different
 * form is active would leave a dead id behind. Over a long-lived app that
 * mounts/unmounts forms out of LIFO order (modals, routes, wizards) those dead
 * ids would accumulate and the "restore last active form" logic would resolve
 * stale ids and fail to restore a still-live form.
 */
export function removeActiveForm(form: FormInterface): void {
  const index = activeFormsIds.indexOf(form.id);
  if (index > -1) {
    activeFormsIds.splice(index, 1);
  }

  // Only re-pick an active form when the one being removed WAS active.
  if (activeForm && form.id === activeForm.id) {
    activeForm = null;

    // Walk from the most recent, skipping any id whose form is already gone.
    for (let i = activeFormsIds.length - 1; i >= 0; i--) {
      const candidate = getForm(activeFormsIds[i]);

      if (candidate) {
        setActiveForm(candidate);
        break;
      }
    }
  }
}

/**
 * Get form by the given id
 */
export function getForm(formId: string): FormInterface | null {
  return activeForms[formId] || null;
}

/**
 * Add the given form to the active forms
 */
export function addToFormsList(form: FormInterface): void {
  activeForms[form.id] = form;
}

/**
 * Remove the given form from the active forms
 */
export function removeFromFormsList(form: FormInterface): void {
  delete activeForms[form.id];
}
