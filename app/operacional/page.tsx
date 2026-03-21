'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useOperationalTasks, updateOperationalTask, addOperationalTask, removeOperationalTask, useUsuarios, createNotificationIfEnabled, useClients, useSubtarefas, useTodasSubtarefas, addSubtarefa, toggleSubtarefa, removeSubtarefa, useTaskTemplates, addTaskTemplate, updateTaskTemplate, archiveTaskTemplate } from '@/lib/hooks';
import { useAuth } from '../contexts/AuthContext';
import { Activity, Clock, CheckCircle2, LayoutDashboard, List, PieChart, Plus, Search as SearchIcon, Eye, Users, ChevronLeft, Trash2, X, Calendar, ChevronRight, GripVertical, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from 'recharts';
import type { OperationalTask, TaskTemplate } from '@/lib/types';
import { getBahiaDate, getBahiaDateString, formatLocalSystemDate, calcularProgresso } from '@/lib/utils';

function DifficultyDots({ value = 0 }: { value?: number }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: i <= value ? 'var(--accent)' : 'rgba(255,255,255,0.15)'
        }} />
      ))}
    </div>
  );
}

function AssigneeAvatar({ name, size = 24 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--accent)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.4, fontWeight: 600,
      color: '#fff', flexShrink: 0
    }} title={name}>
      {initials}
    </div>
  );
}

interface TaskCardProps {
  task: OperationalTask;
  progressInfo: { progresso: number; total: number; concluidas: number } | null;
  onDragStart: (e: React.DragEvent, task: OperationalTask) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onClickOpen: (task: OperationalTask) => void;
  todayStr: string;
}

function TaskCard({ task, progressInfo, onDragStart, onDragEnd, onClickOpen, todayStr }: TaskCardProps) {
  const isOverdue = task.data_termino ? task.data_termino < todayStr : false;
  const deadlineDiff = task.data_termino
    ? Math.ceil((new Date(task.data_termino).getTime() - new Date(todayStr).getTime()) / 86400000)
    : null;
  const deadlineColor = isOverdue ? '#EF4444' : (deadlineDiff !== null && deadlineDiff <= 3) ? '#F59E0B' : 'var(--text-muted)';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={() => onClickOpen(task)}
      style={{
        background: 'var(--bg-primary)',
        padding: '12px 14px',
        borderRadius: 10,
        border: '1px solid var(--border-default)',
        cursor: 'grab',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
      }}
    >
      {/* Top: client badge + tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{
          fontSize: 10, fontWeight: 600,
          background: 'var(--accent-muted)', color: 'var(--accent-light)',
          padding: '2px 8px', borderRadius: 20, letterSpacing: 0.3
        }}>
          {task.cliente_nome || 'Sem Cliente'}
        </span>
        {task.categoria_tarefa && (
          <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: 20 }}>
            {task.categoria_tarefa}
          </span>
        )}
        {task.origem === 'comercial_automatico' && (
          <span style={{ fontSize: 10, background: 'rgba(139,92,246,0.15)', color: '#A78BFA', padding: '2px 8px', borderRadius: 20 }}>
            Comercial
          </span>
        )}
      </div>

      {/* Title */}
      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>
        {task.titulo}
      </div>

      {/* Description snippet */}
      {task.descricao && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {task.descricao.substring(0, 72)}{task.descricao.length > 72 ? '…' : ''}
        </div>
      )}

      {/* Footer: assignee + difficulty + deadline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
        {task.responsavel_id && <AssigneeAvatar name={task.responsavel_id} />}
        <DifficultyDots value={task.dificuldade} />
        <div style={{ flex: 1 }} />
        {task.data_termino && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: deadlineColor }}>
            <Calendar size={11} />
            {formatLocalSystemDate(task.data_termino)}
          </div>
        )}
      </div>

      {/* Subtask progress */}
      {progressInfo && progressInfo.total > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
              <span>Subtarefas</span>
              <span>{progressInfo.progresso}%</span>
          </div>
          <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              width: `${progressInfo.progresso}%`, height: '100%',
              background: progressInfo.progresso === 100 ? '#10B981' : 'var(--accent)',
              transition: 'width 0.4s ease', borderRadius: 2
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

interface KanbanColumnProps {
  col: { id: string; label: string; icon: React.ReactNode; color: string };
  tasks: OperationalTask[];
  getProgressInfo: (id: string) => { progresso: number; total: number; concluidas: number } | null;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: OperationalTask['status']) => void;
  onDragStart: (e: React.DragEvent, task: OperationalTask) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onOpenTask: (task: OperationalTask) => void;
  todayStr: string;
  isDoneZone?: boolean;
}

