# QualiScope UI kit

A small design system for the QualiScope frontend. Import components from
`src/components/ui` (barrel `index.js`) and QA-specific pieces from
`src/components/common.jsx`.

## Principles

- **Tokens only.** Colours, spacing, radii, shadows and type come from CSS
  custom properties (`src/styles/tokens.css`, `src/styles/themes.css`). Never
  write a hex value in a component or page stylesheet; every theme must work.
- **Calm hierarchy.** One `<h1>` per page (via `PageHeader`), cards for
  sections, sentence-case labels, accent colour used sparingly for the primary
  action and the current state.
- **Accessible by default.** Every control has a visible label or an
  `aria-label`; focus rings are never removed; colour is never the only signal.
- **Responsive.** Breakpoints: 1199px, 1023px (sidebar becomes a drawer),
  767px (single-column forms), 639px (phones; dialogs become bottom sheets).

## Themes

Five palettes, selected with `<html data-theme="…">`: `porcelain` (light,
default), `midnight` (dark, default when the OS is dark), `navy` and
`evergreen` (dual tone: dark sidebar, light workspace) and `graphite` (dark,
gold accent). To add or edit one, change `src/styles/themes.css` and the list in
`src/utils/themes.js`, then check contrast (all text pairs must reach WCAG AA
4.5:1).

Key tokens: `--bg`, `--surface`, `--surface-2/3`, `--border(-strong|-subtle)`,
`--text`, `--text-secondary`, `--text-tertiary`, `--accent`, `--accent-text`,
`--accent-subtle`, `--success|warning|danger|info(-text|-subtle|-border)`,
`--sev-critical|high|medium|low`, `--chart-1…8`, `--sidebar-*`.

Libraries that need literal colours (Recharts) read tokens with
`useThemeTokens(["chart-1", "chart-grid"])` from `src/hooks/useTheme.jsx`; the
values update when the theme changes.

## Page anatomy

```jsx
<div className="page">                       {/* vertical rhythm: 24px gaps */}
  <PageHeader eyebrow="Risk" title="Risk analysis" description="…" actions={<Button …/>} />
  <div className="stat-grid">…<StatCard /></div>
  <Card flush>
    <CardHeader title="Risk register" description="…" actions={…} />
    <CardSection>{/* toolbar: filters, search */}</CardSection>
    <Table label="Risk register">…</Table>
    <CardFooter>…</CardFooter>
  </Card>
</div>
```

Page-only styles go in a co-located `src/pages/<Page>.css`, imported by the
page, with class names prefixed by the page (`.analyzer__…`, `.testpack__…`).

## Components

| Component | Notes |
| --- | --- |
| `Button` | `variant`: primary, secondary, ghost, soft, danger, danger-soft. `size`: sm, md, lg. `icon`, `iconRight`, `loading`, `block`. Defaults to `type="button"`. |
| `IconButton` | Icon-only; `label` is required (accessible name + tooltip). |
| `Badge` | `tone`: neutral, accent, success, warning, danger, info. `dot`, `tag` (compact uppercase tags such as ASSUMPTION). |
| `Kbd`, `Avatar` | Keyboard hint, initials avatar. |
| `Card`, `CardHeader`, `CardSection`, `CardFooter` | `Card flush` lets tables reach the edges. |
| `PageHeader` | `eyebrow`, `title`, optional gradient `accent`, `description`, `meta`, `actions`. |
| `Field` + `Input`, `Textarea`, `Select`, `SearchInput`, `Checkbox` | `Field` wires label/hint/error to its child. Grid helpers: `form-grid form-grid--2/3/4`, `span-full`. |
| `FilterChips` | Single-select filter (toggle buttons with `aria-pressed`) with counts. |
| `Table` | Scroll wrapper + sticky header. Cell classes: `cell-id`, `cell-primary`, `cell-wide`, `cell-muted`, `cell-num`, `cell-actions`, `cell-tight`. |
| `Modal` | Portal, focus trap, Esc to close, bottom sheet on phones. `size`: sm, md, lg, xl, full. `as="form"` + `onSubmit` for form dialogs. |
| `Popover`, `MenuItem`, `MenuLabel`, `MenuSeparator`, `useDismiss` | Menus with arrow-key navigation. |
| `Alert` | `tone`; pass `role="alert"` for errors. |
| `Spinner` | Loading indicator with `role="status"`. |
| `Skeleton`, `EmptyState`, `ProgressBar`, `StatCard`, `ToastViewport` | Loading placeholders, empty lists, progress, KPIs, notifications. |

QA components in `common.jsx`: `PriorityBadge` (Critical/High/Medium/Low with a
severity dot), `StatusBadge` (Pass, Fail, Blocked, Not Run, Validated, Mapped,
Not covered, approved, draft) and `NoPack`.

## Testing conventions

Kit and shell behaviour (themes, Modal focus handling, Field wiring,
FilterChips, badges, command palette, project dialog) is covered by
`src/test/ui.test.jsx`; page flows by `src/test/app.test.jsx` and
`e2e/workflow.spec.js`.

Unit and e2e tests locate elements by accessible name, so keep these stable:
`data-testid="row-<case id>"`, `aria-label`s such as `Toggle <id>`,
`Edit <id>`, `Status <id>`, `Search test cases`, `Filter by priority`, field
labels such as `Item Desc`, and button text such as `Generate AI Test Pack`.
Sidebar entries are links (`getByRole("link", { name: "Traceability Matrix" })`).
