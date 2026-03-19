import { FunilConversaoRow } from '@/lib/types';

interface TabelaConversaoProps {
  dados: FunilConversaoRow[];
}

export function TabelaConversao({ dados }: TabelaConversaoProps) {
  if (!dados || dados.length === 0) {
    return null;
  }

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      prospeccao: '🎯 Prospecção',
      diagnostico: '🔍 Diagnóstico',
      negociacao: '💬 Negociação',
      fechado: '✅ Fechado',
      perdido: '❌ Perdido',
    };
    return labels[stage] || stage;
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      prospeccao: 'bg-[var(--accent-muted)] border-[rgba(59,130,246,0.2)] text-[var(--accent)]',
      diagnostico: 'bg-[var(--accent-muted)] border-[rgba(59,130,246,0.2)] text-[var(--accent-light)]',
      negociacao: 'bg-[var(--warning-muted)] border-[rgba(245,158,11,0.2)] text-[var(--warning)]',
      fechado: 'bg-[var(--success-muted)] border-[rgba(16,185,129,0.2)] text-[var(--success)]',
      perdido: 'bg-[var(--danger-muted)] border-[rgba(239,68,68,0.2)] text-[var(--danger)]',
    };
    return colors[stage] || 'bg-[var(--bg-tertiary)] border-[var(--border-default)] text-[var(--text-muted)]';
  };

  const totalDeals = dados.reduce((sum, stage) => sum + stage.quantidade, 0);
  const totalValor = dados.reduce((sum, stage) => sum + stage.valor_total, 0);

  return (
    <div className="w-full overflow-x-auto border border-[var(--border-default)] rounded-lg bg-[var(--surface-card)] shadow-sm">
      <table className="w-full text-left">
        <thead className="bg-[var(--bg-secondary)] border-b border-[var(--border-default)]">
          <tr>
            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Etapa
            </th>
            <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Deals
            </th>
            <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] w-32">
              Conversão
            </th>
            <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Valor Total
            </th>
            <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Taxa C.
            </th>
            <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Ciclo Médio
            </th>
            <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Responsáveis
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-default)]">
          {dados.map((row, idx) => {
            const percentualTotal = (row.quantidade / totalDeals) * 100;

            return (
              <tr
                key={row.stage}
                className="hover:bg-[var(--bg-hover)] transition-colors"
              >
                {/* Etapa */}
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${getStageColor(row.stage)}`}>
                    {getStageLabel(row.stage)}
                  </span>
                </td>

                {/* Quantidade */}
                <td className="px-4 py-4 text-center text-sm font-bold text-[var(--text-primary)]">
                  {row.quantidade}
                </td>

                {/* % do Total */}
                <td className="px-4 py-4 text-center">
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex-1 h-1.5 bg-[var(--border-default)] rounded-full relative overflow-hidden">
                      <div
                        className="absolute left-0 top-0 h-full bg-[var(--accent)] transition-all rounded-full opacity-70"
                        style={{ width: `${percentualTotal}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-muted)] w-8 text-right">
                      {percentualTotal.toFixed(0)}%
                    </span>
                  </div>
                </td>

                {/* Valor Total */}
                <td className="px-6 py-4 text-right text-sm font-semibold text-[var(--success)]">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    notation: 'compact',
                  }).format(row.valor_total)}
                </td>

                {/* Taxa Conversão */}
                <td className="px-4 py-4 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs uppercase tracking-wider font-bold ${
                      row.taxa_conversao > 50
                        ? 'bg-[var(--success-muted)] text-[var(--success)]'
                        : row.taxa_conversao > 25
                          ? 'bg-[var(--warning-muted)] text-[var(--warning)]'
                          : 'bg-[var(--danger-muted)] text-[var(--danger)]'
                    }`}
                  >
                    {row.taxa_conversao.toFixed(1)}%
                  </span>
                </td>

                {/* Dias Médio */}
                <td className="px-4 py-4 text-center text-sm font-semibold text-[var(--text-secondary)]">
                  {row.dias_medio ? `${Math.round(row.dias_medio)}D` : '-'}
                </td>

                {/* Responsáveis */}
                <td className="px-4 py-4 text-center text-xs">
                  {row.responsaveis && row.responsaveis.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {row.responsaveis.slice(0, 2).map((resp) => (
                        <span
                          key={resp}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-secondary)]"
                          title={resp}
                        >
                          {resp.substring(0, 8)}
                        </span>
                      ))}
                      {row.responsaveis.length > 2 && (
                        <span className="text-xs font-bold text-[var(--text-muted)] ml-1">
                          +{row.responsaveis.length - 2}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[var(--text-muted)]">-</span>
                  )}
                </td>
              </tr>
            );
          })}

          {/* Linha Total */}
          <tr className="bg-[var(--bg-secondary)] font-bold text-[var(--text-primary)] border-t border-[var(--border-default)]">
            <td className="px-6 py-4 text-xs uppercase tracking-wider text-[var(--text-muted)]">Total</td>
            <td className="px-4 py-4 text-center">{totalDeals}</td>
            <td className="px-4 py-4 text-center text-[var(--text-muted)] text-xs">-</td>
            <td className="px-6 py-4 text-right text-[var(--success)]">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact',
              }).format(totalValor)}
            </td>
            <td className="px-4 py-4 text-center text-[var(--text-muted)]">-</td>
            <td className="px-4 py-4 text-center text-[var(--text-muted)]">-</td>
            <td className="px-4 py-4 text-center text-[var(--text-muted)]">-</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
