export interface Contact {
    id: string;
    name: string;
    email: string;
    company: string;
    phone: string;
    status: 'active' | 'pending' | 'inactive';
    value: number;
    avatar_color: string;
    last_contact: string;
}

export interface Deal {
    id: string;
    title: string;
    company: string;
    value: number;
    stage: 'lead' | 'proposta' | 'negociacao' | 'fechado' | 'perdido';
    assignee: string;
    assignee_color: string;
    date: string;
    probability: number;
}

export const contacts: Contact[] = [
    { id: '1', name: 'Ricardo Almeida', email: 'ricardo@techcorp.com', company: 'TechCorp', phone: '(11) 99123-4567', status: 'active', value: 45000, avatar_color: '#3B82F6', last_contact: '2026-02-18' },
    { id: '2', name: 'Fernanda Lima', email: 'fernanda@inovahub.com', company: 'InovaHub', phone: '(21) 98765-4321', status: 'active', value: 78000, avatar_color: '#10B981', last_contact: '2026-02-17' },
    { id: '3', name: 'Carlos Mendes', email: 'carlos@startupx.io', company: 'StartupX', phone: '(31) 97654-3210', status: 'pending', value: 32000, avatar_color: '#F59E0B', last_contact: '2026-02-15' },
    { id: '4', name: 'Ana Beatriz', email: 'ana@digitalwave.com', company: 'DigitalWave', phone: '(41) 96543-2109', status: 'active', value: 120000, avatar_color: '#8B5CF6', last_contact: '2026-02-19' },
    { id: '5', name: 'Lucas Pereira', email: 'lucas@cloudpro.com.br', company: 'CloudPro', phone: '(51) 95432-1098', status: 'inactive', value: 15000, avatar_color: '#EC4899', last_contact: '2026-01-20' },
    { id: '6', name: 'Juliana Costa', email: 'juliana@nexuslabs.com', company: 'NexusLabs', phone: '(61) 94321-0987', status: 'active', value: 65000, avatar_color: '#EF4444', last_contact: '2026-02-16' },
    { id: '7', name: 'Pedro Henrique', email: 'pedro@bravadata.ai', company: 'BravaData AI', phone: '(71) 93210-9876', status: 'pending', value: 95000, avatar_color: '#06B6D4', last_contact: '2026-02-14' },
    { id: '8', name: 'Mariana Santos', email: 'mariana@velocitytech.com', company: 'VelocityTech', phone: '(81) 92109-8765', status: 'active', value: 55000, avatar_color: '#14B8A6', last_contact: '2026-02-18' },
];

export const deals: Deal[] = [
    { id: '1', title: 'Projeto Plataforma E-commerce', company: 'TechCorp', value: 85000, stage: 'lead', assignee: 'MS', assignee_color: '#3B82F6', date: '2026-02-10', probability: 20 },
    { id: '2', title: 'App Mobile de Delivery', company: 'InovaHub', value: 120000, stage: 'proposta', assignee: 'RA', assignee_color: '#10B981', date: '2026-02-12', probability: 45 },
    { id: '3', title: 'Automação de Marketing', company: 'StartupX', value: 45000, stage: 'negociacao', assignee: 'MS', assignee_color: '#3B82F6', date: '2026-02-15', probability: 70 },
    { id: '4', title: 'Sistema ERP Completo', company: 'DigitalWave', value: 250000, stage: 'proposta', assignee: 'FL', assignee_color: '#F59E0B', date: '2026-02-08', probability: 35 },
    { id: '5', title: 'Chatbot com IA', company: 'NexusLabs', value: 65000, stage: 'lead', assignee: 'RA', assignee_color: '#10B981', date: '2026-02-17', probability: 15 },
    { id: '6', title: 'Dashboard Analytics', company: 'CloudPro', value: 38000, stage: 'fechado', assignee: 'FL', assignee_color: '#F59E0B', date: '2026-02-01', probability: 100 },
    { id: '7', title: 'Integração de APIs', company: 'BravaData AI', value: 95000, stage: 'negociacao', assignee: 'MS', assignee_color: '#3B82F6', date: '2026-02-14', probability: 60 },
    { id: '8', title: 'Redesign UX/UI', company: 'VelocityTech', value: 55000, stage: 'proposta', assignee: 'RA', assignee_color: '#10B981', date: '2026-02-11', probability: 40 },
    { id: '9', title: 'Machine Learning Pipeline', company: 'BravaData AI', value: 180000, stage: 'lead', assignee: 'FL', assignee_color: '#F59E0B', date: '2026-02-18', probability: 10 },
    { id: '10', title: 'Consultoria DevOps', company: 'TechCorp', value: 28000, stage: 'fechado', assignee: 'MS', assignee_color: '#3B82F6', date: '2026-01-28', probability: 100 },
    { id: '11', title: 'Plataforma SaaS B2B', company: 'InovaHub', value: 310000, stage: 'perdido', assignee: 'FL', assignee_color: '#F59E0B', date: '2026-01-15', probability: 0 },
];
