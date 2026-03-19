import { Search, X } from 'lucide-react';

interface FiltrosFilaRetornoProps {
  motivos: string[];
  status: string[];
  filtroMotovoAtual: string;
  filtroStatusAtual: string;
  ordenacaoAtual: 'data' | 'urgencia';
  onMotivoChange: (motivo: string) => void;
  onStatusChange: (status: string) => void;
  onOrdenacaoChange: (ordenacao: 'data' | 'urgencia') => void;
}

export function FiltrosFilaRetorno({
  motivos,
  status,
  filtroMotovoAtual,
  filtroStatusAtual,
  ordenacaoAtual,
  onMotivoChange,
  onStatusChange,
  onOrdenacaoChange,
}: FiltrosFilaRetornoProps) {
  const temFiltros = filtroMotovoAtual || filtroStatusAtual;

  return (
    <div className="flex flex-col gap-4 p-5 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg shadow-sm">
      <div className="flex flex-col md:flex-row gap-4 items-end">

        {/* Filtro por motivo */}
        <div className="flex-1 w-full">
          <label className="block text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">
            Motivo da Perda
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder="Buscar motivo..."
              value={filtroMotovoAtual}
              onChange={(e) => onMotivoChange(e.target.value)}
              className="w-full pl-9 pr-9 py-2 border border-[var(--border-default)] rounded-lg text-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--border-hover)] transition-all"
            />
            {filtroMotovoAtual && (
              <button
                onClick={() => onMotivoChange('')}
                className="absolute right-3 top-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex-1 w-full">
          <label className="block text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">
            Status
          </label>
          <select
            value={filtroStatusAtual}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-hover)] transition-all appearance-none cursor-pointer"
          >
            <option value="">Todos</option>
            {status.map((s) => (
              <option key={s} value={s}>
                {s === 'ativo'
                  ? '✓ Ativo'
                  : s === 'agendado'
                    ? '📍 Agendado'
                    : s === 'concluído'
                      ? '✅ Concluído'
                      : s}
              </option>
            ))}
          </select>
        </div>

        {/* Ordenação */}
        <div className="flex-1 w-full">
          <label className="block text-xs uppercase tracking-wider font-bold text-[var(--text-muted)] mb-2">
            Ordenar por
          </label>
          <select
            value={ordenacaoAtual}
            onChange={(e) => onOrdenacaoChange(e.target.value as 'data' | 'urgencia')}
            className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-hover)] transition-all appearance-none cursor-pointer"
          >
            <option value="urgencia">📍 Mais Urgentes</option>
            <option value="data">📅 Mais Recentes</option>
          </select>
        </div>
      </div>

      {/* Filtros Ativos - Badge */}
      {temFiltros && (
        <div className="flex items-center justify-between p-3 bg-[var(--accent-muted)] border border-[rgba(59,130,246,0.2)] rounded-lg mt-2">
          <p className="text-xs text-[var(--accent-light)] font-medium">
            {filtroMotovoAtual && (
              <span>Motivo: "{filtroMotovoAtual}"</span>
            )}
            {filtroMotovoAtual && filtroStatusAtual && <span> • </span>}
            {filtroStatusAtual && <span>Status: "{filtroStatusAtual}"</span>}
          </p>
          <button
            onClick={() => {
              onMotivoChange('');
              onStatusChange('');
            }}
            className="text-xs uppercase tracking-wider font-bold text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  );
}
