'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
    ChevronLeft, ChevronRight, Plus, X, CalendarDays, List, Clock
} from 'lucide-react';
import type { CalendarEvent } from '@/lib/types';
import { useCalendarEvents, addCalendarEvent, updateCalendarEvent, removeCalendarEvent, useUsuarios, addNotification } from '@/lib/hooks';
import type { UsuarioDB } from '@/lib/hooks';
import { getBahiaDate, getBahiaDateString } from '@/lib/utils';
import { useAuth } from '../contexts/AuthContext';

const EVENT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

type ViewMode = 'month' | 'week' | 'day';

export default function CalendarioPage() {
    const { user } = useAuth();
    const { data: eventsData, refetch } = useCalendarEvents(user?.id);
    const { data: usuarios } = useUsuarios();

    const [currentDate, setCurrentDate] = useState(getBahiaDate());
    const [view, setView] = useState<ViewMode>('month');
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

    // Form state
    const [formTitulo, setFormTitulo] = useState('');
    const [formData, setFormData] = useState('');
    const [formHoraInicio, setFormHoraInicio] = useState('09:00');
    const [formHoraFim, setFormHoraFim] = useState('10:00');
    const [formDescricao, setFormDescricao] = useState('');
    const [formCor, setFormCor] = useState('#3B82F6');
    const [formParticipantesIds, setFormParticipantesIds] = useState<string[]>([]);

    // Combobox state
    const [showParticipantesList, setShowParticipantesList] = useState(false);
    const participantesRef = useRef<HTMLDivElement>(null);

    // Close combobox on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (participantesRef.current && !participantesRef.current.contains(e.target as Node)) {
                setShowParticipantesList(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    function resetForm(dateStr?: string) {
        setFormTitulo('');
        setFormData(dateStr || getBahiaDateString());
        setFormHoraInicio('09:00');
        setFormHoraFim('10:00');
        setFormDescricao('');
        setFormCor('#3B82F6');
        setFormParticipantesIds([]);
    }

    function openNewEvent(dateStr?: string) {
        setEditingEvent(null);
        resetForm(dateStr);
        setShowModal(true);
    }

    function openEditEvent(ev: CalendarEvent) {
        setEditingEvent(ev);
        setFormTitulo(ev.titulo || '');
        setFormData(ev.data || '');
        setFormHoraInicio(ev.hora_inicio || '');
        setFormHoraFim(ev.hora_fim || '');
        setFormDescricao(ev.descricao || '');
        setFormCor(ev.cor || '#3B82F6');
        setFormParticipantesIds(ev.participantes_ids || []);
        setShowModal(true);
    }

    function resolveUserName(uid: string): string {
        const u = usuarios.find(x => x.id === uid);
        return u?.nome || uid;
    }

    async function saveEvent() {
        if (!formTitulo || !formData) return;
        try {
            const payload: any = {
                titulo: formTitulo,
                data: formData,
                hora_inicio: formHoraInicio || undefined,
                hora_fim: formHoraFim || undefined,
                descricao: formDescricao || undefined,
                cor: formCor,
                participantes_ids: formParticipantesIds,
                participantes: formParticipantesIds.map(uid => resolveUserName(uid)).join(', '),
                origem: 'manual',
            };

            if (editingEvent) {
                // Find newly added participants
                const oldIds = editingEvent.participantes_ids || [];
                const newIds = formParticipantesIds.filter(id => !oldIds.includes(id));

                await updateCalendarEvent(editingEvent.id, payload);

                // Notify only newly added participants
                if (newIds.length > 0 && user) {
                    await notifyParticipants(newIds, formTitulo, formData);
                }
            } else {
                payload.owner_id = user?.id;
                const created = await addCalendarEvent(payload as Omit<CalendarEvent, 'id' | 'created_at'>);

                // Notify all participants
                if (formParticipantesIds.length > 0 && user) {
                    await notifyParticipants(formParticipantesIds, formTitulo, formData);
                }
            }
            await refetch();
            setShowModal(false);
            setEditingEvent(null);
        } catch (e: any) { alert(e.message); }
    }

    async function notifyParticipants(participantIds: string[], titulo: string, data: string) {
        const formattedDate = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR');
        const authorName = user?.nome || 'Alguém';

        for (const uid of participantIds) {
            if (uid === user?.id) continue; // Don't notify yourself
            try {
                await addNotification({
                    usuario_id: uid,
                    tipo: 'tarefa_atribuida',
                    titulo: `Novo evento no calendário`,
                    mensagem: `${authorName} adicionou você ao evento "${titulo}" em ${formattedDate}.`,
                    redirecionamento: '/calendario',
                    modulo_origem: 'calendario',
                    criada_em: new Date().toISOString(),
                });
            } catch (err) {
                console.error('Error notifying participant:', err);
            }
        }
    }

    async function deleteEvent() {
        if (editingEvent) {
            try {
                await removeCalendarEvent(editingEvent.id);
                await refetch();
                setShowModal(false);
                setEditingEvent(null);
            } catch (e: any) { alert(e.message); }
        }
    }

    // Navigation
    function navigate(dir: number) {
        const d = new Date(currentDate);
        if (view === 'month') d.setMonth(d.getMonth() + dir);
        else if (view === 'week') d.setDate(d.getDate() + 7 * dir);
        else d.setDate(d.getDate() + dir);
        setCurrentDate(d);
    }

    // Calendar grid for month view
    const monthGrid = useMemo(() => {
        const year = currentDate.getFullYear(), month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells: (number | null)[] = Array(firstDay).fill(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    }, [currentDate]);

    // Week view dates
    const weekDates = useMemo(() => {
        const d = new Date(currentDate);
        d.setDate(d.getDate() - d.getDay());
        return Array.from({ length: 7 }, (_, i) => { const nd = new Date(d); nd.setDate(nd.getDate() + i); return nd; });
    }, [currentDate]);

    const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 - 20:00

    function getEventsForDate(dateStr: string) {
        return (eventsData || []).filter(e => e.data === dateStr);
    }

    function dateToStr(d: Date) {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    const todayStr = getBahiaDateString();

    return (
        <div style={{ paddingBottom: 60 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 600 }}>Calendário</h1>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <button className="btn btn-primary" onClick={() => openNewEvent()}><Plus size={14} /> Novo Evento</button>
                </div>
            </div>

            {/* View selector + navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => navigate(-1)}><ChevronLeft size={18} /></button>
                    <h2 style={{ fontSize: 18, fontWeight: 600, minWidth: 200, textAlign: 'center' }}>
                        {view === 'month' && `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                        {view === 'week' && `Semana de ${weekDates[0].toLocaleDateString('pt-br')} a ${weekDates[6].toLocaleDateString('pt-br')}`}
                        {view === 'day' && currentDate.toLocaleDateString('pt-br', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </h2>
                    <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => navigate(1)}><ChevronRight size={18} /></button>
                    <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setCurrentDate(getBahiaDate())}>Hoje</button>
                </div>
                <div className="finance-tabs" style={{ marginBottom: 0 }}>
                    <button className={`finance-tab ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Mês</button>
                    <button className={`finance-tab ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Semana</button>
                    <button className={`finance-tab ${view === 'day' ? 'active' : ''}`} onClick={() => setView('day')}>Dia</button>
                </div>
            </div>

            {/* MONTH VIEW */}
            {view === 'month' && (
                <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg-secondary)' }}>
                        {WEEKDAYS.map(d => (
                            <div key={d} style={{ padding: '10px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{d}</div>
                        ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                        {monthGrid.map((day, i) => {
                            if (day === null) return <div key={`e${i}`} style={{ minHeight: 100, background: 'var(--bg-primary)', borderRight: i % 7 !== 6 ? '1px solid rgba(255,255,255,0.03)' : 'none', borderBottom: '1px solid rgba(255,255,255,0.03)' }} />;
                            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const dayEvents = getEventsForDate(dateStr);
                            const isToday = dateStr === todayStr;
                            return (
                                <div key={dateStr} style={{ minHeight: 100, padding: 8, background: isToday ? 'rgba(59,130,246,0.05)' : 'var(--bg-primary)', borderRight: i % 7 !== 6 ? '1px solid rgba(255,255,255,0.03)' : 'none', borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
                                    onClick={() => openNewEvent(dateStr)}>
                                    <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? '#3B82F6' : 'var(--text-primary)', marginBottom: 4 }}>{day}</div>
                                    {dayEvents.slice(0, 3).map(ev => (
                                        <div key={ev.id} onClick={e => { e.stopPropagation(); openEditEvent(ev); }}
                                            style={{ fontSize: 11, padding: '2px 6px', marginBottom: 2, borderRadius: 4, background: `${ev.cor || '#3B82F6'}30`, color: ev.cor || '#3B82F6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}>
                                            {ev.hora_inicio && <span>{ev.hora_inicio} </span>}{ev.titulo}
                                        </div>
                                    ))}
                                    {dayEvents.length > 3 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{dayEvents.length - 3} mais</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* WEEK VIEW */}
            {view === 'week' && (
                <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', background: 'var(--bg-secondary)' }}>
                        <div style={{ padding: 10, borderBottom: '1px solid rgba(255,255,255,0.05)' }} />
                        {weekDates.map((d, i) => {
                            const ds = dateToStr(d);
                            const isToday = ds === todayStr;
                            return (
                                <div key={i} style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', borderLeft: '1px solid rgba(255,255,255,0.03)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{WEEKDAYS[d.getDay()]}</div>
                                    <div style={{ fontSize: 16, fontWeight: isToday ? 700 : 400, color: isToday ? '#3B82F6' : 'var(--text-primary)' }}>{d.getDate()}</div>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        {hours.map(h => (
                            <div key={h} style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', minHeight: 50, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text-muted)', textAlign: 'right' }}>{String(h).padStart(2, '0')}:00</div>
                                {weekDates.map((d, i) => {
                                    const ds = dateToStr(d);
                                    const hourEvents = getEventsForDate(ds).filter(ev => {
                                        if (!ev.hora_inicio) return false;
                                        const eH = parseInt(ev.hora_inicio.split(':')[0]);
                                        return eH === h;
                                    });
                                    return (
                                        <div key={i} style={{ borderLeft: '1px solid rgba(255,255,255,0.03)', padding: 2, cursor: 'pointer' }} onClick={() => openNewEvent(ds)}>
                                            {hourEvents.map(ev => (
                                                <div key={ev.id} onClick={e => { e.stopPropagation(); openEditEvent(ev); }}
                                                    style={{ fontSize: 11, padding: '4px 6px', borderRadius: 4, background: `${ev.cor || '#3B82F6'}30`, color: ev.cor || '#3B82F6', marginBottom: 2, cursor: 'pointer' }}>
                                                    {ev.titulo}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* DAY VIEW */}
            {view === 'day' && (
                <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {hours.map(h => {
                            const ds = dateToStr(currentDate);
                            const hourEvents = getEventsForDate(ds).filter(ev => {
                                if (!ev.hora_inicio) return h === 7;
                                return parseInt(ev.hora_inicio.split(':')[0]) === h;
                            });
                            return (
                                <div key={h} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', minHeight: 60, borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                    <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--text-muted)', textAlign: 'right', fontWeight: 500 }}>{String(h).padStart(2, '0')}:00</div>
                                    <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', padding: 6, cursor: 'pointer' }} onClick={() => openNewEvent(ds)}>
                                        {hourEvents.map(ev => {
                                            const participantNames = (ev.participantes_ids || []).map(uid => resolveUserName(uid)).join(', ');
                                            return (
                                                <div key={ev.id} onClick={e => { e.stopPropagation(); openEditEvent(ev); }}
                                                    style={{ padding: '8px 12px', borderRadius: 6, background: `${ev.cor || '#3B82F6'}20`, borderLeft: `3px solid ${ev.cor || '#3B82F6'}`, marginBottom: 4, cursor: 'pointer' }}>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.titulo}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                        {ev.hora_inicio && <span>{ev.hora_inicio}</span>}
                                                        {ev.hora_fim && <span> — {ev.hora_fim}</span>}
                                                        {participantNames && <span> · {participantNames}</span>}
                                                    </div>
                                                    {ev.descricao && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{ev.descricao}</div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Event Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => { setShowModal(false); setEditingEvent(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingEvent ? 'Editar Evento' : 'Novo Evento'}</h2>
                            <button className="modal-close" onClick={() => { setShowModal(false); setEditingEvent(null); }}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div><label className="form-label">Título *</label><input type="text" className="form-input" value={formTitulo} onChange={e => setFormTitulo(e.target.value)} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                <div><label className="form-label">Data *</label><input type="date" className="form-input" value={formData} onChange={e => setFormData(e.target.value)} /></div>
                                <div><label className="form-label">Início</label><input type="time" className="form-input" value={formHoraInicio} onChange={e => setFormHoraInicio(e.target.value)} /></div>
                                <div><label className="form-label">Fim</label><input type="time" className="form-input" value={formHoraFim} onChange={e => setFormHoraFim(e.target.value)} /></div>
                            </div>

                            {/* Participants Combobox */}
                            <div>
                                <label className="form-label">Participantes</label>
                                <div className="combobox-container" ref={participantesRef}>
                                    <div className={`combobox-trigger ${showParticipantesList ? 'active' : ''}`} onClick={() => setShowParticipantesList(!showParticipantesList)}>
                                        {formParticipantesIds.length > 0 ? formParticipantesIds.map(uid => {
                                            const u = usuarios.find(x => x.id === uid);
                                            return (
                                                <span key={uid} className="combobox-chip">
                                                    {u?.nome || uid}
                                                    <span className="combobox-chip-remove" onClick={ev => { ev.stopPropagation(); setFormParticipantesIds(formParticipantesIds.filter(x => x !== uid)); }}>×</span>
                                                </span>
                                            );
                                        }) : <span className="combobox-placeholder">Selecione participantes...</span>}
                                    </div>
                                    {showParticipantesList && (
                                        <div className="combobox-dropdown">
                                            {usuarios.filter(u => u.id !== user?.id).map(u => {
                                                const isSel = formParticipantesIds.includes(u.id);
                                                return (
                                                    <div key={u.id} className={`combobox-item ${isSel ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            setFormParticipantesIds(isSel
                                                                ? formParticipantesIds.filter(x => x !== u.id)
                                                                : [...formParticipantesIds, u.id]
                                                            );
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

                            <div><label className="form-label">Descrição</label><textarea className="form-input" rows={3} value={formDescricao} onChange={e => setFormDescricao(e.target.value)} /></div>
                            <div>
                                <label className="form-label">Cor</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {EVENT_COLORS.map(c => (
                                        <button key={c} onClick={() => setFormCor(c)} style={{
                                            width: 28, height: 28, borderRadius: '50%', background: c, border: formCor === c ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer'
                                        }} />
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                                <div>{editingEvent && <button className="btn" style={{ background: 'var(--danger)', color: 'white', fontSize: 12 }} onClick={deleteEvent}>Excluir</button>}</div>
                                <div style={{ display: 'flex', gap: 12 }}>
                                    <button className="btn btn-secondary" onClick={() => { setShowModal(false); setEditingEvent(null); }}>Cancelar</button>
                                    <button className="btn btn-primary" onClick={saveEvent}>{editingEvent ? 'Salvar' : 'Criar Evento'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
