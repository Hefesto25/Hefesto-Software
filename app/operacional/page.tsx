'use client';

import { useState } from 'react';
import { useOperationalTasks, updateOperationalTask, addOperationalTask, removeOperationalTask, useTeam, createNotificationIfEnabled } from '@/lib/hooks';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Clock, CheckCircle2, LayoutDashboard, List, PieChart, Plus, Search as SearchIcon, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from 'recharts';
import type { OperationalTask } from '@/lib/types';
import { getBahiaDate } from '@/lib/utils';

const KANBAN_COLUMNS = [
    { id: 'A Fazer', label: 'A Fazer', icon: <Clock size={16} />, color: '#F59E0B' },
    { id: 'Fazendo', label: 'Fazendo', icon: <Activity size={16} />, color: '#3B82F6' },
    { id: 'Revisando', label: 'Revisando', icon: <Eye size={16} />, color: '#8B5CF6' },
    { id: 'Finalizado', label: 'Finalizado', icon: <CheckCircle2 size={16} />, color: '#10B981' }
];

const DIFICULDADE_LABELS = ['', '⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐'];

export default function OperacionalPage() {
    const { data: tasks, loading, setData: setTasksData } = useOperationalTasks();
    const { data: teamMembers } = useTeam();
    const { user } = useAuth();
    const [draggedTask, setDraggedTask] = useState<OperationalTask | null>(null);
    const [activeTab, setActiveTab] = useState<'painel' | 'kanban' | 'historico'>('painel');
    const [showNewTaskModal, setShowNewTaskModal] = useState(false);
    const [showEditTaskModal, setShowEditTaskModal] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmClearHistory, setConfirmClearHistory] = useState(false);
    const [editTaskForm, setEditTaskForm] = useState<Partial<OperationalTask>>({});
    const [newTask, setNewTask] = useState<Partial<OperationalTask>>({
        titulo: '', descricao: '', dificuldade: 1,
        categoria_tarefa: 'Desenvolvimento', tipo: 'manual', cliente_nome: '',
        status: 'A Fazer', origem: 'manual'
    });

    if (loading) return <div className="p-8 text-center text-muted">Carregando tarefas...</div>;

    // Filter: "Finalizado" tasks are hidden from Kanban
    const kanbanTasks = tasks.filter(t => t.status !== 'Finalizado');
    const finishedTasks = tasks.filter(t => t.status === 'Finalizado');

    // --- Drag and Drop ---
    function onDragStart(e: React.DragEvent, task: OperationalTask) {
        setDraggedTask(task);
        e.dataTransfer.setData('text/plain', task.id);
        setTimeout(() => { (e.target as HTMLElement).style.opacity = '0.5'; }, 0);
    }
    function onDragEnd(e: React.DragEvent) {
        (e.target as HTMLElement).style.opacity = '1';
        setDraggedTask(null);
    }
    function onDragOver(e: React.DragEvent) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }

    async function onDrop(e: React.DragEvent, statusId: OperationalTask["status"]) {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text');
        const task = tasks.find(t => t.id === taskId);
        if (!task || task.status === statusId) return;
        const updatedTask = {
            ...task, status: statusId,
            data_conclusao: statusId === 'Finalizado' ? new Date().toISOString() : task.data_conclusao
        };
        setTasksData(tasks.map(t => t.id === taskId ? updatedTask : t));
        try {
            await updateOperationalTask(task.id, { status: statusId, data_conclusao: updatedTask.data_conclusao });
        } catch (error) {
            console.error('Failed to update:', error);
            setTasksData(tasks);
        }
    }

    async function handleCreateTask() {
        if (!newTask.titulo) return;
        try {
            const created = await addOperationalTask({
                titulo: newTask.titulo || '',
                descricao: newTask.descricao,
                dificuldade: newTask.dificuldade,
                categoria_tarefa: newTask.categoria_tarefa,
                data_inicio: newTask.data_inicio,
                data_termino: newTask.data_termino,
                tipo: newTask.tipo || 'manual',
                cliente_nome: newTask.cliente_nome || '',
                responsavel_id: newTask.responsavel_id,
                status: 'A Fazer',
                origem: 'manual',
            });
            setTasksData([...tasks, created]);

            // Notify assigned user
            if (created.responsavel_id) {
                const assignedMember = teamMembers.find(m => m.name === created.responsavel_id);
                if (assignedMember) {
                    createNotificationIfEnabled(
                        assignedMember.id,
                        'tarefa_atribuida',
                        'Nova tarefa atribuída',
                        `Você foi atribuído à tarefa '${created.titulo}' por ${user.name}.`,
                        '/operacional',
                        'operacional'
                    ).catch(console.error);
                }
            }

            setShowNewTaskModal(false);
            setNewTask({ titulo: '', descricao: '', dificuldade: 1, categoria_tarefa: 'Desenvolvimento', tipo: 'manual', cliente_nome: '', status: 'A Fazer', origem: 'manual' });
        } catch (e) { console.error(e); }
    }

    async function handleSaveEditTask() {
        if (!editTaskForm.id || !editTaskForm.titulo) return;
        try {
            const originalTask = tasks.find(t => t.id === editTaskForm.id);
            const updated = await updateOperationalTask(editTaskForm.id, {
                ...editTaskForm,
                data_conclusao: editTaskForm.status === 'Finalizado' ? new Date().toISOString() : editTaskForm.data_conclusao
            });
            setTasksData(tasks.map(t => t.id === updated.id ? updated : t));

            // Notify if responsavel changed
            if (editTaskForm.responsavel_id && editTaskForm.responsavel_id !== originalTask?.responsavel_id) {
                const assignedMember = teamMembers.find(m => m.name === editTaskForm.responsavel_id);
                if (assignedMember) {
                    createNotificationIfEnabled(
                        assignedMember.id,
                        'tarefa_atribuida',
                        'Tarefa atribuída a você',
                        `Você foi atribuído à tarefa '${updated.titulo}' por ${user.name}.`,
                        '/operacional',
                        'operacional'
                    ).catch(console.error);
                }
            }

            setShowEditTaskModal(false);
        } catch (e) { console.error(e); }
    }

    async function handleDeleteTask(taskId: string) {
        try {
            await removeOperationalTask(taskId);
            setTasksData(tasks.filter(t => t.id !== taskId));
            setShowEditTaskModal(false);
            setConfirmDeleteId(null);
        } catch (e) { console.error(e); }
    }

    // Dashboard data
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    // As per user request, finished tasks should not appear in the dashboard graphs or totals
    const totalTasks = kanbanTasks.length;
    const completedTasks = 0; // Finalized tasks are excluded
    const pendingTasks = totalTasks;

    const categoryCount = tasks.filter(t => t.status !== 'Finalizado').reduce((acc, t) => { const cat = t.categoria_tarefa || 'Outros'; acc[cat] = (acc[cat] || 0) + 1; return acc; }, {} as Record<string, number>);
    const categoryData = Object.keys(categoryCount).map(k => ({ name: k, value: categoryCount[k] }));

    const memberPerfCount = finishedTasks.reduce((acc, t) => { const m = t.responsavel_id || 'Não Atribuído'; acc[m] = (acc[m] || 0) + 1; return acc; }, {} as Record<string, number>);
    const memberPerfData = Object.keys(memberPerfCount).map(k => ({ name: k, amount: memberPerfCount[k] }));

    const pendingByMemberCount = kanbanTasks.reduce((acc, t) => { const m = t.responsavel_id || 'Não Atribuído'; acc[m] = (acc[m] || 0) + 1; return acc; }, {} as Record<string, number>);
    const pendingByMemberData = Object.keys(pendingByMemberCount).map(k => ({ name: k, amount: pendingByMemberCount[k] }));

    const periodCount = finishedTasks.filter(t => t.data_conclusao).reduce((acc, t) => {
        const d = new Date(t.data_conclusao!);
        const monthYear = `${d.getMonth() + 1}/${d.getFullYear()}`;
        acc[monthYear] = (acc[monthYear] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const periodData = Object.keys(periodCount).map(k => ({ name: k, amount: periodCount[k] })).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div style={{ paddingBottom: 60 }}>


            {/* Tabs */}
            <div className="finance-tabs" style={{ marginBottom: 24 }}>
                <button className={`finance-tab ${activeTab === 'painel' ? 'active' : ''}`} onClick={() => setActiveTab('painel')}>
                    Painel
                </button>
                <button className={`finance-tab ${activeTab === 'kanban' ? 'active' : ''}`} onClick={() => setActiveTab('kanban')}>
                    Kanban
                </button>
                <button className={`finance-tab ${activeTab === 'historico' ? 'active' : ''}`} onClick={() => setActiveTab('historico')}>
                    Histórico
                </button>
            </div>

            {/* TAB PAINEL */}
            {activeTab === 'painel' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
                        <div className="stat-card"><h3>Total de Tarefas</h3><div className="value">{totalTasks}</div></div>
                        <div className="stat-card"><h3>Tarefas Pendentes</h3><div className="value">{pendingTasks}</div></div>
                        <div className="stat-card" style={{ display: 'none' }}><h3>Tarefas Concluídas</h3><div className="value">{completedTasks}</div></div>
                        <div className="stat-card" style={{ display: 'none' }}><h3>Taxa de Conclusão</h3><div className="value">{totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</div></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                        <div className="chart-container" style={{ borderRadius: 12 }}>
                            <h2>Concluídas vs Período</h2>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={periodData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }} />
                                        <Bar dataKey="amount" fill="#10B981" radius={[4, 4, 0, 0]} name="Concluídas" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="chart-container" style={{ borderRadius: 12 }}>
                            <h2>Distribuição por Categoria</h2>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPie>
                                        <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" nameKey="name"
                                            label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`} labelLine={false} stroke="none">
                                            {categoryData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                                    </RechartsPie>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="chart-container" style={{ borderRadius: 12 }}>
                            <h2>Desempenho por Membro</h2>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={memberPerfData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }} />
                                        <Bar dataKey="amount" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Concluídas" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        <div className="chart-container" style={{ borderRadius: 12 }}>
                            <h2>Pendentes por Responsável</h2>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={pendingByMemberData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }} />
                                        <Bar dataKey="amount" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Pendentes" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB KANBAN */}
            {activeTab === 'kanban' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <p className="text-muted" style={{ margin: 0 }}>Arraste os cards entre as colunas para atualizar o status.</p>
                        <button className="btn btn-primary" onClick={() => setShowNewTaskModal(true)}>
                            <Plus size={14} /> Nova Tarefa
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: 24, overflowX: 'auto', paddingBottom: 16 }}>
                        {KANBAN_COLUMNS.filter(c => c.id !== 'Finalizado').map(col => {
                            const colTasks = kanbanTasks.filter(t => t.status === col.id);
                            return (
                                <div key={col.id} style={{ minWidth: 320, width: 320, display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-secondary)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', minHeight: '60vh' }}
                                    onDragOver={onDragOver} onDrop={(e) => onDrop(e, col.id as OperationalTask['status'])}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: col.color, fontWeight: 600 }}>{col.icon} {col.label}</div>
                                        <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 12, color: 'var(--text-primary)' }}>{colTasks.length}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {colTasks.map(task => (
                                            <div key={task.id} draggable onDragStart={(e) => onDragStart(e, task)} onDragEnd={onDragEnd} onClick={() => { setEditTaskForm(task); setShowEditTaskModal(true); }}
                                                style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', cursor: 'grab', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <strong style={{ fontSize: 14 }}>{task.titulo}</strong>
                                                    <div style={{ display: 'flex', gap: 4 }}>
                                                        {task.origem === 'comercial_automatico' && (
                                                            <span style={{ fontSize: 10, background: 'rgba(139,92,246,0.2)', color: '#8B5CF6', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>Comercial</span>
                                                        )}
                                                        {task.categoria_tarefa && (
                                                            <span style={{ fontSize: 10, background: 'rgba(59,130,246,0.15)', color: '#3B82F6', padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>{task.categoria_tarefa}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                {task.descricao && <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{task.descricao.substring(0, 80)}{task.descricao.length > 80 ? '...' : ''}</div>}
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-muted)' }}>
                                                    {task.responsavel_id && <span>👤 {task.responsavel_id}</span>}
                                                    {task.dificuldade && <span>Dif: {task.dificuldade}/5</span>}
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                                                    <span>Cliente: <span style={{ color: 'var(--text-primary)' }}>{task.cliente_nome || '-'}</span></span>
                                                    {task.data_termino && <span style={{ color: new Date(task.data_termino) < getBahiaDate() ? '#EF4444' : 'var(--text-muted)' }}>Prazo: {new Date(task.data_termino).toLocaleDateString('pt-br')}</span>}
                                                </div>
                                            </div>
                                        ))}
                                        {colTasks.length === 0 && (
                                            <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 8 }}>Mova uma tarefa para cá</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Drop zone for Finalizado (hidden column) */}
                        <div style={{ minWidth: 320, width: 320, display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(16,185,129,0.05)', padding: 16, borderRadius: 12, border: '2px dashed rgba(16,185,129,0.3)', minHeight: '60vh' }}
                            onDragOver={onDragOver} onDrop={(e) => onDrop(e, 'Finalizado')}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10B981', fontWeight: 600 }}><CheckCircle2 size={16} /> Finalizado</div>
                            </div>
                            <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                                Arraste tarefas aqui para finalizar.<br />Cards finalizados vão para o Histórico.
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* TAB HISTÓRICO */}
            {activeTab === 'historico' && (
                <div className="table-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2 className="section-title" style={{ margin: 0 }}>Histórico de Tarefas</h2>
                        {finishedTasks.length > 0 && (
                            confirmClearHistory ? (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="btn" style={{ background: 'var(--danger)', color: '#fff', padding: '6px 12px' }} onClick={async () => {
                                        for (const t of finishedTasks) {
                                            await removeOperationalTask(t.id);
                                        }
                                        setTasksData(tasks.filter(t => t.status !== 'Finalizado'));
                                        setConfirmClearHistory(false);
                                    }}>Confirmar Limpeza</button>
                                    <button className="btn btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setConfirmClearHistory(false)}>Cancelar</button>
                                </div>
                            ) : (
                                <button className="btn btn-secondary" style={{ color: '#EF4444', padding: '6px 12px' }} onClick={() => setConfirmClearHistory(true)}>
                                    Limpar Histórico
                                </button>
                            )
                        )}
                    </div>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Tarefa</th>
                                <th>Cliente</th>
                                <th>Categoria</th>
                                <th>Dificuldade</th>
                                <th>Responsável</th>
                                <th>Início</th>
                                <th>Conclusão</th>
                            </tr>
                        </thead>
                        <tbody>
                            {finishedTasks.map(t => (
                                <tr key={t.id}>
                                    <td><strong>{t.titulo}</strong></td>
                                    <td>{t.cliente_nome || '-'}</td>
                                    <td>{t.categoria_tarefa || '-'}</td>
                                    <td>{t.dificuldade ? `${t.dificuldade}/5` : '-'}</td>
                                    <td>{t.responsavel_id || '-'}</td>
                                    <td>{t.data_inicio ? new Date(t.data_inicio).toLocaleDateString('pt-br') : '-'}</td>
                                    <td>{t.data_conclusao ? new Date(t.data_conclusao).toLocaleDateString('pt-br') : '-'}</td>
                                </tr>
                            ))}
                            {finishedTasks.length === 0 && (
                                <tr><td colSpan={7} className="text-center text-muted" style={{ padding: '24px 0' }}>Nenhuma tarefa finalizada</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Nova Tarefa */}
            {showNewTaskModal && (
                <div className="modal-overlay" onClick={() => setShowNewTaskModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Nova Tarefa Operacional</h2>
                            <button className="modal-close" onClick={() => setShowNewTaskModal(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label className="form-label">Título *</label>
                                <input type="text" className="form-input" value={newTask.titulo || ''} onChange={e => setNewTask({ ...newTask, titulo: e.target.value })} placeholder="Ex: Implementar relatório mensal" />
                            </div>
                            <div>
                                <label className="form-label">Descrição</label>
                                <textarea className="form-input" rows={3} value={newTask.descricao || ''} onChange={e => setNewTask({ ...newTask, descricao: e.target.value })} placeholder="O que deve ser feito..." />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label className="form-label">Responsável</label>
                                    <select className="form-select" value={newTask.responsavel_id || ''} onChange={e => setNewTask({ ...newTask, responsavel_id: e.target.value })}>
                                        <option value="">Selecione...</option>
                                        {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Cliente</label>
                                    <input type="text" className="form-input" value={newTask.cliente_nome || ''} onChange={e => setNewTask({ ...newTask, cliente_nome: e.target.value })} placeholder="Nome do cliente" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label className="form-label">Dificuldade (1-5)</label>
                                    <select className="form-select" value={newTask.dificuldade || 1} onChange={e => setNewTask({ ...newTask, dificuldade: Number(e.target.value) })}>
                                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} - {['Fácil', 'Simples', 'Médio', 'Difícil', 'Muito Difícil'][n - 1]}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Categoria</label>
                                    <select className="form-select" value={newTask.categoria_tarefa || 'Desenvolvimento'} onChange={e => setNewTask({ ...newTask, categoria_tarefa: e.target.value })}>
                                        <option value="Prévia">Prévia</option>
                                        <option value="Desenvolvimento">Desenvolvimento</option>
                                        <option value="Nova funcionalidade">Nova funcionalidade</option>
                                        <option value="Manutenção">Manutenção</option>
                                        <option value="Design">Design</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label className="form-label">Data de Início</label>
                                    <input type="date" className="form-input" value={newTask.data_inicio || ''} onChange={e => setNewTask({ ...newTask, data_inicio: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Prazo Limite</label>
                                    <input type="date" className="form-input" value={newTask.data_termino || ''} onChange={e => setNewTask({ ...newTask, data_termino: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                                <button className="btn btn-secondary" onClick={() => setShowNewTaskModal(false)}>Cancelar</button>
                                <button className="btn btn-primary" onClick={handleCreateTask}>Criar Tarefa</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Tarefa */}
            {showEditTaskModal && (
                <div className="modal-overlay" onClick={() => setShowEditTaskModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Editar Tarefa Operacional</h2>
                            <button className="modal-close" onClick={() => setShowEditTaskModal(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label className="form-label">Título *</label>
                                <input type="text" className="form-input" value={editTaskForm.titulo || ''} onChange={e => setEditTaskForm({ ...editTaskForm, titulo: e.target.value })} placeholder="Ex: Implementar relatório mensal" />
                            </div>
                            <div>
                                <label className="form-label">Descrição</label>
                                <textarea className="form-input" rows={3} value={editTaskForm.descricao || ''} onChange={e => setEditTaskForm({ ...editTaskForm, descricao: e.target.value })} placeholder="O que deve ser feito..." />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label className="form-label">Responsável</label>
                                    <select className="form-select" value={editTaskForm.responsavel_id || ''} onChange={e => setEditTaskForm({ ...editTaskForm, responsavel_id: e.target.value })}>
                                        <option value="">Selecione...</option>
                                        {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Cliente</label>
                                    <input type="text" className="form-input" value={editTaskForm.cliente_nome || ''} onChange={e => setEditTaskForm({ ...editTaskForm, cliente_nome: e.target.value })} placeholder="Nome do cliente" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label className="form-label">Dificuldade (1-5)</label>
                                    <select className="form-select" value={editTaskForm.dificuldade || 1} onChange={e => setEditTaskForm({ ...editTaskForm, dificuldade: Number(e.target.value) })}>
                                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} - {['Fácil', 'Simples', 'Médio', 'Difícil', 'Muito Difícil'][n - 1]}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Categoria</label>
                                    <select className="form-select" value={editTaskForm.categoria_tarefa || 'Desenvolvimento'} onChange={e => setEditTaskForm({ ...editTaskForm, categoria_tarefa: e.target.value })}>
                                        <option value="Prévia">Prévia</option>
                                        <option value="Desenvolvimento">Desenvolvimento</option>
                                        <option value="Nova funcionalidade">Nova funcionalidade</option>
                                        <option value="Manutenção">Manutenção</option>
                                        <option value="Design">Design</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label className="form-label">Data de Início</label>
                                    <input type="date" className="form-input" value={editTaskForm.data_inicio || ''} onChange={e => setEditTaskForm({ ...editTaskForm, data_inicio: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Prazo Limite</label>
                                    <input type="date" className="form-input" value={editTaskForm.data_termino || ''} onChange={e => setEditTaskForm({ ...editTaskForm, data_termino: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                                {confirmDeleteId === editTaskForm.id ? (
                                    <>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn" style={{ padding: '8px 16px', background: 'var(--danger)', color: '#fff', borderRadius: 8 }} onClick={() => handleDeleteTask(editTaskForm.id!)}>Confirmar Exclusão</button>
                                        </div>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <button className="btn btn-secondary" onClick={() => setConfirmDeleteId(null)}>Cancelar</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <button className="btn" style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: 8 }} onClick={() => setConfirmDeleteId(editTaskForm.id!)}>Excluir Tarefa</button>
                                        <div style={{ display: 'flex', gap: 12 }}>
                                            <button className="btn btn-secondary" onClick={() => setShowEditTaskModal(false)}>Cancelar</button>
                                            <button className="btn btn-primary" onClick={handleSaveEditTask}>Salvar Alterações</button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
