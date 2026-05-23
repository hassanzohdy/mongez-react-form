# Distributing the Claude Code plugin

This repo is both an **npm package** (`@mongez/react-form`, distributed via `npm publish`) **and** a **Claude Code plugin** (the `.claude-plugin/` directory plus `skills/`). The two distribution channels are independent.

This document covers the plugin side.

## What ships in the plugin

```
.claude-plugin/
  plugin.json              # plugin manifest (name, version, author)
skills/
  getting-started/
    SKILL.md
  create-form-control/
    SKILL.md
  submit-button/
    SKILL.md
  validation-rules/
    SKILL.md
  react-native-usage/
    SKILL.md
  form-events/
    SKILL.md
```

Skills are also bundled inside the npm tarball under `skills/` so consumers without Claude Code can read them directly from `node_modules/@mongez/react-form/skills/` if they want to copy them into a project-local `.claude/skills/` folder manually.

## Distribution paths

There are three independent ways consumers can install the plugin. Pick one (or offer all).

### Path A — Submit to the official `claude-plugins-community` marketplace (recommended for reach)

1. **Validate locally first:**

   ```bash
   claude plugin validate
   ```

   Fix any reported issues. Common ones: malformed `plugin.json`, missing `description` frontmatter in a `SKILL.md`, invalid YAML.

2. **Submit via the form:**

   Go to <https://clau.de/plugin-directory-submission> (in-Claude-Code form). Provide:
   - GitHub repo URL: `https://github.com/hassanzohdy/mongez-react-form`
   - Plugin name (from `plugin.json`): `mongez-react-form`
   - Short description (already in `plugin.json`)

3. **Wait for review.** Anthropic's team reviews submissions manually before pinning a commit SHA into the community catalog. The `anthropics/claude-plugins-community` repo itself is **read-only** — no PRs accepted.

4. **Once accepted:** consumers install with

   ```
   /plugin marketplace add anthropics/claude-plugins-community
   /plugin install mongez-react-form@claude-plugins-community
   ```

5. **Updates:** push commits to `main` on GitHub. The community catalog's nightly CI auto-bumps the pinned SHA.

### Path B — Self-hosted marketplace (recommended for control / immediate availability)

Useful while the community submission is in review, or if you want to publish without going through Anthropic's review pipeline.

1. **Create a `marketplace.json`** in this repo (or in a sibling repo) describing the plugin:

   ```json
   {
     "name": "mongez-react-form",
     "plugins": [
       {
         "name": "react-form",
         "source": "github:hassanzohdy/mongez-react-form",
         "description": "Skills for @mongez/react-form (Web + React Native form library)"
       }
     ]
   }
   ```

2. **Push it to a public GitHub repo or to a public URL.**

3. **Consumers install with:**

   ```
   /plugin marketplace add hassanzohdy/mongez-react-form
   /plugin install react-form@mongez-react-form
   ```

   Or (HTTP-hosted variant):

   ```
   /plugin marketplace add https://your-cdn.example.com/marketplace.json
   ```

Path B and Path A can coexist — the same plugin can be in the community marketplace AND a self-hosted one.

### Path C — Manual copy from npm (no Claude Code marketplace involvement)

Works for any AI tool, not just Claude Code. Consumers do:

```bash
npm install @mongez/react-form
mkdir -p .claude/skills
cp -r node_modules/@mongez/react-form/skills/* .claude/skills/
```

After that, the skills are project-local and load on demand.

## Releasing a new plugin version

1. Bump `version` in `.claude-plugin/plugin.json` (semver, separate from the npm `package.json` version if you prefer — they can drift).
2. Bump `version` in `package.json` (for the npm side).
3. Commit and tag:
   ```bash
   git commit -am "release: vX.Y.Z"
   git tag vX.Y.Z
   git push --tags
   ```
4. Publish to npm: `npm publish`.
5. The community marketplace (if accepted) picks up the new commit automatically on its next sync. Self-hosted marketplace consumers update with `/plugin update react-form@mongez-react-form`.

## Authoring a new skill

1. Create `skills/<new-skill-name>/SKILL.md`.
2. Add YAML frontmatter:

   ```yaml
   ---
   description: When Claude should use this skill — one or two sentences, decision-relevant.
   ---
   ```

   The `description` is what Claude Code reads to decide whether to load the skill. Be specific about the triggering conditions, not just the topic.

3. Write the skill body as instructions to a colleague who just walked into the room — assume no context.

4. Validate: `claude plugin validate`.

5. Commit. The plugin auto-picks-up new skills on the next install / update — no manifest edit needed (skills are discovered by directory walk, not enumerated in `plugin.json`).

## References

- Plugin marketplace overview: <https://code.claude.com/docs/en/discover-plugins>
- Creating a plugin marketplace: <https://code.claude.com/docs/en/plugin-marketplaces>
- Creating plugins: <https://code.claude.com/docs/en/plugins>
- Community catalog (read-only mirror): <https://github.com/anthropics/claude-plugins-community>
- Community submission form: <https://clau.de/plugin-directory-submission>
