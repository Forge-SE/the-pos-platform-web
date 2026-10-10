# Ovaal POS interface conventions

## Direction and feel

Keep operational UI calm, literal, and consistent with the existing POS. Reuse
the project's components, typography, semantic color tokens, and spacing rather
than introducing a separate visual system for feedback states.

## Empty and error content states

User-approved pattern: fill the available content area, with an icon, message,
and action stacked vertically and centered both horizontally and vertically.
Do not render page-level empty or error states as short bordered strips with
the action inline beside the message.

Use `src/components/content-state.tsx` for these states: `EmptyState` for empty
results, `ErrorState` for failed queries with a local retry callback, and
`ContentState` when the parent owns custom state or recovery behavior.

- Layout: full width, flexible height (`flex-1`), centered column, minimum
  320px height. The containing page/section must provide the available height;
  the minimum height alone is not a substitute for a full-height layout.
- Spacing: 24px horizontal and 48px vertical padding; 20px between icon and
  title, 8px between title and description, 24px before the action. Use the
  existing 4px spacing grid.
- Icon: existing Phosphor outline icon, 28px inside a 56px circular tonal
  surface. Decorative icons are hidden from assistive technology.
- Hierarchy: centered 16px semibold title in `text-foreground`; optional 14px
  supporting description with 24px line height in `text-muted-foreground`.
  Text width is limited to `max-w-sm`, with balanced titles and readable wrapping.
- Depth and surfaces: keep the existing page/card surface. Use a subtle tonal
  icon background, not a heavy enclosing border or decorative shadow.
- Error colors: `bg-destructive/10` and `text-destructive` on the icon; do not
  turn all message text and the recovery action red.
- Empty colors: `bg-muted` and `text-muted-foreground` on the icon.
- Actions: reuse `Button` with `size="lg"` (44px height). Use a clear recovery
  action such as "Try again", or a creation action for a genuine empty list.
  Avoid duplicate actions outside and inside an empty state.
  Prefer local refetch, filter clearing, creation, or navigation actions. When no
  contextual action is supplied, the shared component offers "Check again" to
  reload the page; it never initiates a mutation.
- Accessibility: errors use `role="alert"`; empty states use `role="status"`.
  Preserve the Button's keyboard, focus, disabled, and reduced-motion behavior.
- Retry: disable the action while the request is running and show progress
  wording. Keep the error layout stable during retry and handle rejected requests.
- Copy: explain the problem and the next step in plain language. Distinguish
  missing server configuration from connection failures. Never suggest that a
  styling change repairs a backend/data problem.

This convention applies to content-level empty/error states, not field-level
validation, button errors, or toast feedback. In drawers or dialogs, fill the
available content region rather than forcing viewport height.

Use `content-page` on page shells and `content-region` on table/panel containers
that should grow to fill available space. Their rules activate only when a
shared state is present, preserving populated layouts. Empty/error tables hide
their headers, remove minimum table widths, and center the state in a spanning
cell without forcing horizontal scrolling on smaller screens. Do not show
cached rows or an empty-result message alongside a blocking table error.

Preserve legitimate zero-valued metrics, preview analytics, operational notices,
field-level prerequisites, and image placeholders; they are not empty pages.

## Current adoption and verification

Applied across order history, counter/live orders, kitchen board/table, overview,
performance, menu and modifier lists, staff, tax/discount settings, subscriptions,
payout numbers, shift history/details, onboarding lists, platform administration
tables/charts/drawers, and route not-found/error states.

Browser visual verification remains unavailable. Verify desktop/mobile sizing
and light/dark contrast when a browser is available; static and component tests
do not establish visual proof.
