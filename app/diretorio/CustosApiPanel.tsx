'use client';

import { useState, useMemo } from 'react';
import { useDiretorioCustosAll, useDiretorioClientes } from '@/lib/hooks';
import { Server, Activity, ArrowUpRight, Ban } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';

export default function CustosApiPanel() {
    const { data: custosAll, loading: loadingCustos } = useDiretorioCustosAll();
    const { data: clientesAll, loading: loadingClientes } = useDiretorioClientes();

    const loading = loadingCustos || loadingClientes;

    // 1. Calculate the current month string (e.g. "2024-04")
    const d = new Date();
    const currentMesAno = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

    // 2. Aggregate Data
    const { totalMesAtual, topClientes, topServicos } = useMemo(() => {
        if (!custosAll || !clientesAll) return { totalMesAtual: 0, topClientes: [], topServicos: [] };

        const monthCustos = custosAll.filter(c => c.mes_ano === currentMesAno);

        let total = 0;
        const cliMap: Record<string, number> = {};
        const servMap: Record<string, number> = {};

        monthCustos.forEach(c => {
            const v = c.valor || 0;
            total += v;

            // Group by client
            if (!cliMap[c.cliente_id]) cliMap[c.cliente_id] = 0;
            cliMap[c.cliente_id] += v;

            // Group by service
            if (!servMap[c.servico]) servMap[c.servico] = 0;
            servMap[c.servico] += v;
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
    }, [custosAll, clientesAll, currentMesAno]);

    const COLORS = ['#F97316', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

    if (loading) {
        return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando dados de custos...</div>;
    }

    return (
        <div style={{ padding: '0 32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Dashboard de Infraestrutura</h2>

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
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Custo Total ({currentMesAno})</span>
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
        </div>
    );
}
