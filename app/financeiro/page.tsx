'use client';

import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from 'recharts';
import { Plus, Download, Filter, ArrowUpCircle, ArrowDownCircle, Pencil, Trash2, X, Check, CheckCircle, Clock, AlertTriangle, XCircle, CalendarClock, TrendingUp, TrendingDown, FileDown, Sparkles } from 'lucide-react';
import {
    useGoals,
    useFinancialTypes, useFinancialCategories,
    useBudgetPlan,
    addGoal, updateGoal, removeGoal,
    addBudgetPlanItem, updateBudgetPlanItem, removeBudgetPlanItem,
    useFinancialTransactions, addFinancialTransaction, updateFinancialTransaction, removeFinancialTransaction
} from '@/lib/hooks';
import { formatCurrencyInput, parseCurrencyInput } from '@/lib/utils';
import type { FinancialGoal, FinancialTransaction } from '@/lib/types';

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const tooltipStyle = {
    backgroundColor: '#1c1c28',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px',
    color: '#F1F1F4',
    fontSize: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
};
const tooltipLabelStyle = { color: '#F1F1F4', fontWeight: 600 };
const tooltipItemStyle = { color: '#D1D5DB' };

const MONTH_ORDER: [string, string][] = [
    ['01', 'Janeiro'], ['02', 'Fevereiro'], ['03', 'Março'], ['04', 'Abril'],
    ['05', 'Maio'], ['06', 'Junho'], ['07', 'Julho'], ['08', 'Agosto'],
    ['09', 'Setembro'], ['10', 'Outubro'], ['11', 'Novembro'], ['12', 'Dezembro']
];

const MONTH_ABBR: Record<string, string> = {
    '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
    '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
    '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
};

const PIE_COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#06B6D4', '#A78BFA', '#F472B6'];

type Tab = 'painel' | 'movimentacoes' | 'planejamento';
type SubTabMovimentacoes = 'pendentes' | 'fluxo' | 'historico';
type SubTabPlanejamento = 'dre' | 'metas';
import { getBahiaDate, getBahiaDateString } from '@/lib/utils';

