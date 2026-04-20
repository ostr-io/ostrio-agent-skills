# Netlify Support request — enable ostr.io pre-rendering

Copy-paste and fill in the three variables. Submit via Netlify Support
(<https://www.netlify.com/support/>). Replies typically land within 24 h.

---

**Subject:** Enable ostr.io pre-rendering on {{SITE_NAME}} ({{PRIMARY_DOMAIN}})

Hi Netlify Support,

Please enable pre-rendering integration with [ostr.io](https://ostr.io/info/prerendering) for
our site:

- **Netlify site name:** `{{SITE_NAME}}`
- **Team / Organization:** `{{TEAM_NAME}}`
- **Plan:** PRO / ENTERPRISE (ostr.io pre-rendering requires PRO or higher)
- **Primary domain:** `https://{{PRIMARY_DOMAIN}}`
- **Additional domains / subdomains in scope:** `{{ADDITIONAL_DOMAINS}}`
- **ostr.io Auth Token:** `Basic {{BASE64_TOKEN}}`
  (from <https://ostr.io/service/prerender> → host → Integration Guide)

We have completed domain verification on the ostr.io side. Please let us know if any
additional info is required.

For reference:

- Netlify ostr.io integration docs: <https://github.com/ostr-io/ostrio-docs/blob/master/docs/prerendering/netlify-prerendering.md>
- ostr.io pre-rendering overview: <https://ostr.io/info/prerendering>

Thank you.

---

## Variables to fill

- `{{SITE_NAME}}` — Netlify site name (shown in Netlify dashboard URL slug).
- `{{TEAM_NAME}}` — team/organization the site belongs to.
- `{{PRIMARY_DOMAIN}}` — main production domain, e.g. `example.com`.
- `{{ADDITIONAL_DOMAINS}}` — list of additional subdomains/domains to cover, e.g. `www.example.com, blog.example.com`. Leave "none" if not applicable.
- `{{BASE64_TOKEN}}` — the `Basic xxx...` token from the ostr.io panel (paste only the base64 part; the `Basic ` prefix is already shown in the message).

## After Netlify confirms

Run the smoke test ([`validation.md`](../validation.md)):

```shell
curl -sI -A 'Googlebot/2.1' https://{{PRIMARY_DOMAIN}}/ | grep -i x-prerender-id
curl -sI -A 'Mozilla/5.0' https://{{PRIMARY_DOMAIN}}/ | grep -i x-prerender-id
```

Expected: the first returns `x-prerender-id: <uuid>`, the second does not.

## To disable later

Open another Netlify Support ticket citing the original enablement request and ask
to disable ostr.io pre-rendering on this site.
