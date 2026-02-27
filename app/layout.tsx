'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotificationContext } from './contexts/NotificationContext';
import {
  LayoutDashboard,
  DollarSign,
  MessageSquare,
  Bell,
  ChevronRight,
  Briefcase,
  Wrench,
  TrendingUp,
  CalendarDays,
  ClipboardList,
  Clock,
  AtSign,
  BellOff,
} from 'lucide-react';
import type { Notification } from '@/lib/types';

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
  '/notificacoes': { title: 'Notificações', subtitle: 'Histórico completo de notificações' },
};

/** Relative time formatting in Portuguese */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'agora';
  if (diffMin < 60) return `há ${diffMin} minuto${diffMin > 1 ? 's' : ''}`;
  if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  if (diffDays === 1) return 'ontem';
  if (diffDays < 7) return `há ${diffDays} dias`;
  return date.toLocaleDateString('pt-BR');
}

function NotificationIcon({ tipo }: { tipo: Notification['tipo'] }) {
  switch (tipo) {
    case 'tarefa_atribuida':
      return <ClipboardList size={16} />;
    case 'tarefa_vencimento':
      return <Clock size={16} />;
    case 'mencao_chat':
      return <AtSign size={16} />;
    default:
      return <Bell size={16} />;
  }
}

function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationContext();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const displayNotifications = notifications.slice(0, 20);

  async function handleNotificationClick(notif: Notification) {
    if (!notif.lida) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.redirecionamento) {
      router.push(notif.redirecionamento);
    }
  }

  async function handleMarkAllAsRead() {
    await markAllAsRead();
  }

  return (
    <div className="notification-bell-wrapper" ref={panelRef}>
      <button
        className="header-action-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Notificações"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notification-badge" key={unreadCount}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="notification-overlay" onClick={() => setIsOpen(false)} />
          <div className="notification-panel">
            <div className="notification-panel-header">
              <h3>Notificações</h3>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllAsRead}>
                  Marcar todas como lidas
                </button>
              )}
            </div>

            <div className="notification-panel-list">
              {displayNotifications.length === 0 ? (
                <div className="notification-empty">
                  <BellOff size={40} />
                  <span>Nenhuma notificação</span>
                </div>
              ) : (
                displayNotifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`notification-item ${!notif.lida ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className={`notification-item-icon ${notif.tipo}`}>
                      <NotificationIcon tipo={notif.tipo} />
                    </div>
                    <div className="notification-item-content">
                      <div className="notification-item-title">{notif.titulo}</div>
                      <div className="notification-item-message">{notif.mensagem}</div>
                      <div className="notification-item-time">
                        {formatRelativeTime(notif.criada_em)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="notification-panel-footer">
              <Link href="/notificacoes" onClick={() => setIsOpen(false)}>
                Ver todas
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, getAllowedModules } = useAuth();
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
            <NotificationBell />
          </div>
        </header>
        <div className="page-content">
          {!allowed.includes(pathname) && pathname !== '/' && pathname !== '/notificacoes' ? (
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
          <NotificationProvider>
            <AppContent>
              {children}
            </AppContent>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
