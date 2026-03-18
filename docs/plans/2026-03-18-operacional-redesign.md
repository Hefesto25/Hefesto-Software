# Operacional Tab — Complete Redesign Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesenhar completamente a aba Operacional para uma experiência ClickUp-like: cards ricos no Kanban, subtarefas inline expansíveis, TaskDetailPanel robusto e design coerente com o sistema visual Hefesto (CSS variables dark + blue accent).

**Architecture:** Todo o redesign acontece em `app/operacional/page.tsx`, preservando toda a lógica de negócio, hooks e mutations do Supabase. Apenas a camada visual é reescrita. Componentes são extraídos como funções no mesmo arquivo para evitar quebrar imports. Os CSS variables existentes em `globals.css` são reutilizados fielmente.

**Tech Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS + CSS Variables, Lucide React, Recharts, Supabase hooks existentes

---

## Regras de Design (nunca quebrar)

- **Zero emojis como ícones** — usar apenas Lucide SVG
- **Zero inline `style={{}}` quando uma classe CSS já existe** — usar variáveis CSS e classes globais
- **Todas as interações com `cursor-pointer`** e `transition` de 150–300ms
- **Cores de status:** `A Fazer` = amber (#F59E0B), `Fazendo` = blue (#3B82F6), `Revisando` = violet (#8B5CF6), `Finalizado` = green (#10B981)
- **Deadline semáforo:** vermelho (<0 dias), amarelo (0–3 dias), verde (>3 dias)
- Manter `var(--bg-primary)`, `var(--bg-secondary)`, `var(--accent)`, `var(--text-primary)`, `var(--text-muted)`, `var(--border-default)` — não hardcodar cores duplicadas
- **Responsividade:** Kanban com `overflow-x: auto` horizontal, cards com `min-width: 300px`
- **Preservar toda a lógica:** `useOperationalTasks`, `useSubtarefas`, `useTodasSubtarefas`, `addSubtarefa`, `toggleSubtarefa`, `removeSubtarefa`, `updateOperationalTask`, `addOperationalTask`, `removeOperationalTask` — não alterar nenhum hook ou mutation

---

## Task 1: TaskCard Component — Redesign do Card Kanban

**Arquivo:** `app/operacional/page.tsx` (componente `TaskCard` inline)

**Objetivo:** Criar um card rico estilo ClickUp com: badge de cliente, título, tags de categoria/origem, assignee avatar, deadline com semáforo, indicador de dificuldade (pontos), e progress de subtarefas com toggle para expandir lista inline.

**Campos visuais no card:**
- Linha topo: Badge colorido do cliente + tags (categoria, origem comercial)
- Título da tarefa (font-weight 500, 14px)
- Meta row: Avatar do responsável + nome | Deadline badge colorido
- Dificuldade: 5 bolinhas preenchidas/vazias (1–5)
- Subtarefas progress: `[●●●○○] 3/5` com barra fina embaixo
- Hover: elevação via box-shadow, borda accent

**Step 1: Adicionar o componente `TaskCard` antes do `KANBAN_COLUMNS`**

```tsx
// Adicionar logo após os imports, antes de KANBAN_COLUMNS

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

function AssigneeAvatar({ name, color }: { name: string; color?: string }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const bg = color || 'var(--accent)';
  return (
    <div style={{
      width: 24, height: 24, borderRadius: '50%',
      background: bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 10, fontWeight: 600,
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
  getDeadlineIndicator: (date?: string) => React.ReactNode;
  formatDate: (date: string) => string;
  todayStr: string;
}

function TaskCard({
  task, progressInfo, onDragStart, onDragEnd, onClickOpen,
  getDeadlineIndicator, formatDate, todayStr
}: TaskCardProps) {
  const isOverdue = task.data_termino ? task.data_termino < todayStr : false;
  const deadlineSoon = task.data_termino
    ? Math.ceil((new Date(task.data_termino).getTime() - new Date(todayStr).getTime()) / 86400000) <= 3
    : false;

  const deadlineColor = isOverdue ? '#EF4444' : deadlineSoon ? '#F59E0B' : 'var(--text-muted)';

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={() => onClickOpen(task)}
      style={{
        background: 'var(--bg-secondary)',
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
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.3)';
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
      }}
    >
      {/* Top row: client badge + tags */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{
          fontSize: 10, fontWeight: 600,
          background: 'var(--accent-muted)', color: 'var(--accent-light)',
          padding: '2px 8px', borderRadius: 20, letterSpacing: 0.3
        }}>
          {task.cliente_nome || 'Sem Cliente'}
        </span>
        {task.categoria_tarefa && (
          <span style={{
            fontSize: 10, background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: 20
          }}>
            {task.categoria_tarefa}
          </span>
        )}
        {task.origem === 'comercial_automatico' && (
          <span style={{
            fontSize: 10, background: 'rgba(139,92,246,0.15)',
            color: '#A78BFA', padding: '2px 8px', borderRadius: 20
          }}>
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

      {/* Footer row: assignee + difficulty + deadline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
        {task.responsavel_id && (
          <AssigneeAvatar name={task.responsavel_id} />
        )}
        <DifficultyDots value={task.dificuldade} />
        <div style={{ flex: 1 }} />
        {task.data_termino && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: deadlineColor }}>
            <Calendar size={11} />
            {formatDate(task.data_termino)}
          </div>
        )}
      </div>

      {/* Subtask progress bar */}
      {progressInfo && progressInfo.total > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
            <span>Subtarefas</span>
            <span>{progressInfo.concluidas}/{progressInfo.total}</span>
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
```

**Step 2: Adicionar import de `Calendar` ao destructuring do lucide-react**

Localizar: `import { Activity, Clock, CheckCircle2, LayoutDashboard, List, PieChart, Plus, Search as SearchIcon, Eye, Users, ChevronLeft, Trash2, X } from 'lucide-react';`

Substituir por:
```tsx
import { Activity, Clock, CheckCircle2, LayoutDashboard, List, PieChart, Plus, Search as SearchIcon, Eye, Users, ChevronLeft, Trash2, X, Calendar, Star, ChevronDown, ChevronRight, GripVertical, UserCircle } from 'lucide-react';
```

**Step 3: Verificar que o componente compila sem erros**

```bash
cd '/Users/MarcelSgarioni/Documents/Hefesto/IDE/Antigravity/Hefesto Software/Hefesto-Software' && npx tsc --noEmit 2>&1 | head -30
```

**Step 4: Substituir os cards inline nos dois Kanbans (per-client e Kanban Geral) pelo componente `TaskCard`**

No bloco do Per-Client Kanban (linha ~668), substituir o map de task cards:
```tsx
{colTasks.map(task => {
  const info = getTaskProgressInfo(task.id);
  return (
    <TaskCard
      key={task.id}
      task={task}
      progressInfo={info}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClickOpen={(t) => setSelectedTaskPanel(t)}
      getDeadlineIndicator={getDeadlineIndicator}
      formatDate={formatLocalSystemDate}
      todayStr={getBahiaDateString()}
    />
  );
})}
```

Fazer o mesmo no Kanban Geral (linha ~881–915).

---

## Task 2: KanbanColumn Component — Redesign das Colunas

**Objetivo:** Colunas com accent bar colorida no topo, header com ícone + label + count badge, empty state melhorado, e zona de drop visual.

**Step 1: Criar componente `KanbanColumn`**

```tsx
interface KanbanColumnProps {
  col: { id: string; label: string; icon: React.ReactNode; color: string };
  tasks: OperationalTask[];
  allTasks: OperationalTask[];
  getProgressInfo: (id: string) => { progresso: number; total: number; concluidas: number } | null;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, status: OperationalTask['status']) => void;
  onDragStart: (e: React.DragEvent, task: OperationalTask) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onOpenTask: (task: OperationalTask) => void;
  getDeadlineIndicator: (date?: string) => React.ReactNode;
  todayStr: string;
  isDoneZone?: boolean;
}

function KanbanColumn({
  col, tasks, getProgressInfo, onDragOver, onDrop,
  onDragStart, onDragEnd, onOpenTask, getDeadlineIndicator, todayStr, isDoneZone = false
}: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div
      style={{
        minWidth: 300, width: 300, display: 'flex', flexDirection: 'column', gap: 0,
        background: isDoneZone ? 'rgba(16,185,129,0.04)' : 'var(--bg-secondary)',
        borderRadius: 12,
        border: isDragOver
          ? `2px solid ${col.color}`
          : isDoneZone
            ? '2px dashed rgba(16,185,129,0.25)'
            : '1px solid var(--border-default)',
        minHeight: '65vh',
        overflow: 'hidden',
        transition: 'border-color 0.15s ease',
      }}
      onDragOver={(e) => { onDragOver(e); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { onDrop(e, col.id as OperationalTask['status']); setIsDragOver(false); }}
    >
      {/* Accent bar */}
      <div style={{ height: 3, background: col.color, borderRadius: '12px 12px 0 0', flexShrink: 0 }} />

      {/* Column header */}
      <div style={{
        padding: '12px 14px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderBottom: '1px solid var(--border-default)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: col.color, fontWeight: 600, fontSize: 13 }}>
          {col.icon}
          {col.label}
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600,
          background: `${col.color}20`, color: col.color,
          padding: '2px 8px', borderRadius: 20
        }}>
          {tasks.length}
        </span>
      </div>

      {/* Cards area */}
      <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
        {isDoneZone ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '40px 16px', textAlign: 'center' }}>
            <CheckCircle2 size={28} color="rgba(16,185,129,0.4)" />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Arraste aqui para finalizar.<br />Cards vão para o Histórico.
            </span>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 6, padding: '32px 16px', textAlign: 'center',
            border: '1px dashed rgba(255,255,255,0.08)', borderRadius: 8, margin: '4px 0'
          }}>
            <GripVertical size={20} color="rgba(255,255,255,0.15)" />
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
              getDeadlineIndicator={getDeadlineIndicator}
              formatDate={formatLocalSystemDate}
              todayStr={todayStr}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

**Step 2: Substituir os dois blocos de kanban (per-client e geral) pelo `KanbanColumn`**

Per-client kanban board (substituir o `div` de colunas):
```tsx
<div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
  {KANBAN_COLUMNS.filter(c => c.id !== 'Finalizado').map(col => (
    <KanbanColumn
      key={col.id}
      col={col}
      tasks={kanbanTasks.filter(t => t.status === col.id && t.cliente_nome === selectedOpsClient.name)}
      allTasks={kanbanTasks}
      getProgressInfo={getTaskProgressInfo}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onOpenTask={setSelectedTaskPanel}
      getDeadlineIndicator={getDeadlineIndicator}
      todayStr={getBahiaDateString()}
    />
  ))}
  <KanbanColumn
    col={{ id: 'Finalizado', label: 'Finalizado', icon: <CheckCircle2 size={16} />, color: '#10B981' }}
    tasks={[]}
    allTasks={kanbanTasks}
    getProgressInfo={getTaskProgressInfo}
    onDragOver={onDragOver}
    onDrop={onDrop}
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
    onOpenTask={setSelectedTaskPanel}
    getDeadlineIndicator={getDeadlineIndicator}
    todayStr={getBahiaDateString()}
    isDoneZone
  />
</div>
```

Repetir o mesmo padrão para o Kanban Geral.

---

## Task 3: TaskDetailPanel — Redesign Completo (ClickUp-style)

**Objetivo:** Painel lateral rico com: breadcrumb cliente > tarefa, propriedades em grid (status, dificuldade com bolinhas, responsável com avatar, prazo), descrição com melhor tipografia, e seção de subtarefas estilo ClickUp: lista com checkboxes grandes, strikethrough animado, botão "+ Subtarefa" clicável (não só via Enter), barra de progresso proeminente com percentual.

**Step 1: Reescrever completamente o componente `TaskDetailPanel`**

```tsx
function TaskDetailPanel({
  task, onClose, onTaskUpdate, onEdit, user
}: {
  task: OperationalTask;
  onClose: () => void;
  onTaskUpdate: (id: string, updates: Partial<OperationalTask>) => Promise<void>;
  onEdit: () => void;
  user: any;
}) {
  const { data: subtarefas, refetch } = useSubtarefas(task.id);
  const [novaSubtarefa, setNovaSubtarefa] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const progresso = calcularProgresso(subtarefas || []);

  const isAdmin = user?.categoria === 'Admin Geral';
  const isResponsavel = task.responsavel_id === user?.nome;
  const isParticipante = task.participantes_ids?.includes(user?.id || '');
  const canEdit = isAdmin || isResponsavel || isParticipante;

  const statusConfig: Record<string, { color: string; label: string }> = {
    'A Fazer': { color: '#F59E0B', label: 'A Fazer' },
    'Fazendo': { color: '#3B82F6', label: 'Fazendo' },
    'Revisando': { color: '#8B5CF6', label: 'Revisando' },
    'Finalizado': { color: '#10B981', label: 'Finalizado' },
  };
  const statusInfo = statusConfig[task.status] || { color: 'var(--text-muted)', label: task.status };

  const handleAddSubtarefa = async () => {
    if (!novaSubtarefa.trim() || !canEdit) return;
    await addSubtarefa(task.id, novaSubtarefa.trim(), (subtarefas?.length || 0) + 1);
    setNovaSubtarefa('');
    setAddingSubtask(false);
    refetch();
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') await handleAddSubtarefa();
    if (e.key === 'Escape') { setNovaSubtarefa(''); setAddingSubtask(false); }
  };

  const handleToggle = async (id: string, concluida: boolean) => {
    if (!canEdit) return;
    await toggleSubtarefa(id, concluida);
    const novas = (subtarefas || []).map(s => s.id === id ? { ...s, concluida } : s);
    const novoProgresso = calcularProgresso(novas);
    if (novoProgresso === 100 && task.status !== 'Finalizado') {
      await onTaskUpdate(task.id, { status: 'Finalizado', data_conclusao: new Date().toISOString() });
      onClose();
    }
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (!canEdit) return;
    await removeSubtarefa(id);
    refetch();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 9998,
          animation: 'fadeIn 0.2s ease'
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 480,
        background: 'var(--bg-secondary)',
        borderLeft: '1px solid var(--border-default)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease-out',
      }}>

        {/* Panel Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-default)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Operacional</span>
            <ChevronRight size={12} color="var(--text-muted)" />
            <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>
              {task.cliente_nome || 'Sem Cliente'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {canEdit && (
              <button
                onClick={onEdit}
                style={{
                  background: 'var(--accent-muted)', border: 'none',
                  color: 'var(--accent)', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, padding: '5px 12px',
                  borderRadius: 6, transition: 'background 0.15s'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent-muted)')}
              >
                Editar
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer',
                padding: 4, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'color 0.15s'
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Title */}
            <h2 style={{
              fontSize: 18, fontWeight: 600, color: 'var(--text-primary)',
              lineHeight: 1.4, margin: 0
            }}>
              {task.titulo}
            </h2>

            {/* Properties Grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 1, background: 'var(--border-default)',
              borderRadius: 10, overflow: 'hidden',
              border: '1px solid var(--border-default)',
            }}>
              {/* Status */}
              <div style={{ background: 'var(--bg-primary)', padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Status</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusInfo.color }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: statusInfo.color }}>{statusInfo.label}</span>
                </div>
              </div>

              {/* Difficulty */}
              <div style={{ background: 'var(--bg-primary)', padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Dificuldade</div>
                <DifficultyDots value={task.dificuldade} />
              </div>

              {/* Assignee */}
              <div style={{ background: 'var(--bg-primary)', padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Responsável</div>
                {task.responsavel_id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <AssigneeAvatar name={task.responsavel_id} />
                    <span style={{ fontSize: 13 }}>{task.responsavel_id}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</span>
                )}
              </div>

              {/* Deadline */}
              <div style={{ background: 'var(--bg-primary)', padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Prazo Limite</div>
                {task.data_termino ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={13} color="var(--text-secondary)" />
                    <span style={{ fontSize: 13 }}>{formatLocalSystemDate(task.data_termino)}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>—</span>
                )}
              </div>
            </div>

            {/* Description */}
            {task.descricao && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Descrição</div>
                <div style={{
                  fontSize: 13, color: 'var(--text-secondary)',
                  lineHeight: 1.6, background: 'rgba(255,255,255,0.02)',
                  padding: '12px 14px', borderRadius: 8,
                  border: '1px solid var(--border-default)',
                  whiteSpace: 'pre-wrap'
                }}>
                  {task.descricao}
                </div>
              </div>
            )}

            {/* Subtasks Section */}
            <div>
              {/* Subtasks Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Subtarefas
                  </span>
                  {(subtarefas?.length || 0) > 0 && (
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      background: 'var(--accent-muted)', color: 'var(--accent)',
                      padding: '1px 7px', borderRadius: 20
                    }}>
                      {subtarefas?.filter(s => s.concluida).length}/{subtarefas?.length}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
                  {progresso}%
                </span>
              </div>

              {/* Progress bar */}
              {(subtarefas?.length || 0) > 0 && (
                <div style={{
                  width: '100%', height: 5,
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: 3, marginBottom: 14, overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${progresso}%`, height: '100%',
                    background: progresso === 100 ? '#10B981' : 'var(--accent)',
                    transition: 'width 0.4s ease', borderRadius: 3
                  }} />
                </div>
              )}

              {/* Subtask list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {subtarefas?.map(sub => (
                  <div
                    key={sub.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 10px', borderRadius: 8,
                      background: sub.concluida ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.02)',
                      border: '1px solid',
                      borderColor: sub.concluida ? 'rgba(16,185,129,0.15)' : 'var(--border-default)',
                      transition: 'all 0.15s ease',
                      cursor: canEdit ? 'default' : 'not-allowed',
                    }}
                  >
                    {/* Custom checkbox */}
                    <button
                      onClick={() => handleToggle(sub.id, !sub.concluida)}
                      disabled={!canEdit}
                      style={{
                        width: 18, height: 18, borderRadius: 5,
                        border: sub.concluida ? 'none' : '2px solid rgba(255,255,255,0.25)',
                        background: sub.concluida ? '#10B981' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: canEdit ? 'pointer' : 'not-allowed',
                        flexShrink: 0, padding: 0, transition: 'all 0.15s ease',
                      }}
                    >
                      {sub.concluida && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>

                    <span style={{
                      flex: 1, fontSize: 13,
                      color: sub.concluida ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: sub.concluida ? 'line-through' : 'none',
                      transition: 'all 0.2s ease',
                    }}>
                      {sub.titulo}
                    </span>

                    {canEdit && (
                      <button
                        onClick={() => handleDelete(sub.id)}
                        style={{
                          background: 'transparent', border: 'none',
                          color: 'rgba(255,255,255,0.2)', cursor: 'pointer',
                          padding: 4, borderRadius: 4, display: 'flex',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                ))}

                {/* Add subtask */}
                {canEdit && (
                  addingSubtask ? (
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <input
                        autoFocus
                        type="text"
                        className="form-input"
                        placeholder="Nome da subtarefa..."
                        value={novaSubtarefa}
                        onChange={e => setNovaSubtarefa(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{ flex: 1, fontSize: 13, padding: '8px 12px' }}
                      />
                      <button
                        onClick={handleAddSubtarefa}
                        className="btn btn-primary"
                        style={{ padding: '8px 14px', fontSize: 12 }}
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => { setNovaSubtarefa(''); setAddingSubtask(false); }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingSubtask(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 10px', marginTop: 4,
                        background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)',
                        borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer',
                        fontSize: 12, transition: 'all 0.15s ease', width: '100%'
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget.style.borderColor = 'var(--accent)';
                        e.currentTarget.style.color = 'var(--accent)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.currentTarget.style.color = 'var(--text-muted)';
                      }}
                    >
                      <Plus size={13} />
                      Adicionar subtarefa
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Participants */}
            {task.participantes_ids && task.participantes_ids.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Participantes</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {task.participantes_ids.map(pid => (
                    <AssigneeAvatar key={pid} name={pid} />
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </>
  );
}
```

**Step 2: Corrigir o syntax error do onMouseEnter no botão "Adicionar subtarefa"**

O trecho:
```tsx
onMouseEnter={e => {
  (e.currentTarget.style.borderColor = 'var(--accent)';
  e.currentTarget.style.color = 'var(--accent)';
}}
```
Deve ser:
```tsx
onMouseEnter={e => {
  e.currentTarget.style.borderColor = 'var(--accent)';
  e.currentTarget.style.color = 'var(--accent)';
}}
```

**Step 3: Verificar compilação**
```bash
cd '/Users/MarcelSgarioni/Documents/Hefesto/IDE/Antigravity/Hefesto Software/Hefesto-Software' && npx tsc --noEmit 2>&1 | head -30
```

---

## Task 4: Redesign da Aba Painel (Dashboard)

**Objetivo:** KPI cards com mais respiro e design premium, manter os charts Recharts mas com wrapper melhorado. Organizar em 2 seções claras.

**Step 1: Redesenhar os KPI cards no TAB PAINEL**

Substituir o bloco do `kpi-grid` atual por:
```tsx
{/* KPI Cards */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 8 }}>
  {[
    {
      value: pendingTasks,
      label: 'Tarefas em Andamento',
      color: '#3B82F6',
      icon: <Activity size={20} />,
    },
    {
      value: completedTasksThisMonth,
      label: 'Concluídas no Mês',
      color: '#10B981',
      icon: <CheckCircle2 size={20} />,
    },
    {
      value: `${(completedTasksThisMonth + pendingTasks) > 0 ? Math.round((completedTasksThisMonth / (completedTasksThisMonth + pendingTasks)) * 100) : 0}%`,
      label: 'Taxa de Conclusão',
      color: '#F59E0B',
      icon: <PieChart size={20} />,
    },
    {
      value: deadlineHealth['Atrasadas'],
      label: 'Tarefas Atrasadas',
      color: deadlineHealth['Atrasadas'] > 0 ? '#EF4444' : '#10B981',
      icon: <Clock size={20} />,
    },
  ].map((kpi, i) => (
    <div
      key={i}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: 12,
        padding: '20px 24px',
        display: 'flex', flexDirection: 'column', gap: 12,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Accent glow top-left */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: kpi.color, borderRadius: '12px 12px 0 0'
      }} />
      <div style={{ color: kpi.color, opacity: 0.7 }}>{kpi.icon}</div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color, lineHeight: 1 }}>
          {kpi.value}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          {kpi.label}
        </div>
      </div>
    </div>
  ))}
</div>
```

---

## Task 5: Redesign da Aba Operações (Lista de Clientes)

**Objetivo:** Cards de cliente mais ricos com indicador visual de status de tasks, melhor header de seção, e tabela de visão geral com design consistente.

**Step 1: Redesenhar os client cards na aba Operações**

Substituir o map de `activeClientsFiltered` por:
```tsx
{activeClientsFiltered.map(client => {
  const cTasks = kanbanTasks.filter(t => t.cliente_nome === client.name);
  const cOverdue = cTasks.filter(t => t.data_termino && t.data_termino < getBahiaDateString()).length;
  return (
    <div
      key={client.id}
      onClick={() => setSelectedOpsClient(client)}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: 12, padding: '16px 20px',
        cursor: 'pointer', display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
        (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
        (e.currentTarget as HTMLElement).style.background = 'var(--bg-secondary)';
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{client.name}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cTasks.length} tarefas ativas</span>
          {cOverdue > 0 && (
            <span style={{
              fontSize: 11, background: 'var(--danger-muted)',
              color: 'var(--danger)', padding: '1px 8px', borderRadius: 20, fontWeight: 500
            }}>
              {cOverdue} atrasada{cOverdue > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: cTasks.length > 0 ? 'var(--accent)' : 'var(--success)'
        }} />
        <ChevronRight size={16} color="var(--text-muted)" />
      </div>
    </div>
  );
})}
```

---

## Task 6: Ajustes de Navegação — Tab Bar Redesign

**Objetivo:** Substituir a tab bar `finance-tabs` por uma versão mais limpa e consistente com pill-style active indicator.

**Step 1: Redesenhar a barra de tabs no topo da página**

Substituir o bloco `<div className="finance-tabs" ...>` por:
```tsx
{/* Navigation Tabs */}
<div style={{
  display: 'flex', gap: 4, marginBottom: 28,
  background: 'var(--bg-secondary)',
  padding: '4px',
  borderRadius: 10,
  border: '1px solid var(--border-default)',
  width: 'fit-content',
}}>
  {([
    { key: 'painel', label: 'Painel', icon: <LayoutDashboard size={14} /> },
    { key: 'operacoes', label: 'Operações', icon: <Users size={14} /> },
    { key: 'kanban', label: 'Kanban Geral', icon: <List size={14} /> },
    { key: 'historico', label: 'Histórico', icon: <CheckCircle2 size={14} /> },
  ] as { key: typeof activeTab; label: string; icon: React.ReactNode }[]).map(tab => (
    <button
      key={tab.key}
      onClick={() => setActiveTab(tab.key)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 16px', borderRadius: 7, border: 'none',
        cursor: 'pointer', fontSize: 13, fontWeight: 500,
        transition: 'all 0.15s ease',
        background: activeTab === tab.key ? 'var(--bg-active)' : 'transparent',
        color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
        boxShadow: activeTab === tab.key ? 'var(--shadow-sm)' : 'none',
      }}
    >
      {tab.icon}
      {tab.label}
    </button>
  ))}
</div>
```

---

## Task 7: Verificação Final e Teste Manual

**Step 1: Verificar compilação TypeScript limpa**
```bash
cd '/Users/MarcelSgarioni/Documents/Hefesto/IDE/Antigravity/Hefesto Software/Hefesto-Software' && npx tsc --noEmit 2>&1
```

**Step 2: Iniciar servidor de dev e testar manualmente**
```bash
cd '/Users/MarcelSgarioni/Documents/Hefesto/IDE/Antigravity/Hefesto Software/Hefesto-Software' && pnpm dev
```

**Checklist manual de verificação:**
- [ ] Tab bar exibe corretamente as 4 abas com ícones
- [ ] Aba Painel: KPI cards com accent bar colorida no topo
- [ ] Aba Operações: cards de cliente com hover state
- [ ] Aba Operações > Cliente: Kanban por cliente com `KanbanColumn`
- [ ] Kanban Geral: 4 colunas + drop zone verde para Finalizado
- [ ] Cards mostram: client badge, título, tags, avatar, deadline colorido, bolinhas de dificuldade
- [ ] Cards com subtarefas mostram barra de progresso
- [ ] Click no card abre `TaskDetailPanel` com backdrop
- [ ] TaskDetailPanel: breadcrumb, properties grid, description, subtasks list
- [ ] Checkbox de subtarefa funciona (toggle, strikethrough, atualiza barra de progresso)
- [ ] Botão "+ Adicionar subtarefa" aparece e abre input inline
- [ ] Drag & drop ainda funciona entre colunas
- [ ] Histórico continua funcionando

**Step 3: Confirmar zero erros no console do browser**

Abrir DevTools > Console e verificar que não há erros de runtime.

---

## Notas de Implementação

### O que NÃO mudar
- Hooks: `useOperationalTasks`, `useSubtarefas`, `useTodasSubtarefas`, `useClients`, `useUsuarios`
- Mutations: `addSubtarefa`, `toggleSubtarefa`, `removeSubtarefa`, `updateOperationalTask`, `addOperationalTask`, `removeOperationalTask`
- Modais de criação/edição de tarefa (têm lógica complexa de formulário — manter como estão)
- Lógica de `confirmDeleteId`, `confirmClearHistory`
- Auto-open via `task_id` URL param

### Referência Visual ClickUp
Os principais elementos que tornam ClickUp superior:
1. **Subtask toggle com checkbox custom** (não `<input type=checkbox>` padrão)
2. **Cards ricos** com hierarquia clara: cliente > título > meta
3. **Progresso de subtarefas visível no card** (não só no painel)
4. **Cores de status consistentes** em todo o UI
5. **Drag indicator** visual no card (borda ao arrastar)
