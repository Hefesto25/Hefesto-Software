'use client';

import { useState, useMemo } from 'react';
import {
    ChevronLeft, ChevronRight, Plus, X, CalendarDays, List, Clock, Users
} from 'lucide-react';
import type { CalendarEvent } from '@/lib/types';
import { useTeam, useCalendarEvents, addCalendarEvent, updateCalendarEvent, removeCalendarEvent } from '@/lib/hooks';
import { getBahiaDate, getBahiaDateString } from '@/lib/utils';

const EVENT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

type ViewMode = 'month' | 'week' | 'day';

export default function CalendarioPage() {
    const { data: eventsData, refetch } = useCalendarEvents();
    const { data: teamMembers } = useTeam();

    const [currentDate, setCurrentDate] = useState(getBahiaDate());
    const [view, setView] = useState<ViewMode>('month');
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [filterMember, setFilterMember] = useState('');
    const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

    const [form, setForm] = useState<Partial<CalendarEvent>>({
        titulo: '', data: '', hora_inicio: '', hora_fim: '', participantes: '', descricao: '', cor: '#3B82F6', origem: 'manual'
    });

    const filteredEvents = useMemo(() =>
        (eventsData || []).filter(e => !filterMember || (e.participantes || '').includes(filterMember)),
        [eventsData, filterMember]
    );

    function openNewEvent(dateStr?: string) {
        setEditingEvent(null);
        setForm({ titulo: '', data: dateStr || getBahiaDateString(), hora_inicio: '09:00', hora_fim: '10:00', participantes: '', descricao: '', cor: '#3B82F6', origem: 'manual' });
        setShowModal(true);
    }

    function openEditEvent(ev: CalendarEvent) {
        setEditingEvent(ev);
        setForm({ ...ev });
        setShowModal(true);
    }

    async function saveEvent() {
        if (!form.titulo || !form.data) return;
        try {
            if (editingEvent) {
                await updateCalendarEvent(editingEvent.id, form);
            } else {
                await addCalendarEvent(form as Omit<CalendarEvent, 'id' | 'created_at'>);
            }
            await refetch();
            setShowModal(false);
            setEditingEvent(null);
        } catch (e: any) { alert(e.message); }
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
        return filteredEvents.filter(e => e.data === dateStr);
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
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <Users size={14} style={{ color: 'var(--text-muted)' }} />
                        <select className="form-select" style={{ width: 160 }} value={filterMember} onChange={e => setFilterMember(e.target.value)}>
                            <option value="">Todos os membros</option>
                            {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                        </select>
                    </div>
                    <button className="btn btn-secondary" style={{ opacity: 0.7, fontSize: 12 }} title="Em breve"><CalendarDays size={14} /> Google Agenda</button>
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
                                        {hourEvents.map(ev => (
                                            <div key={ev.id} onClick={e => { e.stopPropagation(); openEditEvent(ev); }}
                                                style={{ padding: '8px 12px', borderRadius: 6, background: `${ev.cor || '#3B82F6'}20`, borderLeft: `3px solid ${ev.cor || '#3B82F6'}`, marginBottom: 4, cursor: 'pointer' }}>
                                                <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.titulo}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                    {ev.hora_inicio && <span>{ev.hora_inicio}</span>}
                                                    {ev.hora_fim && <span> — {ev.hora_fim}</span>}
                                                    {ev.participantes && <span> · {ev.participantes}</span>}
                                                </div>
                                                {ev.descricao && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{ev.descricao}</div>}
                                            </div>
                                        ))}
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
                            <div><label className="form-label">Título *</label><input type="text" className="form-input" value={form.titulo || ''} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                <div><label className="form-label">Data *</label><input type="date" className="form-input" value={form.data || ''} onChange={e => setForm({ ...form, data: e.target.value })} /></div>
                                <div><label className="form-label">Início</label><input type="time" className="form-input" value={form.hora_inicio || ''} onChange={e => setForm({ ...form, hora_inicio: e.target.value })} /></div>
                                <div><label className="form-label">Fim</label><input type="time" className="form-input" value={form.hora_fim || ''} onChange={e => setForm({ ...form, hora_fim: e.target.value })} /></div>
                            </div>
                            <div><label className="form-label">Participantes</label><input type="text" className="form-input" value={form.participantes || ''} onChange={e => setForm({ ...form, participantes: e.target.value })} placeholder="Ex: Marcel, Ana, João" /></div>
                            <div><label className="form-label">Descrição</label><textarea className="form-input" rows={3} value={form.descricao || ''} onChange={e => setForm({ ...form, descricao: e.target.value })} /></div>
                            <div>
                                <label className="form-label">Cor</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    {EVENT_COLORS.map(c => (
                                        <button key={c} onClick={() => setForm({ ...form, cor: c })} style={{
                                            width: 28, height: 28, borderRadius: '50%', background: c, border: form.cor === c ? '3px solid var(--text-primary)' : '2px solid transparent', cursor: 'pointer'
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
