import { FeedbackCRM } from '@/lib/types';

interface BadgeFeedbackProps {
  clientId: string;
  feedbacks: FeedbackCRM[];
  onOpenFeedbacksTab?: () => void;
}

export function BadgeFeedback({
  clientId,
  feedbacks,
  onOpenFeedbacksTab,
}: BadgeFeedbackProps) {
  const clientFeedbacks = feedbacks.filter((f) => f.client_id === clientId);
  const elogios = clientFeedbacks.filter((f) => f.type === 'Elogio').length;
  const sugestoes = clientFeedbacks.filter((f) => f.type === 'Sugestão').length;
  const reclamacoes = clientFeedbacks.filter((f) => f.type === 'Reclamação')
    .length;

  if (clientFeedbacks.length === 0) {
    return null;
  }

  const handleClick = () => {
    if (onOpenFeedbacksTab) {
      onOpenFeedbacksTab();
    }
  };

  const badgeClass = (hasItems: boolean, type: 'success' | 'warning' | 'danger') => {
    const baseClass = 'px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-all duration-250 select-none border border-transparent hover:scale-105';

    if (type === 'success') {
      return hasItems
        ? `${baseClass} bg-[var(--success-muted)] text-[var(--success)] hover:bg-[rgba(16,185,129,0.25)]`
        : `${baseClass} bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]`;
    }
    if (type === 'warning') {
      return hasItems
        ? `${baseClass} bg-[var(--warning-muted)] text-[var(--warning)] hover:bg-[rgba(245,158,11,0.25)]`
        : `${baseClass} bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]`;
    }
    // danger
    return hasItems
      ? `${baseClass} bg-[var(--danger-muted)] text-[var(--danger)] hover:bg-[rgba(239,68,68,0.25)]`
      : `${baseClass} bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-[var(--bg-hover)]`;
  };

  return (
    <div className="flex gap-2 items-center">
      {/* Mini-card Elogios (Success) */}
      <button
        onClick={handleClick}
        className={badgeClass(elogios > 0, 'success')}
        role="button"
        tabIndex={0}
        aria-label={`${elogios} elogio${elogios !== 1 ? 's' : ''}`}
      >
        <span aria-hidden="true">😊</span>
        <span>{elogios}</span>
      </button>

      {/* Mini-card Sugestões (Warning) */}
      <button
        onClick={handleClick}
        className={badgeClass(sugestoes > 0, 'warning')}
        role="button"
        tabIndex={0}
        aria-label={`${sugestoes} sugestão${sugestoes !== 1 ? 's' : ''}`}
      >
        <span aria-hidden="true">⚠️</span>
        <span>{sugestoes}</span>
      </button>

      {/* Mini-card Reclamações (Danger) */}
      <button
        onClick={handleClick}
        className={badgeClass(reclamacoes > 0, 'danger')}
        role="button"
        tabIndex={0}
        aria-label={`${reclamacoes} reclamação${reclamacoes !== 1 ? 's' : ''}`}
      >
        <span aria-hidden="true">😞</span>
        <span>{reclamacoes}</span>
      </button>
    </div>
  );
}