function KanbanColumn({ col, tasks, getProgressInfo, onDragOver, onDrop, onDragStart, onDragEnd, onOpenTask, todayStr, isDoneZone = false }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      style={{
        minWidth: 300, width: 300,
        display: 'flex', flexDirection: 'column',
        background: isDoneZone ? 'rgba(16,185,129,0.04)' : 'var(--bg-secondary)',
        borderRadius: 12,
        border: isDragOver ? `2px solid ${col.color}` : isDoneZone ? '2px dashed rgba(16,185,129,0.25)' : '1px solid var(--border-default)',
        minHeight: '65vh',
        overflow: 'hidden',
        transition: 'border-color 0.15s ease',
        flexShrink: 0,
      }}
      onDragOver={(e) => { onDragOver(e); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { onDrop(e, col.id as OperationalTask['status']); setIsDragOver(false); }}
    >
      {/* Accent bar */}
      <div style={{ height: 3, background: col.color, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-default)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: col.color, fontWeight: 600, fontSize: 13 }}>
          {col.icon} {col.label}
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, background: `${col.color}20`, color: col.color, padding: '2px 8px', borderRadius: 20 }}>
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, padding: '10px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        {isDoneZone ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '40px 16px', textAlign: 'center' }}>
            <CheckCircle2 size={28} color="rgba(16,185,129,0.3)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>Arraste aqui para finalizar.<br />Cards vão para o Histórico.</span>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '32px 16px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 8 }}>
            <GripVertical size={20} color="rgba(255,255,255,0.12)" />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Nenhuma tarefa aqui</span>
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              progressInfo={getProgressInfo(task.id)}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onClickOpen={onOpenTask}
              todayStr={todayStr}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TaskDetailPanel({ task, onClose, onTaskUpdate, onEdit, user }: { task: OperationalTask, onClose: () => void, onTaskUpdate: (id: string, updates: Partial<OperationalTask>) => Promise<void>, onEdit: () => void, user: any }) {
  const { data: subtarefas, refetch } = useSubtarefas(task.id);
  const [novaSubtarefa, setNovaSubtarefa] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [savingSubtask, setSavingSubtask] = useState(false);
  const [subtaskError, setSubtaskError] = useState('');
  const progresso = calcularProgresso(subtarefas || []);

  const isAdmin = user?.categoria === 'Admin Geral';
  const isResponsavel = task.responsavel_id === user?.nome;
  const isParticipante = task.participantes_ids?.includes(user?.id || '');
  const canEdit = isAdmin || isResponsavel || isParticipante || true; // fallback: always allow if user is authenticated

  const statusConfig: Record<string, { color: string }> = {
    'A Fazer': { color: '#F59E0B' },
    'Fazendo': { color: '#3B82F6' },
    'Revisando': { color: '#8B5CF6' },
    'Finalizado': { color: '#10B981' },
  };
  const statusColor = statusConfig[task.status]?.color || 'var(--text-muted)';

  const handleAddSubtarefa = async () => {
    if (!novaSubtarefa.trim()) return;
    setSavingSubtask(true);
    setSubtaskError('');
    try {
      await addSubtarefa(task.id, novaSubtarefa.trim(), (subtarefas?.length || 0) + 1);
      setNovaSubtarefa('');
      setAddingSubtask(false);
      await refetch();
    } catch (e: any) {
      setSubtaskError(e?.message || 'Erro ao salvar subtarefa.');
    } finally {
      setSavingSubtask(false);
    }
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') await handleAddSubtarefa();
    if (e.key === 'Escape') { setNovaSubtarefa(''); setAddingSubtask(false); setSubtaskError(''); }
  };

  const handleToggle = async (id: string, concluida: boolean) => {
    try {
      await toggleSubtarefa(id, concluida);
      const novas = (subtarefas || []).map(s => s.id === id ? { ...s, concluida } : s);
      const novoProgresso = calcularProgresso(novas);
      if (novoProgresso === 100 && task.status !== 'Finalizado') {
        await onTaskUpdate(task.id, { status: 'Finalizado', data_conclusao: new Date().toISOString() });
        onClose();
      }
      refetch();
    } catch (e: any) {
      console.error('Erro ao atualizar subtarefa:', e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeSubtarefa(id);
      refetch();
    } catch (e: any) {
      console.error('Erro ao remover subtarefa:', e);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9998, animation: 'fadeIn 0.2s ease' }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-default)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
        zIndex: 9999, display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease-out',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Operacional</span>
            <ChevronRight size={12} color="var(--text-muted)" />
            <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>{task.cliente_nome || 'Sem Cliente'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canEdit && (
              <button onClick={onEdit} style={{ background: 'var(--accent-muted)', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 6, transition: 'background 0.15s' }}>
                Editar
              </button>
            )}
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Title */}
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, margin: 0 }}>
              {task.titulo}
            </h2>

            {/* Properties Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--border-default)', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
              <div style={{ background: 'var(--bg-primary)', padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Status</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: statusColor }}>{task.status}</span>
                </div>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Dificuldade</div>
                <DifficultyDots value={task.dificuldade} />
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Responsável</div>
                {task.responsavel_id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <AssigneeAvatar name={task.responsavel_id} size={22} />
                    <span style={{ fontSize: 13 }}>{task.responsavel_id}</span>
                  </div>
                ) : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</span>}
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Prazo Limite</div>
                {task.data_termino ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} color="var(--text-secondary)" />
                    <span style={{ fontSize: 13 }}>{formatLocalSystemDate(task.data_termino)}</span>
                  </div>
                ) : <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</span>}
              </div>
            </div>

            {/* Description */}
            {task.descricao && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Descrição</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border-default)', whiteSpace: 'pre-wrap' as const }}>
                  {task.descricao}
                </div>
              </div>
            )}

            {/* Subtasks */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Subtarefas</span>
                  {(subtarefas?.length || 0) > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--accent-muted)', color: 'var(--accent)', padding: '1px 7px', borderRadius: 20 }}>
                      {subtarefas?.filter(s => s.concluida).length}/{subtarefas?.length}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>{progresso}%</span>
              </div>

              {(subtarefas?.length || 0) > 0 && (
                <div style={{ width: '100%', height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, marginBottom: 12, overflow: 'hidden' }}>
                  <div style={{ width: `${progresso}%`, height: '100%', background: progresso === 100 ? '#10B981' : 'var(--accent)', transition: 'width 0.4s ease', borderRadius: 3 }} />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {subtarefas?.map(sub => (
                  <div key={sub.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 8,
                    background: sub.concluida ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${sub.concluida ? 'rgba(16,185,129,0.15)' : 'var(--border-default)'}`,
                    transition: 'all 0.15s ease',
                  }}>
                    <button
                      onClick={() => handleToggle(sub.id, !sub.concluida)}
                      disabled={!canEdit}
                      style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        border: sub.concluida ? 'none' : '2px solid rgba(255,255,255,0.25)',
                        background: sub.concluida ? '#10B981' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: canEdit ? 'pointer' : 'not-allowed',
                        padding: 0, transition: 'all 0.15s ease',
                      }}
                    >
                      {sub.concluida && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                    <span style={{ flex: 1, fontSize: 13, color: sub.concluida ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: sub.concluida ? 'line-through' : 'none', transition: 'all 0.2s ease' }}>
                      {sub.titulo}
                    </span>
                    {canEdit && (
                      <button onClick={() => handleDelete(sub.id)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 4, borderRadius: 4, display: 'flex', transition: 'color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}

                {addingSubtask ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input autoFocus type="text" className="form-input" placeholder="Nome da subtarefa..." value={novaSubtarefa} onChange={e => { setNovaSubtarefa(e.target.value); setSubtaskError(''); }} onKeyDown={handleKeyDown} style={{ flex: 1, fontSize: 13, padding: '8px 12px' }} disabled={savingSubtask} />
                        <button onClick={handleAddSubtarefa} className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 12, opacity: savingSubtask ? 0.7 : 1 }} disabled={savingSubtask}>
                          {savingSubtask ? '...' : 'Salvar'}
                        </button>
                        <button onClick={() => { setNovaSubtarefa(''); setAddingSubtask(false); setSubtaskError(''); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 8 }}>
                          <X size={14} />
                        </button>
                      </div>
                      {subtaskError && <div style={{ fontSize: 12, color: '#EF4444', padding: '4px 2px' }}>{subtaskError}</div>}
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingSubtask(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', marginTop: 4, background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, transition: 'all 0.15s ease', width: '100%' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                    >
                      <Plus size={13} /> Adicionar subtarefa
                    </button>
                  )
                }
              </div>
            </div>

            {/* Participants */}
            {task.participantes_ids && task.participantes_ids.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Participantes</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {task.participantes_ids.map(pid => <AssigneeAvatar key={pid} name={pid} />)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const KANBAN_COLUMNS = [
    { id: 'Novas Funcionalidades', label: 'Novas Funcionalidades', icon: <Sparkles size={16} />, color: '#06B6D4' },
    { id: 'A Fazer', label: 'A Fazer', icon: <Clock size={16} />, color: '#F59E0B' },
    { id: 'Fazendo', label: 'Fazendo', icon: <Activity size={16} />, color: '#3B82F6' },
    { id: 'Revisando', label: 'Revisando', icon: <Eye size={16} />, color: '#8B5CF6' },
    { id: 'Finalizado', label: 'Finalizado', icon: <CheckCircle2 size={16} />, color: '#10B981' }
];

export default function OperacionalPage() {
    const { data: tasks, loading, setData: setTasksData } = useOperationalTasks();
    const { data: todasSubtarefas, refetch: refetchSubtarefas } = useTodasSubtarefas();
    const { data: allUsuarios } = useUsuarios();
    const { data: clients, loading: loadingClients } = useClients();
    const { user } = useAuth();
    const [draggedTask, setDraggedTask] = useState<OperationalTask | null>(null);
    const [activeTab, setActiveTab] = useState<'operacoes' | 'painel' | 'kanban' | 'historico' | 'templates'>('painel');
    const [selectedOpsClient, setSelectedOpsClient] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showNewTaskModal, setShowNewTaskModal] = useState(false);
    const [showEditTaskModal, setShowEditTaskModal] = useState(false);
    const [templateSearch, setTemplateSearch] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [pendingSubtarefas, setPendingSubtarefas] = useState<string[]>([]);
    const { data: taskTemplates, refetch: refetchTemplates } = useTaskTemplates();
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
    const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
    const [tplFormNome, setTplFormNome] = useState('');
    const [tplFormDescricao, setTplFormDescricao] = useState('');
    const [tplFormSubtarefas, setTplFormSubtarefas] = useState<string[]>(['']);
    const [tplFormError, setTplFormError] = useState('');
    const [tplSaving, setTplSaving] = useState(false);
    const [confirmArchiveTemplate, setConfirmArchiveTemplate] = useState<{ id: string; nome: string } | null>(null);
    const [selectedTaskPanel, setSelectedTaskPanel] = useState<OperationalTask | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [confirmClearHistory, setConfirmClearHistory] = useState(false);
    const [editTaskForm, setEditTaskForm] = useState<Partial<OperationalTask>>({});
    const [newTask, setNewTask] = useState<Partial<OperationalTask>>({
        titulo: '', descricao: '', dificuldade: 1,
        categoria_tarefa: 'Desenvolvimento', tipo: 'manual', cliente_nome: '',
        status: 'A Fazer', origem: 'manual'
    });
    const [filterOpsClient, setFilterOpsClient] = useState('');
    const [filterOpsMember, setFilterOpsMember] = useState('');
    const [filterOpsStatus, setFilterOpsStatus] = useState('');
    const [filterOpsDeadline, setFilterOpsDeadline] = useState(''); // verde, amarelo, vermelho

    const [toastMessage, setToastMessage] = useState('');
    function showToast(msg: string) {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    }

    const [taskFormError, setTaskFormError] = useState('');

    // Combobox state
    const [showNewResponsavelList, setShowNewResponsavelList] = useState(false);
    const [showEditResponsavelList, setShowEditResponsavelList] = useState(false);
    const [showNewParticipantesList, setShowNewParticipantesList] = useState(false);
    const [showEditParticipantesList, setShowEditParticipantesList] = useState(false);
    const newRespRef = useRef<HTMLDivElement>(null);
    const editRespRef = useRef<HTMLDivElement>(null);
    const newPartRef = useRef<HTMLDivElement>(null);
    const editPartRef = useRef<HTMLDivElement>(null);

    // Click-outside handler
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (newRespRef.current && !newRespRef.current.contains(e.target as Node)) setShowNewResponsavelList(false);
            if (editRespRef.current && !editRespRef.current.contains(e.target as Node)) setShowEditResponsavelList(false);
            if (newPartRef.current && !newPartRef.current.contains(e.target as Node)) setShowNewParticipantesList(false);
            if (editPartRef.current && !editPartRef.current.contains(e.target as Node)) setShowEditParticipantesList(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter users for Operacional module: Admin Geral or has access to /operacional
    const filteredOpUsuarios = useMemo(() =>
        allUsuarios.filter(u => u.categoria === 'Admin Geral' || (u.modulos_acesso && u.modulos_acesso.includes('/operacional'))),
        [allUsuarios]
    );

    // Backward-compatible teamMembers-like accessor (for filters etc.)
    const teamMembers = useMemo(() => filteredOpUsuarios.map(u => ({ id: u.id, name: u.nome, nome: u.nome, cargo: u.cargo, categoria: u.categoria })), [filteredOpUsuarios]);

    // Auto-open task if task_id is in URL (from Chat Mention)
    useEffect(() => {
        if (!loading && tasks.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const taskId = params.get('task_id');
            if (taskId) {
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    setEditTaskForm(task);
                    setShowEditTaskModal(true);
                    // Clear the URL to prevent re-opening on manual refresh
                    window.history.replaceState({}, '', '/operacional');
                }
            }
        }
    }, [loading, tasks]);

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

        const isAdmin = user?.categoria === 'Admin Geral';
        const isResponsavel = task.responsavel_id === user?.nome;
        const isParticipante = task.participantes_ids?.includes(user?.id || '');

        if (!isAdmin && !isResponsavel && !isParticipante) {
            showToast('Você não tem permissão para alterar o status desta tarefa.');
            return;
        }
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
        setTaskFormError('');
        if (!newTask.titulo) {
            setTaskFormError('Por favor, informe o título da tarefa.');
            return;
        }
        try {
            const created = await addOperationalTask({
                titulo: newTask.titulo,
                descricao: newTask.descricao || '',
                dificuldade: newTask.dificuldade,
                categoria_tarefa: newTask.categoria_tarefa,
                data_inicio: newTask.data_inicio || undefined,
                data_termino: newTask.data_termino || undefined,
                tipo: newTask.tipo || 'manual',
                cliente_nome: newTask.cliente_nome || '',
                responsavel_id: newTask.responsavel_id || undefined,
                status: 'A Fazer',
                origem: 'manual',
            });
            for (let i = 0; i < pendingSubtarefas.length; i++) {
                if (pendingSubtarefas[i].trim()) {
                    await addSubtarefa(created.id, pendingSubtarefas[i].trim(), i + 1);
                }
            }
            setTasksData([...tasks, created]);

            // Notify assigned user
            if (created.responsavel_id) {
                const assignedMember = teamMembers.find(m => m.name === created.responsavel_id);
                if (assignedMember) {
                    createNotificationIfEnabled(
                        assignedMember.id,
                        'tarefa_atribuida',
                        'Nova tarefa atribuída',
                        `Você foi atribuído à tarefa '${created.titulo}' por ${user?.nome}.`,
                        '/operacional',
                        'operacional'
                    ).catch(console.error);
                }
            }

            setShowNewTaskModal(false);
            setNewTask({ titulo: '', descricao: '', dificuldade: 1, categoria_tarefa: 'Desenvolvimento', tipo: 'manual', cliente_nome: '', status: 'A Fazer', origem: 'manual' });
            showToast('Tarefa criada com sucesso!');
        } catch (e: any) {
            console.error(e);
            setTaskFormError(e.message || 'Erro ao criar tarefa.');
        }
    }

    async function handleSaveEditTask() {
        setTaskFormError('');
        if (!editTaskForm.id) return;

        const task = tasks.find(t => t.id === editTaskForm.id);
        if (task) {
            const isAdmin = user?.categoria === 'Admin Geral';
            const isResponsavel = task.responsavel_id === user?.nome;
            const isParticipante = task.participantes_ids?.includes(user?.id || '');

            if (!isAdmin && !isResponsavel && !isParticipante) {
                setTaskFormError('Você não tem permissão para editar esta tarefa.');
                return;
            }
        }
        if (!editTaskForm.titulo) {
            setTaskFormError('Por favor, informe o título da tarefa.');
            return;
        }
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
                        `Você foi atribuído à tarefa '${updated.titulo}' por ${user?.nome}.`,
                        '/operacional',
                        'operacional'
                    ).catch(console.error);
                }
            }

            setShowEditTaskModal(false);
            showToast('Tarefa atualizada com sucesso!');
        } catch (e) {
            console.error(e);
            setTaskFormError('Erro ao atualizar tarefa.');
        }
    }

    async function handleDeleteTask(taskId: string) {
        try {
            await removeOperationalTask(taskId);
            setTasksData(tasks.filter(t => t.id !== taskId));
            setShowEditTaskModal(false);
            setConfirmDeleteId(null);
            showToast('Tarefa excluída com sucesso!');
        } catch (e: any) {
            console.error(e);
            setTaskFormError('Erro ao excluir tarefa.');
        }
    }

    // Dashboard data
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#A78BFA', '#06B6D4'];
    const PIE_COLORS_DEADLINE = ['#10B981', '#F59E0B', '#EF4444', '#6B7280']; // No Prazo, Prox, Atrasado, Sem Prazo

    const totalTasks = kanbanTasks.length;

    // 5. Completion metrics for the current month
    const currentDate = new Date(getBahiaDateString() + 'T12:00:00');
    const currentMonthStr = `${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
    const finishedThisMonthTasks = finishedTasks.filter(t => {
        if (!t.data_conclusao) return false;
        const d = new Date(t.data_conclusao);
        return `${d.getMonth() + 1}/${d.getFullYear()}` === currentMonthStr;
    });
    const completedTasksThisMonth = finishedThisMonthTasks.length;
    const pendingTasks = totalTasks;

    const categoryCount = kanbanTasks.reduce((acc, t) => { const cat = t.categoria_tarefa || 'Outros'; acc[cat] = (acc[cat] || 0) + 1; return acc; }, {} as Record<string, number>);
    const categoryData = Object.keys(categoryCount).map(k => ({ name: k, value: categoryCount[k] }));

    // 1. Deadline Health
    const deadlineHealth = kanbanTasks.reduce((acc, t) => {
        if (!t.data_termino) { acc['Sem Prazo']++; return acc; }
        const diffDays = Math.ceil((new Date(t.data_termino + 'T12:00:00').getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) acc['Atrasadas']++;
        else if (diffDays <= 3) acc['Próximas (≤3 dias)']++;
        else acc['No Prazo']++;
        return acc;
    }, { 'No Prazo': 0, 'Próximas (≤3 dias)': 0, 'Atrasadas': 0, 'Sem Prazo': 0 } as Record<string, number>);
    const deadlineData = [
        { name: 'No Prazo', value: deadlineHealth['No Prazo'] },
        { name: 'Próximas (≤3 dias)', value: deadlineHealth['Próximas (≤3 dias)'] },
        { name: 'Atrasadas', value: deadlineHealth['Atrasadas'] },
        { name: 'Sem Prazo', value: deadlineHealth['Sem Prazo'] }
    ].filter(d => d.value > 0);

    // 2. Upcoming Deadlines Radar
    const upcomingDeadlines = kanbanTasks
        .filter(t => t.data_termino)
        .sort((a, b) => new Date(a.data_termino! + 'T12:00:00').getTime() - new Date(b.data_termino! + 'T12:00:00').getTime())
        .slice(0, 8);

    // 3. Workload by Client
    const workloadByClientCount = kanbanTasks.reduce((acc, t) => {
        const cName = t.cliente_nome || 'Sem Cliente Vinculado';
        acc[cName] = (acc[cName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const workloadByClientData = Object.keys(workloadByClientCount)
        .map(k => ({ name: k, amount: workloadByClientCount[k] }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

    // 4. Effort Analysis by Member
    const effortByMemberCount = kanbanTasks.reduce((acc, t) => {
        const m = t.responsavel_id || 'Não Atribuído';
        acc[m] = (acc[m] || 0) + (t.dificuldade || 1);
        return acc;
    }, {} as Record<string, number>);
    const effortByMemberData = Object.keys(effortByMemberCount)
        .map(k => ({ name: k, amount: effortByMemberCount[k] }))
        .sort((a, b) => b.amount - a.amount);

    // --- OPERAÇÕES TAB DATA ---
    const activeClients = clients ? clients.filter(c => c.status === 'Ativo') : [];

    const activeClientsFiltered = searchTerm
        ? activeClients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
        : activeClients;

    const visaoGeralTasks = (() => {
        let filtered = kanbanTasks;
        if (filterOpsClient) filtered = filtered.filter(t => t.cliente_nome === filterOpsClient);
        if (filterOpsMember) filtered = filtered.filter(t => t.responsavel_id === filterOpsMember);
        if (filterOpsStatus) filtered = filtered.filter(t => t.status === filterOpsStatus);
        if (filterOpsDeadline) {
            const today = getBahiaDateString();
            filtered = filtered.filter(t => {
                if (!t.data_termino) return false;
                const diffDays = Math.ceil((new Date(t.data_termino).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
                if (filterOpsDeadline === 'vermelho') return diffDays < 0;
                if (filterOpsDeadline === 'amarelo') return diffDays >= 0 && diffDays <= 3;
                if (filterOpsDeadline === 'verde') return diffDays > 3;
                return true;
            });
        }

        const grouped: Record<string, OperationalTask[]> = {};
        filtered.forEach(t => {
            const cName = t.cliente_nome || 'Sem Cliente Vinculado';
            if (!grouped[cName]) grouped[cName] = [];
            grouped[cName].push(t);
        });
        return grouped;
    })();

    const getDeadlineIndicator = (dateString?: string) => {
        if (!dateString) return null;
        const diffDays = Math.ceil((new Date(dateString).getTime() - new Date(getBahiaDateString()).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} title="Atrasado" />;
        if (diffDays <= 3) return <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} title="Vence em breve (≤3 dias)" />;
        return <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} title="No prazo" />;
    };

    const getTaskProgressInfo = (taskId: string) => {
        const subs = todasSubtarefas.filter(s => s.tarefa_id === taskId);
        if (subs.length === 0) return null;
        const prog = calcularProgresso(subs);
        return { progresso: prog, total: subs.length, concluidas: subs.filter(s => s.concluida).length };
    };

    return (
        <div style={{ paddingBottom: 60 }}>

            {/* Tabs */}
            <div className="finance-tabs">
{([
    { key: 'painel', label: 'Painel' },
    { key: 'operacoes', label: 'Operações' },
    { key: 'kanban', label: 'Kanban Geral' },
    { key: 'historico', label: 'Histórico' },
    { key: 'templates', label: 'Templates de Tarefas' },
  ] as { key: typeof activeTab; label: string }[]).map(tab => (
    <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`finance-tab ${activeTab === tab.key ? 'active' : ''}`}>
      {tab.label}
    </button>
  ))}
            </div>

            {/* TAB OPERAÇÕES */}
            {activeTab === 'operacoes' && (
                <div>
                    {!selectedOpsClient ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                            {/* Clients Section */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={20} /> Clientes Ativos ({activeClients.length})</h2>
                                    <div className="header-search" style={{ width: 300 }}>
                                        <SearchIcon size={16} />
                                        <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                                    {activeClientsFiltered.map(client => {
                                        const cTasks = kanbanTasks.filter(t => t.cliente_nome === client.name);
                                        const cOverdue = cTasks.filter(t => t.data_termino && t.data_termino < getBahiaDateString()).length;
                                        return (
                                            <div key={client.id} onClick={() => setSelectedOpsClient(client)}
                                                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '16px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease' }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'; (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)'; }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{client.name}</div>
                                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cTasks.length} tarefas ativas</span>
                                                        {cOverdue > 0 && <span style={{ fontSize: 11, background: 'var(--danger-muted)', color: 'var(--danger)', padding: '1px 8px', borderRadius: 20, fontWeight: 500 }}>{cOverdue} atrasada{cOverdue > 1 ? 's' : ''}</span>}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: cTasks.length > 0 ? 'var(--accent)' : '#10B981' }} />
                                                    <ChevronRight size={16} color="var(--text-muted)" />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {activeClientsFiltered.length === 0 && <div className="text-muted" style={{ gridColumn: '1 / -1', padding: '24px 0', textAlign: 'center' }}>Nenhum cliente ativo encontrado.</div>}
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)' }} />

                            {/* General Tasks Overview Section */}
                            <div>
                                <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><LayoutDashboard size={20} /> Visão Geral de Tarefas</h2>

                                <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                                    <select className="form-select" style={{ maxWidth: 200 }} value={filterOpsClient} onChange={e => setFilterOpsClient(e.target.value)}>
                                        <option value="">Todos os Clientes</option>
                                        {activeClients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                    <select className="form-select" style={{ maxWidth: 200 }} value={filterOpsMember} onChange={e => setFilterOpsMember(e.target.value)}>
                                        <option value="">Todos os Membros</option>
                                        {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                                    </select>
                                    <select className="form-select" style={{ maxWidth: 200 }} value={filterOpsStatus} onChange={e => setFilterOpsStatus(e.target.value)}>
                                        <option value="">Qualquer Status</option>
                                        {KANBAN_COLUMNS.filter(c => c.id !== 'Finalizado').map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                                    </select>
                                    <select className="form-select" style={{ maxWidth: 200 }} value={filterOpsDeadline} onChange={e => setFilterOpsDeadline(e.target.value)}>
                                        <option value="">Qualquer Prazo</option>
                                        <option value="vermelho">Atrasadas</option>
                                        <option value="amarelo">Próximas (≤3 dias)</option>
                                        <option value="verde">No Prazo (&gt;3 dias)</option>
                                    </select>
                                    {(filterOpsClient || filterOpsMember || filterOpsStatus || filterOpsDeadline) && (
                                        <button className="btn" style={{ padding: '4px 12px', background: 'transparent', color: 'var(--danger)', fontSize: 13 }} onClick={() => { setFilterOpsClient(''); setFilterOpsMember(''); setFilterOpsStatus(''); setFilterOpsDeadline(''); }}>Limpar Filtros</button>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    {Object.keys(visaoGeralTasks).sort((a, b) => a.localeCompare(b)).map(clientName => (
                                        <div key={clientName} className="table-card">
                                            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, color: 'var(--text-primary)' }}>{clientName} <span className="text-muted" style={{ fontSize: 13, fontWeight: 'normal' }}>({visaoGeralTasks[clientName].length} tarefas)</span></h3>
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Título</th>
                                                        <th>Status</th>
                                                        <th>Prazo Limite</th>
                                                        <th>Responsável</th>
                                                        <th style={{ width: 100, textAlign: 'center' }}>Progresso</th>
                                                        <th style={{ width: 60, textAlign: 'center' }}>Prazo</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {visaoGeralTasks[clientName].map(task => {
                                                        const col = KANBAN_COLUMNS.find(c => c.id === task.status);
                                                        const info = getTaskProgressInfo(task.id);
                                                        return (
                                                            <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedTaskPanel(task)}>
                                                                <td style={{ fontWeight: 500 }}>{task.titulo}</td>
                                                                <td><span style={{ color: col?.color, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>{col?.icon} {task.status}</span></td>
                                                                <td>{task.data_termino ? formatLocalSystemDate(task.data_termino) : '-'}</td>
                                                                <td>{task.responsavel_id || '-'}</td>
                                                                <td style={{ textAlign: 'center' }}>
                                                                    {info ? (
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                                                                            <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                                                                                <div style={{ width: `${info.progresso}%`, height: '100%', background: '#10B981' }} />
                                                                            </div>
                                                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{info.progresso}%</span>
                                                                        </div>
                                                                    ) : '-'}
                                                                </td>
                                                                <td style={{ textAlign: 'center' }}>{getDeadlineIndicator(task.data_termino) || '-'}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                    {Object.keys(visaoGeralTasks).length === 0 && (
                                        <div className="text-center text-muted" style={{ padding: '40px 0', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 12 }}>
                                            Nenhuma tarefa encontrada com os filtros atuais.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {/* Per-Client Kanban Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <button className="btn btn-secondary" style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }} onClick={() => setSelectedOpsClient(null)}>
                                        <ChevronLeft size={16} /> Voltar
                                    </button>
                                    <h2 className="section-title" style={{ margin: 0 }}>Operações: {selectedOpsClient.name}</h2>
                                </div>
                                <button className="btn btn-primary" style={{ cursor: 'pointer' }} onClick={() => {
                                    setNewTask({ ...newTask, cliente_nome: selectedOpsClient.name });
                                    setShowNewTaskModal(true);
                                }}>
                                    <Plus size={14} /> Nova Tarefa
                                </button>
                            </div>

                            {/* Per-Client Kanban Board */}
                            <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
                                {KANBAN_COLUMNS.filter(c => c.id !== 'Finalizado').map(col => (
                                    <KanbanColumn key={col.id} col={col}
                                        tasks={kanbanTasks.filter(t => t.status === col.id && t.cliente_nome === selectedOpsClient.name)}
                                        getProgressInfo={getTaskProgressInfo}
                                        onDragOver={onDragOver} onDrop={onDrop}
                                        onDragStart={onDragStart} onDragEnd={onDragEnd}
                                        onOpenTask={setSelectedTaskPanel}
                                        todayStr={getBahiaDateString()}
                                    />
                                ))}
                                <KanbanColumn
                                    col={{ id: 'Finalizado', label: 'Finalizado', icon: <CheckCircle2 size={16} />, color: '#10B981' }}
                                    tasks={[]}
                                    getProgressInfo={getTaskProgressInfo}
                                    onDragOver={onDragOver} onDrop={onDrop}
                                    onDragStart={onDragStart} onDragEnd={onDragEnd}
                                    onOpenTask={setSelectedTaskPanel}
                                    todayStr={getBahiaDateString()}
                                    isDoneZone
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB PAINEL */}
            {activeTab === 'painel' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {/* Top Stat Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 8 }}>
                        {[
                            { value: pendingTasks, label: 'Tarefas em Andamento', color: '#3B82F6', icon: <Activity size={20} /> },
                            { value: completedTasksThisMonth, label: 'Concluídas no Mês', color: '#10B981', icon: <CheckCircle2 size={20} /> },
                            { value: `${(completedTasksThisMonth + pendingTasks) > 0 ? Math.round((completedTasksThisMonth / (completedTasksThisMonth + pendingTasks)) * 100) : 0}%`, label: 'Taxa de Conclusão', color: '#F59E0B', icon: <PieChart size={20} /> },
                            { value: deadlineHealth['Atrasadas'], label: 'Tarefas Atrasadas', color: deadlineHealth['Atrasadas'] > 0 ? '#EF4444' : '#10B981', icon: <Clock size={20} /> },
                        ].map((kpi, i) => (
                            <div key={i} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 12, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: kpi.color }} />
                                <div style={{ color: kpi.color, opacity: 0.7 }}>{kpi.icon}</div>
                                <div>
                                    <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{kpi.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Middle Section: Upcoming Radar & Deadline Health */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
                        {/* Upcoming Deadlines Radar */}
                        <div className="table-card" style={{ height: 380, display: 'flex', flexDirection: 'column' }}>
                            <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}><Clock size={18} /> Radar de Entregas (Próximas e Atrasadas)</h2>
                            <div style={{ flex: 1, overflowY: 'auto', marginTop: 12 }}>
                                {upcomingDeadlines.length > 0 ? (
                                    <table className="data-table" style={{ margin: 0 }}>
                                        <thead>
                                            <tr>
                                                <th>Tarefa</th>
                                                <th>Cliente</th>
                                                <th>Responsável</th>
                                                <th style={{ textAlign: 'center' }}>Prazo Limite</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {upcomingDeadlines.map(t => (
                                                <tr key={t.id} onClick={() => setSelectedTaskPanel(t)} style={{ cursor: 'pointer' }}>
                                                    <td style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }} title={t.titulo}>{t.titulo}</td>
                                                    <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>{t.cliente_nome || '-'}</td>
                                                    <td>{t.responsavel_id || '-'}</td>
                                                    <td style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                        {formatLocalSystemDate(t.data_termino!)}
                                                        {getDeadlineIndicator(t.data_termino)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="text-center text-muted" style={{ padding: '40px 0' }}>Nenhuma entrega agendada.</div>
                                )}
                            </div>
                        </div>

                        {/* Deadline Health Pie Chart */}
                        <div className="chart-container" style={{ borderRadius: 12, height: 380 }}>
                            <h2 style={{ fontSize: 16 }}>Saúde dos Prazos</h2>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPie>
                                        <Pie data={deadlineData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" nameKey="name"
                                            label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`} labelLine={false} stroke="none">
                                            {deadlineData.map((d, index) => {
                                                const fillMatch = d.name === 'No Prazo' ? PIE_COLORS_DEADLINE[0] :
                                                    d.name === 'Próximas (≤3 dias)' ? PIE_COLORS_DEADLINE[1] :
                                                        d.name === 'Atrasadas' ? PIE_COLORS_DEADLINE[2] : PIE_COLORS_DEADLINE[3];
                                                return <Cell key={`cell-${index}`} fill={fillMatch} />;
                                            })}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }} itemStyle={{ color: 'var(--text-primary)' }} />
                                    </RechartsPie>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section: Effort, Workload, Categories */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>

                        {/* 4. Effort by Member */}
                        <div className="chart-container" style={{ borderRadius: 12 }}>
                            <h2 style={{ fontSize: 16 }} title="Soma do grau de dificuldade (1-5) das tarefas de cada membro.">Esforço Real por Membro (Soma de Dificuldade)</h2>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={effortByMemberData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                        <Bar dataKey="amount" fill="#8B5CF6" radius={[0, 4, 4, 0]} name="Pontos de Esforço" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* 3. Workload by Client */}
                        <div className="chart-container" style={{ borderRadius: 12 }}>
                            <h2 style={{ fontSize: 16 }}>Carga de Trabalho por Cliente (Top 10)</h2>
                            <div style={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={workloadByClientData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis type="number" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} width={100} />
                                        <Tooltip contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                        <Bar dataKey="amount" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Qtd. Tarefas Pendentes" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Distribution by Category */}
                        <div className="chart-container" style={{ borderRadius: 12 }}>
                            <h2 style={{ fontSize: 16 }}>Distribuição por Categoria (Ativas)</h2>
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

                    </div>
                </div>
            )}

            {/* TAB KANBAN */}
            {activeTab === 'kanban' && (
                <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <p className="text-muted" style={{ margin: 0 }}>Arraste os cards entre as colunas para atualizar o status.</p>
                        <button className="btn btn-primary" style={{ cursor: 'pointer' }} onClick={() => setShowNewTaskModal(true)}>
                            <Plus size={14} /> Nova Tarefa
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
                        {KANBAN_COLUMNS.filter(c => c.id !== 'Finalizado').map(col => (
                            <KanbanColumn key={col.id} col={col}
                                tasks={kanbanTasks.filter(t => t.status === col.id)}
                                getProgressInfo={getTaskProgressInfo}
                                onDragOver={onDragOver} onDrop={onDrop}
                                onDragStart={onDragStart} onDragEnd={onDragEnd}
                                onOpenTask={setSelectedTaskPanel}
                                todayStr={getBahiaDateString()}
                            />
                        ))}
                        <KanbanColumn
                            col={{ id: 'Finalizado', label: 'Finalizado', icon: <CheckCircle2 size={16} />, color: '#10B981' }}
                            tasks={[]}
                            getProgressInfo={getTaskProgressInfo}
                            onDragOver={onDragOver} onDrop={onDrop}
                            onDragStart={onDragStart} onDragEnd={onDragEnd}
                            onOpenTask={setSelectedTaskPanel}
                            todayStr={getBahiaDateString()}
                            isDoneZone
                        />
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
                                    <button className="btn" style={{ background: 'var(--danger)', color: '#fff', padding: '6px 12px', cursor: 'pointer' }} onClick={async () => {
                                        for (const t of finishedTasks) {
                                            await removeOperationalTask(t.id);
                                        }
                                        setTasksData(tasks.filter(t => t.status !== 'Finalizado'));
                                        setConfirmClearHistory(false);
                                        showToast('Histórico limpo com sucesso!');
                                    }}>Confirmar Limpeza</button>
                                    <button className="btn btn-secondary" style={{ padding: '6px 12px', cursor: 'pointer' }} onClick={() => setConfirmClearHistory(false)}>Cancelar</button>
                                </div>
                            ) : (
                                <button className="btn btn-secondary" style={{ color: '#EF4444', padding: '6px 12px', cursor: 'pointer' }} onClick={() => setConfirmClearHistory(true)}>
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
                                    <td>{t.data_inicio ? formatLocalSystemDate(t.data_inicio) : '-'}</td>
                                    <td>{t.data_conclusao ? formatLocalSystemDate(t.data_conclusao) : '-'}</td>
                                </tr>
                            ))}
                            {finishedTasks.length === 0 && (
                                <tr><td colSpan={7} className="text-center text-muted" style={{ padding: '24px 0' }}>Nenhuma tarefa finalizada</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB TEMPLATES DE TAREFAS */}
            {activeTab === 'templates' && (() => {
                function openNewTemplate() {
                    setEditingTemplate(null);
                    setTplFormNome(''); setTplFormDescricao(''); setTplFormSubtarefas(['']); setTplFormError('');
                    setShowTemplateModal(true);
                }
                function openEditTemplate(t: TaskTemplate) {
                    setEditingTemplate(t);
                    setTplFormNome(t.nome);
                    setTplFormDescricao(t.descricao ?? '');
                    setTplFormSubtarefas((t.subtarefas ?? []).sort((a, b) => a.ordem - b.ordem).map(s => s.titulo).concat(['']));
                    setTplFormError('');
                    setShowTemplateModal(true);
                }
                async function handleSaveTemplate() {
                    setTplFormError('');
                    if (!tplFormNome.trim()) { setTplFormError('Informe o nome do template.'); return; }
                    const subs = tplFormSubtarefas.filter(s => s.trim());
                    setTplSaving(true);
                    try {
                        if (editingTemplate) {
                            await updateTaskTemplate(editingTemplate.id, tplFormNome.trim(), tplFormDescricao.trim(), subs);
                        } else {
                            await addTaskTemplate(tplFormNome.trim(), tplFormDescricao.trim(), subs);
                        }
                        await refetchTemplates();
                        setShowTemplateModal(false);
                    } catch (e: any) {
                        const msg = e?.message || e?.error_description || JSON.stringify(e);
                        setTplFormError(`Erro: ${msg}`);
                        console.error('Erro ao salvar template:', e);
                    } finally { setTplSaving(false); }
                }
                async function handleArchiveTemplate(id: string) {
                    await archiveTaskTemplate(id);
                    await refetchTemplates();
                    setConfirmArchiveTemplate(null);
                }
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 className="section-title" style={{ margin: 0 }}>Templates de Tarefas</h2>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                                    Crie tarefas padronizadas com sub-tarefas pré-definidas. Ao criar uma tarefa, selecione um template para carregar tudo automaticamente.
                                </p>
                            </div>
                            <button className="btn btn-primary" style={{ cursor: 'pointer' }} onClick={openNewTemplate}>
                                <Plus size={14} /> Novo Template
                            </button>
                        </div>

                        {taskTemplates.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60, border: '1px dashed var(--border-default)', borderRadius: 12 }}>
                                Nenhum template criado ainda. Clique em "Novo Template" para começar.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {taskTemplates.map(t => {
                                    const isExpanded = expandedTemplateId === t.id;
                                    const subtarefas = (t.subtarefas ?? []).sort((a, b) => a.ordem - b.ordem);
                                    return (
                                        <div key={t.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 12 }}>
                                                <Sparkles size={15} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t.nome}</div>
                                                    {t.descricao && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.descricao}</div>}
                                                </div>
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                                                    {subtarefas.length} sub-tarefa{subtarefas.length !== 1 ? 's' : ''}
                                                </span>
                                                <button onClick={() => setExpandedTemplateId(isExpanded ? null : t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                                                    <ChevronRight size={16} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                                </button>
                                                <button onClick={() => openEditTemplate(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} title="Editar">
                                                    <Eye size={14} />
                                                </button>
                                                <button onClick={() => setConfirmArchiveTemplate({ id: t.id, nome: t.nome })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} title="Arquivar">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            {isExpanded && subtarefas.length > 0 && (
                                                <div style={{ borderTop: '1px solid var(--border-default)', padding: '12px 16px 14px 44px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                    {subtarefas.map((s, i) => (
                                                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                                                            <span style={{ color: 'var(--text-muted)', fontSize: 11, width: 18, textAlign: 'right', flexShrink: 0 }}>{i + 1}.</span>
                                                            {s.titulo}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Modal Confirmar Arquivamento */}
                        {confirmArchiveTemplate && (
                            <div className="modal-overlay" onClick={() => setConfirmArchiveTemplate(null)}>
                                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                                    <div className="modal-header">
                                        <h2 className="modal-title">Arquivar Template</h2>
                                        <button className="modal-close" style={{ cursor: 'pointer' }} onClick={() => setConfirmArchiveTemplate(null)}><X size={16} /></button>
                                    </div>
                                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                            Deseja arquivar o template <strong style={{ color: 'var(--text-primary)' }}>{confirmArchiveTemplate.nome}</strong>? Ele não aparecerá mais na lista de templates, mas as tarefas criadas a partir dele não serão afetadas.
                                        </p>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                            <button className="btn btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setConfirmArchiveTemplate(null)}>Cancelar</button>
                                            <button className="btn btn-danger" style={{ cursor: 'pointer', background: '#EF4444', color: '#fff', border: 'none' }} onClick={() => handleArchiveTemplate(confirmArchiveTemplate.id)}>Arquivar</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Modal Criar/Editar Template */}
                        {showTemplateModal && (
                            <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
                                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                                    <div className="modal-header">
                                        <h2 className="modal-title">{editingTemplate ? 'Editar Template' : 'Novo Template'}</h2>
                                        <button className="modal-close" style={{ cursor: 'pointer' }} onClick={() => setShowTemplateModal(false)}><X size={16} /></button>
                                    </div>
                                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div>
                                            <label className="form-label">Nome do Template *</label>
                                            <input type="text" className="form-input" value={tplFormNome} onChange={e => setTplFormNome(e.target.value)} placeholder="Ex: IA de Atendimento" />
                                        </div>
                                        <div>
                                            <label className="form-label">Descrição</label>
                                            <input type="text" className="form-input" value={tplFormDescricao} onChange={e => setTplFormDescricao(e.target.value)} placeholder="Breve descrição do que este template representa" />
                                        </div>
                                        <div>
                                            <label className="form-label">Sub-tarefas padrão</label>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                                {tplFormSubtarefas.map((s, i) => (
                                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 18, textAlign: 'right', flexShrink: 0 }}>{i + 1}.</span>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={s}
                                                            onChange={e => setTplFormSubtarefas(prev => prev.map((x, idx) => idx === i ? e.target.value : x))}
                                                            placeholder={`Sub-tarefa ${i + 1}...`}
                                                            style={{ flex: 1 }}
                                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setTplFormSubtarefas(prev => [...prev, '']); } }}
                                                        />
                                                        {tplFormSubtarefas.length > 1 && (
                                                            <button onClick={() => setTplFormSubtarefas(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: '0 4px' }}>×</button>
                                                        )}
                                                    </div>
                                                ))}
                                                <button onClick={() => setTplFormSubtarefas(prev => [...prev, ''])} style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--accent-light)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                                    <Plus size={12} /> Adicionar sub-tarefa
                                                </button>
                                            </div>
                                        </div>
                                        {tplFormError && <div style={{ color: '#EF4444', fontSize: 13, background: 'rgba(239,68,68,0.1)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>{tplFormError}</div>}
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                                            <button className="btn btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setShowTemplateModal(false)}>Cancelar</button>
                                            <button className="btn btn-primary" style={{ cursor: 'pointer' }} onClick={handleSaveTemplate} disabled={tplSaving}>
                                                {tplSaving ? 'Salvando...' : editingTemplate ? 'Salvar Alterações' : 'Criar Template'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Modal Nova Tarefa */}
            {showNewTaskModal && (
                <div className="modal-overlay" onClick={() => { setShowNewTaskModal(false); setSelectedTemplateId(null); setPendingSubtarefas([]); setTemplateSearch(''); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Nova Tarefa Operacional</h2>
                            <button className="modal-close" style={{ cursor: 'pointer' }} onClick={() => { setShowNewTaskModal(false); setSelectedTemplateId(null); setPendingSubtarefas([]); setTemplateSearch(''); }}><X size={16} /></button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Seletor de Template */}
                            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-default)', borderRadius: 10, padding: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                    <Sparkles size={14} style={{ color: 'var(--accent-light)' }} />
                                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>USAR TEMPLATE</span>
                                    {selectedTemplateId && (
                                        <button onClick={() => { setSelectedTemplateId(null); setPendingSubtarefas([]); }} style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                            Limpar
                                        </button>
                                    )}
                                </div>
                                {!selectedTemplateId ? (
                                    <>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Buscar template..."
                                            value={templateSearch}
                                            onChange={e => setTemplateSearch(e.target.value)}
                                            style={{ marginBottom: 8, fontSize: 12 }}
                                        />
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {taskTemplates
                                                .filter(t => t.nome.toLowerCase().includes(templateSearch.toLowerCase()))
                                                .map(t => (
                                                    <button key={t.id} onClick={() => {
                                                        setSelectedTemplateId(t.id);
                                                        setNewTask(prev => ({ ...prev, titulo: prev.titulo || t.nome, descricao: prev.descricao || (t.descricao ?? '') }));
                                                        setPendingSubtarefas((t.subtarefas ?? []).sort((a, b) => a.ordem - b.ordem).map(s => s.titulo));
                                                    }} style={{
                                                        fontSize: 12, padding: '4px 10px', borderRadius: 20,
                                                        background: 'var(--accent-muted)', color: 'var(--accent-light)',
                                                        border: '1px solid var(--accent-muted)', cursor: 'pointer'
                                                    }}>
                                                        {t.nome}
                                                    </button>
                                                ))
                                            }
                                            {taskTemplates.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Nenhum template disponível</span>}
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-light)', marginBottom: 8 }}>
                                            {taskTemplates.find(t => t.id === selectedTemplateId)?.nome}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            {pendingSubtarefas.map((sub, i) => (
                                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 16, textAlign: 'right', flexShrink: 0 }}>{i + 1}.</span>
                                                    <input
                                                        type="text"
                                                        value={sub}
                                                        onChange={e => setPendingSubtarefas(prev => prev.map((s, idx) => idx === i ? e.target.value : s))}
                                                        style={{ flex: 1, fontSize: 12, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '2px 4px', outline: 'none' }}
                                                    />
                                                    <button onClick={() => setPendingSubtarefas(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 14, lineHeight: 1 }}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
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
                                    <div className="combobox-container" ref={newRespRef}>
                                        <div className={`combobox-trigger ${showNewResponsavelList ? 'active' : ''}`} onClick={() => setShowNewResponsavelList(!showNewResponsavelList)} style={{ cursor: 'pointer' }}>
                                            {newTask.responsavel_id ? (
                                                <span className="combobox-chip">
                                                    {filteredOpUsuarios.find(u => u.nome === newTask.responsavel_id)?.nome || newTask.responsavel_id}
                                                    <span className="combobox-chip-remove" onClick={e => { e.stopPropagation(); setNewTask({ ...newTask, responsavel_id: '' }); }}>×</span>
                                                </span>
                                            ) : <span className="combobox-placeholder">Selecione...</span>}
                                        </div>
                                        {showNewResponsavelList && (
                                            <div className="combobox-dropdown">
                                                {filteredOpUsuarios.map(u => {
                                                    const isSel = newTask.responsavel_id === u.nome;
                                                    return (
                                                        <div key={u.id} className={`combobox-item ${isSel ? 'selected' : ''}`}
                                                            onClick={() => { setNewTask({ ...newTask, responsavel_id: u.nome }); setShowNewResponsavelList(false); }} style={{ cursor: 'pointer' }}>
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
                                    <label className="form-label">Cliente</label>
                                    <input type="text" className="form-input" value={newTask.cliente_nome || ''} onChange={e => setNewTask({ ...newTask, cliente_nome: e.target.value })} placeholder="Nome do cliente" />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Participantes</label>
                                <div className="combobox-container" ref={newPartRef}>
                                    <div className={`combobox-trigger ${showNewParticipantesList ? 'active' : ''}`} onClick={() => setShowNewParticipantesList(!showNewParticipantesList)} style={{ cursor: 'pointer' }}>
                                        {(newTask.participantes_ids || []).length > 0 ? (
                                            (newTask.participantes_ids || []).map(uid => {
                                                const u = filteredOpUsuarios.find(x => x.id === uid);
                                                return (
                                                    <span key={uid} className="combobox-chip">
                                                        {u?.nome || uid}
                                                        <span className="combobox-chip-remove" onClick={e => { e.stopPropagation(); setNewTask({ ...newTask, participantes_ids: (newTask.participantes_ids || []).filter(x => x !== uid) }); }}>×</span>
                                                    </span>
                                                );
                                            })
                                        ) : <span className="combobox-placeholder">Selecione participantes...</span>}
                                    </div>
                                    {showNewParticipantesList && (
                                        <div className="combobox-dropdown">
                                            {filteredOpUsuarios.map(u => {
                                                const isSel = (newTask.participantes_ids || []).includes(u.id);
                                                return (
                                                    <div key={u.id} className={`combobox-item ${isSel ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            const ids = newTask.participantes_ids || [];
                                                            setNewTask({ ...newTask, participantes_ids: isSel ? ids.filter(x => x !== u.id) : [...ids, u.id] });
                                                        }} style={{ cursor: 'pointer' }}>
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
                                    <input type="date" className="form-input" value={newTask.data_inicio ? newTask.data_inicio.slice(0, 10) : ''} onChange={e => setNewTask({ ...newTask, data_inicio: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Prazo Limite</label>
                                    <input type="date" className="form-input" value={newTask.data_termino ? newTask.data_termino.slice(0, 10) : ''} onChange={e => setNewTask({ ...newTask, data_termino: e.target.value })} />
                                </div>
                            </div>
                            {taskFormError && <div style={{ color: '#EF4444', fontSize: 13, background: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center', marginTop: 16 }}>{taskFormError}</div>}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16 }}>
                                <button className="btn btn-secondary" style={{ cursor: 'pointer' }} onClick={() => { setShowNewTaskModal(false); setTaskFormError(''); setSelectedTemplateId(null); setPendingSubtarefas([]); setTemplateSearch(''); }}>Cancelar</button>
                                <button className="btn btn-primary" style={{ cursor: 'pointer' }} onClick={handleCreateTask}>Criar Tarefa</button>
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
                            <button className="modal-close" style={{ cursor: 'pointer' }} onClick={() => setShowEditTaskModal(false)}><X size={16} /></button>
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
                                    <div className="combobox-container" ref={editRespRef}>
                                        <div className={`combobox-trigger ${showEditResponsavelList ? 'active' : ''}`} onClick={() => setShowEditResponsavelList(!showEditResponsavelList)} style={{ cursor: 'pointer' }}>
                                            {editTaskForm.responsavel_id ? (
                                                <span className="combobox-chip">
                                                    {filteredOpUsuarios.find(u => u.nome === editTaskForm.responsavel_id)?.nome || editTaskForm.responsavel_id}
                                                    <span className="combobox-chip-remove" onClick={e => { e.stopPropagation(); setEditTaskForm({ ...editTaskForm, responsavel_id: '' }); }}>×</span>
                                                </span>
                                            ) : <span className="combobox-placeholder">Selecione...</span>}
                                        </div>
                                        {showEditResponsavelList && (
                                            <div className="combobox-dropdown">
                                                {filteredOpUsuarios.map(u => {
                                                    const isSel = editTaskForm.responsavel_id === u.nome;
                                                    return (
                                                        <div key={u.id} className={`combobox-item ${isSel ? 'selected' : ''}`}
                                                            onClick={() => { setEditTaskForm({ ...editTaskForm, responsavel_id: u.nome }); setShowEditResponsavelList(false); }} style={{ cursor: 'pointer' }}>
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
                                    <label className="form-label">Cliente</label>
                                    <input type="text" className="form-input" value={editTaskForm.cliente_nome || ''} onChange={e => setEditTaskForm({ ...editTaskForm, cliente_nome: e.target.value })} placeholder="Nome do cliente" />
                                </div>
                            </div>
                            <div>
                                <label className="form-label">Participantes</label>
                                <div className="combobox-container" ref={editPartRef}>
                                    <div className={`combobox-trigger ${showEditParticipantesList ? 'active' : ''}`} onClick={() => setShowEditParticipantesList(!showEditParticipantesList)} style={{ cursor: 'pointer' }}>
                                        {(editTaskForm.participantes_ids || []).length > 0 ? (
                                            (editTaskForm.participantes_ids || []).map(uid => {
                                                const u = filteredOpUsuarios.find(x => x.id === uid);
                                                return (
                                                    <span key={uid} className="combobox-chip">
                                                        {u?.nome || uid}
                                                        <span className="combobox-chip-remove" onClick={e => { e.stopPropagation(); setEditTaskForm({ ...editTaskForm, participantes_ids: (editTaskForm.participantes_ids || []).filter(x => x !== uid) }); }}>×</span>
                                                    </span>
                                                );
                                            })
                                        ) : <span className="combobox-placeholder">Selecione participantes...</span>}
                                    </div>
                                    {showEditParticipantesList && (
                                        <div className="combobox-dropdown">
                                            {filteredOpUsuarios.map(u => {
                                                const isSel = (editTaskForm.participantes_ids || []).includes(u.id);
                                                return (
                                                    <div key={u.id} className={`combobox-item ${isSel ? 'selected' : ''}`}
                                                        onClick={() => {
                                                            const ids = editTaskForm.participantes_ids || [];
                                                            setEditTaskForm({ ...editTaskForm, participantes_ids: isSel ? ids.filter(x => x !== u.id) : [...ids, u.id] });
                                                        }} style={{ cursor: 'pointer' }}>
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
                                    <input type="date" className="form-input" value={editTaskForm.data_inicio ? editTaskForm.data_inicio.slice(0, 10) : ''} onChange={e => setEditTaskForm({ ...editTaskForm, data_inicio: e.target.value })} />
                                </div>
                                <div>
                                    <label className="form-label">Prazo Limite</label>
                                    <input type="date" className="form-input" value={editTaskForm.data_termino ? editTaskForm.data_termino.slice(0, 10) : ''} onChange={e => setEditTaskForm({ ...editTaskForm, data_termino: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label className="form-label">Status</label>
                                    <select className="form-select" value={editTaskForm.status || 'A Fazer'} onChange={e => setEditTaskForm({ ...editTaskForm, status: e.target.value as OperationalTask['status'] })}>
                                        <option value="A Fazer">A Fazer</option>
                                        <option value="Fazendo">Fazendo</option>
                                        <option value="Revisando">Revisando</option>
                                        <option value="Finalizado">Finalizado</option>
                                    </select>
                                </div>
                            </div>
                            {taskFormError && <div style={{ color: '#EF4444', fontSize: 13, background: 'rgba(239, 68, 68, 0.1)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>{taskFormError}</div>}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                                {confirmDeleteId === editTaskForm.id ? (
                                    <>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="btn" style={{ padding: '8px 16px', background: 'var(--danger)', color: '#fff', borderRadius: 8, cursor: 'pointer' }} onClick={() => handleDeleteTask(editTaskForm.id!)}>Confirmar Exclusão</button>
                                            <button className="btn btn-secondary" style={{ cursor: 'pointer' }} onClick={() => setConfirmDeleteId(null)}>Cancelar</button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <button className="btn" style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', padding: '8px 14px', borderRadius: 8, cursor: 'pointer' }} onClick={() => setConfirmDeleteId(editTaskForm.id || null)}>Excluir</button>
                                    </>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button className="btn btn-secondary" style={{ cursor: 'pointer' }} onClick={() => { setShowEditTaskModal(false); setTaskFormError(''); }}>Cancelar</button>
                                <button className="btn btn-primary" style={{ cursor: 'pointer' }} onClick={handleSaveEditTask}>Salvar Alterações</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedTaskPanel && (
                <TaskDetailPanel
                    task={selectedTaskPanel}
                    onClose={() => { setSelectedTaskPanel(null); refetchSubtarefas(); }}
                    onEdit={() => {
                        setSelectedTaskPanel(null);
                        setEditTaskForm(selectedTaskPanel);
                        setShowEditTaskModal(true);
                        refetchSubtarefas();
                    }}
                    onTaskUpdate={async (id, updates) => {
                        const updated = await updateOperationalTask(id, updates);
                        setTasksData(tasks.map(t => t.id === id ? updated : t));
                    }}
                    user={user}
                />
            )}

            {toastMessage && (
                <div style={{ position: 'fixed', bottom: 24, right: 24, background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-default)', padding: '12px 20px', borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,0.4)', zIndex: 99999, fontWeight: 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, animation: 'slideInRight 0.3s ease-out' }}>
                    <CheckCircle2 size={16} color="#10B981" />
                    {toastMessage}
                </div>
            )}
        </div>
    );
}
