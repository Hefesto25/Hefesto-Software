'use client';

import { useState, useMemo, useEffect } from 'react';
import {
    TrendingUp, TrendingDown, Target, FileText,
    Handshake, Filter, Users, DollarSign,
    FileDown, Activity, Sparkles, PieChart, BarChart3, Presentation, Ban, Plus, CalendarDays
} from 'lucide-react';
import {
    useDeals, updateDeal, removeDeal, useSellerGoals, useOperationalTasks, useTeam,
    addOperationalTask, addDeal, addSellerGoal, removeSellerGoal, addTeamMember,
    useClients, addClient, updateClient, removeClient, useMeetings, addMeeting, updateMeeting, removeMeeting, useFeedbacks, addFeedback,
    useCalendarEvents, addCalendarEvent, updateCalendarEvent, removeCalendarEvent
} from '@/lib/hooks';
import {
    DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragStartEvent, DragEndEvent
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { formatCurrencyInput, parseCurrencyInput, getBahiaDate, getBahiaDateString } from '@/lib/utils';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Cell, PieChart as RechartsPie, Pie, Legend, LineChart, Line, ReferenceLine
} from 'recharts';
import type { Deal, SellerGoal, ClientCRM, MeetingCRM, FeedbackCRM } from '@/lib/types';

const MONTHS = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
];

const STAGES = [
    { id: 'prospeccao', label: 'Prospecção', color: '#8B5CF6' },
    { id: 'diagnostico', label: 'Diagnóstico', color: '#3B82F6' },
    { id: 'proposta_comercial', label: 'Proposta Comercial', color: '#F59E0B' },
    { id: 'fechado', label: 'Fechado', color: '#10B981' },
    { id: 'perdido', label: 'Perdido', color: '#EF4444' }
];

export function formatCurrency(val: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
}

export function getDaysInStage(dateStr?: string) {
    if (!dateStr) return 0;
    const diff = getBahiaDate().getTime() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 3600 * 24));
}

