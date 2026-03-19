import { Deal } from '@/lib/types';
import { Trash2, AlertCircle, Clock } from 'lucide-react';
import { useState } from 'react';

interface CardLeadRetornoProps {
  lead: Deal;
  onUpdate?: (leadId: string, data: Partial<Deal>) => void;
  onDelete?: (leadId: string) => void;
}

export function CardLeadRetorno({
  lead,
  onUpdate,
  onDelete,
}: CardLeadRetornoProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const dataRetorno = new Date(lead.data_retorno || new Date());
  const hoje = new Date();
  const diasRestantes = Math.ceil(
    (dataRetorno.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
  );

  const isVencido = diasRestantes < 0;
  const isProximo7d = diasRestantes >= 0 && diasRestantes <= 7;

  const cardClasses = isVencido
    ? 'border-l-4 border-l-[var(--danger)] bg-[var(--danger-muted)] hover:bg-[rgba(239,68,68,0.2)]'
    : isProximo7d
    ? 'border-l-4 border-l-[var(--warning)] bg-[var(--warning-muted)] hover:bg-[var(--bg-hover)]'
    : 'border-l-4 border-l-[var(--accent)] bg-[var(--accent-muted)] hover:bg-[var(--bg-hover)]';

  const badgeColor = isVencido
    ? 'text-[var(--danger)]'
    : isProximo7d
    ? 'text-[var(--warning)]'
    : 'text-[var(--accent)]';

  const BadgeIcon = isVencido ? AlertCircle : Clock;
  const badgeLabel = isVencido
    ? '⚠️ Vencido'
    : isProximo7d
    ? `📅 Em ${diasRestantes}d`
    : `🗓️ Em ${diasRestantes}d`;

  return (
    <div className={`p-4 rounded-lg border transition-all ${cardClasses}`}>
      <div className="flex items-start justify-between gap-4">
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <BadgeIcon className={`w-5 h-5 flex-shrink-0 ${badgeColor}`} />
            <span className={`text-xs font-bold uppercase tracking-wide ${badgeColor}`}>
              {badgeLabel}
            </span>
          </div>

          <div className="mb-3">
            <p className="text-sm font-semibold truncate text-[var(--text-primary)]">
              {lead.motivo_perda}
            </p>
            {lead.observacoes && (
              <p className="text-xs mt-1 line-clamp-2 text-[var(--text-muted)]">
                {lead.observacoes}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 items-center text-xs text-[var(--text-muted)]">
            <span>
              📅{' '}
              {dataRetorno.toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {onDelete && (
            <div className="relative">
              <button
                onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                title="Remover lead"
                className="p-2 rounded-lg border border-[var(--danger)] text-[var(--danger)] transition-colors hover:bg-[var(--danger-muted)]"
                aria-label="Remover este lead"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* Confirmar Exclusão */}
              {showDeleteConfirm && (
                <div className="absolute right-0 top-full mt-2 z-50 rounded-lg shadow-lg p-3 w-48 bg-[var(--surface-card)] border border-[var(--danger)]">
                  <p className="text-xs font-medium mb-3 text-[var(--text-primary)]">
                    Remover este lead?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onDelete(lead.id);
                        setShowDeleteConfirm(false);
                      }}
                      className="flex-1 px-3 py-1 rounded text-xs font-medium text-white bg-[var(--danger)] transition-opacity hover:opacity-80"
                      aria-label="Confirmar remoção"
                    >
                      Remover
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 px-3 py-1 border border-[var(--border-default)] rounded text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
                      aria-label="Cancelar remoção"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
