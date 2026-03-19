import { FunilConversaoRow } from '@/lib/types';
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';

interface WidgetTaxaConversaoProps {
  conversaoData: FunilConversaoRow[];
  periodo?: { dataInicio: string; dataFim: string };
  onViewFunil: () => void;
}

export function WidgetTaxaConversao({
  conversaoData,
  periodo,
  onViewFunil,
}: WidgetTaxaConversaoProps) {
  if (!conversaoData || conversaoData.length === 0) {
    return (
      <div className="kpi-card flex flex-col items-center justify-center h-full min-h-[140px]">
        <TrendingUp className="w-6 h-6 text-muted mb-2" style={{ color: 'var(--text-muted)' }} />
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Sem dados de funil</p>
      </div>
    );
  }

  const primeiroStage = conversaoData[0];
  const ultimoStage = conversaoData[conversaoData.length - 1];

  const taxaConversaoFinal = ultimoStage?.taxa_conversao || 0;
  const totalDeals = primeiroStage?.quantidade || 0;
  const totalValorFechado = conversaoData
    .filter((stage) => stage.stage === 'fechado')
    .reduce((sum, stage) => sum + stage.valor_total, 0);

  const isPositive = taxaConversaoFinal > 0;

  const STAGE_COLORS = {
    prospeccao: 'var(--accent)',
    diagnostico: '#60A5FA',
    negociacao: 'var(--warning)',
    fechado: 'var(--success)',
    perdido: 'var(--danger)',
  };

  return (
    <div
      className="kpi-card group cursor-pointer transition-all h-full"
      onClick={onViewFunil}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="kpi-card-label uppercase text-xs tracking-wide">
            Taxa de Conversão
          </div>
          <div className="text-xs mt-0.5 text-[var(--text-muted)]">
            {periodo
              ? `${new Date(periodo.dataInicio).toLocaleDateString('pt-BR', {
                  month: 'short',
                  year: 'numeric',
                })}`
              : 'Este mês'}
          </div>
        </div>
        <div className="kpi-card-icon blue">
          <TrendingUp size={16} />
        </div>
      </div>

      {/* Main Metric */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <div className="kpi-card-value text-2xl">
            {taxaConversaoFinal.toFixed(1)}%
          </div>
          <div className={`kpi-trend ${isPositive ? 'up' : 'down'} text-xs`}>
            {isPositive ? '+' : ''}{taxaConversaoFinal.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
          <div className="text-xs uppercase font-bold tracking-wider text-[var(--text-muted)]">
            Total Leads
          </div>
          <div className="text-sm font-bold mt-0.5 text-[var(--text-primary)]">
            {totalDeals}
          </div>
        </div>
        <div className="p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
          <div className="text-xs uppercase font-bold tracking-wider text-[var(--text-muted)]">
            Valor Fechado
          </div>
          <div className="text-sm font-bold mt-0.5 text-[var(--success)]">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(totalValorFechado)}
          </div>
        </div>
      </div>

      <div className="mb-4 space-y-1.5">
        <p className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider mb-2">
          Etapas Principais
        </p>
        {conversaoData.slice(0, 4).map((stage, idx) => {
          const color = (STAGE_COLORS as any)[stage.stage] || 'var(--accent)';
          return (
            <div key={stage.stage} className="flex items-center gap-2">
              <div className="w-16 text-xs font-medium text-[var(--text-secondary)] capitalize truncate">
                {stage.stage}
              </div>
              <div className="flex-1 h-1 rounded-full overflow-hidden bg-[var(--border-default)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(stage.quantidade / (totalDeals || 1), 1) * 100}%`,
                    background: color
                  }}
                />
              </div>
              <div className="text-right text-xs font-semibold w-6 text-[var(--text-primary)]">
                {stage.quantidade}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-default)] mt-auto">
        <span className="text-xs font-medium text-[var(--text-muted)]">Monitoramento de Funil</span>
        <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[var(--accent)] transform group-hover:translate-x-1 transition-transform">
          Ver Estatísticas <ChevronRight size={10} />
        </div>
      </div>
    </div>
  );
}
