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
  Briefcase,
  Wrench,
  TrendingUp,
  CalendarDays,
  ClipboardList,
  Clock,
  AtSign,
  BellOff,
  LogOut,
  FileCode2,
  BookOpen,
  CheckSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import type { Notification } from '@/lib/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  badge?: number;
}

const allNavItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/comercial', label: 'Comercial', icon: TrendingUp },
  { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
  { href: '/operacional', label: 'Operacional', icon: Wrench },
  { href: '/administrativo', label: 'Administrativo', icon: Briefcase },
  { href: '/calendario', label: 'Calendário', icon: CalendarDays },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/templates', label: 'Templates', icon: FileCode2 },
  { href: '/diretorio', label: 'Diretório', icon: BookOpen },
  { href: '/minhas-tarefas', label: 'Minhas Tarefas', icon: CheckSquare },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Dashboard', subtitle: 'Visão geral da sua empresa' },
  '/financeiro': { title: 'Controle Financeiro', subtitle: 'Receitas, custos e despesas' },
  '/comercial': { title: 'Comercial', subtitle: 'Gestão de vendas' },
  '/operacional': { title: 'Operacional', subtitle: 'Gestão operacional' },
  '/administrativo': { title: 'Administrativo', subtitle: 'Gestão organizacional' },
  '/calendario': { title: 'Calendário', subtitle: 'Eventos e reuniões da equipe' },
  '/chat': { title: 'Chat da Equipe', subtitle: 'Comunicação interna' },
  '/templates': { title: 'Templates', subtitle: 'Modelos e ferramentas' },
  '/diretorio': { title: 'Diretório', subtitle: 'Clientes e Colaboradores' },
  '/configuracoes': { title: 'Configurações', subtitle: 'Gerencie sua equipe e permissões' },
  '/notificacoes': { title: 'Notificações', subtitle: 'Histórico completo de notificações' },
  '/minhas-tarefas': { title: 'Minhas Tarefas', subtitle: 'Suas atividades em todos os módulos' },
};

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
    case 'tarefa_atribuida': return <ClipboardList size={16} />;
    case 'tarefa_vencimento': return <Clock size={16} />;
    case 'mencao_chat': return <AtSign size={16} />;
    default: return <Bell size={16} />;
  }
}

function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationContext();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const displayNotifications = notifications.slice(0, 20);

  async function handleNotificationClick(notif: Notification) {
    if (!notif.lida) await markAsRead(notif.id);
    setIsOpen(false);
    if (notif.redirecionamento) router.push(notif.redirecionamento);
  }

  return (
    <div className="notification-bell-wrapper" ref={panelRef}>
      <button className="header-action-btn" onClick={() => setIsOpen(!isOpen)} title="Notificações">
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
                <button onClick={markAllAsRead}>Marcar todas como lidas</button>
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
                      <div className="notification-item-time">{formatRelativeTime(notif.criada_em)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="notification-panel-footer">
              <Link href="/notificacoes" onClick={() => setIsOpen(false)}>Ver todas</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AppContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading, signOut, getAllowedModules } = useAuth();
  const allowed = getAllowedModules();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  // Login page: render standalone without sidebar
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Show loading screen while auth resolves
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>H</div>
          <div style={{ fontSize: 13 }}>Carregando...</div>
        </div>
      </div>
    );
  }

  // Don't render blank if no user (middleware should redirect, or auth context will push to login)
  if (!user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--accent)', marginBottom: 8 }}>H</div>
          <div style={{ fontSize: 13 }}>Redirecionando...</div>
        </div>
      </div>
    );
  }

  // Filter nav items by user's allowed modules, but ALWAYS show Diretório and Minhas Tarefas
  const visibleNavItems = allNavItems.filter(item =>
    allowed.includes(item.href) || item.href === '/diretorio' || item.href === '/minhas-tarefas'
  );

  // Check if user can access current route
  const canAccessRoute = allowed.includes(pathname) ||
    pathname === '/' ||
    pathname === '/notificacoes' ||
    pathname === '/diretorio' ||
    pathname === '/minhas-tarefas';

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <img src="/logo.png" alt="Hefesto Logo" />
          </div>
          <div className="sidebar-logo-text">
            <h1>HEFESTO IA</h1>
            <span>Software Interno</span>
          </div>
        </div>

        <div className="sidebar-section">
          <nav className="sidebar-nav">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} />
                  <span className="sidebar-link-label">{item.label}</span>
                  {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Area */}
        <div className="sidebar-footer" style={{ marginTop: 'auto', borderTop: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column' }}>

          {/* Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="sidebar-toggle-btn"
            title={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
          >
            {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            <span className="sidebar-link-label">Recolher Menu</span>
          </button>

          <Link
            href="/configuracoes"
            className="sidebar-user"
          >
            {user.foto_url ? (
              <img src={user.foto_url} alt="Perfil" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div className="sidebar-avatar">{user.initials}</div>
            )}
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.nome}</div>
              <div className="sidebar-user-role">{user.cargo || user.categoria}</div>
            </div>
          </Link>
          <button
            onClick={signOut}
            className="sidebar-link sidebar-logout-btn"
            title="Sair do sistema"
          >
            <LogOut size={16} />
            <span className="sidebar-link-label">Sair</span>
          </button>
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
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginRight: '16px' }}>
                {formattedTime}
              </div>
            )}
            <NotificationBell />
          </div>
        </header>
        <div className="page-content">
          {!canAccessRoute ? (
            <div style={{ textAlign: 'center', paddingTop: 100 }}>
              <h2 style={{ marginBottom: 12 }}>Acesso Negado</h2>
              <p style={{ color: 'var(--text-muted)' }}>
                Você não tem permissão para acessar esta área.
              </p>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}

import { SpeedInsights } from "@vercel/speed-insights/next";

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
        <SpeedInsights />
      </body>
    </html>
  );
}
