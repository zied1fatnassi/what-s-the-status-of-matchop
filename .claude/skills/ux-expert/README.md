# /ux-expert -- UX Design Expert Skill

A Claude Code skill that turns Claude into a senior UX professional specializing in B2B SaaS dashboards and data-heavy interfaces. It reads your actual code, identifies UX problems grounded in established principles, and produces implementation-ready redesign specs.

---

## Install

```bash
cp -r skills/ux-expert/ your-project/.claude/skills/ux-expert/
```

Requires: Claude Code installed in your project (`.claude/` directory exists).

---

## Usage

Invoke the skill by typing `/ux-expert` followed by what you want:

```
/ux-expert audit the dashboard page
/ux-expert review the settings form
/ux-expert redesign the analytics section
/ux-expert help me choose components for a KPI summary strip
```

The skill is collaborative. It will read your code, present findings, ask for your input, and iterate. You are always in control of which direction to take.

---

## What It Audits

Every audit evaluates your page across **8 dimensions**:

| # | Dimension | What it checks |
|---|-----------|---------------|
| 1 | **Information Architecture** | Is content grouped by user mental model or by data source? Is the primary task visible first? |
| 2 | **Visual Hierarchy** | Does visual weight match informational importance? Can users find the top 3 metrics in 3 seconds? |
| 3 | **Screen Real Estate** | Is space allocated proportionally to content value? Are important things hidden behind tabs/scroll? |
| 4 | **Interaction Cost** | How many clicks to complete the primary task? Are common actions buried in menus? |
| 5 | **Cognitive Load** | Are there too many items without grouping? Does the user need to hold information in memory? |
| 6 | **Context & Orientation** | Does the user always know what time period, filters, and state they are viewing? |
| 7 | **Data Presentation** | Are charts appropriate for the data? Are numbers formatted with units and precision? |
| 8 | **Responsiveness & Edge Cases** | Are empty, loading, and error states handled? Does the layout work on mobile? |

Each finding is rated by severity:

- **Critical** -- User cannot accomplish their primary task or is actively misled
- **Major** -- Significant friction; key information buried or requires excessive effort
- **Minor** -- Suboptimal but functional; improvement enhances experience
- **Enhancement** -- Delight-level polish; no one is struggling but it could be better

---

## The Process

The skill follows a 4-phase process:

**Phase 1: Understand** -- Reads your components, identifies data flow, maps the tech stack

**Phase 2: Audit** -- Walks through all 8 dimensions, presents findings grouped by impact (biggest wins first)

**Phase 3: Propose** -- Presents 1-2 layout concepts as ASCII wireframes with rationale, asks for your direction

**Phase 4: Spec** -- Produces a detailed redesign spec including:
- ASCII wireframe of the final layout
- Component inventory (new, modified, unchanged, removed)
- Data requirements (API source, transformation, null behavior)
- Interaction specifications (hover, click, expand, filter)
- Responsive behavior (breakpoints, what collapses)
- Edge cases (empty state, error state, long text, 200+ rows)

---

## Example Output

Here is a condensed example of what a finding looks like:

```
## Finding: Tab Overuse Hiding Insights

**Dimension:** Screen Real Estate
**Severity:** Major
**File(s):** frontend/src/pages/Analytics.tsx

**Current:**
The analytics page uses 4 tabs (Performance, Utilization, Costs, Alerts).
Each tab renders a full-page view. Only one tab is visible at a time.

**Problem:**
A manager opening this page wants to answer "how are things going?" but can
only see 1/4 of the picture without clicking through each tab. Tabs create
equal visual weight for unequal importance and prevent cross-category
comparison. The user must hold numbers from Tab A in memory while viewing
Tab B.

**Recommendation:**
Replace tabs with a single scrollable page:
- Summary strip at top (4 key metrics, always visible)
- Expandable sections for each area (Performance expanded by default)
- Badge on Anomalies section showing count ("Anomalies (2)")

**Principle:**
Shneiderman's mantra -- "Overview first, zoom and filter, details on demand."
No overview exists in the current design.
```

---

## Reference Material Included

The skill ships with 3 reference documents that Claude loads on demand:

| File | Contents | Lines |
|------|----------|-------|
| `references/ux-principles.md` | Visual hierarchy, cognitive load (Miller's Law, Hick's Law), Gestalt principles, dashboard patterns, anti-patterns, Shneiderman's mantra, checklists | ~580 |
| `references/audit-methodology.md` | The 8-dimension audit framework, severity ratings, code-reading guide for UX insight, finding template, redesign spec template, audit checklist | ~560 |
| `references/component-libraries.md` | antd, MUI, Chakra, shadcn/ui, Recharts, Nivo, TanStack Table, AG Grid, Tremor, Magic UI, Aceternity, micro-libraries, decision framework, composition patterns | ~750 |

Claude reads these as needed -- it does not load all 1,900 lines upfront. When it needs to cite a UX principle, it reads `ux-principles.md`. When recommending components, it reads `component-libraries.md`.

---

## What This Skill Does NOT Do

- **Write production code.** It produces specs. You (or Claude in a separate step) implement them.
- **Make business decisions.** It will ask which metric matters most to your users rather than guessing.
- **Override your design system.** It works within your existing libraries, suggesting additions only when justified.
- **Auto-trigger.** It only runs when you explicitly invoke `/ux-expert`.

---

## License

MIT -- see [LICENSE](../../LICENSE).
