'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useOperationalTasks, useComercialTasks } from '@/lib/hooks';
import {
    Loader2, Calendar as CalendarIcon, AlertCircle, Circle, PlayCircle, Eye, CheckCircle2,
    KanbanSquare, List, ArrowRight
} from 'lucide-react';
import type { OperationalTask, ComercialTask } from '@/lib/types';
import Link from 'next/link';

type UnifiedTask = {
    id: string;
    titulo: string;
    descricao?: string;
    status: 'backlog' | 'progress' | 'review' | 'done';
    prioridade?: 'Alta' | 'Média' | 'Baixa';
    modulo: 'Operacional' | 'Comercial';
    data_vencimento?: string;
    responsaveis_ids?: string[];
    participantes_ids?: string[];
    originalUrl: string;
};

const KANBAN_COLUMNS = [
    { id: 'backlog', label: 'A Fazer', color: '#3B82F6', icon: <Circle size={14} /> },
    { id: 'progress', label: 'Em Andamento', color: '#F59E0B', icon: <PlayCircle size={14} /> },
    { id: 'review', label: 'Em Revisão', color: '#8B5CF6', icon: <Eye size={14} /> },
    { id: 'done', label: 'Concluído', color: '#10B981', icon: <CheckCircle2 size={14} /> }
] as const;

const MODULE_COLORS: Record<string, { bg: string; text: string }> = {
    'Operacional': { bg: 'rgba(56, 189, 248, 0.12)', text: '#38bdf8' },
    'Comercial': { bg: 'rgba(250, 204, 21, 0.12)', text: '#facc15' },
};

function mapOperationalStatus(s: string): UnifiedTask['status'] {
    if (s === 'Fazendo' || s === 'em_andamento') return 'progress';
    if (s === 'Revisando') return 'review';
    if (s === 'Finalizado' || s === 'concluido') return 'done';
    return 'backlog';
}

function mapComercialStatus(s: string): UnifiedTask['status'] {
    if (s === 'Fazendo') return 'progress';
    if (s === 'Revisando') return 'review';
    if (s === 'Finalizado') return 'done';
    return 'backlog';
}

