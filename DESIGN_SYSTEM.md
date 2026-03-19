# 🎨 Hefesto Design System v2.0

**Modern SaaS UI with Antigravity Aesthetic**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Design Tokens](#design-tokens)
3. [Component Library](#component-library)
4. [Usage Guide](#usage-guide)
5. [Migration Guide](#migration-guide)
6. [Best Practices](#best-practices)

---

## 🎯 Overview

### What's New?

The Hefesto Design System v2.0 is a **complete UI/UX overhaul** designed to match industry-leading SaaS applications (Stripe, Linear, Notion, Vercel).

**Key improvements:**
- ✨ Modern, professional aesthetic
- 🎨 Consistent design tokens (colors, spacing, typography, shadows)
- 🧩 Reusable UI components with variants
- ♿ Enhanced accessibility
- 🎬 Smooth animations (Antigravity aesthetic)
- 📐 8pt spacing system
- 🌙 Optimized dark mode

### Visual Philosophy

**Antigravity Design Principles:**
- **Weightlessness**: Cards and elements float with subtle shadows
- **Spatial Depth**: 3D perspective and layering create visual hierarchy
- **Glassmorphism**: Translucent surfaces and backdrop blurs
- **Smooth Transitions**: All interactions animate smoothly (min 150ms)
- **Clean Minimalism**: Every element has purpose

---

## 🎨 Design Tokens

### Color Palette

#### Primary Colors
```css
--primary: #3B82F6;           /* Main brand blue */
--primary-hover: #2563EB;     /* Hover state */
--primary-active: #1D4ED8;    /* Active state */
--primary-light: #60A5FA;     /* Lighter variant */
--primary-muted: rgba(59, 130, 246, 0.12);    /* Background tint */
--primary-border: rgba(59, 130, 246, 0.3);    /* Border color */
```

#### Semantic Colors
```css
/* Success */
--success: #10B981;
--success-hover: #059669;
--success-muted: rgba(16, 185, 129, 0.12);

/* Danger */
--danger: #EF4444;
--danger-hover: #DC2626;
--danger-muted: rgba(239, 68, 68, 0.12);

/* Warning */
--warning: #F59E0B;
--warning-hover: #D97706;
--warning-muted: rgba(245, 158, 11, 0.12);
```

#### Backgrounds
```css
--bg-primary: #0a0a0f;        /* App background */
--bg-secondary: #12121a;      /* Sidebar */
--bg-tertiary: #1a1a26;       /* Elevated surfaces */
--bg-hover: #1f1f2e;          /* Hover state */
--bg-active: #252536;         /* Active state */

--surface-base: #14141e;      /* Card background */
--surface-elevated: #1c1c28;  /* Elevated card */
--surface-glass: rgba(20, 20, 30, 0.6);  /* Glassmorphism */
```

#### Text
```css
--text-primary: #F1F1F4;      /* Main text */
--text-secondary: #9CA3AF;    /* Secondary text */
--text-muted: #6B7280;        /* Disabled/subtle */
--text-accent: #60A5FA;       /* Accent text */
```

### Spacing System (8pt)

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
```

**Usage**: All margins, paddings, gaps use this scale.

### Border Radius

```css
--radius-xs: 4px;      /* Subtle */
--radius-sm: 8px;      /* Small elements */
--radius-md: 12px;     /* Standard (buttons, cards) */
--radius-lg: 16px;     /* Large cards */
--radius-xl: 20px;     /* Extra large */
--radius-full: 9999px; /* Fully rounded */
```

### Shadows (Elevation System)

```css
/* Subtle shadows */
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.1), ...
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1), ...
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), ...

/* Elevation layering */
--elevation-1: Basic depth
--elevation-2: Card elevation (default)
--elevation-3: Elevated surface
--elevation-4: Modal/top layer
```

### Typography

```css
/* Sizes */
--text-xs: 12px;      /* Labels, hints */
--text-sm: 14px;      /* Default body text */
--text-base: 16px;    /* Section text */
--text-lg: 18px;      /* Subheadings */
--text-2xl: 24px;     /* Headings */
--text-3xl: 30px;     /* Page titles */

/* Weights */
--fw-light: 300;
--fw-normal: 400;
--fw-medium: 500;
--fw-semibold: 600;
--fw-bold: 700;

/* Line Heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
--leading-loose: 2;
```

### Transitions

```css
--transition-xs: 100ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-sm: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-md: 250ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-lg: 350ms cubic-bezier(0.4, 0, 0.2, 1);
```

---

## 🧩 Component Library

### Button

**Variants**: `primary` | `secondary` | `ghost` | `outline` | `success` | `danger` | `warning` | `subtle`

**Sizes**: `xs` | `sm` | `md` | `lg` | `xl` | `icon` | `icon-lg`

```tsx
import { Button } from '@/components/ui';

// Primary button
<Button variant="primary" size="md">
  Save Changes
</Button>

// With icons
<Button leftIcon={<Save size={16} />}>
  Save
</Button>

// Loading state
<Button isLoading>
  Processing...
</Button>

// Ghost variant (minimal)
<Button variant="ghost">
  Cancel
</Button>
```

**States**:
- Default
- Hover (elevated shadow)
- Active (scale 95%)
- Disabled (opacity 50%)

### Card

**Variants**: `default` | `elevated` | `outline` | `glass`

```tsx
import { Card, CardHeader, CardBody, CardFooter } from '@/components/ui';

<Card variant="elevated" hover>
  <CardHeader>
    <h3>Card Title</h3>
  </CardHeader>
  <CardBody>
    Content here
  </CardBody>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

**Features**:
- Hover elevation effect
- Smooth transitions
- Built-in padding system
- Divider lines

### Badge

**Variants**: `default` | `primary` | `success` | `danger` | `warning` | `secondary`

**Sizes**: `xs` | `sm` | `md`

```tsx
import { Badge } from '@/components/ui';

<Badge variant="success" size="sm">
  ✓ Active
</Badge>

<Badge variant="danger" onRemove={() => handleRemove()}>
  Label ✕
</Badge>
```

### Input

**Variants**: `default` | `subtle`

```tsx
import { Input } from '@/components/ui';

<Input
  label="Email"
  type="email"
  placeholder="user@example.com"
  hint="Use your work email"
  icon={<Mail size={16} />}
/>

<Input
  label="Password"
  type="password"
  error="Password is required"
/>
```

### KPI

Modern KPI card component with trend indicators:

```tsx
import { KPI } from '@/components/ui';

<KPI
  title="Revenue"
  value="$45,231"
  icon={<TrendingUp size={20} />}
  trend={{ value: 12.5, isPositive: true }}
  subtitle="This month"
/>
```

---

## 💻 Usage Guide

### Applying Design Tokens

All tokens are available as CSS variables. Use them directly in your styles:

```css
.my-component {
  background: var(--surface-base);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  box-shadow: var(--elevation-2);
  color: var(--text-primary);
  transition: all var(--transition-md);
}
```

### Component Layout Pattern

```tsx
import { Card, CardHeader, CardBody, CardFooter, Button } from '@/components/ui';

export function MyComponent() {
  return (
    <Card variant="elevated">
      <CardHeader>
        <h3>Component Title</h3>
      </CardHeader>
      <CardBody>
        {/* Main content */}
      </CardBody>
      <CardFooter>
        <Button variant="primary">Action</Button>
      </CardFooter>
    </Card>
  );
}
```

### Spacing Best Practices

```tsx
// Use space tokens for consistency
<div className="p-[var(--space-5)] gap-[var(--space-3)]">
  {/* Content */}
