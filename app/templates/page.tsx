'use client';

import { useState, useMemo, useRef } from 'react';
import {
    Plus, Search, Edit2, Trash2, ExternalLink, Github, Eye, Settings,
    X, Upload, Code2, Globe, FolderOpen, Tag, Image as ImageIcon,
    Layers, CheckCircle2, AlertCircle, Archive, ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
    useTemplateCategorias, useTemplateModelos, useTemplateSites,
    createTemplateCategoria, updateTemplateCategoria, deleteTemplateCategoria,
    createTemplateModelo, updateTemplateModelo, deleteTemplateModelo,
    createTemplateSite, updateTemplateSite, deleteTemplateSite,
    uploadTemplateImage, useUsuarios
} from '@/lib/hooks';
import type { TemplateModelo, TemplateSite, TemplateCategoria } from '@/lib/types';

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ComponentType<{ size?: number }> }> = {
    'ativo': { label: 'Ativo', color: '#10B981', icon: CheckCircle2 },
    'em_desenvolvimento': { label: 'Em Desenvolvimento', color: '#F59E0B', icon: AlertCircle },
    'arquivado': { label: 'Arquivado', color: '#6B7280', icon: Archive },
};

const TABS = [
    { id: 'modelos', label: 'Modelos', icon: Code2 },
    { id: 'sites', label: 'Sites Úteis', icon: Globe },
];

