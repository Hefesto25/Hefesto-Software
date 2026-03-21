'use client';

import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from 'recharts';
import { Plus, Download, Filter, ArrowUpCircle, ArrowDownCircle, Pencil, Trash2, X, Check, CheckCircle, Clock, AlertTriangle, XCircle, CalendarClock, TrendingUp, TrendingDown, FileDown, Sparkles, Search, Copy, RefreshCw, Receipt, Upload, Calendar, GitMerge } from 'lucide-react';
import {
    useGoals,
    useFinancialTypes, useFinancialCategories,
    useBudgetPlan,
    addGoal, updateGoal, removeGoal,
    addBudgetPlanItem, updateBudgetPlanItem, removeBudgetPlanItem,
    useFinancialTransactions, addFinancialTransaction, updateFinancialTransaction, removeFinancialTransaction,
    useClients, useFinancialTaxes, addFinancialTax, updateFinancialTax, removeFinancialTax,
    useBankImports, saveBankImport, confirmBankImport,
    useAsaasCobranças, addAsaasCobranca, updateAsaasCobrancaStatus, removeAsaasCobranca
} from '@/lib/hooks';
import { formatCurrencyInput, parseCurrencyInput, getBahiaDate, getBahiaDateString, formatLocalSystemDate } from '@/lib/utils';
import type { FinancialGoal, FinancialTransaction, FinancialTax, BankImport, BankImportTransaction, AsaasCobranca } from '@/lib/types';
import { parseOFX, parseSpreadsheet, isDuplicate } from '@/lib/bankParser';
import type { ParsedTransaction } from '@/lib/bankParser';

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

const MONTH_NAMES: Record<string, string> = {
    '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
    '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
    '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro',
    'todos': 'Ano Inteiro'
};

const PIE_COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#06B6D4', '#A78BFA', '#F472B6'];

type Tab = 'painel' | 'movimentacoes' | 'planejamento' | 'faturamento';
type MovFilterQuick = 'todos' | 'futuros' | 'concluidos' | 'recorrentes' | 'impostos';
type LancamentoTipoModal = 'avulso' | 'recorrente' | 'imposto';
type SubTabPlanejamento = 'dre' | 'metas';

