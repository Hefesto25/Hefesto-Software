'use client';

import { FunilConversaoRow } from '@/lib/types';
import {
  Funnel,
  FunnelChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';

interface GraficoFunilProps {
  dados: FunilConversaoRow[];
}

// Get CSS variable values dynamically
const getCSSVariable = (varName: string): string => {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '';
  }
  return '';
};

const COLORS = {
  prospeccao: 'rgb(var(--accent-rgb))',
  diagnostico: 'rgb(59, 130, 246)', // --accent-light fallback
  negociacao: 'rgb(var(--warning-rgb))',
  fechado: 'rgb(var(--success-rgb))',
  perdido: 'rgb(var(--danger-rgb))',
};

export function GraficoFunil({ dados }: GraficoFunilProps) {
  if (!dados || dados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)]">
        <div className="text-4xl mb-4 opacity-30 grayscale">📊</div>
        <p className="text-[var(--text-secondary)] font-medium tracking-wide">Sem dados para exibir</p>
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Nenhum deal registrado no período selecionado
        </p>
      </div>
    );
  }

  // Preparar dados para o gráfico
  const dadosGrafico = dados.map((stage) => ({
    name: stage.stage.charAt(0).toUpperCase() + stage.stage.slice(1),
    value: stage.quantidade,
    taxa: stage.taxa_conversao,
    stage: stage.stage,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="p-3 rounded-lg shadow-xl bg-[var(--surface-card)] border border-[var(--border-default)]">
          <p className="text-xs uppercase font-bold tracking-wider text-[var(--text-muted)] mb-1">
            {data.name}
          </p>
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {data.value} <span className="text-sm font-medium text-[var(--text-secondary)]">deals</span>
          </p>
          <p className="text-xs font-bold mt-1 text-[var(--success)]">
            {data.taxa.toFixed(1)}% de penetração
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full rounded-lg p-2 sm:p-6 bg-[var(--surface-card)] border border-[var(--border-default)] h-[500px]">
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(255,255,255,0.05)"
          />
          <XAxis
            dataKey="name"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
          <Funnel
            dataKey="value"
            data={dadosGrafico}
            isAnimationActive
          >
            {dadosGrafico.map((item, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  (COLORS as any)[item.stage] ||
                  'rgba(255,255,255,0.3)'
                }
              />
            ))}
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  );
}
