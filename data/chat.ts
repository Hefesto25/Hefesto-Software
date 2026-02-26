export interface Channel {
    id: string;
    name: string;
    description: string;
    unread: number;
}

export interface ChatMessage {
    id: string;
    channel: string;
    author: string;
    avatar_color: string;
    text: string;
    time: string;
}

export const channels: Channel[] = [
    { id: '1', name: 'geral', description: 'Discussões gerais da equipe', unread: 3 },
    { id: '2', name: 'dev', description: 'Canal de desenvolvimento', unread: 0 },
    { id: '3', name: 'financeiro', description: 'Assuntos financeiros', unread: 1 },
    { id: '4', name: 'design', description: 'UI/UX e design', unread: 0 },
    { id: '5', name: 'marketing', description: 'Estratégias de marketing', unread: 5 },
    { id: '6', name: 'projetos', description: 'Atualizações de projetos', unread: 0 },
];

export const messages: ChatMessage[] = [
    { id: '1', channel: '1', author: 'Marcel Sgarioni', avatar_color: '#3B82F6', text: 'Bom dia pessoal! 👋 Vamos alinhar as prioridades da semana?', time: '09:15' },
    { id: '2', channel: '1', author: 'Ana Beatriz', avatar_color: '#8B5CF6', text: 'Bom dia! Sim, tenho updates dos wireframes do dashboard mobile para apresentar.', time: '09:18' },
    { id: '3', channel: '1', author: 'Ricardo Almeida', avatar_color: '#10B981', text: 'Terminei a integração com o Google Drive ontem 🎉 Já tá no staging pra review.', time: '09:22' },
    { id: '4', channel: '1', author: 'Fernanda Lima', avatar_color: '#F59E0B', text: 'Maravilha! Vou testar hoje. @Marcel, preciso discutir o escopo do módulo financeiro com você.', time: '09:25' },
    { id: '5', channel: '1', author: 'Marcel Sgarioni', avatar_color: '#3B82F6', text: 'Perfeito, Fer! Vamos marcar 14h? Sobre o dashboard, recebi o feedback do DRE — precisamos ajustar as categorias de despesas.', time: '09:30' },
    { id: '6', channel: '1', author: 'Lucas Pereira', avatar_color: '#EC4899', text: 'Os testes unitários do módulo financeiro estão quase prontos. Faltam só os cálculos de margem operacional.', time: '09:35' },
    { id: '7', channel: '1', author: 'Ana Beatriz', avatar_color: '#8B5CF6', text: 'Fiz o redesign do sidebar, vou subir o PR agora. Ficou muito mais clean 🎨', time: '09:42' },
    { id: '8', channel: '1', author: 'Marcel Sgarioni', avatar_color: '#3B82F6', text: 'Ótimo trabalho, time! Lembrem de atualizar as tarefas no Kanban. Reunião geral às 10h no Meet.', time: '09:45' },
    { id: '9', channel: '2', author: 'Ricardo Almeida', avatar_color: '#10B981', text: 'PR #47 pronto pra review — integração Google Drive com upload e listagem de arquivos.', time: '10:30' },
    { id: '10', channel: '2', author: 'Lucas Pereira', avatar_color: '#EC4899', text: 'Revisando agora. Uma dúvida: usou a API v3 do Drive?', time: '10:45' },
    { id: '11', channel: '3', author: 'Fernanda Lima', avatar_color: '#F59E0B', text: 'Update financeiro: receita de fevereiro ultrapassou a meta em 12%! 📈', time: '11:00' },
    { id: '12', channel: '3', author: 'Marcel Sgarioni', avatar_color: '#3B82F6', text: 'Excelente! Vamos atualizar o forecast pro Q2.', time: '11:15' },
];
