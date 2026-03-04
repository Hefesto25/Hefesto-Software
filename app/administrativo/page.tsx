'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import {
    Plus, Clock, Activity, CheckCircle2,
    Calendar, Users, LayoutDashboard, History,
    ArrowUpRight, ArrowDownRight, Minus, Video, MapPin, Search
} from 'lucide-react';
import type { AdminDemand, AdminMeeting, TeamMember, CalendarEvent } from '@/lib/types';
import {
    useAdminDemands, useAdminMeetings, useTeam, useCalendarEvents, useUsuarios,
    addAdminDemand, updateAdminDemand, removeAdminDemand,
    addAdminMeeting, updateAdminMeeting, removeAdminMeeting,
    addCalendarEvent, updateCalendarEvent, removeCalendarEvent,
    createNotificationIfEnabled, sendAssigneeNotificationsAndCalendar
} from '@/lib/hooks';
import { getBahiaDate, getBahiaDateString, formatLocalSystemDate } from '@/lib/utils';
import { useAuth } from '../contexts/AuthContext';

const DEMAND_COLUMNS = [
    { id: 'A Fazer', label: 'A Fazer', color: '#F59E0B' },
    { id: 'Fazendo', label: 'Fazendo', color: '#3B82F6' },
    { id: 'Finalizado', label: 'Finalizado', color: '#10B981' }
];

const MEETING_STATUSES = ['Agendada', 'Realizada', 'Cancelada'] as const;
const PRIORITIES = ['Alta', 'Média', 'Baixa'] as const;

