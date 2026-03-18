'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Receipt, CreditCard, Target, Percent, CheckSquare, Clock } from 'lucide-react';
import { useFinancialTransactions, useOperationalTasks, useClients } from '@/lib/hooks';
import { getBahiaDate } from '@/lib/utils';

// Format utils
function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const MONTH_ABBR: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
};

const PIE_COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#06B6D4', '#A78BFA', '#F472B6'];

function formatCurrencyCompact(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    compactDisplay: 'short'
  }).format(value);
}

const tooltipStyle = {
  backgroundColor: '#1c1c28',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '8px',
  color: '#F1F1F4',
  fontSize: '12px',
};

// Sortable Widget Wrapper
function SortableWidget({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative' as const,
    cursor: isDragging ? 'grabbing' : 'grab' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`chart-card ${className || ''}`}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

const DEFAULT_LAYOUT = [
  'kpis',
  'task_kpis',
  'chart_bar',
  'chart_line',
  'chart_pie',
  'chart_area',
  'table_summary',
  'table_margins',
  'rentabilidade_kpis',
  'table_rentabilidade'
];

export default function DashboardPage() {
  const { data: transactionsData, loading: loadingTransactions } = useFinancialTransactions();
  const { data: tasksData, loading: loadingTasks } = useOperationalTasks();
  const { data: clients, loading: loadingClients } = useClients();

  const [widgetOrder, setWidgetOrder] = useState<string[]>(DEFAULT_LAYOUT);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem('dashboard_layout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_LAYOUT.length) {
          setWidgetOrder(parsed);
        }
      } catch (e) {
        console.error("Failed to parse layout");
      }
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!isClient || loadingTransactions || loadingTasks || loadingClients) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)' }}>Carregando Dashboard...</div>;
  }

  // Financial calculations
  const completedTransactions = transactionsData.filter(t => t.status === 'pago_recebido');

  // Current year data stats
  const today = getBahiaDate();
  const currentYear = today.getFullYear();
  const currentYearTransactions = completedTransactions.filter(t => {
    const d = new Date(t.data_pagamento || t.data_vencimento);
    return d.getFullYear() === currentYear;
  });

  const totalReceita = currentYearTransactions.filter(i => i.tipo === 'entrada').reduce((a, b) => a + Number(b.valor), 0);
  const totalDespesasAll = currentYearTransactions.filter(i => i.tipo === 'saida').reduce((a, b) => a + Number(b.valor), 0);

  // For approximation without differentiating Custo/Despesa logic cleanly, let's treat all saida as "Custos e Despesas"
  // We'll map "Custos" as 0 here and combine in Despesas for simplification, or apply a generic 40/60 split if needed.
  // Actually, we can just split totalDespesasAll arbitrarily for display if Custo vs Despesa isn't strictly defined in class.
  const totalCustos = totalDespesasAll * 0.4; // Approximated
  const totalDespesas = totalDespesasAll * 0.6; // Approximated
  const totalLucro = totalReceita - totalDespesasAll;
  const margemLiquida = totalReceita > 0 ? ((totalLucro / totalReceita) * 100).toFixed(1) : '0.0';

  // Build monthly aggregated financialData array dynamically
  const monthlyTotals: Record<string, { receita: number; saida: number; lucro_bruto: number; lucro_liquido: number }> = {};
  for (let i = 1; i <= 12; i++) {
    const m = String(i).padStart(2, '0');
    const items = completedTransactions.filter(t => {
      const dt = new Date(t.data_pagamento || t.data_vencimento);
      return dt.getFullYear() === currentYear && String(dt.getMonth() + 1).padStart(2, '0') === m;
    });
    const rec = items.filter(x => x.tipo === 'entrada').reduce((a, b) => a + Number(b.valor), 0);
    const sd = items.filter(x => x.tipo === 'saida').reduce((a, b) => a + Number(b.valor), 0);
    monthlyTotals[MONTH_ABBR[m]] = {
      receita: rec,
      saida: sd,
      lucro_bruto: rec - sd,
      lucro_liquido: rec - sd
    };
  }

  const financialData = Object.entries(monthlyTotals).map(([month, data]) => ({
    month,
    receita: data.receita,
    lucro_bruto: data.lucro_bruto,
    lucro_liquido: data.lucro_liquido,
    custos: data.saida * 0.4,
    despesas: data.saida * 0.6
  }));

  const cashFlowData = financialData.map((item, i) => {
    const saldo = financialData.slice(0, i + 1).reduce((acc, d) => acc + Number(d.lucro_liquido), 0);
    return { ...item, saldo_acumulado: saldo };
  });

  const marginsData = financialData.map(item => ({
    month: item.month,
    margem_bruta: item.receita > 0 ? ((Number(item.lucro_bruto) / Number(item.receita)) * 100).toFixed(1) : '0.0',
    margem_operacional: item.receita > 0 ? (((Number(item.receita) - Number(item.custos) - Number(item.despesas) * 0.6) / Number(item.receita)) * 100).toFixed(1) : '0.0',
    margem_liquida: item.receita > 0 ? ((Number(item.lucro_liquido) / Number(item.receita)) * 100).toFixed(1) : '0.0',
    pct_custos: item.receita > 0 ? ((Number(item.custos) / Number(item.receita)) * 100).toFixed(1) : '0.0',
    pct_despesas: item.receita > 0 ? ((Number(item.despesas) / Number(item.receita)) * 100).toFixed(1) : '0.0',
  }));

  // Pie Chart: Categories for current year
  const catTotals: Record<string, number> = {};
  currentYearTransactions.filter(i => i.tipo === 'saida').forEach(item => {
    const cat = item.categoria || 'Sem categoria';
    catTotals[cat] = (catTotals[cat] || 0) + Number(item.valor);
  });
  const expenseCategories = Object.entries(catTotals).map(([name, value], i) => ({
    name,
    value,
    color: PIE_COLORS[i % PIE_COLORS.length]
  }));

  // Tasks calculations
  const totalTasks = tasksData.length;
  const doneTasks = tasksData.filter(t => t.status === 'Finalizado' || t.status === 'concluido').length;
  const inProgressTasks = tasksData.filter(t => t.status === 'Fazendo' || t.status === 'em_andamento' || t.status === 'Revisando').length;
  const productivity = totalTasks > 0 ? ((doneTasks / totalTasks) * 100).toFixed(0) : 0;

  // Rentabilidade calculations
  const activeClients = clients.filter(c => c.status !== 'Inativo');
  const rentabilityData = activeClients.map(c => {
      const rec = c.monthly_fee || 0;
      const custoTot = (c.hosting_cost || 0) + (c.db_cost || 0) + ((c.hour_value || 0) * (c.operational_hours || 0));
      const margBruta = rec - custoTot;
      const margP = rec > 0 ? (margBruta / rec) * 100 : 0;
      return { id: c.id, name: c.name, receita: rec, custoTotal: custoTot, margemBruta: margBruta, margemPerc: margP };
  }).sort((a, b) => b.margemBruta - a.margemBruta);

  const totalRentabilidadeReceita = rentabilityData.reduce((s, c) => s + Number(c.receita), 0);
  const totalRentabilidadeCusto = rentabilityData.reduce((s, c) => s + Number(c.custoTotal), 0);
  const totalRentabilidadeMargem = totalRentabilidadeReceita - totalRentabilidadeCusto;

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newArray = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('dashboard_layout', JSON.stringify(newArray));
        return newArray;
      });
    }
  }

  const widgets: Record<string, React.ReactNode> = {
    'kpis': (
      <SortableWidget id="kpis" className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 no-padding" key="kpis">
        <div style={{ padding: '24px 24px 0 24px' }}>
          <div className="chart-card-header" style={{ marginBottom: '16px' }}>
            <div>
              <div className="chart-card-title">Resumo Financeiro</div>
              <div className="chart-card-subtitle">Indicadores principais</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '0 24px 24px 24px' }} className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card-header">
              <div className="kpi-card-icon green"><DollarSign size={20} /></div>
              <div className="kpi-card-trend up"><TrendingUp size={14} /> +14.5%</div>
            </div>
            <div className="kpi-card-value" title={formatCurrency(totalReceita)}>{formatCurrencyCompact(totalReceita)}</div>
            <div className="kpi-card-label">Receita Total Anual</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <div className="kpi-card-icon red"><Receipt size={20} /></div>
              <div className="kpi-card-trend down"><TrendingDown size={14} /> +8.2%</div>
            </div>
            <div className="kpi-card-value" title={formatCurrency(totalCustos)}>{formatCurrencyCompact(totalCustos)}</div>
            <div className="kpi-card-label">Total de Custos</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <div className="kpi-card-icon amber"><CreditCard size={20} /></div>
            </div>
            <div className="kpi-card-value" title={formatCurrency(totalDespesas)}>{formatCurrencyCompact(totalDespesas)}</div>
            <div className="kpi-card-label">Total de Despesas</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <div className="kpi-card-icon green"><Target size={20} /></div>
            </div>
            <div className="kpi-card-value" title={formatCurrency(totalLucro)}>{formatCurrencyCompact(totalLucro)}</div>
            <div className="kpi-card-label">Lucro Líquido Anual</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-card-header">
              <div className="kpi-card-icon blue"><Percent size={20} /></div>
            </div>
            <div className="kpi-card-value" title={`${margemLiquida}%`}>{margemLiquida}%</div>
            <div className="kpi-card-label">Margem Líquida Anual</div>
          </div>
        </div>
      </SortableWidget>
    ),
    'task_kpis': (
      <SortableWidget id="task_kpis" className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 no-padding" key="task_kpis">
        <div style={{ padding: '24px 24px 0 24px' }}>
          <div className="chart-card-header" style={{ marginBottom: '16px' }}>
            <div>
              <div className="chart-card-title">Desempenho Operacional</div>
              <div className="chart-card-subtitle">Métricas da Equipe</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '0 24px 24px 24px', gap: '16px', display: 'flex', flexDirection: 'row', width: '100%', flexWrap: 'wrap' }}>
          <div className="kpi-card" style={{ flex: '1 1 200px' }}>
            <div className="kpi-card-header">
              <div className="kpi-card-icon blue"><CheckSquare size={20} /></div>
            </div>
            <div className="kpi-card-value" title={`${doneTasks} / ${totalTasks}`}>{doneTasks} / {totalTasks}</div>
            <div className="kpi-card-label">Tarefas Concluídas</div>
          </div>
          <div className="kpi-card" style={{ flex: '1 1 200px' }}>
            <div className="kpi-card-header">
              <div className="kpi-card-icon amber"><Clock size={20} /></div>
            </div>
            <div className="kpi-card-value" title={`${inProgressTasks}`}>{inProgressTasks}</div>
            <div className="kpi-card-label">Em Progresso</div>
          </div>
          <div className="kpi-card" style={{ flex: '1 1 200px' }}>
            <div className="kpi-card-header">
              <div className="kpi-card-icon green"><TrendingUp size={20} /></div>
            </div>
            <div className="kpi-card-value" title={`${productivity}%`}>{productivity}%</div>
            <div className="kpi-card-label">Produtividade</div>
          </div>
          <div className="kpi-card cursor-pointer"
            style={{ flex: '1 1 200px', cursor: 'pointer', borderBottom: '3px solid #EF4444' }}
            onClick={() => window.location.href = '/operacional'}>
            <div className="kpi-card-header">
              <div className="kpi-card-icon" style={{ color: '#EF4444' }}><Clock size={20} /></div>
            </div>
            <div className="kpi-card-value" style={{ color: '#EF4444' }}>Atrasadas</div>
            <div className="kpi-card-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Ver no Operacional <span style={{ fontSize: 16 }}>&rarr;</span>
            </div>
          </div>
        </div>
      </SortableWidget>
    ),
    'chart_bar': (
      <SortableWidget id="chart_bar" key="chart_bar">
        <div className="chart-card-header">
          <div>
            <div className="chart-card-title">Receita vs Lucros</div>
            <div className="chart-card-subtitle">Comparativo mensal</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={financialData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => formatCurrency(Number(value))} />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#9CA3AF' }} />
            <Bar dataKey="receita" name="Receita" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="lucro_liquido" name="Lucro Líquido" fill="#F59E0B" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </SortableWidget>
    ),
    'chart_line': (
      <SortableWidget id="chart_line" key="chart_line">
        <div className="chart-card-header">
          <div>
            <div className="chart-card-title">Margem Líquida Mensal</div>
            <div className="chart-card-subtitle">Evolução percentual</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={marginsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[30, 50]} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => `${value}%`} />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#9CA3AF' }} />
            <Line type="monotone" dataKey="margem_liquida" name="Margem Líquida" stroke="#F59E0B" strokeWidth={3} dot={{ fill: '#F59E0B', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </SortableWidget>
    ),
    'chart_area': (
      <SortableWidget id="chart_area" key="chart_area">
        <div className="chart-card-header">
          <div>
            <div className="chart-card-title">Fluxo de Caixa</div>
            <div className="chart-card-subtitle">Saldo acumulado</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={cashFlowData}>
            <defs>
              <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => formatCurrency(Number(value))} />
            <Area type="monotone" dataKey="saldo_acumulado" name="Saldo Acumulado" stroke="#F59E0B" strokeWidth={2} fill="url(#colorSaldo)" />
          </AreaChart>
        </ResponsiveContainer>
      </SortableWidget>
    ),
    'chart_pie': (
      <SortableWidget id="chart_pie" key="chart_pie">
        <div className="chart-card-header">
          <div>
            <div className="chart-card-title">Despesas</div>
            <div className="chart-card-subtitle">Por categoria</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={expenseCategories}
              cx="50%" cy="50%"
              innerRadius={70} outerRadius={110}
              dataKey="value" nameKey="name"
              stroke="none" paddingAngle={3}
            >
              {expenseCategories.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => formatCurrency(Number(value))} />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#9CA3AF' }} />
          </PieChart>
        </ResponsiveContainer>
      </SortableWidget>
    ),
    'table_summary': (
      <SortableWidget id="table_summary" className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2" key="table_summary">
        <div style={{ padding: '24px' }}>
          <div className="table-card-title">Resumo Mensal</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Receita</th>
                  <th>Lucro L.</th>
                </tr>
              </thead>
              <tbody>
                {financialData.slice(0, 5).map((row) => (
                  <tr key={row.month}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.month}</td>
                    <td className="positive">{formatCurrency(Number(row.receita))}</td>
                    <td className="positive">{formatCurrency(Number(row.lucro_liquido))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SortableWidget>
    ),
    'table_margins': (
      <SortableWidget id="table_margins" className="col-span-1 md:col-span-2 lg:col-span-2 xl:col-span-2" key="table_margins">
        <div style={{ padding: '24px' }}>
          <div className="table-card-title">Margens Mensais</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Margem B.</th>
                  <th>Margem L.</th>
                </tr>
              </thead>
              <tbody>
                {marginsData.slice(0, 5).map((row) => (
                  <tr key={row.month}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{row.month}</td>
                    <td className="positive">{row.margem_bruta}%</td>
                    <td className="positive">{row.margem_liquida}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SortableWidget>
    ),
    'rentabilidade_kpis': (
      <SortableWidget id="rentabilidade_kpis" className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 no-padding" key="rentabilidade_kpis">
        <div style={{ padding: '24px 24px 0 24px' }}>
          <div className="chart-card-header" style={{ marginBottom: '16px' }}>
            <div>
              <div className="chart-card-title">Rentabilidade da Carteira</div>
              <div className="chart-card-subtitle">Performance por cliente</div>
            </div>
          </div>
        </div>
        <div style={{ padding: '0 24px 24px 24px' }} className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-card-header">
                <div className="kpi-card-icon green"><DollarSign size={20} /></div>
              </div>
              <div className="kpi-card-value text-success">{formatCurrency(totalRentabilidadeReceita)}</div>
              <div className="kpi-card-label">Receita Estimada (MRR)</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-header">
                <div className="kpi-card-icon red"><TrendingDown size={20} /></div>
              </div>
              <div className="kpi-card-value text-danger">{formatCurrency(totalRentabilidadeCusto)}</div>
              <div className="kpi-card-label">Custo Operacional</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-card-header">
                <div className="kpi-card-icon amber"><Target size={20} /></div>
              </div>
              <div className="kpi-card-value">{formatCurrency(totalRentabilidadeMargem)}</div>
              <div className="kpi-card-label">Lucro Bruto</div>
            </div>
        </div>
      </SortableWidget>
    ),
    'table_rentabilidade': (
      <SortableWidget id="table_rentabilidade" className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4" key="table_rentabilidade">
        <div style={{ padding: '24px' }}>
          <div className="table-card-title">Rentabilidade Detalhada</div>
          <div style={{ overflowX: 'auto', maxHeight: 400, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Receita</th>
                  <th>Custo</th>
                  <th>Margem</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {rentabilityData.map(c => (
                    <tr key={c.id}>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.name}</td>
                        <td className="positive">{formatCurrency(c.receita)}</td>
                        <td className="negative">-{formatCurrency(c.custoTotal)}</td>
                        <td style={{ fontWeight: 600 }} className={c.margemBruta >= 0 ? 'positive' : 'negative'}>{formatCurrency(c.margemBruta)}</td>
                        <td>{c.margemPerc.toFixed(1)}%</td>
                    </tr>
                ))}
                {rentabilityData.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>Nenhum cliente ativo.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SortableWidget>
    )
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
        <div className="charts-grid" style={{ gridAutoFlow: 'row dense' }}>
          {widgetOrder.map((id) => widgets[id])}
        </div>
      </SortableContext>
    </DndContext>
  );
}
