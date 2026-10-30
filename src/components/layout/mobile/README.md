# Mobile presentation ownership

This folder owns the compact application shell (below 1024px): header, floating
navigation, account/menu sheets, styling, and motion. `MainLayout` selects this
shell; the desktop sidebar remains a separate component.

- Put mobile shell styles in `mobile.css`, using `mobile-` classes. Do not change
  global typography, semantic color tokens, shared UI primitives, or desktop
  layouts to solve a mobile-only styling issue.
- Keep role destinations and access rules in `mobile-navigation-model.ts` and
  existing permission helpers. Presentation must not create new permissions.
- Keep mutations, queries, pricing, payment handling, offline synchronization,
  and order state shared. Do not fork these into mobile implementations.
- For a substantially different feature layout, add a `mobile/` presentation
  next to that feature and pass it the same controller/state as desktop. Small
  responsive adjustments may remain in shared components and require desktop QA.
- Use `MobileSheet` for mobile shell sheets and `mobile-motion.ts` for their
  timing. It preserves Base UI focus/escape/scroll-lock semantics, animates exits
  before unmounting, and supports dismissal from the drag handle. Scrollable
  content is not a drag surface. Close remains available without gestures.
- Use a scoped Framer Motion `LayoutGroup` for sliding selected pills. Do not
  animate the whole page or remount business state when changing destinations.
  Honor reduced motion and retain selected colors, labels, and `aria-current`.
- Sheet state and destinations participate in browser history. Preserve Back,
  direct links, and the cashier bag when switching views.

Mobile ownership is an organizational boundary, not a sandbox: changes to shared
files still need review by their owners. This first pass isolates navigation and
profile; existing feature pages have not all been split into mobile presenters.

Before merging, run formatting, typecheck, lint, tests and build. Verify 320px,
375px, and tablet widths, safe areas, keyboard opening, long/French labels,
dark mode, reduced motion, sheet focus/Back/drag dismissal, and desktop sidebar
behavior at 1280px or wider. Automated behavior tests do not prove animation
quality or device gesture behavior.
