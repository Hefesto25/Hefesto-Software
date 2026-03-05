import { useState, useRef } from 'react';
import {
    X, Edit2, Trash2, Plus, Phone, Mail, Globe, MapPin,
    User, Briefcase, FileText, Lock, Download, UploadCloud, AlertCircle
} from 'lucide-react';
import type {
    DiretorioColaborador, DiretorioColabPlataforma, DiretorioColabDocumento
} from '@/lib/types';
import {
    addDiretorioColaborador, updateDiretorioColaborador, removeDiretorioColaborador,
    useDiretorioColabPlataformas, addDiretorioColabPlataforma, updateDiretorioColabPlataforma, removeDiretorioColabPlataforma,
    useDiretorioColabDocumentos, addDiretorioColabDocumento, updateDiretorioColabDocumento, removeDiretorioColabDocumento,
    uploadDiretorioDocumento
} from '@/lib/hooks';
import { useAuth } from '../contexts/AuthContext';

export default function ColaboradorModal({
    colaborador, onClose, onSave
}: {
    colaborador: DiretorioColaborador | null;
    onClose: () => void;
    onSave: () => void;
}) {
    const { user } = useAuth();
    const colabAcesso = user?.categoria === 'Admin Geral' ? 'sensivel' : (user?.permissao_diretorio_colaboradores || 'nenhuma');
    const canViewSensitive = colabAcesso === 'sensivel';
    const canEdit = user?.categoria === 'Admin Geral' || user?.categoria === 'Administrativa';

    const [subTab, setSubTab] = useState<'info' | 'plataformas' | 'documentos'>('info');
    const [saving, setSaving] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; onConfirm: () => void } | null>(null);

    function requestConfirm(title: string, onConfirm: () => void) {
        setConfirmDialog({ isOpen: true, title, onConfirm });
    }

    function showToast(msg: string, type: 'success' | 'error' = 'success') {
        setToastMsg(msg);
        setToastType(type);
        setTimeout(() => setToastMsg(''), 3000);
    }

    return (
        <div className="modal-overlay" style={{ zIndex: 100 }}>
            <div className="modal-content" style={{ width: '900px', maxWidth: '95vw', background: 'var(--bg-primary)', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '85vh' }}>

                {/* Header */}
                <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
                    <div>
                        <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>
                            {colaborador ? colaborador.nome : 'Novo Colaborador'}
                        </h2>
                        {colaborador && <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>{colaborador.cargo || 'Sem cargo'}</p>}
                    </div>
                    <button className="modal-close" onClick={onClose} style={{ top: 24, right: 32 }}><X size={20} /></button>
                </div>

                {/* Sub-tabs */}
                {colaborador && (
                    <div className="tab-bar" style={{ margin: '0 auto 24px', padding: '4px' }}>
                        <button className={`tab-btn ${subTab === 'info' ? 'active' : ''}`} onClick={() => setSubTab('info')}>
                            <User size={16} /> Informações
                        </button>
                        <button className={`tab-btn ${subTab === 'plataformas' ? 'active' : ''}`} onClick={() => setSubTab('plataformas')}>
                            <Globe size={16} /> Acessos e Plataformas
                        </button>
                        <button className={`tab-btn ${subTab === 'documentos' ? 'active' : ''}`} onClick={() => setSubTab('documentos')}>
                            <FileText size={16} /> Documentos
                        </button>
                    </div>
                )}

                {/* Scrollable Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>

                    {/* TAB: INFO */}
                    {(!colaborador || subTab === 'info') && (
                        <InfoTab
                            colaborador={colaborador}
                            canEdit={canEdit}
                            canViewSensitive={canViewSensitive}
                            onSaved={() => { onSave(); if (!colaborador) onClose(); }}
                            onDeleted={() => { onSave(); onClose(); }}
                            showToast={showToast}
                            requestConfirm={requestConfirm}
                        />
                    )}

                    {/* TAB: PLATAFORMAS */}
                    {colaborador && subTab === 'plataformas' && (
                        <PlataformasTab colabId={colaborador.id} canEdit={canEdit} showToast={showToast} requestConfirm={requestConfirm} />
                    )}

                    {/* TAB: DOCUMENTOS */}
                    {colaborador && subTab === 'documentos' && (
                        <DocumentosTab colabId={colaborador.id} canEdit={canEdit} showToast={showToast} requestConfirm={requestConfirm} />
                    )}

                </div>
            </div>
            {toastMsg && (
                <div className={`toast ${toastType === 'error' ? 'toast-error' : ''}`}>
                    {toastMsg}
                </div>
            )}

            {/* Custom Confirm Dialog */}
            {confirmDialog?.isOpen && (
                <div className="modal-overlay" style={{ zIndex: 1000, background: 'rgba(0,0,0,0.8)' }} onClick={e => { e.stopPropagation(); setConfirmDialog(null); }}>
                    <div className="modal-content" style={{ width: 400, padding: 32, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <AlertCircle size={48} color="var(--danger)" style={{ margin: '0 auto 16px' }} />
                        <h3 style={{ fontSize: 20, marginBottom: 8 }}>Confirmar Exclusão</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>{confirmDialog.title}</p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmDialog(null)}>Cancelar</button>
                            <button className="btn btn-primary" style={{ flex: 1, background: 'var(--danger)', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)', border: 'none' }} onClick={() => {
                                confirmDialog.onConfirm();
                                setConfirmDialog(null);
                            }}>Excluir</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// -------------------------------------------------------------
// TAB: INFORMAÇÕES GERAIS
// -------------------------------------------------------------
function InfoTab({ colaborador, canEdit, canViewSensitive, onSaved, onDeleted, showToast, requestConfirm }: any) {
    const [nome, setNome] = useState(colaborador?.nome || '');
    const [cargo, setCargo] = useState(colaborador?.cargo || '');
    const [email, setEmail] = useState(colaborador?.email || '');
    const [whatsapp, setWhatsapp] = useState(colaborador?.whatsapp || '');
    const [telefone, setTelefone] = useState(colaborador?.telefone || '');
    const [status, setStatus] = useState(colaborador?.status || 'ativo');
    const [endereco, setEndereco] = useState(colaborador?.endereco || '');
    const [dataNascimento, setDataNascimento] = useState(colaborador?.data_nascimento || '');

    // Dados Sensíveis
    const [cpf, setCpf] = useState(colaborador?.cpf || '');
    const [rg, setRg] = useState(colaborador?.rg || '');
    const [chavePix, setChavePix] = useState(colaborador?.chave_pix || '');
    const [observacoes, setObservacoes] = useState(colaborador?.observacoes || '');

    const [saving, setSaving] = useState(false);

    async function handleSave() {
        if (!nome.trim()) { showToast('Nome é obrigatório', 'error'); return; }
        setSaving(true);
        const payload: any = {
            nome: nome.trim(),
            cargo: cargo.trim() || undefined,
            email: email.trim() || undefined,
            whatsapp: whatsapp.trim() || undefined,
            telefone: telefone.trim() || undefined,
            status,
            endereco: endereco.trim() || undefined,
            data_nascimento: dataNascimento || undefined,
            observacoes: observacoes.trim() || undefined
        };
        // Só tenta salvar dados sensíveis se o usuário puder ver (e logo, editar) eles.
        // Se formos criar ou editar dados confidenciais, a RLS permite updates em cpf, etc, desde que ele envie.
        // Mas para simplificar, se não os mandar, eles ficam null ou iguais se não passados.
        if (canViewSensitive) {
            payload.cpf = cpf.trim() || undefined;
            payload.rg = rg.trim() || undefined;
            payload.chave_pix = chavePix.trim() || undefined;
        }

        try {
            if (colaborador) {
                await updateDiretorioColaborador(colaborador.id, payload);
                showToast('Informações atualizadas com sucesso');
            } else {
                await addDiretorioColaborador(payload);
                showToast('Colaborador criado com sucesso');
            }
            onSaved();
        } catch (e: any) {
            showToast('Erro ao salvar: ' + (e.message || ''), 'error');
        }
        setSaving(false);
    }

    async function handleDelete() {
        if (!colaborador) return;
        requestConfirm(`Tem certeza que deseja apagar permanentemente o colaborador(a) ${colaborador.nome}? Esta ação apagará todos os acessos e documentos.`, async () => {
            try {
                await removeDiretorioColaborador(colaborador.id);
                onDeleted();
            } catch (e) {
                showToast('Erro ao excluir', 'error');
            }
        });
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label">Nome Completo *</label>
                        <input className="form-input" value={nome} onChange={e => setNome(e.target.value)} disabled={!canEdit} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Cargo / Função</label>
                        <input className="form-input" value={cargo} onChange={e => setCargo(e.target.value)} disabled={!canEdit} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">E-mail</label>
                        <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={!canEdit} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">WhatsApp</label>
                        <input className="form-input" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} disabled={!canEdit} />
                    </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label">Status</label>
                        <select className="form-input" value={status} onChange={e => setStatus(e.target.value as any)} disabled={!canEdit}>
                            <option value="ativo">Ativo</option>
                            <option value="inativo">Inativo</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Data de Nascimento</label>
                        <input className="form-input" type="date" value={dataNascimento} onChange={e => setDataNascimento(e.target.value)} disabled={!canEdit} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Telefone Alternativo</label>
                        <input className="form-input" value={telefone} onChange={e => setTelefone(e.target.value)} disabled={!canEdit} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Endereço Completo</label>
                        <input className="form-input" value={endereco} onChange={e => setEndereco(e.target.value)} disabled={!canEdit} />
                    </div>
                </div>
            </div>

            {/* Dados Sensíveis section */}
            <div style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 16, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Lock size={16} /> Dados Confidenciais
                </h3>
                {canViewSensitive ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, background: 'var(--bg-secondary)', padding: 20, borderRadius: 8, border: '1px solid var(--border-default)' }}>
                        <div className="form-group">
                            <label className="form-label">CPF</label>
                            <input className="form-input" value={cpf} onChange={e => setCpf(e.target.value)} disabled={!canEdit} placeholder="000.000.000-00" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">RG</label>
                            <input className="form-input" value={rg} onChange={e => setRg(e.target.value)} disabled={!canEdit} placeholder="00.000.000-0" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Chave PIX</label>
                            <input className="form-input" value={chavePix} onChange={e => setChavePix(e.target.value)} disabled={!canEdit} />
                        </div>
                    </div>
                ) : (
                    <div style={{ background: 'var(--bg-secondary)', padding: 20, borderRadius: 8, border: '1px border-dashed var(--border-default)', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Oculto por política de permissões. Acesso Sensível requerido.
                    </div>
                )}
            </div>

            <div className="form-group">
                <label className="form-label">Observações Internas</label>
                <textarea className="form-input" rows={3} value={observacoes} onChange={e => setObservacoes(e.target.value)} disabled={!canEdit} />
            </div>

            {canEdit && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 16, borderTop: '1px solid var(--border-default)', paddingTop: 24 }}>
                    {colaborador && (
                        <button className="btn btn-ghost" onClick={handleDelete} style={{ color: 'var(--danger)', padding: '10px 20px', borderRadius: '10px' }}>
                            <Trash2 size={16} /> Apagar Colaborador
                        </button>
                    )}
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ padding: '12px 32px', borderRadius: '12px', boxShadow: '0 4px 14px 0 rgba(249, 115, 22, 0.39)' }}>
                        {saving ? 'Salvando...' : 'Salvar Informações'}
                    </button>
                </div>
            )}
        </div>
    );
}