export default function FinanceiroPage() {
    const [activeTab, setActiveTab] = useState<Tab>('painel');
    const [movQuickFilter, setMovQuickFilter] = useState<MovFilterQuick>('todos');
    const [movSearch, setMovSearch] = useState('');
    const [activeSubTabPlanejamento, setActiveSubTabPlanejamento] = useState<SubTabPlanejamento>('dre');
    const { data: transactionsData, loading: loadingTransactions, setData: setTransactionsData, refetch: refetchTransactions } = useFinancialTransactions();
    const { data: goalsData, loading: loadingGoals } = useGoals();
    const { data: dbTypes, loading: loadingTypes } = useFinancialTypes();
    const { data: dbCategories, loading: loadingCategories } = useFinancialCategories();
    const { data: budgetPlanData, loading: loadingBudget } = useBudgetPlan();
    const { data: clients, loading: loadingClients } = useClients();
    const { data: taxesData, loading: loadingTaxes, refetch: refetchTaxes } = useFinancialTaxes();

    // Controle de Faturamento
    const [fatMesAno, setFatMesAno] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [fatStatusFiltro, setFatStatusFiltro] = useState<'todos' | AsaasCobranca['status']>('todos');
    const { data: cobranças, loading: loadingCobranças, refetch: refetchCobranças } = useAsaasCobranças(fatMesAno);
    const [showNovaCobrancaModal, setShowNovaCobrancaModal] = useState(false);
    const [cobrancaForm, setCobrancaForm] = useState<Partial<AsaasCobranca>>({ status: 'pendente', data_emissao: new Date().toISOString().slice(0, 10) });
    const [cobrancaFormError, setCobrancaFormError] = useState('');
    const [savingCobranca, setSavingCobranca] = useState(false);

    const [goals, setGoals] = useState<FinancialGoal[]>([]);
    const [budgetPlan, setBudgetPlan] = useState<any[]>([]);

    useEffect(() => { if (goalsData.length) setGoals(goalsData); }, [goalsData]);
    useEffect(() => { if (budgetPlanData.length) setBudgetPlan(budgetPlanData); }, [budgetPlanData]);

    // Dashboard filters
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const currentYear = String(new Date().getFullYear());

    const [dashMonth, setDashMonth] = useState<string>(currentMonth);
    const [dashYear, setDashYear] = useState<string>(currentYear);
    const [dashCategoria, setDashCategoria] = useState<string>('todos');

    // Unified Movimentações filters
    const [movMonth, setMovMonth] = useState<string>(currentMonth);
    const [movYear, setMovYear] = useState<string>(currentYear);
    const [movCategoria, setMovCategoria] = useState<string>('todos');

    // Modal state
    type TransactionModalState = { type: 'add' } | { type: 'edit'; transaction: FinancialTransaction } | { type: 'edit_tax'; tax: FinancialTax } | null;
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

    // DRE specific states
    const [dreMonth1, setDreMonth1] = useState<string>(currentMonth);
    const [dreYear1, setDreYear1] = useState<string>(currentYear);
    const [dreMonth2, setDreMonth2] = useState<string>(''); // For comparison
    const [dreYear2, setDreYear2] = useState<string>('');
    const [dreIsComparative, setDreIsComparative] = useState(false);
    const [dreIsAccumulated, setDreIsAccumulated] = useState(false);
    const [formIsRecurrente, setFormIsRecurrente] = useState(false);
    const [formRecurrenciaTipo, setFormRecurrenciaTipo] = useState<'mensal' | 'semanal' | 'anual'>('mensal');
    const [formRecurrenciaQtd, setFormRecurrenciaQtd] = useState(1);
    const [formLancamentoTipo, setFormLancamentoTipo] = useState<LancamentoTipoModal>('avulso');
    const [formCompetencia, setFormCompetencia] = useState('');
    const [formError, setFormError] = useState('');

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

    // Bank Import states
    const { imports: bankImports } = useBankImports();
    const [bankImportModal, setBankImportModal] = useState<{
        isOpen: boolean;
        banco: BankImport['banco'] | null;
        formato: BankImport['formato'] | null;
        parsedTransactions: ParsedTransaction[];
        importTransactions: BankImportTransaction[];
        importId: string | null;
        selectedIds: Set<number>;
        saving: boolean;
    }>({
        isOpen: false, banco: null, formato: null,
        parsedTransactions: [], importTransactions: [],
        importId: null, selectedIds: new Set(), saving: false,
    });
    const [bankImportError, setBankImportError] = useState('');
    const [bankImportLoading, setBankImportLoading] = useState(false);

    // Date range filter for Movimentações
    const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
    const [showDateRangeModal, setShowDateRangeModal] = useState(false);
    const [dateRangeFrom, setDateRangeFrom] = useState('');
    const [dateRangeTo, setDateRangeTo] = useState('');

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

    // ─── Bank Import handlers ───────────────────────────────────────────────────

    async function handleBankFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setBankImportError('');
        setBankImportLoading(true);

        try {
            const ext = file.name.split('.').pop()?.toLowerCase();
            const formato: BankImport['formato'] = ext === 'ofx' ? 'ofx' : (ext === 'csv' ? 'csv' : 'xlsx');

            let parsed: ParsedTransaction[] = [];

            if (formato === 'ofx') {
                parsed = await parseOFX(file);
            } else {
                parsed = await parseSpreadsheet(file);
            }

            if (parsed.length === 0) {
                setBankImportError('Nenhuma transação encontrada no arquivo. Verifique se é um extrato válido do Santander ou Mercado Pago.');
                setBankImportLoading(false);
                return;
            }

            // Detect bank from filename or content
            const nameLower = file.name.toLowerCase();
            const banco: BankImport['banco'] = nameLower.includes('mercado') || nameLower.includes('mp')
                ? 'mercado_pago' : 'santander';

            const { importId, importTransactions } = await saveBankImport(banco, formato, parsed);

            // Mark duplicates
            const withDuplicates = importTransactions.map((tx, i) => ({
                ...tx,
                status_reconciliacao: isDuplicate(parsed[i], transactionsData)
                    ? 'duplicado' as const
                    : 'novo' as const,
            }));

            setBankImportModal({
                isOpen: true, banco, formato,
                parsedTransactions: parsed,
                importTransactions: withDuplicates,
                importId,
                selectedIds: new Set(withDuplicates.map((_, i) => i).filter(i => withDuplicates[i].status_reconciliacao !== 'duplicado')),
                saving: false,
            });
        } catch (err) {
            setBankImportError('Erro ao processar arquivo: ' + (err instanceof Error ? err.message : String(err)));
        } finally {
            setBankImportLoading(false);
            e.target.value = '';
        }
    }

    async function handleConfirmBankImport() {
        if (!bankImportModal.importId) return;
        setBankImportModal(prev => ({ ...prev, saving: true }));

        try {
            const selected = bankImportModal.importTransactions.filter((_, i) =>
                bankImportModal.selectedIds.has(i)
            );
            await confirmBankImport(bankImportModal.importId, selected, transactionsData);
            refetchTransactions();
            setBankImportModal(prev => ({ ...prev, isOpen: false, saving: false }));
        } catch (err) {
            setBankImportError('Erro ao confirmar importação: ' + (err instanceof Error ? err.message : String(err)));
            setBankImportModal(prev => ({ ...prev, saving: false }));
        }
    }

    // ─── Date range filter handler ──────────────────────────────────────────────

    function applyDateRange() {
        if (!dateRangeFrom || !dateRangeTo) return;
        setDateRange({ from: dateRangeFrom, to: dateRangeTo });
        setShowDateRangeModal(false);
    }

    function clearDateRange() {
        setDateRange(null);
        setDateRangeFrom('');
        setDateRangeTo('');
        setShowDateRangeModal(false);
    }

    function openAddTransaction(defaultTipo?: LancamentoTipoModal) {
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
        setFormLancamentoTipo(defaultTipo || 'avulso');
        setFormCompetencia('');
        setFormError('');
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
        setFormLancamentoTipo(t.grupo_recorrencia ? 'recorrente' : 'avulso');
        setFormCompetencia('');
        setFormError('');
        setTransactionModal({ type: 'edit', transaction: t });
    }

    function openEditTaxAsTransaction(tax: FinancialTax) {
        setFormDescricao(tax.descricao);
        setFormValorDisplay(formatCurrency(Number(tax.valor)).replace('R$', '').trim());
        setFormCategoria(tax.categoria);
        setFormDateVencimento(tax.data_vencimento);
        setFormDatePagamento(tax.data_pagamento || '');
        setFormStatus(tax.status === 'Pago' ? 'pago_recebido' : 'pendente');
        setFormLancamentoTipo('imposto');
        setFormCompetencia(tax.competencia);
        setFormTipo('saida');
        setFormClassificacao('');
        setFormError('');
        setTransactionModal({ type: 'edit_tax', tax });
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
        setFormError('');
        const valor = parseValorDisplay(formValorDisplay);
        if (valor < 0) {
            setFormError('Valores negativos não são permitidos.');
            return;
        }
        if (valor === 0) {
            setFormError('Por favor, informe um valor maior que zero.');
            return;
        }

        if (!formDescricao.trim()) {
            setFormError('Por favor, preencha a descrição.');
            return;
        }

        if (formLancamentoTipo === 'imposto' && !formCompetencia.trim()) {
            setFormError('Por favor, informe a competência do imposto.');
            return;
        }

        setFormSaving(true);
        try {

            // Handle Imposto type — save to financial_taxes table
            if (formLancamentoTipo === 'imposto') {
                const taxData: Omit<FinancialTax, 'id' | 'created_at'> = {
                    descricao: formDescricao.trim(),
                    categoria: formCategoria || '',
                    competencia: formCompetencia || '',
                    data_vencimento: formDateVencimento,
                    data_pagamento: formStatus === 'pago_recebido' ? (formDatePagamento || formDateVencimento) : null,
                    valor,
                    status: formStatus === 'pago_recebido' ? 'Pago' : 'Pendente',
                };
                if (transactionModal?.type === 'edit_tax') {
                    await updateFinancialTax(transactionModal.tax.id, taxData);
                } else {
                    await addFinancialTax(taxData);
                }
                refetchTaxes();
            } else if (transactionModal?.type === 'add') {
                // Handle Recorrente type
                if (formLancamentoTipo === 'recorrente') {
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
                    // Avulso
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
                refetchTransactions();
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
                refetchTransactions();
            }

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
    // Helper: calculate DRE data for a given month/year
    const calculateDREData = (month: string, year: string, isAccumulated: boolean) => {
        const filteredTransactions = transactionsData.filter(item => {
            const dateStr = item.data_pagamento || item.data_vencimento;
            const [itemYear, itemMonth] = dateStr.split('-');
            if (isAccumulated) {
                return itemYear === year && (month === 'todos' ? true : itemMonth <= month);
            }
            return itemYear === year && (month === 'todos' || itemMonth === month);
        });

        const filteredTaxes = taxesData.filter(item => {
            const dateStr = item.data_pagamento || item.data_vencimento;
            const [itemYear, itemMonth] = dateStr.split('-');
            if (isAccumulated) {
                return itemYear === year && (month === 'todos' ? true : itemMonth <= month);
            }
            return itemYear === year && (month === 'todos' || itemMonth === month);
        });

        const receitaBruta = filteredTransactions
            .filter(i => i.tipo === 'entrada' && i.classificacao === 'Receitas')
            .reduce((s, i) => s + Number(i.valor), 0);

        const deducoes = filteredTaxes.reduce((s, i) => s + Number(i.valor), 0);
        const receitaLiquida = receitaBruta - deducoes;

        const custosFixos = filteredTransactions
            .filter(i => i.tipo === 'saida' && i.classificacao === 'Custos Fixos')
            .reduce((s, i) => s + Number(i.valor), 0);
        const custosVariaveis = filteredTransactions
            .filter(i => i.tipo === 'saida' && i.classificacao === 'Custos Variáveis')
            .reduce((s, i) => s + Number(i.valor), 0);
        const totalCustos = custosFixos + custosVariaveis;

        const margemContribuicao = receitaLiquida - totalCustos;

        // Group despesas by category
        const despesasByCategory: Record<string, number> = {};
        const despesaTypes = ['Despesas Fixas', 'Despesas Variáveis', 'Gastos'];
        filteredTransactions
            .filter(i => i.tipo === 'saida' && despesaTypes.includes(i.classificacao || ''))
            .forEach(i => {
                const cat = i.categoria || 'Gastos Diversos / Outros';
                despesasByCategory[cat] = (despesasByCategory[cat] || 0) + Number(i.valor);
            });

        const totalDespesas = Object.values(despesasByCategory).reduce((a, b) => a + b, 0);
        const ebit = margemContribuicao - totalDespesas;

        return {
            receitaBruta,
            deducoes,
            receitaLiquida,
            custosFixos,
            custosVariaveis,
            totalCustos,
            margemContribuicao,
            despesasByCategory,
            totalDespesas,
            ebit
        };
    };

    const tabs: { key: Tab; label: string }[] = [
        { key: 'painel', label: 'Painel' },
        { key: 'movimentacoes', label: 'Movimentações' },
        { key: 'planejamento', label: 'Planejamento' },
        { key: 'faturamento', label: 'Controle de Faturamento' },
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

                const filteredPending = transactionsData.filter(item => {
                    if (item.status !== 'pendente') return false;
                    const dateParts = item.data_vencimento.split('-');
                    const itemYear = dateParts[0];
                    const itemMonth = dateParts[1];
                    if (dashMonth !== 'todos' && itemMonth !== dashMonth) return false;
                    if (dashYear !== 'todos' && itemYear !== dashYear) return false;
                    return true;
                });

                const vencidosCount = filteredPending.filter((t: any) => t.data_vencimento < today).length;

                const inadimplencia = filteredPending
                    .filter((a: any) => a.tipo === 'entrada' && a.data_vencimento < today)
                    .reduce((s: number, a: any) => s + Number(a.valor), 0);

                const contasPagar30d = filteredPending
                    .filter((a: any) => a.tipo === 'saida' && a.data_vencimento >= today && a.data_vencimento <= in30days)
                    .reduce((s: number, a: any) => s + Number(a.valor), 0);

                const filterA_receber_pendente = filteredPending
                    .filter((a: any) => a.tipo === 'entrada')
                    .reduce((s: number, a: any) => s + Number(a.valor), 0);

                const filterA_pagar_pendente = filteredPending
                    .filter((a: any) => a.tipo === 'saida')
                    .reduce((s: number, a: any) => s + Number(a.valor), 0);

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
                    const abbr = MONTH_ABBR[monthKey];
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
                                    <option value="todos">Ano Inteiro</option>
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

                        {/* Bank Reconciliation Card */}
                        {bankImports.length > 0 && (() => {
                            const lastImport = bankImports[0];
                            const pendingTransactions = transactionsData.filter(t => t.status === 'pendente').length;
                            return (
                                <div className="kpi-card" style={{ marginBottom: 24, borderColor: lastImport.total_conciliadas > 0 ? '#8B5CF644' : 'rgba(255,255,255,0.05)', background: 'rgba(139,92,246,0.04)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <GitMerge size={20} style={{ color: '#8B5CF6' }} />
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Última Conciliação Bancária</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                                    {lastImport.banco === 'mercado_pago' ? 'Mercado Pago' : 'Santander'} · {lastImport.formato.toUpperCase()} · {new Date(lastImport.data_importacao).toLocaleDateString('pt-BR')}
                                                    {lastImport.periodo_inicio && lastImport.periodo_fim && (
                                                        <> · Período: {lastImport.periodo_inicio.split('-').reverse().join('/')} – {lastImport.periodo_fim.split('-').reverse().join('/')}</>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 22, fontWeight: 700, color: '#10B981' }}>{lastImport.total_conciliadas}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>conciliadas</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 22, fontWeight: 700, color: '#F59E0B' }}>{lastImport.total_transacoes - lastImport.total_conciliadas}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>não encontradas</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: 22, fontWeight: 700, color: pendingTransactions > 0 ? 'var(--warning)' : 'var(--success)' }}>{pendingTransactions}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>lançamentos pendentes</div>
                                            </div>
                                            <button
                                                onClick={() => { setActiveTab('movimentacoes'); if (lastImport.periodo_inicio && lastImport.periodo_fim) { setDateRangeFrom(lastImport.periodo_inicio); setDateRangeTo(lastImport.periodo_fim); setDateRange({ from: lastImport.periodo_inicio, to: lastImport.periodo_fim }); } }}
                                                style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #8B5CF644', background: '#8B5CF611', color: '#8B5CF6', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
                                            >
                                                Ver detalhes
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

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

            {/* ====== ABA MOVIMENTAÇÕES UNIFICADA ====== */}
            {activeTab === 'movimentacoes' && (() => {
                const today = getBahiaDateString();
                const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

                // Build unified items from transactions + taxes
                type UnifiedItem = {
                    id: string;
                    source: 'transaction' | 'tax';
                    descricao: string;
                    valor: number;
                    tipo: 'entrada' | 'saida';
                    data_vencimento: string;
                    data_pagamento: string | null;
                    status: string;
                    classificacao?: string;
                    categoria?: string;
                    isRecorrente: boolean;
                    recorrencia?: string;
                    isImposto: boolean;
                    competencia?: string;
                    rawTransaction?: FinancialTransaction;
                    rawTax?: FinancialTax;
                };

                const unifiedItems: UnifiedItem[] = [
                    ...transactionsData.map(t => ({
                        id: t.id,
                        source: 'transaction' as const,
                        descricao: t.descricao,
                        valor: Number(t.valor),
                        tipo: t.tipo,
                        data_vencimento: t.data_vencimento,
                        data_pagamento: t.data_pagamento,
                        status: t.status,
                        classificacao: t.classificacao,
                        categoria: t.categoria,
                        isRecorrente: !!t.grupo_recorrencia,
                        recorrencia: t.recorrencia,
                        isImposto: false,
                        rawTransaction: t,
                    })),
                    ...taxesData.map(t => ({
                        id: `tax_${t.id}`,
                        source: 'tax' as const,
                        descricao: t.descricao,
                        valor: Number(t.valor),
                        tipo: 'saida' as const,
                        data_vencimento: t.data_vencimento,
                        data_pagamento: t.data_pagamento,
                        status: t.status === 'Pago' ? 'pago_recebido' : 'pendente',
                        classificacao: undefined,
                        categoria: t.categoria,
                        isRecorrente: false,
                        isImposto: true,
                        competencia: t.competencia,
                        rawTax: t,
                    })),
                ];

                // Apply quick filter
                let filtered = unifiedItems;
                if (movQuickFilter === 'futuros') filtered = filtered.filter(i => i.status !== 'pago_recebido' && !i.isImposto);
                else if (movQuickFilter === 'concluidos') filtered = filtered.filter(i => i.status === 'pago_recebido' && !i.isImposto);
                else if (movQuickFilter === 'recorrentes') filtered = filtered.filter(i => i.isRecorrente);
                else if (movQuickFilter === 'impostos') filtered = filtered.filter(i => i.isImposto);

                // Apply period filter (date range takes priority over month/year)
                if (dateRange) {
                    filtered = filtered.filter(item => {
                        const d = item.data_vencimento;
                        return d >= dateRange.from && d <= dateRange.to;
                    });
                } else if (movMonth !== 'todos' || movYear !== 'todos') {
                    filtered = filtered.filter(item => {
                        const dateParts = item.data_vencimento.split('-');
                        const itemYear = dateParts[0];
                        const itemMonth = dateParts[1];
                        if (movMonth !== 'todos' && itemMonth !== movMonth) return false;
                        if (movYear !== 'todos' && itemYear !== movYear) return false;
                        return true;
                    });
                }

                // Apply categoria filter
                if (movCategoria !== 'todos') {
                    filtered = filtered.filter(i => i.categoria === movCategoria);
                }

                // Apply search
                if (movSearch.trim()) {
                    const search = movSearch.toLowerCase();
                    filtered = filtered.filter(i => i.descricao.toLowerCase().includes(search) || (i.categoria || '').toLowerCase().includes(search));
                }

                // Sort by date (most recent first for completed, soonest first for pending)
                filtered.sort((a, b) => {
                    const dateA = a.status === 'pago_recebido' ? (a.data_pagamento || a.data_vencimento) : a.data_vencimento;
                    const dateB = b.status === 'pago_recebido' ? (b.data_pagamento || b.data_vencimento) : b.data_vencimento;
                    return new Date(dateA).getTime() - new Date(dateB).getTime();
                });

                // Summary calculations
                const pendingItems = filtered.filter(i => i.status !== 'pago_recebido');
                const completedItems = filtered.filter(i => i.status === 'pago_recebido');
                const totalPrevisto = pendingItems.reduce((s, i) => s + i.valor, 0);
                const totalRealizado = completedItems.reduce((s, i) => s + i.valor, 0);
                const saldoRealizado = completedItems.filter(i => i.tipo === 'entrada').reduce((s, i) => s + i.valor, 0) - completedItems.filter(i => i.tipo === 'saida').reduce((s, i) => s + i.valor, 0);
                const proxRecorrencias = filtered.filter((i: any) => i.isRecorrente && i.status !== 'pago_recebido').length;

                // All unique categories for filter
                const allCategories = Array.from(new Set(unifiedItems.map(i => i.categoria).filter(Boolean))).sort();

                // Type badge helper
                function TypeBadge({ item }: { item: UnifiedItem }) {
                    if (item.isImposto) return <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', background: '#EC489922', color: '#EC4899' }}>IMPOSTO</span>;
                    if (item.isRecorrente) return <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', background: '#8B5CF622', color: '#8B5CF6' }}>RECORRENTE</span>;
                    return <span style={{ padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', background: '#3B82F622', color: '#3B82F6' }}>AVULSO</span>;
                }

                function StatusBadge({ item }: { item: UnifiedItem }) {
                    const isPaid = item.status === 'pago_recebido';
                    const isOverdue = !isPaid && item.data_vencimento < today;
                    const isDueSoon = !isPaid && !isOverdue && item.data_vencimento <= in30days;
                    if (isPaid) return <span className="status-badge success">Pago</span>;
                    if (isOverdue) return <span className="status-badge" style={{ background: '#EF444422', color: '#EF4444' }}>Vencido</span>;
                    if (isDueSoon) return <span className="status-badge warning">Próximo</span>;
                    return <span className="status-badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}>Pendente</span>;
                }

                const quickFilters: { key: MovFilterQuick; label: string }[] = [
                    { key: 'todos', label: 'Todos' },
                    { key: 'futuros', label: 'Futuros' },
                    { key: 'concluidos', label: 'Concluídos' },
                    { key: 'recorrentes', label: 'Recorrentes' },
                    { key: 'impostos', label: 'Impostos' },
                ];

                async function handleQuickPay(item: UnifiedItem) {
                    try {
                        if (item.source === 'tax' && item.rawTax) {
                            await updateFinancialTax(item.rawTax.id, { ...item.rawTax, status: 'Pago', data_pagamento: getBahiaDateString() });
                            refetchTaxes();
                        } else if (item.rawTransaction) {
                            await updateFinancialTransaction(item.rawTransaction.id, { status: 'pago_recebido', data_pagamento: getBahiaDateString() });
                            refetchTransactions();
                        }
                    } catch (e) { console.error(e); }
                }

                async function handleDuplicate(item: UnifiedItem) {
                    try {
                        if (item.source === 'tax' && item.rawTax) {
                            await addFinancialTax({ descricao: item.rawTax.descricao, categoria: item.rawTax.categoria, competencia: item.rawTax.competencia, data_vencimento: getBahiaDateString(), data_pagamento: null, valor: item.rawTax.valor, status: 'Pendente' });
                            refetchTaxes();
                        } else if (item.rawTransaction) {
                            const t = item.rawTransaction;
                            await addFinancialTransaction({ descricao: t.descricao, tipo: t.tipo, valor: Number(t.valor), data_vencimento: getBahiaDateString(), data_pagamento: null, status: 'pendente', classificacao: t.classificacao, categoria: t.categoria });
                            refetchTransactions();
                        }
                    } catch (e) { console.error(e); }
                }

                function handleEdit(item: UnifiedItem) {
                    if (item.source === 'tax' && item.rawTax) openEditTaxAsTransaction(item.rawTax);
                    else if (item.rawTransaction) openEditTransaction(item.rawTransaction);
                }

                function handleDelete(item: UnifiedItem) {
                    if (item.source === 'tax' && item.rawTax) {
                        setDeleteConfirm({ isOpen: true, targetId: item.rawTax.id, type: 'tax', title: item.descricao });
                    } else {
                        setDeleteConfirm({ isOpen: true, targetId: item.rawTransaction!.id, type: 'transaction', title: item.descricao });
                    }
                }

                return (
                    <>
                        {/* Summary KPIs */}
                        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
                            <div className="kpi-card">
                                <div className="kpi-card-value" style={{ color: 'var(--warning)' }}>{formatCurrency(totalPrevisto)}</div>
                                <div className="kpi-card-label">Total Previsto (Pendente)</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-card-value" style={{ color: 'var(--success)' }}>{formatCurrency(totalRealizado)}</div>
                                <div className="kpi-card-label">Total Realizado</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-card-value" style={{ color: saldoRealizado >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(saldoRealizado)}</div>
                                <div className="kpi-card-label">Saldo Realizado</div>
                            </div>
                            <div className="kpi-card">
                                <div className="kpi-card-value" style={{ color: '#8B5CF6' }}>{proxRecorrencias}</div>
                                <div className="kpi-card-label">Recorrências no Período</div>
                            </div>
                        </div>

                        {/* Filter Bar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
                            {/* Quick Filter Pills */}
                            <div style={{ display: 'flex', gap: 6, padding: 4, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                                {quickFilters.map(f => (
                                    <button
                                        key={f.key}
                                        onClick={() => setMovQuickFilter(f.key)}
                                        style={{
                                            padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer',
                                            borderRadius: 8, transition: 'all 0.2s',
                                            background: movQuickFilter === f.key ? 'rgba(255,255,255,0.1)' : 'transparent',
                                            color: movQuickFilter === f.key ? 'var(--text-primary)' : 'var(--text-muted)',
                                        }}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                                {/* Bank import button */}
                                <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', cursor: bankImportLoading ? 'wait' : 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', transition: 'all 0.2s', opacity: bankImportLoading ? 0.6 : 1 }}>
                                    <Upload size={14} />
                                    {bankImportLoading ? 'Processando...' : 'Importar Extrato'}
                                    <input
                                        type="file"
                                        accept=".ofx,.csv,.xlsx"
                                        style={{ display: 'none' }}
                                        onChange={handleBankFileUpload}
                                        disabled={bankImportLoading}
                                    />
                                </label>
                                <button className="btn btn-primary" onClick={() => openAddTransaction()} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Plus size={16} /> Novo Lançamento
                                </button>
                            </div>
                        </div>

                        {/* Bank import error */}
                        {bankImportError && (
                            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: '#EF444422', border: '1px solid #EF444444', color: '#EF4444', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                {bankImportError}
                                <button onClick={() => setBankImportError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444' }}><X size={14} /></button>
                            </div>
                        )}

                        {/* Search + Period + Categoria */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', flex: '1 1 250px', maxWidth: 350 }}>
                                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    className="form-input"
                                    placeholder="Buscar por descrição ou categoria..."
                                    value={movSearch}
                                    onChange={e => setMovSearch(e.target.value)}
                                    style={{ paddingLeft: 34, fontSize: 13 }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                                <select className="form-select" style={{ minWidth: 120, background: 'transparent', border: 'none', fontSize: 13, opacity: dateRange ? 0.4 : 1 }} value={movMonth} onChange={e => { setMovMonth(e.target.value); setDateRange(null); }}>
                                    <option value="todos">Ano Inteiro</option>
                                    {MONTH_ORDER.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                </select>
                                <select className="form-select" style={{ minWidth: 90, background: 'transparent', border: 'none', fontSize: 13, opacity: dateRange ? 0.4 : 1 }} value={movYear} onChange={e => { setMovYear(e.target.value); setDateRange(null); }}>
                                    <option value="todos">Ano</option>
                                    {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <select className="form-select" style={{ minWidth: 130, background: 'transparent', border: 'none', fontSize: 13 }} value={movCategoria} onChange={e => setMovCategoria(e.target.value)}>
                                    <option value="todos">Categoria</option>
                                    {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                {/* Date range filter button */}
                                <button
                                    onClick={() => setShowDateRangeModal(true)}
                                    title="Filtrar por período"
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: dateRange ? '1px solid #8B5CF6' : '1px solid rgba(255,255,255,0.08)', background: dateRange ? '#8B5CF622' : 'transparent', color: dateRange ? '#8B5CF6' : 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontWeight: dateRange ? 600 : 400 }}
                                >
                                    <Calendar size={13} />
                                    {dateRange ? `${dateRange.from.split('-').reverse().join('/')} – ${dateRange.to.split('-').reverse().join('/')}` : 'Período'}
                                </button>
                            </div>
                        </div>

                        {/* ── Date Range Modal ── */}
                        {showDateRangeModal && (
                            <div className="modal-overlay" onClick={() => setShowDateRangeModal(false)}>
                                <div className="modal-container" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                                    <div className="modal-header">
                                        <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={16} /> Filtrar por Período</h3>
                                        <button className="modal-close" onClick={() => setShowDateRangeModal(false)}><X size={18} /></button>
                                    </div>
                                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div className="form-group">
                                            <label className="form-label">De</label>
                                            <input type="date" className="form-input" value={dateRangeFrom} onChange={e => setDateRangeFrom(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Até</label>
                                            <input type="date" className="form-input" value={dateRangeTo} onChange={e => setDateRangeTo(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button className="btn btn-secondary" onClick={clearDateRange}>Limpar Filtro</button>
                                        <button className="btn btn-primary" onClick={applyDateRange} disabled={!dateRangeFrom || !dateRangeTo}>Aplicar Filtro</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Bank Import Review Modal ── */}
                        {bankImportModal.isOpen && (
                            <div className="modal-overlay">
                                <div className="modal-container" style={{ maxWidth: 820, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                                    <div className="modal-header">
                                        <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <GitMerge size={16} />
                                            Revisar Extrato — {bankImportModal.banco === 'mercado_pago' ? 'Mercado Pago' : 'Santander'}
                                            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
                                                ({bankImportModal.selectedIds.size} de {bankImportModal.importTransactions.length} selecionadas)
                                            </span>
                                        </h3>
                                        <button className="modal-close" onClick={() => setBankImportModal(prev => ({ ...prev, isOpen: false }))}><X size={18} /></button>
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
                                        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                                            Selecione as transações que deseja importar. Itens marcados como <span style={{ color: '#F59E0B', fontWeight: 600 }}>Duplicado</span> já existem no sistema.
                                        </p>
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: 32 }}>
                                                        <input type="checkbox"
                                                            checked={bankImportModal.selectedIds.size === bankImportModal.importTransactions.filter(t => t.status_reconciliacao !== 'duplicado').length}
                                                            onChange={e => {
                                                                const nonDupIndexes = bankImportModal.importTransactions.map((t, i) => t.status_reconciliacao !== 'duplicado' ? i : -1).filter(i => i >= 0);
                                                                setBankImportModal(prev => ({ ...prev, selectedIds: e.target.checked ? new Set(nonDupIndexes) : new Set() }));
                                                            }}
                                                        />
                                                    </th>
                                                    <th>Data</th>
                                                    <th>Descrição</th>
                                                    <th>Categoria</th>
                                                    <th>Tipo</th>
                                                    <th>Fluxo</th>
                                                    <th>Valor</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bankImportModal.importTransactions.map((tx, i) => (
                                                    <tr key={i} style={{ opacity: bankImportModal.selectedIds.has(i) ? 1 : 0.5 }}>
                                                        <td>
                                                            <input type="checkbox"
                                                                checked={bankImportModal.selectedIds.has(i)}
                                                                onChange={e => {
                                                                    const next = new Set(bankImportModal.selectedIds);
                                                                    if (e.target.checked) next.add(i); else next.delete(i);
                                                                    setBankImportModal(prev => ({ ...prev, selectedIds: next }));
                                                                }}
                                                            />
                                                        </td>
                                                        <td style={{ fontSize: 12 }}>{tx.data.split('-').reverse().join('/')}</td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                className="form-input"
                                                                style={{ padding: '6px 10px', fontSize: 13, width: '100%', minWidth: 200 }}
                                                                value={tx.descricao}
                                                                onChange={e => {
                                                                    const next = [...bankImportModal.importTransactions];
                                                                    next[i].descricao = e.target.value;
                                                                    setBankImportModal(prev => ({ ...prev, importTransactions: next }));
                                                                }}
                                                            />
                                                        </td>
                                                        <td>
                                                            <select
                                                                className="form-select"
                                                                style={{ padding: '6px 10px', fontSize: 13, width: '100%', minWidth: 120 }}
                                                                value={tx.categoria || ''}
                                                                onChange={e => {
                                                                    const next = [...bankImportModal.importTransactions];
                                                                    next[i].categoria = e.target.value;
                                                                    setBankImportModal(prev => ({ ...prev, importTransactions: next }));
                                                                }}
                                                            >
                                                                <option value="" disabled>Selecione...</option>
                                                                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <select
                                                                className="form-select"
                                                                style={{ padding: '6px 10px', fontSize: 13, width: '100%', minWidth: 110 }}
                                                                value={tx.tipo_lancamento || 'avulso'}
                                                                onChange={e => {
                                                                    const next = [...bankImportModal.importTransactions];
                                                                    next[i].tipo_lancamento = e.target.value as any;
                                                                    setBankImportModal(prev => ({ ...prev, importTransactions: next }));
                                                                }}
                                                            >
                                                                <option value="avulso">Avulso</option>
                                                                <option value="recorrente">Recorrente</option>
                                                                <option value="imposto">Imposto</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <span style={{ color: tx.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)', fontSize: 12 }}>
                                                                {tx.tipo === 'entrada' ? '↑ Entrada' : '↓ Saída'}
                                                            </span>
                                                        </td>
                                                        <td className={tx.tipo === 'entrada' ? 'positive' : 'negative'} style={{ fontWeight: 600 }}>
                                                            {tx.tipo === 'entrada' ? '+' : '-'}{formatCurrency(tx.valor)}
                                                        </td>
                                                        <td>
                                                            {tx.status_reconciliacao === 'duplicado'
                                                                ? <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#F59E0B22', color: '#F59E0B' }}>DUPLICADO</span>
                                                                : <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, background: '#10B98122', color: '#10B981' }}>NOVO</span>
                                                            }
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="modal-footer">
                                        <button className="btn btn-secondary" onClick={() => setBankImportModal(prev => ({ ...prev, isOpen: false }))}>Cancelar</button>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleConfirmBankImport}
                                            disabled={bankImportModal.saving || bankImportModal.selectedIds.size === 0}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                                        >
                                            {bankImportModal.saving ? <RefreshCw size={14} className="spin" /> : <Check size={14} />}
                                            {bankImportModal.saving ? 'Importando...' : `Confirmar ${bankImportModal.selectedIds.size} Transações`}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Unified Table */}
                        <div className="table-card">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <div className="table-card-title" style={{ marginBottom: 0 }}>
                                    {dateRange
                                        ? `Período: ${dateRange.from.split('-').reverse().join('/')} – ${dateRange.to.split('-').reverse().join('/')}`
                                        : movQuickFilter === 'todos' ? 'Todas as Movimentações' : movQuickFilter === 'futuros' ? 'Lançamentos Futuros' : movQuickFilter === 'concluidos' ? 'Lançamentos Concluídos' : movQuickFilter === 'recorrentes' ? 'Recorrências' : 'Impostos'}
                                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 13, marginLeft: 8 }}>({filtered.length})</span>
                                </div>
                            </div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Descrição</th>
                                        <th>Tipo</th>
                                        <th>Status</th>
                                        <th>Categoria</th>
                                        <th>Fluxo</th>
                                        <th>Valor</th>
                                        <th style={{ width: 120 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 && (
                                        <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>Nenhum lançamento encontrado.</td></tr>
                                    )}
                                    {(() => {
                                        let lastMonthStr = '';
                                        const showHeaders = movMonth === 'todos' || dateRange !== null;
                                        
                                        return filtered.map((item) => {
                                            const itemDate = item.status === 'pago_recebido' && item.data_pagamento ? item.data_pagamento : item.data_vencimento;
                                            const d = new Date(`${itemDate}T12:00:00`);
                                            const monthStr = `${MONTH_NAMES[String(d.getMonth() + 1).padStart(2, '0')]} ${d.getFullYear()}`;
                                            
                                            const renderHeader = showHeaders && lastMonthStr !== monthStr;
                                            if (renderHeader) lastMonthStr = monthStr;
                                            
                                            return (
                                                <tr key={item.id} style={{ display: 'table-row' }}>
                                                    {renderHeader ? (
                                                        <td colSpan={8} style={{ padding: 0 }}>
                                                            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', fontWeight: 600, color: 'var(--text-secondary)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', marginTop: 8 }}>
                                                                {monthStr}
                                                            </div>
                                                            <div style={{ display: 'table', width: '100%' }}>
                                                                <table className="data-table" style={{ border: 'none', margin: 0, width: '100%' }}>
                                                                    <tbody style={{ border: 'none' }}>
                                                                        <tr>
                                                                            <td style={{ width: '12%' }}>{formatLocalSystemDate(itemDate)}</td>
                                                                            <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.descricao}</td>
                                                                            <td style={{ width: '10%' }}><TypeBadge item={item} /></td>
                                                                            <td style={{ width: '10%' }}><StatusBadge item={item} /></td>
                                                                            <td style={{ width: '15%' }}>{item.categoria || '—'}</td>
                                                                            <td style={{ width: '8%' }}>
                                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: item.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                                                                    {item.tipo === 'entrada' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                                                                                    {item.tipo === 'entrada' ? 'RE' : 'DP'}
                                                                                </span>
                                                                            </td>
                                                                            <td style={{ width: '15%' }} className={item.tipo === 'entrada' ? 'positive' : 'negative'}>{item.tipo === 'entrada' ? '+' : '-'}{formatCurrency(item.valor)}</td>
                                                                            <td style={{ width: 120 }}>
                                                                                <div style={{ display: 'flex', gap: 4 }}>
                                                                                    {item.status !== 'pago_recebido' && (
                                                                                        <button className="settings-action-btn" onClick={() => handleQuickPay(item)} title="Marcar como Pago" style={{ color: 'var(--success)' }}><CheckCircle size={13} /></button>
                                                                                    )}
                                                                                    <button className="settings-action-btn" onClick={() => handleEdit(item)} title="Editar"><Pencil size={13} /></button>
                                                                                    <button className="settings-action-btn" onClick={() => handleDuplicate(item)} title="Duplicar"><Copy size={13} /></button>
                                                                                    <button className="settings-action-btn danger" onClick={() => handleDelete(item)} title="Excluir"><Trash2 size={13} /></button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    ) : (
                                                        <td colSpan={8} style={{ padding: 0 }}>
                                                            <div style={{ display: 'table', width: '100%' }}>
                                                                <table className="data-table" style={{ border: 'none', margin: 0, width: '100%' }}>
                                                                    <tbody style={{ border: 'none' }}>
                                                                        <tr>
                                                                            <td style={{ width: '12%' }}>{formatLocalSystemDate(itemDate)}</td>
                                                                            <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.descricao}</td>
                                                                            <td style={{ width: '10%' }}><TypeBadge item={item} /></td>
                                                                            <td style={{ width: '10%' }}><StatusBadge item={item} /></td>
                                                                            <td style={{ width: '15%' }}>{item.categoria || '—'}</td>
                                                                            <td style={{ width: '8%' }}>
                                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: item.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                                                                                    {item.tipo === 'entrada' ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                                                                                    {item.tipo === 'entrada' ? 'RE' : 'DP'}
                                                                                </span>
                                                                            </td>
                                                                            <td style={{ width: '15%' }} className={item.tipo === 'entrada' ? 'positive' : 'negative'}>{item.tipo === 'entrada' ? '+' : '-'}{formatCurrency(item.valor)}</td>
                                                                            <td style={{ width: 120 }}>
                                                                                <div style={{ display: 'flex', gap: 4 }}>
                                                                                    {item.status !== 'pago_recebido' && (
                                                                                        <button className="settings-action-btn" onClick={() => handleQuickPay(item)} title="Marcar como Pago" style={{ color: 'var(--success)' }}><CheckCircle size={13} /></button>
                                                                                    )}
                                                                                    <button className="settings-action-btn" onClick={() => handleEdit(item)} title="Editar"><Pencil size={13} /></button>
                                                                                    <button className="settings-action-btn" onClick={() => handleDuplicate(item)} title="Duplicar"><Copy size={13} /></button>
                                                                                    <button className="settings-action-btn danger" onClick={() => handleDelete(item)} title="Excluir"><Trash2 size={13} /></button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </>
                );
            })()}

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
                            const data1 = calculateDREData(dreMonth1, dreYear1, dreIsAccumulated);
                            const data2 = dreIsComparative ? calculateDREData(dreMonth2, dreYear2, dreIsAccumulated) : null;

                            const calcAV = (val: number, base: number) => base > 0 ? (val / base) * 100 : 0;
                            const calcDeltaR = (v1: number, v2: number) => v1 - v2;
                            const calcDeltaP = (v1: number, v2: number) => {
                                if (v2 === 0) return v1 > 0 ? 100 : v1 < 0 ? -100 : 0;
                                return ((v1 - v2) / Math.abs(v2)) * 100;
                            };

                            const formatAV = (val: number) => `${val.toFixed(1).replace('.', ',')}%`;
                            const formatValue = (v: number) => v < 0 ? `(${formatCurrency(Math.abs(v))})` : formatCurrency(v);
                            const getValClass = (v: number, reverse = false) => {
                                if (v === 0) return '';
                                if (reverse) return v > 0 ? 'negative' : 'positive';
                                return v > 0 ? 'positive' : 'negative';
                            };

                            const renderDRERow = (label: string, v1: number, v2?: number, isTotal = false, isSub = false) => {
                                const av1 = calcAV(v1, data1.receitaBruta);
                                const deltaR = v2 !== undefined ? calcDeltaR(v1, v2) : 0;
                                const deltaP = v2 !== undefined ? calcDeltaP(v1, v2) : 0;
                                const av2 = v2 !== undefined ? calcAV(v2, data2?.receitaBruta || 0) : 0;

                                return (
                                    <tr key={label} className={isTotal ? 'dre-total' : isSub ? 'dre-subcategory' : 'dre-category'}
                                        style={isTotal ? { fontWeight: 700, borderTop: isSub ? 'none' : '1px solid var(--border-default)' } : {}}>
                                        <td style={{ paddingLeft: isSub ? 32 : 16 }}>{isTotal ? <strong>{label}</strong> : label}</td>
                                        <td style={{ textAlign: 'right' }} className={getValClass(v1)}>{isTotal ? <strong>{formatValue(v1)}</strong> : formatValue(v1)}</td>
                                        <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{formatAV(av1)}</td>
                                        {dreIsComparative && (
                                            <>
                                                <td style={{ textAlign: 'right' }} className={getValClass(v2 || 0)}>{formatValue(v2 || 0)}</td>
                                                <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>{formatAV(av2)}</td>
                                                <td style={{ textAlign: 'right' }} className={getValClass(deltaR)}>{deltaR > 0 ? '+' : ''}{formatCurrency(deltaR)}</td>
                                                <td style={{ textAlign: 'right', fontSize: 12 }} className={getValClass(deltaP)}>{deltaP > 0 ? '+' : ''}{deltaP.toFixed(1)}%</td>
                                            </>
                                        )}
                                    </tr>
                                );
                            };

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    <div className="filter-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Período:</span>
                                                <select className="form-select" style={{ width: 120, padding: '6px 10px' }} value={dreMonth1} onChange={e => setDreMonth1(e.target.value)}>
                                                    {Object.entries(MONTH_NAMES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                                                </select>
                                                <select className="form-select" style={{ width: 90, padding: '6px 10px' }} value={dreYear1} onChange={e => setDreYear1(e.target.value)}>
                                                    {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                            </div>

                                            {dreIsComparative && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 16, borderLeft: '1px solid var(--border-default)' }}>
                                                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Comparar com:</span>
                                                    <select className="form-select" style={{ width: 120, padding: '6px 10px' }} value={dreMonth2} onChange={e => setDreMonth2(e.target.value)}>
                                                        {Object.entries(MONTH_NAMES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                                                    </select>
                                                    <select className="form-select" style={{ width: 90, padding: '6px 10px' }} value={dreYear2} onChange={e => setDreYear2(e.target.value)}>
                                                        {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <button
                                                className={`btn ${dreIsAccumulated ? 'btn-primary' : 'btn-secondary'}`}
                                                onClick={() => setDreIsAccumulated(!dreIsAccumulated)}
                                                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }}
                                            >
                                                {dreIsAccumulated ? 'Ver Mensal' : 'Acumulado Anual'}
                                            </button>
                                            <button
                                                className={`btn ${dreIsComparative ? 'btn-primary' : 'btn-secondary'}`}
                                                onClick={() => setDreIsComparative(!dreIsComparative)}
                                                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }}
                                            >
                                                {dreIsComparative ? 'Remover Comparação' : 'Comparar Períodos'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="table-card">
                                        <div className="table-card-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span>Demonstrativo de Resultado do Exercício (DRE)</span>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>Valores em base 100% na Receita Bruta</span>
                                        </div>
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: dreIsComparative ? '25%' : '60%' }}>Descrição</th>
                                                    <th style={{ textAlign: 'right' }}>{MONTH_NAMES[dreMonth1]}/{dreYear1} (R$)</th>
                                                    <th style={{ textAlign: 'right', width: 80 }}>AV%</th>
                                                    {dreIsComparative && (
                                                        <>
                                                            <th style={{ textAlign: 'right' }}>{MONTH_NAMES[dreMonth2]}/{dreYear2} (R$)</th>
                                                            <th style={{ textAlign: 'right', width: 80 }}>AV%</th>
                                                            <th style={{ textAlign: 'right' }}>Δ R$</th>
                                                            <th style={{ textAlign: 'right', width: 80 }}>Δ %</th>
                                                        </>
                                                    )}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {renderDRERow('RECEITA OPERACIONAL BRUTA', data1.receitaBruta, data2?.receitaBruta, true)}
                                                {renderDRERow('Receita de Serviços / Vendas', data1.receitaBruta, data2?.receitaBruta, false, true)}

                                                <tr key="spacer-receita-deducoes" style={{ height: 16 }}></tr>
                                                {renderDRERow('(–) DEDUÇÕES E IMPOSTOS', -data1.deducoes, data2 ? -data2.deducoes : undefined)}
                                                {renderDRERow('Impostos sobre receita', -data1.deducoes, data2 ? -data2.deducoes : undefined, false, true)}

                                                <tr key="spacer-deducoes-liquida" style={{ height: 16 }}></tr>
                                                {renderDRERow('(=) RECEITA OPERACIONAL LÍQUIDA', data1.receitaLiquida, data2?.receitaLiquida, true)}

                                                <tr key="spacer-liquida-custos" style={{ height: 16 }}></tr>
                                                {/* Custos Operacionais */}
                                                {renderDRERow('(–) CUSTOS OPERACIONAIS', -data1.totalCustos, data2 ? -data2.totalCustos : undefined)}
                                                {renderDRERow('Custos Fixos', -data1.custosFixos, data2 ? -data2.custosFixos : undefined, false, true)}
                                                {renderDRERow('Custos Variáveis', -data1.custosVariaveis, data2 ? -data2.custosVariaveis : undefined, false, true)}

                                                <tr key="spacer-custos-margem" style={{ height: 16 }}></tr>
                                                {renderDRERow('(=) MARGEM DE CONTRIBUIÇÃO', data1.margemContribuicao, data2?.margemContribuicao, true)}

                                                <tr key="spacer-margem-despesas" style={{ height: 16 }}></tr>
                                                {/* Despesas Operacionais */}
                                                <tr key="row-despesas-operacionais" className="dre-category"><td>(–) DESPESAS OPERACIONAIS</td><td style={{ textAlign: 'right' }} className="negative">{formatValue(-data1.totalDespesas)}</td><td style={{ textAlign: 'right', fontSize: 12 }}>{formatAV(calcAV(-data1.totalDespesas, data1.receitaBruta))}</td>{dreIsComparative && <><td style={{ textAlign: 'right' }} className="negative">{formatValue(-(data2?.totalDespesas || 0))}</td><td></td><td></td><td></td></>}</tr>

                                                {/* Predefined Categories first, then others with remaining balance */}
                                                {['Pessoal', 'Marketing', 'Administrativo', 'Operacional', 'Comercial', 'Comissão', 'Ferramenta'].map(cat => {
                                                    const v1 = -(data1.despesasByCategory[cat] || 0);
                                                    const v2 = data2 ? -(data2.despesasByCategory[cat] || 0) : undefined;
                                                    return renderDRERow(cat, v1, v2, false, true);
                                                })}
                                                {/* Others */}
                                                {(() => {
                                                    const predefined = ['Pessoal', 'Marketing', 'Administrativo', 'Operacional', 'Comercial', 'Comissão', 'Ferramenta'];
                                                    const others1 = Object.entries(data1.despesasByCategory).filter(([k]) => !predefined.includes(k)).reduce((s, [_, v]) => s + v, 0);
                                                    const others2 = data2 ? Object.entries(data2.despesasByCategory).filter(([k]) => !predefined.includes(k)).reduce((s, [_, v]) => s + v, 0) : 0;
                                                    if (others1 !== 0 || (dreIsComparative && others2 !== 0)) {
                                                        return renderDRERow('Gastos Diversos / Outros', -others1, data2 ? -others2 : undefined, false, true);
                                                    }
                                                    return null;
                                                })()}

                                                <tr key="spacer-despesas-ebit" style={{ height: 32 }}></tr>
                                                <tr key="row-ebit" className="dre-total" style={{ borderTop: '3px solid var(--accent)', background: 'rgba(255,255,255,0.02)' }}>
                                                    <td><strong style={{ color: 'var(--accent-light)', fontSize: 15 }}>(=) RESULTADO OPERACIONAL (EBIT)</strong></td>
                                                    <td style={{ textAlign: 'right', fontSize: 16 }} className={getValClass(data1.ebit)}><strong>{formatValue(data1.ebit)}</strong></td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatAV(calcAV(data1.ebit, data1.receitaBruta))}</td>
                                                    {dreIsComparative && (
                                                        <>
                                                            <td style={{ textAlign: 'right', fontSize: 16 }} className={getValClass(data2?.ebit || 0)}><strong>{formatValue(data2?.ebit || 0)}</strong></td>
                                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatAV(calcAV(data2?.ebit || 0, data2?.receitaBruta || 0))}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: 700 }} className={getValClass(calcDeltaR(data1.ebit, data2?.ebit || 0))}>{formatValue(calcDeltaR(data1.ebit, data2?.ebit || 0))}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: 700 }} className={getValClass(calcDeltaP(data1.ebit, data2?.ebit || 0))}>{calcDeltaP(data1.ebit, data2?.ebit || 0) > 0 ? '+' : ''}{calcDeltaP(data1.ebit, data2?.ebit || 0).toFixed(1)}%</td>
                                                        </>
                                                    )}
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* --- Sub-Aba Metas & Planejamento --- */}
                        {activeSubTabPlanejamento === 'metas' && (() => {
                            const dre = calculateDREData(currentMonth, currentYear, false);
                            return (
                                <MetasPlanejamentoTab
                                    goals={goals}
                                    setGoals={setGoals}
                                    budgetPlan={budgetPlan}
                                    setBudgetPlan={setBudgetPlan}
                                    formatCurrency={formatCurrency}
                                    totalReceitaDRE={dre.receitaBruta}
                                    totalDespesasDRE={dre.totalDespesas}
                                    despesasByClass={dre.despesasByCategory}
                                    lucroBrutoDRE={dre.ebit}
                                />
                            );
                        })()}
                    </>
                )
            }


            {/* ====== ABA CONTROLE DE FATURAMENTO ====== */}
            {activeTab === 'faturamento' && (() => {
                const STATUS_CONFIG = {
                    pendente:     { label: 'Pendente',      color: '#EF4444', bg: 'rgba(239,68,68,0.12)',    next: 'enviada'     as const },
                    enviada:      { label: 'Cobrança Enviada', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', next: 'nf_gerada'  as const },
                    nf_gerada:    { label: 'NF Gerada',     color: '#3B82F6', bg: 'rgba(59,130,246,0.12)',  next: 'nf_verificada' as const },
                    nf_verificada:{ label: 'NF Verificada', color: '#10B981', bg: 'rgba(16,185,129,0.12)',  next: null },
                };
                const filtradas = cobranças.filter(c => fatStatusFiltro === 'todos' || c.status === fatStatusFiltro);
                const hoje = new Date().toISOString().slice(0, 10);

                async function avancarStatus(c: AsaasCobranca) {
                    const next = STATUS_CONFIG[c.status].next;
                    if (!next) return;
                    await updateAsaasCobrancaStatus(c.id, next);
                    refetchCobranças();
                }

                async function handleNovaCobranaca() {
                    setCobrancaFormError('');
                    if (!cobrancaForm.cliente_nome?.trim()) { setCobrancaFormError('Informe o nome do cliente.'); return; }
                    if (!cobrancaForm.valor || cobrancaForm.valor <= 0) { setCobrancaFormError('Informe o valor.'); return; }
                    if (!cobrancaForm.data_vencimento) { setCobrancaFormError('Informe o vencimento.'); return; }
                    setSavingCobranca(true);
                    try {
                        await addAsaasCobranca({
                            cliente_id: cobrancaForm.cliente_id || '',
                            cliente_nome: cobrancaForm.cliente_nome!.trim(),
                            valor: Number(cobrancaForm.valor),
                            status: 'pendente',
                            data_emissao: cobrancaForm.data_emissao || hoje,
                            data_vencimento: cobrancaForm.data_vencimento!,
                            numero_nf: null,
                            observacoes: cobrancaForm.observacoes || null,
                        });
                        setShowNovaCobrancaModal(false);
                        setCobrancaForm({ status: 'pendente', data_emissao: hoje });
                        refetchCobranças();
                    } catch { setCobrancaFormError('Erro ao salvar. Tente novamente.'); }
                    finally { setSavingCobranca(false); }
                }

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Toolbar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <input type="month" className="form-input" value={fatMesAno} onChange={e => setFatMesAno(e.target.value)} style={{ width: 160 }} />
                            <div style={{ display: 'flex', gap: 6 }}>
                                {(['todos', 'pendente', 'enviada', 'nf_gerada', 'nf_verificada'] as const).map(s => (
                                    <button key={s} onClick={() => setFatStatusFiltro(s)} style={{
                                        fontSize: 12, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', border: '1px solid',
                                        background: fatStatusFiltro === s ? 'var(--accent)' : 'transparent',
                                        color: fatStatusFiltro === s ? '#fff' : 'var(--text-muted)',
                                        borderColor: fatStatusFiltro === s ? 'var(--accent)' : 'var(--border-default)',
                                    }}>
                                        {s === 'todos' ? 'Todas' : STATUS_CONFIG[s].label}
                                    </button>
                                ))}
                            </div>
                            <div style={{ flex: 1 }} />
                            <button className="btn btn-primary" style={{ cursor: 'pointer' }} onClick={() => setShowNovaCobrancaModal(true)}>
                                <Plus size={14} /> Nova Cobrança
                            </button>
                        </div>

                        {/* Tabela */}
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ width: '100%' }}>
                                <thead>
                                    <tr>
                                        <th>Cliente</th>
                                        <th>Valor</th>
                                        <th>Emissão</th>
                                        <th>Vencimento</th>
                                        <th>Status</th>
                                        <th style={{ width: 160 }}>Ação</th>
                                        <th style={{ width: 40 }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loadingCobranças && (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Carregando...</td></tr>
                                    )}
                                    {!loadingCobranças && filtradas.length === 0 && (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Nenhuma cobrança encontrada.</td></tr>
                                    )}
                                    {filtradas.map(c => {
                                        const cfg = STATUS_CONFIG[c.status];
                                        const vencido = c.data_vencimento < hoje && c.status !== 'nf_verificada';
                                        const urgente = !vencido && c.status !== 'nf_verificada' &&
                                            Math.ceil((new Date(c.data_vencimento).getTime() - new Date(hoje).getTime()) / 86400000) <= 3;
                                        return (
                                            <tr key={c.id} style={vencido ? { borderLeft: '3px solid #EF4444' } : undefined}>
                                                <td style={{ fontWeight: 500 }}>{c.cliente_nome}</td>
                                                <td>{formatCurrency(c.valor)}</td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.data_emissao}</td>
                                                <td style={{ color: vencido ? '#EF4444' : urgente ? '#F59E0B' : 'var(--text-muted)', fontSize: 12, fontWeight: (vencido || urgente) ? 600 : 400 }}>
                                                    {c.data_vencimento}
                                                    {vencido && <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(239,68,68,0.15)', color: '#EF4444', padding: '1px 6px', borderRadius: 10 }}>Vencida</span>}
                                                </td>
                                                <td>
                                                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color }}>
                                                        {cfg.label}
                                                    </span>
                                                </td>
                                                <td>
                                                    {cfg.next && (
                                                        <button onClick={() => avancarStatus(c)} style={{
                                                            fontSize: 11, padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                                                            background: 'var(--accent-muted)', color: 'var(--accent-light)',
                                                            border: '1px solid var(--accent-muted)',
                                                        }}>
                                                            → {STATUS_CONFIG[cfg.next].label}
                                                        </button>
                                                    )}
                                                    {c.status === 'nf_verificada' && (
                                                        <span style={{ fontSize: 11, color: '#10B981' }}>✓ Concluída</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <button onClick={async () => { await removeAsaasCobranca(c.id); refetchCobranças(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }} title="Remover">
                                                        <X size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Nova Cobrança */}
                        {showNovaCobrancaModal && (
                            <div className="modal-overlay" onClick={() => setShowNovaCobrancaModal(false)}>
                                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                                    <div className="modal-header">
                                        <h2 className="modal-title">Nova Cobrança</h2>
                                        <button className="modal-close" onClick={() => setShowNovaCobrancaModal(false)} style={{ cursor: 'pointer' }}><X size={16} /></button>
                                    </div>
                                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        <div>
                                            <label className="form-label">Cliente *</label>
                                            <input type="text" className="form-input" value={cobrancaForm.cliente_nome || ''} onChange={e => setCobrancaForm(p => ({ ...p, cliente_nome: e.target.value }))} placeholder="Nome do cliente" list="clientes-list" />
                                            <datalist id="clientes-list">
                                                {clients.map(c => <option key={c.id} value={c.name} />)}
                                            </datalist>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                            <div>
                                                <label className="form-label">Valor (R$) *</label>
                                                <input type="number" className="form-input" value={cobrancaForm.valor || ''} onChange={e => setCobrancaForm(p => ({ ...p, valor: Number(e.target.value) }))} placeholder="0,00" min="0" step="0.01" />
                                            </div>
                                            <div>
                                                <label className="form-label">Data de Emissão</label>
                                                <input type="date" className="form-input" value={cobrancaForm.data_emissao || ''} onChange={e => setCobrancaForm(p => ({ ...p, data_emissao: e.target.value }))} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="form-label">Vencimento *</label>
                                            <input type="date" className="form-input" value={cobrancaForm.data_vencimento || ''} onChange={e => setCobrancaForm(p => ({ ...p, data_vencimento: e.target.value }))} />
                                        </div>
                                        <div>
                                            <label className="form-label">Observações</label>
                                            <input type="text" className="form-input" value={cobrancaForm.observacoes || ''} onChange={e => setCobrancaForm(p => ({ ...p, observacoes: e.target.value }))} placeholder="Referência, competência..." />
                                        </div>
                                        {cobrancaFormError && <div style={{ color: '#EF4444', fontSize: 13, background: 'rgba(239,68,68,0.1)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>{cobrancaFormError}</div>}
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                                            <button className="btn btn-secondary" onClick={() => setShowNovaCobrancaModal(false)} style={{ cursor: 'pointer' }}>Cancelar</button>
                                            <button className="btn btn-primary" onClick={handleNovaCobranaca} disabled={savingCobranca} style={{ cursor: 'pointer' }}>
                                                {savingCobranca ? 'Salvando...' : 'Criar Cobrança'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* ====== MODAL UNIFICADO ====== */}
            {transactionModal && (
                <div className="settings-modal-overlay" onClick={() => setTransactionModal(null)}>
                    <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, padding: 0, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 28px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-secondary)' }}>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{transactionModal.type === 'add' ? 'Novo Lançamento' : 'Editar Lançamento'}</h3>
                            <button onClick={() => setTransactionModal(null)} style={{ background: 'var(--bg-tertiary)', border: 'none', color: 'var(--text-muted)', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }} onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)', e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)', e.currentTarget.style.background = 'var(--bg-tertiary)')}><X size={18} /></button>
                        </div>
                        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '70vh', overflowY: 'auto' }}>
                            {formError && (
                                <div style={{ color: '#EF4444', background: '#EF44441A', padding: '12px 16px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AlertTriangle size={16} /> <span>{formError}</span>
                                </div>
                            )}

                            {/* Type Selector - only on Add */}
                            {transactionModal.type === 'add' && (
                                <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: 4, borderRadius: 12, border: '1px solid var(--border-default)' }}>
                                    {([['avulso', 'Avulso'], ['recorrente', 'Recorrente'], ['imposto', 'Imposto']] as const).map(([key, label]) => (
                                        <button key={key} onClick={() => setFormLancamentoTipo(key)}
                                            style={{
                                                flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                                                background: formLancamentoTipo === key ? (key === 'avulso' ? '#3B82F6' : key === 'recorrente' ? '#8B5CF6' : '#EC4899') : 'transparent',
                                                color: formLancamentoTipo === key ? '#fff' : 'var(--text-muted)',
                                                fontWeight: 600, transition: 'all 0.2s', cursor: 'pointer', fontSize: 13
                                            }}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {/* Fluxo toggle (Avulso & Recorrente only) */}
                            {formLancamentoTipo !== 'imposto' && (
                                <div style={{ display: 'flex', background: 'var(--bg-tertiary)', padding: 4, borderRadius: 12, border: '1px solid var(--border-default)' }}>
                                    <button onClick={() => setFormTipo('saida')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: formTipo === 'saida' ? 'var(--danger)' : 'transparent', color: formTipo === 'saida' ? '#fff' : 'var(--text-muted)', fontWeight: 600, transition: 'all 0.2s', cursor: 'pointer' }}>Saída</button>
                                    <button onClick={() => setFormTipo('entrada')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: formTipo === 'entrada' ? 'var(--success)' : 'transparent', color: formTipo === 'entrada' ? '#fff' : 'var(--text-muted)', fontWeight: 600, transition: 'all 0.2s', cursor: 'pointer' }}>Entrada</button>
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">Descrição</label>
                                <input className="form-input" value={formDescricao} onChange={e => setFormDescricao(e.target.value)} placeholder={formLancamentoTipo === 'imposto' ? 'Ex: Simples Nacional' : 'Ex: Pagamento Aluguel'} />
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

                            {/* Classificação + Categoria (Avulso & Recorrente) */}
                            {formLancamentoTipo !== 'imposto' && (
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
                            )}

                            {/* Categoria + Competência (Imposto only) */}
                            {formLancamentoTipo === 'imposto' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div className="form-group">
                                        <label className="form-label">Categoria</label>
                                        <input className="form-input" value={formCategoria} onChange={e => setFormCategoria(e.target.value)} placeholder="Ex: Federal" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Competência</label>
                                        <input className="form-input" value={formCompetencia} onChange={e => setFormCompetencia(e.target.value)} placeholder="Ex: 03/2026" />
                                    </div>
                                </div>
                            )}

                            {/* Status + Data Pagamento */}
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

                            {/* Recurrence options */}
                            {formLancamentoTipo === 'recorrente' && transactionModal.type === 'add' && (
                                <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border-default)' }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#8B5CF6', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><RefreshCw size={14} /> Configurações de Recorrência</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                                </div>
                            )}

                            <button className="btn btn-primary" onClick={handleSaveTransaction} disabled={formSaving} style={{ padding: '14px', width: '100%', marginTop: 8 }}>
                                {formSaving ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={16} className="animate-spin" /> Salvando...</span>
                                ) : (
                                    formLancamentoTipo === 'imposto' ? 'Salvar Imposto' : 'Salvar Movimentação'
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


