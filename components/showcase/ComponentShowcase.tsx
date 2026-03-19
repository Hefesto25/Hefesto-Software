'use client';

import { Button, Card, CardHeader, CardBody, CardFooter, Badge, Input, KPI } from '@/components/ui';
import {
  TrendingUp,
  TrendingDown,
  Save,
  Trash2,
  Mail,
  Lock,
  AlertCircle,
} from 'lucide-react';

/**
 * Component Showcase
 *
 * This file demonstrates all available UI components and their variants.
 * Use this as a reference when building new pages and components.
 *
 * For production, remove this file or create at /pages/showcase
 */

export function ComponentShowcase() {
  return (
    <div className="p-[var(--space-8)] bg-[var(--bg-primary)] min-h-screen">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2">
            🎨 Hefesto Design System Showcase
          </h1>
          <p className="text-[var(--text-secondary)]">
            All components and their variants in one place
          </p>
        </div>

        {/* ===== BUTTONS ===== */}
        <section>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 pb-4 border-b border-[var(--border-default)]">
            Buttons
          </h2>

          {/* Variants */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase mb-4">
              Variants
            </h3>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="success">Success</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="subtle">Subtle</Button>
            </div>
          </div>

          {/* Sizes */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase mb-4">
              Sizes
            </h3>
            <div className="flex flex-wrap gap-4 items-center">
              <Button size="xs">Extra Small</Button>
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
              <Button size="icon">📌</Button>
              <Button size="icon-lg">📌</Button>
            </div>
          </div>

          {/* With Icons */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase mb-4">
              With Icons
            </h3>
            <div className="flex flex-wrap gap-4">
              <Button leftIcon={<Save size={16} />}>Save</Button>
              <Button rightIcon={<TrendingUp size={16} />}>View Stats</Button>
              <Button
                variant="danger"
                leftIcon={<Trash2 size={16} />}
              >
                Delete
              </Button>
            </div>
          </div>

          {/* States */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase mb-4">
              States
            </h3>
            <div className="flex flex-wrap gap-4">
              <Button isLoading>Loading...</Button>
              <Button disabled>Disabled</Button>
              <Button fullWidth>Full Width Button</Button>
            </div>
          </div>
        </section>

        {/* ===== CARDS ===== */}
        <section>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 pb-4 border-b border-[var(--border-default)]">
            Cards
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Default Card */}
            <Card variant="default">
              <CardHeader>
                <h3 className="font-semibold">Default Card</h3>
              </CardHeader>
              <CardBody>
                Standard card with default styling and minimal elevation.
              </CardBody>
              <CardFooter>
                <Button size="sm">Action</Button>
              </CardFooter>
            </Card>

            {/* Elevated Card */}
            <Card variant="elevated" hover>
              <CardHeader>
                <h3 className="font-semibold">Elevated Card (Hover)</h3>
              </CardHeader>
              <CardBody>
                Elevated card with shadow and hover effect.
              </CardBody>
              <CardFooter>
                <Button size="sm" variant="primary">
                  Action
                </Button>
              </CardFooter>
            </Card>

            {/* Outline Card */}
            <Card variant="outline">
              <CardHeader>
                <h3 className="font-semibold">Outline Card</h3>
              </CardHeader>
              <CardBody>
                Card with bold border instead of shadow.
              </CardBody>
              <CardFooter>
                <Button size="sm" variant="outline">
                  Action
                </Button>
              </CardFooter>
            </Card>

            {/* Glass Card */}
            <Card variant="glass">
              <CardHeader>
                <h3 className="font-semibold">Glass Card</h3>
              </CardHeader>
              <CardBody>
                Glassmorphic card with backdrop blur and translucency.
              </CardBody>
              <CardFooter>
                <Button size="sm" variant="subtle">
                  Action
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* ===== BADGES ===== */}
        <section>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 pb-4 border-b border-[var(--border-default)]">
            Badges
          </h2>

          {/* Variants */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase mb-4">
              Variants
            </h3>
            <div className="flex flex-wrap gap-3">
              <Badge variant="default">Default</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="success">✓ Success</Badge>
              <Badge variant="danger">✕ Danger</Badge>
              <Badge variant="warning">⚠ Warning</Badge>
              <Badge variant="secondary">Secondary</Badge>
            </div>
          </div>

          {/* Sizes */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase mb-4">
              Sizes
            </h3>
            <div className="flex flex-wrap gap-3 items-center">
              <Badge variant="primary" size="xs">
                Extra Small
              </Badge>
              <Badge variant="primary" size="sm">
                Small
              </Badge>
              <Badge variant="primary" size="md">
                Medium
              </Badge>
            </div>
          </div>

          {/* Removable */}
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase mb-4">
              Removable
            </h3>
            <Badge
              variant="success"
              onRemove={() => console.log('Badge removed')}
            >
              Click ✕ to remove
            </Badge>
          </div>
        </section>

        {/* ===== INPUTS ===== */}
        <section>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 pb-4 border-b border-[var(--border-default)]">
            Inputs
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Email Address"
              type="email"
              placeholder="user@example.com"
              icon={<Mail size={16} />}
              hint="We'll never share your email"
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock size={16} />}
              error="Password must be at least 8 characters"
            />

            <Input
              label="Default Input"
              placeholder="Type something..."
              hint="This is a helpful hint"
            />

            <Input
              label="Subtle Input"
              placeholder="Type something..."
              variant="subtle"
              hint="Minimal styling variant"
            />
          </div>
        </section>

        {/* ===== KPI CARDS ===== */}
        <section>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 pb-4 border-b border-[var(--border-default)]">
            KPI Cards
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <KPI
              title="Revenue"
              value="$45,231"
              icon={<TrendingUp size={20} />}
              trend={{ value: 12.5, isPositive: true }}
              subtitle="This month"
            />

            <KPI
              title="Churn Rate"
              value="2.4%"
              icon={<TrendingDown size={20} />}
              trend={{ value: 0.3, isPositive: false }}
              subtitle="Monthly"
            />

            <KPI
              title="Active Users"
              value="8,429"
              icon={<AlertCircle size={20} />}
            />

            <KPI
              title="Conversion Rate"
              value="3.24%"
              trend={{ value: 5.2, isPositive: true }}
            />
          </div>
        </section>

        {/* ===== LAYOUT EXAMPLES ===== */}
        <section>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 pb-4 border-b border-[var(--border-default)]">
            Layout Examples
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Example 1 */}
            <Card variant="elevated">
              <CardHeader>
                <h4 className="font-semibold">Feature</h4>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  Modern UI component with clean design
                </p>
                <div className="space-y-2">
                  <Badge variant="primary" size="sm">
                    New
                  </Badge>
                </div>
              </CardBody>
              <CardFooter>
                <Button size="sm" fullWidth>
                  Explore
                </Button>
              </CardFooter>
            </Card>

            {/* Example 2 */}
            <Card variant="elevated">
              <CardHeader>
                <h4 className="font-semibold">Customizable</h4>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  Multiple variants and sizes for flexibility
                </p>
                <div className="space-y-2">
                  <Badge variant="success" size="sm">
                    ✓ Tested
                  </Badge>
                </div>
              </CardBody>
              <CardFooter>
                <Button size="sm" fullWidth variant="success">
                  Use It
                </Button>
              </CardFooter>
            </Card>

            {/* Example 3 */}
            <Card variant="elevated">
              <CardHeader>
                <h4 className="font-semibold">Production Ready</h4>
              </CardHeader>
              <CardBody className="space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  Built with accessibility and performance
                </p>
                <div className="space-y-2">
                  <Badge variant="warning" size="sm">
                    ⚠ WIP
                  </Badge>
                </div>
              </CardBody>
              <CardFooter>
                <Button size="sm" fullWidth variant="warning">
                  Learn More
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-[var(--border-default)] text-center">
          <p className="text-[var(--text-muted)]">
            Hefesto Design System v2.0 — Built for modern SaaS applications
          </p>
        </div>
      </div>
    </div>
  );
}
