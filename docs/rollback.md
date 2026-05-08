# Rollback

## Scenarios and runbooks

### A. Bad code shipped to prod (last 24h)

- Cloudflare Worker rollback: `bunx wrangler rollback`.
- Or via dashboard: Worker -> Deployments -> previous version -> Promote.
- Atomic: zero downtime, takes ~5s.

### B. Workers infrastructure failure during cutover window

- Worst-case fallback: switch DNS for `forbit.dev` back to the VPS A record.
- Pre-cutover, drop the DNS TTL to 60s the day before so this is fast.
- VPS sunset: keep the VPS running for 7 days post-cutover. After 7 days
  with clean error logs, stop the service. After 30 days, decommission.

### C. VPS already broken / cutover already passed (>7 days)

- VPS is not a viable rollback after sunset.
- Use Workers rollback (Scenario A) for any forward issues.
- For data layer issues (DevPad / Dev.to API failures), the cache wrapper's
  stale-while-revalidate keeps stale content served -- no rollback needed.

## Pre-cutover checklist

- [ ] `bun run check` green on `main`
- [ ] `bun run build` green on `main`
- [ ] First Workers Builds deploy verified at `*.workers.dev` URL
- [ ] Custom domain bound, certificate provisioned
- [ ] `bun run smoke` passes against the assigned Worker URL
- [ ] DNS TTL dropped to 60s 24h before cutover
- [ ] VPS deploy paused (the GitHub Action that SSH-deployed has been deleted
      in the Phase 4 commit, so no auto-deploy will fire on push)

## Cutover step

Switch the `forbit.dev` A record (or CNAME) from the VPS IP to the
Cloudflare-managed record (auto-created when the custom domain was added).
TTL window: 60s. Verify `/` and `/og/default.png` from a few networks.

## Post-cutover monitoring (T+0 -> T+7d)

- Cloudflare Analytics -> Workers -> `forbit-astro`: watch error rate and p95
  latency.
- Live logs: `bunx wrangler tail` if needed.
- Sentry-equivalent: not currently wired up.
- DevPad: confirm publish webhook fires successfully on the next blog post
  (Settings -> Builds -> Deploy Hooks -> Recent runs).

## VPS sunset

- T+7d: stop the Astro service on the VPS (do not decommission).
- T+30d: decommission the VPS.
