import { trans } from "@mongez/localization";
import { ReactNode } from "react";
import { type InputRule } from "../types";

/**
 * Configurable strong-password criteria.
 *
 * Pass as the value of the `strong` prop on a form control:
 *
 * - `<TextInput strong />`                  — apply all defaults
 * - `<TextInput strong={{ symbol: false }}` — selectively disable a criterion
 * - `<TextInput strong={{ minLength: 10 }}` — override a numeric criterion
 */
export type StrongPasswordCriteria = {
  /**
   * Minimum password length. Set to 0 (or falsy) to disable the length check.
   * @default 8
   */
  minLength?: number;
  /**
   * Require at least one uppercase letter (A-Z).
   * @default true
   */
  uppercase?: boolean;
  /**
   * Require at least one lowercase letter (a-z).
   * @default true
   */
  lowercase?: boolean;
  /**
   * Require at least one digit (0-9).
   * @default true
   */
  digit?: boolean;
  /**
   * Require at least one non-alphanumeric character.
   * @default true
   */
  symbol?: boolean;
};

const defaultCriteria: Required<StrongPasswordCriteria> = {
  minLength: 8,
  uppercase: true,
  lowercase: true,
  digit: true,
  symbol: true,
};

/**
 * Validates a strong password against five composable criteria:
 *
 *   - `strong.minLength` — minimum length (default 8)
 *   - `strong.uppercase` — at least one uppercase letter
 *   - `strong.lowercase` — at least one lowercase letter
 *   - `strong.digit`     — at least one digit
 *   - `strong.symbol`    — at least one non-alphanumeric character
 *
 * Each failing criterion is also written individually into
 * `formControl.errorsList` under the namespaced key (e.g. `strong.uppercase`)
 * so consumers can render per-criterion password-strength checklists.
 *
 * The rule's primary `error` (consumed by the hook into `errorsList.strong`) is
 * the first failing message — same convention as every other rule.
 *
 * Requires `type="password"`. Activated by passing the `strong` prop:
 *
 * ```tsx
 * <TextInput type="password" name="password" strong required minLength={8} />
 * <TextInput type="password" name="password" strong={{ symbol: false }} />
 * ```
 */
export const strongRule: InputRule = {
  name: "strong",
  preservedProps: ["strong"],
  requiresType: "password",
  validate: ({ value, strong, formControl, errorKeys }) => {
    if (!strong) return;

    const criteria: Required<StrongPasswordCriteria> =
      strong === true ? defaultCriteria : { ...defaultCriteria, ...strong };

    const stringValue = typeof value === "string" ? value : "";
    const failures: ReactNode[] = [];

    const fail = (key: string, message: ReactNode) => {
      formControl.errorsList[`strong.${key}`] = message;
      failures.push(message);
    };

    if (criteria.minLength && stringValue.length < criteria.minLength) {
      fail(
        "minLength",
        trans("validation.strongMinLength", {
          input: errorKeys.name,
          length: criteria.minLength,
        })
      );
    }

    if (criteria.uppercase && !/[A-Z]/.test(stringValue)) {
      fail(
        "uppercase",
        trans("validation.strongUppercase", { input: errorKeys.name })
      );
    }

    if (criteria.lowercase && !/[a-z]/.test(stringValue)) {
      fail(
        "lowercase",
        trans("validation.strongLowercase", { input: errorKeys.name })
      );
    }

    if (criteria.digit && !/\d/.test(stringValue)) {
      fail(
        "digit",
        trans("validation.strongDigit", { input: errorKeys.name })
      );
    }

    if (criteria.symbol && !/[^A-Za-z0-9]/.test(stringValue)) {
      fail(
        "symbol",
        trans("validation.strongSymbol", { input: errorKeys.name })
      );
    }

    if (failures.length > 0) {
      return failures[0];
    }
  },
};
