'use client';

import { useState, useMemo } from 'react';
import { useNotificationContext } from '../contexts/NotificationContext';
import { removeReadNotifications } from '@/lib/hooks';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
    Bell, BellOff, ClipboardList, Clock, AtSign, Trash2, CheckCheck,
} from 'lucide-react';
import type { Notification } from '@/lib/types';

function NotificationIcon({ tipo }: { tipo: Notification['tipo'] }) {
    switch (tipo) {
        case 'tarefa_atribuida': return <ClipboardList size={16} />;
        case 'tarefa_vencimento': return <Clock size={16} />;
        case 'mencao_chat': return <AtSign size={16} />;
        default: return <Bell size={16} />;
    }
}

const TIPO_LABELS: Record<string, string> = {
    'tarefa_atribuida': 'Atribuição de Tarefa',
    'tarefa_vencimento': 'Vencimento de Tarefa',
    'mencao_chat': 'Menção no Chat',
};

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('pt-BR', {
        timeZone: 'America/Bahia',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function NotificacoesPage() {
    const { notifications, markAsRead, markAllAsRead, refresh, unreadCount } = useNotificationContext();
    const { user } = useAuth();
    const router = useRouter();
    const [filterTipo, setFilterTipo] = useState<string>('all');
    const [filterPeriodo, setFilterPeriodo] = useState<string>('all');
    const [cleaning, setCleaning] = useState(false);

    const filtered = useMemo(() => {
        let result = [...notifications];

        if (filterTipo !== 'all') {
            result = result.filter(n => n.tipo === filterTipo);
        }

        if (filterPeriodo !== 'all') {
            const now = new Date();
            let cutoff: Date;
            switch (filterPeriodo) {
                case 'today':
                    cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    break;
                case 'month':
                    cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    cutoff = new Date(0);
            }
            result = result.filter(n => new Date(n.criada_em) >= cutoff);
        }

        return result;
    }, [notifications, filterTipo, filterPeriodo]);

    async function handleClearRead() {
        setCleaning(true);
        try {
            await removeReadNotifications(user.id);
            refresh();
        } catch (e) {
            console.error(e);
        }
        setCleaning(false);
    }

    async function handleNotificationClick(notif: Notification) {
        if (!notif.lida) {
            await markAsRead(notif.id);
        }
        if (notif.redirecionamento) {
            router.push(notif.redirecionamento);
        }
    }

    return (
        <div style={{ paddingBottom: 60 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>
                        Central de Notificações
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {notifications.length} notificação{notifications.length !== 1 ? 'ões' : ''} • {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {unreadCount > 0 && (
                        <button className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={markAllAsRead}>
                            <CheckCheck size={14} /> Marcar todas como lidas
                        </button>
                    )}
                    <button
                        className="btn btn-secondary"
                        style={{ padding: '8px 16px', fontSize: 13, color: '#EF4444' }}
                        onClick={handleClearRead}
                        disabled={cleaning}
                    >
                        <Trash2 size={14} /> {cleaning ? 'Limpando...' : 'Limpar lidas'}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="notif-history-filters">
                <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)}>
                    <option value="all">Todos os tipos</option>
                    <option value="tarefa_atribuida">Atribuição de Tarefa</option>
                    <option value="tarefa_vencimento">Vencimento de Tarefa</option>
                    <option value="mencao_chat">Menção no Chat</option>
                </select>
                <select value={filterPeriodo} onChange={e => setFilterPeriodo(e.target.value)}>
                    <option value="all">Todo o período</option>
                    <option value="today">Hoje</option>
                    <option value="week">Últimos 7 dias</option>
                    <option value="month">Últimos 30 dias</option>
                </select>
            </div>

            {/* List */}
            <div className="table-card" style={{ padding: 0 }}>
                {filtered.length === 0 ? (
                    <div className="notification-empty" style={{ padding: '60px 24px' }}>
                        <BellOff size={48} />
                        <span>Nenhuma notificação encontrada</span>
                    </div>
                ) : (
                    filtered.map(notif => (
                        <div
                            key={notif.id}
                            className={`notification-item ${!notif.lida ? 'unread' : ''}`}
                            onClick={() => handleNotificationClick(notif)}
                            style={{ padding: '16px 20px' }}
                        >
                            <div className={`notification-item-icon ${notif.tipo}`}>
                                <NotificationIcon tipo={notif.tipo} />
                            </div>
                            <div className="notification-item-content" style={{ flex: 1 }}>
                                <div className="notification-item-title">{notif.titulo}</div>
                                <div className="notification-item-message" style={{ WebkitLineClamp: 2 }}>{notif.mensagem}</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    {formatDate(notif.criada_em)}
                                </span>
                                <span style={{
                                    fontSize: 10,
                                    padding: '2px 8px',
                                    borderRadius: 4,
                                    background: notif.tipo === 'tarefa_atribuida' ? 'var(--info-muted)' :
                                        notif.tipo === 'tarefa_vencimento' ? 'var(--warning-muted)' : 'var(--success-muted)',
                                    color: notif.tipo === 'tarefa_atribuida' ? 'var(--info)' :
                                        notif.tipo === 'tarefa_vencimento' ? 'var(--warning)' : 'var(--success)',
                                    fontWeight: 600,
                                }}>
                                    {TIPO_LABELS[notif.tipo]}
                                </span>
                                {notif.modulo_origem && (
                                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                        {notif.modulo_origem}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
