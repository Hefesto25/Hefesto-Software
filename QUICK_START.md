# ⚡ Quick Start: Using the New Design System

## 5-Minute Setup

### 1. Import Components

```tsx
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Badge,
  Input,
  KPI,
} from '@/components/ui';
```

### 2. Use in Your Component

```tsx
'use client';

import { Button, Card, CardBody, Badge } from '@/components/ui';
import { TrendingUp } from 'lucide-react';

export function MyDashboard() {
  return (
    <div className="p-[var(--space-6)] space-y-6">
      {/* Simple Card */}
      <Card variant="elevated">
        <CardBody>
          <h3 className="text-lg font-semibold mb-2">Welcome</h3>
          <p className="text-[var(--text-secondary)]">
            This is a modern card with elevation
          </p>
        </CardBody>
      </Card>

      {/* Card with Actions */}
      <Card variant="elevated">
        <CardHeader>
          <h3>Users</h3>
          <Badge variant="primary">12 new</Badge>
        </CardHeader>
        <CardBody>
          <p>Showing active users today</p>
        </CardBody>
        <CardFooter>
          <Button variant="primary">View All</Button>
          <Button variant="ghost">Cancel</Button>
        </CardFooter>
      </Card>

      {/* KPI Display */}
      <div className="grid grid-cols-3 gap-4">
        <KPI
          title="Revenue"
          value="$45,231"
          icon={<TrendingUp size={20} />}
          trend={{ value: 12.5, isPositive: true }}
        />
      </div>

      {/* Form */}
      <Card variant="default">
        <CardBody className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="user@example.com"
          />
          <Button fullWidth>Submit</Button>
        </CardBody>
      </Card>
    </div>
  );
}
```

---

## Component Cheat Sheet

### Button

```tsx
// Basic
<Button>Click me</Button>

// Variants: primary, secondary, ghost, outline, success, danger, warning, subtle
<Button variant="success">Confirm</Button>

// Sizes: xs, sm, md, lg, xl, icon, icon-lg
<Button size="lg">Large Button</Button>

// With icons
<Button leftIcon={<Save size={16} />}>Save</Button>

// Loading
<Button isLoading>Processing...</Button>

// Disabled
<Button disabled>Disabled</Button>

// Full width
<Button fullWidth>Full Width Button</Button>
```

### Card

```tsx
// Simple card
<Card>
  <CardBody>Content</CardBody>
</Card>

// Variants: default, elevated, outline, glass
<Card variant="elevated" hover>
  <CardHeader>
    <h3>Title</h3>
  </CardHeader>
  <CardBody>Content</CardBody>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Badge

```tsx
// Basic
<Badge>Label</Badge>

// Variants: default, primary, success, danger, warning, secondary
<Badge variant="success">✓ Active</Badge>

// Sizes: xs, sm, md
<Badge size="sm">Small</Badge>

// Removable
<Badge onRemove={() => handleRemove()}>
  Label
</Badge>
```

### Input

```tsx
// Simple
<Input placeholder="Type something..." />

// With label and validation
<Input
  label="Email"
  type="email"
  placeholder="user@example.com"
  hint="We'll never share your email"
/>

// Error state
<Input
  label="Password"
  type="password"
  error="Password is required"
/>

// With icon
<Input icon={<Mail size={16} />} />

// Variant
<Input variant="subtle" />
```

### KPI

```tsx
<KPI
  title="Revenue"
  value="$45,231"
  icon={<TrendingUp size={20} />}
  trend={{ value: 12.5, isPositive: true }}
  subtitle="This month"
/>
```

---

## Design Tokens Cheat Sheet

### Colors

```css
/* Primary actions */
color: var(--primary);
background: var(--primary-muted);

/* Text colors */
color: var(--text-primary);
color: var(--text-secondary);
color: var(--text-muted);

