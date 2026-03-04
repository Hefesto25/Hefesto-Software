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
    useFinancialTransactions, addFinancialTransaction, updateFinancialTransaction, removeFinancialTransaction,
    useClients, useFinancialTaxes, addFinancialTax, updateFinancialTax, removeFinancialTax
} from '@/lib/hooks';
import { formatCurrencyInput, parseCurrencyInput, getBahiaDate, getBahiaDateString } from '@/lib/utils';
import type { FinancialGoal, FinancialTransaction, FinancialTax } from '@/lib/types';

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

type Tab = 'painel' | 'movimentacoes' | 'planejamento' | 'rentabilidade';
type SubTabMovimentacoes = 'pendentes' | 'fluxo' | 'historico' | 'impostos' | 'recorrencias';
type SubTabPlanejamento = 'dre' | 'metas';

export default function FinanceiroPage() {
    const [activeTab, setActiveTab] = useState<Tab>('painel');
    const [activeSubTabMovimentacoes, setActiveSubTabMovimentacoes] = useState<SubTabMovimentacoes>('pendentes');
    const [activeSubTabPlanejamento, setActiveSubTabPlanejamento] = useState<SubTabPlanejamento>('dre');
    const { data: transactionsData, loading: loadingTransactions, setData: setTransactionsData, refetch: refetchTransactions } = useFinancialTransactions();
    const { data: goalsData, loading: loadingGoals } = useGoals();
    const { data: dbTypes, loading: loadingTypes } = useFinancialTypes();
    const { data: dbCategories, loading: loadingCategories } = useFinancialCategories();
    const { data: budgetPlanData, loading: loadingBudget } = useBudgetPlan();
    const { data: clients, loading: loadingClients } = useClients();
    const { data: taxesData, loading: loadingTaxes, refetch: refetchTaxes } = useFinancialTaxes();

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

    // Taxes filters
    const [taxStatusFilter, setTaxStatusFilter] = useState<string>('todos');
    const [taxCategoryFilter, setTaxCategoryFilter] = useState<string>('todos');
    const [taxMonthFilter, setTaxMonthFilter] = useState<string>('todos');
    const [taxYearFilter, setTaxYearFilter] = useState<string>('todos');

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
    const [formIsRecurrente, setFormIsRecurrente] = useState(false);
    const [formRecurrenciaTipo, setFormRecurrenciaTipo] = useState<'mensal' | 'semanal' | 'anual'>('mensal');
    const [formRecurrenciaQtd, setFormRecurrenciaQtd] = useState(1);

    // Tax Modal state
    type TaxModalState = { type: 'add' } | { type: 'edit'; tax: FinancialTax } | null;
    const [taxModal, setTaxModal] = useState<TaxModalState>(null);

    // Form state for Tax Modal
    const [taxDescricao, setTaxDescricao] = useState('');
    const [taxCategoria, setTaxCategoria] = useState('');
    const [taxCompetencia, setTaxCompetencia] = useState('');
    const [taxVencimento, setTaxVencimento] = useState(getBahiaDateString());
    const [taxPagamento, setTaxPagamento] = useState<string>('');
    const [taxValorDisplay, setTaxValorDisplay] = useState('');
    const [taxStatus, setTaxStatus] = useState<string>('Pendente');

    // Generic Delete Confirm State
    const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean, targetId: string, type: 'tax' | 'transaction' | 'goal' | 'budget', title: string } | null>(null);

    function openAddTax() {
        setTaxDescricao('');
        setTaxCategoria('');
        setTaxCompetencia('');
        setTaxVencimento(getBahiaDateString());
        setTaxPagamento('');
        setTaxValorDisplay('');
        setTaxStatus('Pendente');
        setTaxModal({ type: 'add' });
    }

    function openEditTax(tax: FinancialTax) {
        setTaxDescricao(tax.descricao);
        setTaxCategoria(tax.categoria);
        setTaxCompetencia(tax.competencia);
        setTaxVencimento(tax.data_vencimento);
        setTaxPagamento(tax.data_pagamento || '');
        setTaxValorDisplay(tax.valor.toString());
        setTaxStatus(tax.status);
        setTaxModal({ type: 'edit', tax });
    }

    async function handleSaveTax() {
        if (!taxDescricao.trim() || !taxValorDisplay) return;
        setFormSaving(true);
        try {
            const valor = parseValorDisplay(taxValorDisplay);
            const data: Omit<FinancialTax, 'id' | 'created_at'> = {
                descricao: taxDescricao.trim(),
                categoria: taxCategoria,
                competencia: taxCompetencia,
                data_vencimento: taxVencimento,
                data_pagamento: taxStatus === 'Pago' ? (taxPagamento || taxVencimento) : null,
                valor,
                status: taxStatus
            };

            if (taxModal?.type === 'add') {
                await addFinancialTax(data);
            } else if (taxModal?.type === 'edit') {
                await updateFinancialTax(taxModal.tax.id, data);
            }
            refetchTaxes();
            setTaxModal(null);
        } catch (e) {
            console.error(e);
        }
        setFormSaving(false);
    }

    async function handleDeleteTax(id: string) {
        setDeleteConfirm({ isOpen: true, targetId: id, type: 'tax', title: 'Excluir Imposto' });
    }

    async function processDeleteTax(id: string) {
        try {
            await removeFinancialTax(id);
            refetchTaxes();
            setDeleteConfirm(null);
        } catch (e) { console.error(e); }
    }

    function openAddTransaction() {
        setFormTipo('saida');
        setFormStatus('pendente');
        setFormClassificacao('');
        setFormCategoria('');
        setFormDescricao('');
        setFormValorDisplay('');
        setFormDateVencimento(getBahiaDateString());
        setFormDatePagamento('');
        setFormIsRecurrente(false);
        setFormRecurrenciaTipo('mensal');
        setFormRecurrenciaQtd(1);
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

    // Auto-open transaction if task_id is in URL (from Chat Mention)
    useEffect(() => {
        if (!loadingTransactions && transactionsData.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const taskId = params.get('task_id');
            if (taskId) {
                const transaction = transactionsData.find(t => t.id === taskId);
                if (transaction) {
                    openEditTransaction(transaction);
                    setActiveTab('movimentacoes');
                    // Clear the URL to prevent re-opening on manual refresh
                    window.history.replaceState({}, '', '/financeiro');
                }
            }
        }
    }, [loadingTransactions, transactionsData]);

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

            if (transactionModal?.type === 'add') {
                if (formIsRecurrente) {
                    const baseDate = new Date(formDateVencimento + 'T12:00:00');
                    const grupoId = crypto.randomUUID();
                    for (let i = 0; i < formRecurrenciaQtd; i++) {
                        const d = new Date(baseDate);
                        if (formRecurrenciaTipo === 'mensal') d.setMonth(d.getMonth() + i);
                        else if (formRecurrenciaTipo === 'semanal') d.setDate(d.getDate() + (i * 7));
                        else if (formRecurrenciaTipo === 'anual') d.setFullYear(d.getFullYear() + i);

                        await addFinancialTransaction({
                            descricao: formRecurrenciaQtd > 1 ? `${formDescricao.trim()} (${i + 1}/${formRecurrenciaQtd})` : formDescricao.trim(),
                            tipo: formTipo,
                            valor,
                            data_vencimento: d.toISOString().split('T')[0],
                            data_pagamento: formStatus === 'pago_recebido' ? (formDatePagamento || formDateVencimento) : null,
                            status: formStatus,
                            classificacao: formClassificacao,
                            categoria: formCategoria,
                            grupo_recorrencia: grupoId,
                            recorrencia: formRecurrenciaTipo
                        });
                    }
                } else {
                    await addFinancialTransaction({
                        descricao: formDescricao.trim(),
                        tipo: formTipo,
                        valor,
                        data_vencimento: formDateVencimento,
                        data_pagamento: formStatus === 'pago_recebido' ? (formDatePagamento || formDateVencimento) : null,
                        status: formStatus,
                        classificacao: formClassificacao,
                        categoria: formCategoria,
                    });
                }
            } else if (transactionModal?.type === 'edit' && transactionModal.transaction) {
                await updateFinancialTransaction(transactionModal.transaction.id, {
                    descricao: formDescricao.trim(),
                    tipo: formTipo,
                    valor,
                    data_vencimento: formDateVencimento,
                    data_pagamento: formStatus === 'pago_recebido' ? (formDatePagamento || formDateVencimento) : null,
                    status: formStatus,
                    classificacao: formClassificacao,
                    categoria: formCategoria,
                });
            }

            refetchTransactions();
            setTransactionModal(null);
        } catch (e) {
            console.error(e);
        }
        setFormSaving(false);
    }

    async function handleDeleteTransaction(id: string) {
        setDeleteConfirm({ isOpen: true, targetId: id, type: 'transaction', title: 'Excluir Lançamento' });
    }

    async function processDeleteTransaction(id: string) {
        try {
            await removeFinancialTransaction(id);
            setTransactionsData(transactionsData.filter(item => item.id !== id));
            setDeleteConfirm(null);
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
        { key: 'rentabilidade', label: 'Rentabilidade' },
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

            {/* Delete Confirm Modal Global */}
            {deleteConfirm && deleteConfirm.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 400 }}>
                        <h3>Confirmar Exclusão</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Tem certeza que deseja excluir <b>{deleteConfirm.title}</b>? Esta ação não pode ser desfeita.</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                            <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
                            <button className="btn btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => {
                                if (deleteConfirm.type === 'tax') processDeleteTax(deleteConfirm.targetId);
                                if (deleteConfirm.type === 'transaction') processDeleteTransaction(deleteConfirm.targetId);
                            }}>Confirmar Exclusão</button>
                        </div>
                    </div>
                </div>
            )}

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
                        <button
                            onClick={() => setActiveSubTabMovimentacoes('impostos')}
                            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all 0.2s', background: activeSubTabMovimentacoes === 'impostos' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeSubTabMovimentacoes === 'impostos' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                        >
                            Impostos
                        </button>
                        <button
                            onClick={() => setActiveSubTabMovimentacoes('recorrencias')}
                            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all 0.2s', background: activeSubTabMovimentacoes === 'recorrencias' ? 'rgba(255,255,255,0.1)' : 'transparent', color: activeSubTabMovimentacoes === 'recorrencias' ? 'var(--text-primary)' : 'var(--text-muted)' }}
                        >
                            Recorrências
                        </button>
                    </div>

                    {/* --- Sub-Aba Recorrências --- */}
                    {activeSubTabMovimentacoes === 'recorrencias' && (() => {
                        const filtered = transactionsData.filter(item => {
                            if (!item.grupo_recorrencia) return false;
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
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                                    <button className="btn btn-primary" onClick={openAddTransaction} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Plus size={16} /> Nova Movimentação
                                    </button>
                                </div>
                                <div className="table-card">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                        <div className="table-card-title" style={{ marginBottom: 0 }}>Gestão de Recorrências</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                                            <select className="form-select" style={{ minWidth: 130, background: 'transparent', border: 'none', fontSize: 13 }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                                                <option value="todos">Mês</option>
                                                {MONTH_ORDER.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                            </select>
                                            <select className="form-select" style={{ minWidth: 90, background: 'transparent', border: 'none', fontSize: 13 }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                                                <option value="todos">Ano</option>
                                                {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                            <select className="form-select" style={{ minWidth: 120, background: 'transparent', border: 'none', fontSize: 13 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                                                <option value="todos">Fluxo</option>
                                                <option value="entrada">Entrada</option>
                                                <option value="saida">Saída</option>
                                            </select>
                                        </div>
                                    </div>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Vencimento</th>
                                                <th>Descrição</th>
                                                <th>Classificação</th>
                                                <th>Peridiocidade</th>
                                                <th>Status</th>
                                                <th>Valor</th>
                                                <th style={{ width: 80 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.length === 0 && (
                                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>Nenhuma recorrência encontrada.</td></tr>
                                            )}
                                            {filtered.map(item => (
                                                <tr key={item.id}>
                                                    <td>{new Date(item.data_vencimento).toLocaleDateString('pt-BR')}</td>
                                                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.descricao}</td>
                                                    <td>{item.classificacao || '—'}</td>
                                                    <td style={{ textTransform: 'capitalize' }}>{item.recorrencia || 'mensal'}</td>
                                                    <td>
                                                        <span className={`status-badge ${item.status === 'pago_recebido' ? 'success' : 'warning'}`}>
                                                            {item.status === 'pago_recebido' ? 'Pago/Recebido' : 'Pendente'}
                                                        </span>
                                                    </td>
                                                    <td className={item.tipo === 'entrada' ? 'positive' : 'negative'}>{item.tipo === 'entrada' ? '+' : '-'}{formatCurrency(Number(item.valor))}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            <button className="settings-action-btn" onClick={() => openEditTransaction(item)} title="Editar"><Pencil size={13} /></button>
                                                            <button className="settings-action-btn danger" onClick={() => handleDeleteTransaction(item.id)} title="Excluir"><Trash2 size={13} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        );
                    })()}

                    {/* --- Sub-Aba Pendentes --- */}
                    {activeSubTabMovimentacoes === 'pendentes' && (() => {
                        const filtered = transactionsData.filter(item => {
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
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                                    <button className="btn btn-primary" onClick={openAddTransaction} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Plus size={16} /> Nova Movimentação
                                    </button>
                                </div>
                                <div className="table-card">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                        <div className="table-card-title" style={{ marginBottom: 0 }}>Lançamentos Futuros</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                                            <select className="form-select" style={{ minWidth: 130, background: 'transparent', border: 'none', fontSize: 13 }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                                                <option value="todos">Mês</option>
                                                {MONTH_ORDER.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                            </select>
                                            <select className="form-select" style={{ minWidth: 90, background: 'transparent', border: 'none', fontSize: 13 }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                                                <option value="todos">Ano</option>
                                                {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                            <select className="form-select" style={{ minWidth: 120, background: 'transparent', border: 'none', fontSize: 13 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                                                <option value="todos">Fluxo</option>
                                                <option value="entrada">Entrada</option>
                                                <option value="saida">Saída</option>
                                            </select>
                                        </div>
                                    </div>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Vencimento</th>
                                                <th>Descrição</th>
                                                <th>Classificação</th>
                                                <th>Categoria</th>
                                                <th>Fluxo</th>
                                                <th>Valor</th>
                                                <th style={{ width: 80 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.length === 0 && (
                                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>Nenhum lançamento encontrado.</td></tr>
                                            )}
                                            {filtered.map(item => (
                                                <tr key={item.id}>
                                                    <td>{new Date(item.data_vencimento).toLocaleDateString('pt-BR')}</td>
                                                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.descricao}</td>
                                                    <td>{item.classificacao || '—'}</td>
                                                    <td>{item.categoria || '—'}</td>
                                                    <td>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: item.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                                            {item.tipo === 'entrada' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                                                            {item.tipo === 'entrada' ? 'RE' : 'DP'}
                                                        </span>
                                                    </td>
                                                    <td className={item.tipo === 'entrada' ? 'positive' : 'negative'}>{item.tipo === 'entrada' ? '+' : '-'}{formatCurrency(Number(item.valor))}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            <button className="settings-action-btn" onClick={() => openEditTransaction(item)} title="Editar"><Pencil size={13} /></button>
                                                            <button className="settings-action-btn danger" onClick={() => handleDeleteTransaction(item.id)} title="Excluir"><Trash2 size={13} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        );
                    })()}

                    {/* --- Sub-Aba Histórico --- */}
                    {activeSubTabMovimentacoes === 'historico' && (() => {
                        const filtered = transactionsData.filter(item => {
                            if (item.status !== 'pago_recebido') return false;
                            const d = new Date(item.data_pagamento || item.data_vencimento);
                            const itemMonth = String(d.getMonth() + 1).padStart(2, '0');
                            const itemYear = String(d.getFullYear());
                            if (filterMonth !== 'todos' && itemMonth !== filterMonth) return false;
                            if (filterYear !== 'todos' && itemYear !== filterYear) return false;
                            if (filterType !== 'todos' && item.tipo !== filterType) return false;
                            return true;
                        }).sort((a, b) => new Date(b.data_pagamento || b.data_vencimento).getTime() - new Date(a.data_pagamento || a.data_vencimento).getTime());

                        return (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                                    <button className="btn btn-primary" onClick={openAddTransaction} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Plus size={16} /> Nova Movimentação
                                    </button>
                                </div>
                                <div className="table-card">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                        <div className="table-card-title" style={{ marginBottom: 0 }}>Concluídos</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                                            <select className="form-select" style={{ minWidth: 130, background: 'transparent', border: 'none', fontSize: 13 }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                                                <option value="todos">Mês</option>
                                                {MONTH_ORDER.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                            </select>
                                            <select className="form-select" style={{ minWidth: 90, background: 'transparent', border: 'none', fontSize: 13 }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                                                <option value="todos">Ano</option>
                                                {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Pagamento</th>
                                                <th>Descrição</th>
                                                <th>Classificação</th>
                                                <th>Fluxo</th>
                                                <th>Valor</th>
                                                <th style={{ width: 80 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.length === 0 && (
                                                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>Nenhum lançamento concluído.</td></tr>
                                            )}
                                            {filtered.map(item => (
                                                <tr key={item.id}>
                                                    <td>{new Date(item.data_pagamento || item.data_vencimento).toLocaleDateString('pt-BR')}</td>
                                                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.descricao}</td>
                                                    <td>{item.classificacao || '—'}</td>
                                                    <td>
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: item.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                                            {item.tipo === 'entrada' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                                                            {item.tipo === 'entrada' ? 'RE' : 'DP'}
                                                        </span>
                                                    </td>
                                                    <td className={item.tipo === 'entrada' ? 'positive' : 'negative'}>{item.tipo === 'entrada' ? '+' : '-'}{formatCurrency(Number(item.valor))}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            <button className="settings-action-btn" onClick={() => openEditTransaction(item)} title="Editar"><Pencil size={13} /></button>
                                                            <button className="settings-action-btn danger" onClick={() => handleDeleteTransaction(item.id)} title="Excluir"><Trash2 size={13} /></button>
                                                        </div>
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
                        const filtered = transactionsData.filter(item => {
                            if (item.status !== 'pago_recebido') return false;
                            const d = new Date(item.data_pagamento || item.data_vencimento);
                            const itemMonth = String(d.getMonth() + 1).padStart(2, '0');
                            const itemYear = String(d.getFullYear());
                            if (fluxoMonth !== 'todos' && itemMonth !== fluxoMonth) return false;
                            if (fluxoYear !== 'todos' && itemYear !== fluxoYear) return false;
                            return true;
                        }).sort((a, b) => new Date(a.data_pagamento || a.data_vencimento).getTime() - new Date(b.data_pagamento || b.data_vencimento).getTime());

                        let running = 0;
                        const withBalance = filtered.map(item => {
                            if (item.tipo === 'entrada') running += Number(item.valor);
                            else running -= Number(item.valor);
                            return { ...item, balance: running };
                        });

                        const totalE = filtered.filter(i => i.tipo === 'entrada').reduce((a, b) => a + Number(b.valor), 0);
                        const totalS = filtered.filter(i => i.tipo === 'saida').reduce((a, b) => a + Number(b.valor), 0);
                        const net = totalE - totalS;

                        return (
                            <>
                                <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
                                    <div className="kpi-card">
                                        <div className="kpi-card-value" style={{ color: 'var(--success)' }}>{formatCurrency(totalE)}</div>
                                        <div className="kpi-card-label">Total Entradas</div>
                                    </div>
                                    <div className="kpi-card">
                                        <div className="kpi-card-value" style={{ color: 'var(--danger)' }}>{formatCurrency(totalS)}</div>
                                        <div className="kpi-card-label">Total Saídas</div>
                                    </div>
                                    <div className="kpi-card">
                                        <div className="kpi-card-value" style={{ color: net >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(net)}</div>
                                        <div className="kpi-card-label">Saldo do Período</div>
                                    </div>
                                </div>
                                <div className="table-card">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                        <div className="table-card-title" style={{ marginBottom: 0 }}>Fluxo de Caixa Operacional</div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <select className="form-select" value={fluxoMonth} onChange={e => setFluxoMonth(e.target.value)} style={{ minWidth: 120, background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
                                                <option value="todos">Mês</option>
                                                {MONTH_ORDER.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                                            </select>
                                            <select className="form-select" value={fluxoYear} onChange={e => setFluxoYear(e.target.value)} style={{ minWidth: 90, background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
                                                <option value="todos">Ano</option>
                                                {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Descrição</th>
                                                <th>Entrada</th>
                                                <th>Saída</th>
                                                <th>Saldo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {withBalance.length === 0 && (
                                                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>Sem dados para o período.</td></tr>
                                            )}
                                            {withBalance.map(item => (
                                                <tr key={item.id}>
                                                    <td>{new Date(item.data_pagamento || item.data_vencimento).toLocaleDateString('pt-BR')}</td>
                                                    <td>{item.descricao}</td>
                                                    <td className="positive">{item.tipo === 'entrada' ? formatCurrency(Number(item.valor)) : '—'}</td>
                                                    <td className="negative">{item.tipo === 'saida' ? formatCurrency(Number(item.valor)) : '—'}</td>
                                                    <td style={{ fontWeight: 600, color: item.balance >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(item.balance)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        );
                    })()}

                    {/* --- Sub-Aba Impostos --- */}
                    {activeSubTabMovimentacoes === 'impostos' && (() => {
                        const filtered = taxesData.filter(tax => {
                            const d = new Date(tax.data_vencimento);
                            const m = String(d.getMonth() + 1).padStart(2, '0');
                            const y = String(d.getFullYear());
                            if (taxMonthFilter !== 'todos' && m !== taxMonthFilter) return false;
                            if (taxYearFilter !== 'todos' && y !== taxYearFilter) return false;
                            if (taxStatusFilter !== 'todos' && tax.status !== taxStatusFilter) return false;
                            if (taxCategoryFilter !== 'todos' && tax.categoria !== taxCategoryFilter) return false;
                            return true;
                        }).sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());

                        const now = getBahiaDate();
                        const pendingTotal = taxesData.filter(t => t.status !== 'Pago').reduce((s, t) => s + Number(t.valor), 0);
                        const overdueCount = taxesData.filter(t => t.status !== 'Pago' && new Date(t.data_vencimento) < now).length;

                        return (
                            <>
                                <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: 24 }}>
                                    <div className="kpi-card">
                                        <div className="kpi-card-value" style={{ color: 'var(--warning)' }}>{formatCurrency(pendingTotal)}</div>
                                        <div className="kpi-card-label">Total em Aberto</div>
                                    </div>
                                    <div className={`kpi-card ${overdueCount > 0 ? 'kpi-card-alert' : ''}`}>
                                        <div className="kpi-card-value" style={{ color: 'var(--danger)' }}>{overdueCount}</div>
                                        <div className="kpi-card-label">Impostos Vencidos</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
                                    <button className="btn btn-primary" onClick={openAddTax} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Plus size={16} /> Novo Imposto
                                    </button>
                                </div>
                                <div className="table-card">
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                        <div className="table-card-title" style={{ marginBottom: 0 }}>Gestão de Impostos</div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <select className="form-select" value={taxStatusFilter} onChange={e => setTaxStatusFilter(e.target.value)} style={{ minWidth: 120, background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.05)', fontSize: 13 }}>
                                                <option value="todos">Status</option>
                                                <option value="Pendente">Pendente</option>
                                                <option value="Pago">Pago</option>
                                                <option value="Vencido">Vencido</option>
                                            </select>
                                        </div>
                                    </div>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Vencimento</th>
                                                <th>Descrição</th>
                                                <th>Categoria</th>
                                                <th>Competência</th>
                                                <th>Status</th>
                                                <th>Valor</th>
                                                <th style={{ width: 80 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.length === 0 && (
                                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>Nenhum imposto encontrado.</td></tr>
                                            )}
                                            {filtered.map(tax => (
                                                <tr key={tax.id}>
                                                    <td>{new Date(tax.data_vencimento).toLocaleDateString('pt-BR')}</td>
                                                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{tax.descricao}</td>
                                                    <td>{tax.categoria}</td>
                                                    <td>{tax.competencia}</td>
                                                    <td>
                                                        <span style={{
                                                            padding: '4px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                                                            background: tax.status === 'Pago' ? '#10B98122' : '#F59E0B22',
                                                            color: tax.status === 'Pago' ? '#10B981' : '#F59E0B'
                                                        }}>{tax.status}</span>
                                                    </td>
                                                    <td style={{ fontWeight: 600 }}>{formatCurrency(Number(tax.valor))}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            <button className="settings-action-btn" onClick={() => openEditTax(tax)} title="Editar"><Pencil size={13} /></button>
                                                            <button className="settings-action-btn danger" onClick={() => handleDeleteTax(tax.id)} title="Excluir"><Trash2 size={13} /></button>
                                                        </div>
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
                        {activeSubTabPlanejamento === 'metas' && (
                            <MetasPlanejamentoTab
                                goals={goals}
                                setGoals={setGoals}
                                budgetPlan={budgetPlan}
                                setBudgetPlan={setBudgetPlan}
                                formatCurrency={formatCurrency}
                                totalReceitaDRE={totalReceitaDRE}
                                totalDespesasDRE={totalDespesasDRE}
                                despesasByClass={despesasByClass}
                                lucroBrutoDRE={lucroBrutoDRE}
                            />
                        )}
                    </>
                )
            }

            {/* ====== ABA RENTABILIDADE ====== */}
            {activeTab === 'rentabilidade' && (() => {
                const activeClients = clients.filter(c => c.status !== 'Inativo');
                const rentabilityData = activeClients.map(c => {
                    const receita = c.monthly_fee || 0;
                    const custoTotal = (c.hosting_cost || 0) + (c.db_cost || 0) + ((c.hour_value || 0) * (c.operational_hours || 0));
                    const margemBruta = receita - custoTotal;
                    const margemPerc = receita > 0 ? (margemBruta / receita) * 100 : 0;
                    return { id: c.id, name: c.name, receita, custoTotal, margemBruta, margemPerc };
                }).sort((a, b) => b.margemBruta - a.margemBruta);

                const totalR = rentabilityData.reduce((s, c) => s + c.receita, 0);
                const totalC = rentabilityData.reduce((s, c) => s + c.custoTotal, 0);
                const totalM = totalR - totalC;

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                            <div className="kpi-card"><div className="kpi-card-value text-success">{formatCurrency(totalR)}</div><div className="kpi-card-label">Receita Estimada</div></div>
                            <div className="kpi-card"><div className="kpi-card-value text-danger">{formatCurrency(totalC)}</div><div className="kpi-card-label">Custo Operacional</div></div>
                            <div className="kpi-card"><div className="kpi-card-value">{formatCurrency(totalM)}</div><div className="kpi-card-label">Lucro Bruto</div></div>
                        </div>
                        <div className="table-card">
                            <div className="table-card-title">Rentabilidade por Cliente</div>
                            <table className="data-table">
                                <thead><tr><th>Cliente</th><th>Receita</th><th>Custo</th><th>Margem</th><th>%</th></tr></thead>
                                <tbody>
                                    {rentabilityData.map(c => (
                                        <tr key={c.id}>
                                            <td style={{ fontWeight: 500 }}>{c.name}</td>
                                            <td>{formatCurrency(c.receita)}</td>
                                            <td className="negative">-{formatCurrency(c.custoTotal)}</td>
                                            <td style={{ fontWeight: 600 }} className={c.margemBruta >= 0 ? 'positive' : 'negative'}>{formatCurrency(c.margemBruta)}</td>
                                            <td>{c.margemPerc.toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })()}

            {/* ====== MODALS ====== */}
            {transactionModal && (
                <div className="settings-modal-overlay" onClick={() => setTransactionModal(null)}>
                    <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, padding: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{transactionModal.type === 'add' ? 'Nova Movimentação' : 'Editar Movimentação'}</h3>
                            <button onClick={() => setTransactionModal(null)} style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-muted)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifySelf: 'center', cursor: 'pointer', transition: 'all 0.2s', padding: 0, justifyContent: 'center' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)', e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)', e.currentTarget.style.background = 'var(--bg-tertiary)')}><X size={18} /></button>
                        </div>
                        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: 4, borderRadius: 12, border: '1px solid var(--border-default)' }}>
                                <button onClick={() => setFormTipo('saida')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: formTipo === 'saida' ? 'var(--danger)' : 'transparent', color: formTipo === 'saida' ? '#fff' : 'var(--text-muted)', fontWeight: 600, transition: 'all 0.2s', cursor: 'pointer' }}>Saída</button>
                                <button onClick={() => setFormTipo('entrada')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: formTipo === 'entrada' ? 'var(--success)' : 'transparent', color: formTipo === 'entrada' ? '#fff' : 'var(--text-muted)', fontWeight: 600, transition: 'all 0.2s', cursor: 'pointer' }}>Entrada</button>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Descrição</label>
                                <input className="form-input" value={formDescricao} onChange={e => setFormDescricao(e.target.value)} placeholder="Ex: Pagamento Aluguel" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Valor</label>
                                    <input className="form-input" value={formValorDisplay} onChange={handleValorChange} placeholder="R$ 0,00" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Vencimento</label>
                                    <input type="date" className="form-input" value={formDateVencimento} onChange={e => setFormDateVencimento(e.target.value)} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Classificação</label>
                                    <select className="form-select" value={formClassificacao} onChange={e => setFormClassificacao(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {dbTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Categoria</label>
                                    <select className="form-select" value={formCategoria} onChange={e => setFormCategoria(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {dbCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-select" value={formStatus} onChange={e => setFormStatus(e.target.value as any)}>
                                        <option value="pendente">Pendente</option>
                                        <option value="pago_recebido">Pago/Recebido</option>
                                    </select>
                                </div>
                                {formStatus === 'pago_recebido' && (
                                    <div className="form-group">
                                        <label className="form-label">Data Pagamento</label>
                                        <input type="date" className="form-input" value={formDatePagamento} onChange={e => setFormDatePagamento(e.target.value)} />
                                    </div>
                                )}
                            </div>

                            {transactionModal.type === 'add' && (
                                <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setFormIsRecurrente(!formIsRecurrente)}>
                                        <div style={{ width: 18, height: 18, borderRadius: 4, border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: formIsRecurrente ? 'var(--accent)' : 'transparent', transition: 'all 0.2s' }}>
                                            {formIsRecurrente && <Check size={12} color="#fff" />}
                                        </div>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: formIsRecurrente ? 'var(--text-primary)' : 'var(--text-muted)' }}>Repetir Lançamento</span>
                                    </div>

                                    {formIsRecurrente && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                                            <div className="form-group">
                                                <label className="form-label">Frequência</label>
                                                <select className="form-select" style={{ padding: '8px 12px', fontSize: 13 }} value={formRecurrenciaTipo} onChange={e => setFormRecurrenciaTipo(e.target.value as any)}>
                                                    <option value="mensal">Mensal</option>
                                                    <option value="semanal">Semanal</option>
                                                    <option value="anual">Anual</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Ocorrências</label>
                                                <input type="number" className="form-input" style={{ padding: '8px 12px', fontSize: 13 }} min={1} max={60} value={formRecurrenciaQtd} onChange={e => setFormRecurrenciaQtd(parseInt(e.target.value) || 1)} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <button className="btn btn-primary" onClick={handleSaveTransaction} disabled={formSaving} style={{ padding: '14px', width: '100%', marginTop: 8 }}>
                                {formSaving ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={16} className="animate-spin" /> Salvando...</span>
                                ) : (
                                    'Salvar Movimentação'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {taxModal && (
                <div className="settings-modal-overlay" onClick={() => setTaxModal(null)}>
                    <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500, padding: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{taxModal.type === 'add' ? 'Novo Imposto' : 'Editar Imposto'}</h3>
                            <button onClick={() => setTaxModal(null)} style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-muted)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifySelf: 'center', cursor: 'pointer', transition: 'all 0.2s', padding: 0, justifyContent: 'center' }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)', e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)', e.currentTarget.style.background = 'var(--bg-tertiary)')}><X size={18} /></button>
                        </div>
                        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="form-group">
                                <label className="form-label">Descrição</label>
                                <input className="form-input" value={taxDescricao} onChange={e => setTaxDescricao(e.target.value)} placeholder="Ex: Simples Nacional" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Categoria</label>
                                    <input className="form-input" value={taxCategoria} onChange={e => setTaxCategoria(e.target.value)} placeholder="Ex: Federal" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Competência</label>
                                    <input className="form-input" value={taxCompetencia} onChange={e => setTaxCompetencia(e.target.value)} placeholder="Ex: 03/2026" />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Valor</label>
                                    <input className="form-input" value={taxValorDisplay} onChange={e => setTaxValorDisplay(formatCurrencyInput(e.target.value))} placeholder="R$ 0,00" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Vencimento</label>
                                    <input type="date" className="form-input" value={taxVencimento} onChange={e => setTaxVencimento(e.target.value)} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select className="form-select" value={taxStatus} onChange={e => setTaxStatus(e.target.value)}>
                                    <option value="Pendente">Pendente</option>
                                    <option value="Pago">Pago</option>
                                    <option value="Vencido">Vencido</option>
                                </select>
                            </div>

                            <button className="btn btn-primary" onClick={handleSaveTax} disabled={formSaving} style={{ padding: '14px', width: '100%', marginTop: 8 }}>
                                {formSaving ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={16} className="animate-spin" /> Salvando...</span>
                                ) : (
                                    'Salvar Imposto'
                                )}
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

    // Delete confirmation state
    const [deleteConfirmPlan, setDeleteConfirmPlan] = useState<{ isOpen: boolean, targetId: string, type: 'goal' | 'budget', title: string } | null>(null);

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
        setDeleteConfirmPlan({ isOpen: true, targetId: id, type: 'goal', title: 'Excluir Meta' });
    }

    async function processDeleteGoal(id: string) {
        setSaving(true);
        try { await removeGoal(id); setGoals(goals.filter(g => g.id !== id)); setDeleteConfirmPlan(null); } catch (e) { console.error(e); }
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
        setDeleteConfirmPlan({ isOpen: true, targetId: category, type: 'budget', title: `Orçamento de ${category}` });
    }

    async function processDeleteBudgetCategory(category: string) {
        setSaving(true);
        try {
            const items = budgetPlan.filter(b => b.category === category);
            for (const item of items) await removeBudgetPlanItem(item.id);
            setBudgetPlan(budgetPlan.filter(b => b.category !== category));
            setDeleteConfirmPlan(null);
        } catch (e) { console.error(e); }
        setSaving(false);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Delete Confirm Modal Planejamento */}
            {deleteConfirmPlan && deleteConfirmPlan.isOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: 400 }}>
                        <h3>Confirmar Exclusão</h3>
                        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Tem certeza que deseja excluir <b>{deleteConfirmPlan.title}</b>? Esta ação não pode ser desfeita.</p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                            <button className="btn btn-secondary" onClick={() => setDeleteConfirmPlan(null)}>Cancelar</button>
                            <button className="btn btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => {
                                if (deleteConfirmPlan.type === 'goal') processDeleteGoal(deleteConfirmPlan.targetId);
                                if (deleteConfirmPlan.type === 'budget') processDeleteBudgetCategory(deleteConfirmPlan.targetId);
                            }}>Confirmar Exclusão</button>
                        </div>
                    </div>
                </div>
            )}
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
        </div>
    );
}


