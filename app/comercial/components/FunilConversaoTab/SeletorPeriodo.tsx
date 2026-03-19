import { useState } from 'react';
import { Calendar, X } from 'lucide-react';

interface SeletorPeriodoProps {
  dataInicio: string;
  dataFim: string;
  onChangeDataInicio: (data: string) => void;
  onChangeDataFim: (data: string) => void;
  onPresete?: (preset: 'mes' | 'trimestre' | 'semestre' | 'ano') => void;
}

export function SeletorPeriodo({
  dataInicio,
  dataFim,
  onChangeDataInicio,
  onChangeDataFim,
  onPresete,
}: SeletorPeriodoProps) {
  const [mostrarPersonalizado, setMostrarPersonalizado] = useState(false);

  const aplicarPreset = (preset: 'mes' | 'trimestre' | 'semestre' | 'ano') => {
    const hoje = new Date();
    let inicio = new Date();

    switch (preset) {
      case 'mes':
        inicio.setMonth(hoje.getMonth());
        inicio.setDate(1);
        break;
      case 'trimestre':
        const trimestre = Math.floor(hoje.getMonth() / 3);
        inicio.setMonth(trimestre * 3);
        inicio.setDate(1);
        break;
      case 'semestre':
        const semestre = Math.floor(hoje.getMonth() / 6);
        inicio.setMonth(semestre * 6);
        inicio.setDate(1);
        break;
      case 'ano':
        inicio.setFullYear(hoje.getFullYear());
        inicio.setMonth(0);
        inicio.setDate(1);
        break;
    }

    const formatoData = (data: Date) => data.toISOString().split('T')[0];
    onChangeDataInicio(formatoData(inicio));
    onChangeDataFim(formatoData(hoje));
    onPresete?.(preset);
    setMostrarPersonalizado(false);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getDescricaoPreset = () => {
    const hoje = new Date();
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    // Check mês
    if (
      inicio.getMonth() === hoje.getMonth() &&
      inicio.getFullYear() === hoje.getFullYear() &&
      inicio.getDate() === 1
    ) {
      return 'Este mês';
    }

    // Check trimestre
    const trimestre = Math.floor(hoje.getMonth() / 3);
    if (
      inicio.getMonth() === trimestre * 3 &&
      inicio.getFullYear() === hoje.getFullYear() &&
      inicio.getDate() === 1
    ) {
      return 'Este trimestre';
    }

    // Check semestre
    const semestre = Math.floor(hoje.getMonth() / 6);
    if (
      inicio.getMonth() === semestre * 6 &&
      inicio.getFullYear() === hoje.getFullYear() &&
      inicio.getDate() === 1
    ) {
      return 'Este semestre';
    }

    // Check ano
    if (
      inicio.getMonth() === 0 &&
      inicio.getFullYear() === hoje.getFullYear() &&
      inicio.getDate() === 1
    ) {
      return 'Este ano';
    }

    return 'Período customizado';
  };

  return (
    <div className="flex flex-col gap-5 p-5 bg-[var(--surface-card)] border border-[var(--border-default)] rounded-lg shadow-sm">
      {/* Presets */}
      <div>
        <label className="block text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider mb-3">
          Período Rápido
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => aplicarPreset('mes')}
            className="px-3 py-2 text-xs font-semibold rounded-lg transition-all bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            Mês Atual
          </button>
          <button
            onClick={() => aplicarPreset('trimestre')}
            className="px-3 py-2 text-xs font-semibold rounded-lg transition-all bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            Trimestre
          </button>
          <button
            onClick={() => aplicarPreset('semestre')}
            className="px-3 py-2 text-xs font-semibold rounded-lg transition-all bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            Semestre
          </button>
          <button
            onClick={() => aplicarPreset('ano')}
            className="px-3 py-2 text-xs font-semibold rounded-lg transition-all bg-[var(--bg-tertiary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          >
            Ano Atual
          </button>
        </div>
      </div>

      {/* Período Selecionado */}
      <div className="p-4 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider">Período Ativo</p>
          <p className="text-sm font-bold text-[var(--success)] mt-1">
            {getDescricaoPreset()}
          </p>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-semibold">
            {formatarData(dataInicio)} <span className="text-[var(--text-muted)] mx-1">até</span> {formatarData(dataFim)}
          </p>
        </div>
        <button
          onClick={() => setMostrarPersonalizado(!mostrarPersonalizado)}
          className="flex items-center justify-center p-2 text-[var(--text-secondary)] bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all focus:outline-none"
          title="Filtro Customizado"
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>

      {/* Customizado */}
      {mostrarPersonalizado && (
        <div className="border-t border-[var(--border-default)] pt-5 mt-1">
          <label className="block text-xs uppercase font-bold text-[var(--text-muted)] tracking-wider mb-3">
            Datas Específicas
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5 pl-1">De</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => onChangeDataInicio(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-hover)] [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5 pl-1">Até</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => onChangeDataFim(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-[var(--border-default)] rounded-lg text-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--border-hover)] [color-scheme:dark]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