</div>

// Instead of arbitrary values
<div className="p-5 gap-3">
  {/* Content */}
</div>
```

---

## 🔄 Migration Guide

### From Old System to New

#### Old Button Classes
```html
<!-- ❌ Old (remove) -->
<button class="btn btn-primary">Click me</button>
```

#### New Button Component
```tsx
// ✅ New (use this)
<Button variant="primary">Click me</Button>
```

#### Old Card Classes
```html
<!-- ❌ Old -->
<div class="kpi-card">
  <div class="kpi-card-label">Label</div>
  <div class="kpi-card-value">Value</div>
</div>
```

#### New Card Component
```tsx
// ✅ New
<Card variant="elevated">
  <CardBody>
    <div className="text-xs text-[var(--text-muted)]">Label</div>
    <div className="text-3xl font-bold">Value</div>
  </CardBody>
</Card>
```

### Step-by-Step Refactoring

1. **Import new components** at the top of your file
2. **Replace HTML elements** with component equivalents
3. **Use design tokens** instead of hardcoded colors/sizes
4. **Test hover/active states** for interactivity
5. **Verify accessibility** with keyboard navigation

---

## ✅ Best Practices

### 1. Consistency

✅ **Do**: Use design tokens for all styling
```css
padding: var(--space-4);
color: var(--text-primary);
```

❌ **Don't**: Hardcode arbitrary values
```css
padding: 15px;
color: #f1f1f4;
```

### 2. Semantic Color Usage

✅ **Do**: Use semantic colors appropriately
```tsx
// For success state
<Badge variant="success">Active</Badge>

