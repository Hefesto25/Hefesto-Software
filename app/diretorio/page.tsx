'use client';

import { useState, useMemo } from 'react';
import {
    Briefcase, Users, Search, Plus, Building2, UserCircle,
    MoreVertical, Eye, Edit2, CheckCircle2, AlertCircle, X,
    Phone, Mail, Globe, MapPin, FileText, Lock, DollarSign, Calendar, Activity
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
    useDiretorioClientes, useDiretorioColaboradores, useAllDiretorioAssinaturas
} from '@/lib/hooks';
import type { DiretorioCliente, DiretorioColaborador } from '@/lib/types';
import ClienteModal from './ClienteModal';
import ColaboradorModal from './ColaboradorModal';
import CustosPanel from './CustosPanel';

const TABS = [
    { id: 'clientes', label: 'Clientes', icon: Briefcase },
    { id: 'colaboradores', label: 'Colaboradores', icon: Users },
    { id: 'custos', label: 'Custos e Assinaturas', icon: DollarSign },
];

const STATUS_CLIENTE = {
    'ativo': { label: 'Ativo', color: '#10B981', icon: CheckCircle2 },
    'inativo': { label: 'Inativo', color: '#6B7280', icon: AlertCircle },
};

const STATUS_COLABORADOR = {
    'ativo': { label: 'Ativo', color: '#10B981', icon: CheckCircle2 },
    'inativo': { label: 'Inativo', color: '#6B7280', icon: AlertCircle },
};

