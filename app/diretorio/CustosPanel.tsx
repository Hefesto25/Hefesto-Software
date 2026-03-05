'use client';

import { useState, useMemo } from 'react';
import { useAllDiretorioAssinaturas, useDiretorioClientes } from '@/lib/hooks';
import { Server, Activity, ArrowUpRight, Ban, DollarSign, Calendar, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

const MONTHS = [
    { value: 'all', label: 'Todos os Meses' },
    { value: '1', label: 'Janeiro' },
    { value: '2', label: 'Fevereiro' },
    { value: '3', label: 'Março' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Maio' },
    { value: '6', label: 'Junho' },
    { value: '7', label: 'Julho' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
];

const YEARS = [
    { value: 'all', label: 'Todos os Anos' },
    { value: '2024', label: '2024' },
    { value: '2025', label: '2025' },
    { value: '2026', label: '2026' },
    { value: '2027', label: '2027' }
];

export default function CustosPanel({ searchQuery = '' }: { searchQuery?: string }) {
    const { data: assinaturasAll, loading: loadingAssinaturas } = useAllDiretorioAssinaturas();
    const { data: clientesAll, loading: loadingClientes } = useDiretorioClientes();

    const [selectedMonth, setSelectedMonth] = useState('all');
    const [selectedYear, setSelectedYear] = useState('all');

    const loading = loadingAssinaturas || loadingClientes;

    // 1. Calculate the current month string (e.g. "2024-04")
    const d = new Date();
    const currentMesAno = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // 1. Filter Data
    const filteredAssinaturas = useMemo(() => {
        return assinaturasAll.filter(a => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const cliente = clientesAll.find(c => c.id === a.cliente_id);
                const cnome = cliente?.nome.toLowerCase() || '';
                const fname = a.nome_ferramenta.toLowerCase();
                if (!cnome.includes(q) && !fname.includes(q)) return false;
            }
            if (selectedYear !== 'all') {
                if (!a.data_vencimento || new Date(a.data_vencimento).getFullYear().toString() !== selectedYear) return false;
            }
            if (selectedMonth !== 'all') {
                if (!a.data_vencimento || (new Date(a.data_vencimento).getMonth() + 1).toString() !== selectedMonth) return false;
            }
            return true;
        });
    }, [assinaturasAll, clientesAll, searchQuery, selectedMonth, selectedYear]);

    // 2. Aggregate Data based on filters
    const { totalMesAtual, topClientes, topServicos } = useMemo(() => {
        if (!filteredAssinaturas || !clientesAll) return { totalMesAtual: 0, topClientes: [], topServicos: [] };

        const activeApiAssinaturas = filteredAssinaturas.filter(a =>
            a.status === 'ativa' &&
            a.categoria === 'API' &&
            a.responsavel_pag === 'nos'
        );

        let total = 0;
        const cliMap: Record<string, number> = {};
        const servMap: Record<string, number> = {};

        activeApiAssinaturas.forEach(a => {
            const v = a.valor_mensal || 0;
            total += v;

            // Group by client
            if (!cliMap[a.cliente_id]) cliMap[a.cliente_id] = 0;
            cliMap[a.cliente_id] += v;

            // Group by service
            if (!servMap[a.nome_ferramenta]) servMap[a.nome_ferramenta] = 0;
            servMap[a.nome_ferramenta] += v;
        });

        // Format Top Clients logic (join with client name)
        const sortedCli = Object.entries(cliMap)
            .sort((a, b) => b[1] - a[1]) // sort descending
            .map(([id, val]) => {
                const cli = clientesAll.find(x => x.id === id);
                return {
                    name: cli?.nome || 'Desconhecido',
                    value: val
                };
            })
            .slice(0, 5); // top 5

        // Format Top Services logic
        const sortedServ = Object.entries(servMap)
            .sort((a, b) => b[1] - a[1]) // sort descending
            .map(([name, val]) => ({ name, value: val }));

        return { totalMesAtual: total, topClientes: sortedCli, topServicos: sortedServ };
    }, [filteredAssinaturas, clientesAll]);

    const COLORS = ['#F97316', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

    if (loading) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando dados de custos...</div>;
    }

    return (
        <div style={{ padding: '0 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Dashboard de Infraestrutura</h2>
                    <div style={{ display: 'flex', gap: 8, background: 'var(--surface-card)', padding: '6px 12px', borderRadius: 24, border: '1px solid var(--border-default)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Filter size={14} color="var(--text-muted)" />
                            <select
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}
                            >
                                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>
                        <div style={{ width: 1, background: 'var(--border-default)' }} />
                        <select
                            value={selectedYear}
                            onChange={e => setSelectedYear(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: 13, outline: 'none', cursor: 'pointer' }}
                        >
                            {YEARS.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                        </select>
                    </div>
                </div>

                <div style={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-default)',
                    padding: '12px 24px',
                    borderRadius: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Custo Total ({selectedMonth !== 'all' || selectedYear !== 'all' ? 'Filtrado' : currentMesAno})</span>
                    <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--brand-primary)' }}>R$ {totalMesAtual.toFixed(2).replace('.', ',')}</span>
                </div>
            </div>

            {totalMesAtual === 0 ? (
                <div style={{ textAlign: 'center', padding: 80, border: '1px dashed var(--border-default)', borderRadius: 16 }}>
                    <Ban size={40} style={{ margin: '0 auto 16px', color: 'var(--text-muted)' }} />
                    <h3 style={{ fontSize: 18, color: 'var(--text-primary)' }}>Nenhum custo registrado</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Não há registros de custos na API para o mês atual.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
                    {/* Top Clientes (Bar Chart) */}
                    <div className="template-card" style={{ padding: 24, display: 'block' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                            <div style={{ padding: 8, background: 'rgba(249, 115, 22, 0.1)', borderRadius: 8 }}>
                                <ArrowUpRight size={18} color="var(--brand-primary)" />
                            </div>
                            <h3 style={{ fontSize: 16, margin: 0, fontWeight: 600 }}>Maiores Custos por Cliente</h3>
                        </div>
                        <div style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topClientes} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={120} tick={{ fill: 'var(--text-secondary)', fontSize: 13 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                        contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 8, padding: '8px 12px', color: '#ffffff' }}
                                        itemStyle={{ color: '#ffffff' }}
                                        formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Custo']}
                                    />
                                    <Bar dataKey="value" fill="#F97316" radius={[0, 4, 4, 0]} barSize={24} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Services (Pie Chart) */}
                    <div className="template-card" style={{ padding: 24, display: 'block' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                            <div style={{ padding: 8, background: 'rgba(59, 130, 246, 0.1)', borderRadius: 8 }}>
                                <Server size={18} color="#3B82F6" />
                            </div>
                            <h3 style={{ fontSize: 16, margin: 0, fontWeight: 600 }}>Custo por API/Serviço</h3>
                        </div>
                        <div style={{ height: 240 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={topServicos}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {topServicos.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 8, color: '#ffffff' }}
                                        itemStyle={{ color: '#ffffff' }}
                                        formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Custo']}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                            {topServicos.map((serv, i) => (
                                <div key={serv.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                                        <span style={{ color: 'var(--text-secondary)' }}>{serv.name}</span>
                                    </div>
                                    <span style={{ fontWeight: 600 }}>R$ {serv.value.toFixed(2).replace('.', ',')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* NEW SECTION: MENSALIDADES LIST */}
            <div style={{ marginTop: 40, borderTop: '1px solid var(--border-default)', paddingTop: 32 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <DollarSign size={20} color="var(--brand-primary)" />
                    Assinaturas e Custos Lançados
                </h3>

                <div className="template-grid" style={{ gap: 20 }}>
                    {filteredAssinaturas.length === 0 ? (
                        <div className="template-empty" style={{ gridColumn: '1 / -1' }}>
                            <DollarSign size={48} />
                            <p>Nenhuma assinatura encontrada para os filtros aplicados</p>
                        </div>
                    ) : (
                        filteredAssinaturas.sort((a, b) => Number(a.data_vencimento ? new Date(a.data_vencimento).getTime() : 0) - Number(b.data_vencimento ? new Date(b.data_vencimento).getTime() : 0)).map(ass => {
                            const cliente = clientesAll.find(c => c.id === ass.cliente_id);
                            return (
                                <div key={ass.id} className="template-card hover-lift" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', border: '1px solid var(--border-default)' }}>
                                    <div style={{ padding: 20 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                                                <div style={{
                                                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                                                    padding: 12,
                                                    borderRadius: 12,
                                                    border: '1px solid rgba(59, 130, 246, 0.1)'
                                                }}>
                                                    {ass.categoria === 'API' ? <Server size={22} color="#3B82F6" /> : <Activity size={22} color="#3B82F6" />}
                                                </div>
                                                <div>
                                                    <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{cliente?.nome || 'Cliente Desconhecido'}</h3>
                                                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>{ass.nome_ferramenta}</p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                                                <span className={`status-badge status-${ass.status}`} style={{ margin: 0 }}>
                                                    {ass.status.charAt(0).toUpperCase() + ass.status.slice(1)}
                                                </span>
                                                {ass.categoria && (
                                                    <span style={{ fontSize: 10, background: 'var(--bg-secondary)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 12, textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 }}>
                                                        {ass.categoria}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)',
                                        padding: '16px 20px',
                                        background: 'rgba(0,0,0,0.15)',
                                        borderTop: '1px solid var(--border-default)'
                                    }}>
                                        <div>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Vencimento</span>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
                                                {ass.data_vencimento ? new Date(ass.data_vencimento).getDate() : '--'}
                                            </div>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Responsável</span>
                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
                                                {ass.responsavel_pag === 'cliente' ? 'Cliente' : 'Agência'}
                                            </div>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 4 }}>Custo Mensal</span>
                                            <div style={{ fontWeight: 700, color: 'var(--brand-primary)', fontSize: 14 }}>
                                                {ass.valor_mensal ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ass.valor_mensal) : '--'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