function getDeadlineColor(dateString?: string) {
    if (!dateString) return null;
    const diffDays = Math.ceil((new Date(dateString).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return '#EF4444';
    if (diffDays <= 3) return '#F59E0B';
    return '#10B981';
}

export default function MinhasTarefasPage() {
    const { user } = useAuth();
    const { data: opTasks, loading: loadingOp } = useOperationalTasks();
    const { data: comTasks, loading: loadingCom } = useComercialTasks();
    const [filterModule, setFilterModule] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban');

    const loading = loadingOp || loadingCom;

    const unifiedTasks = useMemo(() => {
        if (!user) return [];
        const tasks: UnifiedTask[] = [];

        opTasks.forEach(t => {
            const isResp = t.responsavel_id === user.id || t.responsaveis_ids?.includes(user.id);
            const isPart = t.participantes_ids?.includes(user.id);
            if (isResp || isPart) {
                tasks.push({
                    id: t.id, titulo: t.titulo, descricao: t.descricao,
                    status: mapOperationalStatus(t.status), modulo: 'Operacional',
                    data_vencimento: t.data_termino,
                    responsaveis_ids: t.responsaveis_ids || (t.responsavel_id ? [t.responsavel_id] : []),
                    participantes_ids: t.participantes_ids || [],
                    originalUrl: '/operacional'
                });
            }
        });

        comTasks.forEach(t => {
            const isResp = t.responsaveis_ids?.includes(user.id);
            const isPart = t.participantes_ids?.includes(user.id);
            if (isResp || isPart) {
                tasks.push({
                    id: t.id, titulo: t.titulo, descricao: t.descricao,
                    status: mapComercialStatus(t.status), prioridade: t.prioridade,
                    modulo: 'Comercial', data_vencimento: t.data_termino,
                    responsaveis_ids: t.responsaveis_ids || [],
                    participantes_ids: t.participantes_ids || [],
                    originalUrl: '/comercial'
                });
            }
        });

        return tasks;
    }, [user, opTasks, comTasks]);

    const filteredTasks = useMemo(() => {
        if (filterModule === 'all') return unifiedTasks;
        return unifiedTasks.filter(t => t.modulo === filterModule);
    }, [unifiedTasks, filterModule]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <Loader2 size={32} className="login-spinner" style={{ color: 'var(--accent)' }} />
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: 60 }}>
            {/* Tabs - Module Filters + View Toggle */}
            <div className="finance-tabs" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 0 }}>
                    <button className={`finance-tab ${filterModule === 'all' ? 'active' : ''}`} onClick={() => setFilterModule('all')}>
                        Todos Módulos
                    </button>
                    <button className={`finance-tab ${filterModule === 'Operacional' ? 'active' : ''}`} onClick={() => setFilterModule('Operacional')}>
                        Operacional
                    </button>
                    <button className={`finance-tab ${filterModule === 'Comercial' ? 'active' : ''}`} onClick={() => setFilterModule('Comercial')}>
                        Comercial
                    </button>
                </div>
                <div style={{ display: 'flex', gap: 4, background: 'var(--bg-secondary)', borderRadius: 8, padding: 4 }}>
                    <button
                        onClick={() => setViewMode('kanban')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                            background: viewMode === 'kanban' ? 'var(--accent)' : 'transparent',
                            color: viewMode === 'kanban' ? '#000' : 'var(--text-muted)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <KanbanSquare size={14} /> Kanban
                    </button>
                    <button
                        onClick={() => setViewMode('lista')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                            background: viewMode === 'lista' ? 'var(--accent)' : 'transparent',
                            color: viewMode === 'lista' ? '#000' : 'var(--text-muted)',
                            transition: 'all 0.2s'
                        }}
                    >
                        <List size={14} /> Lista
                    </button>
                </div>
            </div>

            {/* KANBAN VIEW */}
            {viewMode === 'kanban' && (
                <div style={{ display: 'flex', gap: 24, overflowX: 'auto', paddingBottom: 16 }}>
                    {KANBAN_COLUMNS.map(col => {
                        const colTasks = filteredTasks.filter(t => t.status === col.id);
                        return (
                            <div key={col.id} style={{
                                minWidth: 320, width: 320, display: 'flex', flexDirection: 'column', gap: 12,
                                background: 'var(--bg-secondary)', padding: 16, borderRadius: 12,
                                border: '1px solid rgba(255,255,255,0.05)', minHeight: '60vh'
                            }}>
                                {/* Column Header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: col.color, fontWeight: 600 }}>
                                        {col.icon} {col.label}
                                    </div>
                                    <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 12, color: 'var(--text-primary)' }}>
                                        {colTasks.length}
                                    </span>
                                </div>

                                {/* Column Cards */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {colTasks.map(task => {
                                        const modColor = MODULE_COLORS[task.modulo];
                                        const deadlineColor = getDeadlineColor(task.data_vencimento);
                                        return (
                                            <div key={task.id} style={{
                                                background: 'var(--bg-primary)', padding: 16, borderRadius: 8,
                                                border: '1px solid rgba(255,255,255,0.05)', cursor: 'default',
                                                display: 'flex', flexDirection: 'column', gap: 8,
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}>
                                                {/* Module Badge + Priority */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                                                        padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap',
                                                        background: modColor.bg, color: modColor.text
                                                    }}>
                                                        {task.modulo}
                                                    </span>
                                                    {task.prioridade && (
                                                        <span style={{
                                                            fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4,
                                                            background: task.prioridade === 'Alta' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
                                                            color: task.prioridade === 'Alta' ? '#EF4444' : 'var(--text-muted)'
                                                        }}>
                                                            {task.prioridade}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Title */}
                                                <strong style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.4 }}>{task.titulo}</strong>

                                                {/* Description (optional) */}
                                                {task.descricao && (
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                                        {task.descricao.substring(0, 80)}{task.descricao.length > 80 ? '...' : ''}
                                                    </div>
                                                )}

                                                {/* Footer */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        {task.data_vencimento ? (
                                                            <>
                                                                <span style={{
                                                                    width: 8, height: 8, borderRadius: '50%',
                                                                    background: deadlineColor || 'var(--text-muted)',
                                                                    display: 'inline-block'
                                                                }} />
                                                                <span style={{ color: deadlineColor || 'var(--text-muted)' }}>
                                                                    {new Date(task.data_vencimento).toLocaleDateString('pt-BR')}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span style={{ opacity: 0.5 }}>Sem prazo</span>
                                                        )}
                                                    </div>
                                                    <Link href={task.originalUrl} style={{
                                                        display: 'flex', alignItems: 'center', gap: 4,
                                                        fontSize: 11, color: 'var(--accent)', textDecoration: 'none'
                                                    }}>
                                                        Ir ao módulo <ArrowRight size={12} />
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {colTasks.length === 0 && (
                                        <div style={{
                                            padding: '24px 0', textAlign: 'center', fontSize: 12,
                                            color: 'var(--text-muted)',
                                            border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 8
                                        }}>
                                            Nenhuma tarefa
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* LIST VIEW */}
            {viewMode === 'lista' && (
                <div className="table-card">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Módulo</th>
                                <th>Tarefa</th>
                                <th>Status</th>
                                <th>Prioridade</th>
                                <th>Prazo</th>
                                <th style={{ width: 80, textAlign: 'center' }}>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTasks.map(task => {
                                const col = KANBAN_COLUMNS.find(c => c.id === task.status);
                                const modColor = MODULE_COLORS[task.modulo];
                                const deadlineColor = getDeadlineColor(task.data_vencimento);
                                return (
                                    <tr key={task.id}>
                                        <td>
                                            <span style={{
                                                fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                                                padding: '3px 8px', borderRadius: 4,
                                                background: modColor.bg, color: modColor.text
                                            }}>
                                                {task.modulo}
                                            </span>
                                        </td>
                                        <td>
                                            <div>
                                                <strong style={{ fontSize: 14 }}>{task.titulo}</strong>
                                                {task.descricao && (
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                                        {task.descricao.substring(0, 60)}{task.descricao.length > 60 ? '...' : ''}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ color: col?.color, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                {col?.icon} {col?.label}
                                            </span>
                                        </td>
                                        <td>
                                            {task.prioridade ? (
                                                <span style={{
                                                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                                                    background: task.prioridade === 'Alta' ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.05)',
                                                    color: task.prioridade === 'Alta' ? '#EF4444' : 'var(--text-muted)'
                                                }}>
                                                    {task.prioridade}
                                                </span>
                                            ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>}
                                        </td>
                                        <td>
                                            {task.data_vencimento ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{
                                                        width: 8, height: 8, borderRadius: '50%',
                                                        background: deadlineColor || 'var(--text-muted)',
                                                        display: 'inline-block', flexShrink: 0
                                                    }} />
                                                    <span style={{ fontSize: 12, color: deadlineColor || 'var(--text-muted)' }}>
                                                        {new Date(task.data_vencimento).toLocaleDateString('pt-BR')}
                                                    </span>
                                                </div>
                                            ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <Link href={task.originalUrl} style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                fontSize: 12, color: 'var(--accent)', textDecoration: 'none'
                                            }}>
                                                <ArrowRight size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                            {filteredTasks.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center text-muted" style={{ padding: '40px 0' }}>
                                        Nenhuma tarefa encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
