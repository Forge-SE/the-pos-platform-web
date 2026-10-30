# Mobile content components

These components are presentation only. The parent feature owns queries,
subscriptions, mutations, search, sorting, pagination, access and selection.
Use them from a feature's `mobile/` presenter. Keep desktop UI in its existing
presenter and business state above the responsive boundary.

## Screen header

`MobileScreenHeader` takes `title`, optional `subtitle`, `leading` and `actions`.
The shell supplies a role-aware screen title, restaurant identity and account
controls. A feature can supply a back action for a detail view. On the overview,
the screen title lives in this header and the greeting lives in content.
Long titles/subtitles truncate so action targets remain available.

## Metrics

`MobileMetricGroup` takes keyed `items` (`label`, `value`, optional `icon`), an
accessible `label`, `busy`, and `layout`:

- `summary` (default): one leading metric and two compact metrics below, becoming
  three columns at tablet widths. Use for the three primary overview metrics;
  none is hidden behind a gesture.
- `swipe`: native horizontal scroll with snap points and a next-card preview.
  Includes explicit previous/next controls and a focusable scroll region. No
  autoplay; programmatic scrolling respects reduced motion. Use for secondary
  collections whose items do not need simultaneous comparison.

Metrics wrap large values rather than clipping amounts. Currency formatting and
unavailable/loading values are controlled by the feature; do not invent zeroes
for unavailable data. These summary metrics are informational, not buttons.

## Flat lists instead of card stacks

`MobileFlatList<T>` takes `items`, `getKey`, `renderItem`, `label`, and an
`empty` state. Rows share a continuous surface with thin separators, without rounded card backgrounds. `MobileRecordRow` takes a title, subtitle, badge, amount,
labelled fields, preview children and optional `onOpen`/`openLabel`.

Show identity, status and the main value immediately. Show a concise preview;
put full secondary fields in an accessible detail sheet. Preserve important
warnings and an indication of notes in the preview. Do not put nested buttons
or links inside an interactive record card; put additional actions in the sheet.

Keep pagination outside the list, driven by the same URL/server state as desktop.
Do not remove records, filters or actions merely to fit a phone. Use a real table
with deliberate horizontal scrolling for data that requires column comparison;
this list is for record browsing and operational detail, not every table.

## Floating secondary action

`MobileFloatingAction` takes a label, icon, click handler and optional expanded
state for a dialog. Reserve it for one secondary action on a screen. It sits
above the floating navigation, respects the bottom/right safe area and hides
with the software keyboard. Leave at least 80px of content padding below the
last record, in addition to the shell's navigation clearance. The overview uses
it for the sales digest, loaded on demand in a sheet; opening never sends email.

## Adoption across features

`DataTable` now uses `MobileTableContent` on compact screens. It preserves actual
table semantics and every cell/control, while presenting labelled records.
Both the column API and existing literal table children are supported. For
column-comparison workflows, set `mobilePresentation="scroll"` explicitly.
For a more compact record hierarchy, set `mobileRole` on columns, or pass
`mobileFieldRoles` in the same order as legacy table cells. Roles are `identity`,
`status`, `amount`, `meta`, `detail`, and `actions`. Identity/status lead the row,
the amount sits on the trailing edge, metadata sits quietly below and actions remain in the row.
Keep ambiguous values as `detail` so their labels remain visible. This mapping
is explicit; never infer a role from translated column text or a formatted
currency string. All fields and table headers remain accessible. Orders,
customers, staff, shifts, restaurant directory and discounts adopt this pattern.
Custom row components should use the column API rather than hide cells inside
an opaque React component. Filters open in `MobileTableFilters`; pagination and
search keep the feature's existing state and callbacks.

## Automatic mobile loading

Compact tables use a near-end sentinel with a 400px preload margin. They append
the next batch without a numbered footer or page-size selector. Desktop keeps
its existing pagination. A loading indicator and retry action sit after the
loaded rows. A manual load action is available when IntersectionObserver is
unavailable, the current batch is empty, or a repeated batch adds no records.

- Remote batches use the default `mobileFeedMode="paged"`. Supply stable row IDs
  through `getRowId` (or records with an `id`) and stable keys on legacy table
  rows. Batches are deduplicated. `mobilePageError` tells legacy-child tables
  about failed batches; declarative tables use `errorState`. Supply `onRetry` or
  `onRefresh` for the inline retry action.
- Include server filter/dataset values in `mobileFeedKey`; search, language,
  page size and pathname already participate in the scope. Changing the scope
  starts a fresh feed. Refresh returns to the first batch. A cold URL containing
  a page hint starts at that batch; the in-memory prefix is not persisted.
- Local datasets use `mobileFeedMode="window"` and
  `allRows.slice(paging.windowStart(), (pageIndex + 1) * paging.pageSize)`.
  This keeps previously revealed rows tied to current source data after edits,
  rather than storing old rendered controls. Desktop `windowStart()` retains
  the usual page offset; pass a clamped page index where applicable.
- Pass `paging.onLoadMore` through custom pagination objects. It replaces the
  URL page hint, so automatic loads do not create extra Back steps. The normal
  `onPageChange` still pushes history for desktop navigation.

Remote pages retain the rows fetched during this mounted feed. Refresh when
fresh data for every earlier remote batch is needed. Row actions still use the
feature's existing handlers and server validation.

`MobileTabs` provides a sliding selection with a static pressed state and reduced
motion. `AdaptiveDialogPopup` retains each form's controller and Base UI dialog
semantics, presenting a full-height mobile form with safe-area spacing; desktop
classes are passed through unchanged. It does not introduce form persistence or
change mutation behavior. `mobileClassName` handles content padding for dialogs
without an existing header/body wrapper.

Settings uses `SettingsDialog`'s page presentation on mobile. Opening from a
workspace pushes a URL entry and keeps the underlying screen mounted and inert,
so Back and the page's Back action restore the cashier bag and filters. Direct
`/settings` links also render the page. Desktop keeps its dialog.

The counter, kitchen, performance, inventory, menu/staff/pricing forms, customer
details, shifts and operations screens adopt these shared presentations. Mobile
feature styling lives in `mobile-features.css`; overview metric styling remains
in `mobile-content.module.css`. Shared motion lives in
`../layout/mobile/mobile-motion.ts` and `MobileSheet`. Mobile ownership does not
eliminate desktop regression checks for shared controller or component changes.
