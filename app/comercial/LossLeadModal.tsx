'use client';

import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { Deal } from '@/lib/types';
import { addLeadLossRecord, updateDeal } from '@/lib/hooks';

const LOSS_REASONS = [
    'Preço muito alto',
    'Cliente escolheu concorrente',
    'Falta de budget do cliente',
    'Timing inadequado',
    'Mudança de prioridades',
    'Falta de fit do produto',
    'Razão não especificada',
];

interface LossLeadModalProps {
    deal: Deal | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function LossLeadModal({ deal, isOpen, onClose, onSuccess }: LossLeadModalProps) {
    const [motivo, setMotivo] = useState('');
    const [descricao, setDescricao] = useState('');
    const [dataRetorno, setDataRetorno] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen || !deal) return null;

    async function handleSubmit() {
        if (!motivo) { setError('Selecione o motivo da perda.'); return; }
        if (!dataRetorno) { setError('Informe a data de retorno.'); return; }
        setError(null);
        setLoading(true);
        try {
            await addLeadLossRecord({
                deal_id: deal!.id,
                motivo_perda: motivo,
                descricao: descricao || undefined,
                data_retorno: dataRetorno,
                status: 'pendente',
                notificacoes_enviadas: 0,
            });
            await updateDeal(deal!.id, {
                stage: 'perdido',
                motivo_perda: motivo,
                data_entrada_etapa: new Date().toISOString(),
            });
            setMotivo('');
            setDescricao('');
            setDataRetorno('');
            onSuccess();
            onClose();
        } catch (e) {
            console.error(e);
            setError('Erro ao salvar. Tente novamente.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: 480 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={20} style={{ color: '#EF4444' }} />
                        <h3 style={{ margin: 0, fontSize: 18 }}>Marcar como Perdido</h3>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        style={{ background: 'transparent', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', opacity: loading ? 0.5 : 1 }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
                    Negócio: <strong style={{ color: 'var(--text-primary)' }}>{deal.company}</strong>
                </p>

                <div className="form-group" style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>
                        Motivo da Perda <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <select
                        className="form-select"
                        value={motivo}
                        onChange={e => setMotivo(e.target.value)}
                        disabled={loading}
                    >
                        <option value="">Selecione o motivo...</option>
                        {LOSS_REASONS.map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group" style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>
                        Descrição (opcional)
                    </label>
                    <textarea
                        className="form-input"
                        style={{ minHeight: 80, resize: 'vertical' }}
                        placeholder="Detalhes adicionais sobre a perda..."
                        value={descricao}
                        onChange={e => setDescricao(e.target.value)}
                        disabled={loading}
                    />
                </div>

                <div className="form-group" style={{ marginBottom: 20 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, display: 'block' }}>
                        Data de Retorno <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                        type="date"
                        className="form-input"
                        value={dataRetorno}
                        onChange={e => setDataRetorno(e.target.value)}
                        disabled={loading}
                    />
                </div>

                {error && (
                    <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</p>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                    <button
                        className="btn btn-secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        className="btn btn-primary"
                        style={{ background: '#EF4444', borderColor: '#EF4444' }}
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? 'Salvando...' : 'Confirmar Perda'}
                    </button>
                </div>
            </div>
        </div>
    );
}
