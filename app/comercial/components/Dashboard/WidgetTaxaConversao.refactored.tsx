'use client';

import { FunilConversaoRow } from '@/lib/types';
import { TrendingUp, ChevronRight } from 'lucide-react';
import { Card, CardBody, Button, Badge } from '@/components/ui';

interface WidgetTaxaConversaoProps {
  conversaoData: FunilConversaoRow[];
  periodo?: { dataInicio: string; dataFim: string };
  onViewFunil: () => void;
}

export function WidgetTaxaConversaoRefactored({
  conversaoData,
  periodo,
  onViewFunil,
}: WidgetTaxaConversaoProps) {
  if (!conversaoData || conversaoData.length === 0) {
    return (
      <Card variant="elevated" className="h-full min-h-[320px] flex flex-col items-center justify-center">
        <TrendingUp className="w-8 h-8 text-[var(--text-muted)] mb-3" />
        <p className="text-sm font-medium text-[var(--text-muted)]">Sem dados de funil</p>
      </Card>
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
    prospeccao: 'var(--primary)',
    diagnostico: '#60A5FA',
    negociacao: 'var(--warning)',
    fechado: 'var(--success)',
    perdido: 'var(--danger)',
  };

  return (
    <Card
      variant="elevated"
      hover
      interactive
      onClick={onViewFunil}
      className="h-full flex flex-col cursor-pointer group"
    >
      <CardBody className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="text-xs uppercase font-semibold tracking-widest text-[var(--text-muted)] mb-1">
              Taxa de Conversão
            </div>
            {periodo && (
              <div className="text-xs text-[var(--text-muted)]">
                {new Date(periodo.dataInicio).toLocaleDateString('pt-BR', {
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            )}
          </div>
          <div className="ml-3 p-2 rounded-lg bg-[var(--primary-muted)] text-[var(--primary)]">
            <TrendingUp size={20} className="w-5 h-5" />
          </div>
        </div>

        {/* Main Metric */}
        <div className="mb-6">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-[var(--text-primary)]">
              {taxaConversaoFinal.toFixed(1)}%
            </span>
            <Badge
              variant={isPositive ? 'success' : 'danger'}
              size="sm"
            >
              {isPositive ? '↑' : '↓'} {Math.abs(taxaConversaoFinal).toFixed(1)}%
            </Badge>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-[var(--text-muted)] mb-1">
              Total Leads
            </div>
            <div className="text-xl font-bold text-[var(--text-primary)]">
              {totalDeals}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-[var(--text-muted)] mb-1">
              Valor Fechado
            </div>
            <div className="text-xl font-bold text-[var(--success)]">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(totalValorFechado)}
            </div>
          </div>
        </div>

        {/* Stage Progress Bars */}
        <div className="space-y-3 mb-6">
          <p className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider">
            Etapas Principais
          </p>
          {conversaoData.slice(0, 4).map((stage) => {
            const color = (STAGE_COLORS as any)[stage.stage] || 'var(--primary)';
            const percentage = Math.min(stage.quantidade / (totalDeals || 1), 1) * 100;
            return (
              <div key={stage.stage} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-[var(--text-secondary)] capitalize">
                    {stage.stage}
                  </div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">
                    {stage.quantidade}
                  </div>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden bg-[var(--bg-tertiary)]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      background: color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer CTA */}
        <div className="mt-auto pt-4 border-t border-[var(--border-default)]">
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            onClick={onViewFunil}
            className="justify-between group"
          >
            <span className="text-xs font-medium">Ver Estatísticas Completas</span>
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
