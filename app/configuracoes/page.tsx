'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Shield, User, Users, Percent, Target, Eye, X, Check, Briefcase, Bell, Mail, Calendar, ChevronDown, Sparkles, AlertTriangle } from 'lucide-react';
import {
    useUsuarios, createUsuarioViaSignUp, updateUsuario, deleteUsuarioViaEdge,
    useFinancialTypes, useFinancialCategories,
    addFinancialType, removeFinancialType,
    addFinancialCategory, removeFinancialCategory,
    useNotificationSettings, upsertNotificationSettings,
    useComercialCommissionTiers, addComercialCommissionTier, removeComercialCommissionTier,
    useSellerGoals, addSellerGoal, removeSellerGoal
} from '@/lib/hooks';
import type { UsuarioDB } from '@/lib/hooks';
import { formatCurrencyInput, parseCurrencyInput, AVATAR_COLORS } from '@/lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationContext } from '../contexts/NotificationContext';



const PERMISSION_LABELS: Record<string, { label: string; icon: typeof Shield; color: string }> = {
    admin: { label: 'Administrador', icon: Shield, color: '#F59E0B' },
    member: { label: 'Membro', icon: User, color: '#3B82F6' },
    viewer: { label: 'Visualizador', icon: Eye, color: '#6B7280' },
};

