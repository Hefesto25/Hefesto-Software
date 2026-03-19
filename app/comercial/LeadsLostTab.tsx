'use client';

import { useEffect, useState } from 'react';
import type { Deal, LeadLossRecord } from '@/lib/types';
import { getLeadLossRecordByDealId } from '@/lib/hooks';

interface LeadsLostTabProps {
    deals: Deal[];
    onRetomar: (dealId: string, recordId: string) => void;
}

const STATUS_BADGE: Record<string, { label: string; bg: string; color: string }> = {
    pendente:   { label: 'Pendente',   bg: 'rgba(245,158,11,0.15)',  color: '#F59E0B' },
    retomado:   { label: 'Retomado',   bg: 'rgba(16,185,129,0.15)',  color: '#10B981' },
    descartado: { label: 'Descartado', bg: 'rgba(156,163,175,0.15)', color: '#9CA3AF' },
};

function formatDate(dateStr: string) {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

export default function LeadsLostTab({ deals, onRetomar }: LeadsLostTabProps) {
    const lostDeals = deals.filter(d => d.stage === 'perdido');
    const [records, setRecords] = useState<Record<string, LeadLossRecord | null>>({});

    useEffect(() => {
        async function loadRecords() {
            const results: Record<string, LeadLossRecord | null> = {};
            await Promise.all(
                lostDeals.map(async (deal) => {
                    try {
                        results[deal.id] = await getLeadLossRecordByDealId(deal.id);
                    } catch {
                        results[deal.id] = null;
                    }
                })
            );
            setRecords(results);
        }
        if (lostDeals.length > 0) loadRecords();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deals]);

    if (lostDeals.length === 0) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '64px 24px', color: 'var(--text-muted)', gap: 12
            }}>
                <span style={{ fontSize: 40 }}>✅</span>
                <p style={{ fontSize: 15, margin: 0 }}>Nenhum lead perdido no momento.</p>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Leads Perdidos
                </h2>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {lostDeals.length} negócio{lostDeals.length !== 1 ? 's' : ''}
                </span>
            </div>

            {lostDeals.map(deal => {
                const record = records[deal.id];
                const badge = record ? STATUS_BADGE[record.status] : STATUS_BADGE['pendente'];

                return (
                    <div
                        key={deal.id}
                        style={{
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 12,
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 16,
                            flexWrap: 'wrap',
                        }}
                    >
                        {/* Company */}
                        <div style={{ flex: 1, minWidth: 160 }}>
                            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
                                {deal.company}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                {deal.assignee || 'Sem responsável'}
                            </div>
                        </div>

                        {/* Loss reason */}
                        <div style={{ minWidth: 180 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Motivo</div>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                                {record?.motivo_perda || deal.motivo_perda || '—'}
                            </div>
                        </div>

                        {/* Return date */}
                        <div style={{ minWidth: 120 }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Data de Retorno</div>
                            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                                {record?.data_retorno ? formatDate(record.data_retorno) : '—'}
                            </div>
                        </div>

                        {/* Status badge */}
                        <div>
                            <span style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: 20,
                                fontSize: 12,
                                fontWeight: 500,
                                background: badge.bg,
                                color: badge.color,
                            }}>
                                {badge.label}
                            </span>
                        </div>

                        {/* Actions */}
                        <div>
                            {record && record.status === 'pendente' && (
                                <button
                                    className="btn btn-primary"
                                    style={{ fontSize: 13, padding: '6px 16px' }}
                                    onClick={() => onRetomar(deal.id, record.id)}
                                >
                                    Retomar
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
