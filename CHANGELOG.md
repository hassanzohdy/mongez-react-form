# Changelog

All notable changes to `@mongez/react-form` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.4.8] — 2026-06-18

### Docs

- **SSR: pass a static `id` to every `<Form>`.** Documented that an omitted `id` makes `<Form>` generate a random `frm-<random>` id at construction (via `Math.random()`), which differs between the server render and the client hydration and triggers a React hydration mismatch. A stable, unique `id` per form makes the rendered `<form id="form-…">` attribute deterministic on both sides. Added to the getting-started skill, `llms.txt`, and `llms-full.txt`. Input ids are already SSR-safe (derived from `name` as `input-<name>`), so only the `<Form>` wrapper needs an explicit id.
- Refreshed the **getting-started skill** into the highlight-cards format used across the other `@mongez` package skills — feature highlights, a 30-second quick peek, and step-by-step setup.
- Trimmed the `TRIGGER` / `SKIP` auto-trigger lines from every skill's frontmatter `description`, leaving one concise description per skill.

## [3.4.7] — 2026-05-27

### Docs

- Rewrote `README.md` from a ~2800-line tutorial into a ~500-line dense reference: top-of-file pitch, a 30-second tour, one canonical pattern per hook/component, a table-driven rule reference, and recipe-driven sections for submit flows, multi-step forms, React Native, and the `BaseForm` extension path. The exhaustive API reference now lives in `llms-full.txt`, which the README links to.

### Tests

- Added a Vitest suite (`vitest.config.ts` with happy-dom and sibling-package source aliasing, plus `src/__tests__/setup.ts` registering the English validation translations). Coverage spans value collection and dot-notation nesting into objects/arrays, `ignoreEmptyValues`, form-level vs control-level `defaultValue` precedence, `HiddenInput`, id derivation, every built-in rule (including the composite `strongRule` per-criterion errors), submit-button state, the form-events lifecycle, `NativeForm`, and the active-forms registry.

### CI

- Added `.github/workflows/test.yml` — Node 18/20/22 on Ubuntu, Node 20 on Windows, plus a Node 20 job pinned to React 19 to surface concurrent-rendering regressions early.

### Changed

- Declared `@mongez/reinforcements` as an explicit `dependencies` entry (it was already imported by `BaseForm`/`useFormControl` and resolved transitively).
- Raised `peerDependencies.react` from `>=16.8.0` to `>=18.0.0` to match the tested matrix.
- Cleaned `keywords` — removed marketing-only entries (`material-io`, `semantic`, `formik`) and added `react-native`, `headless`.

### Fixed

- `integerRule` — the predicate now uses `||` instead of `&&`, so numeric-but-non-integer inputs like `"3.14"` are correctly rejected (previously they passed as valid integers).
- `maxRule` — replaced the falsy short-circuit (`!value`) with an explicit empty check, so a numeric `0` is validated instead of skipped.
- `useFormControl` `onInit` effect — no longer re-runs on every render: the latest props are read through a ref, and the `rules` dependency is a stable name-based key, so consumers passing fresh `rules={[...]}` literals don't retrigger subscriptions each commit.
- `reset()` — now clears `formControl.isDirty` before writing the value (via a new `dirty: false` change option), so the per-control listener sees the cleared flag and the aggregate `dirty(false)` event fires as expected.

## [3.4.6 and earlier] — Earlier releases

Per-release notes for 3.4.6 and earlier predate this changelog format. The full version history is available via the git tags and [GitHub releases](https://github.com/hassanzohdy/mongez-react-form/releases).