// -------------------------------------------------------------
// TAB: ACESSOS E PLATAFORMAS
// -------------------------------------------------------------
function PlataformasTab({ colabId, canEdit, showToast, requestConfirm }: any) {
    const { data: plataformas, loading, setData } = useDiretorioColabPlataformas(colabId);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<DiretorioColabPlataforma | null>(null);

    const [nomePlataforma, setNomePlataforma] = useState('');
    const [nomeUsuario, setNomeUsuario] = useState('');
    const [emailUtilizado, setEmailUtilizado] = useState('');
    const [observacoes, setObservacoes] = useState('');

    function openEdit(p: DiretorioColabPlataforma) {
        setEditing(p); setNomePlataforma(p.plataforma); setNomeUsuario(p.nome_usuario || '');
        setEmailUtilizado(p.email_utilizado || ''); setObservacoes(p.observacoes || '');
    }

    function openNew() {
        setEditing(null); setNomePlataforma(''); setNomeUsuario(''); setEmailUtilizado(''); setObservacoes('');
    }

    async function handleSave() {
        if (!nomePlataforma.trim()) return showToast('Preencha a plataforma', 'error');
        setSaving(true);
        const payload: any = {
            colaborador_id: colabId,
            plataforma: nomePlataforma.trim(),
            nome_usuario: nomeUsuario.trim() || undefined,
            email_utilizado: emailUtilizado.trim() || undefined,
            observacoes: observacoes.trim() || undefined
        };
        try {
            if (editing) {
                const up = await updateDiretorioColabPlataforma(editing.id, payload);
                setData(plataformas.map(x => x.id === editing.id ? up : x));
                showToast('Acesso atualizado');
            } else {
                const add = await addDiretorioColabPlataforma(payload);
                setData([...plataformas, add]);
                showToast('Acesso registrado');
            }
            openNew();
        } catch (e) {
            showToast('Erro ao salvar acesso', 'error');
        }
        setSaving(false);
    }

    async function handleDelete(id: string) {
        requestConfirm('Remover este acesso?', async () => {
            try {
                await removeDiretorioColabPlataforma(id);
                setData(plataformas.filter(x => x.id !== id));
                showToast('Acesso removido');
            } catch (e) {
                showToast('Erro ao remover', 'error');
            }
        });
    }

    return (
        <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, marginBottom: 16 }}>Acessos Liberados</h3>
                {loading ? <p>Carregando...</p> : plataformas.length === 0 ? <p className="template-empty" style={{ padding: 20 }}>Nenhum acesso registrado</p> : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                        {plataformas.map(p => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 16, background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                                <div>
                                    <h4 style={{ margin: '0 0 6px', fontSize: 15 }}>{p.plataforma}</h4>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                        {p.email_utilizado && <span style={{ display: 'block', marginBottom: 4 }}>E-mail: {p.email_utilizado}</span>}
                                        {p.nome_usuario && <span style={{ display: 'block', marginBottom: 4 }}>User: {p.nome_usuario}</span>}
                                        {p.observacoes && <span style={{ display: 'block', marginTop: 4, fontStyle: 'italic' }}>Obs: {p.observacoes}</span>}
                                    </div>
                                </div>
                                {canEdit && (
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="settings-action-btn" onClick={() => openEdit(p)}><Edit2 size={14} /></button>
                                        <button className="settings-action-btn" onClick={() => handleDelete(p.id)}><Trash2 size={14} color="var(--danger)" /></button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {canEdit && (
                <div style={{ width: 320, background: 'var(--bg-secondary)', padding: 20, borderRadius: 8, height: 'fit-content' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 14 }}>{editing ? 'Editar Acesso' : 'Registrar Acesso'}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Plataforma *</label>
                            <input className="form-input" value={nomePlataforma} onChange={e => setNomePlataforma(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">E-mail Utilizado</label>
                            <input className="form-input" value={emailUtilizado} onChange={e => setEmailUtilizado(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nome de Usuário</label>
                            <input className="form-input" value={nomeUsuario} onChange={e => setNomeUsuario(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Observações</label>
                            <textarea className="form-input" rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            {editing && <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={openNew}>Cancelar</button>}
                            <button className="btn btn-primary" style={{ flex: 1, padding: '10px', borderRadius: '8px', boxShadow: '0 4px 12px 0 rgba(249, 115, 22, 0.2)' }} onClick={handleSave} disabled={saving}>{saving ? 'Salvo...' : 'Salvar'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// -------------------------------------------------------------
// TAB: DOCUMENTOS
// -------------------------------------------------------------
function DocumentosTab({ colabId, canEdit, showToast, requestConfirm }: any) {
    const { data: documentos, loading, setData } = useDiretorioColabDocumentos(colabId);
    // Modal states
    const [submitting, setSubmitting] = useState(false);

    // Upload form
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [nomeDoc, setNomeDoc] = useState('');
    const [categoria, setCategoria] = useState<'Pessoal' | 'Contratual' | 'Técnico' | 'Outros'>('Pessoal');
    const [observacoes, setObservacoes] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleUpload() {
        if (!nomeDoc.trim() && !selectedFile) {
            showToast('Informe o nome e selecione um arquivo', 'error'); return;
        }
        setSubmitting(true);
        try {
            let fileurl = '';
            if (selectedFile) {
                fileurl = await uploadDiretorioDocumento(selectedFile, colabId);
            }
            const doc = await addDiretorioColabDocumento({
                colaborador_id: colabId,
                nome_documento: nomeDoc.trim() || selectedFile?.name || 'Documento',
                categoria: categoria,
                arquivo_url: fileurl || undefined,
                observacoes: observacoes.trim() || undefined
            });
            setData([doc, ...documentos]);
            showToast('Documento enviado');

            setNomeDoc(''); setSelectedFile(null); setObservacoes('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (e: any) {
            showToast('Erro no upload: ' + (e.message || ''), 'error');
        }
        setSubmitting(false);
    }

    async function handleDelete(id: string) {
        requestConfirm('Remover este documento? (Apenas remove o vínculo na listagem)', async () => {
            try {
                await removeDiretorioColabDocumento(id);
                setData(documentos.filter(d => d.id !== id));
                showToast('Documento removido');
            } catch (e) {
                showToast('Erro ao remover', 'error');
            }
        });
    }

    return (
        <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, marginBottom: 16 }}>Meus Documentos</h3>
                {loading ? <p>Carregando...</p> : documentos.length === 0 ? <p className="template-empty" style={{ padding: 20 }}>Nenhum documento guardado</p> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
                        {documentos.map(d => (
                            <div key={d.id} className="template-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                        <div style={{ background: 'var(--bg-primary)', padding: 10, borderRadius: 8 }}>
                                            <FileText size={20} color="var(--brand-primary)" />
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{d.nome_documento}</h4>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.categoria}</span>
                                        </div>
                                    </div>
                                    {canEdit && (
                                        <button className="settings-action-btn" onClick={() => handleDelete(d.id)}><Trash2 size={14} color="var(--danger)" /></button>
                                    )}
                                </div>
                                {d.observacoes && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.observacoes}</div>}
                                {d.arquivo_url && (
                                    <a href={d.arquivo_url} target="_blank" rel="noreferrer" style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 0', borderTop: '1px solid var(--border-default)', fontSize: 13, color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}>
                                        <Download size={14} /> Baixar Arquivo
                                    </a>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {canEdit && (
                <div style={{ width: 320, background: 'var(--bg-secondary)', padding: 20, borderRadius: 8, height: 'fit-content' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}><UploadCloud size={16} /> Enviar Documento</h4>
                    <div className="form-group">
                        <label className="form-label">Arquivo</label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                cursor: 'pointer',
                                border: '2px dashed var(--border-default)',
                                borderRadius: 8,
                                padding: '24px 16px',
                                textAlign: 'center',
                                background: selectedFile ? 'var(--accent-muted)' : 'var(--bg-primary)',
                                transition: 'all 0.2s ease',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 8,
                                borderStyle: selectedFile ? 'solid' : 'dashed',
                                borderColor: selectedFile ? 'var(--accent)' : 'var(--border-default)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--accent)';
                                e.currentTarget.style.background = 'var(--bg-hover)';
                            }}
                            onMouseLeave={(e) => {
                                if (!selectedFile) {
                                    e.currentTarget.style.borderColor = 'var(--border-default)';
                                    e.currentTarget.style.background = 'var(--bg-primary)';
                                } else {
                                    e.currentTarget.style.borderColor = 'var(--accent)';
                                    e.currentTarget.style.background = 'var(--accent-muted)';
                                }
                            }}
                        >
                            <UploadCloud size={32} color={selectedFile ? 'var(--accent)' : 'var(--text-muted)'} />
                            <div style={{ fontSize: 13, fontWeight: 500, color: selectedFile ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                {selectedFile ? selectedFile.name : 'Clique para escolher um arquivo'}
                            </div>
                            {selectedFile && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                            style={{ display: 'none' }}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Nome do Documento *</label>
                        <input className="form-input" value={nomeDoc} onChange={e => setNomeDoc(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Categoria</label>
                        <select className="form-input" value={categoria} onChange={e => setCategoria(e.target.value as any)}>
                            <option value="Pessoal">Pessoal</option>
                            <option value="Contratual">Contratual</option>
                            <option value="Técnico">Técnico</option>
                            <option value="Outros">Outros</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Observações</label>
                        <textarea className="form-input" rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} />
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', marginTop: 8, padding: '12px', borderRadius: '10px', boxShadow: '0 4px 12px 0 rgba(249, 115, 22, 0.2)' }} onClick={handleUpload} disabled={submitting}>
                        {submitting ? 'Enviando...' : 'Fazer Upload e Guardar'}
                    </button>
                </div>
            )}
        </div>
    );
}
