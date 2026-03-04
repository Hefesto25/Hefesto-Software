import { useState, useEffect } from 'react';
import {
    X, Edit2, Trash2, Plus, Building2, Phone, Mail, Globe, Eye, EyeOff, CheckCircle2, AlertCircle, Copy, Link as LinkIcon, Lock, UserCircle, Calendar, DollarSign, Server
} from 'lucide-react';
import type {
    DiretorioCliente, DiretorioContato, DiretorioLogin, DiretorioAssinatura, DiretorioCusto
} from '@/lib/types';
import {
    useDiretorioContatos, useDiretorioLogins, useDiretorioAssinaturas, useDiretorioCustos,
    addDiretorioCliente, updateDiretorioCliente, removeDiretorioCliente,
    addDiretorioContato, updateDiretorioContato, removeDiretorioContato,
    revealDiretorioPassword, upsertDiretorioLogin, removeDiretorioLogin,
    addDiretorioAssinatura, updateDiretorioAssinatura, removeDiretorioAssinatura,
    addDiretorioCusto, updateDiretorioCusto, removeDiretorioCusto
} from '@/lib/hooks';

interface ClienteModalProps {
    cliente: DiretorioCliente | null; // se nulo, é criação de novo cliente
    onClose: () => void;
    onSave: () => void;
}

