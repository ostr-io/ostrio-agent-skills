# ostrio-prerendering

Agent Skill for integrating, operating, debugging, purging, and maintaining
[ostr.io pre-rendering](https://ostr.io/info/prerendering) — an **HTML CDN +
pre-rendering SEO middleware** that returns fully-rendered HTML to crawlers,
social-preview fetchers, and AI agents (Googlebot, Bingbot,
`facebookexternalhit`, Slackbot, GPTBot, ClaudeBot, PerplexityBot, Gemini,
Grok, …) while humans still get the SPA/SSR bundle.

Compatible with [Cursor](https://cursor.com), [Claude Code](https://www.anthropic.com/claude-code)
and claude.ai, [Codex CLI](https://openai.com/chatgpt/use-cases/codex-cli/),
[Google Antigravity](https://antigravity.google), and any other agent that
reads the Agent Skills `SKILL.md` format.

## What this skill covers

- **Stacks:** Next.js, Node/Express/Koa/Fastify/NestJS, Meteor.js, Nginx,
  Apache, Caddy, Cloudflare Workers, Netlify, Vercel, Supabase Edge Functions,
  Shopify, Webflow, Framer, Wix, Ghost, WordPress, and any SPA/PWA/SSR/static site.
- **Workflows:** integration (10 tiers), config reference, rendering-endpoint
  selection, cache purge, validation, troubleshooting, maintenance.
- **Outputs:** patch-ready middleware/config templates, `curl` smoke tests,
  14-scenario validation matrix, symptom→fix troubleshooting tables.

Start here: [`SKILL.md`](SKILL.md).

## Layout

```
ostrio-prerendering/
├── SKILL.md                                 # main skill body (entry point)
├── README.md                                # this file
├── checklists.md                            # pre-integration / go-live / quarterly
├── troubleshooting.md                       # 25+ symptom → fix rows
├── validation.md                            # 14-scenario test matrix
├── templates/
│   ├── README.md                            # template index
│   ├── nextjs-middleware.ts                 # self-managed Next.js middleware
│   ├── nextjs-seo-middleware.ts             # seo-middleware-nextjs usage
│   ├── vercel-middleware.js                 # Vercel Routing Middleware
│   ├── cloudflare.worker.js                 # Cloudflare Worker (ES Module)
│   ├── supabase-shared.ts                   # Supabase Edge Functions helpers
│   ├── supabase-deno.ts                     # Supabase plain-Deno function
│   ├── nginx-snippets.conf                  # Nginx map + location blocks
│   ├── apache-snippet.htaccess              # Apache .htaccess
│   ├── caddy-snippet.caddyfile              # Caddyfile snippet
│   ├── node-express.js                      # Express / Connect / NestJS
│   ├── node-http.js                         # vanilla node:http server
│   ├── meteor-server.js                     # Meteor ostrio:spiderable-middleware
│   ├── netlify-support-request.md           # Netlify Support ticket template
│   ├── frontend-detect-prerendering.js      # IS_PRERENDERING / IS_RENDERED
│   ├── frontend-detect-prerendering.meteor.js  # Meteor ReactiveVar variant
│   └── frontend-genuine-status-code.html    # <meta> / <!-- comment -->
└── examples/
    ├── README.md
    ├── curl-cookbook.md                     # smoke tests, per-UA, cache headers
    ├── route-inclusion-exclusion.md         # include/exclude patterns per stack
    └── purge-workflow.md                    # full vs per-URL purge, sitemap warming
```

---

## Install

Recommended install path uses the open [`skills`](https://www.npmjs.com/package/skills)
CLI (by [vercel-labs/skills](https://github.com/vercel-labs/skills)) — it
auto-detects installed agents, copies or symlinks the skill to the right
directory, and supports 45+ agents including **Cursor**, **Claude Code**,
**Codex**, **Antigravity**, **OpenCode**, **GitHub Copilot**, **Gemini CLI**,
**Warp**, **Windsurf**, **Goose**, **Cline**, and more.

### Install via `npx skills` (recommended)

```shell
# Project-scoped (default) — installs into the detected agent's project skills dir
npx skills add ostr-io/ostrio-agent-skills --skill ostrio-prerendering

# Global — available across all projects
npx skills add ostr-io/ostrio-agent-skills --skill ostrio-prerendering -g

# List available skills first, don't install
npx skills add ostr-io/ostrio-agent-skills --list
```

Target specific agents with `-a` (repeat for multiple):

```shell
# Cursor
npx skills add ostr-io/ostrio-agent-skills -s ostrio-prerendering -a cursor

# Claude Code
npx skills add ostr-io/ostrio-agent-skills -s ostrio-prerendering -a claude-code

# Codex
npx skills add ostr-io/ostrio-agent-skills -s ostrio-prerendering -a codex

# Antigravity
npx skills add ostr-io/ostrio-agent-skills -s ostrio-prerendering -a antigravity

# Multiple agents at once
npx skills add ostr-io/ostrio-agent-skills -s ostrio-prerendering \
  -a cursor -a claude-code -a codex -a opencode

# Install to all detected agents
npx skills add ostr-io/ostrio-agent-skills -s ostrio-prerendering --agent '*'
```

Non-interactive (CI/CD):

```shell
# Install globally into Claude Code + Cursor + Codex without prompts
npx skills add ostr-io/ostrio-agent-skills \
  -s ostrio-prerendering -a claude-code -a cursor -a codex -g -y

# Copy files instead of symlinking (use when symlinks aren't supported)
npx skills add ostr-io/ostrio-agent-skills -s ostrio-prerendering --copy -y
```

Verify install:

```shell
npx skills list                      # lists all installed skills
npx skills ls -a cursor              # filter by agent
```

### Default install paths per agent

The `skills` CLI writes to these locations (authoritative list: [vercel-labs/skills](https://github.com/vercel-labs/skills#available-agents)):

| Agent | `--agent` | Project path | Global path (`-g`) |
| --- | --- | --- | --- |
| Cursor | `cursor` | `.agents/skills/` | `~/.cursor/skills/` |
| Claude Code | `claude-code` | `.claude/skills/` | `~/.claude/skills/` |
| Codex | `codex` | `.agents/skills/` | `~/.codex/skills/` |
| Antigravity | `antigravity` | `.agents/skills/` | `~/.gemini/antigravity/skills/` |
| OpenCode | `opencode` | `.agents/skills/` | `~/.config/opencode/skills/` |
| Gemini CLI | `gemini-cli` | `.agents/skills/` | `~/.gemini/skills/` |
| GitHub Copilot | `github-copilot` | `.agents/skills/` | `~/.copilot/skills/` |
| Warp | `warp` | `.agents/skills/` | `~/.agents/skills/` |
| Windsurf | `windsurf` | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |
| Goose | `goose` | `.goose/skills/` | `~/.config/goose/skills/` |

### Manual install (fallback — no Node.js required)

Use when `npx` is unavailable (air-gapped envs, restricted CI, no Node runtime).

#### Tarball — no `git` required

```shell
DEST=~/.cursor/skills   # change per target agent's skills directory
mkdir -p "$DEST"
curl -fsSL https://github.com/ostr-io/ostrio-agent-skills/archive/refs/heads/main.tar.gz \
  | tar -xz -C "$DEST" --strip-components=2 \
    ostrio-agent-skills-main/skills/ostrio-prerendering
```

Result: `"$DEST"/ostrio-prerendering/SKILL.md` and all its `templates/` /
`examples/` — nothing else from the repo.

#### Git sparse-checkout — if you want `git pull` updates

```shell
DEST=~/.cursor/skills
mkdir -p "$DEST"
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/ostr-io/ostrio-agent-skills \
  "$DEST/.ostrio-agent-skills"
git -C "$DEST/.ostrio-agent-skills" sparse-checkout set skills/ostrio-prerendering
ln -sfn "$DEST/.ostrio-agent-skills/skills/ostrio-prerendering" \
        "$DEST/ostrio-prerendering"
```

Update later with `git -C "$DEST/.ostrio-agent-skills" pull`.

### Agent-specific notes

- **Cursor.** Skill ships with `disable-model-invocation: true` in its
  frontmatter — invoke explicitly with `@ostrio-prerendering` or via the
  skills menu instead of relying on automatic model invocation.
- **Claude Code / claude.ai.** Reference the skill by name in chat. On
  claude.ai, upload the `ostrio-prerendering/` directory as a Project /
  Capability per Anthropic's current Skill publishing flow.
- **Codex CLI.** Invoke: `ostrio-prerendering setup on my Nginx server`.
- **Google Antigravity.** `skills` CLI handles the install path for you.
  Manual install location depends on the current Antigravity release — check
  its docs. The `ostrio-prerendering/` directory is portable as-is.
- **Kiro CLI.** After install, add the skill to your custom agent's `resources` in `.kiro/agents/<agent>.json`:

  ```json
  { "resources": ["skill://.kiro/skills/**/SKILL.md"] }
  ```
- **Any other agent** that reads YAML-frontmatter `SKILL.md`. Frontmatter
  keys (`name`, `description`, optional `disable-model-invocation`) follow
  the shared [Agent Skills specification](https://agentskills.io). Unknown
  keys are ignored by non-Claude/non-Cursor agents.

---

## Invoke

After installation, trigger the skill from your agent chat:

- **Cursor:** `@ostrio-prerendering help me set up ostr.io on this Next.js app`.
- **Claude Code:** reference the skill by name or quote it (e.g. "use the `ostrio-prerendering` skill").
- **Codex CLI:** `ostrio-prerendering setup on my Nginx server`.
- **Indirect:** any phrase that matches the skill's `description` triggers it if the agent has model-invocation enabled; the `disable-model-invocation: true` frontmatter keeps agents from auto-triggering it so it runs only when explicitly asked.

Example prompts:

- "Set up ostr.io pre-rendering on my Vercel-hosted Next.js app."
- "Debug — Googlebot sees blank HTML on `example.com/articles/slug`."
- "Purge cache for 3 updated product pages on Shopify + Cloudflare."
- "Audit our existing Nginx pre-rendering config."

---

## Update

**`skills` CLI installs** (recommended):

```shell
# Update all installed skills
npx skills update

# Update just this skill
npx skills update ostrio-prerendering

# Update only global or only project-scoped copies
npx skills update ostrio-prerendering -g
npx skills update ostrio-prerendering -p

# Non-interactive (auto-detects scope)
npx skills update ostrio-prerendering -y
```

**Tarball install** — re-run the same `curl | tar` one-liner; it overwrites
the existing `ostrio-prerendering/` in place.

**Sparse-checkout install:**

```shell
git -C "$DEST/.ostrio-agent-skills" pull
```

The skill mirrors canonical ostr.io regexes byte-for-byte — when ostr.io
upstream updates its bot / static-extension lists, this repository tracks
those updates.

## Remove

```shell
# Remove from all agents
npx skills remove ostrio-prerendering

# Remove from specific agents only
npx skills remove ostrio-prerendering -a cursor

# Remove from global scope
npx skills remove ostrio-prerendering -g
```

---

## Publishing & distribution

> For maintainers of this skill. Agent-skill distribution is an evolving
> space — prefer canonical stores once they accept third-party skills.

### 1. GitHub (primary distribution — immediate)

The repository itself is the primary distribution channel. Any agent can
`git clone` it.

- Push the repo under `veliovgroup/ostrio-agent-skills` (or the target org).
- Tag each skill release: `git tag ostrio-prerendering-v1.0.0 && git push --tags`.
- In the GitHub release notes, link:
  - Skill path: `/skills/ostrio-prerendering/SKILL.md`
  - Install commands per agent (copy from this README).
  - Change summary (versions of `spiderable-middleware`, `seo-middleware-nextjs`, canonical regex sources this release tracks).

### 2. Anthropic Skills directory (Claude)

Anthropic publishes official Skills examples at
<https://github.com/anthropics/skills>. When they accept third-party skills:

- Submit a PR mirroring the `ostrio-prerendering/` directory.
- Keep this repository as the canonical source; the Anthropic repo is a mirror/link.

Until an official directory is open, promote via:

- Anthropic Discord / forums.
- Claude docs (Anthropic is actively soliciting skill examples).

### 3. Cursor directory

Cursor maintains a curated set of built-in skills at
`~/.cursor/skills-cursor/` and publishes examples in its docs. To get listed:

- Open a feature request / skill submission at <https://github.com/cursor-ai/cursor>
  referencing this repository.
- Community can also share via <https://docs.cursor.com> "Skills" page submissions when available.

### 4. Codex skills (OpenAI)

Codex CLI supports skills in `$CODEX_HOME/skills/`. OpenAI is building out
first-party distribution — monitor <https://github.com/openai/codex> for a
skills marketplace or curated list, and submit this skill there.

### 5. `skills` CLI ecosystem (primary distribution path)

The open [`skills`](https://www.npmjs.com/package/skills) CLI pulls skills
directly from this repo via GitHub shorthand — no npm publish required. End
users install with:

```shell
npx skills add ostr-io/ostrio-agent-skills --skill ostrio-prerendering
```

Keep this repository public, preserve the `skills/<name>/SKILL.md` layout,
and ensure frontmatter stays spec-compliant (`name` + `description` required)
so the CLI keeps resolving the skill.

Optional registry submission: the [skills.sh](https://skills.sh) directory
indexes skills so they appear in `npx skills find <keyword>` search. Submit
once stable — the repo URL alone is sufficient.

### 6. Keep the skill in sync with upstream

- Re-copy the canonical bot UA regex whenever new AI agents emerge
  (<https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shared/crawler-ua-regex.md>).
- Re-copy the canonical static-extensions regex when ostr.io updates it
  (<https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shared/static-extensions-regex.md>).
- Bump `seo-middleware-nextjs` / `spiderable-middleware` version notes in
  `SKILL.md` and templates if relevant APIs change.

---

## Support

- ostr.io: <https://ostr.io/support>
- Issue tracker: <https://github.com/ostr-io/ostrio-agent-skills/issues>

## License

BSD-3-Clause — see [`../../LICENSE`](../../LICENSE).