// For deletion
<Button variant="danger">Delete</Button>
```

❌ **Don't**: Use colors incorrectly
```tsx
// Confusing
<Badge variant="danger">Active</Badge>
```

### 3. Component Composition

✅ **Do**: Compose components for flexibility
```tsx
<Card variant="elevated" hover>
  <CardHeader>
    <h3>Title</h3>
  </CardHeader>
  <CardBody>{children}</CardBody>
</Card>
```

❌ **Don't**: Create one-off custom styles
```tsx
<div className="bg-surface p-5 rounded-lg shadow-lg">
  {/* Custom styling every time */}
</div>
```

### 4. Spacing

✅ **Do**: Use the 8pt spacing system
```tsx
<div className="p-[var(--space-4)] gap-[var(--space-2)]">
```

❌ **Don't**: Use arbitrary spacing
```tsx
<div className="p-5 gap-3">
```

### 5. Animations

✅ **Do**: Use predefined transitions
```css
transition: all var(--transition-md);
```

❌ **Don't**: Create custom transitions
```css
transition: all 300ms ease;
```

### 6. Accessibility

✅ **Do**: Maintain color contrast
- Text: 4.5:1 ratio for AA compliance
- Use semantic HTML elements
- Provide ARIA labels for interactive elements

❌ **Don't**: Use colors alone for information
```tsx
// ❌ Bad: Only color conveys status
<div style={{ color: 'green' }}>Active</div>

// ✅ Good: Icon + text + color
<Badge variant="success">✓ Active</Badge>
```

---

## 📊 Token Reference Quick List

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | #3B82F6 | Main actions, focus states |
| `--success` | #10B981 | Positive actions, confirmations |
| `--danger` | #EF4444 | Destructive actions, errors |
| `--space-4` | 16px | Default padding, margins |
| `--radius-md` | 12px | Standard border radius |
| `--shadow-md` | 0 4px 6px... | Card elevation |
| `--transition-md` | 250ms ease | Standard animation |

---

## 🎬 Animation Guidelines

### Hover Effects
- Minimum duration: 150ms
- Use `cubic-bezier(0.4, 0, 0.2, 1)` easing
- Scale, translate, or shadow changes only

### Entrance Animations
- Stagger between elements: 50-100ms
- Use fade-in + translate-y
- Duration: 350-500ms

### Disabled Animations
Automatically disabled with `prefers-reduced-motion: reduce`

---

## 📚 Resources

- **Component File**: `/components/ui/`
- **Global Styles**: `/app/globals.css`
- **Example Implementation**: `WidgetTaxaConversao.refactored.tsx`

---

**Last Updated**: March 19, 2026
**Design System Version**: 2.0
**Status**: 🟢 Active & Maintained
