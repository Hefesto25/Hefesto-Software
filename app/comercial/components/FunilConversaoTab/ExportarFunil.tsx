import { FunilConversaoRow } from '@/lib/types';
import { Download, FileJson, FileText } from 'lucide-react';

interface ExportarFunilProps {
  dados: FunilConversaoRow[];
  periodo?: { dataInicio: string; dataFim: string };
}

export function ExportarFunil({ dados, periodo }: ExportarFunilProps) {
  const exportarCSV = () => {
    if (!dados || dados.length === 0) {
      alert('Sem dados para exportar');
      return;
    }

    const headers = [
      'Etapa',
      'Quantidade',
      'Valor Total',
      'Taxa Conversão (%)',
      'Dias Médio',
      'Responsáveis',
    ];

    const rows = dados.map((row) => [
      row.stage,
      row.quantidade,
      row.valor_total,
      row.taxa_conversao.toFixed(2),
      row.dias_medio ? Math.round(row.dias_medio) : '-',
      row.responsaveis ? row.responsaveis.join('; ') : '-',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const filename = periodo
      ? `funil_conversao_${new Date(periodo.dataInicio).toISOString().split('T')[0]}_${new Date(periodo.dataFim).toISOString().split('T')[0]}.csv`
      : `funil_conversao_${new Date().toISOString().split('T')[0]}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarJSON = () => {
    if (!dados || dados.length === 0) {
      alert('Sem dados para exportar');
      return;
    }

    const exportData = {
      periodo,
      dados,
      exportadoEm: new Date().toISOString(),
    };

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const filename = periodo
      ? `funil_conversao_${new Date(periodo.dataInicio).toISOString().split('T')[0]}_${new Date(periodo.dataFim).toISOString().split('T')[0]}.json`
      : `funil_conversao_${new Date().toISOString().split('T')[0]}.json`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 p-5 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl justify-between">
      <div>
        <h4 className="text-[10px] uppercase font-bold text-white/50 tracking-wider mb-1">
          Exportar Dados
        </h4>
        <p className="text-xs font-semibold text-white/70">
          Baixe a fotografia do funil nos formatos abaixo:
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={exportarCSV}
          disabled={!dados || dados.length === 0}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/20"
        >
          <FileText className="w-4 h-4" />
          CSV
        </button>
        <button
          onClick={exportarJSON}
          disabled={!dados || dados.length === 0}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
        >
          <FileJson className="w-4 h-4" />
          JSON
        </button>
      </div>
    </div>
  );
}
