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
 * Remove the given form from being active form
 */
export function removeActiveForm(form: FormInterface): void {
  if (activeForm && form.id === activeForm.id) {
    activeForm = null;

    const index = activeFormsIds.indexOf(form.id);
    if (index > -1) {
      activeFormsIds.splice(index, 1);

      if (activeFormsIds.length > 0) {
        // get last active form and mark it as active form
        const lastActiveFormId = activeFormsIds[activeFormsIds.length - 1];

        const lastActiveForm = getForm(lastActiveFormId);

        if (lastActiveForm) {
          setActiveForm(lastActiveForm);
        }
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
