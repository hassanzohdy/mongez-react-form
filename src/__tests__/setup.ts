// Vitest setup for the @mongez/react-form package.
//
// - Wire validation translations once so error messages render as English
//   strings rather than raw `validation.required` keys.
// - Run `cleanup()` from @testing-library/react after every test. Vitest
//   does NOT do this for us — when globals are disabled (see
//   vitest.config.ts), the RTL afterEach hook never registers. Without
//   it, each test leaks its rendered tree into the next.
// - happy-dom is configured via vitest.config.ts and provides everything
//   the React Testing Library needs.
import { extend, setCurrentLocaleCode } from "@mongez/localization";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { enValidationTranslation } from "../locales";

extend("en", { validation: enValidationTranslation });
setCurrentLocaleCode("en");

afterEach(() => {
  cleanup();
});

export {};
