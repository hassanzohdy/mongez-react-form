import { trans } from "@mongez/localization";
import { InputRule } from "../types";

// Defense-in-depth caps: validation patterns/values may end up sourced from
// server/CMS-driven config, so an unbounded pattern or input is a ReDoS risk.
const MAX_PATTERN_LENGTH = 200;
const MAX_VALUE_LENGTH = 2000;

const regexCache = new Map<string, RegExp | null>();

function compilePattern(pattern: string | RegExp): RegExp | null {
  const isString = typeof pattern === "string";
  const source = isString ? pattern : pattern.source;
  const flags = isString ? "" : pattern.flags;
  const cacheKey = `${flags}::${source}`;

  if (regexCache.has(cacheKey)) {
    return regexCache.get(cacheKey) as RegExp | null;
  }

  let compiled: RegExp | null = null;

  if (source.length <= MAX_PATTERN_LENGTH) {
    try {
      compiled = isString ? new RegExp(pattern) : pattern;
    } catch {
      compiled = null;
    }
  }

  regexCache.set(cacheKey, compiled);

  return compiled;
}

export const patternRule: InputRule = {
  name: "pattern",
  preservedProps: ["pattern"],
  validate: ({ value, pattern, errorKeys }) => {
    if (!pattern) return;

    const regex = compilePattern(pattern);

    // An invalid or oversized pattern source is a config problem, not the
    // user's fault — fail safe by skipping validation rather than blocking
    // every submission.
    if (!regex) return;

    // A value longer than the cap is overwhelmingly more likely invalid than
    // valid — fail closed instead of truncating, which would let an anchored
    // pattern (e.g. `^[0-9a-f]+$`) pass on a valid prefix with an arbitrary tail.
    if (typeof value === "string" && value.length > MAX_VALUE_LENGTH) {
      return trans("validation.pattern", {
        input: errorKeys.name,
        pattern: errorKeys.pattern || "pattern",
      });
    }

    if (!regex.test(value)) {
      return trans("validation.pattern", {
        input: errorKeys.name,
        pattern: errorKeys.pattern || "pattern",
      });
    }
  },
};