export default function ComercialPage() {
    const [activeTab, setActiveTab] = useState<'painel' | 'negocios' | 'time' | 'crm'>('painel');
    const [subTabNegocios, setSubTabNegocios] = useState<'kanban' | 'lista' | 'historico'>('kanban');

    const currentDate = getBahiaDate();
    const [filterMonth, setFilterMonth] = useState(String(currentDate.getMonth() + 1).padStart(2, '0'));
    const [filterYear, setFilterYear] = useState(String(currentDate.getFullYear()));
    const [searchQuery, setSearchQuery] = useState('');

    const { data: deals, loading: loadingDeals, setData: setDealsData } = useDeals();
    const { data: goals, loading: loadingGoals } = useSellerGoals();
    const { data: teamMembers, setData: setTeamMembersData } = useTeam();
    const { data: clients, setData: setClientsData } = useClients();
    const { data: meetings, setData: setMeetingsData, refetch: refetchMeetings } = useMeetings();
    const { data: team } = useTeam();
    const { data: feedbacks, setData: setFeedbacksData } = useFeedbacks();
    const { data: calendarEvents, refetch: refetchCalendarEvents } = useCalendarEvents();

    const [showClientModal, setShowClientModal] = useState(false);
    const [newClientData, setNewClientData] = useState<Partial<ClientCRM>>({ status: 'Ativo' });
    const [selectedClient, setSelectedClient] = useState<ClientCRM | null>(null);
    const [clientTab, setClientTab] = useState<'info' | 'reunioes' | 'feedbacks'>('info');
    const [crmSubTab, setCrmSubTab] = useState<'ativos' | 'inativos'>('ativos');
    const [editingClientData, setEditingClientData] = useState<ClientCRM | null>(null);

    // New Meeting/Feedback State
    const [newMeeting, setNewMeeting] = useState<Partial<MeetingCRM>>({});
    const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
    const [editingMeetingForm, setEditingMeetingForm] = useState<Partial<MeetingCRM>>({});
    const [newFeedback, setNewFeedback] = useState<Partial<FeedbackCRM>>({ type: 'Elogio' });

    // Drag and Drop state
    const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);

    // Modal state
    const [showDealModal, setShowDealModal] = useState(false);

    // New Deal Form State
    const [newDealCompany, setNewDealCompany] = useState('');
    const [newDealValueDisplay, setNewDealValueDisplay] = useState('');
    const [newDealStage, setNewDealStage] = useState('prospeccao');
    const [newDealAssignee, setNewDealAssignee] = useState('');
    const [newDealSource, setNewDealSource] = useState('Indicação');
    const [newDealDate, setNewDealDate] = useState('');
    const [newDealObs, setNewDealObs] = useState('');

    const [showGoalModal, setShowGoalModal] = useState(false);

    // Modal Goal Form State
    const currentQuarter = `Q${Math.floor(currentDate.getMonth() / 3) + 1}`;
    const [goalQuarter, setGoalQuarter] = useState(currentQuarter);
    const [goalYear, setGoalYear] = useState(String(currentDate.getFullYear()));
    const [goalSellerName, setGoalSellerName] = useState('');
    const [goalValue, setGoalValue] = useState('');
    const [showLostModal, setShowLostModal] = useState<{ isOpen: boolean, dealId: string | null }>({ isOpen: false, dealId: null });
    const [lostReason, setLostReason] = useState('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Deal Modal State
    const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
    const [editingDealData, setEditingDealData] = useState<Partial<Deal> | null>(null);

    // Dnd-kit sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
        useSensor(KeyboardSensor)
    );

    // Add Member Modal State
    const [showTeamMemberModal, setShowTeamMemberModal] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('Vendedor');
    const [newMemberCategory, setNewMemberCategory] = useState('Comercial');
    const [newMemberGoal, setNewMemberGoal] = useState('');


    async function handleAddMember() {
        if (!newMemberName) return showToast('Preencha o nome do membro.');
        try {
            const member = await addTeamMember({
                name: newMemberName,
                initials: newMemberName.substring(0, 2).toUpperCase(),
                role: newMemberRole,
                avatar_color: '#3B82F6',
                status: 'online',
                email: `${newMemberName.split(' ')[0].toLowerCase()}@empresa.com`,
                permission: 'member',
                category: newMemberCategory
            });
            setTeamMembersData([...teamMembers, member]);

            if (newMemberGoal) {
                await addSellerGoal({
                    seller_name: newMemberName,
                    month: filterMonth,
                    year: filterYear,
                    goal_value: parseCurrencyInput(newMemberGoal)
                });
            }
            setShowTeamMemberModal(false);
            setNewMemberName('');
            setNewMemberGoal('');
            showToast('Membro adicionado com sucesso.');
        } catch (e) {
            console.error(e);
            showToast('Erro ao criar membro.');
        }
    }

    async function handleCreateDeal() {
        if (!newDealCompany || !newDealValueDisplay || !newDealAssignee) {
            return showToast('Preencha os campos obrigatórios (Empresa, Valor e Responsável).');
        }

        const selectedMember = teamMembers.find(m => m.id === newDealAssignee);
        if (!selectedMember) return showToast('Responsável inválido.');

        try {
            const deal = await addDeal({
                title: `Oportunidade - ${newDealCompany}`,
                company: newDealCompany,
                value: parseCurrencyInput(newDealValueDisplay),
                stage: newDealStage as any,
                assignee: selectedMember.initials,
                assignee_color: selectedMember.avatar_color || '#3B82F6',
                probability: 50,
                date: getBahiaDateString(),
                origem: newDealSource,
                fechamento_previsto: newDealDate || undefined,
                observacoes: newDealObs,
                data_entrada_etapa: new Date().toISOString()
            });
            setDealsData([...deals, deal]);
            setShowDealModal(false);
            setNewDealCompany('');
            setNewDealValueDisplay('');
            setNewDealAssignee('');
            setNewDealSource('Indicação');
            setNewDealDate('');
            setNewDealObs('');
            showToast('Negócio criado com sucesso.');
        } catch (e) {
            console.error(e);
            showToast('Erro ao criar negócio.');
        }
    }

    async function handleCreateClient() {
        if (!newClientData.name) return showToast('Preencha o nome do cliente.');
        try {
            const client = await addClient({
                name: newClientData.name,
                cnpj: newClientData.cnpj,
                segment: newClientData.segment,
                website: newClientData.website,
                contact_name: newClientData.contact_name,
                contact_email: newClientData.contact_email,
                contact_phone: newClientData.contact_phone,
                monthly_fee: Number(newClientData.monthly_fee) || 0,
                setup_fee: Number(newClientData.setup_fee) || 0,
                status: (newClientData.status as any) || 'Ativo',
                responsible_id: newClientData.responsible_id
            });
            setClientsData([...clients, client]);
            setShowClientModal(false);
            setNewClientData({ status: 'Ativo' });
            showToast('Cliente criado com sucesso.');
        } catch (e) {
            console.error(e);
            showToast('Erro ao criar cliente.');
        }
    }

    async function handleEditClient() {
        if (!editingClientData || !editingClientData.name) return showToast('Preencha o nome.');
        try {
            const updated = {
                ...editingClientData,
                monthly_fee: Number(editingClientData.monthly_fee) || 0,
                setup_fee: Number((editingClientData as any).setup_fee) || 0
            };
            const result = await updateClient(editingClientData.id, updated);

            setClientsData(clients.map(c => c.id === result.id ? result : c));
            setSelectedClient(result);
            setEditingClientData(null);
            showToast('Cliente atualizado com sucesso.');
        } catch (e) {
            console.error(e);
            showToast('Erro ao atualizar cliente.');
        }
    }

    async function handleDeleteClient(client: ClientCRM) {
        if (!confirm(`Tem certeza que deseja excluir permanentemente o cliente ${client.name}? Esta ação não pode ser desfeita.`)) return;
        try {
            await removeClient(client.id);

            setClientsData(clients.filter(c => c.id !== client.id));
            setShowClientModal(false);
            setSelectedClient(null);
            showToast(`Cliente ${client.name} excluído permanentemente.`);
        } catch (e) {
            console.error(e);
            showToast('Erro ao excluir cliente.');
        }
    }

    async function handleEditDeal() {
        if (!editingDealData || !editingDealData.title) return showToast('Preencha o título.');
        try {
            const updated = {
                ...editingDealData,
                value: Number(editingDealData.value) || 0,
                probability: Number(editingDealData.probability) || 0
            };
            const result = await updateDeal(editingDealData.id as string, updated);

            setDealsData(deals.map(d => d.id === result.id ? result : d));
            setSelectedDeal(result);
            setEditingDealData(null);
            showToast('Negócio atualizado com sucesso.');
        } catch (e) {
            console.error(e);
            showToast('Erro ao atualizar negócio.');
        }
    }

    async function handleDeleteDeal(deal: Deal) {
        if (!confirm(`Tem certeza que deseja excluir permanentemente o negócio "${deal.title}"?`)) return;
        try {
            await removeDeal(deal.id);
            setDealsData(deals.filter(d => d.id !== deal.id));
            setSelectedDeal(null);
            showToast(`Negócio excluído permanentemente.`);
        } catch (e) {
            console.error(e);
            showToast('Erro ao excluir negócio.');
        }
    }

    async function handleCreateMeeting() {
        if (!selectedClient || !newMeeting.title || !newMeeting.date) return showToast('Preencha título e data.');
        try {
            const meeting = await addMeeting({
                client_id: selectedClient.id,
                title: newMeeting.title,
                date: newMeeting.date,
                status: 'Agendada',
                observations: newMeeting.observations,
            });
            if (meeting) {
                try {
                    await addCalendarEvent({
                        titulo: `${selectedClient.name} — ${newMeeting.title}`,
                        data: newMeeting.date.split('T')[0],
                        hora_inicio: newMeeting.date.split('T')[1]?.substring(0, 5) || '10:00',
                        descricao: newMeeting.observations || '',
                        cor: '#F97316',
                        origem: 'crm_reuniao',
                        reuniao_id: meeting.id
                    });
                    if (refetchCalendarEvents) await refetchCalendarEvents();
                } catch (e) { console.error('Erro ao sync calendário', e); }
            }
            if (refetchMeetings) await refetchMeetings();
            setNewMeeting({});
            showToast('Reunião agendada.');
        } catch (e) {
            console.error(e);
            showToast('Erro ao agendar reunião.');
        }
    }

    async function handleUpdateMeeting(mId: string) {
        if (!editingMeetingForm.date || !editingMeetingForm.title) return;
        try {
            await updateMeeting(mId, { date: editingMeetingForm.date, title: editingMeetingForm.title, status: editingMeetingForm.status });
            const calEvent = calendarEvents?.find(e => e.reuniao_id === mId);
            if (calEvent) {
                if (editingMeetingForm.status === 'Cancelada') {
                    await removeCalendarEvent(calEvent.id);
                } else {
                    await updateCalendarEvent(calEvent.id, {
                        titulo: `${selectedClient!.name} — ${editingMeetingForm.title}`,
                        data: editingMeetingForm.date.split('T')[0],
                        hora_inicio: editingMeetingForm.date.split('T')[1]?.substring(0, 5) || '10:00'
                    });
                }
                if (refetchCalendarEvents) await refetchCalendarEvents();
            }
            if (refetchMeetings) await refetchMeetings();
            setEditingMeetingId(null);
            showToast('Reunião atualizada.');
        } catch (e) { console.error(e); showToast('Erro ao atualizar reunião.'); }
    }

    async function handleDeleteMeeting(mId: string) {
        if (!confirm('Deseja cancelar esta reunião e removê-la da lista?')) return;
        try {
            await updateMeeting(mId, { status: 'Cancelada' });
            const calEvent = calendarEvents?.find(e => e.reuniao_id === mId);
            if (calEvent) {
                await removeCalendarEvent(calEvent.id);
                if (refetchCalendarEvents) await refetchCalendarEvents();
            }
            if (refetchMeetings) await refetchMeetings();
            showToast('Reunião cancelada.');
        } catch (e) { console.error(e); showToast('Erro ao cancelar.'); }
    }

    async function handleCreateFeedback() {
        if (!selectedClient || !newFeedback.description) return showToast('Preencha a descrição.');
        try {
            const feedback = await addFeedback({
                client_id: selectedClient.id,
                type: newFeedback.type as any,
                description: newFeedback.description,
                author_name: 'Usuário',
                date: new Date().toISOString()
            });
            setFeedbacksData([...feedbacks, feedback]);
            setNewFeedback({ type: 'Elogio' });
            showToast('Feedback adicionado.');
        } catch (e) {
            console.error(e);
            showToast('Erro ao adicionar feedback.');
        }
    }

    // Toast helper
    function showToast(msg: string) {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    }

    // Filtra os deals pelo período (somente para os KPIs de fechados e totais)
    const filteredDeals = useMemo(() => {
        return deals.filter(deal => {
            const dateStr = deal.fechamento_previsto || deal.date;
            if (!dateStr) return false;
            const d = new Date(dateStr);
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const y = String(d.getFullYear());
            return m === filterMonth && y === filterYear;
        });
    }, [deals, filterMonth, filterYear]);

    // Exportação rápida de Dashboard
    function handleExportCSV() {
        const headers = ['Cliente', 'Valor', 'Etapa', 'Responsável', 'Data Entrada'];
        const rows = filteredDeals.map(d => [
            d.company,
            d.value.toFixed(2),
            d.stage,
            d.assignee,
            d.created_at ? new Date(d.created_at).toLocaleDateString('pt-br') : ''
        ]);
        const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `comercial_${filterMonth}_${filterYear}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // --- PAINEL: KPIs Computations ---
    const totalLeads = filteredDeals.length;
    const leadsFechados = filteredDeals.filter(d => d.stage === 'fechado');
    const receitaGerada = leadsFechados.reduce((acc, curr) => acc + curr.value, 0);
    const taxaConversao = totalLeads > 0 ? (leadsFechados.length / totalLeads) * 100 : 0;
    const ticketMedio = leadsFechados.length > 0 ? (receitaGerada / leadsFechados.length) : 0;

    // KPI: Taxa de Inativação (Global)
    const totalClientsCount = clients.length;
    const inactiveClientsCount = clients.filter(c => c.status === 'Inativo').length;
    const inactivationRate = totalClientsCount > 0 ? ((inactiveClientsCount / totalClientsCount) * 100).toFixed(1) : '0';

    // Negocios em aberto = deals do mês atual que não são 'fechado' nem 'perdido'
    const abertos = filteredDeals.filter(d => d.stage !== 'fechado' && d.stage !== 'perdido');
    const valorEmAberto = abertos.reduce((acc, curr) => acc + curr.value, 0);

    // Meta global
    const metaGlobal = goals
        .filter(g => g.month === filterMonth && g.year === filterYear)
        .reduce((sum, g) => sum + Number(g.goal_value), 0);
    const percMeta = metaGlobal > 0 ? (receitaGerada / metaGlobal) * 100 : 0;

    // TODO: Deltas do mês anterior omitidos para não poluir excessivamente o código inicialmente,
    // mas a estrutura de UI dos cards já comportará

    // Gráfico 1: Origem dos Leads
    const origens = filteredDeals.reduce((acc, deal) => {
        const o = deal.origem || 'Outros';
        acc[o] = (acc[o] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const donutData = Object.entries(origens).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const PIE_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#06B6D4'];

    // Gráfico 2: Receita ao Longo do Tempo (últimos 6 meses de todo o dataset)
    const revenueTimeline = useMemo(() => {
        const data = [];
        const now = getBahiaDate();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const mStr = String(d.getMonth() + 1).padStart(2, '0');
            const yStr = String(d.getFullYear());

            const monthFechados = deals.filter(d => d.stage === 'fechado' &&
                ((d.fechamento_previsto && d.fechamento_previsto.startsWith(`${yStr}-${mStr}`)) ||
                    (!d.fechamento_previsto && d.date && d.date.startsWith(`${yStr}-${mStr}`))));
            const rec = monthFechados.reduce((s, d) => s + d.value, 0);

            // Meta do mes
            const metaMes = goals.filter(g => g.month === mStr && g.year === yStr).reduce((s, g) => s + Number(g.goal_value), 0);

            data.push({
                name: MONTHS.find(x => x.value === mStr)?.label.substring(0, 3) || mStr,
                receita: rec,
                meta: metaMes
            });
        }
        return data;
    }, [deals, goals]);

    // Gráfico 3: Funil de Conversão (Quantidade por Etapa Ativa)
    const funnelData = STAGES.filter(s => s.id !== 'perdido').map(stage => {
        const count = filteredDeals.filter(d => d.stage === stage.id).length;
        return { name: stage.label, count, fill: stage.color };
    });

    if (loadingDeals) {
        return <div className="p-8 text-center text-muted">Carregando dados comerciais...</div>;
    }

    const uniqueYears = Array.from(new Set(deals.map(d => String(new Date(d.date || getBahiaDateString()).getFullYear())))).sort();
    if (!uniqueYears.includes(filterYear)) uniqueYears.push(filterYear);

    return (
        <div style={{ paddingBottom: 60 }}>


            {/* Abas Principais */}
            <div className="finance-tabs" style={{ marginBottom: 24 }}>
                <button
                    className={`finance-tab ${activeTab === 'painel' ? 'active' : ''}`}
                    onClick={() => setActiveTab('painel')}
                >
                    Painel
                </button>
                <button
                    className={`finance-tab ${activeTab === 'negocios' ? 'active' : ''}`}
                    onClick={() => setActiveTab('negocios')}
                >
                    Negócios
                </button>
                <button
                    className={`finance-tab ${activeTab === 'time' ? 'active' : ''}`}
                    onClick={() => setActiveTab('time')}
                >
                    Time
                </button>
                <button
                    className={`finance-tab ${activeTab === 'crm' ? 'active' : ''}`}
                    onClick={() => setActiveTab('crm')}
                >
                    CRM
                </button>
            </div>

            {/* TAB PAINEL */}
            {activeTab === 'painel' && (
                <>
                    {/* Header de Filtros */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                            <select className="form-select" style={{ minWidth: 120, fontSize: 13, background: 'transparent', border: 'none' }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select className="form-select" style={{ minWidth: 90, fontSize: 13, background: 'transparent', border: 'none' }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                                {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <button className="btn btn-secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <FileDown size={14} /> Exportar Relatório
                        </button>
                    </div>

                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                        {/* Receita Gerada */}
                        <div className="kpi-card" style={{ borderBottom: '33px solid #10B981' }}>
                            <div className="kpi-card-value" style={{ color: '#10B981', fontSize: 24 }}>{formatCurrency(receitaGerada)}</div>
                            <div className="kpi-card-label">Receita Gerada</div>
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: 'var(--text-muted)' }}>Mês Atual</span>
                            </div>
                        </div>

                        {/* Taxa de Conversao */}
                        <div className="kpi-card" style={{ borderBottom: '3px solid #3B82F6' }}>
                            <div className="kpi-card-value" style={{ color: '#3B82F6', fontSize: 24 }}>{taxaConversao.toFixed(1)}%</div>
                            <div className="kpi-card-label">Taxa de Conversão</div>
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: 'var(--text-muted)' }}>{leadsFechados.length} fechados de {totalLeads}</span>
                            </div>
                        </div>

                        {/* Em Aberto */}
                        <div className="kpi-card" style={{ borderBottom: '3px solid #F59E0B' }}>
                            <div className="kpi-card-value" style={{ color: '#F59E0B', fontSize: 24 }}>{formatCurrency(valorEmAberto)}</div>
                            <div className="kpi-card-label">Pipeline em Aberto</div>
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: 'var(--text-muted)' }}>{abertos.length} negócios ativos</span>
                            </div>
                        </div>

                        {/* Meta */}
                        <div className="kpi-card" style={{ borderBottom: '3px solid #8B5CF6' }}>
                            <div className="kpi-card-value" style={{ color: percMeta >= 100 ? '#10B981' : '#8B5CF6', fontSize: 24 }}>{percMeta.toFixed(1)}%</div>
                            <div className="kpi-card-label">Meta do Mês: {formatCurrency(metaGlobal)}</div>
                            <div style={{ marginTop: 12, width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(percMeta, 100)}%`, background: percMeta >= 100 ? '#10B981' : '#8B5CF6' }}></div>
                            </div>
                        </div>

                        {/* Total Leads (Menor) */}
                        <div className="kpi-card" style={{ borderBottom: '3px solid rgba(255,255,255,0.1)' }}>
                            <div className="kpi-card-value" style={{ color: 'var(--text-primary)', fontSize: 20 }}>{totalLeads}</div>
                            <div className="kpi-card-label">Total de Leads</div>
                        </div>

                        {/* Ticket Medio */}
                        <div className="kpi-card" style={{ borderBottom: '3px solid rgba(255,255,255,0.1)' }}>
                            <div className="kpi-card-value" style={{ color: 'var(--text-primary)', fontSize: 20 }}>{formatCurrency(ticketMedio)}</div>
                            <div className="kpi-card-label">Ticket Médio</div>
                        </div>

                        {/* Taxa de Inativação */}
                        <div className="kpi-card" style={{ borderBottom: '3px solid #EF4444' }}>
                            <div className="kpi-card-value" style={{ color: '#EF4444', fontSize: 20 }}>{inactivationRate}%</div>
                            <div className="kpi-card-label">Taxa de Inativação (Churn)</div>
                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                                <span style={{ color: 'var(--text-muted)' }}>{inactiveClientsCount} inativos de {totalClientsCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Gráficos */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginBottom: 24 }}>
                        <div className="chart-card">
                            <div className="chart-title">Receita vs Meta (Últimos 6 Meses)</div>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <LineChart data={revenueTimeline} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${v / 1000}k`} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                                            formatter={(value: number | undefined) => formatCurrency(value || 0)}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 13 }} />
                                        <Line type="monotone" dataKey="receita" name="Receita Realizada" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                        <Line type="monotone" dataKey="meta" name="Meta" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="chart-card">
                            <div className="chart-title">Origem dos Leads ({filterMonth}/{filterYear})</div>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <RechartsPie>
                                        <Pie data={donutData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                                            {donutData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                                            itemStyle={{ color: '#fff' }}
                                        />
                                        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 13 }} />
                                    </RechartsPie>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    <div className="chart-card">
                        <div className="chart-title">Pipeline Atual (Por Etapa)</div>
                        <div style={{ width: '100%', height: 200 }}>
                            <ResponsiveContainer>
                                <BarChart data={funnelData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" stroke="var(--text-primary)" fontSize={13} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8 }}
                                    />
                                    <Bar dataKey="count" name="Oportunidades" radius={[0, 4, 4, 0]} barSize={30}>
                                        {funnelData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </>
            )}

            {/* TAB NEGOCIOS */}
            {activeTab === 'negocios' && (() => {
                const searchLower = searchQuery.toLowerCase();
                const filteredList = deals.filter(d =>
                    d.company.toLowerCase().includes(searchLower) || d.assignee.toLowerCase().includes(searchLower)
                );

                const activeList = filteredList.filter(d => d.stage !== 'fechado' && d.stage !== 'perdido');
                const historicList = filteredList.filter(d => d.stage === 'fechado' || d.stage === 'perdido');

                function onDragStart(e: DragStartEvent) {
                    const { active } = e;
                    setDraggedDeal(deals.find(d => d.id === active.id) || null);
                }

                async function onDragEnd(event: DragEndEvent) {
                    setDraggedDeal(null);
                    const { active, over } = event;
                    if (!over) return;

                    const dealId = active.id as string;
                    const stageId = over.id as Deal['stage'];
                    const deal = deals.find(d => d.id === dealId);
                    if (!deal || deal.stage === stageId) return;

                    // Update UI optimistically
                    const oldStage = deal.stage;
                    const updatedDeal = { ...deal, stage: stageId, data_entrada_etapa: new Date().toISOString() };
                    setDealsData(deals.map(d => d.id === dealId ? updatedDeal : d));

                    try {
                        if (stageId === 'perdido') {
                            setShowLostModal({ isOpen: true, dealId });
                            setDealsData(deals); // Revert for modal to complete the backend update
                            return; // Wait for modal to complete the backend update
                        }

                        await updateDeal(deal.id, { stage: stageId, data_entrada_etapa: updatedDeal.data_entrada_etapa });

                        // --- GATILHOS OPERACIONAIS --- //
                        if (oldStage === 'diagnostico' && stageId === 'proposta_comercial') {
                            await addOperationalTask({
                                titulo: `Realizar Prévia — ${deal.company}`,
                                tipo: 'previa',
                                status: 'A Fazer',
                                origem: 'comercial_automatico',
                                negocio_id: deal.id,
                                cliente_nome: deal.company
                            });
                            showToast(`Tarefa criada no Operacional: Realizar Prévia para ${deal.company}`);
                        } else if (oldStage === 'proposta_comercial' && stageId === 'fechado') {
                            await addOperationalTask({
                                titulo: `Finalizar Ferramenta — ${deal.company}`,
                                tipo: 'finalizar_ferramenta',
                                status: 'A Fazer',
                                origem: 'comercial_automatico',
                                negocio_id: deal.id,
                                cliente_nome: deal.company
                            });
                            await addOperationalTask({
                                titulo: `Implementação — ${deal.company}`,
                                tipo: 'implementacao',
                                status: 'A Fazer',
                                origem: 'comercial_automatico',
                                negocio_id: deal.id,
                                cliente_nome: deal.company
                            });
                            showToast(`2 tarefas criadas no Operacional para ${deal.company}`);
                        }
                    } catch (e) {
                        console.error('Erro ao atualizar etapa:', e);
                        setDealsData(deals); // Revert
                        showToast('Erro ao atualizar. Tente novamente.');
                    }
                }

                return (
                    <>
                        {/* Sub-Tabs and Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: 8, padding: 4, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', width: 'fit-content' }}>
                                <button
                                    onClick={() => setSubTabNegocios('kanban')}
                                    style={{
                                        padding: '8px 20px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all 0.2s',
                                        background: subTabNegocios === 'kanban' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                        color: subTabNegocios === 'kanban' ? 'var(--text-primary)' : 'var(--text-muted)'
                                    }}
                                >
                                    Kanban
                                </button>
                                <button
                                    onClick={() => setSubTabNegocios('lista')}
                                    style={{
                                        padding: '8px 20px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all 0.2s',
                                        background: subTabNegocios === 'lista' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                        color: subTabNegocios === 'lista' ? 'var(--text-primary)' : 'var(--text-muted)'
                                    }}
                                >
                                    Lista
                                </button>
                                <button
                                    onClick={() => setSubTabNegocios('historico')}
                                    style={{
                                        padding: '8px 20px', fontSize: 13, fontWeight: 500, border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'all 0.2s',
                                        background: subTabNegocios === 'historico' ? 'rgba(255,255,255,0.1)' : 'transparent',
                                        color: subTabNegocios === 'historico' ? 'var(--text-primary)' : 'var(--text-muted)'
                                    }}
                                >
                                    Histórico
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Buscar cliente ou vendedor..."
                                    style={{ minWidth: 250 }}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                                <button className="btn btn-primary" onClick={() => setShowDealModal(true)}>
                                    + Novo Negócio
                                </button>
                            </div>
                        </div>

                        {/* KANBAN VIEW */}
                        {subTabNegocios === 'kanban' && (
                            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
                                <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
                                    {STAGES.map(stage => {
                                        const isHistoricStage = stage.id === 'fechado' || stage.id === 'perdido';
                                        const colDeals = isHistoricStage ? [] : activeList.filter(d => d.stage === stage.id);
                                        const colTotal = isHistoricStage ? 0 : colDeals.reduce((sum, d) => sum + d.value, 0);

                                        return <KanbanColumn key={stage.id} stage={stage} colDeals={colDeals} colTotal={colTotal} onCardClick={(d) => setSelectedDeal(d)} />;
                                    })}
                                </div>
                                <DragOverlay>
                                    {draggedDeal ? <KanbanCard deal={draggedDeal} isOverlay={true} /> : null}
                                </DragOverlay>
                            </DndContext>
                        )}

                        {/* LISTA VIEW */}
                        {subTabNegocios === 'lista' && (
                            <div className="table-card">
                                {activeList.length === 0 ? (
                                    <div className="p-8 text-center text-muted">Nenhum negócio ativo encontrado.</div>
                                ) : (
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Cliente</th>
                                                <th>Valor</th>
                                                <th>Etapa Atual</th>
                                                <th>Responsável</th>
                                                <th>Data de Entrada</th>
                                                <th>Previsão Fech.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeList.map(v => (
                                                <tr key={v.id} onClick={() => setSelectedDeal(v)} style={{ cursor: 'pointer' }} className="hover:bg-white/5 transition-colors">
                                                    <td><strong>{v.company}</strong></td>
                                                    <td>{formatCurrency(v.value)}</td>
                                                    <td>
                                                        <span style={{
                                                            background: STAGES.find(s => s.id === v.stage)?.color + '22',
                                                            color: STAGES.find(s => s.id === v.stage)?.color,
                                                            padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500
                                                        }}>
                                                            {STAGES.find(s => s.id === v.stage)?.label || v.stage}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: v.assignee_color }}></div>
                                                            {v.assignee}
                                                        </div>
                                                    </td>
                                                    <td>{v.created_at ? new Date(v.created_at).toLocaleDateString('pt-br') : '-'}</td>
                                                    <td>{v.fechamento_previsto ? new Date(v.fechamento_previsto + 'T00:00:00').toLocaleDateString('pt-br') : '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {/* HISTORICO VIEW */}
                        {subTabNegocios === 'historico' && (
                            <div className="table-card" style={{ borderTop: '4px solid var(--border-color)' }}>
                                <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)' }}>
                                    <h3 style={{ fontSize: 16, fontWeight: 600 }}>Negócios Encerrados (Fechados / Perdidos)</h3>
                                </div>
                                {historicList.length === 0 ? (
                                    <div className="p-8 text-center text-muted">Nenhum registro no histórico.</div>
                                ) : (
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Cliente</th>
                                                <th>Valor</th>
                                                <th>Resultado</th>
                                                <th>Motivo (se perdido)</th>
                                                <th>Responsável</th>
                                                <th>Data Encerramento</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historicList.map(v => (
                                                <tr key={v.id} onClick={() => setSelectedDeal(v)} style={{ cursor: 'pointer' }} className="hover:bg-white/5 transition-colors">
                                                    <td><strong>{v.company}</strong></td>
                                                    <td>{formatCurrency(v.value)}</td>
                                                    <td>
                                                        <span style={{
                                                            background: STAGES.find(s => s.id === v.stage)?.color + '22',
                                                            color: STAGES.find(s => s.id === v.stage)?.color,
                                                            padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500
                                                        }}>
                                                            {STAGES.find(s => s.id === v.stage)?.label || v.stage}
                                                        </span>
                                                    </td>
                                                    <td style={{ color: 'var(--text-muted)' }}>{v.motivo_perda || '-'}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: v.assignee_color }}></div>
                                                            {v.assignee}
                                                        </div>
                                                    </td>
                                                    <td>{v.data_entrada_etapa ? new Date(v.data_entrada_etapa).toLocaleDateString('pt-br') : '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {/* Fake Modal Lost (simplified for demo logic) */}
                        {showLostModal.isOpen && (
                            <div className="modal-overlay">
                                <div className="modal-content" style={{ maxWidth: 400 }}>
                                    <h3>Motivo da Perda</h3>
                                    <div className="form-group" style={{ marginTop: 16 }}>
                                        <label>Selecione o motivo de encerramento do negócio:</label>
                                        <select className="form-select" value={lostReason} onChange={e => setLostReason(e.target.value)}>
                                            <option value="">Selecione...</option>
                                            <option value="Preço">Preço</option>
                                            <option value="Concorrente">Concorrente</option>
                                            <option value="Sem retorno">Sem retorno</option>
                                            <option value="Timing">Timing</option>
                                            <option value="Outro">Outro</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
                                        <button className="btn btn-secondary" onClick={() => {
                                            // revert
                                            const d = deals.find(x => x.id === showLostModal.dealId);
                                            if (d) setDealsData(deals.map(x => x.id === showLostModal.dealId ? { ...x, stage: d.stage } : x));
                                            setShowLostModal({ isOpen: false, dealId: null });
                                        }}>Cancelar</button>
                                        <button className="btn btn-primary" onClick={async () => {
                                            if (!lostReason) return alert('Selecione um motivo');
                                            try {
                                                await updateDeal(showLostModal.dealId as string, {
                                                    stage: 'perdido',
                                                    motivo_perda: lostReason,
                                                    data_entrada_etapa: new Date().toISOString()
                                                });
                                                setShowLostModal({ isOpen: false, dealId: null });
                                                setLostReason('');
                                                showToast('Negócio marcado como Perdido.');
                                            } catch (e) {
                                                console.error(e);
                                                alert("Erro ao atualizar!");
                                            }
                                        }}>Confirmar Perda</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Modal Novo Negócio */}
                        {showDealModal && (
                            <div className="modal-overlay" onClick={() => setShowDealModal(false)}>
                                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                                    <div className="modal-header">
                                        <h2 className="modal-title">Novo Negócio</h2>
                                        <button className="modal-close" onClick={() => setShowDealModal(false)}>✕</button>
                                    </div>
                                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                        <div>
                                            <label className="form-label">Nome do Cliente / Empresa <span style={{ color: 'var(--accent)' }}>*</span></label>
                                            <input type="text" className="form-input" value={newDealCompany} onChange={e => setNewDealCompany(e.target.value)} placeholder="Ex: Acme Corp" />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                            <div>
                                                <label className="form-label">Valor Estimado (R$) <span style={{ color: 'var(--accent)' }}>*</span></label>
                                                <input type="text" className="form-input" value={newDealValueDisplay} onChange={e => setNewDealValueDisplay(formatCurrencyInput(e.target.value))} placeholder="R$ 15.000,00" />
                                            </div>
                                            <div>
                                                <label className="form-label">Etapa Atual</label>
                                                <select className="form-select" value={newDealStage} onChange={e => setNewDealStage(e.target.value)}>
                                                    {STAGES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                            <div>
                                                <label className="form-label">Responsável <span style={{ color: 'var(--accent)' }}>*</span></label>
                                                <select className="form-select" value={newDealAssignee} onChange={e => setNewDealAssignee(e.target.value)}>
                                                    <option value="">Selecione...</option>
                                                    {teamMembers.filter(m => m.category === 'Comercial' || m.category === 'Admin Geral').map(m => (
                                                        <option key={m.id} value={m.id}>{m.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="form-label">Origem do Lead</label>
                                                <select className="form-select" value={newDealSource} onChange={e => setNewDealSource(e.target.value)}>
                                                    <option value="Indicação">Indicação</option>
                                                    <option value="Site">Site</option>
                                                    <option value="Anúncio">Anúncio</option>
                                                    <option value="Prospecção Ativa">Prospecção Ativa</option>
                                                    <option value="Outro">Outro</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                            <div>
                                                <label className="form-label">Previsão de Fechamento</label>
                                                <input type="date" className="form-input" value={newDealDate} onChange={e => setNewDealDate(e.target.value)} />
                                            </div>
                                            <div></div>
                                        </div>
                                        <div>
                                            <label className="form-label">Observações</label>
                                            <textarea className="form-input" rows={4} value={newDealObs} onChange={e => setNewDealObs(e.target.value)} placeholder="Anotações Iniciais..."></textarea>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
                                            <button className="btn btn-secondary" onClick={() => setShowDealModal(false)}>Cancelar</button>
                                            <button className="btn btn-primary" onClick={handleCreateDeal}>Salvar Negócio</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </>
                );
            })()}

            {/* TAB TIME */}
            {activeTab === 'time' && (() => {
                const teamStats = Object.entries(deals.reduce((acc, deal) => {
                    const assignee = deal.assignee || 'Sem Responsável';
                    if (!acc[assignee]) acc[assignee] = { leads: 0, wins: 0, value: 0, color: deal.assignee_color };

                    // Consider total leads for this period? For now letting it be global vs filtered
                    // Use filteredDeals if we want only period metrics
                    const isPeriod = filteredDeals.some(d => d.id === deal.id);
                    if (isPeriod) {
                        acc[assignee].leads += 1;
                        if (deal.stage === 'fechado') {
                            acc[assignee].wins += 1;
                            acc[assignee].value += deal.value;
                        }
                    }
                    return acc;
                }, {} as Record<string, { leads: number, wins: number, value: number, color: string }>))
                    .map(([name, stats]) => {
                        const currentFilterQuarter = `Q${Math.floor((Number(filterMonth) - 1) / 3) + 1}`;
                        const goal = goals.find(g => g.seller_name === name && g.month === currentFilterQuarter && g.year === filterYear);
                        const metaVal = goal ? Number(goal.goal_value) : 0;
                        const metaPerc = metaVal > 0 ? (stats.value / metaVal) * 100 : 0;
                        const convRate = stats.leads > 0 ? (stats.wins / stats.leads) * 100 : 0;

                        return {
                            name,
                            ...stats,
                            metaVal,
                            metaPerc,
                            convRate
                        };
                    }).sort((a, b) => b.value - a.value);

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                                <select className="form-select" style={{ minWidth: 120, fontSize: 13, background: 'transparent', border: 'none' }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
                                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                                <select className="form-select" style={{ minWidth: 90, fontSize: 13, background: 'transparent', border: 'none' }} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                                    {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button className="btn btn-primary" onClick={() => setShowTeamMemberModal(true)}>
                                    <Users size={14} style={{ marginRight: 6 }} /> + Adicionar Membro
                                </button>
                                <button className="btn btn-secondary" onClick={() => setShowGoalModal(true)}>
                                    <Target size={14} style={{ marginRight: 6 }} /> Ajustar Metas
                                </button>
                            </div>
                        </div>

                        {/* Cards dos Vendedores */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                            {teamStats.map((seller, idx) => (
                                <div key={seller.name} className="card" style={{ padding: 20 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: seller.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: 16, fontWeight: 'bold' }}>
                                                {seller.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: 16 }}>{seller.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{seller.wins} vendas de {seller.leads} leads</div>
                                            </div>
                                        </div>
                                        {idx === 0 && <div style={{ background: 'var(--primary)', color: '#fff', fontSize: 10, fontWeight: 'bold', padding: '4px 8px', borderRadius: 12 }}>TOP 1</div>}
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Receita Gerada</span>
                                        <span style={{ fontWeight: 600, fontSize: 18, color: 'var(--success)' }}>{formatCurrency(seller.value)}</span>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Taxa de Conversão</span>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>{seller.convRate.toFixed(1)}%</span>
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                                            <span>Meta: {formatCurrency(seller.metaVal)}</span>
                                            <span style={{ color: seller.metaPerc >= 100 ? 'var(--success)' : 'inherit' }}>{seller.metaPerc.toFixed(1)}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${Math.min(seller.metaPerc, 100)}%`, background: seller.metaPerc >= 100 ? 'var(--success)' : 'var(--primary)', transition: 'width 1s ease' }}></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Gráficos de Vendedores e Tabela */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                            {/* Gráfico Comparativo */}
                            <div className="chart-card">
                                <div className="chart-title">Receita por Vendedor ({filterMonth}/{filterYear})</div>
                                <div style={{ width: '100%', height: 300 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={teamStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$ ${v / 1000}k`} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                                                formatter={(value: number | undefined) => formatCurrency(value || 0)}
                                            />
                                            <Bar dataKey="value" name="Receita Realizada" radius={[4, 4, 0, 0]} barSize={40}>
                                                {teamStats.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Ranking Table */}
                            <div className="table-card">
                                <h3>Ranking do Período</h3>
                                <table className="data-table" style={{ marginTop: 16 }}>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Nome</th>
                                            <th>Receita</th>
                                            <th>Vendas</th>
                                            <th>Conversão</th>
                                            <th>% Meta</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {teamStats.map((seller, idx) => (
                                            <tr key={seller.name}>
                                                <td>{idx + 1}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: seller.color }}></div>
                                                        {seller.name}
                                                    </div>
                                                </td>
                                                <td>{formatCurrency(seller.value)}</td>
                                                <td>{seller.wins}</td>
                                                <td>{seller.convRate.toFixed(1)}%</td>
                                                <td style={{ color: seller.metaPerc >= 100 ? 'var(--success)' : 'inherit' }}>
                                                    {seller.metaPerc.toFixed(1)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Modal para Ajustar Metas */}
                        {showGoalModal && (
                            <div className="modal-overlay" onClick={() => setShowGoalModal(false)}>
                                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                                    <div className="modal-header">
                                        <h2 className="modal-title">Gerenciar Metas ({goalQuarter}/{goalYear})</h2>
                                        <button className="modal-close" onClick={() => setShowGoalModal(false)}>✕</button>
                                    </div>
                                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                            <div className="form-group">
                                                <label className="form-label">Trimestre</label>
                                                <select className="form-select" value={goalQuarter} onChange={e => setGoalQuarter(e.target.value)}>
                                                    <option value="Q1">Q1 (Jan - Mar)</option>
                                                    <option value="Q2">Q2 (Abr - Jun)</option>
                                                    <option value="Q3">Q3 (Jul - Set)</option>
                                                    <option value="Q4">Q4 (Out - Dez)</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Ano</label>
                                                <select className="form-select" value={goalYear} onChange={e => setGoalYear(e.target.value)}>
                                                    <option value="2024">2024</option>
                                                    <option value="2025">2025</option>
                                                    <option value="2026">2026</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                            <div className="form-group">
                                                <label className="form-label">Vendedor <span style={{ color: 'var(--accent)' }}>*</span></label>
                                                <select className="form-select" value={goalSellerName} onChange={e => setGoalSellerName(e.target.value)}>
                                                    <option value="">Selecione...</option>
                                                    {teamStats.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Valor da Meta <span style={{ color: 'var(--accent)' }}>*</span></label>
                                                <input type="text" className="form-input" value={goalValue} onChange={e => setGoalValue(formatCurrencyInput(e.target.value))} placeholder="R$ 0,00" />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
                                            <button className="btn btn-secondary" onClick={() => setShowGoalModal(false)}>Cancelar</button>
                                            <button className="btn btn-primary" onClick={async () => {
                                                if (!goalSellerName || !goalValue) return alert('Preencha os campos');
                                                try {
                                                    const existingGoal = goals.find(g => g.seller_name === goalSellerName && g.month === goalQuarter && g.year === goalYear);
                                                    if (existingGoal) await removeSellerGoal(existingGoal.id);
                                                    await addSellerGoal({
                                                        seller_name: goalSellerName,
                                                        month: goalQuarter,
                                                        year: goalYear,
                                                        goal_value: parseCurrencyInput(goalValue)
                                                    });
                                                    setGoalSellerName(''); setGoalValue('');
                                                    showToast('Meta atualizada com sucesso!');
                                                } catch (e) {
                                                    console.error(e);
                                                    alert("Erro ao atualizar!");
                                                }
                                            }}>Salvar Meta</button>
                                        </div>

                                        <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                                        <h4 style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: -8 }}>Metas Atuais no Período</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                                            {goals.filter(g => g.month === goalQuarter && g.year === goalYear).map(g => (
                                                <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{g.seller_name}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <strong style={{ color: 'var(--accent-light)' }}>{formatCurrency(g.goal_value)}</strong>
                                                        <button className="btn" style={{ padding: 6, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: 6 }} onClick={() => removeSellerGoal(g.id)}>
                                                            <Ban size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {goals.filter(g => g.month === goalQuarter && g.year === goalYear).length === 0 && (
                                                <p className="text-muted" style={{ fontSize: 13 }}>Nenhuma meta definida neste período.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Modal Add Member */}
                        {showTeamMemberModal && (
                            <div className="modal-overlay" onClick={() => setShowTeamMemberModal(false)}>
                                <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                                    <div className="modal-header">
                                        <h2 className="modal-title">Adicionar Membro</h2>
                                        <button className="modal-close" onClick={() => setShowTeamMemberModal(false)}>✕</button>
                                    </div>
                                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                        <div>
                                            <label className="form-label">Nome Completo <span style={{ color: 'var(--accent)' }}>*</span></label>
                                            <input type="text" className="form-input" value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="Ex: João Silva" />
                                        </div>
                                        <div>
                                            <label className="form-label">Cargo</label>
                                            <input type="text" className="form-input" value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)} placeholder="Ex: Vendedor" />
                                        </div>
                                        <div>
                                            <label className="form-label">Meta Trimestral (R$)</label>
                                            <input type="text" className="form-input" value={newMemberGoal} onChange={e => setNewMemberGoal(formatCurrencyInput(e.target.value))} placeholder="R$ 50.000,00" />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
                                            <button className="btn btn-secondary" onClick={() => setShowTeamMemberModal(false)}>Cancelar</button>
                                            <button className="btn btn-primary" onClick={handleAddMember}>Salvar</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* TAB CRM */}
            {
                activeTab === 'crm' && (() => {
                    const searchLower = searchQuery.toLowerCase();
                    const filteredClients = clients.filter(c => {
                        const matchesSearch = c.name.toLowerCase().includes(searchLower) || (c.contact_name && c.contact_name.toLowerCase().includes(searchLower));
                        const matchesTab = crmSubTab === 'inativos' ? c.status === 'Inativo' : c.status !== 'Inativo';
                        return matchesSearch && matchesTab;
                    });

                    // Badge helpers
                    const hasUpcomingMeeting = (clientId: string) => meetings.some(m => m.client_id === clientId && m.status === 'Agendada' && new Date(m.date) >= getBahiaDate());
                    const hasOpenComplaint = (clientId: string) => feedbacks.some(f => f.client_id === clientId && f.type === 'Reclamação');

                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="Buscar por cliente ou contato..."
                                        style={{ minWidth: 300 }}
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                    />
                                    <div style={{ display: 'flex', gap: 2, background: 'var(--bg-secondary)', borderRadius: 8, padding: 2 }}>
                                        <button style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 500, background: crmSubTab === 'ativos' ? 'var(--primary)' : 'transparent', color: crmSubTab === 'ativos' ? '#fff' : 'var(--text-muted)' }} onClick={() => setCrmSubTab('ativos')}>Ativos</button>
                                        <button style={{ padding: '6px 14px', fontSize: 12, borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 500, background: crmSubTab === 'inativos' ? 'var(--primary)' : 'transparent', color: crmSubTab === 'inativos' ? '#fff' : 'var(--text-muted)' }} onClick={() => setCrmSubTab('inativos')}>Inativos</button>
                                    </div>
                                </div>
                                <button className="btn btn-primary" onClick={() => setShowClientModal(true)}>
                                    <Plus size={14} /> Novo Cliente
                                </button>
                            </div>

                            <div className="table-card">
                                {filteredClients.length === 0 ? (
                                    <div className="p-8 text-center text-muted">Nenhum cliente cadastrado.</div>
                                ) : (
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Empresa / Cliente</th>
                                                <th>Contato</th>
                                                <th>E-mail</th>
                                                <th>Telefone</th>
                                                <th>Mensalidade</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredClients.map(c => (
                                                <tr key={c.id} onClick={() => { setSelectedClient(c); setClientTab('info'); setEditingClientData(null); }} style={{ cursor: 'pointer' }} className="hover:bg-white/5 transition-colors">
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <strong>{c.name}</strong>
                                                            {(() => {
                                                                const upcoming = meetings.find(m => m.client_id === c.id && m.status === 'Agendada' && new Date(m.date) >= getBahiaDate());
                                                                return upcoming ? (
                                                                    <span title={`Próxima reunião: ${new Date(upcoming.date).toLocaleString('pt-br', { dateStyle: 'short', timeStyle: 'short' })}h`} style={{ display: 'flex', alignItems: 'center', cursor: 'help' }}>
                                                                        <CalendarDays size={14} color="var(--accent)" />
                                                                    </span>
                                                                ) : null;
                                                            })()}
                                                        </div>
                                                        {c.segment && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.segment}</div>}
                                                    </td>
                                                    <td>{c.contact_name || '-'}</td>
                                                    <td>{c.contact_email || '-'}</td>
                                                    <td>{c.contact_phone || '-'}</td>
                                                    <td>{formatCurrency(c.monthly_fee || 0)}</td>
                                                    <td>
                                                        <span style={{
                                                            background: c.status === 'Ativo' ? '#10B98122' : c.status === 'Em negociação' ? '#F59E0B22' : '#EF444422',
                                                            color: c.status === 'Ativo' ? '#10B981' : c.status === 'Em negociação' ? '#F59E0B' : '#EF4444',
                                                            padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500
                                                        }}>
                                                            {c.status || 'Ativo'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>

                            {/* Modal Novo Cliente */}
                            {showClientModal && (
                                <div className="modal-overlay" onClick={() => setShowClientModal(false)}>
                                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                                        <div className="modal-header">
                                            <h2 className="modal-title">Cadastrar Novo Cliente</h2>
                                            <button className="modal-close" onClick={() => setShowClientModal(false)}>✕</button>
                                        </div>
                                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                <div>
                                                    <label className="form-label">Nome da Empresa <span style={{ color: 'var(--accent)' }}>*</span></label>
                                                    <input type="text" className="form-input" value={newClientData.name || ''} onChange={e => setNewClientData({ ...newClientData, name: e.target.value })} placeholder="Ex: Tech Solutions" />
                                                </div>
                                                <div>
                                                    <label className="form-label">CNPJ</label>
                                                    <input type="text" className="form-input" value={newClientData.cnpj || ''} onChange={e => setNewClientData({ ...newClientData, cnpj: e.target.value })} placeholder="Ex: 00.000.000/0001-00" />
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                <div>
                                                    <label className="form-label">Segmento</label>
                                                    <input type="text" className="form-input" value={newClientData.segment || ''} onChange={e => setNewClientData({ ...newClientData, segment: e.target.value })} placeholder="Ex: Tecnologia" />
                                                </div>
                                                <div>
                                                    <label className="form-label">Status</label>
                                                    <select className="form-select" value={newClientData.status || 'Ativo'} onChange={e => setNewClientData({ ...newClientData, status: e.target.value as any })}>
                                                        <option value="Ativo">Ativo</option>
                                                        <option value="Em negociação">Em negociação</option>
                                                        <option value="Inativo">Inativo</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <hr style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '4px 0' }} />
                                            <h4 style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: -8 }}>Dados do Contato</h4>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                <div>
                                                    <label className="form-label">Nome do Contato</label>
                                                    <input type="text" className="form-input" value={newClientData.contact_name || ''} onChange={e => setNewClientData({ ...newClientData, contact_name: e.target.value })} placeholder="Ex: João da Silva" />
                                                </div>
                                                <div>
                                                    <label className="form-label">E-mail</label>
                                                    <input type="email" className="form-input" value={newClientData.contact_email || ''} onChange={e => setNewClientData({ ...newClientData, contact_email: e.target.value })} placeholder="joao@techsolutions.com" />
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                <div>
                                                    <label className="form-label">Telefone</label>
                                                    <input type="text" className="form-input" value={newClientData.contact_phone || ''} onChange={e => setNewClientData({ ...newClientData, contact_phone: e.target.value })} placeholder="(11) 99999-9999" />
                                                </div>
                                                <div>
                                                    <label className="form-label">Responsável</label>
                                                    <select className="form-select" value={newClientData.responsible_id || ''} onChange={e => setNewClientData({ ...newClientData, responsible_id: e.target.value })}>
                                                        <option value="">Selecione...</option>
                                                        {teamMembers.map(m => (
                                                            <option key={m.id} value={m.id}>{m.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                <div>
                                                    <label className="form-label">Mensalidade (R$)</label>
                                                    <input type="text" className="form-input" value={newClientData.monthly_fee ? formatCurrencyInput(String(Math.round(newClientData.monthly_fee * 100))) : ''} onChange={e => setNewClientData({ ...newClientData, monthly_fee: parseCurrencyInput(e.target.value) })} placeholder="R$ 5.000,00" />
                                                </div>
                                                <div>
                                                    <label className="form-label">Taxa de Setup (R$)</label>
                                                    <input type="text" className="form-input" value={newClientData.setup_fee ? formatCurrencyInput(String(Math.round(newClientData.setup_fee * 100))) : ''} onChange={e => setNewClientData({ ...newClientData, setup_fee: parseCurrencyInput(e.target.value) })} placeholder="R$ 2.000,00" />
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
                                                <button className="btn btn-secondary" onClick={() => setShowClientModal(false)}>Cancelar</button>
                                                <button className="btn btn-primary" onClick={handleCreateClient}>Salvar Cliente</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modal Selected Client (Perfil Avançado) */}
                            {selectedClient && (
                                <div className="modal-overlay" onClick={() => setSelectedClient(null)}>
                                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 700, maxHeight: '90vh', overflowY: 'auto' }}>
                                        <div className="modal-header">
                                            <h2 className="modal-title">{selectedClient.name}</h2>
                                            <button className="modal-close" onClick={() => setSelectedClient(null)}>✕</button>
                                        </div>

                                        {/* Tabs do Cliente */}
                                        <div className="finance-tabs" style={{ marginBottom: 24 }}>
                                            <button className={`finance-tab ${clientTab === 'info' ? 'active' : ''}`} onClick={() => setClientTab('info')}>
                                                <FileText size={16} /> Detalhes
                                            </button>
                                            <button className={`finance-tab ${clientTab === 'reunioes' ? 'active' : ''}`} onClick={() => setClientTab('reunioes')}>
                                                <Presentation size={16} /> Reuniões
                                            </button>
                                            <button className={`finance-tab ${clientTab === 'feedbacks' ? 'active' : ''}`} onClick={() => setClientTab('feedbacks')}>
                                                <Sparkles size={16} /> Feedbacks
                                            </button>
                                        </div>

                                        <div className="modal-body">
                                            {clientTab === 'info' && editingClientData && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                        <div>
                                                            <label className="form-label">Nome da Empresa</label>
                                                            <input type="text" className="form-input" value={editingClientData.name || ''} onChange={e => setEditingClientData({ ...editingClientData, name: e.target.value })} />
                                                        </div>
                                                        <div>
                                                            <label className="form-label">CNPJ</label>
                                                            <input type="text" className="form-input" value={editingClientData.cnpj || ''} onChange={e => setEditingClientData({ ...editingClientData, cnpj: e.target.value })} />
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                        <div>
                                                            <label className="form-label">Segmento</label>
                                                            <input type="text" className="form-input" value={editingClientData.segment || ''} onChange={e => setEditingClientData({ ...editingClientData, segment: e.target.value })} />
                                                        </div>
                                                        <div>
                                                            <label className="form-label">Contato Oficial</label>
                                                            <input type="text" className="form-input" value={editingClientData.contact_name || ''} onChange={e => setEditingClientData({ ...editingClientData, contact_name: e.target.value })} />
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                        <div>
                                                            <label className="form-label">Email</label>
                                                            <input type="email" className="form-input" value={editingClientData.contact_email || ''} onChange={e => setEditingClientData({ ...editingClientData, contact_email: e.target.value })} />
                                                        </div>
                                                        <div>
                                                            <label className="form-label">Telefone</label>
                                                            <input type="text" className="form-input" value={editingClientData.contact_phone || ''} onChange={e => setEditingClientData({ ...editingClientData, contact_phone: e.target.value })} />
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                        <div>
                                                            <label className="form-label">Mensalidade (R$)</label>
                                                            <input type="text" className="form-input" value={editingClientData.monthly_fee ? formatCurrencyInput(String(Math.round(editingClientData.monthly_fee * 100))) : ''} onChange={e => setEditingClientData({ ...editingClientData, monthly_fee: parseCurrencyInput(e.target.value) })} />
                                                        </div>
                                                        <div>
                                                            <label className="form-label">Taxa de Setup (R$)</label>
                                                            <input type="text" className="form-input" value={(editingClientData as any).setup_fee ? formatCurrencyInput(String(Math.round((editingClientData as any).setup_fee * 100))) : ''} onChange={e => setEditingClientData({ ...editingClientData, setup_fee: parseCurrencyInput(e.target.value) })} />
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <button className="btn btn-secondary" onClick={() => setEditingClientData(null)}>Cancelar</button>
                                                        <button className="btn btn-primary" onClick={handleEditClient}>Salvar Alterações</button>
                                                    </div>
                                                </div>
                                            )}
                                            {clientTab === 'info' && !editingClientData && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                                        <div><label className="text-muted" style={{ fontSize: 12 }}>Segmento</label><div>{selectedClient.segment || '-'}</div></div>
                                                        <div><label className="text-muted" style={{ fontSize: 12 }}>CNPJ</label><div>{selectedClient.cnpj || '-'}</div></div>
                                                        <div><label className="text-muted" style={{ fontSize: 12 }}>Contato Oficial</label><div>{selectedClient.contact_name || '-'}</div></div>
                                                        <div><label className="text-muted" style={{ fontSize: 12 }}>Email</label><div>{selectedClient.contact_email || '-'}</div></div>
                                                        <div><label className="text-muted" style={{ fontSize: 12 }}>Telefone</label><div>{selectedClient.contact_phone || '-'}</div></div>
                                                        <div><label className="text-muted" style={{ fontSize: 12 }}>Mensalidade</label><div>{formatCurrency(selectedClient.monthly_fee || 0)}</div></div>
                                                        <div><label className="text-muted" style={{ fontSize: 12 }}>Taxa de Setup</label><div>{formatCurrency((selectedClient as any).setup_fee || 0)}</div></div>
                                                        <div><label className="text-muted" style={{ fontSize: 12 }}>Status</label><div>{selectedClient.status}</div></div>
                                                        <div><label className="text-muted" style={{ fontSize: 12 }}>Data de Criação</label><div>{new Date(selectedClient.created_at || '').toLocaleDateString('pt-br')}</div></div>
                                                    </div>
                                                    {/* Action buttons: Edit / Inactivate */}
                                                    <div style={{ display: 'flex', gap: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setEditingClientData(selectedClient)}>Editar</button>
                                                        {selectedClient.status !== 'Inativo' ? (
                                                            <button className="btn" style={{ fontSize: 13, background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 8 }}
                                                                onClick={async () => {
                                                                    if (!confirm('Deseja inativar este cliente?')) return;
                                                                    try {
                                                                        const updated = await updateClient(selectedClient.id, { status: 'Inativo' });
                                                                        setClientsData(clients.map(c => c.id === updated.id ? updated : c));
                                                                        setSelectedClient(updated);
                                                                        showToast('Cliente inativado.');
                                                                    } catch (e) { showToast('Erro ao inativar cliente.'); }
                                                                }}>
                                                                Inativar
                                                            </button>
                                                        ) : (
                                                            <div style={{ display: 'flex', gap: 12 }}>
                                                                <button className="btn" style={{ fontSize: 13, background: 'rgba(16,185,129,0.15)', color: '#10B981', border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 8 }}
                                                                    onClick={async () => {
                                                                        try {
                                                                            const updated = await updateClient(selectedClient.id, { status: 'Ativo' });
                                                                            setClientsData(clients.map(c => c.id === updated.id ? updated : c));
                                                                            setSelectedClient(updated);
                                                                            showToast('Cliente reativado.');
                                                                        } catch (e) { showToast('Erro ao reativar cliente.'); }
                                                                    }}>
                                                                    Reativar
                                                                </button>
                                                                <button className="btn" style={{ fontSize: 13, background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 8 }}
                                                                    onClick={() => handleDeleteClient(selectedClient)}>
                                                                    Excluir
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {clientTab === 'reunioes' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                                    <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12 }}>
                                                        <h4 style={{ marginBottom: 16, fontSize: 14 }}>Agendar Nova Reunião</h4>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                                            <input type="text" className="form-input" placeholder="Título. Ex: Alinhamento Mensal" value={newMeeting.title || ''} onChange={e => setNewMeeting({ ...newMeeting, title: e.target.value })} />
                                                            <input type="datetime-local" className="form-input" value={newMeeting.date || ''} onChange={e => setNewMeeting({ ...newMeeting, date: e.target.value })} />
                                                        </div>
                                                        <textarea className="form-input" rows={2} placeholder="Pauta / Observações..." value={newMeeting.observations || ''} onChange={e => setNewMeeting({ ...newMeeting, observations: e.target.value })} style={{ marginBottom: 12 }} />
                                                        <button className="btn btn-primary" onClick={handleCreateMeeting}>Agendar</button>
                                                    </div>

                                                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                                                        <h4 style={{ marginBottom: 16, fontSize: 14 }}>Próximas Reuniões</h4>
                                                        {(() => {
                                                            const upcomingMeetings = meetings.filter(m => m.client_id === selectedClient.id && m.status === 'Agendada' && new Date(m.date) >= getBahiaDate());
                                                            if (upcomingMeetings.length === 0) return <div className="text-muted text-center" style={{ fontSize: 13 }}>Nenhuma reunião futura.</div>;
                                                            return (
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                                    {upcomingMeetings.map(m => (
                                                                        <div key={m.id} style={{ padding: 12, border: '1px solid var(--border-color)', borderRadius: 8 }}>
                                                                            {editingMeetingId === m.id ? (
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                                    <input type="text" className="form-input" value={editingMeetingForm.title || ''} onChange={e => setEditingMeetingForm({ ...editingMeetingForm, title: e.target.value })} />
                                                                                    <input type="datetime-local" className="form-input" value={editingMeetingForm.date || ''} onChange={e => setEditingMeetingForm({ ...editingMeetingForm, date: e.target.value })} />
                                                                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                                                                                        <button className="btn btn-secondary" onClick={() => setEditingMeetingId(null)}>Voltar</button>
                                                                                        <button className="btn btn-primary" onClick={() => handleUpdateMeeting(m.id)}>Salvar</button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <>
                                                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                        <strong style={{ fontSize: 14 }}>{m.title}</strong>
                                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(m.date).toLocaleString('pt-br')}</span>
                                                                                            <button className="btn" style={{ padding: 4, background: 'transparent' }} onClick={() => { setEditingMeetingId(m.id); setEditingMeetingForm({ ...m }); }} title="Editar">📝</button>
                                                                                            <button className="btn" style={{ padding: 4, background: 'transparent', color: 'var(--danger)' }} onClick={() => handleDeleteMeeting(m.id)} title="Cancelar">✕</button>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{m.observations || 'Sem observações'}</div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            )}

                                            {clientTab === 'feedbacks' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                                                    <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 12 }}>
                                                        <h4 style={{ marginBottom: 16, fontSize: 14 }}>Novo Feedback</h4>
                                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 12 }}>
                                                            <select className="form-select" value={newFeedback.type || 'Elogio'} onChange={e => setNewFeedback({ ...newFeedback, type: e.target.value as any })}>
                                                                <option value="Elogio">Elogio</option>
                                                                <option value="Sugestão">Sugestão</option>
                                                                <option value="Reclamação">Reclamação</option>
                                                            </select>
                                                            <textarea className="form-input" rows={3} placeholder="Descreva o feedback do cliente..." value={newFeedback.description || ''} onChange={e => setNewFeedback({ ...newFeedback, description: e.target.value })} />
                                                        </div>
                                                        <button className="btn btn-primary" onClick={handleCreateFeedback}>Registrar Feedback</button>
                                                    </div>

                                                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                                                        <h4 style={{ marginBottom: 16, fontSize: 14 }}>Registros</h4>
                                                        {feedbacks.filter(f => f.client_id === selectedClient.id).length === 0 ? (
                                                            <div className="text-muted text-center" style={{ fontSize: 13 }}>Nenhum feedback registrado.</div>
                                                        ) : (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                                                {feedbacks.filter(f => f.client_id === selectedClient.id).map(f => (
                                                                    <div key={f.id} style={{ padding: 12, border: '1px solid var(--border-color)', borderRadius: 8 }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                                            <span style={{
                                                                                fontSize: 12, padding: '2px 8px', borderRadius: 12,
                                                                                background: f.type === 'Elogio' ? '#10B98122' : f.type === 'Reclamação' ? '#EF444422' : '#F59E0B22',
                                                                                color: f.type === 'Elogio' ? '#10B981' : f.type === 'Reclamação' ? '#EF4444' : '#F59E0B'
                                                                            }}>
                                                                                {f.type}
                                                                            </span>
                                                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(f.created_at || '').toLocaleDateString('pt-br')}</span>
                                                                        </div>
                                                                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{f.description}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                        </div> {/* end of modal-body */}

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
                                            <button className="btn btn-secondary" onClick={() => setSelectedClient(null)}>Fechar</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()
            }
            {/* Modal Selected Deal (CRUD Kanban) */}
            {selectedDeal && (
                <div className="modal-overlay" onClick={() => { setSelectedDeal(null); setEditingDealData(null); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingDealData ? 'Editar Negócio' : selectedDeal.title}</h2>
                            <button className="modal-close" onClick={() => { setSelectedDeal(null); setEditingDealData(null); }}>✕</button>
                        </div>
                        <div className="modal-body">
                            {editingDealData ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div>
                                        <label className="form-label">Título do Negócio *</label>
                                        <input type="text" className="form-input" value={editingDealData.title || ''} onChange={e => setEditingDealData({ ...editingDealData, title: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="form-label">Empresa / Cliente *</label>
                                        <input type="text" className="form-input" value={editingDealData.company || ''} onChange={e => setEditingDealData({ ...editingDealData, company: e.target.value })} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div>
                                            <label className="form-label">Valor (R$)</label>
                                            <input type="text" className="form-input" value={editingDealData.value ? formatCurrencyInput(String(Math.round(editingDealData.value * 100))) : ''} onChange={e => setEditingDealData({ ...editingDealData, value: parseCurrencyInput(e.target.value) })} />
                                        </div>
                                        <div>
                                            <label className="form-label">Probabilidade (%)</label>
                                            <input type="number" className="form-input" value={editingDealData.probability || ''} onChange={e => setEditingDealData({ ...editingDealData, probability: Number(e.target.value) })} />
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div>
                                            <label className="form-label">Origem</label>
                                            <select className="form-select" value={editingDealData.origem || ''} onChange={e => setEditingDealData({ ...editingDealData, origem: e.target.value })}>
                                                <option value="">Selecione...</option>
                                                <option value="Inbound">Inbound</option>
                                                <option value="Outbound">Outbound</option>
                                                <option value="Indicação">Indicação</option>
                                                <option value="Parceria">Parceria</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="form-label">Previsão Fechamento</label>
                                            <input type="date" className="form-input" value={editingDealData.fechamento_previsto ? new Date(editingDealData.fechamento_previsto).toISOString().split('T')[0] : ''} onChange={e => setEditingDealData({ ...editingDealData, fechamento_previsto: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="form-label">Responsável</label>
                                        <select className="form-select" value={editingDealData.assignee || ''} onChange={e => {
                                            const member = team.find(t => t.id === e.target.value);
                                            if (member) {
                                                setEditingDealData({ ...editingDealData, assignee: member.name, assignee_color: member.avatar_color });
                                            } else {
                                                setEditingDealData({ ...editingDealData, assignee: e.target.value });
                                            }
                                        }}>
                                            <option value="">Selecione...</option>
                                            {team.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="form-label">Observações</label>
                                        <textarea className="form-input" rows={3} value={editingDealData.observacoes || ''} onChange={e => setEditingDealData({ ...editingDealData, observacoes: e.target.value })}></textarea>
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16 }}>
                                        <button className="btn btn-secondary" onClick={() => setEditingDealData(null)}>Cancelar</button>
                                        <button className="btn btn-primary" onClick={handleEditDeal}>Salvar Alterações</button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        <div><label className="text-muted" style={{ fontSize: 12 }}>Empresa</label><div>{selectedDeal.company || '-'}</div></div>
                                        <div><label className="text-muted" style={{ fontSize: 12 }}>Valor</label><div style={{ color: 'var(--success)', fontWeight: 'bold' }}>{formatCurrency(selectedDeal.value)}</div></div>
                                        <div><label className="text-muted" style={{ fontSize: 12 }}>Probabilidade</label><div>{selectedDeal.probability}%</div></div>
                                        <div><label className="text-muted" style={{ fontSize: 12 }}>Fase Atual</label><div>{STAGES.find(s => s.id === selectedDeal.stage)?.label || selectedDeal.stage}</div></div>
                                        <div><label className="text-muted" style={{ fontSize: 12 }}>Origem</label><div>{selectedDeal.origem || '-'}</div></div>
                                        <div><label className="text-muted" style={{ fontSize: 12 }}>Fechamento Previsto</label><div>{selectedDeal.fechamento_previsto ? new Date(selectedDeal.fechamento_previsto).toLocaleDateString() : '-'}</div></div>
                                        <div><label className="text-muted" style={{ fontSize: 12 }}>Responsável</label><div>{selectedDeal.assignee || '-'}</div></div>
                                    </div>
                                    <div><label className="text-muted" style={{ fontSize: 12 }}>Observações</label><div style={{ whiteSpace: 'pre-wrap', fontSize: 13, background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8 }}>{selectedDeal.observacoes || 'Nenhuma observação.'}</div></div>

                                    <div style={{ display: 'flex', gap: 12, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)', justifyContent: 'space-between' }}>
                                        <div>
                                            <button className="btn" style={{ fontSize: 13, background: 'rgba(239,68,68,0.15)', color: '#EF4444', border: 'none', cursor: 'pointer', padding: '8px 16px', borderRadius: 8 }} onClick={() => handleDeleteDeal(selectedDeal)}>Excluir</button>
                                        </div>
                                        <div>
                                            <button className="btn btn-secondary" style={{ fontSize: 13 }} onClick={() => setEditingDealData(selectedDeal)}>Editar</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div >
    );
}

function KanbanColumn({ stage, colDeals, colTotal, onCardClick }: { stage: any, colDeals: Deal[], colTotal: number, onCardClick: (d: Deal) => void }) {
    const { setNodeRef, isOver } = useDroppable({ id: stage.id });
    return (
        <div ref={setNodeRef} style={{
            minWidth: 300, width: 300, display: 'flex', flexDirection: 'column', gap: 12,
            background: 'var(--bg-secondary)', padding: 12, borderRadius: 12,
            border: isOver ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.05)',
            boxShadow: isOver ? '0 0 15px rgba(249, 115, 22, 0.1)' : 'none',
            height: 'max-content', minHeight: '60vh', transition: 'all 0.2s ease'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: stage.color }}></div>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{stage.label}</span>
                    <span style={{ fontSize: 12, background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 12 }}>{colDeals.length}</span>
                </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>
                {formatCurrency(colTotal)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {colDeals.map(d => <KanbanCard key={d.id} deal={d} onClick={() => onCardClick(d)} />)}
                {colDeals.length === 0 && (
                    <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 8 }}>
                        Solte um negócio aqui
                    </div>
                )}
            </div>
        </div>
    );
}

function KanbanCard({ deal, isOverlay, onClick }: { deal: Deal, isOverlay?: boolean, onClick?: () => void }) {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: deal.id,
        data: deal
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? (isOverlay ? 1 : 0.3) : 1,
        zIndex: isDragging ? 999 : 1,
    } : undefined;

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            onClick={(e) => {
                if (!isDragging && onClick) {
                    onClick();
                }
            }}
            style={{
                ...style,
                background: 'var(--bg-primary)', padding: 16, borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.05)', cursor: 'grab', display: 'flex', flexDirection: 'column', gap: 8,
                boxShadow: isOverlay ? '0 12px 24px rgba(0,0,0,0.5)' : 'none',
                scale: isOverlay ? '1.02' : '1'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <strong style={{ fontSize: 14 }}>{deal.company}</strong>
            </div>
            <div style={{ color: 'var(--success)', fontWeight: 600, fontSize: 14 }}>{formatCurrency(deal.value)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: deal.assignee_color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: 9, fontWeight: 'bold' }}>
                        {deal.assignee.substring(0, 1)}
                    </div>{deal.assignee}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Activity size={12} /> {getDaysInStage(deal.data_entrada_etapa || deal.created_at)}d
                </div>
            </div>
        </div>
    );
}
