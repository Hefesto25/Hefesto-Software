'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Shield, User, Eye, X, Check, Settings, Briefcase, Bell } from 'lucide-react';
import {
    useTeam, addTeamMember, updateTeamMember, removeTeamMember,
    useFinancialTypes, useFinancialCategories,
    addFinancialType, removeFinancialType,
    addFinancialCategory, removeFinancialCategory,
    useNotificationSettings, upsertNotificationSettings
} from '@/lib/hooks';
import type { TeamMember } from '@/lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useNotificationContext } from '../contexts/NotificationContext';

const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#06B6D4', '#14B8A6', '#6366F1', '#F97316'];

const PERMISSION_LABELS: Record<string, { label: string; icon: typeof Shield; color: string }> = {
    admin: { label: 'Administrador', icon: Shield, color: '#F59E0B' },
    member: { label: 'Membro', icon: User, color: '#3B82F6' },
    viewer: { label: 'Visualizador', icon: Eye, color: '#6B7280' },
};

function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

type ModalState = { type: 'add' } | { type: 'edit'; member: TeamMember } | { type: 'delete'; member: TeamMember } | null;

export default function ConfiguracoesPage() {
    const { data: team, loading, setData: setTeam } = useTeam();
    const { data: types, loading: loadingTypes, setData: setTypes } = useFinancialTypes();
    const { data: categories, loading: loadingCategories, setData: setCategories } = useFinancialCategories();
    const { user } = useAuth();
    const { pushPermission, requestPushPermission } = useNotificationContext();
    const { data: notifSettings, loading: loadingNotifSettings, refetch: refetchNotifSettings } = useNotificationSettings(user?.id ?? '');

    const [modal, setModal] = useState<ModalState>(null);
    const [saving, setSaving] = useState(false);
    const userId = user?.id ?? '';

    // Tab State
    const [activeTab, setActiveTab] = useState<'equipe' | 'financas' | 'notificacoes'>('equipe');

    // Finanças State
    const [newType, setNewType] = useState('');
    const [newCategory, setNewCategory] = useState('');

    // Form state
    const [formName, setFormName] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formRole, setFormRole] = useState('');
    const [formPermission, setFormPermission] = useState<'admin' | 'member' | 'viewer'>('member');
    const [formColor, setFormColor] = useState(AVATAR_COLORS[0]);
    const [formCategory, setFormCategory] = useState('');
    const [formModules, setFormModules] = useState<string[]>(['/', '/chat', '/configuracoes']);
    const [formPassword, setFormPassword] = useState('');

    function openAddModal() {
        setFormName('');
        setFormEmail('');
        setFormRole('');
        setFormPermission('member');
        setFormColor(AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
        setFormCategory('');
        setFormModules(['/', '/chat', '/configuracoes']);
        setFormPassword('');
        setModal({ type: 'add' });
    }

    function openEditModal(member: TeamMember) {
        setFormName(member.name);
        setFormEmail(member.email);
        setFormRole(member.role);
        setFormPermission(member.permission);
        setFormColor(member.avatar_color);
        setFormCategory(member.category || '');
        setFormModules(member.allowed_modules || ['/', '/chat', '/configuracoes']);
        setFormPassword(member.initial_password || '');
        setModal({ type: 'edit', member });
    }

    async function handleAdd() {
        if (!formName || !formEmail || !formRole) return;
        setSaving(true);
        try {
            const newMember = await addTeamMember({
                name: formName,
                initials: getInitials(formName),
                email: formEmail,
                role: formRole,
                permission: formPermission,
                avatar_color: formColor,
                status: 'offline',
                category: formCategory,
                allowed_modules: formModules,
                initial_password: formPassword
            });
            setTeam([...team, newMember]);
            setModal(null);
        } catch (e) {
            console.error(e);
        }
        setSaving(false);
    }

    async function handleEdit() {
        if (modal?.type !== 'edit') return;
        setSaving(true);
        try {
            const updated = await updateTeamMember(modal.member.id, {
                name: formName,
                initials: getInitials(formName),
                email: formEmail,
                role: formRole,
                permission: formPermission,
                avatar_color: formColor,
                category: formCategory,
                allowed_modules: formModules,
                initial_password: formPassword
            });
            setTeam(team.map(m => m.id === updated.id ? updated : m));
            setModal(null);
        } catch (e) {
            console.error(e);
        }
        setSaving(false);
    }

    async function handleDelete() {
        if (modal?.type !== 'delete') return;
        setSaving(true);
        try {
            await removeTeamMember(modal.member.id);
            setTeam(team.filter(m => m.id !== modal.member.id));
            setModal(null);
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

    const admins = team.filter(m => m.permission === 'admin');
    const members = team.filter(m => m.permission === 'member');
    const viewers = team.filter(m => m.permission === 'viewer');

    return (
        <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
                <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>Configurações do Sistema</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Gerencie o ambiente corporativo e parâmetros</div>
                </div>
            </div>

            <div className="finance-tabs">
                <button
                    className={`finance-tab ${activeTab === 'equipe' ? 'active' : ''}`}
                    onClick={() => setActiveTab('equipe')}
                >
                    <User size={14} /> Gestão da Equipe
                </button>
                <button
                    className={`finance-tab ${activeTab === 'financas' ? 'active' : ''}`}
                    onClick={() => setActiveTab('financas')}
                >
                    <Briefcase size={14} /> Preferências Financeiras
                </button>
                <button
                    className={`finance-tab ${activeTab === 'notificacoes' ? 'active' : ''}`}
                    onClick={() => setActiveTab('notificacoes')}
                >
                    <Bell size={14} /> Notificações
                </button>
            </div>

            {/* TAB: EQUIPE */}
            {activeTab === 'equipe' && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 20 }}>
                        <button className="btn btn-primary" onClick={openAddModal}>
                            <Plus size={14} /> Adicionar Membro
                        </button>
                    </div>

                    {/* Permission groups */}
                    {[
                        { title: 'Administradores', members: admins, permission: 'admin' as const },
                        { title: 'Membros', members: members, permission: 'member' as const },
                        { title: 'Visualizadores', members: viewers, permission: 'viewer' as const },
                    ].filter(g => g.members.length > 0).map(group => {
                        const perm = PERMISSION_LABELS[group.permission];
                        return (
                            <div key={group.permission} style={{ marginBottom: 28 }}>
                                <div className="settings-group-header">
                                    <perm.icon size={14} style={{ color: perm.color }} />
                                    <span>{group.title}</span>
                                    <span className="settings-group-count">{group.members.length}</span>
                                </div>
                                <div className="settings-member-list">
                                    {group.members.map(member => (
                                        <div key={member.id} className="settings-member-card">
                                            <div className="settings-member-avatar" style={{ background: member.avatar_color }}>
                                                {member.initials}
                                            </div>
                                            <div className="settings-member-info">
                                                <div className="settings-member-name">{member.name}</div>
                                                <div className="settings-member-role">{member.role}</div>
                                            </div>
                                            <div className="settings-member-email">{member.email}</div>
                                            <div className={`settings-permission-badge ${member.permission}`}>
                                                {PERMISSION_LABELS[member.permission].label}
                                            </div>
                                            <div className="settings-member-actions">
                                                <button className="settings-action-btn" onClick={() => openEditModal(member)} title="Editar">
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    className="settings-action-btn danger"
                                                    onClick={() => setModal({ type: 'delete', member })}
                                                    title="Remover"
                                                    disabled={member.permission === 'admin' && admins.length <= 1}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {/* Add/Edit Modal */}
                    {(modal?.type === 'add' || modal?.type === 'edit') && (
                        <div className="settings-modal-overlay" onClick={() => setModal(null)}>
                            <div className="settings-modal" onClick={e => e.stopPropagation()}>
                                <div className="settings-modal-header">
                                    <h3>{modal.type === 'add' ? 'Adicionar Membro' : 'Editar Membro'}</h3>
                                    <button className="settings-action-btn" onClick={() => setModal(null)}>
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className="settings-modal-body">
                                    {/* Avatar Preview & Upload */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                        <div style={{
                                            width: 80, height: 80, borderRadius: '50%', background: formColor,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 28, fontWeight: 700, color: 'white', position: 'relative', overflow: 'hidden'
                                        }}>
                                            {formName ? getInitials(formName) : '??'}
                                        </div>
                                        <button className="btn btn-secondary" style={{ fontSize: 12, padding: '4px 12px' }} onClick={() => alert('Em breve: Upload de imagem. O Storage do Supabase precisa ser configurado primeiro.')}>Alterar Foto (Em breve)</button>
                                    </div>

                                    {/* Color picker */}
                                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                                        {AVATAR_COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setFormColor(color)}
                                                style={{
                                                    width: 28, height: 28, borderRadius: '50%', background: color,
                                                    border: formColor === color ? '3px solid var(--text-primary)' : '2px solid transparent',
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    transition: 'all 150ms ease',
                                                }}
                                            >
                                                {formColor === color && <Check size={14} style={{ color: 'white' }} />}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 14 }}>
                                        <label className="form-label">Nome Completo</label>
                                        <input className="form-input" type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="ex: João da Silva" />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 14 }}>
                                        <label className="form-label">Email</label>
                                        <input className="form-input" type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="ex: joao@hefesto.ai" />
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 14 }}>
                                        <label className="form-label">Senha Inicial</label>
                                        <input className="form-input" type="text" value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder="ex: Mudar@123" />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
                                        <div className="form-group">
                                            <label className="form-label">Função / Cargo</label>
                                            <input className="form-input" type="text" value={formRole} onChange={e => setFormRole(e.target.value)} placeholder="ex: Desenvolvedor" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Área / Time</label>
                                            <select className="form-select" value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                                                <option value="">Selecione...</option>
                                                <option value="Admin Geral">Admin Geral</option>
                                                <option value="Administrativa">Administrativa</option>
                                                <option value="Comercial">Comercial</option>
                                                <option value="Financeira">Financeira</option>
                                                <option value="Operacional">Operacional</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 20 }}>
                                        <label className="form-label">Permissão</label>
                                        <div className="settings-permission-select">
                                            {(['admin', 'member', 'viewer'] as const).map(p => {
                                                const perm = PERMISSION_LABELS[p];
                                                const Icon = perm.icon;
                                                return (
                                                    <button
                                                        key={p}
                                                        className={`settings-permission-option ${formPermission === p ? 'active' : ''}`}
                                                        onClick={() => setFormPermission(p)}
                                                        style={{ '--perm-color': perm.color } as React.CSSProperties}
                                                    >
                                                        <Icon size={16} />
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: 13 }}>{perm.label}</div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                                {p === 'admin' ? 'Acesso total ao sistema' : p === 'member' ? 'Acesso padrão' : 'Apenas visualização'}
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 20 }}>
                                        <label className="form-label">Acesso aos Módulos</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--bg-secondary)', padding: 12, borderRadius: 8 }}>
                                            {[
                                                { path: '/comercial', label: 'Comercial' },
                                                { path: '/financeiro', label: 'Financeiro' },
                                                { path: '/operacional', label: 'Operacional' },
                                                { path: '/administrativo', label: 'Administrativo' },
                                                { path: '/calendario', label: 'Calendário' },
                                            ].map(mod => (
                                                <label key={mod.path} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', opacity: formPermission === 'admin' ? 0.5 : 1 }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={formPermission === 'admin' || formModules.includes(mod.path)}
                                                        disabled={formPermission === 'admin'}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setFormModules(prev => [...prev, mod.path]);
                                                            else setFormModules(prev => prev.filter(p => p !== mod.path));
                                                        }}
                                                        style={{ accentColor: 'var(--primary)', width: 16, height: 16 }}
                                                    />
                                                    {mod.label}
                                                </label>
                                            ))}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Dashboard, Chat e Configurações estarão sempre acessíveis.{formPermission === 'admin' && ' Admins têm acesso a tudo.'}</div>
                                    </div>
                                </div>
                                <div className="settings-modal-footer">
                                    <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                                    <button className="btn btn-primary" onClick={modal.type === 'add' ? handleAdd : handleEdit} disabled={saving || !formName || !formEmail || !formRole}>
                                        {saving ? 'Salvando...' : modal.type === 'add' ? 'Adicionar' : 'Salvar'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delete confirmation modal */}
                    {modal?.type === 'delete' && (
                        <div className="settings-modal-overlay" onClick={() => setModal(null)}>
                            <div className="settings-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                                <div className="settings-modal-header">
                                    <h3>Remover Membro</h3>
                                    <button className="settings-action-btn" onClick={() => setModal(null)}>
                                        <X size={16} />
                                    </button>
                                </div>
                                <div className="settings-modal-body" style={{ textAlign: 'center', padding: '20px 24px' }}>
                                    <div style={{
                                        width: 56, height: 56, borderRadius: '50%', background: modal.member.avatar_color,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 20, fontWeight: 700, color: 'white', margin: '0 auto 16px'
                                    }}>
                                        {modal.member.initials}
                                    </div>
                                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                                        Remover {modal.member.name}?
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                        Esta ação não pode ser desfeita. O membro perderá acesso ao sistema.
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
