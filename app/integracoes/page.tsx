'use client';

import { Check, ExternalLink } from 'lucide-react';

const integrations = [
    {
        name: 'Google Drive',
        icon: '📁',
        desc: 'Acesse e gerencie arquivos do Drive',
        connected: true,
        bg: 'rgba(66, 133, 244, 0.1)',
        features: ['Listar arquivos e pastas', 'Upload de documentos', 'Compartilhar com a equipe', 'Busca avançada'],
        files: [
            { name: 'Proposta Comercial - TechCorp.pdf', modified: '18 Fev 2026', size: '2.4 MB' },
            { name: 'Contrato - InovaHub.docx', modified: '17 Fev 2026', size: '1.1 MB' },
            { name: 'Relatório Q4 2025.xlsx', modified: '15 Fev 2026', size: '4.8 MB' },
        ],
    },
    {
        name: 'Google Docs',
        icon: '📝',
        desc: 'Crie e edite documentos colaborativos',
        connected: true,
        bg: 'rgba(66, 133, 244, 0.1)',
        features: ['Criar documentos', 'Edição em tempo real', 'Comentários e sugestões', 'Histórico de versões'],
        files: [
            { name: 'Ata de Reunião - Sprint 12', modified: '19 Fev 2026', size: '—' },
            { name: 'Roadmap 2026', modified: '16 Fev 2026', size: '—' },
        ],
    },
    {
        name: 'Google Sheets',
        icon: '📊',
        desc: 'Planilhas e dados financeiros',
        connected: true,
        bg: 'rgba(15, 157, 88, 0.1)',
        features: ['Sincronizar dados financeiros', 'Relatórios automatizados', 'Fórmulas e gráficos', 'Importar/Exportar dados'],
        files: [
            { name: 'Controle Financeiro 2026', modified: '19 Fev 2026', size: '—' },
            { name: 'Pipeline CRM', modified: '18 Fev 2026', size: '—' },
        ],
    },
    {
        name: 'Google Tasks',
        icon: '✅',
        desc: 'Sincronize suas tarefas',
        connected: false,
        bg: 'rgba(245, 158, 11, 0.1)',
        features: ['Sincronizar com Kanban', 'Criar tarefas do Google', 'Deadlines sincronizados', 'Notificações'],
        files: [],
    },
    {
        name: 'Google Chat',
        icon: '💬',
        desc: 'Integre com Google Chat',
        connected: false,
        bg: 'rgba(66, 133, 244, 0.1)',
        features: ['Receber notificações', 'Enviar mensagens via bot', 'Criar espaços', 'Webhooks'],
        files: [],
    },
    {
        name: 'Google Calendar',
        icon: '📅',
        desc: 'Sincronize eventos e reuniões',
        connected: true,
        bg: 'rgba(219, 68, 55, 0.1)',
        features: ['Ver agenda da equipe', 'Criar eventos', 'Lembretes automáticos', 'Sincronizar deadlines'],
        files: [],
    },
];

export default function IntegracoesPage() {
    return (
        <>
            <div style={{ marginBottom: 24 }}>
                <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="kpi-card">
                        <div className="kpi-card-value" style={{ color: 'var(--success)' }}>{integrations.filter(i => i.connected).length}</div>
                        <div className="kpi-card-label">Conectadas</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-card-value" style={{ color: 'var(--text-muted)' }}>{integrations.filter(i => !i.connected).length}</div>
                        <div className="kpi-card-label">Desconectadas</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-card-value">{integrations.length}</div>
                        <div className="kpi-card-label">Total de Integrações</div>
                    </div>
                </div>
            </div>

            <div className="integrations-grid">
                {integrations.map((integration, i) => (
                    <div key={i} className="integration-card">
                        <div className="integration-card-header">
                            <div className="integration-icon" style={{ background: integration.bg, fontSize: 28 }}>
                                {integration.icon}
                            </div>
                            <div>
                                <div className="integration-name">{integration.name}</div>
                                <div className="integration-desc">{integration.desc}</div>
                            </div>
                        </div>
                        <div className="integration-card-body">
                            <div className="integration-status">
                                <span className={`integration-status-dot ${integration.connected ? 'connected' : 'disconnected'}`} />
                                <span style={{ color: integration.connected ? 'var(--success)' : 'var(--text-muted)' }}>
                                    {integration.connected ? 'Conectado' : 'Desconectado'}
                                </span>
                            </div>
                            <div className="integration-features">
                                {integration.features.map((feature, j) => (
                                    <div key={j} className="integration-feature">
                                        <Check size={14} />
                                        {feature}
                                    </div>
                                ))}
                            </div>

                            {integration.files.length > 0 && (
                                <div style={{ marginTop: 16 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                                        Arquivos recentes
                                    </div>
                                    {integration.files.map((file, j) => (
                                        <div key={j} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '8px 0', borderBottom: j < integration.files.length - 1 ? '1px solid var(--border-default)' : 'none'
                                        }}>
                                            <div>
                                                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{file.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{file.modified} · {file.size}</div>
                                            </div>
                                            <button className="header-action-btn" style={{ width: 28, height: 28, flexShrink: 0 }}>
                                                <ExternalLink size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="integration-card-footer">
                            {integration.connected ? (
                                <>
                                    <button className="btn btn-secondary" style={{ flex: 1 }}>Configurar</button>
                                    <button className="btn btn-secondary" style={{ flex: 1 }}>Abrir</button>
                                </>
                            ) : (
                                <button className="btn btn-primary" style={{ flex: 1 }}>Conectar</button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
