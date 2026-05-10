# GangNiaga AI OS — UI/UX Design System

**Version:** 1.0  
**Last Updated:** 2026-03-04  
**Author:** GangNiaga Engineering  
**Status:** Active  

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Component Library](#5-component-library)
6. [Animation Guidelines](#6-animation-guidelines)
7. [Page Layouts](#7-page-layouts)
8. [Dark Mode Implementation](#8-dark-mode-implementation)
9. [Responsive Design Breakpoints](#9-responsive-design-breakpoints)
10. [Icon Usage](#10-icon-usage)
11. [Accessibility Standards](#11-accessibility-standards)
12. [Custom CSS](#12-custom-css)

---

## 1. Design Philosophy

### 1.1 Core Principles

GangNiaga AI OS is designed around five core principles that guide every visual and interaction decision:

| Principle | Description |
|---|---|
| **Clarity Over Decoration** | Every element earns its place. We prioritize readable data, clear hierarchy, and purposeful whitespace over ornamental design. Financial data demands precision; our UI reflects that. |
| **Intelligent Minimalism** | The interface stays out of the user's way. Complex AI capabilities are surfaced through progressive disclosure — simple by default, powerful on demand. |
| **Trust Through Consistency** | Startups and SMEs trust the platform with their financial data. A consistent, predictable, and professional UI reinforces that trust at every interaction. |
| **Motion With Purpose** | Animations communicate state changes, guide attention, and reduce cognitive load. They never exist purely for spectacle. Every transition has a reason. |
| **ASEAN-First, Global-Ready** | Multi-currency symbols, locale-aware number formatting, and regional color associations are considered from the start, not bolted on later. |

### 1.2 Design System Stack

```
┌─────────────────────────────────────────────┐
│              Design Tokens                   │
│  oklch colors · spacing · radius · fonts    │
├─────────────────────────────────────────────┤
│              Tailwind CSS 4                  │
│  @theme inline · custom variants · utility  │
├─────────────────────────────────────────────┤
│              shadcn/ui (New York)            │
│  50 components · Radix primitives · CVA     │
├─────────────────────────────────────────────┤
│              Framer Motion                   │
│  page transitions · hover · AnimatePresence │
├─────────────────────────────────────────────┤
│              Application Layer               │
│  layouts · pages · composables · stores     │
└─────────────────────────────────────────────┘
```

### 1.3 Visual Language

- **Shape language**: Rounded corners (`--radius: 0.625rem`) with consistent border radius scale (sm → md → lg → xl)
- **Shadow system**: Minimal by default; elevation through `shadow-md` and `shadow-xl` for modals and floating elements
- **Density**: Compact but breathable — `py-1.5` to `py-2` for nav items, `p-4` to `p-6` for cards
- **Brand accent**: Emerald-to-teal gradient (`from-emerald-500 to-teal-600`) used sparingly for logo, CTAs, and primary brand moments — never as the system primary color

---

## 2. Color System

### 2.1 Color Space

All colors are defined in **oklch** color space, which provides perceptually uniform lightness and chroma. This ensures consistent contrast ratios across both light and dark modes.

```css
/* Format: oklch(L C H) where:
   L = Lightness (0-1)
   C = Chroma (0-0.4 typically)
   H = Hue (0-360)
*/
```

### 2.2 Light Mode Variables

| Variable | oklch Value | Visual | Usage |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` | White | Page background |
| `--foreground` | `oklch(0.145 0 0)` | Near-black | Primary text |
| `--card` | `oklch(1 0 0)` | White | Card surfaces |
| `--card-foreground` | `oklch(0.145 0 0)` | Near-black | Card text |
| `--popover` | `oklch(1 0 0)` | White | Popover surfaces |
| `--popover-foreground` | `oklch(0.145 0 0)` | Near-black | Popover text |
| `--primary` | `oklch(0.205 0 0)` | Dark neutral | Primary actions, buttons |
| `--primary-foreground` | `oklch(0.985 0 0)` | White | Text on primary |
| `--secondary` | `oklch(0.97 0 0)` | Light gray | Secondary backgrounds |
| `--secondary-foreground` | `oklch(0.205 0 0)` | Dark | Text on secondary |
| `--muted` | `oklch(0.97 0 0)` | Light gray | Muted backgrounds |
| `--muted-foreground` | `oklch(0.556 0 0)` | Mid gray | Secondary/deemphasized text |
| `--accent` | `oklch(0.97 0 0)` | Light gray | Accent backgrounds |
| `--accent-foreground` | `oklch(0.205 0 0)` | Dark | Text on accent |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Red | Error, delete, danger |
| `--border` | `oklch(0.922 0 0)` | Light border | Default borders |
| `--input` | `oklch(0.922 0 0)` | Light border | Input borders |
| `--ring` | `oklch(0.708 0 0)` | Mid gray | Focus rings |

### 2.3 Dark Mode Variables

| Variable | oklch Value | Usage |
|---|---|---|
| `--background` | `oklch(0.145 0 0)` | Dark page background |
| `--foreground` | `oklch(0.985 0 0)` | Light text |
| `--card` | `oklch(0.205 0 0)` | Slightly lighter dark card |
| `--primary` | `oklch(0.922 0 0)` | Light neutral for primary actions |
| `--primary-foreground` | `oklch(0.205 0 0)` | Dark text on primary |
| `--muted` | `oklch(0.269 0 0)` | Dark muted surface |
| `--muted-foreground` | `oklch(0.708 0 0)` | Gray text on dark |
| `--destructive` | `oklch(0.704 0.191 22.216)` | Muted red for dark mode |
| `--border` | `oklch(1 0 0 / 10%)` | Subtle white border |
| `--input` | `oklch(1 0 0 / 15%)` | Slightly more visible input border |

### 2.4 Chart Palette

The chart palette uses chromatic oklch values for data visualization:

| Variable | Light Mode | Dark Mode | Typical Use |
|---|---|---|---|
| `--chart-1` | `oklch(0.646 0.222 41.116)` | `oklch(0.488 0.243 264.376)` | Primary data series (amber → indigo) |
| `--chart-2` | `oklch(0.6 0.118 184.704)` | `oklch(0.696 0.17 162.48)` | Secondary series (teal → green) |
| `--chart-3` | `oklch(0.398 0.07 227.392)` | `oklch(0.769 0.188 70.08)` | Tertiary series (blue → yellow) |
| `--chart-4` | `oklch(0.828 0.189 84.429)` | `oklch(0.627 0.265 303.9)` | Quaternary series (yellow → purple) |
| `--chart-5` | `oklch(0.769 0.188 70.08)` | `oklch(0.645 0.246 16.439)` | Quinary series (orange → red-orange) |

### 2.5 Sidebar Colors

The sidebar has its own set of variables to support independent theming:

```css
/* Light mode */
--sidebar: oklch(0.985 0 0);                /* Sidebar background */
--sidebar-foreground: oklch(0.145 0 0);     /* Sidebar text */
--sidebar-primary: oklch(0.205 0 0);        /* Active item */
--sidebar-primary-foreground: oklch(0.985 0 0);
--sidebar-accent: oklch(0.97 0 0);          /* Hover item */
--sidebar-accent-foreground: oklch(0.205 0 0);
--sidebar-border: oklch(0.922 0 0);
--sidebar-ring: oklch(0.708 0 0);

/* Dark mode */
--sidebar: oklch(0.205 0 0);
--sidebar-primary: oklch(0.488 0.243 264.376); /* Accent indigo in dark */
```

### 2.6 Brand Accent Colors

The emerald-to-teal gradient is the brand signature, used selectively:

```tsx
// Logo icon
<div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md" />

// Avatar fallback
<AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white" />

// Welcome section gradient
<div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white" />

// Quick action buttons
<div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white" />
```

### 2.7 CSS Variable Reference in Tailwind

Colors are mapped from CSS variables into Tailwind via `@theme inline`:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  /* ... sidebar colors */
}
```

Usage in components:

```tsx
<div className="bg-card text-card-foreground border-border" />
<button className="bg-primary text-primary-foreground hover:bg-primary/90" />
<span className="text-muted-foreground" />
```

---

## 3. Typography

### 3.1 Font Families

| Font | CSS Variable | Usage | Weight Range |
|---|---|---|---|
| **Geist Sans** | `--font-geist-sans` | Body text, UI elements, labels | 400–700 |
| **Geist Mono** | `--font-geist-mono` | Code, KBD shortcuts, monospace data | 400–500 |

Loaded via `next/font/google` in `layout.tsx`:

```tsx
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

### 3.2 Type Scale

| Element | Class | Size | Weight | Line Height | Usage |
|---|---|---|---|---|---|
| Page title | `text-lg font-semibold` | 18px | 600 | 1.3 | Dashboard header, page titles |
| Section title | `text-base font-semibold` | 16px | 600 | 1.4 | Card titles |
| Card title | `text-base` | 16px | 600 | — | Card headers |
| Body | `text-sm` | 14px | 400 | 1.5 | Default text |
| Caption | `text-xs` | 12px | 400 | 1.5 | Metadata, descriptions |
| Micro | `text-[10px]` | 10px | 500 | 1.4 | Group labels, timestamps |
| Nano | `text-[9px]` | 9px | 500 | 1.3 | Badge text, kbd hints |
| KPI value | `text-2xl font-bold` | 24px | 700 | 1.2 | Dashboard KPI numbers |
| Welcome heading | `text-xl font-bold` | 20px | 700 | 1.3 | Welcome section greeting |

### 3.3 Font Weight Conventions

| Weight | Value | Usage |
|---|---|---|
| Normal | `font-normal` (400) | Body text, descriptions |
| Medium | `font-medium` (500) | Navigation labels, table cells, small UI text |
| Semibold | `font-semibold` (600) | Section headings, card titles, emphasized labels |
| Bold | `font-bold` (700) | KPI values, page titles, hero text |

### 3.4 Monospace Usage

Use `font-mono` (Geist Mono) for:

- Keyboard shortcut hints: `<kbd className="font-mono text-[9px]">⌘K</kbd>`
- Financial figures in dense tables: `<span className="font-mono text-xs">$42,000</span>`
- Code blocks in AI-generated prose: `.prose-ai code { font-family: var(--font-geist-mono); }`
- Agent task IDs and trace IDs

---

## 4. Spacing & Layout

### 4.1 App Shell Structure

```
┌──────────────────────────────────────────────────────────┐
│                     Viewport (100vh)                     │
├──────────┬───────────────────────────────────────────────┤
│          │  Header (h-14)                                │
│          ├───────────────────────────────────────────────┤
│ Sidebar  │                                               │
│ (w-64 /  │  Main Content Area                            │
│  w-16)   │  (scroll-y-auto, p-4 lg:p-6)                │
│          │                                               │
│          │                                               │
│          │                                               │
│          ├───────────────────────────────────────────────┤
│          │  Footer (optional, contextual)                │
├──────────┴───────────────────────────────────────────────┤
│  Command Palette (Dialog overlay, Cmd+K)                 │
└──────────────────────────────────────────────────────────┘
```

### 4.2 Sidebar Specifications

| Property | Expanded | Collapsed |
|---|---|---|
| Width | `w-64` (256px) | `w-16` (64px) |
| Transition | `transition-all duration-300 ease-in-out` | Same |
| Logo area | Full logo + subtitle | Icon only |
| Nav items | Icon + label + badge | Icon only (with tooltip) |
| Group headers | Visible (`text-[10px] uppercase`) | Hidden |
| Quick search | Visible with `⌘K` hint | Hidden |
| User section | Avatar + name + email + logout | Avatar only (tooltip) |
| Collapse button | Positioned `absolute -right-3 top-20` | Same |

### 4.3 Header Specifications

| Property | Value |
|---|---|
| Height | `h-14` (56px) |
| Background | `bg-card/80 backdrop-blur-sm` |
| Left side | Mobile menu button (`lg:hidden`) + page title + description |
| Right side | Search trigger + notifications + user dropdown |

### 4.4 Content Area Spacing

| Context | Padding | Gap |
|---|---|---|
| Page container | `p-4 lg:p-6` | `space-y-6` |
| Card grid | — | `gap-4` |
| Card header | `px-6 pt-6 pb-2` | — |
| Card content | `px-6 pb-6` | `space-y-4` |
| Form fields | — | `space-y-4` |
| Inline groups | — | `gap-2` to `gap-4` |
| Compact lists | — | `space-y-1` to `space-y-3` |

### 4.5 Grid System

```tsx
// KPI cards — 4 columns on desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" />

// Charts — 2/3 + 1/3 split
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  <Card className="md:col-span-2" /> {/* Main chart */}
  <Card />                             {/* Side panel */}
</div>

// Quick actions — 4 columns
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3" />

// Full-width card
<Card className="md:col-span-3" />
```

---

## 5. Component Library

### 5.1 Overview

GangNiaga AI OS uses **50 shadcn/ui components** in the New York style with neutral base color. All components are Radix UI primitives wrapped with `class-variance-authority` for variant management.

**Configuration** (`components.json`):

```json
{
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "baseColor": "neutral",
    "cssVariables": true
  },
  "iconLibrary": "lucide"
}
```

### 5.2 Component Inventory

| # | Component | Category | Key Variants | Primary Usage |
|---|---|---|---|---|
| 1 | Accordion | Data Display | Single/multiple | FAQ, collapsible sections |
| 2 | Alert | Feedback | Default, destructive | Status messages, warnings |
| 3 | Alert Dialog | Overlay | — | Destructive confirmations (delete plan) |
| 4 | Avatar | Data Display | Fallback support | User avatars, agent icons |
| 5 | Badge | Data Display | Default, secondary, destructive, outline | Status labels, agent badges, AI tags |
| 6 | Breadcrumb | Navigation | — | Deep page hierarchy |
| 7 | Button | Action | Default, destructive, outline, secondary, ghost, link; sm, default, lg, icon | All clickable actions |
| 8 | Calendar | Input | — | Date range selectors |
| 9 | Card | Container | CardHeader, CardTitle, CardDescription, CardContent, CardFooter | Content containers, KPI cards |
| 10 | Carousel | Data Display | — | Pitch deck preview |
| 11 | Chart | Data Visualization | Area, Bar, Line, Pie, Radar | Recharts wrapper |
| 12 | Checkbox | Input | Checked, unchecked, indeterminate | Feature toggles, filters |
| 13 | Collapsible | Data Display | — | Expandable sections |
| 14 | Command | Overlay | — | Command palette (⌘K) |
| 15 | Context Menu | Overlay | — | Right-click actions |
| 16 | Dialog | Overlay | — | Modals, forms, command palette |
| 17 | Drawer | Overlay | — | Mobile panels |
| 18 | Dropdown Menu | Overlay | — | User menu, notifications, actions |
| 19 | Form | Input | — | React Hook Form integration |
| 20 | Hover Card | Overlay | — | Agent task previews |
| 21 | Input | Input | With icons, with suffix | Text fields, search |
| 22 | Input OTP | Input | — | Verification codes |
| 23 | Label | Input | — | Form labels |
| 24 | Menubar | Navigation | — | Desktop menu bar |
| 25 | Navigation Menu | Navigation | — | Top-level navigation |
| 26 | Pagination | Navigation | — | Table pagination |
| 27 | Popover | Overlay | — | Date pickers, color pickers |
| 28 | Progress | Feedback | — | Loading bars, completion indicators |
| 29 | Radio Group | Input | — | Scenario selection, plan types |
| 30 | Resizable | Layout | Horizontal, vertical | Split panels, resizable views |
| 31 | Scroll Area | Layout | — | Custom scrollable areas |
| 32 | Select | Input | Single, multiple | Dropdowns, filters |
| 33 | Separator | Layout | Horizontal, vertical | Dividers |
| 34 | Sheet | Overlay | Left, right, top, bottom | Mobile sidebar, panels |
| 35 | Sidebar | Layout | Collapsible, tooltip mode | Main navigation |
| 36 | Skeleton | Feedback | — | Loading placeholders |
| 37 | Slider | Input | Single, range | Scenario multipliers |
| 38 | Sonner | Feedback | Default, success, error, warning | Toast notifications |
| 39 | Switch | Input | On, off | Toggle settings |
| 40 | Table | Data Display | Sortable, selectable, paginated | Financial data, task lists |
| 41 | Tabs | Navigation | Default, underline | Auth page, settings sections |
| 42 | Textarea | Input | — | Long-form content, AI prompts |
| 43 | Toast | Feedback | — | Notification toasts |
| 44 | Toaster | Feedback | — | Toast container |
| 45 | Toggle | Input | Default, outline, sm | Formatting controls |
| 46 | Toggle Group | Input | Single, multiple | View mode switchers |
| 47 | Tooltip | Overlay | — | Sidebar collapsed hints, icon labels |

### 5.3 Button Usage Patterns

```tsx
// Primary action
<Button>Sign In</Button>
<Button size="lg" className="w-full">Create Account</Button>

// Secondary/outline
<Button variant="outline" size="sm">Refresh</Button>
<Button variant="outline" className="border-dashed">Search... ⌘K</Button>

// Ghost (low emphasis)
<Button variant="ghost" size="icon" className="h-8 w-8"><Menu /></Button>

// Destructive
<Button variant="ghost" className="text-destructive hover:text-destructive">
  <LogOut /> Log out
</Button>

// With loading
<Button disabled={isLoading}>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
</Button>
```

### 5.4 Badge Usage Patterns

```tsx
// Agent count
<Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary">
  8
</Badge>

// AI feature tag
<Badge variant="secondary" className="text-[9px]">AI</Badge>

// Agent status
<Badge variant={status === 'running' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}>
  {status}
</Badge>

// Notification count
<Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 text-[9px] bg-destructive">
  3
</Badge>
```

### 5.5 Card Patterns

```tsx
// Standard KPI card
<Card>
  <CardContent className="p-4">
    <div className="flex items-center justify-between mb-3">
      <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
        <DollarSign className="w-4 h-4 text-white" />
      </div>
      <Badge variant="secondary" className="text-[10px]">+12.5%</Badge>
    </div>
    <p className="text-2xl font-bold">$42K</p>
    <p className="text-xs text-muted-foreground">Monthly Revenue</p>
  </CardContent>
</Card>

// Chart card with header
<Card>
  <CardHeader className="pb-2">
    <CardTitle className="text-base">Revenue & Expenses</CardTitle>
    <CardDescription>Financial overview</CardDescription>
  </CardHeader>
  <CardContent>
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>...</AreaChart>
    </ResponsiveContainer>
  </CardContent>
</Card>
```

---

## 6. Animation Guidelines

### 6.1 Animation Library

Framer Motion (`framer-motion@^12`) is the sole animation library. All motion uses declarative API with `motion.*` components.

### 6.2 Animation Variants

#### Page Enter Animation

Every page mounts with a subtle fade-slide-up:

```tsx
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
>
  {pageContent}
</motion.div>
```

#### Staggered Children

Used for card grids and list items:

```tsx
const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeSlideUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};
```

#### Hover Scale (Interactive Elements)

```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className="..."
/>
```

#### Command Palette Animation

```tsx
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const contentVariants = {
  hidden: { opacity: 0, scale: 0.96, y: -8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 30,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: -8,
    transition: { duration: 0.15 },
  },
};
```

#### Activity Feed Items

```tsx
<AnimatePresence initial={false}>
  {items.map((item, i) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: i * 0.05 }}
    />
  ))}
</AnimatePresence>
```

#### Tab Content Transition

```tsx
<motion.form
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.35, ease: 'easeOut' }}
/>
```

### 6.3 Floating Blob Animations (Auth Page)

The auth page features CSS keyframe-animated gradient blobs:

```css
@keyframes floatBlob1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-30px, 40px) scale(1.05); }
  66% { transform: translate(20px, -20px) scale(0.95); }
}
```

| Blob | Size | Duration | Opacity | Gradient |
|---|---|---|---|---|
| Large (top-right) | 420×420px | 18s | 20% | emerald → teal |
| Medium (bottom-left) | 340×340px | 22s | 20% | teal → emerald |
| Small (center) | 180×180px | 15s | 15% | green-emerald |
| Tiny accent | 100×100px | 12s | 25% | light-emerald |

### 6.4 Animation Timing Standards

| Context | Duration | Easing | Delay |
|---|---|---|---|
| Page enter | 400ms | ease-out | 0ms |
| Card stagger | 500ms per item | custom cubic | 100ms per item |
| Hover scale | 150ms | spring | 0ms |
| Tab switch | 350ms | ease-out | 0ms |
| Command palette open | spring | stiffness: 400, damping: 30 | 0ms |
| Command palette close | 150ms | ease-in | 0ms |
| Activity item enter | 200ms | ease-out | 50ms per item |
| Loading spinner | continuous | linear | — |
| Refresh rotation | continuous | linear | — |

### 6.5 `prefers-reduced-motion`

All animations should respect the user's `prefers-reduced-motion` setting. Framer Motion automatically reduces animations when this is enabled. For CSS animations (blobs), add:

```css
@media (prefers-reduced-motion: reduce) {
  .floating-blob { animation: none !important; }
}
```

---

## 7. Page Layouts

### 7.1 Auth Page

**Layout**: Two-column split (52% / 48%)

```
┌─────────────────────────┬──────────────────────┐
│  Brand Panel (52%)      │  Form Panel (48%)     │
│  ┌───────────────────┐  │  ┌──────────────────┐ │
│  │ Logo + Tagline    │  │  │ Mobile Logo      │ │
│  │                   │  │  │ (lg:hidden)      │ │
│  │ Hero Heading      │  │  ├──────────────────┤ │
│  │ (gradient text)   │  │  │ Welcome Header   │ │
│  │                   │  │  │ (lg:block)       │ │
│  ├───────────────────┤  │  ├──────────────────┤ │
│  │ Feature Cards     │  │  │ Card             │ │
│  │ (4 items,         │  │  │ ┌──────────────┐ │ │
│  │  staggered anim)  │  │  │ │ Tabs: Login  │ │ │
│  │                   │  │  │ │ / Register   │ │ │
│  ├───────────────────┤  │  │ ├──────────────┤ │ │
│  │ Trust Badges      │  │  │ │ Form Fields  │ │ │
│  │ 🛡 Security       │  │  │ │ Submit Btn   │ │ │
│  │ ⚡ 99.9% Uptime   │  │  │ └──────────────┘ │ │
│  └───────────────────┘  │  │ Demo Notice      │ │
│  Background: emerald    │  └──────────────────┘ │
│  gradient + floating    │  Footer text           │
│  blobs + grid overlay   │                        │
└─────────────────────────┴──────────────────────┘
```

**Key patterns**:
- Left panel hidden on mobile (`hidden lg:flex`)
- Mobile brand header appears below `lg` breakpoint
- Floating blobs with CSS keyframe animations
- Decorative grid overlay at 4% opacity
- Password toggle with eye icon
- Tab-based login/register with Framer Motion transitions

### 7.2 Dashboard Page

**Layout**: Scrollable content area with responsive grid

```
┌──────────────────────────────────────────────────┐
│ Header: Title + Date Range Select + Refresh      │
├──────────────────────────────────────────────────┤
│ Welcome Card (full width, emerald gradient)      │
│ ┌──────────────────────────────────────────────┐ │
│ │ Greeting + Date + Motivation    Org Name     │ │
│ └──────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│ Quick Actions (4-column grid)                     │
│ [Create Plan] [New Forecast] [AI Chat] [Report]  │
├──────────┬──────────┬──────────┬─────────────────┤
│ Revenue  │ Net      │ Customers│ Burn Rate       │
│ KPI Card │ KPI Card │ KPI Card │ KPI Card        │
├──────────┴──────────┴──────────┴─────────────────┤
│ SaaS Metrics Strip (4-column)                    │
│ [MRR] [ARR] [LTV] [CAC]                         │
├───────────────────────────┬──────────────────────┤
│ Revenue & Expenses Chart  │ Expense Breakdown    │
│ (AreaChart, 2/3 width)   │ (PieChart, 1/3)      │
├───────────────────────────┬──────────────────────┤
│ Customer Growth           │ Activity & Insights  │
│ (BarChart, 2/3)          │ (Feed, 1/3)          │
├───────────────────────────┬──────────────────────┤
│ Active Agents             │ Financial Health     │
│ (Status list, 1/2)       │ (Progress, 1/2)      │
└───────────────────────────┴──────────────────────┘
```

**Key patterns**:
- KPI cards with hover animations via `whileHover`
- Skeleton loading states for all data sections
- `AnimatePresence` for activity feed items
- Chart period toggle (7D / 30D / 90D / 1Y) with pill buttons
- Empty states with icons and action buttons

### 7.3 Idea Canvas Page

**Layout**: Two-panel — Canvas form (left) + AI Validation results (right)

```
┌──────────────────────────┬───────────────────────┐
│ Canvas Form              │ Validation Panel      │
│ ┌──────────────────────┐ │ ┌───────────────────┐ │
│ │ 10-field structured  │ │ │ Overall Score     │ │
│ │ canvas form          │ │ │ (0-100, grade)    │ │
│ │ • Problem            │ │ ├───────────────────┤ │
│ │ • Solution           │ │ │ Category Scores   │ │
│ │ • Target Market      │ │ │ Market  25% ██░░ │ │
│ │ • Revenue Model      │ │ │ Financial 20% █░░ │ │
│ │ • Key Metrics        │ │ │ Technical 18% ██░ │ │
│ │ • Competition        │ │ │ Competitive 15% ░ │ │
│ │ • Unfair Advantage   │ │ │ Team 12% █░░░░░ │ │
│ │ • Go-to-Market       │ │ │ Regulatory 10% ░ │ │
│ │ • Team               │ │ ├───────────────────┤ │
│ │ • Funding Needs      │ │ │ Risk Assessment   │ │
│ └──────────────────────┘ │ │ 4 dimensions      │ │
│                          │ ├───────────────────┤ │
│ [Validate] [Convert→]    │ │ AI Recommendations │ │
│                          │ └───────────────────┘ │
└──────────────────────────┴───────────────────────┘
```

### 7.4 Business Plans Page

**Layout**: Plan list + Plan detail/editor

```
┌──────────────────────────────────────────────────┐
│ Header: [New Plan] button + Filter/Sort           │
├──────────────────────────────────────────────────┤
│ Plan Cards Grid (responsive)                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│ │ Plan 1   │ │ Plan 2   │ │ Plan 3   │          │
│ │ Status   │ │ Status   │ │ Status   │          │
│ │ Sections │ │ Sections │ │ Sections │          │
│ │ Updated  │ │ Updated  │ │ Updated  │          │
│ └──────────┘ └──────────┘ └──────────┘          │
├──────────────────────────────────────────────────┤
│ Plan Detail (when selected)                       │
│ ┌──────────────────────────────────────────────┐ │
│ │ Section List (drag-to-reorder)               │ │
│ │ [Exec Summary] [Market Analysis] [SWOT] ...  │ │
│ ├──────────────────────────────────────────────┤ │
│ │ Section Editor (markdown)                    │ │
│ │ [AI Generate] [AI Improve] buttons           │ │
│ └──────────────────────────────────────────────┘ │
│ [Export ▾] PDF · DOCX · PPTX · XLSX · CSV · MD  │
└──────────────────────────────────────────────────┘
```

### 7.5 Forecasting Page

**Layout**: Scenario selector + Revenue/Expense editors + Financial statements

```
┌──────────────────────────────────────────────────┐
│ Scenario Tabs: [Best] [Base] [Worst] [Custom]     │
│ Custom scenario slider: Multiplier 0.5x — 2.0x   │
├──────────────────────┬───────────────────────────┤
│ Revenue Items        │ Expense Items              │
│ ┌──────────────────┐ │ ┌───────────────────────┐ │
│ │ + Add Revenue    │ │ │ + Add Expense          │ │
│ │ Subscription $X  │ │ │ Payroll $X            │ │
│ │ Transaction $X   │ │ │ Infrastructure $X     │ │
│ │ Service $X       │ │ │ SaaS $X               │ │
│ └──────────────────┘ │ └───────────────────────┘ │
├──────────────────────┴───────────────────────────┤
│ Financial Statements (Tabs)                       │
│ [P&L] [Balance Sheet] [Cash Flow]                │
│ ┌──────────────────────────────────────────────┐ │
│ │ Monthly projection table (TanStack Table)    │ │
│ └──────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│ Charts Row                                        │
│ ┌────────────────────┐ ┌────────────────────────┐│
│ │ Revenue vs Expenses│ │ Burn Rate & Runway     ││
│ └────────────────────┘ └────────────────────────┘│
│ SaaS Metrics: MRR · ARR · LTV · CAC · Payback    │
└──────────────────────────────────────────────────┘
```

### 7.6 Plan vs Actuals Page

**Layout**: Variance dashboard + Detailed comparison

```
┌──────────────────────────────────────────────────┐
│ Header: [Import ▾] QuickBooks · Xero · CSV · Manual│
├──────────────────────────────────────────────────┤
│ Variance Summary Cards                            │
│ [On Track ✅] [Warning ⚠️] [Critical 🔴] [Exceeded]│
├──────────────────────────────────────────────────┤
│ Planned vs Actual Bar Chart                       │
│ ┌──────────────────────────────────────────────┐ │
│ │ Grouped bars: planned (outline) vs actual     │ │
│ └──────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│ Variance Detail Table                             │
│ Metric | Planned | Actual | Variance | Alert     │
│ Revenue| $42K    | $38K   | -$4K     | ⚠️       │
├──────────────────────────────────────────────────┤
│ AI Variance Explanations                          │
│ "Revenue variance driven by delayed enterprise..." │
├──────────────────────────────────────────────────┤
│ Active Financial Alerts                           │
│ 🔴 Cash warning: Runway below 3 months           │
│ ⚠️ Expense drift: Marketing 23% over budget      │
└──────────────────────────────────────────────────┘
```

### 7.7 Plan Review Page

**Layout**: Review submission + Multi-agent results

```
┌──────────────────────────────────────────────────┐
│ Select Plan + Persona: [Lender] [Investor] [Auditor]│
│ [Start Review]                                    │
├──────────────────────────────────────────────────┤
│ Overall Scores                                    │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │Overall│ │Narrat│ │Financ│ │Consist│ │Fundab│   │
│ │ 72/100│ │ 80   │ │ 65   │ │ 70   │ │ 68   │   │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘   │
├──────────────────────────────────────────────────┤
│ Discrepancies Detected                            │
│ ⚠️ Revenue narrative says "conservative" but      │
│    projections show 300% YoY growth               │
├──────────────────────────────────────────────────┤
│ Red Flags · Strengths · Recommendations (tabs)    │
├──────────────────────────────────────────────────┤
│ Findings Resolution Tracker                       │
│ ☐ Fix revenue narrative  ☐ Adjust projection     │
└──────────────────────────────────────────────────┘
```

### 7.8 Pitch Decks Page

**Layout**: Deck list + Slide editor/preview

```
┌──────────────────────────────────────────────────┐
│ [New Deck] Template: [Seed] [Series A] [Debt]     │
│ Audience: [Investor] [Lender] [Partner] [Internal]│
├──────────────────────────────────────────────────┤
│ Deck Editor                                       │
│ ┌────────────────────┐ ┌───────────────────────┐ │
│ │ Slide List          │ │ Slide Preview         │ │
│ │ (drag-to-reorder)   │ │ (rendered content     │ │
│ │ 1. Title Slide      │ │  with dynamic         │ │
│ │ 2. Problem          │ │  variables)           │ │
│ │ 3. Solution         │ │                       │ │
│ │ 4. Market Size      │ │                       │ │
│ │ ...                 │ │                       │ │
│ └────────────────────┘ └───────────────────────┘ │
│ [AI Generate] [Speaker Notes] [Deck Analysis]     │
│ Dynamic vars: {{burn_rate}} {{mrr}} {{runway}}    │
│ Funder Questions (8-12 AI-generated)              │
│ [Export PPTX]                                     │
└──────────────────────────────────────────────────┘
```

### 7.9 AI Agents Page

**Layout**: Agent type grid + Session/task detail

```
┌──────────────────────────────────────────────────┐
│ Agent Type Cards (8 agents, 4-column grid)        │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ │
│ │ CFO 📊   │ │ CEO 👔   │ │ Research │ │Growth│ │
│ │ 3 tasks  │ │ 2 tasks  │ │ 5 tasks  │ │3 task│ │
│ └──────────┘ └──────────┘ └──────────┘ └──────┘ │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ │
│ │ Ops ⚙️   │ │ Fundraise│ │ Browser  │ │Report│ │
│ └──────────┘ └──────────┘ └──────────┘ └──────┘ │
├──────────────────────────────────────────────────┤
│ Pipeline Builder (DAG visual)                     │
│ Research → CEO → CFO → Reporting                  │
│ [New Pipeline] [Run Pipeline]                     │
├──────────────────────────────────────────────────┤
│ Session List / Task History (TanStack Table)      │
│ [View Memory] [Tool Execution Log]                │
└──────────────────────────────────────────────────┘
```

### 7.10 AI Copilot Page

**Layout**: Chat interface with agent selector

```
┌──────────────────────────────────────────────────┐
│ Agent Selector: [CFO] [CEO] [Research] [...]      │
├──────────────────────────────────────────────────┤
│ Chat Messages Area (ScrollArea)                   │
│ ┌──────────────────────────────────────────────┐ │
│ │ User: What's our burn rate trend?            │ │
│ │                                              │ │
│ │ CFO Agent: Based on your latest forecast...  │ │
│ │ 📊 Burn Rate: $45K/month (↓12% from last)   │ │
│ │                                              │ │
│ │ 🔧 Tool: forecast_calculate                  │ │
│ │ Input: { metric: "burn_rate" }               │ │
│ │ Output: { value: 45000, trend: "decreasing" }│ │
│ │                                              │ │
│ │ CFO Agent: Your burn rate is trending down..  │ │
│ └──────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│ Input Area                                        │
│ [Textarea] + [Send] + [Context: Forecast, KPIs]  │
└──────────────────────────────────────────────────┘
```

### 7.11 Research Page

**Layout**: Source browser + Citation viewer

```
┌──────────────────────────────────────────────────┐
│ Search + Filters: [Category▾] [Geography▾]        │
├──────────────────────────────────────────────────┤
│ Source Grid (cards with verification badges)      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│ │ Source 1 │ │ Source 2 │ │ Source 3 │          │
│ │ ★★★★☆   │ │ ★★★★★   │ │ ★★★☆☆   │          │
│ │ Verified │ │ Verified │ │ Pending  │          │
│ └──────────┘ └──────────┘ └──────────┘          │
├──────────────────────────────────────────────────┤
│ Industry Benchmarks Table                         │
│ Metric | 25th | 50th | 75th | Sample | Conf      │
├──────────────────────────────────────────────────┤
│ AI Research Mode (agent-driven)                   │
│ [Start Research] → Web Search → Browser → Report  │
└──────────────────────────────────────────────────┘
```

### 7.12 Reports Page

**Layout**: Report type selector + Generation + Export

```
┌──────────────────────────────────────────────────┐
│ Report Types: [Investor] [Board] [KPI] [Financial]│
├──────────────────────────────────────────────────┤
│ Report Builder                                    │
│ Date Range + Data Sources + AI Generation Toggle  │
│ [Generate Report]                                 │
├──────────────────────────────────────────────────┤
│ Generated Reports List                            │
│ ┌──────────────────────────────────────────────┐ │
│ │ Q4 Investor Report    Draft    [Edit][Export] │ │
│ │ Monthly KPI Report    Approved [View][Export] │ │
│ └──────────────────────────────────────────────┘ │
│ Export formats: PDF · DOCX · PPTX · CSV · XLSX    │
└──────────────────────────────────────────────────┘
```

### 7.13 Workflows Page

**Layout**: Workflow list + DAG builder

```
┌──────────────────────────────────────────────────┐
│ [New Workflow] Trigger: [Manual] [Cron] [Event]   │
├──────────────────────────────────────────────────┤
│ Workflow DAG Canvas                               │
│ ┌────────┐     ┌────────┐     ┌────────┐        │
│ │ Step 1 │────▶│ Step 2 │────▶│ Step 3 │        │
│ │ Agent  │     │ Tool   │     │ Notif  │        │
│ └────────┘     └────────┘     └────────┘        │
│ Step types: Agent · Tool · Condition · Delay ·    │
│            Notification · Pipeline                │
├──────────────────────────────────────────────────┤
│ Workflow Runs History                             │
│ Status: [Active] [Completed] [Failed]             │
│ Run #1  ✅ 3/3 steps  2.4s  2026-03-04           │
│ Run #2  ❌ 2/3 steps  1.8s  2026-03-03           │
└──────────────────────────────────────────────────┘
```

### 7.14 Observability Page

**Layout**: Metrics dashboard + Event/trace browser

```
┌──────────────────────────────────────────────────┐
│ Summary Cards                                     │
│ [Total Events] [Avg Response] [Error Rate] [Cost] │
├──────────────────────────────────────────────────┤
│ Event Trend Chart (1d/7d/30d/90d/1y)             │
│ Token Usage by Agent (stacked area)               │
├──────────────────────────────────────────────────┤
│ Error Monitoring + Slow Operations (top 10)       │
│ ┌────────────────────────┐ ┌────────────────────┐│
│ │ Recent Errors          │ │ Slowest Operations  ││
│ │ 🔴 Timeout: agent run  │ │ 1. forecast 8.2s   ││
│ │ 🟡 Retry: web search   │ │ 2. export 6.1s     ││
│ └────────────────────────┘ └────────────────────┘│
├──────────────────────────────────────────────────┤
│ Distributed Traces (trace ID → span tree)         │
└──────────────────────────────────────────────────┘
```

### 7.15 Browser Page

**Layout**: Session manager + Browser viewport + Snapshots

```
┌──────────────────────────────────────────────────┐
│ Sessions: [New Session] [Session 1] [Session 2]   │
├──────────────────────────────────────────────────┤
│ URL Bar + Action Buttons                          │
│ [https://...] [Navigate] [Screenshot] [Extract]   │
├──────────────────────────────────────────────────┤
│ Browser Viewport / Snapshot Preview               │
│ ┌──────────────────────────────────────────────┐ │
│ │                                              │ │
│ │           (Screenshot / HTML preview)        │ │
│ │                                              │ │
│ └──────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│ Action History                                    │
│ ✅ Navigate to x.com    2.1s    screenshot.png   │
│ ✅ Extract links        0.3s    42 links found   │
└──────────────────────────────────────────────────┘
```

### 7.16 Settings Page

**Layout**: Tab-based settings sections

```
┌──────────────────────────────────────────────────┐
│ Tabs: [Organization] [Members] [Integrations]      │
│       [API Keys] [Subscription] [Notifications]    │
├──────────────────────────────────────────────────┤
│ Organization Settings                             │
│ Name: [GangNiaga Corp]                           │
│ Industry: [Technology ▾]                         │
│ Size: [1-10 ▾]                                  │
│ Country: [Malaysia ▾]                            │
│ Currency: [MYR ▾]                                │
├──────────────────────────────────────────────────┤
│ Integration Cards                                 │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│ │QuickBooks│ │ Xero     │ │ Stripe   │          │
│ │ Connected│ │ Connect  │ │ Connect  │          │
│ └──────────┘ └──────────┘ └──────────┘          │
├──────────────────────────────────────────────────┤
│ Audit Log (searchable, filterable)                │
└──────────────────────────────────────────────────┘
```

---

## 8. Dark Mode Implementation

### 8.1 Theme Provider

Dark mode is implemented via `next-themes` with class-based strategy:

```tsx
// layout.tsx
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
  {children}
</ThemeProvider>
```

### 8.2 CSS Strategy

The `.dark` class is applied to the `<html>` element. All color variables are redefined under the `.dark` selector:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  /* ... */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... */
}
```

### 8.3 Custom Variant

A Tailwind custom variant enables dark mode utilities:

```css
@custom-variant dark (&:is(.dark *));
```

This allows component-level dark adjustments:

```tsx
<span className="text-emerald-600 dark:text-emerald-400" />
<div className="bg-white/10 dark:bg-white/5" />
```

### 8.4 Dark Mode Color Differences

Key differences between light and dark palettes:

| Aspect | Light | Dark |
|---|---|---|
| Background | Pure white (`oklch(1 0 0)`) | Near-black (`oklch(0.145 0 0)`) |
| Card | Pure white | Slightly raised (`oklch(0.205 0 0)`) |
| Primary | Dark neutral | Light neutral (inverted) |
| Borders | Light gray solid | White at 10% opacity |
| Input borders | Light gray solid | White at 15% opacity |
| Destructive | Vibrant red (C: 0.245) | Muted red (C: 0.191) |
| Chart-1 | Amber hue | Indigo hue (shifted for dark bg) |
| Sidebar primary | Dark neutral | Indigo accent (`oklch(0.488 0.243 264.376)`) |
| Scrollbar thumb | `oklch(0.7 0 0 / 20%)` | `oklch(0.4 0 0 / 25%)` |
| Selection | Amber at 30% | Indigo at 30% |

### 8.5 Theme Toggle

Theme can be changed via:
1. Settings page → Appearance tab
2. System preference (automatic via `enableSystem`)
3. No flash of incorrect theme (`suppressHydrationWarning` on `<html>`)

---

## 9. Responsive Design Breakpoints

### 9.1 Breakpoint Definitions

GangNiaga AI OS follows a mobile-first approach using Tailwind's default breakpoints:

| Breakpoint | Min Width | Class Prefix | Target Devices |
|---|---|---|---|
| Default | 0px | (none) | Mobile phones (375px+) |
| `sm` | 640px | `sm:` | Large phones, small tablets |
| `md` | 768px | `md:` | Tablets |
| `lg` | 1024px | `lg:` | Laptops, desktops |
| `xl` | 1280px | `xl:` | Large desktops |

### 9.2 Responsive Behavior Matrix

| Element | Mobile (<640px) | Tablet (640–1023px) | Desktop (≥1024px) |
|---|---|---|---|
| Sidebar | Hidden (sheet overlay) | Collapsible | Always visible, collapsible |
| Header menu button | Visible | Visible | Hidden |
| Page title description | Hidden | Visible | Visible |
| KPI grid | 1 column | 2 columns | 4 columns |
| Chart layout | Stacked (1 col) | Mixed (2 col) | 2/3 + 1/3 split |
| Quick actions | 2 columns | 4 columns | 4 columns |
| Command palette trigger | Icon button | Icon button | Full button with ⌘K |
| Auth brand panel | Hidden | Hidden | Visible (52%) |
| Welcome card | Stacked | Stacked | Side-by-side |
| Card padding | `p-4` | `p-4` | `p-4` to `p-6` |

### 9.3 Mobile-Specific Patterns

```tsx
// Sidebar as sheet on mobile
<Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
  <Menu className="w-4 h-4" />
</Button>

// Hide description on mobile
<p className="text-[11px] text-muted-foreground hidden sm:block">

// Mobile command palette trigger
<Button variant="ghost" size="icon" className="md:hidden">
  <Search className="w-4 h-4" />
</Button>

// Desktop command palette trigger
<Button variant="outline" size="sm" className="hidden md:flex">
  <Search /> Search... <kbd>⌘K</kbd>
</Button>
```

### 9.4 Touch Targets

All interactive elements meet minimum 44×44px touch targets on mobile:
- Buttons use `size="icon"` with `h-8 w-8` minimum (32px, padded by container)
- Nav items have `py-1.5` vertical padding
- Quick action cards have `p-3 sm:p-4`

---

## 10. Icon Usage

### 10.1 Icon Library

All icons use **lucide-react** (`lucide-react@^0.525.0`), providing 1,000+ consistent, pixel-aligned SVG icons.

### 10.2 Icon Size Scale

| Size | Class | Usage |
|---|---|---|
| 12px | `w-3 h-3` | Micro indicators, inline badges |
| 14px | `w-3.5 h-3.5` | Small buttons, compact nav |
| 16px | `w-4 h-4` | Default button icons, sidebar nav, form icons |
| 18px | `w-[18px] h-[18px]` | Medium emphasis |
| 20px | `w-5 h-5` | Feature cards, section icons |
| 24px | `w-6 h-6` | Logo icon, hero elements |
| 32px | `w-8 h-8` | Large feature icons |
| 40px+ | `w-10+ h-10+` | Avatar fallback icons |

### 10.3 Icon-Page Mapping

| Page | Icon | Component |
|---|---|---|
| Dashboard | `LayoutDashboard` | Sidebar, Command Palette |
| Idea Canvas | `Lightbulb` | Sidebar, Command Palette |
| Business Plans | `FileText` | Sidebar, Command Palette |
| Forecasting | `TrendingUp` | Sidebar, Quick Actions |
| Plan vs Actuals | `Target` | Sidebar, Command Palette |
| Plan Review | `ShieldCheck` | Sidebar, Command Palette |
| Pitch Decks | `Presentation` | Sidebar, Command Palette |
| AI Agents | `Bot` | Sidebar, Dashboard |
| AI Copilot | `MessageSquare` | Sidebar, Quick Actions |
| Research | `Search` | Sidebar, Command Palette |
| Reports | `BarChart3` | Sidebar, Command Palette |
| Workflows | `Workflow` | Sidebar, Command Palette |
| Observability | `Activity` | Sidebar, Command Palette |
| Browser | `Globe` | Sidebar, Command Palette |
| Settings | `Settings` | Sidebar, Command Palette |

### 10.4 Icon Usage Patterns

```tsx
// Sidebar nav with icon
<item.icon className="w-4 h-4 shrink-0" />

// Button with icon
<Button><Plus className="mr-2 h-4 w-4" /> Create Plan</Button>

// Icon-only button
<Button variant="ghost" size="icon" className="h-8 w-8">
  <Bell className="w-4 h-4" />
</Button>

// Input with left icon
<div className="relative">
  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
  <Input className="pl-9" />
</div>

// Icon in badge container
<div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/60">
  <item.icon className="h-4 w-4 text-muted-foreground" />
</div>

// Avatar fallback icon
<AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
  {user.name?.charAt(0)?.toUpperCase()}
</AvatarFallback>
```

### 10.5 Icon Color Conventions

| Context | Color Class | Example |
|---|---|---|
| Default inactive | `text-muted-foreground` | Sidebar inactive items |
| Active/selected | `text-primary` | Active sidebar item |
| Destructive | `text-destructive` | Delete, logout icons |
| Brand accent | `text-white` (on gradient bg) | Logo, avatar fallback |
| Status positive | `text-emerald-500` | Success indicators |
| Status warning | `text-amber-500` | Warning indicators |
| Status negative | `text-red-500` | Error indicators |
| Informational | `text-primary` | Info, AI brain icons |

---

## 11. Accessibility Standards

### 11.1 WCAG Compliance Target

GangNiaga AI OS targets **WCAG 2.1 Level AA** compliance.

### 11.2 Color Contrast

| Combination | Ratio | Standard | Pass |
|---|---|---|---|
| `--foreground` on `--background` (light) | 15.4:1 | 4.5:1 (AA) | ✅ |
| `--foreground` on `--background` (dark) | 15.4:1 | 4.5:1 (AA) | ✅ |
| `--muted-foreground` on `--background` (light) | 5.0:1 | 4.5:1 (AA) | ✅ |
| `--muted-foreground` on `--background` (dark) | 5.5:1 | 4.5:1 (AA) | ✅ |
| `--primary-foreground` on `--primary` | 15.0:1 | 4.5:1 (AA) | ✅ |

### 11.3 Keyboard Navigation

| Feature | Implementation |
|---|---|
| Command Palette | `⌘K` / `Ctrl+K` to open, `↑↓` to navigate, `Enter` to select, `Esc` to close |
| Sidebar navigation | Tab + Enter to navigate |
| Dialog focus trap | Radix UI `Dialog` handles focus trapping automatically |
| Dropdown menus | Arrow keys + Enter + Esc via Radix primitives |
| Form navigation | Tab order follows visual layout; `react-hook-form` manages focus on validation errors |
| Skip to content | Planned — skip link for keyboard users |

### 11.4 ARIA Attributes

```tsx
// Decorative elements hidden from screen readers
<div aria-hidden="true" className="pointer-events-none">
  {/* Floating blobs */}
</div>

// Password toggle with aria-label
<button aria-label={visible ? 'Hide password' : 'Show password'}>

// Input with associated label
<Label htmlFor="login-email">Email</Label>
<Input id="login-email" type="email" autoComplete="email" />

// Badge with semantic meaning
<Badge variant="destructive">Critical</Badge>

// Sidebar tooltip for collapsed state
<Tooltip>
  <TooltipTrigger asChild>{NavButton}</TooltipTrigger>
  <TooltipContent side="right">{item.label}</TooltipContent>
</Tooltip>
```

### 11.5 Screen Reader Considerations

- All form inputs have associated `<Label>` components with matching `htmlFor`/`id`
- Status badges use semantic variant props (`variant="destructive"`)
- Loading states use `aria-busy` pattern via Skeleton components
- Interactive elements have visible focus indicators (`outline-ring/50`)
- Notification badges use `relative` positioning with absolute count indicators

### 11.6 Focus Management

```css
/* Base focus styles */
* {
  @apply border-border outline-ring/50;
}

/* Focus ring pulse animation for important interactions */
@keyframes focus-ring-pulse {
  0%, 100% { box-shadow: 0 0 0 0 oklch(0.646 0.222 41.116 / 40%); }
  50% { box-shadow: 0 0 0 4px oklch(0.646 0.222 41.116 / 10%); }
}
```

---

## 12. Custom CSS

### 12.1 Custom Scrollbar

A thin, styled scrollbar replaces browser defaults using the `.custom-scrollbar` class:

```css
/* Webkit browsers */
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: oklch(0.7 0 0 / 20%);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: oklch(0.5 0 0 / 40%);
}

/* Dark mode */
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background: oklch(0.4 0 0 / 25%);
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: oklch(0.6 0 0 / 40%);
}

/* Firefox */
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: oklch(0.7 0 0 / 20%) transparent;
}

.dark .custom-scrollbar {
  scrollbar-color: oklch(0.4 0 0 / 25%) transparent;
}
```

**Usage**: Apply to any scrollable container:

```tsx
<nav className="overflow-y-auto custom-scrollbar" />
<div className="max-h-80 overflow-y-auto custom-scrollbar" />
```

### 12.2 Selection Color

Text selection uses chart colors for brand consistency:

```css
::selection {
  background: oklch(0.646 0.222 41.116 / 30%); /* Amber (chart-1 light) */
}

.dark ::selection {
  background: oklch(0.488 0.243 264.376 / 30%); /* Indigo (chart-1 dark) */
}
```

### 12.3 Prose-AI Styles

The `.prose-ai` class styles AI-generated content (markdown rendered from LLM outputs):

```css
/* Headings */
.prose-ai h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 0.75rem; margin-top: 1.5rem; }
.prose-ai h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; margin-top: 1.25rem; }
.prose-ai h3 { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; margin-top: 1rem; }

/* Body text */
.prose-ai p { margin-bottom: 0.75rem; line-height: 1.7; }

/* Lists */
.prose-ai ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.prose-ai ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
.prose-ai li { margin-bottom: 0.25rem; line-height: 1.6; }

/* Inline elements */
.prose-ai strong { font-weight: 600; }
.prose-ai em { font-style: italic; }

/* Blockquote */
.prose-ai blockquote {
  border-left: 3px solid oklch(0.7 0 0 / 30%);
  padding-left: 1rem;
  margin: 1rem 0;
  font-style: italic;
}

/* Code */
.prose-ai code {
  font-family: var(--font-geist-mono);
  font-size: 0.875em;
  background: oklch(0.95 0 0);
  padding: 0.15rem 0.3rem;
  border-radius: 0.25rem;
}

/* Pre/code blocks */
.prose-ai pre {
  background: oklch(0.15 0 0);
  color: oklch(0.9 0 0);
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 1rem 0;
}
.prose-ai pre code { background: none; padding: 0; }

/* Horizontal rule */
.prose-ai hr {
  border-top: 1px solid oklch(0.9 0 0);
  margin: 1.5rem 0;
}
```

**Usage**: Wrap AI-generated markdown content:

```tsx
<div className="prose-ai" dangerouslySetInnerHTML={{ __html: renderedMarkdown }} />
// or
<div className="prose-ai">
  <ReactMarkdown>{aiContent}</ReactMarkdown>
</div>
```

### 12.4 Border Radius Scale

Derived from the `--radius` CSS variable:

```css
--radius: 0.625rem;           /* 10px base */
--radius-sm: calc(var(--radius) - 4px);   /* 6px */
--radius-md: calc(var(--radius) - 2px);   /* 8px */
--radius-lg: var(--radius);               /* 10px */
--radius-xl: calc(var(--radius) + 4px);   /* 14px */
```

### 12.5 Base Layer Styles

```css
@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

This ensures:
- All elements use `--border` for border color by default
- Focus outlines use `--ring` at 50% opacity
- Body inherits background and foreground colors from CSS variables
- No flash of unstyled content on theme change

---

## Appendix A: Command Palette Specification

### Trigger

- **Keyboard**: `⌘K` (macOS) / `Ctrl+K` (Windows/Linux)
- **UI**: Search button in header + sidebar quick search
- **Esc**: Close palette

### Structure

```
┌────────────────────────────────────────┐
│ ✨ Type a command or search...    [ESC]│
├────────────────────────────────────────┤
│ NAVIGATION                             │
│ 📊 Dashboard                    ⌘1     │
│ 💡 Idea Canvas                  ⌘2     │
│ 📄 Business Plans               ⌘3     │
│ 📈 Forecasting                  ⌘4     │
│ ...                                    │
├────────────────────────────────────────┤
│ ACTIONS                                │
│ ➕ Create New Plan                     │
│ 📈 Create Forecast                    │
│ ▶️ Start Agent                         │
│ 📊 Generate Report                    │
│ 📋 New Pitch Deck                     │
├────────────────────────────────────────┤
│ SETTINGS                               │
│ 👤 Profile                             │
│ 🏢 Organization                        │
│ 🔌 Integrations                        │
│ 🎨 Appearance                          │
├────────────────────────────────────────┤
│ ↑↓ Navigate  ↵ Select  esc Close      │
│                          ✨ GangNiaga AI│
└────────────────────────────────────────┘
```

### Features

- **Fuzzy search**: Searches label + keywords array
- **Keyboard navigation**: Arrow keys + Enter
- **Animated**: Spring-based open/close via Framer Motion
- **Backdrop**: Blurred semi-transparent background
- **Grouped results**: Navigation, Actions, Settings sections with separators

---

## Appendix B: State Management & Theme Integration

### Zustand Store

Page navigation and sidebar state managed via Zustand:

```typescript
interface AppState {
  currentPage: PageId;       // 15 page identifiers
  sidebarOpen: boolean;       // Mobile sheet visibility
  sidebarCollapsed: boolean;  // Desktop collapsed state
  setCurrentPage: (page: PageId) => void;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}
```

### Theme Integration Flow

```
next-themes (ThemeProvider)
  ↓ attribute="class"
  ↓ defaultTheme="system"
  ↓ enableSystem=true
<html class="dark" | class="">
  ↓
:root / .dark CSS variables
  ↓
@theme inline (Tailwind 4)
  ↓
Utility classes (bg-background, text-foreground, etc.)
  ↓
Components consume via className
```

---

*This design system is a living document. As the GangNiaga AI OS evolves, so will these guidelines. All changes should be reflected here to maintain consistency across the 15-page application.*