export default function ClienteModal({ cliente, onClose, onSave }: ClienteModalProps) {
    const [subTab, setSubTab] = useState<'info' | 'contatos' | 'logins' | 'assinaturas' | 'custos'>('info');
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean; title: string; onConfirm: () => void } | null>(null);

    function requestConfirm(title: string, onConfirm: () => void) {
        setConfirmDialog({ isOpen: true, title, onConfirm });
    }

    // Form fields - Info
    const [nome, setNome] = useState(cliente?.nome || '');
    const [segmento, setSegmento] = useState(cliente?.segmento || '');
    const [status, setStatus] = useState<'ativo' | 'inativo'>(cliente?.status || 'ativo');
    const [whatsapp, setWhatsapp] = useState(cliente?.whatsapp || '');
    const [email, setEmail] = useState(cliente?.email || '');
    const [telefone, setTelefone] = useState(cliente?.telefone || '');
    const [site, setSite] = useState(cliente?.site || '');
    const [observacoes, setObservacoes] = useState(cliente?.observacoes || '');

    function showToast(msg: string, type: 'success' | 'error' = 'success') {
        setToast({ message: msg, type });
        setTimeout(() => setToast(null), 3000);
    }

    async function handleSaveInfo() {
        if (!nome.trim()) {
            showToast('Nome é obrigatório', 'error');
            return;
        }
        setSaving(true);
        const payload = {
            nome: nome.trim(),
            segmento: segmento.trim() || undefined,
            status,
            whatsapp: whatsapp.trim() || undefined,
            email: email.trim() || undefined,
            telefone: telefone.trim() || undefined,
            site: site.trim() || undefined,
            observacoes: observacoes.trim() || undefined,
        };

        try {
            if (cliente) {
                await updateDiretorioCliente(cliente.id, payload);
                showToast('Cliente atualizado!'); onSave();
            } else {
                await addDiretorioCliente(payload);
                showToast('Cliente criado!'); onSave();
            }
        } catch (e: any) {
            showToast('Erro: ' + (e.message || 'Erro inesperado'), 'error');
        }
        setSaving(false);
    }

    // Since Sub-entities require an existing client, we only show those tabs if `cliente` exists.
    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
            <div className="modal-content template-detail-modal" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 900, height: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <h2>{cliente ? `Cliente: ${cliente.nome}` : 'Novo Cliente'}</h2>
                    <button className="modal-close" onClick={onClose} style={{ top: 20, right: 24 }}><X size={20} /></button>
                </div>

                {/* Tabs */}
                {cliente && (
                    <div className="tab-bar" style={{ margin: '0 auto 24px', padding: '4px' }}>
                        <button className={`tab-btn ${subTab === 'info' ? 'active' : ''}`} onClick={() => setSubTab('info')}>Informações Gerais</button>
                        <button className={`tab-btn ${subTab === 'contatos' ? 'active' : ''}`} onClick={() => setSubTab('contatos')}>Contatos</button>
                        <button className={`tab-btn ${subTab === 'logins' ? 'active' : ''}`} onClick={() => setSubTab('logins')}>Logins e Plataformas</button>
                        <button className={`tab-btn ${subTab === 'assinaturas' ? 'active' : ''}`} onClick={() => setSubTab('assinaturas')}>Assinaturas</button>
                        <button className={`tab-btn ${subTab === 'custos' ? 'active' : ''}`} onClick={() => setSubTab('custos')}>Custos</button>
                    </div>
                )}

                <div className="modal-body" style={{ flex: 1, overflowY: 'auto' }}>
                    {/* Toast Internal */}
                    {toast && (
                        <div className={`toast ${toast.type} `} style={{ position: 'absolute', top: 20, right: 20 }}>
                            {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            {toast.message}
                        </div>
                    )}

                    {/* TAB: INFO */}
                    {(subTab === 'info' || !cliente) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div className="form-group">
                                <label className="form-label">Nome da Empresa *</label>
                                <input className="form-input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Acme Corp" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label">Segmento</label>
                                    <input className="form-input" value={segmento} onChange={e => setSegmento(e.target.value)} placeholder="Ex: Tecnologia" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-input" value={status} onChange={e => setStatus(e.target.value as any)}>
                                        <option value="ativo">Ativo</option>
                                        <option value="inativo">Inativo</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">WhatsApp</label>
                                    <input className="form-input" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">E-mail de Contato</label>
                                    <input className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="contato@acme.com" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Telefone Fixo</label>
                                    <input className="form-input" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 0000-0000" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Site</label>
                                    <input className="form-input" value={site} onChange={e => setSite(e.target.value)} placeholder="https://acme.com" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Observações</label>
                                <textarea className="form-input" rows={4} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Detalhes adicionais..." />
                            </div>
                            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                {cliente && (
                                    <button className="btn btn-ghost" onClick={async () => {
                                        if (confirm('Tem certeza que deseja excluir este cliente?')) {
                                            try {
                                                await removeDiretorioCliente(cliente.id);
                                                onClose(); onSave();
                                            } catch (e) {
                                                showToast('Erro ao excluir', 'error');
                                            }
                                        }
                                    }} style={{ color: 'var(--danger)' }}>Excluir Cliente</button>
                                )}
                                <button className="btn btn-primary" onClick={handleSaveInfo} disabled={saving} style={{ padding: '12px 32px', borderRadius: '12px', boxShadow: '0 4px 14px 0 rgba(249, 115, 22, 0.39)' }}>
                                    {saving ? 'Salvando...' : 'Salvar Informações'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* TAB: CONTATOS */}
                    {cliente && subTab === 'contatos' && (
                        <ContatosTab clienteId={cliente.id} showToast={showToast} requestConfirm={requestConfirm} />
                    )}

                    {/* TAB: LOGINS */}
                    {cliente && subTab === 'logins' && (
                        <LoginsTab clienteId={cliente.id} showToast={showToast} requestConfirm={requestConfirm} />
                    )}

                    {/* TAB: ASSINATURAS */}
                    {cliente && subTab === 'assinaturas' && (
                        <AssinaturasTab clienteId={cliente.id} showToast={showToast} requestConfirm={requestConfirm} />
                    )}

                    {/* TAB: CUSTOS */}
                    {cliente && subTab === 'custos' && (
                        <CustosTab clienteId={cliente.id} showToast={showToast} requestConfirm={requestConfirm} />
                    )}

                    {/* TODO: Se sobrar alguma aba não mapeada */}
                    {cliente && subTab !== 'info' && subTab !== 'contatos' && subTab !== 'logins' && subTab !== 'assinaturas' && subTab !== 'custos' && (
                        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                            <p>Em desenvolvimento: Aba {subTab}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Custom Confirm Dialog */}
            {confirmDialog?.isOpen && (
                <div className="modal-overlay" style={{ zIndex: 1000, background: 'rgba(0,0,0,0.8)' }}>
                    <div className="modal-content" style={{ width: 400, padding: 32, textAlign: 'center' }}>
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

// Sub-components for Tabs
function ContatosTab({ clienteId, showToast, requestConfirm }: { clienteId: string, showToast: any, requestConfirm: (t: string, fn: () => void) => void }) {
    const { data: contatos, loading, setData: setContatos } = useDiretorioContatos(clienteId);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<DiretorioContato | null>(null);
    const [nome, setNome] = useState('');
    const [cargo, setCargo] = useState('');
    const [email, setEmail] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [observacoes, setObservacoes] = useState('');

    function openEdit(c: DiretorioContato) {
        setEditing(c); setNome(c.nome); setCargo(c.cargo || ''); setEmail(c.email || '');
        setWhatsapp(c.whatsapp || ''); setObservacoes(c.observacoes || '');
    }

    function openNew() {
        setEditing(null); setNome(''); setCargo(''); setEmail(''); setWhatsapp(''); setObservacoes('');
    }

    async function handleSave() {
        if (!nome.trim()) { showToast('Nome é obrigatório', 'error'); return; }
        setSaving(true);
        const payload = { cliente_id: clienteId, nome: nome.trim(), cargo: cargo.trim() || undefined, email: email.trim() || undefined, whatsapp: whatsapp.trim() || undefined, observacoes: observacoes.trim() || undefined };
        try {
            if (editing) {
                const updated = await updateDiretorioContato(editing.id, payload);
                setContatos(contatos.map(c => c.id === editing.id ? updated : c));
                showToast('Contato atualizado');
            } else {
                const added = await addDiretorioContato(payload);
                setContatos([...contatos, added]);
                showToast('Contato criado');
            }
            openNew();
        } catch (e: any) {
            showToast('Erro: ' + (e.message || 'Erro inesperado'), 'error');
        }
        setSaving(false);
    }

    function handleDelete(id: string) {
        requestConfirm('Excluir contato?', async () => {
            try {
                await removeDiretorioContato(id);
                setContatos(contatos.filter(c => c.id !== id));
                showToast('Contato excluído');
            } catch (e) {
                showToast('Erro ao excluir', 'error');
            }
        });
    }

    return (
        <div style={{ display: 'flex', gap: 24 }}>
            {/* Lista */}
            <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, marginBottom: 16 }}>Contatos do Cliente</h3>
                {loading ? <p>Carregando...</p> : contatos.length === 0 ? <p className="template-empty" style={{ padding: 20 }}>Nenhum contato</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {contatos.map(c => (
                            <div key={c.id} style={{ padding: 16, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ fontWeight: 600 }}>{c.nome} {c.cargo && <span style={{ fontWeight: 400, opacity: 0.7, fontSize: 13 }}>- {c.cargo}</span>}</div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="settings-action-btn" onClick={() => openEdit(c)}><Edit2 size={14} /></button>
                                        <button className="settings-action-btn" onClick={() => handleDelete(c.id)}><Trash2 size={14} color="var(--danger)" /></button>
                                    </div>
                                </div>
                                <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                                    {c.email && <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}><Mail size={12} /> {c.email}</span>}
                                    {c.whatsapp && <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}><Phone size={12} /> {c.whatsapp}</span>}
                                </div>
                                {c.observacoes && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>Obs: {c.observacoes}</div>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* Form */}
            <div style={{ width: 320, background: 'var(--bg-secondary)', padding: 20, borderRadius: 8, height: 'fit-content' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 14 }}>{editing ? 'Editar Contato' : 'Novo Contato'}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">Nome *</label>
                        <input className="form-input" value={nome} onChange={e => setNome(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Cargo</label>
                        <input className="form-input" value={cargo} onChange={e => setCargo(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">E-mail</label>
                        <input className="form-input" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">WhatsApp</label>
                        <input className="form-input" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
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
        </div>
    );
}

function LoginsTab({ clienteId, showToast, requestConfirm }: { clienteId: string, showToast: any, requestConfirm: (t: string, fn: () => void) => void }) {
    const { data: logins, loading, setData: setLogins } = useDiretorioLogins(clienteId);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<DiretorioLogin | null>(null);
    const [plataforma, setPlataforma] = useState('');
    const [emailAcesso, setEmailAcesso] = useState('');
    const [urlAcesso, setUrlAcesso] = useState('');
    const [password, setPassword] = useState('');
    const [observacoes, setObservacoes] = useState('');

    // State para senhas reveladas
    const [revealedPasswords, setRevealedPasswords] = useState<Record<string, { secret: string, timeoutId: NodeJS.Timeout }>>({});

    function openEdit(l: DiretorioLogin) {
        setEditing(l); setPlataforma(l.plataforma); setEmailAcesso(l.email_acesso || '');
        setUrlAcesso(l.url_acesso || ''); setPassword(''); setObservacoes(l.observacoes || '');
    }

    function openNew() {
        setEditing(null); setPlataforma(''); setEmailAcesso(''); setUrlAcesso('');
        setPassword(''); setObservacoes('');
    }

    async function handleSave() {
        if (!plataforma.trim()) { showToast('Nome da plataforma é obrigatório', 'error'); return; }
        setSaving(true);
        const payload = {
            p_id: editing ? editing.id : null,
            p_cliente_id: clienteId,
            p_plataforma: plataforma.trim(),
            p_email_acesso: emailAcesso.trim() || undefined,
            p_raw_password: password || undefined,
            p_url_acesso: urlAcesso.trim() || undefined,
            p_observacoes: observacoes.trim() || undefined
        };
        try {
            const result = await upsertDiretorioLogin(payload);
            if (editing) {
                setLogins(logins.map(l => l.id === editing.id ? result : l));
                showToast('Login atualizado');
            } else {
                setLogins([...logins, result]);
                showToast('Login criado');
            }
            openNew();
        } catch (e: any) {
            showToast('Erro: ' + (e.message || 'Erro inesperado'), 'error');
        }
        setSaving(false);
    }

    async function handleDelete(id: string) {
        if (!confirm('Excluir este acesso?')) return;
        try {
            await removeDiretorioLogin(id);
            setLogins(logins.filter(l => l.id !== id));
            showToast('Acesso excluído');
        } catch (e) {
            showToast('Erro ao excluir', 'error');
        }
    }

    async function handleReveal(id: string) {
        if (revealedPasswords[id]) {
            // Se já está revelado, oculta
            clearTimeout(revealedPasswords[id].timeoutId);
            const next = { ...revealedPasswords };
            delete next[id];
            setRevealedPasswords(next);
            return;
        }

        try {
            const secret = await revealDiretorioPassword(id);
            if (secret) {
                const timeoutId = setTimeout(() => {
                    setRevealedPasswords(prev => {
                        const copy = { ...prev };
                        delete copy[id];
                        return copy;
                    });
                }, 15000);
                setRevealedPasswords(prev => ({ ...prev, [id]: { secret, timeoutId } }));
            } else {
                showToast('Senha vazia ou não encontrada', 'error');
            }
        } catch (e: any) {
            showToast('Erro ao revelar senha', 'error');
        }
    }

    // Cleanup timeouts
    useEffect(() => {
        return () => { Object.values(revealedPasswords).forEach(p => clearTimeout(p.timeoutId)); };
    }, [revealedPasswords]);

    return (
        <div style={{ display: 'flex', gap: 24 }}>
            {/* Lista */}
            <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, marginBottom: 16 }}>Logins e Plataformas</h3>
                {loading ? <p>Carregando...</p> : logins.length === 0 ? <p className="template-empty" style={{ padding: 20 }}>Nenhum login cadastrado</p> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                        {logins.map(l => (
                            <div key={l.id} style={{ padding: 16, borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-default)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Lock size={14} style={{ color: 'var(--text-muted)' }} /> {l.plataforma}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="settings-action-btn" onClick={() => openEdit(l)}><Edit2 size={14} /></button>
                                        <button className="settings-action-btn" onClick={() => handleDelete(l.id)}><Trash2 size={14} color="var(--danger)" /></button>
                                    </div>
                                </div>
                                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                                    {l.url_acesso && (
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <Globe size={12} /> <a href={l.url_acesso} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'underline' }}>Link de Acesso</a>
                                        </div>
                                    )}
                                    {l.email_acesso && (
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <UserCircle size={12} /> {l.email_acesso}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'var(--bg-primary)', padding: '6px 10px', borderRadius: 4, marginTop: 4 }}>
                                        <Lock size={12} />
                                        <span style={{ flex: 1, fontFamily: 'monospace', letterSpacing: revealedPasswords[l.id] ? 0 : 2 }}>
                                            {revealedPasswords[l.id] ? revealedPasswords[l.id].secret : '••••••••••••'}
                                        </span>
                                        <button className="settings-action-btn" onClick={() => handleReveal(l.id)}>
                                            {revealedPasswords[l.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                        {revealedPasswords[l.id] && (
                                            <button className="settings-action-btn" onClick={() => {
                                                navigator.clipboard.writeText(revealedPasswords[l.id].secret);
                                                showToast('Copiado!');
                                            }}>
                                                <Copy size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {l.observacoes && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border-default)', paddingTop: 8 }}>Obs: {l.observacoes}</div>}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Form */}
            <div style={{ width: 320, background: 'var(--bg-secondary)', padding: 20, borderRadius: 8, height: 'fit-content' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 14 }}>{editing ? 'Editar Acesso' : 'Novo Acesso'}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">Plataforma *</label>
                        <input className="form-input" value={plataforma} onChange={e => setPlataforma(e.target.value)} placeholder="Ex: Trello, HostGator" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Link (URL)</label>
                        <input className="form-input" value={urlAcesso} onChange={e => setUrlAcesso(e.target.value)} placeholder="https://..." />
                    </div>
                    <div className="form-group">
                        <label className="form-label">E-mail / Usuário</label>
                        <input className="form-input" value={emailAcesso} onChange={e => setEmailAcesso(e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">{editing ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}</label>
                        <input className="form-input" type="text" value={password} onChange={e => setPassword(e.target.value)} />
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
        </div>
    );
}

function isVencendo(data_str?: string) {
    if (!data_str) return false;
    const date = new Date(data_str);
    const today = new Date();
    const diff = date.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days >= 0 && days <= 7;
}

function AssinaturasTab({ clienteId, showToast, requestConfirm }: { clienteId: string, showToast: any, requestConfirm: (t: string, fn: () => void) => void }) {
    const { data: assinaturas, loading, setData: setAssinaturas } = useDiretorioAssinaturas(clienteId);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<DiretorioAssinatura | null>(null);

    const [nomeFerramenta, setNomeFerramenta] = useState('');
    const [responsavelPag, setResponsavelPag] = useState<'nos' | 'cliente'>('nos');
    const [valorMensal, setValorMensal] = useState('');
    const [dataVencimento, setDataVencimento] = useState('');
    const [status, setStatus] = useState<'ativa' | 'vencida' | 'cancelada'>('ativa');
    const [observacoes, setObservacoes] = useState('');

    function openEdit(a: DiretorioAssinatura) {
        setEditing(a); setNomeFerramenta(a.nome_ferramenta);
        setResponsavelPag(a.responsavel_pag || 'nos'); setValorMensal(a.valor_mensal?.toString() || '');
        setDataVencimento(a.data_vencimento ? a.data_vencimento.split('T')[0] : '');
        setStatus(a.status); setObservacoes(a.observacoes || '');
    }

    function openNew() {
        setEditing(null); setNomeFerramenta(''); setResponsavelPag('nos');
        setValorMensal(''); setDataVencimento(''); setStatus('ativa'); setObservacoes('');
    }

    async function handleSave() {
        if (!nomeFerramenta.trim()) { showToast('Nome da ferramenta é obrigatório', 'error'); return; }
        setSaving(true);
        const payload: Omit<DiretorioAssinatura, 'id' | 'created_at'> = {
            cliente_id: clienteId,
            nome_ferramenta: nomeFerramenta.trim(),
            responsavel_pag: responsavelPag,
            valor_mensal: valorMensal ? parseFloat(valorMensal) : undefined,
            data_vencimento: dataVencimento || undefined,
            status,
            observacoes: observacoes.trim() || undefined
        };
        try {
            if (editing) {
                const updated = await updateDiretorioAssinatura(editing.id, payload);
                setAssinaturas(assinaturas.map(a => a.id === editing.id ? updated : a));
                showToast('Assinatura atualizada');
            } else {
                const added = await addDiretorioAssinatura(payload);
                setAssinaturas([...assinaturas, added]);
                showToast('Assinatura criada');
            }
            openNew();
        } catch (e: any) {
            showToast('Erro: ' + (e.message || 'Erro inesperado'), 'error');
        }
        setSaving(false);
    }

    async function handleDelete(id: string) {
        if (!confirm('Excluir esta assinatura?')) return;
        try {
            await removeDiretorioAssinatura(id);
            setAssinaturas(assinaturas.filter(a => a.id !== id));
            showToast('Assinatura excluída');
        } catch (e) {
            showToast('Erro ao excluir', 'error');
        }
    }

    const valorTotal = assinaturas.reduce((acc, a) => acc + (a.status === 'ativa' && a.valor_mensal ? a.valor_mensal : 0), 0);

    return (
        <div style={{ display: 'flex', gap: 24 }}>
            {/* Lista */}
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16 }}>Assinaturas da Empresa</h3>
                    <div style={{ background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500 }}>
                        Custo Mensal Ativo: <span style={{ color: 'var(--brand-primary)' }}>R$ {valorTotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>

                {loading ? <p>Carregando...</p> : assinaturas.length === 0 ? <p className="template-empty" style={{ padding: 20 }}>Nenhuma assinatura cadastrada</p> : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
                        {assinaturas.map(a => {
                            const vencendo = a.status === 'ativa' && isVencendo(a.data_vencimento);
                            return (
                                <div key={a.id} style={{
                                    padding: 16, borderRadius: 8, background: 'var(--bg-secondary)',
                                    border: `1px solid ${vencendo ? 'var(--warning)' : 'var(--border-default)'}`
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {a.nome_ferramenta}
                                            {vencendo && <AlertCircle size={14} color="var(--warning)" />}
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="settings-action-btn" onClick={() => openEdit(a)}><Edit2 size={14} /></button>
                                            <button className="settings-action-btn" onClick={() => handleDelete(a.id)}><Trash2 size={14} color="var(--danger)" /></button>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <span style={{ padding: '2px 6px', background: 'var(--bg-primary)', borderRadius: 4, fontSize: 11, textTransform: 'uppercase' }}>
                                                Pag: {a.responsavel_pag === 'nos' ? 'Agência' : 'Cliente'}
                                            </span>
                                            <span style={{ padding: '2px 6px', background: 'var(--bg-primary)', borderRadius: 4, fontSize: 11, textTransform: 'uppercase' }}>
                                                {a.status}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                <DollarSign size={14} /> R$ {a.valor_mensal?.toFixed(2).replace('.', ',') || '0,00'}
                                            </div>
                                            {a.data_vencimento && (
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', color: vencendo ? 'var(--warning)' : undefined }}>
                                                    <Calendar size={14} /> {new Date(a.data_vencimento).toLocaleDateString('pt-BR')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {a.observacoes && <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border-default)', paddingTop: 8 }}>Obs: {a.observacoes}</div>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Form */}
            <div style={{ width: 320, background: 'var(--bg-secondary)', padding: 20, borderRadius: 8, height: 'fit-content' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 14 }}>{editing ? 'Editar Assinatura' : 'Nova Assinatura'}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">Ferramenta *</label>
                        <input className="form-input" value={nomeFerramenta} onChange={e => setNomeFerramenta(e.target.value)} placeholder="Ex: Vercel, Figma" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Responsável</label>
                        <select className="form-input" value={responsavelPag} onChange={e => setResponsavelPag(e.target.value as any)}>
                            <option value="nos">Nós (Agência)</option>
                            <option value="cliente">Cliente</option>
                        </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Valor (R$)</label>
                            <input className="form-input" type="number" step="0.01" value={valorMensal} onChange={e => setValorMensal(e.target.value)} placeholder="0.00" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Status</label>
                            <select className="form-input" value={status} onChange={e => setStatus(e.target.value as any)}>
                                <option value="ativa">Ativa</option>
                                <option value="vencida">Vencida</option>
                                <option value="cancelada">Cancelada</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Data de Vencimento</label>
                        <input className="form-input" type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} />
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
        </div>
    );
}

function CustosTab({ clienteId, showToast, requestConfirm }: { clienteId: string, showToast: any, requestConfirm: (t: string, fn: () => void) => void }) {
    const { data: custos, loading, setData: setCustos } = useDiretorioCustos(clienteId);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<DiretorioCusto | null>(null);

    const [mesAno, setMesAno] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [servico, setServico] = useState('');
    const [descricao, setDescricao] = useState('');
    const [valor, setValor] = useState('');
    const [tipo, setTipo] = useState('');
    // origem is always "manual" for UI insertion
    const [origem, setOrigem] = useState<'manual' | 'api'>('manual');

    function openEdit(c: DiretorioCusto) {
        setEditing(c); setMesAno(c.mes_ano); setServico(c.servico);
        setDescricao(c.descricao || ''); setValor(c.valor?.toString() || '');
        setTipo(c.tipo || ''); setOrigem(c.origem);
    }

    function openNew() {
        setEditing(null);
        const d = new Date();
        setMesAno(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        setServico(''); setDescricao(''); setValor(''); setTipo(''); setOrigem('manual');
    }

    async function handleSave() {
        if (!servico.trim()) { showToast('Nome do serviço é obrigatório', 'error'); return; }
        if (!mesAno.match(/^\d{4}-\d{2}$/)) { showToast('Mês/Ano inválido (AAAA-MM)', 'error'); return; }

        setSaving(true);
        const payload: Omit<DiretorioCusto, 'id' | 'created_at'> = {
            cliente_id: clienteId,
            mes_ano: mesAno,
            servico: servico.trim(),
            descricao: descricao.trim() || undefined,
            valor: valor ? parseFloat(valor) : undefined,
            tipo: tipo.trim() || undefined,
            origem
        };
        try {
            if (editing) {
                const updated = await updateDiretorioCusto(editing.id, payload);
                setCustos(custos.map(c => c.id === editing.id ? updated : c));
                showToast('Custo atualizado');
            } else {
                const added = await addDiretorioCusto(payload);
                setCustos([...custos, added]);
                showToast('Custo adicionado');
            }
            openNew();
        } catch (e: any) {
            showToast('Erro: ' + (e.message || 'Erro inesperado'), 'error');
        }
        setSaving(false);
    }

    function handleDelete(id: string) {
        requestConfirm('Excluir este registro de custo?', async () => {
            try {
                await removeDiretorioCusto(id);
                setCustos(custos.filter(c => c.id !== id));
                showToast('Custo excluído');
            } catch (e) {
                showToast('Erro ao excluir', 'error');
            }
        });
    }

    // Calcular custo do mês atual para o KPI
    const d = new Date();
    const currentMesAno = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const custosMesAtual = custos.filter(c => c.mes_ano === currentMesAno);
    const totalMesAtual = custosMesAtual.reduce((acc, c) => acc + (c.valor || 0), 0);

    // Organizar custos agrupados por mês
    const agrupadosPorMes = custos.reduce((acc, c) => {
        if (!acc[c.mes_ano]) acc[c.mes_ano] = [];
        acc[c.mes_ano].push(c);
        return acc;
    }, {} as Record<string, DiretorioCusto[]>);

    // Ordenar os meses decrescentes
    const mesesOrdenados = Object.keys(agrupadosPorMes).sort((a, b) => b.localeCompare(a));

    return (
        <div style={{ display: 'flex', gap: 24 }}>
            {/* Lista */}
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h3 style={{ fontSize: 16 }}>Custos de Infraestrutura</h3>
                    <div style={{ background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500 }}>
                        Total no Mês Atual ({currentMesAno}): <span style={{ color: 'var(--brand-primary)' }}>R$ {totalMesAtual.toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>

                {loading ? <p>Carregando...</p> : custos.length === 0 ? <p className="template-empty" style={{ padding: 20 }}>Nenhum custo registrado</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {mesesOrdenados.map(mes => {
                            const custosNoMes = agrupadosPorMes[mes];
                            const somaMes = custosNoMes.reduce((acc, c) => acc + (c.valor || 0), 0);

                            // Parse para exibir mais agradável o mês ex: "Abril 2024" ou apenas "2024-04"
                            const [ano, mesTxt] = mes.split('-');
                            const nomeMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                            const displayMes = `${nomeMeses[parseInt(mesTxt) - 1]} ${ano}`;

                            return (
                                <div key={mes}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border-default)' }}>
                                        <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{displayMes}</h4>
                                        <span style={{ fontSize: 14, fontWeight: 600 }}>R$ {somaMes.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {custosNoMes.map(c => (
                                            <div key={c.id} style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <Server size={14} style={{ color: 'var(--text-muted)' }} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 500, fontSize: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
                                                            {c.servico}
                                                            {c.origem === 'api' && <span style={{ fontSize: 10, background: 'var(--brand-primary)', color: '#000', padding: '2px 4px', borderRadius: 4, fontWeight: 700 }}>AUTO</span>}
                                                        </div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                                            {c.tipo && <span>{c.tipo} • </span>}
                                                            {c.descricao}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 14 }}>R$ {c.valor?.toFixed(2).replace('.', ',') || '0,00'}</div>
                                                    {c.origem === 'manual' ? (
                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            <button className="settings-action-btn" onClick={() => openEdit(c)}><Edit2 size={14} /></button>
                                                            <button className="settings-action-btn" onClick={() => handleDelete(c.id)}><Trash2 size={14} color="var(--danger)" /></button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ width: 60, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>via API</div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Form */}
            <div style={{ width: 320, background: 'var(--bg-secondary)', padding: 20, borderRadius: 8, height: 'fit-content' }}>
                <h4 style={{ margin: '0 0 16px', fontSize: 14 }}>{editing ? 'Editar Custo' : 'Lançar Custo Manual'}</h4>
                {editing?.origem === 'api' ? (
                    <div className="template-empty" style={{ padding: 20 }}>Custos obtidos via API não podem ser editados manualmente.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Mês de Referência *</label>
                            <input className="form-input" type="month" value={mesAno} onChange={e => setMesAno(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Serviço / Provedor *</label>
                            <input className="form-input" value={servico} onChange={e => setServico(e.target.value)} placeholder="Ex: AWS, Vercel" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tipo de Recurso</label>
                            <input className="form-input" value={tipo} onChange={e => setTipo(e.target.value)} placeholder="Ex: Compute, Storage, Database" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Valor do Consumo (R$)</label>
                            <input className="form-input" type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} placeholder="0.00" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Descrição</label>
                            <textarea className="form-input" rows={2} value={descricao} onChange={e => setDescricao(e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            {editing && <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={openNew}>Cancelar</button>}
                            <button className="btn btn-primary" style={{ flex: 1, padding: '10px', borderRadius: '8px', boxShadow: '0 4px 12px 0 rgba(249, 115, 22, 0.2)' }} onClick={handleSave} disabled={saving}>{saving ? 'Salvo...' : 'Salvar'}</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