export default function DiretorioPage() {
    const { user, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState('clientes');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCliente, setSelectedCliente] = useState<DiretorioCliente | null | 'new'>(null);
    const [selectedColab, setSelectedColab] = useState<DiretorioColaborador | null | 'new'>(null);

    // Permissões
    const canAccessClientes = user?.categoria === 'Admin Geral' || user?.permissao_diretorio_clientes === true;
    const colabAcesso = user?.categoria === 'Admin Geral' ? 'sensivel' : (user?.permissao_diretorio_colaboradores || 'nenhuma');
    const canAccessColab = colabAcesso === 'basico' || colabAcesso === 'sensivel';
    const canEdit = user?.categoria === 'Admin Geral' || user?.categoria === 'Administrativa';

    // Data Hooks
    const { data: clientes, loading: loadingClientes, refetch: refetchClientes } = useDiretorioClientes();
    const { data: colaboradores, loading: loadingColaboradores, refetch: refetchColaboradores } = useDiretorioColaboradores();
    const { data: assinaturas, loading: loadingAssinaturas } = useAllDiretorioAssinaturas();

    // Filtered
    const filteredClientes = useMemo(() => {
        if (!searchQuery) return clientes;
        const q = searchQuery.toLowerCase();
        return clientes.filter(c => c.nome.toLowerCase().includes(q) || c.segmento?.toLowerCase().includes(q));
    }, [clientes, searchQuery]);

    const filteredColaboradores = useMemo(() => {
        if (!searchQuery) return colaboradores;
        const q = searchQuery.toLowerCase();
        return colaboradores.filter(c => c.nome.toLowerCase().includes(q) || c.cargo?.toLowerCase().includes(q));
    }, [colaboradores, searchQuery]);

    // Render logic
    if (authLoading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Carregando...</div>;

    // Check module level access - Se não tiver permissão de nada
    if (!canAccessClientes && !canAccessColab) {
        return (
            <div style={{ textAlign: 'center', paddingTop: 100 }}>
                <AlertCircle size={48} style={{ color: 'var(--danger)', margin: '0 auto 16px' }} />
                <h2 style={{ marginBottom: 12 }}>Acesso Negado</h2>
                <p style={{ color: 'var(--text-muted)' }}>Você não possui permissão para acessar o Diretório.</p>
            </div>
        );
    }

    return (
        <div className="templates-page">
            {/* Tab bar */}
            <div className="tab-bar">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    // Esconder aba se não tiver permissão
                    if (tab.id === 'clientes' && !canAccessClientes) return null;
                    if (tab.id === 'colaboradores' && !canAccessColab) return null;

                    return (
                        <button
                            key={tab.id}
                            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Toolbar */}
            <div className="templates-toolbar">
                <div className="templates-search">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder={`Buscar ${activeTab}...`}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                {canEdit && (
                    <div className="templates-actions">
                        {activeTab === 'clientes' && (
                            <button className="btn-primary" onClick={() => setSelectedCliente('new')}>
                                <Plus size={16} /> Novo Cliente
                            </button>
                        )}
                        {activeTab === 'colaboradores' && (
                            <button className="btn-primary" onClick={() => setSelectedColab('new')}>
                                <Plus size={16} /> Novo Colaborador
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Content Lists */}
            {activeTab === 'clientes' && canAccessClientes && (
                <div className="template-grid">
                    {loadingClientes ? (
                        <div className="template-empty"><p>Carregando clientes...</p></div>
                    ) : filteredClientes.length === 0 ? (
                        <div className="template-empty">
                            <Building2 size={48} />
                            <p>Nenhum cliente cadastrado</p>
                        </div>
                    ) : (
                        filteredClientes.map(cliente => {
                            const statusInfo = STATUS_CLIENTE[cliente.status as keyof typeof STATUS_CLIENTE] || STATUS_CLIENTE['ativo'];
                            return (
                                <div key={cliente.id} className="template-card" onClick={() => setSelectedCliente(cliente)}>
                                    <div className="template-card-body">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <h3 title={cliente.nome}>{cliente.nome}</h3>
                                            <span className="template-status-badge" style={{ background: statusInfo.color }}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                        <div className="template-card-desc" style={{ marginBottom: 12 }}>
                                            {cliente.segmento || 'Sem segmento definido'}
                                        </div>
                                        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border-default)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Calendar size={12} />
                                            <span>Adicionado em {cliente.created_at ? new Date(cliente.created_at).toLocaleDateString('pt-BR') : '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {activeTab === 'colaboradores' && canAccessColab && (
                <div className="template-grid">
                    {loadingColaboradores ? (
                        <div className="template-empty"><p>Carregando colaboradores...</p></div>
                    ) : filteredColaboradores.length === 0 ? (
                        <div className="template-empty">
                            <UserCircle size={48} />
                            <p>Nenhum colaborador cadastrado</p>
                        </div>
                    ) : (
                        filteredColaboradores.map(colab => {
                            const statusInfo = STATUS_COLABORADOR[colab.status as keyof typeof STATUS_COLABORADOR] || STATUS_COLABORADOR['ativo'];
                            return (
                                <div key={colab.id} className="template-card" onClick={() => setSelectedColab(colab)}>
                                    <div className="template-card-body">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <h3 title={colab.nome}>{colab.nome}</h3>
                                            <span className="template-status-badge" style={{ background: statusInfo.color }}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                        <div className="template-card-desc" style={{ marginBottom: 16 }}>
                                            {colab.cargo || 'Sem cargo definido'}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Mail size={12} style={{ opacity: 0.7 }} />
                                                </div>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{colab.email || '—'}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
                                                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Phone size={12} style={{ opacity: 0.7 }} />
                                                </div>
                                                <span>{colab.whatsapp || colab.telefone || '—'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* TAB: CUSTOS */}
            {activeTab === 'custos' && canAccessClientes && (
                <CustosPanel searchQuery={searchQuery} />
            )}

            {/* Modals */}
            {selectedCliente && (
                <ClienteModal
                    cliente={selectedCliente === 'new' ? null : selectedCliente}
                    onClose={() => setSelectedCliente(null)}
                    onSave={() => refetchClientes()}
                />
            )}

            {selectedColab && (
                <ColaboradorModal
                    colaborador={selectedColab === 'new' ? null : selectedColab}
                    onClose={() => setSelectedColab(null)}
                    onSave={() => refetchColaboradores()}
                />
            )}
        </div>
    );
}
