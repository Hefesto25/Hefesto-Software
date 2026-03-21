'use client';

import { useState } from 'react';
import { Plus, X, Pencil, Archive, GripVertical, ChevronDown, ChevronUp } from 'lucide-react';
import { useTaskTemplates, addTaskTemplate, updateTaskTemplate, archiveTaskTemplate } from '@/lib/hooks';
import type { TaskTemplate } from '@/lib/types';

export default function TaskTemplatesPage() {
    const { data: templates, loading, refetch } = useTaskTemplates();

    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [formNome, setFormNome] = useState('');
    const [formDescricao, setFormDescricao] = useState('');
    const [formSubtarefas, setFormSubtarefas] = useState<string[]>(['']);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function openNew() {
        setEditingTemplate(null);
        setFormNome('');
        setFormDescricao('');
        setFormSubtarefas(['']);
        setError('');
        setShowModal(true);
    }

    function openEdit(t: TaskTemplate) {
        setEditingTemplate(t);
        setFormNome(t.nome);
        setFormDescricao(t.descricao ?? '');
        setFormSubtarefas(
            (t.subtarefas ?? []).sort((a, b) => a.ordem - b.ordem).map(s => s.titulo).concat([''])
        );
        setError('');
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        setEditingTemplate(null);
    }

    function addSubLine() {
        setFormSubtarefas(prev => [...prev, '']);
    }

    function updateSubLine(i: number, val: string) {
        setFormSubtarefas(prev => prev.map((s, idx) => idx === i ? val : s));
    }

    function removeSubLine(i: number) {
        setFormSubtarefas(prev => prev.filter((_, idx) => idx !== i));
    }

    async function handleSave() {
        setError('');
        if (!formNome.trim()) { setError('Informe o nome do template.'); return; }
        const subtarefas = formSubtarefas.filter(s => s.trim());
        setSaving(true);
        try {
            if (editingTemplate) {
                await updateTaskTemplate(editingTemplate.id, formNome.trim(), formDescricao.trim(), subtarefas);
            } else {
                await addTaskTemplate(formNome.trim(), formDescricao.trim(), subtarefas);
            }
            await refetch();
            closeModal();
        } catch (e) {
            setError('Erro ao salvar. Tente novamente.');
        } finally {
            setSaving(false);
        }
    }

    async function handleArchive(id: string) {
        if (!confirm('Arquivar este template? Ele não aparecerá mais no seletor de tarefas.')) return;
        await archiveTaskTemplate(id);
        await refetch();
    }

    return (
        <div style={{ padding: '32px 40px', maxWidth: 800, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Templates de Tarefas</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>
                        Crie tarefas padronizadas com sub-tarefas pré-definidas para usar no kanban operacional.
                    </p>
                </div>
                <button className="btn btn-primary" style={{ cursor: 'pointer' }} onClick={openNew}>
                    <Plus size={14} /> Novo Template
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Carregando...</div>
            ) : templates.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60, border: '1px dashed var(--border-default)', borderRadius: 12 }}>
                    Nenhum template criado ainda. Clique em "Novo Template" para começar.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {templates.map(t => {
                        const isExpanded = expandedId === t.id;
                        const subtarefas = (t.subtarefas ?? []).sort((a, b) => a.ordem - b.ordem);
                        return (
                            <div key={t.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-default)', borderRadius: 12, overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 12 }}>
                                    <GripVertical size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{t.nome}</div>
                                        {t.descricao && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.descricao}</div>}
                                    </div>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                                        {subtarefas.length} sub-tarefa{subtarefas.length !== 1 ? 's' : ''}
                                    </span>
                                    <button onClick={() => setExpandedId(isExpanded ? null : t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </button>
                                    <button onClick={() => openEdit(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} title="Editar">
                                        <Pencil size={14} />
                                    </button>
                                    <button onClick={() => handleArchive(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} title="Arquivar">
                                        <Archive size={14} />
                                    </button>
                                </div>
                                {isExpanded && subtarefas.length > 0 && (
                                    <div style={{ borderTop: '1px solid var(--border-default)', padding: '12px 16px 14px 44px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {subtarefas.map((s, i) => (
                                            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 11, width: 18, textAlign: 'right', flexShrink: 0 }}>{i + 1}.</span>
                                                {s.titulo}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal Criar/Editar Template */}
            {showModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingTemplate ? 'Editar Template' : 'Novo Template'}</h2>
                            <button className="modal-close" style={{ cursor: 'pointer' }} onClick={closeModal}><X size={16} /></button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label className="form-label">Nome do Template *</label>
                                <input type="text" className="form-input" value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="Ex: IA de Atendimento" />
                            </div>
                            <div>
                                <label className="form-label">Descrição</label>
                                <input type="text" className="form-input" value={formDescricao} onChange={e => setFormDescricao(e.target.value)} placeholder="Breve descrição do que este template representa" />
                            </div>
                            <div>
                                <label className="form-label">Sub-tarefas</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                    {formSubtarefas.map((s, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 18, textAlign: 'right', flexShrink: 0 }}>{i + 1}.</span>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={s}
                                                onChange={e => updateSubLine(i, e.target.value)}
                                                placeholder={`Sub-tarefa ${i + 1}...`}
                                                style={{ flex: 1 }}
                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubLine(); } }}
                                            />
                                            {formSubtarefas.length > 1 && (
                                                <button onClick={() => removeSubLine(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>×</button>
                                            )}
                                        </div>
                                    ))}
                                    <button onClick={addSubLine} style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--accent-light)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                        <Plus size={12} /> Adicionar sub-tarefa
                                    </button>
                                </div>
                            </div>
                            {error && <div style={{ color: '#EF4444', fontSize: 13, background: 'rgba(239,68,68,0.1)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>{error}</div>}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                                <button className="btn btn-secondary" style={{ cursor: 'pointer' }} onClick={closeModal}>Cancelar</button>
                                <button className="btn btn-primary" style={{ cursor: 'pointer' }} onClick={handleSave} disabled={saving}>
                                    {saving ? 'Salvando...' : editingTemplate ? 'Salvar Alterações' : 'Criar Template'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
