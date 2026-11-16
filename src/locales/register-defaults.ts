import { extend, getKeywordsListOf } from "@mongez/localization";
import { enValidationTranslation } from "./index";

/**
 * Fill the default **English** validation messages, but only the
 * `validation.*` keys that are not already defined for `en`. An app's own
 * translations are never overwritten, whatever the import order is.
 */
export function registerDefaultValidationMessages() {
  const existing = ((getKeywordsListOf("en") as any)?.validation ||
    {}) as Record<string, unknown>;

  const missing: Record<string, string> = {};

  for (const key of Object.keys(enValidationTranslation)) {
    if (existing[key] === undefined) {
      missing[key] = (enValidationTranslation as Record<string, string>)[key];
    }
  }

  if (Object.keys(missing).length === 0) return;

  extend("en", { validation: missing });
}

/**
 * Register sensible default **English** validation messages on import, so a
 * brand-new user sees readable errors ("This input is required") with **zero
 * setup** instead of raw keys like `validation.required`.
 *
 * Only keys that are not defined yet are filled, so this never overwrites an
 * app's own `validation.*` messages, even when the app registers them before
 * this package is imported. A later `extend("en", { validation })` at app
 * entry still overrides these defaults as usual.
 */
registerDefaultValidationMessages();