export default function TemplatesPage() {
    const { user } = useAuth();
    const isAdmin = user?.categoria === 'Admin Geral';

    const [activeTab, setActiveTab] = useState('modelos');
    const [searchQuery, setSearchQuery] = useState('');

    // Data hooks
    const modeloCategorias = useTemplateCategorias('modelo');
    const siteCategorias = useTemplateCategorias('site');
    const { data: modelos, loading: loadingModelos, refetch: refetchModelos } = useTemplateModelos();
    const { data: sites, loading: loadingSites, refetch: refetchSites } = useTemplateSites();
    const { data: usuarios } = useUsuarios();

    // Modal state
    const [showModeloModal, setShowModeloModal] = useState(false);
    const [showSiteModal, setShowSiteModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'modelo' | 'site'; id: string; nome: string } | null>(null);
    const [editingModelo, setEditingModelo] = useState<TemplateModelo | null>(null);
    const [editingSite, setEditingSite] = useState<TemplateSite | null>(null);
    const [detailModelo, setDetailModelo] = useState<TemplateModelo | null>(null);

    // Form state for Modelo
    const [formModeloNome, setFormModeloNome] = useState('');
    const [formModeloDescricao, setFormModeloDescricao] = useState('');
    const [formModeloCategoriaId, setFormModeloCategoriaId] = useState('');
    const [formModeloUrlDemo, setFormModeloUrlDemo] = useState('');
    const [formModeloUrlRepo, setFormModeloUrlRepo] = useState('');
    const [formModeloTecnologias, setFormModeloTecnologias] = useState('');
    const [formModeloStatus, setFormModeloStatus] = useState<'ativo' | 'em_desenvolvimento' | 'arquivado'>('ativo');
    const [formModeloResponsavelId, setFormModeloResponsavelId] = useState('');
    const [formModeloImageFile, setFormModeloImageFile] = useState<File | null>(null);
    const [formModeloImagePreview, setFormModeloImagePreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form state for Site
    const [formSiteNome, setFormSiteNome] = useState('');
    const [formSiteUrl, setFormSiteUrl] = useState('');
    const [formSiteDescricao, setFormSiteDescricao] = useState('');
    const [formSiteCategoriaId, setFormSiteCategoriaId] = useState('');

    // Category management
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editCategoryName, setEditCategoryName] = useState('');

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Loading states
    const [saving, setSaving] = useState(false);

    function showToast(message: string, type: 'success' | 'error' = 'success') {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }

    // Filtered data
    const filteredModelos = useMemo(() => {
        if (!searchQuery) return modelos;
        const q = searchQuery.toLowerCase();
        return modelos.filter(m =>
            m.nome.toLowerCase().includes(q) ||
            m.descricao?.toLowerCase().includes(q) ||
            m.tecnologias?.some(t => t.toLowerCase().includes(q)) ||
            m.categoria?.nome?.toLowerCase().includes(q)
        );
    }, [modelos, searchQuery]);

    const sitesByCategory = useMemo(() => {
        const filtered = searchQuery
            ? sites.filter(s => s.nome.toLowerCase().includes(searchQuery.toLowerCase()) || s.url.toLowerCase().includes(searchQuery.toLowerCase()) || s.descricao?.toLowerCase().includes(searchQuery.toLowerCase()))
            : sites;
        const groups: Record<string, TemplateSite[]> = {};
        filtered.forEach(s => {
            const catName = s.categoria?.nome || 'Sem Categoria';
            if (!groups[catName]) groups[catName] = [];
            groups[catName].push(s);
        });
        return groups;
    }, [sites, searchQuery]);

    // === MODELO CRUD ===
    function openCreateModelo() {
        setEditingModelo(null);
        setFormModeloNome(''); setFormModeloDescricao(''); setFormModeloCategoriaId('');
        setFormModeloUrlDemo(''); setFormModeloUrlRepo(''); setFormModeloTecnologias('');
        setFormModeloStatus('ativo'); setFormModeloResponsavelId('');
        setFormModeloImageFile(null); setFormModeloImagePreview(null);
        setShowModeloModal(true);
    }

    function openEditModelo(modelo: TemplateModelo) {
        setEditingModelo(modelo);
        setFormModeloNome(modelo.nome);
        setFormModeloDescricao(modelo.descricao || '');
        setFormModeloCategoriaId(modelo.categoria_id || '');
        setFormModeloUrlDemo(modelo.url_demo || '');
        setFormModeloUrlRepo(modelo.url_repositorio || '');
        setFormModeloTecnologias(modelo.tecnologias?.join(', ') || '');
        setFormModeloStatus(modelo.status);
        setFormModeloResponsavelId(modelo.responsavel_id || '');
        setFormModeloImageFile(null);
        setFormModeloImagePreview(modelo.imagem_url || null);
        setShowModeloModal(true);
    }

    async function handleSaveModelo() {
        if (!formModeloNome.trim()) return;
        setSaving(true);

        let imageUrl = editingModelo?.imagem_url || null;
        if (formModeloImageFile) {
            const upload = await uploadTemplateImage(formModeloImageFile);
            if (upload.error) { showToast('Erro no upload: ' + upload.error, 'error'); setSaving(false); return; }
            imageUrl = upload.url;
        }

        const payload = {
            nome: formModeloNome.trim(),
            descricao: formModeloDescricao.trim() || null,
            categoria_id: formModeloCategoriaId || null,
            imagem_url: imageUrl,
            url_demo: formModeloUrlDemo.trim() || null,
            url_repositorio: formModeloUrlRepo.trim() || null,
            tecnologias: formModeloTecnologias.split(',').map(t => t.trim()).filter(Boolean),
            status: formModeloStatus,
            responsavel_id: formModeloResponsavelId || null,
        };

        const result = editingModelo
            ? await updateTemplateModelo(editingModelo.id, payload)
            : await createTemplateModelo(payload);

        if (result.success) {
            showToast(editingModelo ? 'Modelo atualizado!' : 'Modelo criado!');
            setShowModeloModal(false);
            refetchModelos();
        } else {
            showToast('Erro: ' + result.error, 'error');
        }
        setSaving(false);
    }

    async function handleDeleteModelo(id: string) {
        const result = await deleteTemplateModelo(id);
        if (result.success) { showToast('Modelo excluído!'); refetchModelos(); }
        else showToast('Erro: ' + result.error, 'error');
        setShowDeleteConfirm(null);
    }

    // === SITE CRUD ===
    function openCreateSite() {
        setEditingSite(null);
        setFormSiteNome(''); setFormSiteUrl(''); setFormSiteDescricao(''); setFormSiteCategoriaId('');
        setShowSiteModal(true);
    }

    function openEditSite(site: TemplateSite) {
        setEditingSite(site);
        setFormSiteNome(site.nome);
        setFormSiteUrl(site.url);
        setFormSiteDescricao(site.descricao || '');
        setFormSiteCategoriaId(site.categoria_id || '');
        setShowSiteModal(true);
    }

    async function handleSaveSite() {
        if (!formSiteNome.trim() || !formSiteUrl.trim()) return;
        setSaving(true);

        const payload = {
            nome: formSiteNome.trim(),
            url: formSiteUrl.trim(),
            descricao: formSiteDescricao.trim() || null,
            categoria_id: formSiteCategoriaId || null,
        };

        const result = editingSite
            ? await updateTemplateSite(editingSite.id, payload)
            : await createTemplateSite(payload);

        if (result.success) {
            showToast(editingSite ? 'Site atualizado!' : 'Site adicionado!');
            setShowSiteModal(false);
            refetchSites();
        } else {
            showToast('Erro: ' + result.error, 'error');
        }
        setSaving(false);
    }

    async function handleDeleteSite(id: string) {
        const result = await deleteTemplateSite(id);
        if (result.success) { showToast('Site excluído!'); refetchSites(); }
        else showToast('Erro: ' + result.error, 'error');
        setShowDeleteConfirm(null);
    }

    // === CATEGORY CRUD ===
    async function handleAddCategory() {
        if (!newCategoryName.trim()) return;
        const tipo = activeTab === 'modelos' ? 'modelo' : 'site';
        const res = await createTemplateCategoria(newCategoryName.trim(), tipo as 'modelo' | 'site');
        if (res.success) {
            showToast('Categoria criada!');
            setNewCategoryName('');
            if (tipo === 'modelo') modeloCategorias.refetch();
            else siteCategorias.refetch();
        } else showToast('Erro: ' + res.error, 'error');
    }

    async function handleUpdateCategory(id: string) {
        if (!editCategoryName.trim()) return;
        const res = await updateTemplateCategoria(id, editCategoryName.trim());
        if (res.success) {
            showToast('Categoria atualizada!');
            setEditingCategoryId(null);
            modeloCategorias.refetch();
            siteCategorias.refetch();
        } else showToast('Erro: ' + res.error, 'error');
    }

    async function handleDeleteCategory(id: string) {
        const res = await deleteTemplateCategoria(id);
        if (res.success) {
            showToast('Categoria excluída!');
            modeloCategorias.refetch();
            siteCategorias.refetch();
        } else showToast('Erro ao excluir: verifique se não há itens vinculados.', 'error');
    }

    function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { showToast('Imagem deve ter no máximo 5MB', 'error'); return; }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { showToast('Formato deve ser JPG, PNG ou WebP', 'error'); return; }
        setFormModeloImageFile(file);
        const reader = new FileReader();
        reader.onload = () => setFormModeloImagePreview(reader.result as string);
        reader.readAsDataURL(file);
    }

    const currentCategories = activeTab === 'modelos' ? modeloCategorias.data : siteCategorias.data;

    return (
        <div className="templates-page">
            {/* Tab bar */}
            <div className="tab-bar">
                {TABS.map(tab => {
                    const Icon = tab.icon;
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
                        placeholder={activeTab === 'modelos' ? 'Buscar modelos...' : 'Buscar sites...'}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                {isAdmin && (
                    <div className="templates-actions">
                        <button className="btn-secondary templates-cat-btn" onClick={() => setShowCategoryModal(true)}>
                            <Settings size={14} /> Categorias <ChevronDown size={13} />
                        </button>
                        <button className="btn-primary" onClick={activeTab === 'modelos' ? openCreateModelo : openCreateSite}>
                            {activeTab === 'modelos' ? 'Novo Modelo' : 'Novo Site'}
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            {activeTab === 'modelos' ? (
                <div className="template-grid">
                    {loadingModelos ? (
                        <div className="template-empty"><p>Carregando modelos...</p></div>
                    ) : filteredModelos.length === 0 ? (
                        <div className="template-empty">
                            <FolderOpen size={48} />
                            <p>Nenhum modelo cadastrado</p>
                            {isAdmin && <p className="muted">Clique em "+ Novo Modelo" para adicionar</p>}
                        </div>
                    ) : (
                        filteredModelos.map(modelo => {
                            const statusInfo = STATUS_MAP[modelo.status];
                            return (
                                <div key={modelo.id} className="template-card" onClick={() => { setDetailModelo(modelo); setShowDetailModal(true); }}>
                                    <div className="template-card-image">
                                        {modelo.imagem_url ? (
                                            <img src={modelo.imagem_url} alt={modelo.nome} />
                                        ) : (
                                            <div className="template-card-placeholder">
                                                <Code2 size={40} />
                                            </div>
                                        )}
                                        {statusInfo && (
                                            <span className="template-status-badge" style={{ background: statusInfo.color }}>
                                                {statusInfo.label}
                                            </span>
                                        )}
                                    </div>
                                    <div className="template-card-body">
                                        <h3>{modelo.nome}</h3>
                                        {modelo.categoria && <span className="template-category-tag">{modelo.categoria.nome}</span>}
                                        {modelo.descricao && <p className="template-card-desc">{modelo.descricao}</p>}
                                        {modelo.tecnologias?.length > 0 && (
                                            <div className="template-tech-tags">
                                                {modelo.tecnologias.slice(0, 4).map(t => <span key={t} className="template-tech-tag">{t}</span>)}
                                                {modelo.tecnologias.length > 4 && <span className="template-tech-tag more">+{modelo.tecnologias.length - 4}</span>}
                                            </div>
                                        )}
                                    </div>
                                    {isAdmin && (
                                        <div className="template-card-actions" onClick={e => e.stopPropagation()}>
                                            <button onClick={() => openEditModelo(modelo)} title="Editar"><Edit2 size={14} /></button>
                                            <button onClick={() => setShowDeleteConfirm({ type: 'modelo', id: modelo.id, nome: modelo.nome })} title="Excluir"><Trash2 size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                <div className="template-sites-container">
                    {loadingSites ? (
                        <div className="template-empty"><p>Carregando sites...</p></div>
                    ) : Object.keys(sitesByCategory).length === 0 ? (
                        <div className="template-empty">
                            <Globe size={48} />
                            <p>Nenhum site cadastrado</p>
                            {isAdmin && <p className="muted">Clique em "+ Novo Site" para adicionar</p>}
                        </div>
                    ) : (
                        Object.entries(sitesByCategory).map(([catName, catSites]) => (
                            <div key={catName} className="template-category-section">
                                <h3 className="template-category-title"><Layers size={16} /> {catName}</h3>
                                <div className="template-sites-grid">
                                    {catSites.map(site => (
                                        <a
                                            key={site.id}
                                            href={site.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="template-site-card"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <img
                                                src={`https://www.google.com/s2/favicons?domain=${new URL(site.url).hostname}&sz=32`}
                                                alt=""
                                                className="template-site-favicon"
                                                onError={e => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236B7280"><circle cx="12" cy="12" r="10"/></svg>'; }}
                                            />
                                            <div className="template-site-info">
                                                <span className="template-site-name">{site.nome}</span>
                                                {site.descricao && <span className="template-site-desc">{site.descricao}</span>}
                                            </div>
                                            <ExternalLink size={14} className="template-site-link-icon" />
                                            {isAdmin && (
                                                <div className="template-site-admin" onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                                                    <button onClick={() => openEditSite(site)}><Edit2 size={12} /></button>
                                                    <button onClick={() => setShowDeleteConfirm({ type: 'site', id: site.id, nome: site.nome })}><Trash2 size={12} /></button>
                                                </div>
                                            )}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ===== MODALS ===== */}

            {/* Modelo Detail Modal */}
            {showDetailModal && detailModelo && (
                <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="modal-content template-detail-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{detailModelo.nome}</h2>
                            <button className="modal-close" onClick={() => setShowDetailModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ gap: 20, display: 'flex', flexDirection: 'column' }}>
                            {detailModelo.imagem_url && (
                                <div className="template-detail-image">
                                    <img src={detailModelo.imagem_url} alt={detailModelo.nome} />
                                </div>
                            )}
                            <div className="template-detail-grid">
                                <div className="template-detail-item">
                                    <label>Categoria</label>
                                    <span>{detailModelo.categoria?.nome || '—'}</span>
                                </div>
                                <div className="template-detail-item">
                                    <label>Status</label>
                                    <span className="template-status-inline" style={{ color: STATUS_MAP[detailModelo.status]?.color }}>
                                        {STATUS_MAP[detailModelo.status]?.label}
                                    </span>
                                </div>
                                <div className="template-detail-item">
                                    <label>Responsável</label>
                                    <span>{detailModelo.responsavel?.nome || '—'}</span>
                                </div>
                                <div className="template-detail-item">
                                    <label>Criado em</label>
                                    <span>{new Date(detailModelo.created_at).toLocaleDateString('pt-BR')}</span>
                                </div>
                            </div>
                            {detailModelo.descricao && (
                                <div className="template-detail-item full">
                                    <label>Descrição</label>
                                    <p>{detailModelo.descricao}</p>
                                </div>
                            )}
                            {detailModelo.tecnologias?.length > 0 && (
                                <div className="template-detail-item full">
                                    <label>Tecnologias</label>
                                    <div className="template-tech-tags">
                                        {detailModelo.tecnologias.map(t => <span key={t} className="template-tech-tag">{t}</span>)}
                                    </div>
                                </div>
                            )}
                            <div className="template-detail-links">
                                {detailModelo.url_demo && (
                                    <a href={detailModelo.url_demo} target="_blank" rel="noopener noreferrer" className="btn-primary">
                                        <Eye size={14} /> Ver Demonstração
                                    </a>
                                )}
                                {detailModelo.url_repositorio && (
                                    <a href={detailModelo.url_repositorio} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                                        <Github size={14} /> Repositório
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modelo Modal */}
            {showModeloModal && (
                <div className="modal-overlay" onClick={() => setShowModeloModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <h2>{editingModelo ? 'Editar Modelo' : 'Novo Modelo'}</h2>
                            <button className="modal-close" onClick={() => setShowModeloModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Nome *</label>
                                <input className="form-input" value={formModeloNome} onChange={e => setFormModeloNome(e.target.value)} placeholder="Nome do modelo" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Descrição</label>
                                <textarea className="form-input" rows={3} value={formModeloDescricao} onChange={e => setFormModeloDescricao(e.target.value)} placeholder="Descreva o que o sistema faz" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Categoria</label>
                                    <select className="form-input" value={formModeloCategoriaId} onChange={e => setFormModeloCategoriaId(e.target.value)}>
                                        <option value="">Selecione...</option>
                                        {modeloCategorias.data.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-input" value={formModeloStatus} onChange={e => setFormModeloStatus(e.target.value as any)}>
                                        <option value="ativo">Ativo</option>
                                        <option value="em_desenvolvimento">Em Desenvolvimento</option>
                                        <option value="arquivado">Arquivado</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Imagem de Capa</label>
                                <div
                                    className="template-image-upload"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {formModeloImagePreview ? (
                                        <img src={formModeloImagePreview} alt="Preview" />
                                    ) : (
                                        <div className="template-image-upload-placeholder">
                                            <Upload size={24} />
                                            <span>Clique para upload (JPG, PNG, WebP — máx 5MB)</span>
                                        </div>
                                    )}
                                </div>
                                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleImageSelect} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">URL de Demonstração</label>
                                <input className="form-input" value={formModeloUrlDemo} onChange={e => setFormModeloUrlDemo(e.target.value)} placeholder="https://..." />
                            </div>
                            <div className="form-group">
                                <label className="form-label">URL do Repositório</label>
                                <input className="form-input" value={formModeloUrlRepo} onChange={e => setFormModeloUrlRepo(e.target.value)} placeholder="https://github.com/..." />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Tecnologias <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(separadas por vírgula)</span></label>
                                <input className="form-input" value={formModeloTecnologias} onChange={e => setFormModeloTecnologias(e.target.value)} placeholder="React, Next.js, Supabase..." />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Responsável</label>
                                <select className="form-input" value={formModeloResponsavelId} onChange={e => setFormModeloResponsavelId(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {usuarios.map((u: any) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-primary" onClick={handleSaveModelo} disabled={saving || !formModeloNome.trim()}>
                                {saving ? 'Salvando...' : editingModelo ? 'Salvar' : 'Criar'}
                            </button>
                            <button className="btn-ghost" onClick={() => setShowModeloModal(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Site Modal */}
            {showSiteModal && (
                <div className="modal-overlay" onClick={() => setShowSiteModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div className="modal-header">
                            <h2>{editingSite ? 'Editar Site' : 'Novo Site'}</h2>
                            <button className="modal-close" onClick={() => setShowSiteModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Nome *</label>
                                <input className="form-input" value={formSiteNome} onChange={e => setFormSiteNome(e.target.value)} placeholder="Nome do site" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">URL *</label>
                                <input className="form-input" value={formSiteUrl} onChange={e => setFormSiteUrl(e.target.value)} placeholder="https://..." />
                                {formSiteUrl && (() => {
                                    try {
                                        const hostname = new URL(formSiteUrl).hostname; return (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                                <img src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`} alt="" style={{ width: 20, height: 20, borderRadius: 4 }} />
                                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Favicon detectado</span>
                                            </div>
                                        );
                                    } catch { return null; }
                                })()}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Descrição</label>
                                <input className="form-input" value={formSiteDescricao} onChange={e => setFormSiteDescricao(e.target.value)} placeholder="Descrição curta (opcional)" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Categoria</label>
                                <select className="form-input" value={formSiteCategoriaId} onChange={e => setFormSiteCategoriaId(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {siteCategorias.data.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-primary" onClick={handleSaveSite} disabled={saving || !formSiteNome.trim() || !formSiteUrl.trim()}>
                                {saving ? 'Salvando...' : editingSite ? 'Salvar' : 'Adicionar'}
                            </button>
                            <button className="btn-ghost" onClick={() => setShowSiteModal(false)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Category Management Modal */}
            {showCategoryModal && (
                <div className="modal-overlay" onClick={() => setShowCategoryModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
                        <div className="modal-header template-modal-center-header">
                            <div className="modal-header-spacer"></div>
                            <h2>Gerenciar Categorias ({activeTab === 'modelos' ? 'Modelos' : 'Sites'})</h2>
                            <button className="modal-close" onClick={() => setShowCategoryModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div className="template-category-add">
                                <input
                                    className="form-input"
                                    placeholder="Nova categoria..."
                                    value={newCategoryName}
                                    onChange={e => setNewCategoryName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                                />
                                <button className="template-category-add-btn" onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                                    <Plus size={20} />
                                </button>
                            </div>
                            <div className="template-category-list">
                                {currentCategories.map(cat => (
                                    <div key={cat.id} className="template-category-item">
                                        {editingCategoryId === cat.id ? (
                                            <input
                                                className="form-input"
                                                value={editCategoryName}
                                                onChange={e => setEditCategoryName(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleUpdateCategory(cat.id)}
                                                onBlur={() => handleUpdateCategory(cat.id)}
                                                autoFocus
                                            />
                                        ) : (
                                            <>
                                                <span><Tag size={14} /> {cat.nome}</span>
                                                <div>
                                                    <button onClick={() => { setEditingCategoryId(cat.id); setEditCategoryName(cat.nome); }}><Edit2 size={12} /></button>
                                                    <button onClick={() => handleDeleteCategory(cat.id)}><Trash2 size={12} /></button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {currentCategories.length === 0 && (
                                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Nenhuma categoria criada</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h2>Confirmar Exclusão</h2>
                            <button className="modal-close" onClick={() => setShowDeleteConfirm(null)}><X size={20} /></button>
                        </div>
                        <div className="modal-body">
                            <p>Excluir <strong>{showDeleteConfirm.nome}</strong>? Esta ação não pode ser desfeita.</p>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-primary"
                                style={{ background: '#EF4444' }}
                                onClick={() => showDeleteConfirm.type === 'modelo' ? handleDeleteModelo(showDeleteConfirm.id) : handleDeleteSite(showDeleteConfirm.id)}
                            >
                                Excluir
                            </button>
                            <button className="btn-ghost" onClick={() => setShowDeleteConfirm(null)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`toast ${toast.type}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.message}
                </div>
            )}
        </div>
    );
}
