# AGENTS.md — ostrio-agent-skills

- Repository of open-source Agent Skills for the [`ostr.io`](https://ostr.io) service catalogue.
- Every skill lives under [`/skills/<name>/SKILL.md`](skills/) and follows the
- Agent Skills format supported by Cursor, Claude Code (Anthropic), Codex CLI,
- Antigravity, and any other agent that reads `SKILL.md` with YAML frontmatter.

## Skills in this repository

| Skill | Path | Purpose |
| --- | --- | --- |
| `ostrio-prerendering` | [`skills/ostrio-prerendering/SKILL.md`](skills/ostrio-prerendering/SKILL.md) | Integrate, operate, debug, purge, and maintain ostr.io pre-rendering (HTML CDN + crawler/AI-agent pre-rendering) on Next.js, Node, Meteor, Nginx, Apache, Caddy, Cloudflare Workers, Netlify, Vercel, Supabase Edge, Shopify, WordPress, and any SPA/PWA/SSR/static site. |

## For agents reading this repository directly

Before editing any skill in this repository:

1. Read the skill's own `SKILL.md` and every file it references in `templates/` and `examples/`.
2. Keep secrets out of committed files — always env var, platform secret, or systemd `EnvironmentFile=`.
3. Preserve agent-neutral wording. Do not add Cursor-only, Claude-only, or Codex-only syntax inside `SKILL.md` bodies.
4. When adding a new skill, place it under `/skills/<kebab-name>/` and add it to the table above.

## For agents using these skills in a user project

- Detect the deployment stack (files like `package.json`, `next.config.*`, `vercel.json`, `netlify.toml`, `Caddyfile`, `.htaccess`, Nginx config, `wrangler.toml`, `supabase/config.toml`, `.meteor/release`) before recommending an integration tier.
- Pick the least invasive correct integration. See the relevant skill's decision tree.
- Run the skill's validation workflow after every change — not as a suggestion, as part of completion.
- When a setting is not documented in the skill and not in the linked canonical sources, respond: *"Verify in current ostr.io dashboard/docs or reach out to support team that usually responds in timely manner."* Never invent options.

## License

BSD-3-Clause — see [`LICENSE`](LICENSE).
