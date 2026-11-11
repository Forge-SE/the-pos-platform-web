# Frontend infrastructure

## Supported runtime

The project targets Node.js 24.21.0 LTS. Use `nvm use` or a version manager that
reads `.node-version` before installing dependencies.

```sh
npm ci
npm run validate
```

`npm ci` is required in CI and production builds because it installs exactly
what is recorded in `package-lock.json`.

## Continuous integration

`.github/workflows/ci.yml` runs for pull requests and pushes to `develop` or
`main`. It checks formatting, TypeScript, ESLint, tests, and the production
build. The resulting `dist` directory is retained as a GitHub Actions artifact
for seven days.

Configure branch protection for `develop` and `main` in GitHub:

1. Require a pull request before merging.
2. Require the `Quality and build` status check.
3. Require the branch to be up to date before merging.
4. Dismiss stale approvals when new commits are pushed.
5. Block force pushes and branch deletion.

## Environment configuration

Copy `.env.example` to `.env.local` for local overrides. Never commit real
credentials. Variables prefixed with `VITE_` are included in browser bundles,
so they must never contain secrets.

`VITE_GRAPHQL_URL` is optional. Without it, local browser traffic uses the Vite
`/graphql` proxy.

## Vercel and production ops access

The production frontend is `https://app.ovaal.xyz`; operations is part of this
same SPA, not a separate deployment. Sign in at
`https://app.ovaal.xyz/ops/login` and open `https://app.ovaal.xyz/ops` for the
operations dashboard. Ops invitation links use `/ops/accept` with a token.

`vercel.json` rewrites client-side routes to `/index.html`, allowing direct
navigation and refresh on routes such as `/ops/login`. Existing static files
continue to be served normally. The Docker server's fallback does not configure
Vercel's static hosting.

Set these **Vercel build-time variables** for the production deployment, then
redeploy:

```dotenv
VITE_GRAPHQL_URL=https://api.ovaal.xyz/graphql
VITE_GRAPHQL_WS_URL=wss://api.ovaal.xyz/graphql
```

Use the staging API for staging/Preview builds. No admin password, password hash,
or backend API secret belongs in a `VITE_` variable.

On the **production API service**, include `https://app.ovaal.xyz` in
`CORS_ORIGINS` and set `OPS_APP_URL=https://app.ovaal.xyz`. Also configure
`PLATFORM_ADMIN_EMAIL` and the bcrypt `PLATFORM_ADMIN_PASSWORD_HASH` for the
initial administrator. Invitations additionally require `RESEND_API_KEY` and
`OPS_INVITE_FROM_EMAIL`. Store these only in the API host's secure environment
settings; never commit credentials or password hashes.

Attach `app.ovaal.xyz` to the correct Vercel project under **Settings > Domains**.
The current Git deployment configuration disables Vercel deployments for `main`,
and the existing production Actions workflow targets Railway. Therefore, merging
this routing fix alone does not trigger a Vercel production deployment: deploy
the updated revision to the project serving `app.ovaal.xyz`, or explicitly update
the production deployment strategy first.

## Production container

The Docker image builds the Vite SPA and serves it with `srvx` as a non-root
user. Its small fallback handler returns `index.html` for client-side routes.
The image exposes port 3000 and includes an HTTP health check.

```sh
docker compose up --build
```

The container is provider-neutral. Registry publishing and deployment should
be added after selecting a hosting platform and defining staging and production
environments.

## Dependency maintenance

Dependabot opens weekly grouped pull requests against `develop` for npm and
GitHub Actions updates. Security updates remain visible through GitHub's
dependency and security alerts.

## Add when product flows exist

- Playwright smoke tests for sign-in and checkout-critical paths.
- Visual regression coverage for stable screens.
- Error reporting and source-map upload for the selected observability vendor.
- Preview deployments for pull requests.
- Staging and production deployment workflows with protected environments.
