export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'backlog' | 'progress' | 'review' | 'done';
    priority: 'high' | 'medium' | 'low';
    label: 'feature' | 'bug' | 'improvement' | 'design' | 'urgent';
    assignee: string;
    assignee_color: string;
    deadline: string;
    comments: number;
    attachments: number;
    project: string;
}

export const tasks: Task[] = [
    { id: '1', title: 'Implementar autenticação OAuth', description: 'Configurar login com Google e Email', status: 'progress', priority: 'high', label: 'feature', assignee: 'MS', assignee_color: '#3B82F6', deadline: '2026-02-25', comments: 5, attachments: 2, project: 'Hefesto IA' },
    { id: '2', title: 'Design do dashboard mobile', description: 'Criar wireframes e mockups responsivos', status: 'progress', priority: 'medium', label: 'design', assignee: 'AB', assignee_color: '#8B5CF6', deadline: '2026-02-22', comments: 3, attachments: 8, project: 'Hefesto IA' },
    { id: '3', title: 'Bug no cálculo de margens', description: 'Margem operacional mostrando valor incorreto', status: 'backlog', priority: 'high', label: 'bug', assignee: 'RA', assignee_color: '#10B981', deadline: '2026-02-20', comments: 2, attachments: 1, project: 'Hefesto IA' },
    { id: '4', title: 'API de integração com Sheets', description: 'Criar endpoints REST para sincronizar planilhas', status: 'backlog', priority: 'medium', label: 'feature', assignee: 'MS', assignee_color: '#3B82F6', deadline: '2026-03-01', comments: 1, attachments: 0, project: 'Hefesto IA' },
    { id: '5', title: 'Otimizar queries do relatório', description: 'Performance lenta no DRE anual', status: 'review', priority: 'high', label: 'improvement', assignee: 'LP', assignee_color: '#EC4899', deadline: '2026-02-21', comments: 7, attachments: 3, project: 'Hefesto IA' },
    { id: '6', title: 'Adicionar filtros no CRM', description: 'Filtrar por status, data e valor', status: 'backlog', priority: 'low', label: 'feature', assignee: 'RA', assignee_color: '#10B981', deadline: '2026-03-05', comments: 0, attachments: 0, project: 'Hefesto IA' },
    { id: '7', title: 'Exportar relatórios em PDF', description: 'Gerar PDFs do DRE e fluxo de caixa', status: 'backlog', priority: 'medium', label: 'feature', assignee: 'FL', assignee_color: '#F59E0B', deadline: '2026-03-10', comments: 4, attachments: 1, project: 'Hefesto IA' },
    { id: '8', title: 'Testes unitários módulo financeiro', description: 'Cobrir cálculos com Jest', status: 'review', priority: 'medium', label: 'improvement', assignee: 'LP', assignee_color: '#EC4899', deadline: '2026-02-23', comments: 2, attachments: 0, project: 'Hefesto IA' },
    { id: '9', title: 'Deploy em produção', description: 'Configurar CI/CD e deploy na Vercel', status: 'done', priority: 'high', label: 'urgent', assignee: 'MS', assignee_color: '#3B82F6', deadline: '2026-02-15', comments: 6, attachments: 2, project: 'Hefesto IA' },
    { id: '10', title: 'Integração Google Drive', description: 'Listar e abrir arquivos do Drive', status: 'done', priority: 'medium', label: 'feature', assignee: 'RA', assignee_color: '#10B981', deadline: '2026-02-14', comments: 3, attachments: 1, project: 'Hefesto IA' },
    { id: '11', title: 'Notificações em tempo real', description: 'WebSocket para alertas do sistema', status: 'backlog', priority: 'low', label: 'feature', assignee: 'FL', assignee_color: '#F59E0B', deadline: '2026-03-15', comments: 1, attachments: 0, project: 'Projeto Beta' },
    { id: '12', title: 'Redesign do sidebar', description: 'Atualizar sidebar com novo design system', status: 'done', priority: 'low', label: 'design', assignee: 'AB', assignee_color: '#8B5CF6', deadline: '2026-02-10', comments: 4, attachments: 5, project: 'Hefesto IA' },
];
