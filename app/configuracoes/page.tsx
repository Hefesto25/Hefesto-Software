'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Shield, User, Eye, X, Check, Briefcase, Bell, Mail, Calendar } from 'lucide-react';
import {
    useUsuarios, createUsuarioViaSignUp, updateUsuario, deleteUsuarioViaEdge,
    useFinancialTypes, useFinancialCategories,
    addFinancialType, removeFinancialType,
    addFinancialCategory, removeFinancialCategory,
    useNotificationSettings, upsertNotificationSettings
} from '@/lib/hooks';
import type { UsuarioDB } from '@/lib/hooks';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationContext } from '../contexts/NotificationContext';

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#06B6D4', '#14B8A6', '#6366F1', '#F97316'];

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

type ModalState = { type: 'add' } | { type: 'edit'; usuario: UsuarioDB } | { type: 'delete'; usuario: UsuarioDB } | null;

const ALL_MODULES = [
    { path: '/comercial', label: 'Comercial' },
    { path: '/financeiro', label: 'Financeiro' },
    { path: '/operacional', label: 'Operacional' },
    { path: '/administrativo', label: 'Administrativo' },
    { path: '/calendario', label: 'Calendário' },
    { path: '/configuracoes', label: 'Configurações' },
];

export default function ConfiguracoesPage() {
    const { data: usuarios, loading, setData: setUsuarios, refetch: refetchUsuarios } = useUsuarios();
    const { data: types, loading: loadingTypes, setData: setTypes } = useFinancialTypes();
    const { data: categories, loading: loadingCategories, setData: setCategories } = useFinancialCategories();
    const { user } = useAuth();
    const { pushPermission, requestPushPermission } = useNotificationContext();
    const { data: notifSettings, loading: loadingNotifSettings, refetch: refetchNotifSettings } = useNotificationSettings(user?.id ?? '');

    const [modal, setModal] = useState<ModalState>(null);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);
    const userId = user?.id ?? '';
    const isAdminGeral = user?.categoria === 'Admin Geral';

    // Tab State
    const [activeTab, setActiveTab] = useState<'equipe' | 'financas' | 'notificacoes'>('equipe');

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
            } else if (isAdmin && isSelf) {
                // Admin editing themselves
                updates.cargo = editRole.trim();
                updates.categoria = editCategory;
                const baseModules = ['/', '/chat', '/notificacoes'];
                updates.modulos_acesso = [...new Set([...baseModules, ...editModules])];
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
        </>
    );
}
