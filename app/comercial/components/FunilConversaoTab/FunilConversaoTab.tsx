import { useState, useMemo } from 'react';
import { FunilConversaoRow } from '@/lib/types';
import { SeletorPeriodo } from './SeletorPeriodo';
import { GraficoFunil } from './GraficoFunil';
import { TabelaConversao } from './TabelaConversao';
import { ExportarFunil } from './ExportarFunil';

interface FunilConversaoTabProps {
  conversaoData: FunilConversaoRow[];
}

export function FunilConversaoTab({ conversaoData }: FunilConversaoTabProps) {
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

  const [dataInicio, setDataInicio] = useState(
    inicioMes.toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState(
    hoje.toISOString().split('T')[0]
  );

  const dadosFiltrados = useMemo(() => {
    // Se houver dados já filtrados, usar como estão
    // Se precisar filtrar por datas, fazer aqui
    return conversaoData || [];
  }, [conversaoData, dataInicio, dataFim]);

  return (
    <div className="flex flex-col gap-6">
      {/* Seletor de Período */}
      <SeletorPeriodo
        dataInicio={dataInicio}
        dataFim={dataFim}
        onChangeDataInicio={setDataInicio}
        onChangeDataFim={setDataFim}
      />

      {/* Resumo Rápido */}
      {dadosFiltrados.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="kpi-card">
            <div className="kpi-card-value text-[var(--accent)]">
              {dadosFiltrados.reduce((sum, stage) => sum + stage.quantidade, 0)}
            </div>
            <div className="kpi-card-label">Total de Deals</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-value text-[var(--success)]">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact',
                maximumFractionDigits: 0,
              }).format(
                dadosFiltrados.reduce((sum, stage) => sum + stage.valor_total, 0)
              )}
            </div>
            <div className="kpi-card-label">Valor Total</div>
          </div>

          <div className="kpi-card">
            <div className="kpi-card-value text-[var(--accent)]">
              {dadosFiltrados.length > 0
                ? dadosFiltrados[dadosFiltrados.length - 1].taxa_conversao.toFixed(1)
                : '0'}%
            </div>
            <div className="kpi-card-label">Taxa de Conversão</div>
          </div>
        </div>
      )}

      {/* Gráfico Funil */}
      <div>
        <h3 className="chart-title mb-4">Visualização do Funil</h3>
        <GraficoFunil dados={dadosFiltrados} />
      </div>

      {/* Tabela Detalhada */}
      <div>
        <h3 className="chart-title mb-4">Análise Detalhada por Etapa</h3>
        <TabelaConversao dados={dadosFiltrados} />
      </div>

      {/* Exportar */}
      <ExportarFunil
        dados={dadosFiltrados}
        periodo={{ dataInicio, dataFim }}
      />
    </div>
  );
}
