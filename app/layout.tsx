'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import {
  LayoutDashboard,
  DollarSign,
  MessageSquare,
  Search,
  Bell,
  Settings,
  ChevronRight,
  Briefcase,
  Wrench,
  TrendingUp,
  Scale,
  CalendarDays,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { href: '/', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/comercial', label: 'Comercial', icon: TrendingUp },
      { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
      { href: '/operacional', label: 'Operacional', icon: Wrench },
      { href: '/administrativo', label: 'Administrativo', icon: Briefcase },
      { href: '/calendario', label: 'Calendário', icon: CalendarDays },
      { href: '/chat', label: 'Chat', icon: MessageSquare, badge: 3 },
    ],
  },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard Financeiro', subtitle: 'Visão geral da sua empresa' },
  '/financeiro': { title: 'Controle Financeiro', subtitle: 'Receitas, custos e despesas' },
  '/comercial': { title: 'Comercial', subtitle: 'Gestão de vendas' },
  '/operacional': { title: 'Operacional', subtitle: 'Gestão operacional' },
  '/administrativo': { title: 'Administrativo', subtitle: 'Gestão organizacional' },
  '/calendario': { title: 'Calendário', subtitle: 'Eventos e reuniões da equipe' },
  '/chat': { title: 'Chat da Equipe', subtitle: 'Comunicação interna' },
  '/configuracoes': { title: 'Configurações', subtitle: 'Gerencie sua equipe e permissões' },
};

function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, switchCategory, getAllowedModules } = useAuth();
  const allowed = getAllowedModules();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = currentTime
    ? new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Bahia',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(currentTime)
    : '';

  const currentPage = pageTitles[pathname] || pageTitles['/'];

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">H</div>
          <div>
            <h1>HEFESTO IA</h1>
            <span>Software Interno</span>
          </div>
        </div>

        {navSections.map((section) => {
          const filteredItems = section.items.filter(item => allowed.includes(item.href));
          if (filteredItems.length === 0) return null;

          return (
            <div key={section.title} className="sidebar-section">
              {section.title !== 'Principal' && (
                <div className="sidebar-section-title">{section.title}</div>
              )}
              <nav className="sidebar-nav">
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href + item.label}
                      href={item.href}
                      className={`sidebar-link ${isActive ? 'active' : ''}`}
                    >
                      <Icon size={18} />
                      {item.label}
                      {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}

        <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/configuracoes" className="sidebar-user" style={{ textDecoration: 'none', cursor: 'pointer', padding: 0, flex: 1 }}>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div className="sidebar-avatar">{user.initials}</div>
            )}
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role" style={{ color: 'var(--primary)' }}>{user.category}</div>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <div>
              <div className="header-title">{currentPage.title}</div>
              <div className="header-subtitle">{currentPage.subtitle}</div>
            </div>
          </div>
          <div className="header-actions">
            {formattedTime && (
              <div className="header-time" style={{ color: 'var(--text-muted)', fontSize: '14px', marginRight: '16px' }}>
                {formattedTime}
              </div>
            )}
            <button className="header-action-btn">
              <Bell size={18} />
              <span className="notification-dot"></span>
            </button>
          </div>
        </header>
        <div className="page-content">
          {!allowed.includes(pathname) && pathname !== '/' ? (
            <div style={{ textAlign: 'center', paddingTop: 100 }}>
              <h2>Acesso Negado</h2>
              <p className="text-muted">A categoria atual ({user.category}) não tem acesso a esta página.</p>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <title>HEFESTO IA — Software Interno</title>
        <meta name="description" content="Software interno da HEFESTO IA — Controle financeiro, CRM, comunicação e gestão de projetos." />
      </head>
      <body>
        <AuthProvider>
          <AppContent>
            {children}
          </AppContent>
        </AuthProvider>
      </body>
    </html>
  );
}
