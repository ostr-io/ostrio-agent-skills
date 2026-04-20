# ostrio-agent-skills

Open-source [Agent Skills](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
for integrating, operating, and debugging [`ostr.io`](https://ostr.io) services.

Compatible with [Cursor](https://cursor.com), [Claude Code](https://www.anthropic.com/claude-code)
and claude.ai, [Codex CLI](https://openai.com/chatgpt/use-cases/codex-cli/),
[Google Antigravity](https://antigravity.google), and any other agent that
reads the Agent Skills `SKILL.md` format.

## Skills

| Skill | Description | Install & docs |
| --- | --- | --- |
| [`ostrio-prerendering`](skills/ostrio-prerendering/) | Integrate, operate, debug, purge, and maintain ostr.io pre-rendering (HTML CDN + crawler / social-preview / AI-agent pre-rendering) on Next.js, Node, Meteor, Nginx, Apache, Caddy, Cloudflare Workers, Netlify, Vercel, Supabase Edge, Shopify, WordPress, and any SPA/PWA/SSR/static site. | [README](skills/ostrio-prerendering/README.md) · [SKILL.md](skills/ostrio-prerendering/SKILL.md) |

> More `ostr.io` skills will be added here over time.

Each skill is a self-contained directory under [`skills/`](skills/) with its
own `README.md` (install + publish instructions) and `SKILL.md` (the skill
body the agent reads).

## Layout

```
.
├── AGENTS.md                            # agent-agnostic repo-level guidance
├── CLAUDE.md                            # Claude Code / claude.ai pointer
├── LICENSE                              # BSD-3-Clause
├── README.md                            # this file — index of skills
└── skills/
    └── ostrio-prerendering/
        ├── README.md                    # install + publish instructions for this skill
        ├── SKILL.md                     # skill body (agent entry point)
        ├── checklists.md
        ├── troubleshooting.md
        ├── validation.md
        ├── templates/
        └── examples/
```

## Install

See the per-skill README for agent-specific install paths. Quick reference:

- `ostrio-prerendering` → [install instructions](skills/ostrio-prerendering/README.md#install)

## Contributing

See [`AGENTS.md`](AGENTS.md) for repository-level rules (regex sync, new-skill
structure, secret hygiene).

New skills should follow the layout of `ostrio-prerendering/`:

- `SKILL.md` with YAML frontmatter (`name`, `description`, optional `disable-model-invocation: true`).
- `README.md` with install + publish instructions for that skill.
- `checklists.md`, `troubleshooting.md`, `validation.md` as supporting files.
- `templates/` for copy-paste-ready code / config.
- `examples/` for cookbooks and common workflows.

Open a PR with the new skill directory and add a row to the Skills table above.

## License

BSD-3-Clause — see [`LICENSE`](LICENSE).

## Support

- ostr.io: <https://ostr.io/support>
- Issue tracker: <https://github.com/ostr-io/ostrio-agent-skills/issues>