export default function FinanceiroPage() {
    const [activeTab, setActiveTab] = useState<Tab>('painel');
    const [activeSubTabMovimentacoes, setActiveSubTabMovimentacoes] = useState<SubTabMovimentacoes>('pendentes');
    const [activeSubTabPlanejamento, setActiveSubTabPlanejamento] = useState<SubTabPlanejamento>('dre');
    const { data: transactionsData, loading: loadingTransactions, setData: setTransactionsData } = useFinancialTransactions();
    const { data: goalsData, loading: loadingGoals } = useGoals();
    const { data: dbTypes, loading: loadingTypes } = useFinancialTypes();
    const { data: dbCategories, loading: loadingCategories } = useFinancialCategories();
    const { data: budgetPlanData, loading: loadingBudget } = useBudgetPlan();

    const [goals, setGoals] = useState<FinancialGoal[]>([]);
    const [budgetPlan, setBudgetPlan] = useState<any[]>([]);

    useEffect(() => { if (goalsData.length) setGoals(goalsData); }, [goalsData]);
    useEffect(() => { if (budgetPlanData.length) setBudgetPlan(budgetPlanData); }, [budgetPlanData]);

    // Dashboard filters
    const [dashMonth, setDashMonth] = useState<string>('todos');
    const [dashYear, setDashYear] = useState<string>('todos');
    const [dashCategoria, setDashCategoria] = useState<string>('todos');

    // Filters for the lancamentos table
    const [filterMonth, setFilterMonth] = useState<string>('todos');
    const [filterYear, setFilterYear] = useState<string>('todos');
    const [filterType, setFilterType] = useState<string>('todos');
    const [filterClassificacao, setFilterClassificacao] = useState<string>('todos');

    // Fluxo de Caixa filters
    const [fluxoMonth, setFluxoMonth] = useState<string>('todos');
    const [fluxoYear, setFluxoYear] = useState<string>('todos');

    // Modal state
    type TransactionModalState = { type: 'add' } | { type: 'edit'; transaction: FinancialTransaction } | null;
    const [transactionModal, setTransactionModal] = useState<TransactionModalState>(null);

    // Form state for Modal
    const [formTipo, setFormTipo] = useState<'entrada' | 'saida'>('saida');
    const [formStatus, setFormStatus] = useState<'pendente' | 'pago_recebido'>('pago_recebido');
    const [formClassificacao, setFormClassificacao] = useState<string>('');
    const [formCategoria, setFormCategoria] = useState<string>('');
    const [formDescricao, setFormDescricao] = useState('');
    const [formValorDisplay, setFormValorDisplay] = useState('');
    const [formDateVencimento, setFormDateVencimento] = useState(getBahiaDateString());
    const [formDatePagamento, setFormDatePagamento] = useState<string>('');
    const [formSaving, setFormSaving] = useState(false);

    function openAddTransaction() {
        setFormTipo('saida');
        setFormStatus('pago_recebido');
        setFormClassificacao('');
        setFormCategoria('');
        setFormDescricao('');
        setFormValorDisplay('');
        setFormDateVencimento(getBahiaDateString());
        setFormDatePagamento(getBahiaDateString());
        setTransactionModal({ type: 'add' });
    }

    function openEditTransaction(t: FinancialTransaction) {
        setFormTipo(t.tipo);
        setFormStatus(t.status as 'pendente' | 'pago_recebido');
        setFormClassificacao(t.classificacao || '');
        setFormCategoria(t.categoria || '');
        setFormDescricao(t.descricao);
        setFormValorDisplay(formatCurrency(Number(t.valor)).replace('R$', '').trim());
        setFormDateVencimento(t.data_vencimento ? t.data_vencimento.split('T')[0] : '');
        setFormDatePagamento(t.data_pagamento ? t.data_pagamento.split('T')[0] : '');
        setTransactionModal({ type: 'edit', transaction: t });
    }

    function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFormValorDisplay(formatCurrencyInput(e.target.value));
    }

    function parseValorDisplay(display: string): number {
        return parseCurrencyInput(display);
    }

    async function handleSaveTransaction() {
        if (!formDescricao.trim() || !formValorDisplay) return;
        setFormSaving(true);
        try {
            const valor = parseValorDisplay(formValorDisplay);

            const itemData: Omit<FinancialTransaction, 'id' | 'created_at'> = {
                descricao: formDescricao.trim(),
                tipo: formTipo,
                valor,
                data_vencimento: formDateVencimento,
                data_pagamento: formStatus === 'pago_recebido' ? (formDatePagamento || formDateVencimento) : null,
                status: formStatus,
                classificacao: formClassificacao,
                categoria: formCategoria,
                recorrencia: 'nenhuma'
            };

            if (transactionModal?.type === 'add') {
                const added = await addFinancialTransaction(itemData);
                setTransactionsData([...transactionsData, added].sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()));
            } else if (transactionModal?.type === 'edit') {
                const updated = await updateFinancialTransaction(transactionModal.transaction.id, itemData);
                setTransactionsData(transactionsData.map(t => t.id === updated.id ? updated : t).sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime()));
            }

            setTransactionModal(null);
        } catch (e) {
            console.error(e);
        }
        setFormSaving(false);
    }

    async function handleDeleteTransaction(id: string) {
        try {
            await removeFinancialTransaction(id);
            setTransactionsData(transactionsData.filter(item => item.id !== id));
        } catch (e) { console.error(e); }
    }

    if (loadingTransactions || loadingGoals || loadingTypes || loadingCategories || loadingBudget) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)' }}>Carregando...</div>;
    }

    // Determine the relevant date to use (payment date if paid, due date if pending)
    const getEffectiveDate = (t: FinancialTransaction) => t.status === 'pago_recebido' && t.data_pagamento ? t.data_pagamento : t.data_vencimento;

    // Helper: get unique years from transactions
    const uniqueYears = Array.from(new Set(transactionsData.map(item => String(new Date(getEffectiveDate(item)).getFullYear())))).sort();

    // Helper: get unique classificações from transactions
    const uniqueClassificacoes = Array.from(new Set(transactionsData.map(item => item.classificacao).filter(Boolean))).sort();

    // Helper: filter completed transactions (pago_recebido) by month/year
    const completedTransactions = transactionsData.filter(t => t.status === 'pago_recebido');

    function filterCompletedTransactions(data: FinancialTransaction[], month: string, year: string) {
        return data.filter(item => {
            const dateStr = item.data_pagamento || item.data_vencimento;
            const d = new Date(dateStr);
            const itemMonth = String(d.getMonth() + 1).padStart(2, '0');
            const itemYear = String(d.getFullYear());
            if (month !== 'todos' && itemMonth !== month) return false;
            if (year !== 'todos' && itemYear !== year) return false;
            return true;
        });
    }

    // Computed stats: DRE from completed transactions
    const totalReceitaDRE = completedTransactions.filter(i => i.tipo === 'entrada').reduce((a, b) => a + Number(b.valor), 0);
    const totalDespesasDRE = completedTransactions.filter(i => i.tipo === 'saida').reduce((a, b) => a + Number(b.valor), 0);
    const lucroBrutoDRE = totalReceitaDRE - totalDespesasDRE;

    // Group expenses by classificação for DRE
    const despesasByClass: Record<string, number> = {};
    completedTransactions.filter(i => i.tipo === 'saida').forEach(item => {
        const key = item.classificacao || 'Outros';
        despesasByClass[key] = (despesasByClass[key] || 0) + Number(item.valor);
    });

    const tabs: { key: Tab; label: string }[] = [
        { key: 'painel', label: 'Painel' },
        { key: 'movimentacoes', label: 'Movimentações' },
        { key: 'planejamento', label: 'Planejamento' },
    ];

    return (
        <>
            <div className="finance-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`finance-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ====== ABA PAINEL ====== */}
            {activeTab === 'painel' && (() => {
                // Apply category filter on top of period filter
                let filteredDashFlow = filterCompletedTransactions(completedTransactions, dashMonth, dashYear);
                if (dashCategoria !== 'todos') {
                    filteredDashFlow = filteredDashFlow.filter(i => i.categoria === dashCategoria);
                }

                const totalReceita = filteredDashFlow.filter(i => i.tipo === 'entrada').reduce((a, b) => a + Number(b.valor), 0);
                const totalDespesas = filteredDashFlow.filter(i => i.tipo === 'saida').reduce((a, b) => a + Number(b.valor), 0);
                const totalLucro = totalReceita - totalDespesas;
                const margem = totalReceita > 0 ? ((totalLucro / totalReceita) * 100) : 0;

                // ---------- Previous period for trend ----------
                function getPreviousPeriodFlow() {
                    if (dashMonth !== 'todos' && dashYear !== 'todos') {
                        let pm = parseInt(dashMonth) - 1;
                        let py = parseInt(dashYear);
                        if (pm < 1) { pm = 12; py -= 1; }
                        const pmStr = String(pm).padStart(2, '0');
                        let prev = filterCompletedTransactions(completedTransactions, pmStr, String(py));
                        if (dashCategoria !== 'todos') prev = prev.filter(i => i.categoria === dashCategoria);
                        return prev;
                    }
                    return [];
                }
                const prevFlow = getPreviousPeriodFlow();
                const prevReceita = prevFlow.filter(i => i.tipo === 'entrada').reduce((a, b) => a + Number(b.valor), 0);
                const prevDespesas = prevFlow.filter(i => i.tipo === 'saida').reduce((a, b) => a + Number(b.valor), 0);
                const prevLucro = prevReceita - prevDespesas;
                const prevMargem = prevReceita > 0 ? ((prevLucro / prevReceita) * 100) : 0;
                const hasPrev = prevFlow.length > 0;

                function calcDelta(curr: number, prev: number) {
                    if (prev === 0) return curr > 0 ? 100 : curr < 0 ? -100 : 0;
                    return ((curr - prev) / Math.abs(prev)) * 100;
                }

                // ---------- Sparkline data: last 6 months ----------
                function getMonthlyTotals(tipo: 'entrada' | 'saida' | 'all') {
                    const totals: { month: string; valor: number }[] = [];
                    const now = getBahiaDate();
                    for (let i = 5; i >= 0; i--) {
                        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                        const m = String(d.getMonth() + 1).padStart(2, '0');
                        const y = String(d.getFullYear());
                        let items = filterCompletedTransactions(completedTransactions, m, y);
                        if (tipo !== 'all') items = items.filter(x => x.tipo === tipo);
                        const total = items.reduce((a, b) => a + Number(b.valor), 0);
                        totals.push({ month: MONTH_ABBR[m] || m, valor: total });
                    }
                    return totals;
                }
                const sparkReceita = getMonthlyTotals('entrada');
                const sparkDespesas = getMonthlyTotals('saida');
                const sparkLucro = getMonthlyTotals('all').map((_, i) => ({
                    month: sparkReceita[i].month,
                    valor: sparkReceita[i].valor - sparkDespesas[i].valor,
                }));
                const sparkMargem = sparkReceita.map((r, i) => ({
                    month: r.month,
                    valor: r.valor > 0 ? ((r.valor - sparkDespesas[i].valor) / r.valor) * 100 : 0,
                }));

                function TrendBadge({ delta, hasPrev: hp }: { delta: number; hasPrev: boolean }) {
                    if (!hp) return null;
                    const isUp = delta > 0;
                    const cls = delta === 0 ? 'neutral' : isUp ? 'up' : 'down';
                    return (
                        <span className={`kpi-trend ${cls}`}>
                            {isUp ? <TrendingUp size={11} /> : delta < 0 ? <TrendingDown size={11} /> : null}
                            {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                        </span>
                    );
                }

                function MiniSparkline({ data, color }: { data: { month: string; valor: number }[]; color: string }) {
                    const values = data.map(d => d.valor);
                    const max = Math.max(...values, 1);
                    const min = Math.min(...values, 0);
                    const range = max - min || 1;
                    const w = 120;
                    const h = 28;
                    const points = values.map((v, i) => {
                        const x = (i / Math.max(values.length - 1, 1)) * w;
                        const y = h - ((v - min) / range) * (h - 4) - 2;
                        return `${x},${y}`;
                    }).join(' ');
                    return (
                        <div style={{ width: '100%', height: 32, marginTop: 8, display: 'flex', alignItems: 'center' }}>
                            <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
                                <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
                            </svg>
                        </div>
                    );
                }

                // ---------- New indicators ----------
                const today = getBahiaDateString();
                const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                const pendingTransactions = transactionsData.filter(t => t.status === 'pendente');

                const vencidosCount = pendingTransactions.filter(t => t.data_vencimento < today).length;

                const inadimplencia = pendingTransactions
                    .filter(a => a.tipo === 'entrada' && a.data_vencimento < today)
                    .reduce((s, a) => s + Number(a.valor), 0);

                const contasPagar30d = pendingTransactions
                    .filter(a => a.tipo === 'saida' && a.data_vencimento >= today && a.data_vencimento <= in30days)
                    .reduce((s, a) => s + Number(a.valor), 0);

                const filterA_receber_pendente = pendingTransactions
                    .filter(a => a.tipo === 'entrada')
                    .reduce((s, a) => s + Number(a.valor), 0);

                const filterA_pagar_pendente = pendingTransactions
                    .filter(a => a.tipo === 'saida')
                    .reduce((s, a) => s + Number(a.valor), 0);

                const entradasCount = filteredDashFlow.filter(i => i.tipo === 'entrada').length;
                const ticketMedio = entradasCount > 0 ? totalReceita / entradasCount : 0;

                // Burn rate: avg monthly expenses last 3 months
                const burnMonths: number[] = [];
                const nowDate = getBahiaDate();
                for (let i = 0; i < 3; i++) {
                    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1);
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const y = String(d.getFullYear());
                    const items = filterCompletedTransactions(completedTransactions, m, y).filter(x => x.tipo === 'saida');
                    burnMonths.push(items.reduce((a, b) => a + Number(b.valor), 0));
                }
                const burnRate = burnMonths.reduce((a, b) => a + b, 0) / Math.max(burnMonths.filter(v => v > 0).length, 1);

                // ---------- Donut chart data ----------
                const categoriaTotals: Record<string, number> = {};
                filteredDashFlow.filter(i => i.tipo === 'saida').forEach(item => {
                    const cat = item.categoria || 'Sem categoria';
                    categoriaTotals[cat] = (categoriaTotals[cat] || 0) + Number(item.valor);
                });
                const pieData = Object.entries(categoriaTotals)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value);
                const totalPieValue = pieData.reduce((s, p) => s + p.value, 0);

                // ---------- Area chart data ----------
                const monthTotals: Record<string, { receita: number; despesas: number }> = {};
                // Use ALL cash flow (not just filtered) for the monthly chart
                completedTransactions.forEach(item => {
                    const dateStr = item.data_pagamento || item.data_vencimento;
                    const d = new Date(dateStr);
                    const monthKey = String(d.getMonth() + 1).padStart(2, '0');
                    const abbr = MONTH_ABBR[monthKey] || monthKey;
                    if (!monthTotals[abbr]) monthTotals[abbr] = { receita: 0, despesas: 0 };
                    if (item.tipo === 'entrada') monthTotals[abbr].receita += Number(item.valor);
                    else monthTotals[abbr].despesas += Number(item.valor);
                });
                const areaChartData = MONTH_ORDER
                    .map(([key]) => {
                        const abbr = MONTH_ABBR[key];
                        if (monthTotals[abbr]) return { month: abbr, ...monthTotals[abbr] };
                        return null;
                    })
                    .filter(Boolean);

                // ---------- Smart summary ----------
                const deltaReceita = calcDelta(totalReceita, prevReceita);
                const deltaDespesas = calcDelta(totalDespesas, prevDespesas);

                // ---------- CSV export ----------
                function handleExportCSV() {
                    const headers = ['Data', 'Descrição', 'Tipo', 'Categoria', 'Valor'];
                    const rows = filteredDashFlow.map(item => [
                        item.data_pagamento || item.data_vencimento,
                        item.descricao,
                        item.tipo === 'entrada' ? 'Receita' : 'Despesa',
                        item.categoria || '',
                        Number(item.valor).toFixed(2),
                    ]);
                    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
                    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `relatorio_financeiro_${getBahiaDateString()}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                }

                // All unique categories for filter
                const allCategories = Array.from(new Set(completedTransactions.map(i => i.categoria).filter(Boolean))).sort();

                return (
                    <>
                        {/* Header: Filters + Export */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'nowrap', overflowX: 'auto' }}>
                                <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                                <select className="form-select" style={{ minWidth: 120, width: 'auto', fontSize: 13, padding: '4px 8px', background: 'transparent', border: 'none' }} value={dashMonth} onChange={e => setDashMonth(e.target.value)}>
                                    <option value="todos">Todos os meses</option>
                                    {MONTH_ORDER.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                </select>
                                <select className="form-select" style={{ minWidth: 100, width: 'auto', fontSize: 13, padding: '4px 8px', background: 'transparent', border: 'none' }} value={dashYear} onChange={e => setDashYear(e.target.value)}>
                                    <option value="todos">Todos os anos</option>
                                    {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <select className="form-select" style={{ minWidth: 130, width: 'auto', fontSize: 13, padding: '4px 8px', background: 'transparent', border: 'none' }} value={dashCategoria} onChange={e => setDashCategoria(e.target.value)}>
                                    <option value="todos">Todas categorias</option>
                                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <button className="btn btn-secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <FileDown size={14} /> Exportar CSV
                            </button>
                        </div>

                        {/* Smart Summary */}
                        {hasPrev && (
                            <div className="smart-summary">
                                <Sparkles size={14} style={{ marginRight: 6, color: 'var(--accent)', verticalAlign: 'middle' }} />
                                {deltaDespesas > 0
                                    ? <>Este mês suas <strong>despesas aumentaram</strong> <span className="highlight-down">{Math.abs(deltaDespesas).toFixed(0)}%</span> em relação ao anterior.</>
                                    : deltaDespesas < 0
                                        ? <>Este mês suas <strong>despesas diminuíram</strong> <span className="highlight-up">{Math.abs(deltaDespesas).toFixed(0)}%</span> em relação ao anterior.</>
                                        : <>Suas <strong>despesas se mantiveram estáveis</strong> neste mês.</>
                                }
                                {' '}
                                {deltaReceita > 0
                                    ? <>A <strong>receita cresceu</strong> <span className="highlight-up">{Math.abs(deltaReceita).toFixed(0)}%</span>.</>
                                    : deltaReceita < 0
                                        ? <>A <strong>receita caiu</strong> <span className="highlight-down">{Math.abs(deltaReceita).toFixed(0)}%</span>.</>
                                        : <>A <strong>receita se manteve estável</strong>.</>
                                }
                            </div>
                        )}

                        {/* KPIs Row 1 — Main */}
                        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 16 }}>
                            <div className="kpi-card">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div className="kpi-card-value" style={{ color: 'var(--success)' }}>{formatCurrency(totalReceita)}</div>
                                    <TrendBadge delta={calcDelta(totalReceita, prevReceita)} hasPrev={hasPrev} />
                                </div>
                                <div className="kpi-card-label">Receita Total</div>
                                <MiniSparkline data={sparkReceita} color="#10B981" />
                            </div>
                            <div className="kpi-card">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div className="kpi-card-value" style={{ color: 'var(--danger)' }}>{formatCurrency(totalDespesas)}</div>
                                    <TrendBadge delta={calcDelta(totalDespesas, prevDespesas)} hasPrev={hasPrev} />
                                </div>
                                <div className="kpi-card-label">Despesas Totais</div>
                                <MiniSparkline data={sparkDespesas} color="#EF4444" />
                            </div>
                            <div className="kpi-card">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div className="kpi-card-value" style={{ color: totalLucro >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(totalLucro)}</div>
                                    <TrendBadge delta={calcDelta(totalLucro, prevLucro)} hasPrev={hasPrev} />
                                </div>
                                <div className="kpi-card-label">Lucro Líquido</div>
                                <MiniSparkline data={sparkLucro} color="#8B5CF6" />
                            </div>
                            <div className={`kpi-card${margem < 0 ? ' kpi-card-alert' : ''}`}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div className="kpi-card-value" style={{ color: margem >= 0 ? '#10B981' : 'var(--danger)' }}>{margem.toFixed(1)}%</div>
                                    {hasPrev && <TrendBadge delta={margem - prevMargem} hasPrev={hasPrev} />}
                                </div>
                                <div className="kpi-card-label">Margem Líquida</div>
                                <MiniSparkline data={sparkMargem} color={margem >= 0 ? '#10B981' : '#EF4444'} />
                            </div>
                        </div>

                        {/* KPIs Row 2 — New Indicators */}
                        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 24 }}>
                            <div className={`kpi-card${inadimplencia > 0 ? ' kpi-card-alert' : ''}`}>
                                <div className="kpi-card-value" style={{ color: inadimplencia > 0 ? 'var(--danger)' : 'var(--success)' }}>{formatCurrency(inadimplencia)}</div>
                                <div className="kpi-card-label">Inadimplência (Entradas Vencidas)</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-card-value" style={{ color: filterA_receber_pendente > 0 ? 'var(--info)' : 'var(--success)' }}>{formatCurrency(filterA_receber_pendente)}</div>
                                <div className="kpi-card-label">A Receber (pendente)</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-card-value" style={{ color: filterA_pagar_pendente > 0 ? 'var(--warning)' : 'var(--success)' }}>{formatCurrency(filterA_pagar_pendente)}</div>
                                <div className="kpi-card-label">A Pagar (pendente)</div>
                            </div>
                            <div className={`kpi-card${vencidosCount > 0 ? ' kpi-card-alert' : ''}`}>
                                <div className="kpi-card-value" style={{ color: vencidosCount > 0 ? 'var(--danger)' : 'var(--success)' }}>{vencidosCount}</div>
                                <div className="kpi-card-label">Vencidos</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-card-value" style={{ color: '#A78BFA' }}>{formatCurrency(burnRate)}</div>
                                <div className="kpi-card-label">Burn Rate / mês</div>
                            </div>
                        </div>

                        {/* Charts side by side */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                            {/* Donut: Expenses by Category */}
                            <div className="chart-card">
                                <div className="chart-card-header">
                                    <div>
                                        <div className="chart-card-title">Despesas por Categoria</div>
                                        <div className="chart-card-subtitle">Distribuição percentual</div>
                                    </div>
                                </div>
                                {pieData.length === 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)', fontSize: 14 }}>
                                        Nenhuma despesa encontrada.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                        <div style={{ flex: '0 0 220px' }}>
                                            <ResponsiveContainer width={220} height={220}>
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        cx="50%" cy="50%"
                                                        innerRadius={60} outerRadius={95}
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                        stroke="none"
                                                    >
                                                        {pieData.map((_, idx) => (
                                                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={tooltipStyle} formatter={(value: any) => formatCurrency(Number(value))} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="donut-legend" style={{ flex: 1 }}>
                                            {pieData.map((item, idx) => (
                                                <div key={item.name} className="donut-legend-item">
                                                    <span className="donut-legend-dot" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                                    <span>{item.name}</span>
                                                    <span className="donut-legend-value">
                                                        {totalPieValue > 0 ? ((item.value / totalPieValue) * 100).toFixed(0) : 0}% · {formatCurrency(item.value)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Area: Receita vs Despesas */}
                            <div className="chart-card">
                                <div className="chart-card-header">
                                    <div>
                                        <div className="chart-card-title">Receita vs Despesas</div>
                                        <div className="chart-card-subtitle">Evolução mensal</div>
                                    </div>
                                </div>
                                {areaChartData.length === 0 ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)', fontSize: 14 }}>
                                        Nenhum dado encontrado.
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={280}>
                                        <AreaChart data={areaChartData}>
                                            <defs>
                                                <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                            <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} formatter={(value: any) => formatCurrency(Number(value))} />
                                            <Area type="monotone" dataKey="receita" name="Receita" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#gradReceita)" />
                                            <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#gradDespesas)" />
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </>
                );
            })()}

            {/* ====== ABA MOVIMENTAÇÕES ====== */}
            {activeTab === 'movimentacoes' && (
                <>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 24, padding: 4, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', width: 'fit-content' }}>
                        <button
                            onClick={() => setActiveSubTabMovimentacoes('pendentes')}
                            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all 0.2s', background: activeSubTabMovimentacoes === 'pendentes' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeSubTabMovimentacoes === 'pendentes' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                        >
                            Lançamentos futuros
                        </button>
                        <button
                            onClick={() => setActiveSubTabMovimentacoes('historico')}
                            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all 0.2s', background: activeSubTabMovimentacoes === 'historico' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeSubTabMovimentacoes === 'historico' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                        >
                            Concluídos
                        </button>
                        <button
                            onClick={() => setActiveSubTabMovimentacoes('fluxo')}
                            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all 0.2s', background: activeSubTabMovimentacoes === 'fluxo' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeSubTabMovimentacoes === 'fluxo' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                        >
                            Fluxo de Caixa
                        </button>
                    </div>

                    {/* --- Sub-Aba Pendentes --- */}
                    {activeSubTabMovimentacoes === 'pendentes' && (() => {
                        const filteredCashFlow = transactionsData.filter(item => {
                            if (item.status === 'pago_recebido') return false;
                            const d = new Date(item.data_vencimento);
                            const itemMonth = String(d.getMonth() + 1).padStart(2, '0');
                            const itemYear = String(d.getFullYear());
                            if (filterMonth !== 'todos' && itemMonth !== filterMonth) return false;
                            if (filterYear !== 'todos' && itemYear !== filterYear) return false;
                            if (filterType !== 'todos' && item.tipo !== filterType) return false;
                            if (filterClassificacao !== 'todos' && item.classificacao !== filterClassificacao) return false;
                            return true;
                        }).sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());

                        return (
                            <>
                                {/* Form */}
                                {/* Form */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                                    <button className="btn btn-primary" onClick={openAddTransaction} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Plus size={16} />
                                        Nova Movimentação
                                    </button>
                                </div>

                                {/* Table with filters */}
                                <div className="table-card">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                        <div className="table-card-title" style={{ marginBottom: 0 }}>Lançamentos</div>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto', background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                                            <select
                                                className="form-select"
                                                style={{ minWidth: 130, width: 'auto', fontSize: 13, padding: '4px 8px', background: 'transparent', border: 'none' }}
                                                value={filterMonth}
                                                onChange={e => setFilterMonth(e.target.value)}
                                            >
                                                <option value="todos">Todos os meses</option>
                                                {MONTH_ORDER.map(([key, label]) => (
                                                    <option key={key} value={key}>{label}</option>
                                                ))}
                                            </select>
                                            <select
                                                className="form-select"
                                                style={{ minWidth: 100, width: 'auto', fontSize: 13, padding: '4px 8px', background: 'transparent', border: 'none' }}
                                                value={filterYear}
                                                onChange={e => setFilterYear(e.target.value)}
                                            >
                                                <option value="todos">Todos os anos</option>
                                                {uniqueYears.map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                            <select
                                                className="form-select"
                                                style={{ minWidth: 130, width: 'auto', fontSize: 13, padding: '4px 8px', background: 'transparent', border: 'none' }}
                                                value={filterType}
                                                onChange={e => setFilterType(e.target.value)}
                                            >
                                                <option value="todos">Todos os fluxos</option>
                                                <option value="entrada">Entradas</option>
                                                <option value="saida">Saídas</option>
                                            </select>
                                            <select
                                                className="form-select"
                                                style={{ minWidth: 150, width: 'auto', fontSize: 13, padding: '4px 8px', background: 'transparent', border: 'none' }}
                                                value={filterClassificacao}
                                                onChange={e => setFilterClassificacao(e.target.value)}
                                            >
                                                <option value="todos">Todas classificações</option>
                                                {uniqueClassificacoes.map(c => (
                                                    <option key={c} value={c}>{c}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Descrição</th>
                                                <th>Classificação</th>
                                                <th>Categoria</th>
                                                <th>Fluxo</th>
                                                <th>Valor</th>
                                                <th style={{ width: 50 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredCashFlow.length === 0 && (
                                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>Nenhum lançamento encontrado para os filtros selecionados.</td></tr>
                                            )}
                                            {filteredCashFlow.map((item) => (
                                                <tr key={item.id}>
                                                    <td>{new Date(item.data_vencimento).toLocaleDateString('pt-BR')}</td>
                                                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.descricao}</td>
                                                    <td>
                                                        {item.classificacao ? (
                                                            <span style={{
                                                                fontSize: 12, padding: '3px 10px', borderRadius: 6,
                                                                background: 'rgba(139, 92, 246, 0.1)', color: '#A78BFA',
                                                                fontWeight: 500
                                                            }}>
                                                                {item.classificacao}
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                    <td>{item.categoria || '—'}</td>
                                                    <td>
                                                        <span style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                                            color: item.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)',
                                                            fontWeight: 600
                                                        }}>
                                                            {item.tipo === 'entrada' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                                                            {item.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                                                        </span>
                                                    </td>
                                                    <td className={item.tipo === 'entrada' ? 'positive' : 'negative'}>
                                                        {item.tipo === 'entrada' ? '+' : '-'}{formatCurrency(Number(item.valor))}
                                                    </td>
                                                    <td>
                                                        <button className="settings-action-btn" onClick={() => openEditTransaction(item)} title="Editar" style={{ marginRight: 8 }}>
                                                            <Pencil size={13} />
                                                        </button>
                                                        <button className="settings-action-btn danger" onClick={() => handleDeleteTransaction(item.id)} title="Excluir">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        );
                    })()}

                    {/* --- Sub-Aba Fluxo de Caixa --- */}
                    {activeSubTabMovimentacoes === 'fluxo' && (() => {
                        const filteredFluxo = filterCompletedTransactions(completedTransactions, fluxoMonth, fluxoYear)
                            .sort((a, b) => {
                                const ad = a.data_pagamento || a.data_vencimento;
                                const bd = b.data_pagamento || b.data_vencimento;
                                return new Date(ad).getTime() - new Date(bd).getTime();
                            });

                        const totalEntradas = filteredFluxo.filter(i => i.tipo === 'entrada').reduce((a, b) => a + Number(b.valor), 0);
                        const totalSaidas = filteredFluxo.filter(i => i.tipo === 'saida').reduce((a, b) => a + Number(b.valor), 0);
                        const saldoPeriodo = totalEntradas - totalSaidas;

                        // Compute running balance for filtered entries
                        let runningSaldo = 0;
                        const fluxoWithBalance = filteredFluxo.map(item => {
                            if (item.tipo === 'entrada') runningSaldo += Number(item.valor);
                            else runningSaldo -= Number(item.valor);
                            return { ...item, saldoCalculado: runningSaldo };
                        });

                        // Title
                        const selectedMonthLabel = fluxoMonth !== 'todos' ? MONTH_ORDER.find(m => m[0] === fluxoMonth)?.[1] : null;
                        const selectedYearLabel = fluxoYear !== 'todos' ? fluxoYear : null;
                        let fluxoTitle = 'Fluxo de Caixa';
                        if (selectedMonthLabel && selectedYearLabel) fluxoTitle += ` — ${selectedMonthLabel} ${selectedYearLabel}`;
                        else if (selectedMonthLabel) fluxoTitle += ` — ${selectedMonthLabel}`;
                        else if (selectedYearLabel) fluxoTitle += ` — ${selectedYearLabel}`;

                        return (
                            <>
                                {/* Filters */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20, gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Período:</span>
                                        <select className="form-select" style={{ minWidth: 120, fontSize: 13, padding: '4px 8px', background: 'transparent', border: 'none' }} value={fluxoMonth} onChange={e => setFluxoMonth(e.target.value)}>
                                            <option value="todos">Todos os meses</option>
                                            {MONTH_ORDER.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                        </select>
                                        <select className="form-select" style={{ minWidth: 100, fontSize: 13, padding: '4px 8px', background: 'transparent', border: 'none' }} value={fluxoYear} onChange={e => setFluxoYear(e.target.value)}>
                                            <option value="todos">Todos os anos</option>
                                            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {/* KPIs */}
                                <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
                                    <div className="kpi-card">
                                        <div className="kpi-card-value" style={{ color: saldoPeriodo >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(saldoPeriodo)}</div>
                                        <div className="kpi-card-label">Saldo do Período</div>
                                    </div>
                                    <div className="kpi-card">
                                        <div className="kpi-card-value cashflow-positive">{formatCurrency(totalEntradas)}</div>
                                        <div className="kpi-card-label">Total Entradas</div>
                                    </div>
                                    <div className="kpi-card">
                                        <div className="kpi-card-value cashflow-negative">{formatCurrency(totalSaidas)}</div>
                                        <div className="kpi-card-label">Total Saídas</div>
                                    </div>
                                    {(() => {
                                        const futuros = transactionsData.filter(i => {
                                            if (i.status === 'pago_recebido') return false; // Somente pendentes (futuros)
                                            const d = new Date(i.data_pagamento || i.data_vencimento);
                                            const itemMonth = String(d.getMonth() + 1).padStart(2, '0');
                                            const itemYear = String(d.getFullYear());
                                            if (fluxoMonth !== 'todos' && itemMonth !== fluxoMonth) return false;
                                            if (fluxoYear !== 'todos' && itemYear !== fluxoYear) return false;
                                            return true;
                                        });
                                        const entradasFuturas = futuros.filter(i => i.tipo === 'entrada').reduce((a, b) => a + Number(b.valor), 0);
                                        const saidasFuturas = futuros.filter(i => i.tipo === 'saida').reduce((a, b) => a + Number(b.valor), 0);
                                        const saldoProjetado = saldoPeriodo + entradasFuturas - saidasFuturas;

                                        return (
                                            <div className="kpi-card">
                                                <div className="kpi-card-value" style={{ color: saldoProjetado >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(saldoProjetado)}</div>
                                                <div className="kpi-card-label">Saldo Final (Projetado)</div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Table */}
                                <div className="table-card">
                                    <div className="table-card-title">{fluxoTitle}</div>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Descrição</th>
                                                <th>Categoria</th>
                                                <th>Entrada</th>
                                                <th>Saída</th>
                                                <th>Saldo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fluxoWithBalance.length === 0 && (
                                                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>Nenhum lançamento encontrado para o período selecionado.</td></tr>
                                            )}
                                            {fluxoWithBalance.map((item: any) => {
                                                const d = item.data_pagamento || item.data_vencimento;
                                                return (
                                                    <tr key={item.id}>
                                                        <td>{new Date(d).toLocaleDateString('pt-BR')}</td>
                                                        <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.descricao}</td>
                                                        <td>{item.categoria || '—'}</td>
                                                        <td className="positive">{item.tipo === 'entrada' ? formatCurrency(Number(item.valor)) : '—'}</td>
                                                        <td className="negative">{item.tipo === 'saida' ? formatCurrency(Number(item.valor)) : '—'}</td>
                                                        <td style={{ fontWeight: 600, color: item.saldoCalculado >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(item.saldoCalculado)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        );
                    })()}

                    {/* --- Sub-Aba Histórico --- */}
                    {activeSubTabMovimentacoes === 'historico' && (() => {
                        const filteredHistorico = transactionsData.filter(item => {
                            if (item.status !== 'pago_recebido') return false;
                            const d = new Date(item.data_pagamento || item.data_vencimento);
                            const itemMonth = String(d.getMonth() + 1).padStart(2, '0');
                            const itemYear = String(d.getFullYear());
                            if (filterMonth !== 'todos' && itemMonth !== filterMonth) return false;
                            if (filterYear !== 'todos' && itemYear !== filterYear) return false;
                            if (filterType !== 'todos' && item.tipo !== filterType) return false;
                            if (filterClassificacao !== 'todos' && item.classificacao !== filterClassificacao) return false;
                            return true;
                        }).sort((a, b) => new Date(b.data_pagamento || b.data_vencimento).getTime() - new Date(a.data_pagamento || a.data_vencimento).getTime());

                        return (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                                    <button className="btn btn-primary" onClick={openAddTransaction} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Plus size={16} />
                                        Nova Movimentação
                                    </button>
                                </div>

                                <div className="table-card">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                        <div className="table-card-title" style={{ marginBottom: 0 }}>Histórico de Lançamentos</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'nowrap', overflowX: 'auto' }}>
                                            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                                            <select className="form-select" style={{ minWidth: 130, width: 'auto', fontSize: 13, padding: '4px 8px', background: 'transparent', border: 'none' }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                                                <option value="todos">Todos os meses</option>
                                                {MONTH_ORDER.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                            </select>
                                            <select className="form-select" style={{ minWidth: 100, width: 'auto', fontSize: 13, padding: '4px 8px', background: 'transparent', border: 'none' }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                                                <option value="todos">Todos os anos</option>
                                                {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                            <select className="form-select" style={{ minWidth: 130, width: 'auto', fontSize: 13, padding: '4px 8px', background: 'transparent', border: 'none' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                                                <option value="todos">Todos os fluxos</option>
                                                <option value="entrada">Entradas</option>
                                                <option value="saida">Saídas</option>
                                            </select>
                                            <select className="form-select" style={{ minWidth: 150, width: 'auto', fontSize: 13, padding: '4px 8px', background: 'transparent', border: 'none' }} value={filterClassificacao} onChange={e => setFilterClassificacao(e.target.value)}>
                                                <option value="todos">Todas classificações</option>
                                                {uniqueClassificacoes.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Data Ref</th>
                                                <th>Descrição</th>
                                                <th>Classificação</th>
                                                <th>Categoria</th>
                                                <th>Fluxo</th>
                                                <th>Valor</th>
                                                <th style={{ width: 50 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredHistorico.length === 0 && (
                                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>Nenhum lançamento encontrado.</td></tr>
                                            )}
                                            {filteredHistorico.map(item => (
                                                <tr key={item.id}>
                                                    <td>{new Date(item.data_pagamento || item.data_vencimento).toLocaleDateString('pt-BR')}</td>
                                                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.descricao}</td>
                                                    <td>
                                                        {item.classificacao ? (
                                                            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, background: 'rgba(139, 92, 246, 0.1)', color: '#A78BFA', fontWeight: 500 }}>
                                                                {item.classificacao}
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                    <td>{item.categoria || '—'}</td>
                                                    <td>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: item.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                                            {item.tipo === 'entrada' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                                                            {item.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                                                        </span>
                                                    </td>
                                                    <td className={item.tipo === 'entrada' ? 'positive' : 'negative'}>
                                                        {item.tipo === 'entrada' ? '+' : '-'}{formatCurrency(Number(item.valor))}
                                                    </td>
                                                    <td>
                                                        <button className="settings-action-btn" onClick={() => openEditTransaction(item)} title="Editar" style={{ marginRight: 8 }}>
                                                            <Pencil size={13} />
                                                        </button>
                                                        <button className="settings-action-btn danger" onClick={() => handleDeleteTransaction(item.id)} title="Excluir">
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        );
                    })()}
                </>
            )}

            {/* ====== ABA PLANEJAMENTO ====== */}
            {
                activeTab === 'planejamento' && (
                    <>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 24, padding: 4, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', width: 'fit-content' }}>
                            <button
                                onClick={() => setActiveSubTabPlanejamento('dre')}
                                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all 0.2s', background: activeSubTabPlanejamento === 'dre' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeSubTabPlanejamento === 'dre' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                            >
                                DRE Anual
                            </button>
                            <button
                                onClick={() => setActiveSubTabPlanejamento('metas')}
                                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all 0.2s', background: activeSubTabPlanejamento === 'metas' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeSubTabPlanejamento === 'metas' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                            >
                                Metas & Orçamentos
                            </button>
                        </div>

                        {/* --- Sub-Aba DRE --- */}
                        {activeSubTabPlanejamento === 'dre' && (() => {
                            const completedTransactions = transactionsData.filter((t: FinancialTransaction) => t.status === 'pago_recebido');
                            const totalReceitaDRE = completedTransactions.filter(i => i.tipo === 'entrada').reduce((a, b) => a + Number(b.valor), 0);
                            const totalDespesasDRE = completedTransactions.filter(i => i.tipo === 'saida').reduce((a, b) => a + Number(b.valor), 0);
                            const lucroBrutoDRE = totalReceitaDRE - totalDespesasDRE;

                            // Group expenses by classificação for DRE
                            const despesasByClass: Record<string, number> = {};
                            completedTransactions.filter(i => i.tipo === 'saida').forEach(item => {
                                const key = item.classificacao || 'Outros';
                                despesasByClass[key] = (despesasByClass[key] || 0) + Number(item.valor);
                            });

                            return (
                                <div className="table-card">
                                    <div className="table-card-title">Demonstrativo de Resultado do Exercício (DRE) — {getBahiaDate().getFullYear()}</div>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '60%' }}>Descrição</th>
                                                <th style={{ textAlign: 'right' }}>Valor (R$)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="dre-category"><td>RECEITA OPERACIONAL BRUTA</td><td style={{ textAlign: 'right' }}></td></tr>
                                            <tr className="dre-subcategory"><td>Receita de Serviços</td><td style={{ textAlign: 'right' }} className="positive">{formatCurrency(totalReceitaDRE)}</td></tr>
                                            <tr className="dre-total"><td><strong>RECEITA OPERACIONAL LÍQUIDA</strong></td><td style={{ textAlign: 'right' }} className="positive"><strong>{formatCurrency(totalReceitaDRE)}</strong></td></tr>

                                            <tr className="dre-category"><td>DESPESAS OPERACIONAIS</td><td style={{ textAlign: 'right' }}></td></tr>
                                            {Object.entries(despesasByClass).map(([key, val]) => (
                                                <tr key={key} className="dre-subcategory"><td>(–) {key}</td><td style={{ textAlign: 'right' }} className="negative">({formatCurrency(val)})</td></tr>
                                            ))}
                                            {totalDespesasDRE === 0 && (
                                                <tr className="dre-subcategory"><td colSpan={2} style={{ color: 'var(--text-muted)', textAlign: 'center' }}>Nenhuma despesa registrada</td></tr>
                                            )}
                                            <tr className="dre-total"><td><strong>TOTAL DESPESAS</strong></td><td style={{ textAlign: 'right' }} className="negative"><strong>({formatCurrency(totalDespesasDRE)})</strong></td></tr>

                                            <tr className="dre-total" style={{ borderTop: '3px solid var(--accent)' }}>
                                                <td><strong style={{ color: 'var(--accent-light)', fontSize: 15 }}>RESULTADO DO EXERCÍCIO</strong></td>
                                                <td style={{ textAlign: 'right', fontSize: 15 }} className={lucroBrutoDRE >= 0 ? 'positive' : 'negative'}><strong>{formatCurrency(lucroBrutoDRE)}</strong></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })()}

                        {/* --- Sub-Aba Metas & Planejamento --- */}
                        {activeSubTabPlanejamento === 'metas' && (() => {
                            const completedTransactions = transactionsData.filter((t: FinancialTransaction) => t.status === 'pago_recebido');
                            const totalReceitaDRE = completedTransactions.filter((i: FinancialTransaction) => i.tipo === 'entrada').reduce((a: number, b: FinancialTransaction) => a + Number(b.valor), 0);
                            const totalDespesasDRE = completedTransactions.filter((i: FinancialTransaction) => i.tipo === 'saida').reduce((a: number, b: FinancialTransaction) => a + Number(b.valor), 0);
                            const lucroBrutoDRE = totalReceitaDRE - totalDespesasDRE;

                            // Group expenses by classificação for DRE
                            const despesasByClass: Record<string, number> = {};
                            completedTransactions.filter(i => i.tipo === 'saida').forEach(item => {
                                const key = item.classificacao || 'Outros';
                                despesasByClass[key] = (despesasByClass[key] || 0) + Number(item.valor);
                            });

                            return <MetasPlanejamentoTab
                                goals={goals}
                                setGoals={setGoals}
                                budgetPlan={budgetPlan}
                                setBudgetPlan={setBudgetPlan}
                                formatCurrency={formatCurrency}
                                totalReceitaDRE={totalReceitaDRE}
                                totalDespesasDRE={totalDespesasDRE}
                                despesasByClass={despesasByClass}
                                lucroBrutoDRE={lucroBrutoDRE}
                            />;
                        })()}
                    </>
                )
            }

            {/* ====== TRANSACTION MODAL ====== */}
            {transactionModal && (
                <div className="settings-modal-overlay" onClick={() => setTransactionModal(null)} style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, background: '#111114', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '24px 28px', color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                            <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{transactionModal.type === 'add' ? 'Nova Movimentação' : 'Editar Movimentação'}</h3>
                            <button onClick={() => setTransactionModal(null)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#888', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#fff'} onMouseLeave={e => e.currentTarget.style.color = '#888'}>
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {/* Tipo */}
                            <div>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#aaa' }}>Tipo da Movimentação</label>
                                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: 100, padding: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <button
                                        onClick={() => setFormTipo('saida')}
                                        style={{ flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 500, borderRadius: 100, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: formTipo === 'saida' ? '#f97316' : 'transparent', color: formTipo === 'saida' ? '#fff' : '#aaa' }}
                                    >
                                        Despesa (Saída)
                                    </button>
                                    <button
                                        onClick={() => setFormTipo('entrada')}
                                        style={{ flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 500, borderRadius: 100, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: formTipo === 'entrada' ? '#f97316' : 'transparent', color: formTipo === 'entrada' ? '#fff' : '#aaa' }}
                                    >
                                        Receita (Entrada)
                                    </button>
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#aaa' }}>Status</label>
                                <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: 100, padding: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <button
                                        onClick={() => setFormStatus('pago_recebido')}
                                        style={{ flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 500, borderRadius: 100, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: formStatus === 'pago_recebido' ? '#f97316' : 'transparent', color: formStatus === 'pago_recebido' ? '#fff' : '#aaa' }}
                                    >
                                        Efetivado (Pago/Recebido)
                                    </button>
                                    <button
                                        onClick={() => setFormStatus('pendente')}
                                        style={{ flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 500, borderRadius: 100, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: formStatus === 'pendente' ? '#f97316' : 'transparent', color: formStatus === 'pendente' ? '#fff' : '#aaa' }}
                                    >
                                        Pendente
                                    </button>
                                </div>
                            </div>

                            {/* Descrição */}
                            <div>
                                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#aaa' }}>Descrição</label>
                                <input type="text" value={formDescricao} onChange={e => setFormDescricao(e.target.value)} placeholder="Ex: Conta de Luz, Venda Produto X..." style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none' }} />
                            </div>

                            {/* Valor e Vencimento */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#aaa' }}>Valor (R$)</label>
                                    <input type="text" value={formValorDisplay} onChange={handleValorChange} placeholder="0,00" style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#aaa' }}>Data de Vencimento</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type="date" value={formDateVencimento} onChange={e => setFormDateVencimento(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', appearance: 'none' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Efetivação */}
                            {formStatus === 'pago_recebido' && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#aaa' }}>Data de Efetivação</label>
                                    <div style={{ position: 'relative' }}>
                                        <input type="date" value={formDatePagamento} onChange={e => setFormDatePagamento(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', appearance: 'none' }} />
                                    </div>
                                </div>
                            )}

                            {/* DRE Selects */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#aaa' }}>Classificação (DRE)</label>
                                    <select value={formClassificacao} onChange={e => setFormClassificacao(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                                        <option value="" style={{ color: '#000' }}>Selecione...</option>
                                        {dbTypes.map(t => <option key={t.id} value={t.name} style={{ color: '#000' }}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: '#aaa' }}>Categoria (DRE)</label>
                                    <select value={formCategoria} onChange={e => setFormCategoria(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#fff', outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                                        <option value="" style={{ color: '#000' }}>Nenhuma</option>
                                        {dbCategories.map(c => <option key={c.id} value={c.name} style={{ color: '#000' }}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Footer Buttons */}
                        <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
                            <button onClick={() => setTransactionModal(null)} style={{ flex: 1, padding: '12px 0', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                Cancelar
                            </button>
                            <button onClick={handleSaveTransaction} disabled={formSaving || !formDescricao || !formValorDisplay} style={{ flex: 1, padding: '12px 0', border: 'none', background: '#f97316', color: '#fff', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: (formSaving || !formDescricao || !formValorDisplay) ? 'not-allowed' : 'pointer', opacity: (formSaving || !formDescricao || !formValorDisplay) ? 0.6 : 1, transition: 'all 0.2s' }} onMouseEnter={e => { if (!formSaving && formDescricao && formValorDisplay) e.currentTarget.style.background = '#ea580c' }} onMouseLeave={e => { if (!formSaving && formDescricao && formValorDisplay) e.currentTarget.style.background = '#f97316' }}>
                                {formSaving ? 'Salvando...' : 'Salvar Movimentação'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// ===== METAS & PLANEJAMENTO COMPONENT =====
function MetasPlanejamentoTab({
    goals, setGoals, budgetPlan, setBudgetPlan, formatCurrency,
    totalReceitaDRE, totalDespesasDRE, despesasByClass, lucroBrutoDRE
}: {
    goals: FinancialGoal[]; setGoals: (g: FinancialGoal[]) => void;
    budgetPlan: any[]; setBudgetPlan: (b: any[]) => void;
    formatCurrency: (v: number) => string;
    totalReceitaDRE: number;
    totalDespesasDRE: number;
    despesasByClass: Record<string, number>;
    lucroBrutoDRE: number;
}) {
    const [saving, setSaving] = useState(false);
    const [editGoalId, setEditGoalId] = useState<string | null>(null);
    const [editGoalForm, setEditGoalForm] = useState({ name: '', target: '', current: '', unit: '' });
    const [showAddGoal, setShowAddGoal] = useState(false);
    const [newGoalForm, setNewGoalForm] = useState({ name: '', target: '', current: '0', unit: '' });

    // Budget plan
    const [newBudgetCat, setNewBudgetCat] = useState('');
    const [newBudgetMonth, setNewBudgetMonth] = useState('');
    const [newBudgetValue, setNewBudgetValue] = useState('');

    const uniqueCategories = Array.from(new Set(budgetPlan.map(b => b.category))).sort();
    const uniqueMonths = Array.from(new Set(budgetPlan.map(b => b.month))).sort();

    async function handleAddGoal() {
        if (!newGoalForm.name || !newGoalForm.target) return;
        setSaving(true);
        try {
            const added = await addGoal({
                name: newGoalForm.name,
                target: parseCurrencyInput(newGoalForm.target),
                current: parseCurrencyInput(newGoalForm.current) || 0,
                unit: newGoalForm.unit,
                color: '#3B82F6',
            });
            setGoals([...goals, added]);
            setNewGoalForm({ name: '', target: '', current: '0', unit: '' });
            setShowAddGoal(false);
        } catch (e) { console.error(e); }
        setSaving(false);
    }

    function startEditGoal(goal: FinancialGoal) {
        setEditGoalId(goal.id);
        setEditGoalForm({ name: goal.name, target: String(goal.target), current: String(goal.current), unit: goal.unit || '' });
    }

    async function handleSaveEditGoal() {
        if (!editGoalId || !editGoalForm.name || !editGoalForm.target) return;
        setSaving(true);
        try {
            const updated = await updateGoal(editGoalId, {
                name: editGoalForm.name,
                target: parseCurrencyInput(editGoalForm.target),
                current: parseCurrencyInput(editGoalForm.current),
                unit: editGoalForm.unit,
            });
            setGoals(goals.map(g => g.id === updated.id ? updated : g));
            setEditGoalId(null);
        } catch (e) { console.error(e); }
        setSaving(false);
    }

    async function handleDeleteGoal(id: string) {
        setSaving(true);
        try { await removeGoal(id); setGoals(goals.filter(g => g.id !== id)); } catch (e) { console.error(e); }
        setSaving(false);
    }

    async function handleAddBudgetRow() {
        if (!newBudgetCat.trim() || !newBudgetMonth.trim()) return;
        setSaving(true);
        try {
            const added = await addBudgetPlanItem({ category: newBudgetCat.trim(), month: newBudgetMonth.trim(), planned_value: parseCurrencyInput(newBudgetValue) || 0 });
            setBudgetPlan([...budgetPlan, added]);
            setNewBudgetCat(''); setNewBudgetMonth(''); setNewBudgetValue('');
        } catch (e) { console.error(e); }
        setSaving(false);
    }

    async function handleDeleteBudgetCategory(category: string) {
        setSaving(true);
        try {
            const items = budgetPlan.filter(b => b.category === category);
            for (const item of items) await removeBudgetPlanItem(item.id);
            setBudgetPlan(budgetPlan.filter(b => b.category !== category));
        } catch (e) { console.error(e); }
        setSaving(false);
    }

    return (
        <>
            {/* ===== METAS TABLE ===== */}
            <div className="table-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div className="table-card-title" style={{ marginBottom: 0 }}>Metas Financeiras</div>
                    <button className="btn btn-primary" onClick={() => setShowAddGoal(true)}>
                        <Plus size={14} /> Nova Meta
                    </button>
                </div>

                {/* Add goal inline form */}
                {showAddGoal && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="form-group" style={{ flex: 1, minWidth: 150 }}>
                            <label className="form-label">Nome</label>
                            <input className="form-input" value={newGoalForm.name} onChange={e => setNewGoalForm({ ...newGoalForm, name: e.target.value })} placeholder="Ex: Receita Anual" />
                        </div>
                        <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                            <label className="form-label">Valor Meta</label>
                            <input className="form-input" type="text" value={newGoalForm.target} onChange={e => setNewGoalForm({ ...newGoalForm, target: formatCurrencyInput(e.target.value) })} placeholder="R$ 1.500.000,00" />
                        </div>
                        <div className="form-group" style={{ flex: 1, minWidth: 120 }}>
                            <label className="form-label">Valor Atual</label>
                            <input className="form-input" type="text" value={newGoalForm.current} onChange={e => setNewGoalForm({ ...newGoalForm, current: formatCurrencyInput(e.target.value) })} placeholder="R$ 0,00" />
                        </div>
                        <div className="form-group" style={{ flex: 1, minWidth: 100 }}>
                            <label className="form-label">Unidade</label>
                            <input className="form-input" value={newGoalForm.unit} onChange={e => setNewGoalForm({ ...newGoalForm, unit: e.target.value })} placeholder="% ou R$" />
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-primary" onClick={handleAddGoal} disabled={saving || !newGoalForm.name || !newGoalForm.target}>
                                <Check size={14} /> {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setShowAddGoal(false)}>
                                <X size={14} />
                            </button>
                        </div>
                    </div>
                )}

                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Valor Meta</th>
                            <th>Valor Atual</th>
                            <th>Unidade</th>
                            <th>Progresso</th>
                            <th style={{ width: 80 }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {goals.length === 0 && (
                            <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>Nenhuma meta cadastrada. Clique em "Nova Meta" para começar.</td></tr>
                        )}
                        {goals.map((goal) => {
                            const progress = Number(goal.target) > 0 ? (Number(goal.current) / Number(goal.target)) * 100 : 0;
                            const isEditing = editGoalId === goal.id;

                            if (isEditing) {
                                return (
                                    <tr key={goal.id}>
                                        <td><input className="form-input" style={{ fontSize: 13, padding: '4px 8px' }} value={editGoalForm.name} onChange={e => setEditGoalForm({ ...editGoalForm, name: e.target.value })} /></td>
                                        <td><input className="form-input" type="text" style={{ fontSize: 13, padding: '4px 8px', maxWidth: 120 }} value={editGoalForm.target} onChange={e => setEditGoalForm({ ...editGoalForm, target: formatCurrencyInput(e.target.value) })} /></td>
                                        <td><input className="form-input" type="text" style={{ fontSize: 13, padding: '4px 8px', maxWidth: 120 }} value={editGoalForm.current} onChange={e => setEditGoalForm({ ...editGoalForm, current: formatCurrencyInput(e.target.value) })} /></td>
                                        <td><input className="form-input" style={{ fontSize: 13, padding: '4px 8px', maxWidth: 80 }} value={editGoalForm.unit} onChange={e => setEditGoalForm({ ...editGoalForm, unit: e.target.value })} /></td>
                                        <td>—</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="settings-action-btn" onClick={handleSaveEditGoal} disabled={saving} title="Salvar"><Check size={13} /></button>
                                                <button className="settings-action-btn" onClick={() => setEditGoalId(null)} title="Cancelar"><X size={13} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }

                            return (
                                <tr key={goal.id}>
                                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{goal.name}</td>
                                    <td>{goal.unit === '%' ? `${goal.target}%` : formatCurrency(Number(goal.target))}</td>
                                    <td>{goal.unit === '%' ? `${goal.current}%` : formatCurrency(Number(goal.current))}</td>
                                    <td>{goal.unit || 'R$'}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                                <div style={{
                                                    width: `${Math.min(progress, 100)}%`,
                                                    height: '100%',
                                                    borderRadius: 3,
                                                    background: progress >= 100 ? '#10B981' : progress >= 50 ? '#F59E0B' : '#3B82F6',
                                                    transition: 'width 0.3s ease',
                                                }} />
                                            </div>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: progress >= 100 ? '#10B981' : 'var(--text-secondary)', minWidth: 45 }}>{progress.toFixed(1)}%</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button className="settings-action-btn" onClick={() => startEditGoal(goal)} title="Editar"><Pencil size={13} /></button>
                                            <button className="settings-action-btn danger" onClick={() => handleDeleteGoal(goal.id)} disabled={saving} title="Excluir"><Trash2 size={13} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* ===== PLANEJAMENTO DE GASTOS ===== */}
            <div className="table-card" style={{ marginTop: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div className="table-card-title" style={{ marginBottom: 0 }}>Planejamento de Gastos</div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                    <input className="form-input" placeholder="Categoria" value={newBudgetCat} onChange={e => setNewBudgetCat(e.target.value)} style={{ maxWidth: 160 }} />
                    <input className="form-input" placeholder="Mês (ex: Jul 2026)" value={newBudgetMonth} onChange={e => setNewBudgetMonth(e.target.value)} style={{ maxWidth: 140 }} />
                    <input className="form-input" type="text" placeholder="R$ 0,00" value={newBudgetValue} onChange={e => setNewBudgetValue(formatCurrencyInput(e.target.value))} style={{ maxWidth: 120 }} />
                    <button className="btn btn-primary" onClick={handleAddBudgetRow} disabled={saving || !newBudgetCat.trim() || !newBudgetMonth.trim()}>
                        <Plus size={14} /> Adicionar
                    </button>
                </div>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Categoria</th>
                            {uniqueMonths.map(m => <th key={m}>{m}</th>)}
                            <th style={{ width: 50 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {uniqueCategories.length === 0 && (
                            <tr><td colSpan={uniqueMonths.length + 2} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>Nenhum planejamento cadastrado.</td></tr>
                        )}
                        {uniqueCategories.map(cat => (
                            <tr key={cat}>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cat}</td>
                                {uniqueMonths.map(m => {
                                    const item = budgetPlan.find(b => b.category === cat && b.month === m);
                                    return <td key={m}>{item ? formatCurrency(Number(item.planned_value)) : '—'}</td>;
                                })}
                                <td></td>
                            </tr>
                        ))}
                        {uniqueCategories.length > 0 && (
                            <tr className="total-row">
                                <td>TOTAL</td>
                                {uniqueMonths.map(m => {
                                    const total = budgetPlan.filter(b => b.month === m).reduce((s, b) => s + Number(b.planned_value), 0);
                                    return <td key={m}>{formatCurrency(total)}</td>;
                                })}
                                <td></td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}