/* Status colors */
color: var(--success);
color: var(--danger);
color: var(--warning);
```

### Spacing (8pt system)

```css
padding: var(--space-2);   /* 8px */
padding: var(--space-4);   /* 16px */
padding: var(--space-6);   /* 24px */
margin: var(--space-3);    /* 12px */
gap: var(--space-2);       /* 8px */
```

### Borders & Radius

```css
border-radius: var(--radius-sm);   /* 8px */
border-radius: var(--radius-md);   /* 12px */
border-radius: var(--radius-lg);   /* 16px */
border: 1px solid var(--border-default);
border: 1px solid var(--border-hover);
```

### Shadows & Elevation

```css
box-shadow: var(--shadow-md);      /* Subtle shadow */
box-shadow: var(--elevation-2);    /* Card elevation */
box-shadow: var(--glow-md);        /* Glow effect */
```

### Transitions

```css
transition: all var(--transition-md);  /* 250ms ease */
transition: color var(--transition-sm); /* 150ms ease */
```

---

## Common Patterns

### Dashboard Layout

```tsx
export function Dashboard() {
  return (
    <div className="p-[var(--space-6)] space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="text-[var(--text-secondary)]">Welcome back</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title="Revenue" value="$45,231" />
        <KPI title="Users" value="8,429" />
        <KPI title="Growth" value="+23.5%" />
        <KPI title="Churn" value="2.4%" />
      </div>

      {/* Content Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated">
          <CardBody>Chart here</CardBody>
        </Card>
        <Card variant="elevated">
          <CardBody>Table here</CardBody>
        </Card>
      </div>
    </div>
  );
}
```

### Form Component

```tsx
export function LoginForm() {
  return (
    <Card variant="default" className="w-full max-w-md mx-auto">
      <CardHeader>
        <h2>Sign In</h2>
      </CardHeader>
      <CardBody className="space-y-4">
        <Input label="Email" type="email" />
        <Input label="Password" type="password" />
        <div className="flex gap-2">
          <Button variant="primary" fullWidth>
            Sign In
          </Button>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          New user? <a href="/signup">Create account</a>
        </p>
      </CardBody>
    </Card>
  );
}
```

### List with Actions

```tsx
export function ItemList({ items }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Card key={item.id} hover interactive>
          <CardBody className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">{item.name}</h4>
              <p className="text-sm text-[var(--text-muted)]">
                {item.description}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="primary">{item.status}</Badge>
              <Button size="sm" variant="ghost">
                Edit
              </Button>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
```

---

## Color Reference

| Purpose | Color | CSS Variable |
|---------|-------|--------------|
| Main action | Blue (#3B82F6) | `--primary` |
| Success/positive | Green (#10B981) | `--success` |
| Error/delete | Red (#EF4444) | `--danger` |
| Warning | Amber (#F59E0B) | `--warning` |
| Primary text | Light gray (#F1F1F4) | `--text-primary` |
| Secondary text | Gray (#9CA3AF) | `--text-secondary` |
| Muted text | Dark gray (#6B7280) | `--text-muted` |

---

## Do's & Don'ts

✅ **DO**

```tsx
// Use components
<Button variant="primary">Save</Button>

// Use design tokens
padding: var(--space-4);
color: var(--text-primary);

// Use semantic colors
<Badge variant="success">Active</Badge>

// Compose with CardHeader/CardBody/CardFooter
<Card>
  <CardHeader>Title</CardHeader>
  <CardBody>Content</CardBody>
  <CardFooter>Actions</CardFooter>
</Card>
```

❌ **DON'T**

```tsx
// Don't use old HTML button
<button className="bg-blue-500">Save</button>

// Don't hardcode colors
padding: 16px;
color: #f1f1f4;

// Don't use generic badges
<span className="px-2 py-1 bg-gray-800">Active</span>

// Don't nest divs arbitrarily
<div className="p-4 bg-gray-900 rounded border">
  {/* Lots of content */}
</div>
```

---

## Troubleshooting

### Component not showing?
```tsx
// Make sure to import
import { Button } from '@/components/ui';

// Check 'use client' directive at top of file
'use client';
```

### Colors look wrong?
```tsx
// Use CSS variables, not hardcoded colors
<div style={{ color: var(--text-primary) }}>
  Correct
</div>

// Not like this
<div style={{ color: '#f1f1f4' }}>
  Wrong
</div>
```

### Spacing looks off?
```tsx
// Use space tokens consistently
<div className="p-[var(--space-4)] gap-[var(--space-2)]">
  Correct
</div>

// Not arbitrary values
<div className="p-4 gap-2">
  Wrong
</div>
```

---

## Next Steps

1. ✅ **Review** `DESIGN_SYSTEM.md` for complete documentation
2. ✅ **Explore** `ComponentShowcase.tsx` to see all variants
3. ✅ **Compare** old vs new: see `WidgetTaxaConversao.refactored.tsx`
4. ✅ **Start refactoring** your components using these patterns

---

## Resources

- **Full Guide**: `/DESIGN_SYSTEM.md`
- **Components**: `/components/ui/`
- **Showcase**: `/components/showcase/ComponentShowcase.tsx`
- **Refactor Plan**: `/REFACTOR_SUMMARY.md`

---

**Happy coding! 🎉**
