import { useState, useMemo } from 'react';
import { Deal } from '@/lib/types';
import { CardLeadRetorno } from './CardLeadRetorno';
import { FiltrosFilaRetorno } from './FiltrosFilaRetorno';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FilaRetornoTabProps {
  leads: Deal[];
  onUpdateLead?: (leadId: string, data: Partial<Deal>) => void;
  onDeleteLead?: (leadId: string) => void;
}

export function FilaRetornoTab({
  leads,
  onUpdateLead,
  onDeleteLead,
}: FilaRetornoTabProps) {
  const [filtroMotivo, setFiltroMotivo] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [ordenacao, setOrdenacao] = useState<'data' | 'urgencia'>('urgencia');
  const [paginaAtual, setPaginaAtual] = useState(1);

  const itensPorPagina = 10;

  const leadsFiltrados = useMemo(() => {
    let resultado = [...leads];

    if (filtroMotivo) {
      resultado = resultado.filter((lead) =>
        (lead.motivo_perda || '').toLowerCase().includes(filtroMotivo.toLowerCase())
      );
    }

    // Ordenação
    if (ordenacao === 'urgencia') {
      resultado.sort((a, b) => {
        const dataA = new Date(a.data_retorno || new Date()).getTime();
        const dataB = new Date(b.data_retorno || new Date()).getTime();
        return dataA - dataB; // Mais próximas primeiro
      });
    } else {
      resultado.sort((a, b) => {
        const dataA = new Date(a.data_retorno || new Date()).getTime();
        const dataB = new Date(b.data_retorno || new Date()).getTime();
        return dataB - dataA; // Mais recentes primeiro
      });
    }

    return resultado;
  }, [leads, filtroMotivo, ordenacao]);

  const totalPaginas = Math.ceil(leadsFiltrados.length / itensPorPagina);
  const leadsExibidos = leadsFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  const motivosUnicos = Array.from(new Set(leads.map((l) => l.motivo_perda).filter(Boolean) as string[]));

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros */}
      <FiltrosFilaRetorno
        motivos={motivosUnicos}
        status={[]}
        filtroMotovoAtual={filtroMotivo}
        filtroStatusAtual={filtroStatus}
        ordenacaoAtual={ordenacao}
        onMotivoChange={setFiltroMotivo}
        onStatusChange={() => {}}
        onOrdenacaoChange={setOrdenacao}
      />

      {/* Resumo */}
      <div className="flex items-center justify-between border-b border-[var(--border-default)] pb-4 px-2">
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          Exibindo <span className="font-bold text-[var(--text-primary)]">{leadsExibidos.length}</span> de{' '}
          <span className="font-bold text-[var(--text-primary)]">{leadsFiltrados.length}</span> resultados
        </p>
        <p className="text-xs uppercase tracking-wider font-bold text-[var(--text-muted)]">
          Total BDD: <span className="text-[var(--text-secondary)]">{leads.length}</span>
        </p>
      </div>

      {/* Lista de Leads */}
      {leadsExibidos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {leadsExibidos.map((lead) => (
            <CardLeadRetorno
              key={lead.id}
              lead={lead}
              onUpdate={onUpdateLead}
              onDelete={onDeleteLead}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)]">
          <div className="text-4xl mb-4 opacity-50 grayscale">📭</div>
          <p className="text-[var(--text-secondary)] font-medium tracking-wide">Nenhum lead encontrado na fila</p>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            {filtroMotivo || filtroStatus
              ? 'Tente remover algum filtro no topo.'
              : 'Você não tem retornos pendentes ou agendados.'}
          </p>
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border-default)] pt-4 mt-4">
          <p className="text-xs text-[var(--text-secondary)]">
            Página <span className="font-bold text-[var(--text-primary)]">{paginaAtual}</span> de{' '}
            <span className="font-bold text-[var(--text-primary)]">{totalPaginas}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPaginaAtual(Math.max(1, paginaAtual - 1))}
              disabled={paginaAtual === 1}
              className="p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                setPaginaAtual(Math.min(totalPaginas, paginaAtual + 1))
              }
              disabled={paginaAtual === totalPaginas}
              className="p-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
