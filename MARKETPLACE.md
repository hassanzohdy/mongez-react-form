# Distributing the Claude Code plugin

This repo is both an **npm package** (`@mongez/react-form`, distributed via `npm publish`) **and** a **Claude Code plugin** (the `.claude-plugin/` directory plus `skills/`). The two distribution channels are independent.

This document covers the plugin / marketplace side. The marketplace info is verified against [code.claude.com/docs/en/plugin-marketplaces](https://code.claude.com/docs/en/plugin-marketplaces).

## What ships in the plugin

```
.claude-plugin/
  plugin.json              # plugin manifest
  marketplace.json         # marketplace catalog (single plugin: this repo)
skills/
  getting-started/SKILL.md
  create-form-control/SKILL.md
  submit-button/SKILL.md
  validation-rules/SKILL.md
  react-native-usage/SKILL.md
  form-events/SKILL.md
```

Skills are also bundled inside the npm tarball so consumers without Claude Code can read them directly from `node_modules/@mongez/react-form/skills/` and copy them into a project-local `.claude/skills/` folder manually.

## How users install (the short version)

The marketplace is hosted **in this same GitHub repo**. End-users install with:

```text
/plugin marketplace add hassanzohdy/mongez-react-form
/plugin install mongez-react-form@mongez-react-form
```

Skills are then namespaced as `mongez-react-form:<skill-name>`.

To update later:

```text
/plugin marketplace update mongez-react-form
```

## Self-hosted marketplace (Path A — primary)

Already wired up. The repo contains:

- `.claude-plugin/plugin.json` — the plugin manifest.
- `.claude-plugin/marketplace.json` — the marketplace catalog with a single plugin entry pointing at `"./"` (the repo root).
- `skills/` — six `SKILL.md` files discovered automatically by directory walk.

To validate before pushing:

```bash
claude plugin validate
```

To release a new version: bump `version` in **both** `.claude-plugin/plugin.json` and `package.json`, commit, tag, push. Users running `/plugin marketplace update mongez-react-form` will pick up the new commit.

### Important schema gotchas (verified against the official docs)

1. **`marketplace.json` MUST live at `.claude-plugin/marketplace.json`** — not at the repo root. (Plugin source paths resolve relative to the marketplace root, which is the directory containing `.claude-plugin/`.)
2. **`owner` is required** with at least a `name` field; `email` is optional.
3. **`source: "./"` is valid** — points to the repo root. Relative paths only resolve when users add the marketplace via Git (GitHub / GitLab / git URL), not via a direct URL to `marketplace.json`.
4. **Marketplace name must avoid reserved names** like `claude-plugins-official`, `agent-skills`, etc. `mongez-react-form` is not reserved.
5. **Version resolution:** If `version` is set in `plugin.json` (it is, currently pinned to the npm version), users only get updates when that field bumps. Omit `version` to auto-version per git commit SHA instead. **Recommendation:** keep `version` in `plugin.json` aligned with `package.json` and bump deliberately.

## Official community marketplace (Path B — optional, recommended for reach)

Submit `@mongez/react-form` to the Anthropic-curated `claude-plugins-community` marketplace so it shows up in `/plugin marketplace add anthropics/claude-plugins-community`'s catalog.

1. **Validate locally:** `claude plugin validate`.
2. **Submit via the form:** <https://clau.de/plugin-directory-submission>. Provide:
   - GitHub repo URL: `https://github.com/hassanzohdy/mongez-react-form`
   - Plugin name (matches `plugin.json`): `mongez-react-form`
   - Short description (already in `plugin.json`)
3. **Wait for manual review.** Anthropic's team reviews submissions and pins a commit SHA into the catalog. The `anthropics/claude-plugins-community` GitHub repo is **read-only** — no PRs accepted.
4. **Updates auto-sync.** Push to `main`; the community catalog's nightly CI re-pins the latest SHA.

Path A (this repo's self-hosted marketplace) and Path B (official community) can coexist.

## Manual copy (Path C — for non-Claude-Code agents)

Useful for Cursor, Cline, Codex, or any other AI-tool stack that respects on-disk skill files but doesn't speak the marketplace protocol:

```bash
npm install @mongez/react-form
mkdir -p .claude/skills
cp -r node_modules/@mongez/react-form/skills/* .claude/skills/
```

## Schema reference (mini, verified against docs)

### `plugin.json` (`.claude-plugin/plugin.json`)

```jsonc
{
  "name": "mongez-react-form",          // required — kebab-case
  "description": "…",                    // shown in plugin manager
  "version": "3.1.5",                    // optional — omit for SHA-based versioning
  "author": { "name": "…", "url": "…" }, // recommended
  "homepage": "…",
  "repository": "…",
  "license": "MIT",
  "keywords": [ … ]
}
```

### `marketplace.json` (`.claude-plugin/marketplace.json`)

```jsonc
{
  "name": "mongez-react-form",                    // required — public identifier
  "description": "…",                              // optional
  "owner": {                                       // required
    "name": "Hasan Zohdy",                         //   required
    "email": "…"                                   //   optional
  },
  "plugins": [                                     // required, ≥1 entry
    {
      "name": "mongez-react-form",                 //   required
      "source": "./",                              //   required — see source types below
      "description": "…",
      "version": "…",
      "author": { "name": "…" },
      "homepage": "…",
      "repository": "…",
      "license": "MIT",
      "keywords": [ … ],
      "category": "…",
      "tags": [ … ]
    }
  ]
}
```

### Plugin source types

| Type | Shape | Use for |
|---|---|---|
| **Relative path** | `"source": "./path/to/plugin"` | Plugin lives in the same repo as `marketplace.json`. **What we're using.** |
| **GitHub** | `"source": { "source": "github", "repo": "owner/repo", "ref": "…", "sha": "…" }` | Plugin in a different GitHub repo |
| **Git URL** | `"source": { "source": "url", "url": "https://…", "ref": "…", "sha": "…" }` | GitLab, Bitbucket, etc. |
| **Git subdirectory** | `"source": { "source": "git-subdir", "url": "…", "path": "tools/x", "ref": "…", "sha": "…" }` | Plugin in a subdirectory of a monorepo |
| **npm** | `"source": { "source": "npm", "package": "@scope/pkg", "version": "…", "registry": "…" }` | Plugin published as an npm package |

### `SKILL.md` frontmatter

```yaml
---
description: When Claude should use this skill (decision-relevant, specific to triggering conditions).
disable-model-invocation: false   # optional — if true, skill is only invoked when user types the slash command, never auto-selected by the model
---
```

## Authoring a new skill

1. Create `skills/<new-skill-name>/SKILL.md`.
2. Add YAML frontmatter with a clear `description`. Be specific about triggering conditions, not the topic.
3. Skills are discovered by directory walk — no edit to `plugin.json` or `marketplace.json` needed.
4. Validate: `claude plugin validate`.
5. Commit. Users get the new skill on their next `/plugin marketplace update mongez-react-form`.

## Releasing

1. Bump `version` in `.claude-plugin/plugin.json` AND `package.json` (keep them in sync).
2. `git commit -am "release: vX.Y.Z" && git tag vX.Y.Z && git push --tags`.
3. `npm publish` (for the npm side).
4. Self-hosted marketplace users get the update on next `/plugin marketplace update`.
5. Community marketplace (if accepted) auto-resyncs nightly.

## References

- Plugin marketplace creation: <https://code.claude.com/docs/en/plugin-marketplaces>
- Discovering / installing plugins: <https://code.claude.com/docs/en/discover-plugins>
- Plugin manifest schema: <https://code.claude.com/docs/en/plugins-reference>
- Plugin creation guide: <https://code.claude.com/docs/en/plugins>
- Community marketplace submission: <https://clau.de/plugin-directory-submission>
