# ostrio-agent-skills

Open-source [Agent Skills](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
for integrating, operating, and debugging [`ostr.io`](https://ostr.io) services.

Compatible with [Cursor](https://cursor.com), [Claude Code](https://www.anthropic.com/claude-code)
and claude.ai, [Codex CLI](https://openai.com/chatgpt/use-cases/codex-cli/),
[Google Antigravity](https://antigravity.google), and any other agent that
reads the Agent Skills `SKILL.md` format.

## Skills

| Skill | Description |
| --- | --- |
| [`ostrio-prerendering`](skills/ostrio-prerendering/) | Integrate, operate, debug, purge, and maintain ostr.io pre-rendering (HTML CDN + crawler / social-preview / AI-agent pre-rendering) on Next.js, Node, Meteor, Nginx, Apache, Caddy, Cloudflare Workers, Netlify, Vercel, Supabase Edge, Shopify, WordPress, and any SPA/PWA/SSR/static site. |

> More `ostr.io` skills will be added here over time.

---

## Install

Each skill is a self-contained directory. Copy the directory into the
agent-specific `skills/` location below, or symlink it.

Public clone URL (use in any agent that understands "install from GitHub"):

```
https://github.com/veliovgroup/ostrio-agent-skills
```

### Cursor

Cursor reads skills from two locations:

- **Project-level** (shared with anyone using the repo): `.cursor/skills/<name>/SKILL.md`
- **Personal / global** (your user): `~/.cursor/skills/<name>/SKILL.md`

Install `ostrio-prerendering` personally:

```shell
git clone https://github.com/veliovgroup/ostrio-agent-skills /tmp/ostrio-agent-skills
mkdir -p ~/.cursor/skills
cp -r /tmp/ostrio-agent-skills/skills/ostrio-prerendering ~/.cursor/skills/
```

Or install into a specific project:

```shell
git clone https://github.com/veliovgroup/ostrio-agent-skills /tmp/ostrio-agent-skills
mkdir -p .cursor/skills
cp -r /tmp/ostrio-agent-skills/skills/ostrio-prerendering .cursor/skills/
```

The skill ships with `disable-model-invocation: true` so it behaves like an
explicit slash-skill — invoke from chat with `@ostrio-prerendering` or by
selecting it from the skills menu.

### Claude Code / claude.ai

Claude reads skills from `~/.claude/skills/<name>/SKILL.md` (personal) or
`.claude/skills/<name>/SKILL.md` (project).

```shell
git clone https://github.com/veliovgroup/ostrio-agent-skills /tmp/ostrio-agent-skills
mkdir -p ~/.claude/skills
cp -r /tmp/ostrio-agent-skills/skills/ostrio-prerendering ~/.claude/skills/
```

Invoke:

- In Claude Code: mention the skill by name, or reference the file directly.
- On claude.ai: upload the skill's directory as a Project / Capability per Anthropic's current Skill publishing flow.

### Codex CLI

Codex reads skills from `$CODEX_HOME/skills/` (default `~/.codex/skills/`).

```shell
git clone https://github.com/veliovgroup/ostrio-agent-skills /tmp/ostrio-agent-skills
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -r /tmp/ostrio-agent-skills/skills/ostrio-prerendering "${CODEX_HOME:-$HOME/.codex}/skills/"
```

### Google Antigravity

Antigravity reads the `SKILL.md` format. Install location depends on the
current Antigravity release — check its documentation. The skill directory is
portable; copying `skills/ostrio-prerendering/` into Antigravity's skills
location works without modification.

### Any other agent

If your agent reads YAML-frontmatter `SKILL.md` files, drop the skill directory
into its recognized skills location. The frontmatter (`name`, `description`,
optional `disable-model-invocation`) is standard.

### One-line install directly from your agent

When a user asks their agent to install this skill, the agent can run:

```shell
git clone https://github.com/veliovgroup/ostrio-agent-skills "${TMPDIR:-/tmp}/ostrio-agent-skills" \
  && cp -r "${TMPDIR:-/tmp}/ostrio-agent-skills/skills/ostrio-prerendering" "$DEST_SKILLS_DIR/"
```

— where `$DEST_SKILLS_DIR` is one of the paths above.

---

## Invoke

After installation, trigger the skill from your agent chat:

- Cursor: `@ostrio-prerendering help me set up ostr.io on this Next.js app`.
- Claude Code: reference the skill by name or quote it (e.g. "use the `ostrio-prerendering` skill").
- Codex CLI: `ostrio-prerendering setup on my Nginx server`.
- Or invoke indirectly: any phrase that matches the skill's `description` triggers it if the agent has model-invocation enabled; the `disable-model-invocation: true` frontmatter on this skill keeps agents from auto-triggering it so it runs only when explicitly asked.

---

## Update

```shell
cd /tmp/ostrio-agent-skills && git pull
# Re-copy the updated skill directory into your agent's skills location.
```

The skill mirrors canonical ostr.io regexes byte-for-byte — when ostr.io
upstream updates its bot / static-extension lists, this repository tracks
those updates.

---

## Layout

```
.
├── AGENTS.md                                # agent-agnostic repo-level guidance
├── CLAUDE.md                                # Claude Code / claude.ai pointer
├── LICENSE                                  # BSD-3-Clause
├── README.md                                # this file
└── skills/
    └── ostrio-prerendering/
        ├── SKILL.md                         # main skill body (entry point)
        ├── checklists.md                    # pre-integration / go-live / quarterly
        ├── troubleshooting.md               # 60+ symptom → fix rows
        ├── validation.md                    # 14-scenario test matrix
        ├── templates/
        │   ├── README.md                    # template index
        │   ├── nextjs-middleware.ts         # self-managed Next.js middleware
        │   ├── nextjs-seo-middleware.ts     # seo-middleware-nextjs usage
        │   ├── vercel-middleware.js         # Vercel Routing Middleware
        │   ├── cloudflare.worker.js         # Cloudflare Worker (ES Module)
        │   ├── supabase-shared.ts           # Supabase Edge Functions helpers
        │   ├── supabase-deno.ts             # Supabase plain-Deno function
        │   ├── nginx-snippets.conf          # Nginx map + location blocks
        │   ├── apache-snippet.htaccess      # Apache .htaccess
        │   ├── caddy-snippet.caddyfile      # Caddyfile snippet
        │   ├── node-express.js              # Express / Connect / NestJS
        │   ├── node-http.js                 # vanilla node:http server
        │   ├── meteor-server.js             # Meteor ostrio:spiderable-middleware
        │   ├── netlify-support-request.md   # Netlify Support ticket template
        │   ├── frontend-detect-prerendering.js        # IS_PRERENDERING / IS_RENDERED
        │   ├── frontend-detect-prerendering.meteor.js # Meteor ReactiveVar variant
        │   └── frontend-genuine-status-code.html      # <meta> / <!-- comment -->
        └── examples/
            ├── README.md
            ├── curl-cookbook.md             # smoke tests, per-UA, cache headers
            ├── route-inclusion-exclusion.md # include/exclude patterns per stack
            └── purge-workflow.md            # full vs per-URL purge, sitemap warming
```

---

## Publishing & distribution

> For maintainers of this repository. Agent-skill distribution is an
> evolving space — prefer the canonical stores once they accept third-party skills.

### 1. GitHub (primary distribution — immediate)

The repository itself is the primary distribution channel. Any agent can
`git clone` it.

- Push the repo under `veliovgroup/ostrio-agent-skills` (or the target org).
- Tag each skill release: `git tag ostrio-prerendering-v1.0.0 && git push --tags`.
- In the GitHub release notes, link:
  - The skill path: `/skills/ostrio-prerendering/SKILL.md`
  - Install commands per agent (copy from this README).
  - Change summary (what versions of `spiderable-middleware`, `seo-middleware-nextjs`, canonical regex sources this release tracks).

### 2. Anthropic Skills directory (Claude)

Anthropic publishes official Skills examples at
<https://github.com/anthropics/skills>. When they accept third-party skills:

- Submit a PR mirroring the `ostrio-prerendering/` directory.
- Keep the repository under your own org as the canonical source; the
  Anthropic repo is a mirror/link.

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

### 5. NPM / package registries

This repository is documentation-centric, not code-packaged. If demand appears
for a one-line install:

```
npx @veliovgroup/ostrio-agent-skills install ostrio-prerendering
```

…publish a small helper CLI under `@veliovgroup/ostrio-agent-skills` on NPM
that detects the agent and copies the skill to the right path. Keep the skill
source canonical in this repo; the CLI is a thin installer.

### 6. Social / content promotion

- Add a section to <https://ostr.io/info/prerendering> and the ostr.io panel
  ("Integration Guide") linking directly to
  `https://github.com/veliovgroup/ostrio-agent-skills/tree/master/skills/ostrio-prerendering`.
- Share on X/Twitter, LinkedIn, Hacker News, DEV.to.
- Cross-post install instructions in `veliovgroup/spiderable-middleware`,
  `veliovgroup/seo-middleware-nextjs`, and `veliovgroup/ostrio` READMEs.

### 7. Keep skills in sync with upstream

- Re-copy the canonical bot UA regex whenever new AI agents emerge
  (<https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shared/crawler-ua-regex.md>).
- Re-copy the canonical static-extensions regex when ostr.io updates it
  (<https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/shared/static-extensions-regex.md>).
- Bump `seo-middleware-nextjs` / `spiderable-middleware` version notes in
  `SKILL.md` and templates if relevant APIs change.

---

## Contributing

Contributions welcome. See [`AGENTS.md`](AGENTS.md) for repository-level rules
(how to keep canonical regexes in sync, how to structure new skills, secret
hygiene).

New skills should follow the same layout as `ostrio-prerendering/`:

- `SKILL.md` with YAML frontmatter (`name`, `description`, optional
  `disable-model-invocation: true`).
- `checklists.md`, `troubleshooting.md`, `validation.md` as supporting files.
- `templates/` for copy-paste-ready code / config.
- `examples/` for cookbooks and common workflows.

Open a PR with the new skill directory and add a row to the Skills table above.

---

## License

BSD-3-Clause — see [`LICENSE`](LICENSE).

## Support

- ostr.io: <https://ostr.io/support>
- Issue tracker: <https://github.com/veliovgroup/ostrio-agent-skills/issues>
