# Project context and release synchronization

- Before starting work, read the technical handoff in `README.md` and `docs/mapa-desarrollo.md`. Use `docs/esquema-base-datos.md` and `docs/rutas-aplicacion.md` to locate the relevant schema and endpoints, then verify behavior in the current source and migrations.
- Treat historical release notes as dated evidence. Keep implemented behavior, effective D1 settings, external credentials, local changes, committed GitHub source and the active Cloudflare deployment distinct.
- Every Cloudflare publication must have its corresponding commit and push to GitHub. Do not deploy uncommitted or unpushed source, and do not report a release complete until the GitHub commit/checks and active Cloudflare version have been verified.
- `main` is linked to Workers Builds in the documented setup: a push can deploy automatically. Prefer that single release path and do not start a parallel manual deployment. Record the source SHA and deployment version together; if either side fails, report the partial state and complete synchronization before calling it done.
- Keep this project context updated when changing business flows, schema, permissions or release processes. Never include credentials, private account data, QA accounts or unrelated working files in a commit.

# Visual themes and responsive controls

- The site has two global themes: `classic` and `liquid-glass`, independently of the home layout. Preserve both when adding or editing UI.
- Use shared `ActionButton`/`ActionAnchor` and semantic `.button`, `.button-primary`, `.button-outline` classes for new actions. Keep native selects, accessible labels and existing action handlers.
- Shared structure belongs in the base CSS. Liquid Glass-only styling belongs in the versioned asset referenced by `GLASS_STYLESHEET` (currently `public/assets/theme-liquid-glass-20261023-v4.css`); never import that file globally or preload it when the classic theme is active.
- Use `app/corner-tokens.css` for rounded corners in both themes. `--corner-N` applies the shared 1.15 scale to a previous N-pixel radius; do not apply that scale twice. Preserve circles, pills and intentional zero-radius joined edges.
- Bump the versioned theme asset name and `GLASS_STYLESHEET` when updating a stylesheet that has already been deployed. Do not let immutable CDN/browser caches serve an outdated theme asset.
- Use the existing theme setting and server-selected theme header. Do not implement client-only theme flashes, duplicate public URLs, localStorage-only theme selection or per-component theme requests.
- Every new button, city picker, dropdown and form must be verified in both themes on desktop and mobile, including narrow 320px views, focus, disabled states, readable contrast, long labels, overlays and open menus.
- Do not add backdrop filters, transforms, clipping or stacking contexts to header/sidebar containers that can trap fixed menus or dialogs. Keep blur bounded to small popovers and provide opaque fallback surfaces.
- Preserve public titles, heading hierarchy, links, canonicals, structured data and robots policy when changing appearance. Admin and previews stay authenticated and noindex.
- Use local disposable fixtures for QA; do not create fake production accounts without explicit authorization.

# Public mobile readability

- Mobile navigation links are not action buttons. Keep the header's compact navigation text separate from the larger action-label typography; do not enlarge the header as a side effect of readability work.
- Mobile-only corrections belong in `app/public-mobile.css` below its `max-width:860px` boundary, without altering the desktop composition. Preserve the existing 40px header actions and 36px navigation hit areas at normal text settings; allow safe reflow for user-scaled text instead of clipping.
- Keep mobile action labels readable inside their existing controls by adjusting inner spacing, not by stacking or inflating them unnecessarily. Check 320px, 360px, 390px and 430px, both themes and all session types.

# Public desktop composition

- Changes specific to large screens belong in `app/public-desktop.css`, inside the `min-width:1100px` breakpoint. Preserve the existing mobile/tablet composition below it; the 621–1099px reflow guard only anchors the age popover safely and disables the activity panel's sticky positioning when desktop zoom narrows the viewport.
- Public catalogs and home sections use the shared `--public-wide-size` / `--public-wide-inset` / `--public-page-gutter` tokens. Do not reintroduce separate 980/1080/1184px catalog caps. Reading-heavy legal/article content may keep a narrower measure.
- Public information pages also use that shared outer frame. Keep FAQ/help, article continuation and legal indexes in balanced desktop columns; bound paragraph line length rather than restoring the old 980/1000px page container. Shared reading typography belongs in `app/public-reading.css`, scoped outside headers and private panels.
- Use extra desktop width for additional card columns. Public profile cards stay within the shared 208–252px desktop range; use `auto-fill` (not `auto-fit`) to avoid inflating sparse rows. Keep images unoptimized/original and avoid CSS zoom, scaling or blur over photos.
- Header navigation wraps into rows, never a horizontal scroller. Do not hide overflow to conceal a layout bug. Keep actions at intrinsic widths and category counts adjacent to their titles.
- Validate both themes and both home layouts at 1366, 1920, 2560 and ultrawide widths; include signed-in/out headers, populated/empty catalogs, story rails and text activity. Recheck mobile at 320 and 390px for unchanged layout.
