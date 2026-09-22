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