export default function AdministrativoPage() {
    const [activeTab, setActiveTab] = useState<'painel' | 'demandas' | 'reunioes' | 'historico'>('painel');
    const { user } = useAuth();
    const { data: demandsData, refetch: refetchDemands } = useAdminDemands();
    const { data: meetingsData, refetch: refetchMeetings } = useAdminMeetings();
    const { data: teamMembers } = useTeam();
    const { data: allUsuarios } = useUsuarios();
    const { data: calendarEvents, refetch: refetchCalendar } = useCalendarEvents(user?.id);

    const [showDemandModal, setShowDemandModal] = useState(false);
    const [showMeetingModal, setShowMeetingModal] = useState(false);
    const [editingDemand, setEditingDemand] = useState<AdminDemand | null>(null);
    const [editingMeeting, setEditingMeeting] = useState<AdminMeeting | null>(null);
    const [draggedDemand, setDraggedDemand] = useState<AdminDemand | null>(null);
    const [draggedMeeting, setDraggedMeeting] = useState<AdminMeeting | null>(null);
    const [confirmDeleteDemandId, setConfirmDeleteDemandId] = useState<string | null>(null);
    const [confirmDeleteMeetingId, setConfirmDeleteMeetingId] = useState<string | null>(null);

    // Forms
    const [demandForm, setDemandForm] = useState<Partial<AdminDemand>>({ titulo: '', descricao: '', responsaveis_ids: [], data_prevista: '', status: 'A Fazer', prioridade: 'Média' });
    const [meetingForm, setMeetingForm] = useState<Partial<AdminMeeting>>({ titulo: '', participantes_ids: [], data_hora: '', pauta: '', status: 'Agendada', local_link: '' });
    const [historyFilter, setHistoryFilter] = useState<'demandas' | 'reunioes'>('demandas');
    const [showDemandAssigneeList, setShowDemandAssigneeList] = useState(false);
    const [showMeetingParticipantsList, setShowMeetingParticipantsList] = useState(false);
    const [dashboardPeriod, setDashboardPeriod] = useState<'week' | '15days' | '30days'>('week');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [showParticipantsList, setShowParticipantsList] = useState(false);

    // Refs for click-outside-close
    const demandComboRef = useRef<HTMLDivElement>(null);
    const meetingComboRef = useRef<HTMLDivElement>(null);

    // Click-outside handler
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (demandComboRef.current && !demandComboRef.current.contains(e.target as Node)) setShowDemandAssigneeList(false);
            if (meetingComboRef.current && !meetingComboRef.current.contains(e.target as Node)) setShowMeetingParticipantsList(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter users for Administrativa module: Administrativa + Admin Geral
    const filteredAdmUsuarios = useMemo(() =>
        allUsuarios.filter(u => u.categoria === 'Administrativa' || u.categoria === 'Admin Geral'),
        [allUsuarios]
    );

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    // Auto-open demand if task_id is in URL (from Chat Mention)
    useEffect(() => {
        if (demandsData && demandsData.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const taskId = params.get('task_id');
            if (taskId) {
                const demand = demandsData.find(d => d.id === taskId);
                if (demand) {
                    setEditingDemand(demand);
                    setDemandForm({ ...demand });
                    setShowDemandModal(true);
                    setActiveTab('demandas');
                    // Clear the URL to prevent re-opening on manual refresh
                    window.history.replaceState({}, '', '/administrativo');
                }
            }
        }
    }, [demandsData]);

    // Click outside to close participants list
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const dropdown = document.getElementById('participants-dropdown');
            const input = document.getElementById('participants-input');
            if (dropdown && !dropdown.contains(event.target as Node) && input && !input.contains(event.target as Node)) {
                setShowParticipantsList(false);
            }
        };
        if (showParticipantsList) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showParticipantsList]);

    // Stats for Dashboard
    const stats = useMemo(() => {
        const opened = demandsData.filter(d => d.status === 'A Fazer' || d.status === 'Fazendo').length;
        const finished = demandsData.filter(d => d.status === 'Finalizado').length;
        const total = demandsData.length;
        const rate = total > 0 ? Math.round((finished / total) * 100) : 0;

        const now = getBahiaDate();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const weekMeetings = meetingsData.filter(m => {
            if (!m.data_hora) return false;
            const d = new Date(m.data_hora);
            return d >= startOfWeek && d <= endOfWeek;
        }).length;

        const upcoming = meetingsData
            .filter(m => m.status === 'Agendada' && m.data_hora && new Date(m.data_hora) >= now)
            .sort((a, b) => new Date(a.data_hora!).getTime() - new Date(b.data_hora!).getTime())[0];

        return { opened, finished, rate, weekMeetings, upcoming };
    }, [demandsData, meetingsData]);

    // Calendar Integration helper
    async function syncToCalendar(meeting: AdminMeeting, isDeleted = false) {
        // Find existing event
        const existing = (calendarEvents || []).find(e => e.origem === 'admin_reuniao' && e.reuniao_id === meeting.id);

        if (isDeleted || meeting.status === 'Cancelada') {
            if (existing) await removeCalendarEvent(existing.id);
            return;
        }

        if (meeting.status === 'Agendada' && meeting.data_hora) {
            const dateObj = new Date(meeting.data_hora);
            const dateStr = dateObj.toISOString().split('T')[0];
            const timeStr = dateObj.toTimeString().split(' ')[0].substring(0, 5);

            const eventData: Omit<CalendarEvent, 'id' | 'created_at'> = {
                titulo: meeting.titulo,
                data: dateStr,
                hora_inicio: timeStr,
                participantes: meeting.participantes,
                descricao: meeting.pauta,
                cor: '#8B5CF6', // Differential color for Admin
                origem: 'admin_reuniao',
                reuniao_id: meeting.id
            };

            if (existing) {
                await updateCalendarEvent(existing.id, eventData);
            } else {
                await addCalendarEvent(eventData);
            }
        } else if (existing) {
            // If moved to Realizada, we might want to keep it or remove it. User said: 
            // "Se a reunião for cancelada, o evento correspondente deve ser removido"
            // It doesn't explicitly say about Realizada, but usually we keep realized events.
            // However, to keep it sync'd with current state:
            if (meeting.status === 'Realizada') {
                // Just update title or something if needed, or keep as is.
            }
        }
        await refetchCalendar();
    }

    // Actions
    async function handleSaveDemand() {
        if (!demandForm.titulo) {
            setToast({ message: 'Preencha o título.', type: 'error' });
            return;
        }
        const oldIds = (editingDemand?.responsaveis_ids || []);
        const newIds = (demandForm.responsaveis_ids || []);
        const addedIds = newIds.filter(id => !oldIds.includes(id));
        try {
            let savedId: string;
            if (editingDemand) {
                await updateAdminDemand(editingDemand.id, demandForm);
                savedId = editingDemand.id;
                setToast({ message: 'Demanda atualizada com sucesso!', type: 'success' });
            } else {
                const created = await addAdminDemand(demandForm as Omit<AdminDemand, 'id' | 'created_at'>);
                savedId = created.id;
                setToast({ message: 'Nova demanda criada com sucesso!', type: 'success' });
            }
            // Send notifications + calendar events to newly added assignees
            if (addedIds.length > 0) {
                sendAssigneeNotificationsAndCalendar(
                    addedIds, demandForm.titulo!, 'Administrativo', savedId,
                    demandForm.data_prevista, demandForm.data_prevista, '#8B5CF6'
                ).catch(console.error);
            }
            setShowDemandModal(false);
            setEditingDemand(null);
            setDemandForm({ titulo: '', descricao: '', responsaveis_ids: [], data_prevista: '', status: 'A Fazer', prioridade: 'Média' });
            refetchDemands();
        } catch (e) {
            console.error(e);
            setToast({ message: 'Erro ao salvar demanda.', type: 'error' });
        }
    }

    async function handleSaveMeeting() {
        if (!meetingForm.titulo || !meetingForm.data_hora) {
            setToast({ message: 'Preencha título e data/hora.', type: 'error' });
            return;
        }
        const oldParticipantIds = editingMeeting?.participantes_ids || [];
        const newParticipantIds = meetingForm.participantes_ids || [];
        const addedIds = newParticipantIds.filter(id => !oldParticipantIds.includes(id));

        try {
            let savedMeeting: AdminMeeting;
            if (editingMeeting) {
                savedMeeting = await updateAdminMeeting(editingMeeting.id, meetingForm);
                setToast({ message: 'Reunião atualizada.', type: 'success' });
            } else {
                savedMeeting = await addAdminMeeting(meetingForm as Omit<AdminMeeting, 'id' | 'created_at'>);
                setToast({ message: 'Reunião agendada com sucesso!', type: 'success' });
            }

            // Sync with Calendar
            await syncToCalendar(savedMeeting);

            // Send notifications to newly added participants
            if (addedIds.length > 0 && meetingForm.data_hora) {
                const dateStr = meetingForm.data_hora.split('T')[0];
                addedIds.forEach(uid => {
                    const dateLabel = new Date(meetingForm.data_hora!).toLocaleString('pt-BR');
                    createNotificationIfEnabled(
                        uid, 'tarefa_atribuida',
                        `Você foi adicionado à reunião '${meetingForm.titulo}' em ${dateLabel}.`,
                        `Você foi adicionado à reunião '${meetingForm.titulo}' em ${dateLabel}.`,
                        '/administrativo', 'Administrativo'
                    ).catch(console.error);
                });
            }

            setShowMeetingModal(false);
            setEditingMeeting(null);
            setMeetingForm({ titulo: '', participantes_ids: [], data_hora: '', pauta: '', status: 'Agendada', local_link: '' });
            refetchMeetings();
        } catch (e) {
            console.error(e);
            setToast({ message: 'Erro ao salvar reunião.', type: 'error' });
        }
    }

    async function updateDemandStatus(id: string, status: AdminDemand['status']) {
        const updates: Partial<AdminDemand> = { status };
        if (status === 'Finalizado') {
            updates.data_conclusao = getBahiaDate().toISOString();
        }
        await updateAdminDemand(id, updates);
        refetchDemands();
    }

    async function updateMeetingStatus(id: string, status: AdminMeeting['status']) {
        const meeting = meetingsData.find(m => m.id === id);
        if (!meeting) return;
        const updated = await updateAdminMeeting(id, { status });
        await syncToCalendar(updated);
        refetchMeetings();
    }

    // Drag and Drop
    function onDragStartDemand(e: React.DragEvent, demand: AdminDemand) {
        setDraggedDemand(demand);
        e.dataTransfer.setData('text/plain', demand.id);
        setTimeout(() => { (e.target as HTMLElement).style.opacity = '0.5'; }, 0);
    }
    function onDragEnd(e: React.DragEvent) {
        (e.target as HTMLElement).style.opacity = '1';
        setDraggedDemand(null);
        setDraggedMeeting(null);
    }
    function onDragOver(e: React.DragEvent) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    function onDropDemand(e: React.DragEvent, status: AdminDemand['status']) {
        e.preventDefault();
        const id = e.dataTransfer.getData('text');
        if (id) {
            updateDemandStatus(id, status);
        }
        setDraggedDemand(null);
    }

    function onDragStartMeeting(e: React.DragEvent, meeting: AdminMeeting) {
        setDraggedMeeting(meeting);
        e.dataTransfer.setData('text/plain', meeting.id);
        setTimeout(() => { (e.target as HTMLElement).style.opacity = '0.5'; }, 0);
    }
    function onDropMeeting(e: React.DragEvent, status: AdminMeeting['status']) {
        e.preventDefault();
        const id = e.dataTransfer.getData('text');
        if (id) {
            updateMeetingStatus(id, status);
        }
        setDraggedMeeting(null);
    }

    const priorityColors = {
        'Alta': '#EF4444',
        'Média': '#F59E0B',
        'Baixa': '#3B82F6'
    };

    return (
        <div style={{ paddingBottom: 60 }}>
            {/* Abas Superiores */}
            <div className="finance-tabs">
                <button
                    className={`finance-tab ${activeTab === 'painel' ? 'active' : ''}`}
                    onClick={() => setActiveTab('painel')}
                >
                    Painel
                </button>
                <button
                    className={`finance-tab ${activeTab === 'demandas' ? 'active' : ''}`}
                    onClick={() => setActiveTab('demandas')}
                >
                    Demandas
                </button>
                <button
                    className={`finance-tab ${activeTab === 'reunioes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reunioes')}
                >
                    Reuniões
                </button>
                <button
                    className={`finance-tab ${activeTab === 'historico' ? 'active' : ''}`}
                    onClick={() => setActiveTab('historico')}
                >
                    Histórico
                </button>
            </div>

            {/* DASHBOARD TAB */}
            {
                activeTab === 'painel' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
                            <div className="kpi-card">
                                <div className="kpi-card-header">
                                    <div className="kpi-card-icon blue"><Clock size={16} /></div>
                                    <span className="kpi-card-label">Demandas Abertas</span>
                                </div>
                                <div className="kpi-card-value">{stats.opened}</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-card-header">
                                    <div className="kpi-card-icon green"><CheckCircle2 size={16} /></div>
                                    <span className="kpi-card-label">Concluídas (Total)</span>
                                </div>
                                <div className="kpi-card-value">{stats.finished}</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-card-header">
                                    <div className="kpi-card-icon amber"><Activity size={16} /></div>
                                    <span className="kpi-card-label">Taxa de Conclusão</span>
                                </div>
                                <div className="kpi-card-value">{stats.rate}%</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-card-header">
                                    <div className="kpi-card-icon red"><Calendar size={16} /></div>
                                    <span className="kpi-card-label">Reuniões esta semana</span>
                                </div>
                                <div className="kpi-card-value">{stats.weekMeetings}</div>
                            </div>
                            <div className="kpi-card" style={{ gridColumn: 'span 1' }}>
                                <div className="kpi-card-header">
                                    <div className="kpi-card-icon blue"><Calendar size={16} /></div>
                                    <span className="kpi-card-label">Próximo Compromisso</span>
                                </div>
                                <div style={{ marginTop: 8 }}>
                                    {stats.upcoming ? (
                                        <>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{stats.upcoming.titulo}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(stats.upcoming.data_hora!).toLocaleString('pt-br')}</div>
                                        </>
                                    ) : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhum agendado</div>}
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <h3 style={{ fontSize: 16, fontWeight: 600 }}>Próximos Compromissos</h3>
                                <select className="form-select" style={{ width: 160 }} value={dashboardPeriod} onChange={e => setDashboardPeriod(e.target.value as any)}>
                                    <option value="week">Esta semana</option>
                                    <option value="15days">Próximos 15 dias</option>
                                    <option value="30days">Próximos 30 dias</option>
                                </select>
                            </div>
                            <div className="table-card">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Reunião</th>
                                            <th>Data e Hora</th>
                                            <th>Participantes</th>
                                            <th>Local / Link</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {meetingsData
                                            .filter(m => {
                                                if (m.status !== 'Agendada' || !m.data_hora) return false;
                                                const d = new Date(m.data_hora);
                                                const now = getBahiaDate();
                                                if (d < now) return false;
                                                const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
                                                if (dashboardPeriod === 'week') return diff <= 7;
                                                if (dashboardPeriod === '15days') return diff <= 15;
                                                return diff <= 30;
                                            })
                                            .sort((a, b) => new Date(a.data_hora!).getTime() - new Date(b.data_hora!).getTime())
                                            .map(m => (
                                                <tr key={m.id}>
                                                    <td style={{ fontWeight: 500 }}>{m.titulo}</td>
                                                    <td>{m.data_hora ? new Date(m.data_hora).toLocaleString('pt-br') : '-'}</td>
                                                    <td>{m.participantes || '-'}</td>
                                                    <td>{m.local_link || '-'}</td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                                {meetingsData.filter(m => m.status === 'Agendada').length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>Nenhuma reunião agendada no período.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* DEMANDAS TAB */}
            {
                activeTab === 'demandas' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Demandas Organizacionais</h2>
                            <button className="btn btn-primary" onClick={() => { setEditingDemand(null); setDemandForm({ titulo: '', descricao: '', responsaveis_ids: [], data_prevista: '', status: 'A Fazer', prioridade: 'Média' }); setShowDemandModal(true); }}>
                                <Plus size={14} /> Nova Demanda
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 16 }}>
                            {DEMAND_COLUMNS.filter(c => c.id !== 'Finalizado').map(col => {
                                const colDemands = demandsData.filter(d => d.status === col.id);
                                return (
                                    <div key={col.id} style={{
                                        minWidth: 320, width: 320, background: 'var(--bg-secondary)', padding: 16, borderRadius: 12,
                                        border: '1px solid rgba(255,255,255,0.05)', minHeight: 400
                                    }} onDragOver={onDragOver} onDrop={(e) => onDropDemand(e, col.id as AdminDemand['status'])}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, marginBottom: 16, color: col.color }}>
                                            {col.label}
                                            <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 12, color: 'var(--text-primary)', marginLeft: 'auto' }}>{colDemands.length}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {colDemands.map(d => (
                                                <div key={d.id} draggable onDragStart={(e) => onDragStartDemand(e, d)} onDragEnd={onDragEnd}
                                                    onClick={() => { setEditingDemand(d); setDemandForm({ ...d }); setShowDemandModal(true); }}
                                                    style={{
                                                        background: 'var(--bg-primary)', padding: 14, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', cursor: 'grab',
                                                        borderLeft: `4px solid ${priorityColors[d.prioridade || 'Média']}`, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                    }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                                        <strong style={{ fontSize: 13, lineHeight: 1.4 }}>{d.titulo}</strong>
                                                    </div>
                                                    {d.descricao && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.descricao}</div>}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            {/* Avatar stack for multiple assignees */}
                                                            {(d.responsaveis_ids || []).slice(0, 3).map((uid, idx) => {
                                                                const u = allUsuarios.find(x => x.id === uid);
                                                                return (
                                                                    <div key={uid} title={u?.nome || uid} style={{
                                                                        width: 22, height: 22, borderRadius: '50%', background: 'var(--primary)',
                                                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        fontSize: 9, fontWeight: 700, marginLeft: idx > 0 ? -6 : 0,
                                                                        border: '1px solid var(--bg-primary)', flexShrink: 0
                                                                    }}>
                                                                        {(u?.nome || '?').slice(0, 2).toUpperCase()}
                                                                    </div>
                                                                );
                                                            })}
                                                            {(d.responsaveis_ids || []).length === 0 && (
                                                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={12} color="var(--text-muted)" /></div>
                                                            )}
                                                            {(d.responsaveis_ids || []).length > 3 && (
                                                                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>+{(d.responsaveis_ids || []).length - 3}</span>
                                                            )}
                                                        </div>
                                                        {d.data_prevista && (
                                                            <div style={{ fontSize: 10, color: new Date(d.data_prevista) < getBahiaDate() && d.status !== 'Finalizado' ? '#EF4444' : 'var(--text-muted)', fontWeight: 500 }}>
                                                                {formatLocalSystemDate(d.data_prevista).slice(0, 5)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {colDemands.length === 0 && (
                                                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '30px 0', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 10 }}>Mova uma demanda para cá</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Drop zone for Finalizado (hidden column) */}
                            <div style={{ minWidth: 320, width: 320, display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(16,185,129,0.05)', padding: 16, borderRadius: 12, border: '2px dashed rgba(16,185,129,0.3)', minHeight: 400 }}
                                onDragOver={onDragOver} onDrop={(e) => onDropDemand(e, 'Finalizado')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10B981', fontWeight: 600 }}><CheckCircle2 size={16} /> Finalizado</div>
                                </div>
                                <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                                    Arraste demandas aqui para finalizar.<br />Cards finalizados vão para o Histórico.
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* REUNIOES TAB */}
            {
                activeTab === 'reunioes' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 600 }}>Reuniões Organizacionais</h2>
                            <button className="btn btn-primary" onClick={() => { setEditingMeeting(null); setMeetingForm({ titulo: '', participantes: '', data_hora: '', pauta: '', status: 'Agendada', local_link: '' }); setShowMeetingModal(true); }}>
                                <Plus size={14} /> Nova Reunião
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 16 }}>
                            {MEETING_STATUSES.filter(s => s === 'Agendada').map(status => {
                                const statusMeetings = meetingsData.filter(m => m.status === status);
                                const statusColors: Record<string, string> = { 'Agendada': '#3B82F6', 'Realizada': '#10B981', 'Cancelada': '#EF4444' };
                                return (
                                    <div key={status} style={{ minWidth: 320, width: 320, background: 'var(--bg-secondary)', padding: 18, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', minHeight: 400 }}
                                        onDragOver={onDragOver} onDrop={(e) => onDropMeeting(e, status as AdminMeeting['status'])}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: statusColors[status], fontWeight: 600, marginBottom: 16 }}>
                                            {status}
                                            <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 12, color: 'var(--text-primary)', marginLeft: 'auto' }}>{statusMeetings.length}</span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                            {statusMeetings.map(m => (
                                                <div key={m.id} draggable onDragStart={(e) => onDragStartMeeting(e, m)} onDragEnd={onDragEnd} onClick={() => { setEditingMeeting(m); setMeetingForm({ ...m }); setShowMeetingModal(true); }}
                                                    style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', cursor: 'grab', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                                    <strong style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>{m.titulo}</strong>

                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                        {m.data_hora && (
                                                            <div style={{ fontSize: 11, color: '#3B82F6', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <Clock size={12} /> {new Date(m.data_hora).toLocaleString('pt-br', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        )}
                                                        {m.participantes && (
                                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                <Users size={12} /> {m.participantes}
                                                            </div>
                                                        )}
                                                        {m.local_link && (
                                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                {m.local_link.includes('http') ? <Video size={12} /> : <MapPin size={12} />}
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.local_link}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {statusMeetings.length === 0 && (
                                                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', padding: '40px 0', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: 10 }}>Mova uma reunião para cá</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Drop zones for Realizada and Cancelada */}
                            <div style={{ display: 'flex', gap: 20 }}>
                                <div style={{ minWidth: 320, width: 320, display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(16,185,129,0.05)', padding: 18, borderRadius: 12, border: '2px dashed rgba(16,185,129,0.3)', minHeight: 400 }}
                                    onDragOver={onDragOver} onDrop={(e) => onDropMeeting(e, 'Realizada')}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10B981', fontWeight: 600, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <CheckCircle2 size={16} /> Marcar como Realizada
                                    </div>
                                    <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                                        Arraste aqui para concluir.<br />Será movido para o Histórico.
                                    </div>
                                </div>

                                <div style={{ minWidth: 320, width: 320, display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(239,68,68,0.05)', padding: 18, borderRadius: 12, border: '2px dashed rgba(239,68,68,0.3)', minHeight: 400 }}
                                    onDragOver={onDragOver} onDrop={(e) => onDropMeeting(e, 'Cancelada')}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#EF4444', fontWeight: 600, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Activity size={16} /> Marcar como Cancelada
                                    </div>
                                    <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                                        Arraste aqui para cancelar.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* HISTORICO TAB */}
            {
                activeTab === 'historico' && (
                    <div className="card" style={{ padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button className={`btn ${historyFilter === 'demandas' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setHistoryFilter('demandas')}>Demandas Finalizadas</button>
                                <button className={`btn ${historyFilter === 'reunioes' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setHistoryFilter('reunioes')}>Reuniões Realizadas/Canceladas</button>
                            </div>
                            <button className="btn btn-secondary" style={{ color: '#EF4444', borderColor: '#EF4444' }} onClick={async () => {
                                if (confirm('Tem certeza que deseja limpar TODO o histórico? Esta ação não pode ser desfeita.')) {
                                    try {
                                        if (historyFilter === 'demandas') {
                                            const items = demandsData.filter(d => d.status === 'Finalizado');
                                            for (const it of items) await removeAdminDemand(it.id);
                                            refetchDemands();
                                        } else {
                                            const items = meetingsData.filter(m => m.status !== 'Agendada');
                                            for (const it of items) await removeAdminMeeting(it.id);
                                            refetchMeetings();
                                        }
                                        setToast({ message: 'Histórico limpo com sucesso.', type: 'success' });
                                    } catch (e) {
                                        setToast({ message: 'Erro ao limpar histórico.', type: 'error' });
                                    }
                                }
                            }}>
                                Limpar Histórico
                            </button>
                        </div>

                        {historyFilter === 'demandas' ? (
                            <div className="table-card">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Título</th>
                                            <th>Responsável</th>
                                            <th>Prioridade</th>
                                            <th>Criação</th>
                                            <th>Conclusão</th>
                                            <th style={{ width: 40 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {demandsData.filter(d => d.status === 'Finalizado').map(d => (
                                            <tr key={d.id}>
                                                <td style={{ fontWeight: 500 }}>{d.titulo}</td>
                                                <td>{teamMembers.find(t => t.id === d.responsavel_id)?.name || '-'}</td>
                                                <td>
                                                    <span style={{ color: priorityColors[d.prioridade || 'Média'], fontWeight: 600, fontSize: 11 }}>{d.prioridade || 'Média'}</span>
                                                </td>
                                                <td>{d.created_at ? new Date(d.created_at).toLocaleDateString('pt-br') : '-'}</td>
                                                <td>{d.data_conclusao ? formatLocalSystemDate(d.data_conclusao) : '-'}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button className="header-action-btn" style={{ color: '#EF4444', padding: 4 }} onClick={async () => {
                                                        if (confirm('Deseja apagar este registro do histórico?')) {
                                                            await removeAdminDemand(d.id);
                                                            refetchDemands();
                                                            setToast({ message: 'Registro excluído.', type: 'success' });
                                                        }
                                                    }}>✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="table-card">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Título</th>
                                            <th>Participantes</th>
                                            <th>Data</th>
                                            <th>Status Final</th>
                                            <th>Pauta</th>
                                            <th style={{ width: 40 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {meetingsData.filter(m => m.status !== 'Agendada').map(m => (
                                            <tr key={m.id}>
                                                <td style={{ fontWeight: 500 }}>{m.titulo}</td>
                                                <td>{m.participantes || '-'}</td>
                                                <td>{m.data_hora ? formatLocalSystemDate(m.data_hora) : '-'}</td>
                                                <td>
                                                    <span style={{
                                                        color: m.status === 'Realizada' ? '#10B981' : '#EF4444',
                                                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                                                        background: m.status === 'Realizada' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'
                                                    }}>
                                                        {m.status}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.pauta || '-'}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button className="header-action-btn" style={{ color: '#EF4444', padding: 4 }} onClick={async () => {
                                                        if (confirm('Deseja apagar este registro do histórico?')) {
                                                            await removeAdminMeeting(m.id);
                                                            await syncToCalendar(m, true);
                                                            refetchMeetings();
                                                            setToast({ message: 'Registro excluído.', type: 'success' });
                                                        }
                                                    }}>✕</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )
            }

            {/* MODAL DEMANDA */}
            {showDemandModal && (
                <div className="modal-overlay" onClick={() => setShowDemandModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingDemand ? 'Editar Demanda' : 'Nova Demanda'}</h2>
                            <button className="modal-close" onClick={() => setShowDemandModal(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label className="form-label">Título *</label>
                                <input type="text" className="form-input" value={demandForm.titulo || ''} onChange={e => setDemandForm({ ...demandForm, titulo: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label className="form-label">Responsáveis</label>
                                    <div className="combobox-container" ref={demandComboRef}>
                                        <div className={`combobox-trigger ${showDemandAssigneeList ? 'active' : ''}`} onClick={() => setShowDemandAssigneeList(!showDemandAssigneeList)}>
                                            {(demandForm.responsaveis_ids || []).length > 0 ? (
                                                (demandForm.responsaveis_ids || []).map(uid => {
                                                    const u = filteredAdmUsuarios.find(x => x.id === uid) || allUsuarios.find(x => x.id === uid);
                                                    return (
                                                        <span key={uid} className="combobox-chip">
                                                            {u?.nome || uid}
                                                            <span className="combobox-chip-remove" onClick={e => { e.stopPropagation(); setDemandForm({ ...demandForm, responsaveis_ids: (demandForm.responsaveis_ids || []).filter(x => x !== uid) }); }}>×</span>
                                                        </span>
                                                    );
                                                })
                                            ) : <span className="combobox-placeholder">Selecione os responsáveis...</span>}
                                        </div>
                                        {showDemandAssigneeList && (
                                            <div className="combobox-dropdown">
                                                {filteredAdmUsuarios.map(u => {
                                                    const isSel = (demandForm.responsaveis_ids || []).includes(u.id);
                                                    return (
                                                        <div key={u.id} className={`combobox-item ${isSel ? 'selected' : ''}`}
                                                            onClick={() => {
                                                                const ids = demandForm.responsaveis_ids || [];
                                                                setDemandForm({ ...demandForm, responsaveis_ids: isSel ? ids.filter(x => x !== u.id) : [...ids, u.id] });
                                                            }}>
                                                            <div className="combobox-item-avatar">{u.nome.slice(0, 2).toUpperCase()}</div>
                                                            <div className="combobox-item-info">
                                                                <div className="combobox-item-name">{u.nome}</div>
                                                                <div className="combobox-item-role">{u.cargo || u.categoria}</div>
                                                            </div>
                                                            <span className="combobox-item-check">✓</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Prioridade</label>
                                    <select className="form-select" value={demandForm.prioridade || 'Média'} onChange={e => setDemandForm({ ...demandForm, prioridade: e.target.value as any })}>
                                        {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Descrição</label>
                                <textarea className="form-input" rows={3} value={demandForm.descricao || ''} onChange={e => setDemandForm({ ...demandForm, descricao: e.target.value })} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label className="form-label">Prazo de Conclusão</label>
                                    <input type="date" className="form-input" value={demandForm.data_prevista ? demandForm.data_prevista.slice(0, 10) : ''} onChange={e => setDemandForm({ ...demandForm, data_prevista: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Status</label>
                                    <select className="form-select" value={demandForm.status || 'A Fazer'} onChange={e => setDemandForm({ ...demandForm, status: e.target.value as any })}>
                                        {DEMAND_COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                                {confirmDeleteDemandId === editingDemand?.id ? (
                                    <>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn" style={{ padding: '8px 16px', background: 'var(--danger)', color: '#fff', borderRadius: 8 }} onClick={async () => {
                                                const id = editingDemand!.id;
                                                await removeAdminDemand(id);
                                                refetchDemands();
                                                setShowDemandModal(false);
                                                setConfirmDeleteDemandId(null);
                                            }}>Confirmar Exclusão</button>
                                        </div>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <button className="btn btn-secondary" onClick={() => setConfirmDeleteDemandId(null)}>Cancelar</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            {editingDemand && (
                                                <button className="btn" style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: 8 }} onClick={() => setConfirmDeleteDemandId(editingDemand.id)}>
                                                    Excluir Demanda
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <button className="btn btn-secondary" onClick={() => setShowDemandModal(false)}>Cancelar</button>
                                            <button className="btn btn-primary" onClick={handleSaveDemand}>{editingDemand ? 'Salvar Alterações' : 'Criar Demanda'}</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL REUNIÃO */}
            {showMeetingModal && (
                <div className="modal-overlay" onClick={() => setShowMeetingModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingMeeting ? 'Editar Reunião' : 'Nova Reunião'}</h2>
                            <button className="modal-close" onClick={() => setShowMeetingModal(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label className="form-label">Título *</label>
                                <input type="text" className="form-input" value={meetingForm.titulo || ''} onChange={e => setMeetingForm({ ...meetingForm, titulo: e.target.value })} />
                            </div>
                            <div>
                                <label className="form-label">Participantes</label>
                                <div className="combobox-container" ref={meetingComboRef}>
                                    <div className={`combobox-trigger ${showMeetingParticipantsList ? 'active' : ''}`} onClick={() => setShowMeetingParticipantsList(!showMeetingParticipantsList)}>
                                        {(meetingForm.participantes_ids || []).length > 0 ? (
                                            (meetingForm.participantes_ids || []).map(uid => {
                                                const u = filteredAdmUsuarios.find(x => x.id === uid) || allUsuarios.find(x => x.id === uid);
                                                return (
                                                    <span key={uid} className="combobox-chip">
                                                        {u?.nome || uid}
                                                        <span className="combobox-chip-remove" onClick={e => { e.stopPropagation(); setMeetingForm({ ...meetingForm, participantes_ids: (meetingForm.participantes_ids || []).filter(x => x !== uid) }); }}>×</span>
                                                    </span>
                                                );
                                            })
                                        ) : <span className="combobox-placeholder">Selecione os participantes...</span>}
                                    </div>
                                    {showMeetingParticipantsList && (
                                        <div className="combobox-dropdown">
                                            {filteredAdmUsuarios.map(u => {
                                                const isSel = (meetingForm.participantes_ids || []).includes(u.id);
                                                return (
                                                    <div key={u.id} className={`combobox-item ${isSel ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            const ids = meetingForm.participantes_ids || [];
                                                            setMeetingForm({ ...meetingForm, participantes_ids: isSel ? ids.filter(x => x !== u.id) : [...ids, u.id] });
                                                        }}>
                                                        <div className="combobox-item-avatar">{u.nome.slice(0, 2).toUpperCase()}</div>
                                                        <div className="combobox-item-info">
                                                            <div className="combobox-item-name">{u.nome}</div>
                                                            <div className="combobox-item-role">{u.cargo || u.categoria}</div>
                                                        </div>
                                                        <span className="combobox-item-check">✓</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label className="form-label">Data/Hora *</label>
                                    <input
                                        type="datetime-local"
                                        className="form-input"
                                        value={meetingForm.data_hora ? (
                                            (() => {
                                                const d = new Date(meetingForm.data_hora);
                                                if (isNaN(d.getTime())) return '';
                                                return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                                            })()
                                        ) : ''}
                                        onChange={e => setMeetingForm({ ...meetingForm, data_hora: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Status</label>
                                    <select className="form-select" value={meetingForm.status || 'Agendada'} onChange={e => setMeetingForm({ ...meetingForm, status: e.target.value as any })}>
                                        {MEETING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Local ou Link</label>
                                <input type="text" className="form-input" placeholder="Google Meet link ou Sala de Reunião" value={meetingForm.local_link || ''} onChange={e => setMeetingForm({ ...meetingForm, local_link: e.target.value })} />
                            </div>
                            <div>
                                <label className="form-label">Pauta</label>
                                <textarea className="form-input" rows={3} value={meetingForm.pauta || ''} onChange={e => setMeetingForm({ ...meetingForm, pauta: e.target.value })} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                                {confirmDeleteMeetingId === editingMeeting?.id ? (
                                    <>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn" style={{ padding: '8px 16px', background: 'var(--danger)', color: '#fff', borderRadius: 8 }} onClick={async () => {
                                                const meeting = editingMeeting!;
                                                await removeAdminMeeting(meeting.id);
                                                await syncToCalendar(meeting, true);
                                                refetchMeetings();
                                                setShowMeetingModal(false);
                                                setConfirmDeleteMeetingId(null);
                                            }}>Confirmar Exclusão</button>
                                        </div>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <button className="btn btn-secondary" onClick={() => setConfirmDeleteMeetingId(null)}>Cancelar</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            {editingMeeting && (
                                                <button className="btn" style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: 8 }} onClick={() => setConfirmDeleteMeetingId(editingMeeting.id)}>
                                                    Excluir Reunião
                                                </button>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <button className="btn btn-secondary" onClick={() => setShowMeetingModal(false)}>Cancelar</button>
                                            <button className="btn btn-primary" onClick={handleSaveMeeting}>{editingMeeting ? 'Salvar Alterações' : 'Criar Reunião'}</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: 24, right: 24, padding: '12px 20px', borderRadius: 8, zIndex: 10000,
                    background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
                    color: '#fff', fontWeight: 600, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    display: 'flex', alignItems: 'center', gap: 10, animation: 'slideIn 0.3s ease-out'
                }}>
                    {toast.type === 'success' ? <CheckCircle2 size={18} /> : <Activity size={18} />}
                    {toast.message}
                </div>
            )}
        </div>
    );
}
