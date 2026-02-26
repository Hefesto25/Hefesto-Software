export interface TeamMember {
    id: string;
    name: string;
    initials: string;
    role: string;
    avatar_color: string;
    status: 'online' | 'away' | 'offline';
    email: string;
}

export const team: TeamMember[] = [
    { id: '1', name: 'Marcel Sgarioni', initials: 'MS', role: 'CEO & Tech Lead', avatar_color: '#3B82F6', status: 'online', email: 'marcel@hefesto.ai' },
    { id: '2', name: 'Ana Beatriz', initials: 'AB', role: 'UI/UX Designer', avatar_color: '#8B5CF6', status: 'online', email: 'ana@hefesto.ai' },
    { id: '3', name: 'Ricardo Almeida', initials: 'RA', role: 'Full Stack Dev', avatar_color: '#10B981', status: 'online', email: 'ricardo@hefesto.ai' },
    { id: '4', name: 'Fernanda Lima', initials: 'FL', role: 'CFO / Financeiro', avatar_color: '#F59E0B', status: 'away', email: 'fernanda@hefesto.ai' },
    { id: '5', name: 'Lucas Pereira', initials: 'LP', role: 'QA Engineer', avatar_color: '#EC4899', status: 'online', email: 'lucas@hefesto.ai' },
    { id: '6', name: 'Juliana Costa', initials: 'JC', role: 'Marketing', avatar_color: '#EF4444', status: 'offline', email: 'juliana@hefesto.ai' },
];
