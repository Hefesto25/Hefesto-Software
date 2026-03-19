import { Deal } from '@/lib/types';
import { AlertCircle, Clock, ChevronRight } from 'lucide-react';

interface WidgetLeadsRetornoProps {
  vencidos: Deal[];
  proximos7d: Deal[];
  onViewFila: () => void;
}

export function WidgetLeadsRetorno({
  vencidos,
  proximos7d,
  onViewFila,
}: WidgetLeadsRetornoProps) {
  const totalUrgentes = vencidos.length + proximos7d.length;

  if (totalUrgentes === 0) {
    return (
      <div className="kpi-card flex flex-col items-center justify-center h-full min-h-[140px]">
        <AlertCircle className="w-6 h-6 text-muted mb-2" style={{ color: 'var(--text-muted)' }} />
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Nenhum lead em atraso</p>
      </div>
    );
  }

  const mostUrgent = [...vencidos, ...proximos7d].slice(0, 3);

  return (
    <div
      className="kpi-card group cursor-pointer transition-all h-full flex flex-col"
      onClick={onViewFila}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="kpi-card-icon red">
            <AlertCircle size={16} />
          </div>
          <div className="kpi-card-label uppercase text-xs tracking-wide">
            Leads para Retomar
          </div>
        </div>
        <div className={`kpi-trend ${totalUrgentes > 0 ? 'down' : 'up'} text-xs`}>
          {totalUrgentes} Pendentes
        </div>
      </div>

      {/* Urgency Indicator */}
      {vencidos.length > 0 && (
        <div className="mb-3 p-2 rounded bg-[var(--danger-muted)] border border-[rgba(239,68,68,0.15)]">
          <p className="text-xs font-bold text-[var(--danger)] text-center">
            ⚠️ {vencidos.length} LEAD(S) VENCIDO(S)
          </p>
        </div>
      )}

      {/* Most Urgent Leads */}
      <div className="space-y-2 mb-4">
        {mostUrgent.map((lead) => {
          const isOverdue = vencidos.some((v) => v.id === lead.id);
          const daysUntil = isOverdue
            ? 'Vencido'
            : `Em ${Math.ceil((new Date(lead.data_retorno || new Date()).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}d`;

          return (
            <div
              key={lead.id}
              className="p-2 rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] transition-colors"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate text-[var(--text-primary)]">
                    {lead.company}
                  </div>
                </div>
                <div className={`font-bold flex items-center gap-1 ${isOverdue ? 'text-[var(--danger)]' : 'text-[var(--warning)]'}`}>
                  <Clock size={10} /> {daysUntil}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-default)] mt-auto">
        <span className="text-xs font-medium text-[var(--text-muted)]">Fila Operacional</span>
        <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[var(--accent)] transform group-hover:translate-x-1 transition-transform">
          Resolver Agora <ChevronRight size={10} />
        </div>
      </div>
    </div>
  );
}
