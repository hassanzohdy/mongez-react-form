import { extend } from "@mongez/localization";
import { enValidationTranslation } from "./index";

/**
 * Register sensible default **English** validation messages on import, so a
 * brand-new user sees readable errors ("This input is required") with **zero
 * setup** instead of raw keys like `validation.required`.
 *
 * This runs at package-import time, which is *before* a consumer's own
 * `extend("en", { validation: ... })` call at app entry — and `extend` merges —
 * so a consumer's custom messages still override these, and registering other
 * locales works exactly as before. To opt out of the English defaults, simply
 * `extend("en", { validation: yourMessages })` at app entry as usual.
 */
extend("en", { validation: enValidationTranslation });
