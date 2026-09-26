# POS Platform Frontend

Frontend built with TanStack Router, React, TypeScript, Tailwind CSS, Base UI,
and shadcn/ui.

## Routing

Routes are declared programmatically in `src/route-tree.tsx`. Route-level page
components live in `src/pages`; feature UI and business logic stay in
`src/features`. Add a page component first, then register its path and metadata
in the route tree.

## UI primitives

The initial component layer lives in `src/components/ui` and includes buttons,
inputs, input groups, OTP input, comboboxes, selects, textareas, avatars, form
fields, checkboxes, radio groups, switches, badges, separators, and skeletons.

Import components directly or from the component barrel:

```tsx
import { Button, Input } from "@/components/ui"
```

## Development

Use Node.js 24, then install and validate the project:

```bash
npm ci
npm run validate
```

Production builds include a web app manifest and an auto-updating service
worker. PWA caching is disabled during local development; use `npm run build`
followed by `npm run preview` to test installation and offline app-shell loading.

See [docs/infrastructure.md](docs/infrastructure.md) for CI, environment,
container, and repository setup.
