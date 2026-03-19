import { FeedbackCRM } from '@/lib/types';
import { MessageSquare, ChevronRight } from 'lucide-react';

interface WidgetFeedbacksRecentesProps {
  feedbacks: FeedbackCRM[];
  onViewFeedbacks?: () => void;
}

export function WidgetFeedbacksRecentes({
  feedbacks,
  onViewFeedbacks,
}: WidgetFeedbacksRecentesProps) {
  if (!feedbacks || feedbacks.length === 0) {
    return (
      <div className="kpi-card flex flex-col items-center justify-center h-full min-h-[140px]">
        <MessageSquare className="w-6 h-6 text-muted mb-2" style={{ color: 'var(--text-muted)' }} />
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Sem feedbacks recentes</p>
      </div>
    );
  }

  const recentFeedbacks = feedbacks
    .sort(
      (a, b) =>
        new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    )
    .slice(0, 3);

  const getEmoji = (type: string) => {
    switch (type) {
      case 'Elogio':
        return '😊';
      case 'Sugestão':
        return '⚠️';
      case 'Reclamação':
        return '😞';
      default:
        return '💬';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Elogio':
        return 'bg-[var(--success-muted)] border-[rgba(16,185,129,0.2)]';
      case 'Sugestão':
        return 'bg-[var(--warning-muted)] border-[rgba(245,158,11,0.2)]';
      case 'Reclamação':
        return 'bg-[var(--danger-muted)] border-[rgba(239,68,68,0.2)]';
      default:
        return 'bg-[var(--bg-tertiary)] border-[var(--border-default)]';
    }
  };

  const getTypeTextColor = (type: string) => {
    switch (type) {
      case 'Elogio':
        return 'text-[var(--success)]';
      case 'Sugestão':
        return 'text-[var(--warning)]';
      case 'Reclamação':
        return 'text-[var(--danger)]';
      default:
        return 'text-[var(--text-muted)]';
    }
  };

  return (
    <div className="kpi-card group cursor-pointer transition-all h-full flex flex-col" onClick={onViewFeedbacks}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="kpi-card-icon blue">
            <MessageSquare size={16} />
          </div>
          <div className="kpi-card-label uppercase text-xs tracking-wide">
            Pulse de Clientes
          </div>
        </div>
        <div className="kpi-trend up text-xs">
          {feedbacks.length} Feedback{feedbacks.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Feedback Items */}
      <div className="space-y-2 mb-4">
        {recentFeedbacks.map((feedback) => (
          <div
            key={feedback.id}
            className="p-2 rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className="text-sm">{getEmoji(feedback.type || 'Elogio')}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold uppercase tracking-wider ${getTypeTextColor(feedback.type || 'Elogio')}`}>
                    {feedback.type}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">
                    {feedback.date ? new Date(feedback.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''}
                  </span>
                </div>
                <div className="text-sm font-semibold truncate text-[var(--text-primary)]">
                  {feedback.author_name || 'Usuário'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-default)] mt-auto">
        <span className="text-xs font-medium text-[var(--text-muted)]">Relacionamento</span>
        <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[var(--accent)] transform group-hover:translate-x-1 transition-transform">
          Ver Todos <ChevronRight size={10} />
        </div>
      </div>
    </div>
  );
}