function getInitials(name: string) {
    if (!name) return '??';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const CATEGORIA_LABELS: Record<string, string> = {
    'Admin Geral': 'Administrador',
    'Administrativa': 'Administrativo',
    'Financeira': 'Financeiro',
    'Operacional': 'Operacional',
    'Comercial': 'Comercial',
};

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

type ModalState = { type: 'add' } | { type: 'edit'; usuario: UsuarioDB } | { type: 'delete'; usuario: UsuarioDB } | { type: 'add_comercial_member' } | { type: 'ajustar_meta', usuario: UsuarioDB } | null;

const ALL_MODULES = [
    { path: '/comercial', label: 'Comercial' },
    { path: '/financeiro', label: 'Financeiro' },
    { path: '/operacional', label: 'Operacional' },
    { path: '/administrativo', label: 'Administrativo' },
    { path: '/calendario', label: 'Calendário' },
    { path: '/chat', label: 'Chat' },
    { path: '/templates', label: 'Templates' },
    { path: '/diretorio', label: 'Diretório' },
    { path: '/configuracoes', label: 'Configurações' },
];

export default function ConfiguracoesPage() {
    const { data: usuarios, loading, setData: setUsuarios, refetch: refetchUsuarios } = useUsuarios();
    const { data: types, loading: loadingTypes, setData: setTypes } = useFinancialTypes();
    const { data: categories, loading: loadingCategories, setData: setCategories } = useFinancialCategories();
    const { user } = useAuth();
    const { pushPermission, requestPushPermission } = useNotificationContext();
    const { data: notifSettings, loading: loadingNotifSettings, refetch: refetchNotifSettings } = useNotificationSettings(user?.id ?? '');
    const { data: comissoes, loading: loadingComissoes, setData: setComissoes } = useComercialCommissionTiers();
    const { data: goals, setData: setGoals, refetch: refetchGoals } = useSellerGoals();

    const [modal, setModal] = useState<ModalState>(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const userId = user?.id ?? '';
    const isAdminGeral = user?.categoria === 'Admin Geral';

    // Tab State
    const [activeTab, setActiveTab] = useState<'equipe' | 'time_comercial' | 'financas' | 'notificacoes'>('equipe');

    // Finanças State
    const [newType, setNewType] = useState('');
    const [newCategory, setNewCategory] = useState('');

    // Form state — creation (simplified)
    const [formName, setFormName] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formPassword, setFormPassword] = useState('');

    // Form state — editing
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('');
    const [editCategory, setEditCategory] = useState('Operacional');
    const [editModules, setEditModules] = useState<string[]>([]);
    const [editPermDiretorioClientes, setEditPermDiretorioClientes] = useState(false);
    const [editPermDiretorioColab, setEditPermDiretorioColab] = useState<'nenhuma' | 'basico' | 'sensivel'>('nenhuma');

    // Comercial Team details
    const [selectedComercialUser, setSelectedComercialUser] = useState('');
    const [isComercialDropdownOpen, setIsComercialDropdownOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<{ id: string, name: string } | null>(null);
    const [faixaToRemove, setFaixaToRemove] = useState<{ id: string, nome: string } | null>(null);
    const [newFaixaNome, setNewFaixaNome] = useState('');
    const [newFaixaMin, setNewFaixaMin] = useState('');
    const [newFaixaMax, setNewFaixaMax] = useState('');
    const [newFaixaPerc, setNewFaixaPerc] = useState('');

    const [goalModalTab, setGoalModalTab] = useState<'mensal' | 'trimestral' | 'anual'>('mensal');
    const [goalYear, setGoalYear] = useState(new Date().getFullYear().toString());
    const [goalSellerName, setGoalSellerName] = useState('');
    const [mensalValues, setMensalValues] = useState<Record<string, string>>({});
    const [trimestralValues, setTrimestralValues] = useState<Record<string, string>>({});
    const [anualValue, setAnualValue] = useState<string>('');

    const comercialTeam = usuarios.filter(u => u.in_comercial_team);

    // Populate goal state
    useEffect(() => {
        if (modal?.type === 'ajustar_meta' && goalSellerName && goalYear) {
            const sellerGoals = goals.filter(g => g.seller_name === goalSellerName && g.year === goalYear);
            const mVals: Record<string, string> = {};
            const tVals: Record<string, string> = {};
            let aVal = '';
            sellerGoals.forEach(g => {
                const valStr = formatCurrencyInput(String(Math.round(g.goal_value * 100)));
                if (g.month.startsWith('T')) tVals[g.month] = valStr;
                else if (g.month === 'Anual') aVal = valStr;
                else mVals[g.month] = valStr;
            });
            setMensalValues(mVals);
            setTrimestralValues(tVals);
            setAnualValue(aVal);
        } else if (modal?.type !== 'ajustar_meta') {
            setGoalSellerName('');
            setMensalValues({});
            setTrimestralValues({});
            setAnualValue('');
        }
    }, [modal, goalSellerName, goalYear, goals]);

    function openAjustarMeta(usuario: UsuarioDB) {
        setGoalSellerName(usuario.nome);
        setGoalYear(new Date().getFullYear().toString());
        setGoalModalTab('mensal');
        setModal({ type: 'ajustar_meta', usuario });
    }

    function showToast(msg: string) {
        setToast(msg);
        setTimeout(() => setToast(null), 4000);
    }

    function openAddModal() {
        setFormName('');
        setFormEmail('');
        setFormPassword('');
        setFormError(null);
        setModal({ type: 'add' });
    }

    function openEditModal(usuario: UsuarioDB) {
        setEditName(usuario.nome);
        setEditRole(usuario.cargo || '');
        setEditCategory(usuario.categoria || 'Operacional');
        setEditModules(usuario.modulos_acesso || []);
        setEditPermDiretorioClientes(usuario.permissao_diretorio_clientes || false);
        setEditPermDiretorioColab(usuario.permissao_diretorio_colaboradores || 'nenhuma');
        setFormError(null);
        setModal({ type: 'edit', usuario });
    }

    async function handleAdd() {
        if (!isAdminGeral) {
            setFormError('Apenas Admins Gerais podem criar usuários.');
            return;
        }
        if (!formName || !formEmail) {
            setFormError('Preencha nome e e-mail.');
            return;
        }
        if (!formPassword || formPassword.length < 6) {
            setFormError('A senha deve ter no mínimo 6 caracteres.');
            return;
        }
        setSaving(true);
        setFormError(null);
        try {
            const result = await createUsuarioViaSignUp({
                email: formEmail.trim(),
                password: formPassword,
                nome: formName.trim(),
            });

            if (!result.success) {
                setFormError(result.error || 'Erro ao criar usuário.');
                setSaving(false);
                return;
            }

            // Small delay to let the trigger create the profile
            await new Promise(r => setTimeout(r, 1500));
            await refetchUsuarios();
            setModal(null);
            showToast(`Usuário ${formName} criado com sucesso.`);
        } catch (e) {
            console.error(e);
            setFormError('Erro inesperado ao criar usuário.');
        }
        setSaving(false);
    }

    async function handleEdit() {
        if (modal?.type !== 'edit') return;
        setSaving(true);
        setFormError(null);
        try {
            const isAdmin = user?.modulos_acesso?.includes('/configuracoes');
            const isSelf = modal.usuario.id === user?.id;

            // Build update payload based on permissions
            const updates: Record<string, unknown> = { nome: editName.trim() };

            if (isAdmin && !isSelf) {
                // Admin editing another user: can change everything
                updates.cargo = editRole.trim();
                updates.categoria = editCategory;
                // Always include base modules
                const baseModules = ['/', '/chat', '/notificacoes'];
                updates.modulos_acesso = [...new Set([...baseModules, ...editModules])];
                updates.permissao_diretorio_clientes = editPermDiretorioClientes;
                updates.permissao_diretorio_colaboradores = editPermDiretorioColab;
            } else if (isAdmin && isSelf) {
                // Admin editing themselves
                updates.cargo = editRole.trim();
                updates.categoria = editCategory;
                const baseModules = ['/', '/chat', '/notificacoes'];
                updates.modulos_acesso = [...new Set([...baseModules, ...editModules])];
                updates.permissao_diretorio_clientes = editPermDiretorioClientes;
                updates.permissao_diretorio_colaboradores = editPermDiretorioColab;
            }
            // Non-admin self-edit: only nome is sent (RLS protects the rest)

            const result = await updateUsuario(modal.usuario.id, updates as Partial<UsuarioDB>);

            if (!result.success) {
                setFormError(result.error || 'Erro ao atualizar perfil.');
                setSaving(false);
                return;
            }

            await refetchUsuarios();
            setModal(null);
            showToast(`Perfil de ${editName} atualizado com sucesso.`);
        } catch (e) {
            console.error(e);
            setFormError('Erro inesperado ao atualizar perfil.');
        }
        setSaving(false);
    }

    async function handleDelete() {
        if (modal?.type !== 'delete') return;
        setSaving(true);
        try {
            const result = await deleteUsuarioViaEdge(modal.usuario.id);
            if (!result.success) {
                alert(result.error || 'Erro ao remover usuário.');
                setSaving(false);
                return;
            }
            setUsuarios(usuarios.filter(u => u.id !== modal.usuario.id));
            setModal(null);
            showToast(`Usuário ${modal.usuario.nome} removido.`);
        } catch (e) {
            console.error(e);
        }
        setSaving(false);
    }

    async function handleAddType() {
        if (!newType.trim() || saving) return;
        setSaving(true);
        try {
            const added = await addFinancialType({ name: newType.trim() });
            setTypes([...types, added]);
            setNewType('');
        } catch (e) {
            console.error(e);
        }
        setSaving(false);
    }

    async function handleDeleteType(id: string) {
        setSaving(true);
        try {
            await removeFinancialType(id);
            setTypes(types.filter(t => t.id !== id));
        } catch (e) {
            console.error(e);
        }
        setSaving(false);
    }

    async function handleAddCategory() {
        if (!newCategory.trim() || saving) return;
        setSaving(true);
        try {
            const added = await addFinancialCategory({ name: newCategory.trim() });
            setCategories([...categories, added]);
            setNewCategory('');
        } catch (e) {
            console.error(e);
        }
        setSaving(false);
    }

    async function handleDeleteCategory(id: string) {
        setSaving(true);
        try {
            await removeFinancialCategory(id);
            setCategories(categories.filter(c => c.id !== id));
        } catch (e) {
            console.error(e);
        }
        setSaving(false);
    }

    async function handleAddComercialMember() {
        if (!selectedComercialUser) return;
        setSaving(true);
        try {
            const result = await updateUsuario(selectedComercialUser, { in_comercial_team: true, categoria: 'Comercial' });
            if (result.success) {
                if (refetchUsuarios) await refetchUsuarios();
                setModal(null);
                setSelectedComercialUser('');
                showToast('Membro adicionado ao time comercial.');
            } else {
                showToast(`Erro: ${result.error || 'Falha ao atualizar usuário'}`);
            }
        } catch (e) {
            console.error(e);
            showToast('Erro ao processar solicitação.');
        }
        setSaving(false);
    }

    function handleRemoveComercialMember(id: string, name: string) {
        setMemberToRemove({ id, name });
    }

    async function handleConfirmRemoveMember() {
        if (!memberToRemove) return;
        setSaving(true);
        try {
            const result = await updateUsuario(memberToRemove.id, { in_comercial_team: false });
            if (result.success) {
                if (refetchUsuarios) await refetchUsuarios();
                showToast('Membro removido do time comercial.');
                setMemberToRemove(null);
            } else {
                showToast(`Erro: ${result.error || 'Falha ao remover membro'}`);
            }
        } catch (e) {
            console.error(e);
            showToast('Erro ao remover membro.');
        }
        setSaving(false);
    }

    async function handleAddFaixa() {
        if (!newFaixaNome || !newFaixaMin || !newFaixaPerc) return;
        setSaving(true);
        try {
            const added = await addComercialCommissionTier({
                name: newFaixaNome,
                min_value: parseCurrencyInput(newFaixaMin),
                max_value: newFaixaMax ? parseCurrencyInput(newFaixaMax) : null,
                percentage: parseFloat(newFaixaPerc)
            });
            setComissoes([...comissoes, added]);
            setNewFaixaNome('');
            setNewFaixaMin('');
            setNewFaixaMax('');
            setNewFaixaPerc('');
        } catch (e) {
            console.error(e);
        }
        setSaving(false);
    }

    function handleRemoveFaixa(id: string, nome: string) {
        setFaixaToRemove({ id, nome });
    }

    async function handleConfirmRemoveFaixa() {
        if (!faixaToRemove) return;
        setSaving(true);
        try {
            await removeComercialCommissionTier(faixaToRemove.id);
            setComissoes(comissoes.filter(c => c.id !== faixaToRemove.id));
            setFaixaToRemove(null);
            showToast('Faixa de comissão removida.');
        } catch (e) {
            console.error(e);
            showToast('Erro ao remover faixa.');
        }
        setSaving(false);
    }

    if (loading) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)' }}>Carregando...</div>;
    }

    return (
        <>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
                    background: 'var(--success)', color: 'white', padding: '12px 20px',
                    borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    animation: 'fadeIn 300ms ease'
                }}>
                    {toast}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>Configurações do Sistema</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Gerencie o ambiente corporativo e parâmetros</div>
                </div>
            </div>

            <div className="finance-tabs">
                <button className={`finance-tab ${activeTab === 'equipe' ? 'active' : ''}`} onClick={() => setActiveTab('equipe')}>
                    <User size={14} /> Gestão da Equipe
                </button>
                <button className={`finance-tab ${activeTab === 'time_comercial' ? 'active' : ''}`} onClick={() => setActiveTab('time_comercial')}>
                    <Users size={14} /> Time Comercial
                </button>
                <button className={`finance-tab ${activeTab === 'financas' ? 'active' : ''}`} onClick={() => setActiveTab('financas')}>
                    <Briefcase size={14} /> Preferências Financeiras
                </button>
                <button className={`finance-tab ${activeTab === 'notificacoes' ? 'active' : ''}`} onClick={() => setActiveTab('notificacoes')}>
                    <Bell size={14} /> Notificações
                </button>
            </div>

            {/* TAB: EQUIPE */}
            {activeTab === 'equipe' && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}</div>
                        {isAdminGeral && (
                            <button className="btn btn-primary" onClick={openAddModal}>
                                <Plus size={14} /> Criar Usuário
                            </button>
                        )}
                    </div>

                    {/* User list */}
                    <div className="settings-member-list">
                        {usuarios.map(u => (
                            <div key={u.id} className="settings-member-card">
                                <div className="settings-member-avatar" style={{ background: AVATAR_COLORS[u.nome.charCodeAt(0) % AVATAR_COLORS.length] }}>
                                    {getInitials(u.nome)}
                                </div>
                                <div className="settings-member-info">
                                    <div className="settings-member-name">{u.nome}</div>
                                    <div className="settings-member-role">{u.cargo || 'Sem cargo'}</div>
                                </div>
                                <div className="settings-member-email">
                                    <Mail size={12} style={{ opacity: 0.5 }} /> {u.email}
                                </div>
                                <div className={`settings-permission-badge ${u.categoria === 'Admin Geral' ? 'admin' : 'member'}`}>
                                    {CATEGORIA_LABELS[u.categoria] || u.categoria}
                                </div>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 160 }}>
                                    {u.modulos_acesso?.filter(m => m !== '/' && m !== '/chat' && m !== '/notificacoes' && m !== '/configuracoes').map(m => (
                                        <span key={m} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                                            {m.replace('/', '')}
                                        </span>
                                    ))}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Calendar size={11} />
                                    {u.created_at ? new Date(u.created_at).toLocaleDateString('pt-BR') : '-'}
                                </div>
                                <div className="settings-member-actions">
                                    <button
                                        className="settings-action-btn"
                                        onClick={() => openEditModal(u)}
                                        title="Editar"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                    <button
                                        className="settings-action-btn danger"
                                        onClick={() => setModal({ type: 'delete', usuario: u })}
                                        title="Remover"
                                        disabled={u.id === user?.id}
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {usuarios.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                                Nenhum usuário cadastrado ainda.
                            </div>
                        )}
                    </div>

                    {/* Add Modal — simplified: only nome, email, senha */}
                    {modal?.type === 'add' && (
                        <div className="settings-modal-overlay" onClick={() => setModal(null)}>
                            <div className="settings-modal" onClick={e => e.stopPropagation()}>
                                <div className="settings-modal-header">
                                    <h3>Criar Usuário</h3>
                                    <button className="settings-action-btn" onClick={() => setModal(null)}>
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className="settings-modal-body">
                                    <div className="form-group" style={{ marginBottom: 14 }}>
                                        <label className="form-label">Nome Completo *</label>
                                        <input className="form-input" type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="ex: João da Silva" />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 14 }}>
                                        <label className="form-label">E-mail *</label>
                                        <input className="form-input" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="ex: joao@hefestoia.com" />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 14 }}>
                                        <label className="form-label">Senha Inicial * <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(mín. 6 caracteres)</span></label>
                                        <input className="form-input" type="text" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="ex: Mudar@123" />
                                    </div>

                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8, marginBottom: 14, lineHeight: 1.5 }}>
                                        💡 Cargo, categoria e módulos de acesso podem ser configurados depois clicando em <strong>Editar</strong> no perfil do usuário.
                                    </div>

                                    {formError && (
                                        <div className="login-error" style={{ marginBottom: 12 }}>
                                            {formError}
                                        </div>
                                    )}
                                </div>
                                <div className="settings-modal-footer">
                                    <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                                    <button className="btn btn-primary" onClick={handleAdd} disabled={saving || !formName || !formEmail || !formPassword}>
                                        {saving ? 'Criando...' : 'Criar Usuário'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit Modal — admin sees all fields, self only sees nome */}
                    {modal?.type === 'edit' && (() => {
                        const isAdmin = user?.modulos_acesso?.includes('/configuracoes');
                        const isSelf = modal.usuario.id === user?.id;
                        const canEditFull = isAdmin; // Admin can edit all fields for everyone
                        const canEditRestricted = !isAdmin && isSelf; // Non-admin self: only nome
                        return (
                            <div className="settings-modal-overlay" onClick={() => setModal(null)}>
                                <div className="settings-modal" onClick={e => e.stopPropagation()}>
                                    <div className="settings-modal-header">
                                        <h3>Editar Perfil — {modal.usuario.nome}</h3>
                                        <button className="settings-action-btn" onClick={() => setModal(null)}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="settings-modal-body">
                                        <div className="form-group" style={{ marginBottom: 14 }}>
                                            <label className="form-label">Nome Completo</label>
                                            <input className="form-input" type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Nome completo" />
                                        </div>

                                        {canEditFull && (
                                            <>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
                                                    <div className="form-group">
                                                        <label className="form-label">Cargo</label>
                                                        <input className="form-input" type="text" value={editRole} onChange={e => setEditRole(e.target.value)} placeholder="ex: Desenvolvedor" />
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label">Categoria</label>
                                                        <select className="form-select" value={editCategory} onChange={e => setEditCategory(e.target.value)}>
                                                            <option value="Admin Geral">Admin Geral</option>
                                                            <option value="Administrativa">Administrativa</option>
                                                            <option value="Comercial">Comercial</option>
                                                            <option value="Financeira">Financeira</option>
                                                            <option value="Operacional">Operacional</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="form-group" style={{ marginBottom: 20 }}>
                                                    <label className="form-label">Acesso aos Módulos</label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
                                                        {ALL_MODULES.map(mod => (
                                                            <label key={mod.path} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', opacity: editCategory === 'Admin Geral' ? 0.5 : 1 }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={editCategory === 'Admin Geral' || editModules.includes(mod.path)}
                                                                    disabled={editCategory === 'Admin Geral'}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) setEditModules(prev => [...prev, mod.path]);
                                                                        else setEditModules(prev => prev.filter(p => p !== mod.path));
                                                                    }}
                                                                    style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
                                                                />
                                                                {mod.label}
                                                            </label>
                                                        ))}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Dashboard, Chat e Notificações estão sempre acessíveis.{editCategory === 'Admin Geral' && ' Admin Geral tem acesso a tudo.'}</div>
                                                </div>

                                                <div className="form-group" style={{ marginBottom: 20 }}>
                                                    <label className="form-label">Permissões do Diretório</label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
                                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={editPermDiretorioClientes}
                                                                onChange={(e) => setEditPermDiretorioClientes(e.target.checked)}
                                                                style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
                                                            />
                                                            Acesso a Clientes
                                                        </label>
                                                        <div>
                                                            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Acesso a Colaboradores:</label>
                                                            <select
                                                                className="form-select"
                                                                style={{ padding: '4px 8px', fontSize: 13 }}
                                                                value={editPermDiretorioColab}
                                                                onChange={(e) => setEditPermDiretorioColab(e.target.value as any)}
                                                            >
                                                                <option value="nenhuma">Nenhuma</option>
                                                                <option value="basico">Básico</option>
                                                                <option value="sensivel">Sensível</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {canEditRestricted && (
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: 8, marginBottom: 14, lineHeight: 1.5 }}>
                                                🔒 Cargo, categoria e módulos de acesso só podem ser alterados por um administrador.
                                            </div>
                                        )}

                                        {formError && (
                                            <div className="login-error" style={{ marginBottom: 12 }}>
                                                {formError}
                                            </div>
                                        )}
                                    </div>
                                    <div className="settings-modal-footer">
                                        <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                                        <button className="btn btn-primary" onClick={handleEdit} disabled={saving || !editName}>
                                            {saving ? 'Salvando...' : 'Salvar Alterações'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Delete confirmation modal */}
                    {modal?.type === 'delete' && (
                        <div className="settings-modal-overlay" onClick={() => setModal(null)}>
                            <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                                <div className="settings-modal-header">
                                    <h3>Remover Usuário</h3>
                                    <button className="settings-action-btn" onClick={() => setModal(null)}>
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className="settings-modal-body" style={{ textAlign: 'center', padding: '20px 24px' }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: '50%',
                                        background: AVATAR_COLORS[modal.usuario.nome.charCodeAt(0) % AVATAR_COLORS.length],
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 20, fontWeight: 700, color: 'white', margin: '0 auto 16px'
                                    }}>
                                        {getInitials(modal.usuario.nome)}
                                    </div>
                                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                                        Remover {modal.usuario.nome}?
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                        Esta ação é permanente. O usuário perderá acesso completo ao sistema e sua conta de login será removida.
                                    </div>
                                </div>
                                <div className="settings-modal-footer">
                                    <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                                    <button className="btn" onClick={handleDelete} disabled={saving}
                                        style={{ background: 'var(--danger)', color: 'white' }}>
                                        {saving ? 'Removendo...' : 'Sim, Remover'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Modal Add Member to Comercial */}
                    {modal?.type === 'add_comercial_member' && (() => {
                        // All users who are NOT in the team
                        const candidates = usuarios.filter(u => !u.in_comercial_team);

                        return (
                            <div className="settings-modal-overlay" onClick={() => setModal(null)}>
                                <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                                    <div className="settings-modal-header">
                                        <h3>Adicionar Membro ao Time</h3>
                                        <button className="settings-action-btn" onClick={() => setModal(null)}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="settings-modal-body">
                                        {candidates.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: 24, fontSize: 14, color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                                                Nenhum usuário disponível. <br /><br /><i>Nota: Apenas usuários que ainda não estão no time aparecerão aqui.</i>
                                            </div>
                                        ) : (() => {
                                            const selectedUser = candidates.find(c => c.id === selectedComercialUser);
                                            return (
                                                <div className="form-group" style={{ position: 'relative' }}>
                                                    <label className="form-label" style={{ marginBottom: 12 }}>Selecione o membro</label>

                                                    {/* Custom Dropdown Trigger */}
                                                    <div
                                                        onClick={() => setIsComercialDropdownOpen(!isComercialDropdownOpen)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '12px 16px',
                                                            background: 'rgba(0,0,0,0.2)',
                                                            border: `1px solid ${isComercialDropdownOpen || selectedUser ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}`,
                                                            borderRadius: 8,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s',
                                                            boxShadow: isComercialDropdownOpen ? '0 0 0 1px var(--primary)' : 'none'
                                                        }}
                                                    >
                                                        <div style={{ fontSize: 14, color: selectedUser ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                            {selectedUser ? (
                                                                <>
                                                                    <span style={{ fontWeight: 500 }}>{selectedUser.nome}</span>
                                                                    {selectedUser.cargo && <span style={{ opacity: 0.6, fontSize: 12, marginLeft: 8 }}>— {selectedUser.cargo}</span>}
                                                                </>
                                                            ) : "Selecione um membro..."}
                                                        </div>
                                                        <ChevronDown size={16} style={{
                                                            color: 'var(--text-muted)',
                                                            transform: isComercialDropdownOpen ? 'rotate(180deg)' : 'none',
                                                            transition: 'transform 0.2s'
                                                        }} />
                                                    </div>

                                                    {/* Dropdown Menu */}
                                                    {isComercialDropdownOpen && (
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: 'calc(100% + 4px)',
                                                            left: 0,
                                                            right: 0,
                                                            background: 'var(--bg-secondary)',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            borderRadius: 8,
                                                            zIndex: 100,
                                                            maxHeight: 220,
                                                            overflowY: 'auto',
                                                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                                                            padding: 4
                                                        }}>
                                                            {candidates.map(c => (
                                                                <div
                                                                    key={c.id}
                                                                    onClick={() => {
                                                                        setSelectedComercialUser(c.id);
                                                                        setIsComercialDropdownOpen(false);
                                                                    }}
                                                                    style={{
                                                                        padding: '10px 12px',
                                                                        borderRadius: 6,
                                                                        cursor: 'pointer',
                                                                        background: selectedComercialUser === c.id ? 'rgba(249, 115, 22, 0.1)' : 'transparent',
                                                                        color: selectedComercialUser === c.id ? 'var(--primary)' : 'var(--text-primary)',
                                                                        fontSize: 14,
                                                                        transition: 'all 0.2s',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'space-between',
                                                                        borderLeft: selectedComercialUser === c.id ? '3px solid var(--primary)' : '3px solid transparent'
                                                                    }}
                                                                    onMouseEnter={e => { if (selectedComercialUser !== c.id) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                                                                    onMouseLeave={e => { if (selectedComercialUser !== c.id) e.currentTarget.style.background = 'transparent' }}
                                                                >
                                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                        <div style={{ fontWeight: selectedComercialUser === c.id ? 600 : 400 }}>{c.nome}</div>
                                                                        <div style={{ fontSize: 11, opacity: 0.6 }}>{c.cargo || 'Membro'} {c.categoria ? `(${c.categoria})` : ''}</div>
                                                                    </div>
                                                                    {selectedComercialUser === c.id && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)' }} />}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12, background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 8, borderLeft: '3px solid var(--primary)' }}>
                                                        <Sparkles size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                                                        Qualquer usuário selecionado receberá automaticamente permissões da categoria Comercial.
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="settings-modal-footer">
                                        <button className="btn btn-secondary" onClick={() => { setModal(null); setIsComercialDropdownOpen(false); }}>Cancelar</button>
                                        <button className="btn btn-primary" onClick={handleAddComercialMember} disabled={saving || !selectedComercialUser}>
                                            {saving ? 'Adicionando...' : 'Confirmar Adição'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </>)}

            {/* TAB: FINANÇAS */}
            {activeTab === 'financas' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                    {/* TIPOS DE TRANSAÇÃO */}
                    <div className="table-card">
                        <div className="table-card-title">Tipos de Lançamento</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                            Classes que definem se o dinheiro entrou, saiu, ou se é fixo/variável.
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Novo tipo..."
                                value={newType}
                                onChange={e => setNewType(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddType()}
                            />
                            <button className="btn btn-secondary" onClick={handleAddType} disabled={saving || !newType.trim()}>Adicionar</button>
                        </div>

                        {loadingTypes ? <div style={{ color: 'var(--text-muted)' }}>Carregando tipos...</div> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {types.map(t => (
                                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'var(--card-hover)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 500 }}>{t.name}</span>
                                        <button className="settings-action-btn danger" onClick={() => handleDeleteType(t.id)} disabled={saving} title="Remover Tipo">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {types.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum tipo cadastrado.</div>}
                            </div>
                        )}
                    </div>

                    {/* CATEGORIAS */}
                    <div className="table-card">
                        <div className="table-card-title">Categorias Financeiras</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                            Classificadores como Marketing, Ferramentas, Salários.
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Nova categoria..."
                                value={newCategory}
                                onChange={e => setNewCategory(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                            />
                            <button className="btn btn-secondary" onClick={handleAddCategory} disabled={saving || !newCategory.trim()}>Adicionar</button>
                        </div>

                        {loadingCategories ? <div style={{ color: 'var(--text-muted)' }}>Carregando categorias...</div> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {categories.map(c => (
                                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'var(--card-hover)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 500 }}>{c.name}</span>
                                        <button className="settings-action-btn danger" onClick={() => handleDeleteCategory(c.id)} disabled={saving} title="Remover Categoria">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {categories.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma categoria cadastrada.</div>}
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* TAB: TIME COMERCIAL */}
            {activeTab === 'time_comercial' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                    {/* Time Comercial Members Section */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Time Comercial</h3>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Gerencie os membros do time de vendas</div>
                            </div>
                            {isAdminGeral && (
                                <button className="btn btn-primary" onClick={() => setModal({ type: 'add_comercial_member' })}>
                                    <Plus size={14} /> Adicionar Membro
                                </button>
                            )}
                        </div>

                        <div className="settings-member-list">
                            {comercialTeam.map(u => (
                                <div key={u.id} className="settings-member-card">
                                    <div className="settings-member-avatar" style={{ background: AVATAR_COLORS[u.nome.charCodeAt(0) % AVATAR_COLORS.length] }}>
                                        {getInitials(u.nome)}
                                    </div>
                                    <div className="settings-member-info">
                                        <div className="settings-member-name">{u.nome}</div>
                                        <div className="settings-member-role">{u.cargo || 'Sem cargo'}</div>
                                    </div>
                                    <div className={`settings-permission-badge`}>
                                        Comercial
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                        {(() => {
                                            const currentM = String(new Date().getMonth() + 1).padStart(2, '0');
                                            const currentY = String(new Date().getFullYear());
                                            const mGoal = goals.find(g => g.seller_name === u.nome && g.month === currentM && g.year === currentY);
                                            let metaVal = 0;
                                            if (mGoal) {
                                                metaVal = Number(mGoal.goal_value);
                                            } else {
                                                const currentQ = `T${Math.floor((Number(currentM) - 1) / 3) + 1}`;
                                                const tGoal = goals.find(g => g.seller_name === u.nome && g.month === currentQ && g.year === currentY);
                                                if (tGoal) {
                                                    metaVal = Number(tGoal.goal_value) / 3;
                                                }
                                            }
                                            return metaVal > 0 ? (
                                                <span style={{ color: 'var(--success)', fontWeight: 600 }}>Meta Mês: R$ {(metaVal).toLocaleString('pt-br', { minimumFractionDigits: 2 })}</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>Sem meta p/ o mês</span>
                                            );
                                        })()}
                                    </div>
                                    <div className="settings-member-actions">
                                        <button
                                            className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}
                                            onClick={() => openAjustarMeta(u)}
                                            disabled={saving}
                                        >
                                            <Target size={12} style={{ marginRight: 6 }} /> Editar Meta
                                        </button>
                                        <button
                                            className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--danger)' }}
                                            onClick={() => handleRemoveComercialMember(u.id, u.nome)}
                                            disabled={saving}
                                        >
                                            <Trash2 size={12} style={{ marginRight: 6 }} /> Remover
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {comercialTeam.length === 0 && (
                                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 }}>
                                    Nenhum membro no time comercial ainda.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Faixas de Comissão Section */}
                    <div className="table-card">
                        <div className="table-card-title">Faixas de Comissão (Patentes)</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                            Configure as metas para progressão de comissão da equipe comercial.
                        </div>

                        {/* add faixa form */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 1fr 1fr 1fr auto', gap: 12, alignItems: 'flex-end', marginBottom: 24, padding: 16, background: 'var(--bg-secondary)', borderRadius: 12 }}>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: 12 }}>Nome/Patente *</label>
                                <input type="text" className="form-input" placeholder="Ex: Ouro" value={newFaixaNome} onChange={e => setNewFaixaNome(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: 12 }}>De (R$) *</label>
                                <input type="text" className="form-input" placeholder="R$ 0,00" value={newFaixaMin} onChange={e => setNewFaixaMin(formatCurrencyInput(e.target.value))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: 12 }}>Até (R$)</label>
                                <input type="text" className="form-input" placeholder="R$ 0,00" value={newFaixaMax} onChange={e => setNewFaixaMax(formatCurrencyInput(e.target.value))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: 12 }}>Comissão (%) *</label>
                                <input type="number" className="form-input" placeholder="10" value={newFaixaPerc} onChange={e => setNewFaixaPerc(e.target.value)} />
                            </div>
                            <button className="btn btn-primary" style={{ padding: '10px 16px', height: 40 }} onClick={handleAddFaixa} disabled={saving || !newFaixaNome || !newFaixaMin || !newFaixaPerc}>
                                Adicionar Faixa
                            </button>
                        </div>

                        {/* faixas table */}
                        {loadingComissoes ? <div style={{ color: 'var(--text-muted)' }}>Carregando faixas...</div> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {comissoes.map(c => (
                                    <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 600 }}>{c.name}</span>
                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>De R$ {Number(c.min_value).toLocaleString('pt-BR')}</span>
                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{c.max_value ? `Até R$ ${Number(c.max_value).toLocaleString('pt-BR')}` : 'Sem limite superior'}</span>
                                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--success)' }}>{c.percentage}%</span>
                                        <button className="settings-action-btn danger" onClick={() => handleRemoveFaixa(c.id, c.name)} disabled={saving} title="Remover Faixa">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                {comissoes.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma faixa configurada.</div>}
                            </div>
                        )}
                    </div>

                </div>
            )}

            {/* Modal para Ajustar Metas (Configurações) */}
            {modal?.type === 'ajustar_meta' && (
                <div className="modal-overlay" onClick={() => setModal(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-primary)', padding: 24, borderRadius: 12, width: '100%', maxWidth: 600 }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 className="modal-title" style={{ margin: 0, fontSize: 18 }}>Gerenciar Metas</h2>
                            <button className="settings-action-btn" onClick={() => setModal(null)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Ano</label>
                                    <select className="form-select" value={goalYear} onChange={e => setGoalYear(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                                        <option value={String(new Date().getFullYear())}>{new Date().getFullYear()}</option>
                                        <option value={String(new Date().getFullYear() + 1)}>{new Date().getFullYear() + 1}</option>
                                        <option value={String(new Date().getFullYear() + 2)}>{new Date().getFullYear() + 2}</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Vendedor</label>
                                    <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6, opacity: 0.7 }}>
                                        {goalSellerName}
                                    </div>
                                </div>
                            </div>

                            <div className="finance-tabs" style={{ marginBottom: 0 }}>
                                <button className={`finance-tab ${goalModalTab === 'mensal' ? 'active' : ''}`} onClick={() => setGoalModalTab('mensal')}>
                                    Mensal
                                </button>
                                <button className={`finance-tab ${goalModalTab === 'trimestral' ? 'active' : ''}`} onClick={() => setGoalModalTab('trimestral')}>
                                    Trimestral
                                </button>
                                <button className={`finance-tab ${goalModalTab === 'anual' ? 'active' : ''}`} onClick={() => setGoalModalTab('anual')}>
                                    Anual
                                </button>
                            </div>

                            <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8 }}>
                                {goalModalTab === 'mensal' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        {MONTHS.map(m => (
                                            <div key={m.value} className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{m.label}</label>
                                                <input type="text" className="form-input" placeholder="R$ 0,00"
                                                    value={mensalValues[m.value] || ''}
                                                    onChange={e => setMensalValues(prev => ({ ...prev, [m.value]: formatCurrencyInput(e.target.value) }))}
                                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'var(--bg-primary)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {goalModalTab === 'trimestral' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                        {['T1', 'T2', 'T3', 'T4'].map(t => (
                                            <div key={t} className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>{t} ({
                                                    t === 'T1' ? 'Jan-Mar' :
                                                        t === 'T2' ? 'Abr-Jun' :
                                                            t === 'T3' ? 'Jul-Set' : 'Out-Dez'
                                                })</label>
                                                <input type="text" className="form-input" placeholder="R$ 0,00"
                                                    value={trimestralValues[t] || ''}
                                                    onChange={e => setTrimestralValues(prev => ({ ...prev, [t]: formatCurrencyInput(e.target.value) }))}
                                                    style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'var(--bg-primary)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {goalModalTab === 'anual' && (
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Meta Anual {goalYear}</label>
                                        <input type="text" className="form-input" placeholder="R$ 0,00"
                                            value={anualValue}
                                            onChange={e => setAnualValue(formatCurrencyInput(e.target.value))}
                                            style={{ width: '100%', padding: '8px 12px', borderRadius: 6, background: 'var(--bg-primary)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                        />
                                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                                            * Esta meta é o total geral para o ano de {goalYear}.
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
                                <button className="btn btn-secondary" onClick={() => setModal(null)} style={{ padding: '10px 16px', borderRadius: 6 }}>Cancelar</button>
                                <button className="btn btn-primary" style={{ padding: '10px 16px', borderRadius: 6 }} onClick={async () => {
                                    try {
                                        let updates: Array<{ month: string, value: string }> = [];
                                        if (goalModalTab === 'mensal') {
                                            updates = Object.entries(mensalValues).map(([k, v]) => ({ month: k, value: v }));
                                        } else if (goalModalTab === 'trimestral') {
                                            updates = Object.entries(trimestralValues).map(([k, v]) => ({ month: k, value: v }));
                                        } else if (goalModalTab === 'anual') {
                                            updates = [{ month: 'Anual', value: anualValue }];
                                        }

                                        for (const up of updates) {
                                            const numVal = parseCurrencyInput(up.value);
                                            const existingGoal = goals.find(g => g.seller_name === goalSellerName && g.month === up.month && g.year === goalYear);

                                            if (existingGoal) {
                                                if (numVal > 0) {
                                                    await removeSellerGoal(existingGoal.id);
                                                    await addSellerGoal({ seller_name: goalSellerName, month: up.month, year: goalYear, goal_value: numVal });
                                                } else {
                                                    await removeSellerGoal(existingGoal.id);
                                                }
                                            } else {
                                                if (numVal > 0) {
                                                    await addSellerGoal({ seller_name: goalSellerName, month: up.month, year: goalYear, goal_value: numVal });
                                                }
                                            }
                                        }
                                        showToast('Metas salvas com sucesso!');
                                        if (refetchGoals) await refetchGoals();
                                        setModal(null);
                                    } catch (e) {
                                        console.error(e);
                                        alert("Erro ao atualizar!");
                                    }
                                }}>Salvar Metas {goalModalTab === 'mensal' ? 'Mensais' : goalModalTab === 'trimestral' ? 'Trimestrais' : 'Anuais'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: NOTIFICAÇÕES */}
            {activeTab === 'notificacoes' && (
                <div style={{ maxWidth: 600 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 16 }}>
                        Preferências de Notificação
                    </div>

                    {/* Push */}
                    <div className="notif-settings-item">
                        <div className="notif-settings-item-info">
                            <div className="notif-settings-item-label">Notificações Push do Navegador</div>
                            <div className="notif-settings-item-desc">
                                {pushPermission === 'granted'
                                    ? 'Ativado — Você receberá alertas mesmo com o HEFESTO em segundo plano.'
                                    : pushPermission === 'denied'
                                        ? 'Bloqueado — Permissão negada no navegador. Reative nas configurações do navegador.'
                                        : 'Clique para ativar notificações push do navegador.'}
                            </div>
                        </div>
                        {pushPermission !== 'denied' && (
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={pushPermission === 'granted' && (notifSettings?.push_enabled ?? true)}
                                    onChange={async (e) => {
                                        if (pushPermission !== 'granted') {
                                            await requestPushPermission();
                                        } else {
                                            await upsertNotificationSettings({
                                                usuario_id: userId,
                                                push_enabled: e.target.checked,
                                                notif_tarefa_atribuida: notifSettings?.notif_tarefa_atribuida ?? true,
                                                notif_tarefa_vencimento: notifSettings?.notif_tarefa_vencimento ?? true,
                                                notif_mencao_chat: notifSettings?.notif_mencao_chat ?? true,
                                                vencimento_dias_antes: notifSettings?.vencimento_dias_antes ?? '5,3,1',
                                            });
                                            refetchNotifSettings();
                                        }
                                    }}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        )}
                    </div>

                    <div style={{ height: 12 }} />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 12 }}>
                        Tipos de Notificação
                    </div>

                    {/* Tarefa Atribuída */}
                    <div className="notif-settings-item">
                        <div className="notif-settings-item-info">
                            <div className="notif-settings-item-label">Atribuição de Tarefa</div>
                            <div className="notif-settings-item-desc">Quando alguém atribui uma tarefa ou demanda a você.</div>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={notifSettings?.notif_tarefa_atribuida ?? true}
                                onChange={async (e) => {
                                    await upsertNotificationSettings({
                                        usuario_id: userId,
                                        push_enabled: notifSettings?.push_enabled ?? true,
                                        notif_tarefa_atribuida: e.target.checked,
                                        notif_tarefa_vencimento: notifSettings?.notif_tarefa_vencimento ?? true,
                                        notif_mencao_chat: notifSettings?.notif_mencao_chat ?? true,
                                        vencimento_dias_antes: notifSettings?.vencimento_dias_antes ?? '5,3,1',
                                    });
                                    refetchNotifSettings();
                                }}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    {/* Tarefa Vencimento */}
                    <div className="notif-settings-item">
                        <div className="notif-settings-item-info">
                            <div className="notif-settings-item-label">Vencimento de Tarefa</div>
                            <div className="notif-settings-item-desc">Alertas quando suas tarefas estiverem próximas do prazo.</div>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={notifSettings?.notif_tarefa_vencimento ?? true}
                                onChange={async (e) => {
                                    await upsertNotificationSettings({
                                        usuario_id: userId,
                                        push_enabled: notifSettings?.push_enabled ?? true,
                                        notif_tarefa_atribuida: notifSettings?.notif_tarefa_atribuida ?? true,
                                        notif_tarefa_vencimento: e.target.checked,
                                        notif_mencao_chat: notifSettings?.notif_mencao_chat ?? true,
                                        vencimento_dias_antes: notifSettings?.vencimento_dias_antes ?? '5,3,1',
                                    });
                                    refetchNotifSettings();
                                }}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>

                    {/* Dias de antecedência */}
                    <div className="notif-settings-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
                        <div className="notif-settings-item-info">
                            <div className="notif-settings-item-label">Antecedência de Vencimento</div>
                            <div className="notif-settings-item-desc">Quantos dias antes do prazo deseja ser notificado.</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {[1, 2, 3, 5, 7].map(d => {
                                const currentDays = (notifSettings?.vencimento_dias_antes ?? '5,3,1').split(',').map(Number);
                                const isActive = currentDays.includes(d);
                                return (
                                    <button
                                        key={d}
                                        className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                                        style={{ padding: '6px 14px', fontSize: 13 }}
                                        onClick={async () => {
                                            const newDays = isActive
                                                ? currentDays.filter(x => x !== d)
                                                : [...currentDays, d].sort((a, b) => b - a);
                                            await upsertNotificationSettings({
                                                usuario_id: userId,
                                                push_enabled: notifSettings?.push_enabled ?? true,
                                                notif_tarefa_atribuida: notifSettings?.notif_tarefa_atribuida ?? true,
                                                notif_tarefa_vencimento: notifSettings?.notif_tarefa_vencimento ?? true,
                                                notif_mencao_chat: notifSettings?.notif_mencao_chat ?? true,
                                                vencimento_dias_antes: newDays.join(','),
                                            });
                                            refetchNotifSettings();
                                        }}
                                    >
                                        {d} dia{d > 1 ? 's' : ''}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Menção Chat */}
                    <div className="notif-settings-item">
                        <div className="notif-settings-item-info">
                            <div className="notif-settings-item-label">Menção no Chat</div>
                            <div className="notif-settings-item-desc">Quando alguém mencionar você com @nome em um canal.</div>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={notifSettings?.notif_mencao_chat ?? true}
                                onChange={async (e) => {
                                    await upsertNotificationSettings({
                                        usuario_id: userId,
                                        push_enabled: notifSettings?.push_enabled ?? true,
                                        notif_tarefa_atribuida: notifSettings?.notif_tarefa_atribuida ?? true,
                                        notif_tarefa_vencimento: notifSettings?.notif_tarefa_vencimento ?? true,
                                        notif_mencao_chat: e.target.checked,
                                        vencimento_dias_antes: notifSettings?.vencimento_dias_antes ?? '5,3,1',
                                    });
                                    refetchNotifSettings();
                                }}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            )}
            {/* Modal de Confirmação de Remoção de Membro */}
            {memberToRemove && (
                <div className="modal-overlay" onClick={() => setMemberToRemove(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-primary)', padding: '32px 24px', borderRadius: 12, width: '100%', maxWidth: 400, textAlign: 'center' }}>
                        <div style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            background: 'rgba(255,59,48,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            color: 'var(--danger)'
                        }}>
                            <AlertTriangle size={32} />
                        </div>
                        <h2 className="modal-title" style={{ marginBottom: 12, fontSize: 20 }}>Confirmar Remoção</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                            Tem certeza que deseja remover <strong>{memberToRemove.name}</strong> do time comercial? <br />
                            <span style={{ fontSize: 12, opacity: 0.8 }}>O histórico de vendas será mantido no sistema.</span>
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setMemberToRemove(null)}>Cancelar</button>
                            <button className="btn btn-primary" style={{ flex: 1, background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleConfirmRemoveMember} disabled={saving}>
                                {saving ? 'Removendo...' : 'Remover'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Remoção de Faixa */}
            {faixaToRemove && (
                <div className="modal-overlay" onClick={() => setFaixaToRemove(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-primary)', padding: '32px 24px', borderRadius: 12, width: '100%', maxWidth: 400, textAlign: 'center' }}>
                        <div style={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            background: 'rgba(255,59,48,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px',
                            color: 'var(--danger)'
                        }}>
                            <AlertTriangle size={32} />
                        </div>
                        <h2 className="modal-title" style={{ marginBottom: 12, fontSize: 20 }}>Remover Faixa</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                            Tem certeza que deseja remover a faixa <strong>{faixaToRemove.nome}</strong>?
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setFaixaToRemove(null)}>Cancelar</button>
                            <button className="btn btn-primary" style={{ flex: 1, background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={handleConfirmRemoveFaixa} disabled={saving}>
                                {saving ? 'Removendo...' : 'Remover'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
