'use client';

import { useState } from 'react';
import { Search, Plus, Mail, Phone, ExternalLink } from 'lucide-react';
import { useContacts, useDeals } from '@/lib/hooks';

function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

type View = 'pipeline' | 'contatos';

const stages = [
    { key: 'lead', label: 'Leads', color: '#6B7280' },
    { key: 'proposta', label: 'Proposta', color: '#3B82F6' },
    { key: 'negociacao', label: 'Negociação', color: '#F59E0B' },
    { key: 'fechado', label: 'Fechado', color: '#10B981' },
    { key: 'perdido', label: 'Perdido', color: '#EF4444' },
];

export default function CRMPage() {
    const [view, setView] = useState<View>('pipeline');
    const [searchTerm, setSearchTerm] = useState('');
    const { data: contacts, loading: loadingContacts } = useContacts();
    const { data: deals, loading: loadingDeals } = useDeals();

    if (loadingContacts || loadingDeals) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)' }}>Carregando...</div>;
    }

    const filteredContacts = contacts.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPipeline = deals
        .filter(d => d.stage !== 'perdido' && d.stage !== 'fechado')
        .reduce((a, d) => a + d.value, 0);
    const totalFechado = deals.filter(d => d.stage === 'fechado').reduce((a, d) => a + d.value, 0);

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="view-toggle">
                        <button className={`view-toggle-btn ${view === 'pipeline' ? 'active' : ''}`} onClick={() => setView('pipeline')}>Pipeline</button>
                        <button className={`view-toggle-btn ${view === 'contatos' ? 'active' : ''}`} onClick={() => setView('contatos')}>Contatos</button>
                    </div>
                    <div className="header-search" style={{ width: 250 }}>
                        <Search size={16} />
                        <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <button className="btn btn-primary"><Plus size={14} /> Novo</button>
            </div>

            {/* KPI Summary */}
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 24 }}>
                <div className="kpi-card">
                    <div className="kpi-card-value">{contacts.length}</div>
                    <div className="kpi-card-label">Contatos</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-value">{deals.length}</div>
                    <div className="kpi-card-label">Oportunidades</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-value">{formatCurrency(totalPipeline)}</div>
                    <div className="kpi-card-label">Pipeline Ativo</div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-card-value" style={{ color: 'var(--success)' }}>{formatCurrency(totalFechado)}</div>
                    <div className="kpi-card-label">Receita Fechada</div>
                </div>
            </div>

            {view === 'pipeline' && (
                <div className="crm-pipeline">
                    {stages.map(stage => {
                        const stageDeals = deals.filter(d => d.stage === stage.key);
                        const totalValue = stageDeals.reduce((a, d) => a + d.value, 0);
                        return (
                            <div key={stage.key} className="crm-column">
                                <div className="crm-column-header">
                                    <div className="crm-column-title">
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, display: 'inline-block' }} />
                                        {stage.label}
                                        <span className="crm-column-count">{stageDeals.length}</span>
                                    </div>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatCurrency(totalValue)}</span>
                                </div>
                                {stageDeals.map(deal => (
                                    <div key={deal.id} className="crm-card">
                                        <div className="crm-card-title">{deal.title}</div>
                                        <div className="crm-card-company">{deal.company}</div>
                                        <div className="crm-card-value">{formatCurrency(deal.value)}</div>
                                        <div className="crm-card-footer">
                                            <div className="crm-card-date">{new Date(deal.date).toLocaleDateString('pt-BR')}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{deal.probability}%</span>
                                                <div className="crm-card-avatar" style={{ background: deal.assignee_color }}>{deal.assignee}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}

            {view === 'contatos' && (
                <div className="contact-list">
                    {filteredContacts.map(contact => (
                        <div key={contact.id} className="contact-item">
                            <div className="contact-avatar" style={{ background: contact.avatar_color }}>
                                {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="contact-info">
                                <div className="contact-name">{contact.name}</div>
                                <div className="contact-email">{contact.company}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Mail size={14} /> {contact.email}
                                </span>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Phone size={14} /> {contact.phone}
                                </span>
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-light)', minWidth: 100, textAlign: 'right' }}>{formatCurrency(contact.value)}</span>
                            <span className={`contact-status ${contact.status}`}>{contact.status === 'active' ? 'Ativo' : contact.status === 'pending' ? 'Pendente' : 'Inativo'}</span>
                            <button className="header-action-btn" style={{ flexShrink: 0 }}><ExternalLink size={14} /></button>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
