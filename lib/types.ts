export interface TeamMember {
    id: string;
    name: string;
    initials: string;
    role: string;
    avatar_color: string;
    status: 'online' | 'away' | 'offline';
    email: string;
    permission: 'admin' | 'member' | 'viewer';
    category?: string; // Administrativa, Financeira, Operacional, Comercial, Jurídica
    avatar_url?: string;
    allowed_modules?: string[];
    initial_password?: string;
    created_at?: string;
}

export interface UsuarioDB {
    id: string; // from auth.users
    nome: string;
    email: string;
    foto_url: string | null;
    created_at: string;
    in_comercial_team?: boolean;
    permissao_diretorio_clientes?: boolean;
    permissao_diretorio_colaboradores?: 'nenhuma' | 'basico' | 'sensivel';
}

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
    created_at?: string;
}

export interface Deal {
    id: string;
    title: string;
    company: string;
    value: number;
    stage: 'prospeccao' | 'diagnostico' | 'proposta_comercial' | 'negociacao' | 'fechado' | 'perdido';
    assignee: string;
    assignee_color: string;
    date: string;
    probability: number;
    origem?: string;
    fechamento_previsto?: string;
    motivo_perda?: string;
    observacoes?: string;
    data_entrada_etapa?: string;
    created_at?: string;
}

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
    created_at?: string;
}

export interface Canal {
    id: string;
    nome: string;
    descricao: string | null;
    tipo: 'canal' | 'grupo_projeto';
    criador_id: string | null;
    created_at: string;
}

export interface CanalParticipante {
    canal_id: string;
    usuario_id: string;
    adicionado_em: string;
}

export interface Mensagem {
    id: string;
    canal_id: string;
    autor_id: string | null;
    conteudo: string | null;
    tipo: 'texto' | 'imagem' | 'arquivo';
    arquivo_url: string | null;
    arquivo_nome: string | null;
    arquivo_tamanho: number | null;
    resposta_de: string | null;
    deletada: boolean;
    pinada?: boolean;
    created_at: string;
    // Joined fields (populated via select)
    autor?: {
        id: string;
        nome: string;
        email: string;
        foto_url: string | null;
    };
    mensagem_original?: {
        id: string;
        conteudo: string | null;
        autor?: { nome: string };
    };
    canal?: {
        id: string;
        nome: string;
    };
    mencoes_tarefas?: ActiveTaskMention[];
}

export interface DM {
    id: string;
    usuario_a_id: string;
    usuario_b_id: string;
    criado_em: string;
    ultima_mensagem: string | null;
    // Joined fields
    usuario_a?: {
        id: string;
        nome: string;
        email: string;
        foto_url: string | null;
    };
    usuario_b?: {
        id: string;
        nome: string;
        email: string;
        foto_url: string | null;
    };
}

export interface DMMensagem {
    id: string;
    dm_id: string;
    autor_id: string | null;
    conteudo: string | null;
    tipo: 'texto' | 'imagem' | 'arquivo';
    arquivo_url: string | null;
    arquivo_nome: string | null;
    arquivo_tamanho: number | null;
    lida: boolean;
    lida_em: string | null;
    deletada: boolean;
    created_at: string;
    // Joined fields
    autor?: {
        id: string;
        nome: string;
        email: string;
        foto_url: string | null;
    };
}


export interface FinancialTransaction {
    id: string;
    descricao: string;
    tipo: 'entrada' | 'saida';
    valor: number;
    data_vencimento: string;
    data_pagamento: string | null;
    status: 'pendente' | 'pago_recebido';
    classificacao?: string;
    categoria?: string;
    recorrencia?: string;
    grupo_recorrencia?: string;
    created_at?: string;
}

export interface FinancialTax {
    id: string;
    descricao: string;
    categoria: string;
    competencia: string;
    data_vencimento: string;
    data_pagamento: string | null;
    valor: number;
    status: 'Pendente' | 'Pago' | 'Vencido' | string;
    created_at?: string;
}

export interface FinancialType {
    id: string;
    name: string;
    created_at?: string;
}

export interface FinancialCategory {
    id: string;
    name: string;
    created_at?: string;
}

export interface BudgetPlan {
    id: string;
    category: string;
    month: string;
    planned_value: number;
    created_at?: string;
}



export interface ComercialCommissionTier {
    id: string;
    name: string;
    min_value: number;
    max_value: number | null;
    percentage: number;
    created_at?: string;
}

export interface OperationalTask {
    id: string;
    titulo: string;
    descricao?: string;
    dificuldade?: number; // 1-5
    progresso?: string; // Não iniciado, Em andamento, Quase pronto, Concluído
    categoria_tarefa?: string; // Desenvolvimento, Design, Suporte, Implementação
    data_inicio?: string;
    data_termino?: string; // Prazo limite
    tipo: 'previa' | 'finalizar_ferramenta' | 'implementacao' | 'manual' | string;
    cliente_nome: string;
    negocio_id?: string;
    responsavel_id?: string; // legacy single
    responsaveis_ids?: string[]; // new multi-assignee
    participantes_ids?: string[]; // co-participants
    status: 'Novas Funcionalidades' | 'A Fazer' | 'Fazendo' | 'Revisando' | 'Finalizado' | 'pendente' | 'em_andamento' | 'concluido';
    origem: 'comercial_automatico' | 'manual' | string;
    data_criacao?: string;
    data_conclusao?: string;
    observacoes?: string;
}

export interface SubtarefaOperacional {
    id: string;
    tarefa_id: string;
    titulo: string;
    concluida: boolean;
    ordem: number;
    created_at?: string;
}

// CRM Entities
export interface ActiveTaskMention {
    id: string;
    title: string;
    module: 'Operacional' | 'Comercial' | 'Financeiro';
    status: string;
}

export interface ClientCRM {
    id: string;
    name: string;
    cnpj?: string;
    segment?: string;
    website?: string;
    address?: string;
    contact_name?: string;
    contact_role?: string;
    contact_email?: string;
    contact_phone?: string;
    monthly_fee?: number;
    setup_fee?: number;
    start_date?: string;
    status?: 'Ativo' | 'Inativo' | 'Em negociação';
    features_used?: string;
    observations?: string;
    responsible_id?: string;
    hosting_cost?: number;
    db_cost?: number;
    operational_hours?: number;
    hour_value?: number;
    cac?: number;
    created_at?: string;
}

export interface MeetingCRM {
    id: string;
    client_id: string;
    title: string;
    date: string;
    responsible_id?: string;
    observations?: string;
    status?: 'Agendada' | 'Realizada' | 'Cancelada';
    result_notes?: string;
    is_recurring?: boolean;
    recurrence_pattern?: string;
    created_at?: string;
}

export interface FeedbackCRM {
    id: string;
    client_id: string;
    date?: string;
    author_type?: 'interno' | 'cliente';
    author_name?: string;
    type?: 'Elogio' | 'Sugestão' | 'Reclamação';
    description: string;
    created_at?: string;
}

export interface LeadLossRecord {
    id: string;
    deal_id: string;
    motivo_perda: string;
    descricao?: string;
    data_retorno: string;
    status: 'pendente' | 'retomado' | 'descartado';
    notificacoes_enviadas?: number;
    ultima_notificacao?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ComercialTask {
    id: string;
    titulo: string;
    descricao?: string;
    status: 'A Fazer' | 'Fazendo' | 'Revisando' | 'Finalizado';
    prioridade: 'Alta' | 'Média' | 'Baixa';
    progresso?: 'Não iniciado' | 'Em andamento' | 'Quase pronto' | 'Concluído';
    responsaveis_ids?: string[];
    participantes_ids?: string[];
    data_inicio?: string;
    data_termino?: string;
    data_conclusao?: string;
    created_at?: string;
}

// Legal Entities
export interface Contract {
    id: string;
    nome: string;
    cliente_fornecedor?: string;
    data_inicio?: string;
    data_vencimento?: string;
    status: 'Ativo' | 'Vencido' | 'Em renovação';
    arquivo_url?: string;
    observacoes?: string;
    created_at?: string;
}

export interface LegalDocument {
    id: string;
    nome: string;
    categoria: 'Societário' | 'Trabalhista' | 'Tributário' | 'Outro';
    data_upload?: string;
    responsavel?: string;
    observacoes?: string;
    arquivo_url?: string;
    created_at?: string;
}

export interface LegalPendency {
    id: string;
    descricao: string;
    responsavel?: string;
    prazo?: string;
    prioridade: 'Alta' | 'Média' | 'Baixa';
    status: 'Aberta' | 'Em andamento' | 'Resolvida';
    created_at?: string;
}

// Calendar
export interface CalendarEvent {
    id: string;
    titulo: string;
    data: string;
    hora_inicio?: string;
    hora_fim?: string;
    participantes?: string;
    participantes_ids?: string[];
    owner_id?: string;
    descricao?: string;
    cor?: string;
    origem?: 'manual' | 'crm_reuniao' | 'tarefa';
    reuniao_id?: string;
    created_at?: string;
}

// Notifications
export interface Notification {
    id: string;
    usuario_id: string;
    tipo: 'tarefa_atribuida' | 'tarefa_vencimento' | 'mencao_chat' | 'lead_retorno';
    titulo: string;
    mensagem: string;
    lida: boolean;
    redirecionamento?: string;
    modulo_origem?: string;
    criada_em: string;
    lida_em?: string;
}

export interface NotificationSettings {
    id: string;
    usuario_id: string;
    push_enabled: boolean;
    notif_tarefa_atribuida: boolean;
    notif_tarefa_vencimento: boolean;
    notif_mencao_chat: boolean;
    vencimento_dias_antes: string;
}

// Template Module
export interface TemplateCategoria {
    id: string;
    nome: string;
    tipo: 'modelo' | 'site';
    created_at: string;
}

export interface TemplateModelo {
    id: string;
    nome: string;
    descricao: string | null;
    categoria_id: string | null;
    imagem_url: string | null;
    url_demo: string | null;
    url_repositorio: string | null;
    tecnologias: string[];
    status: 'ativo' | 'em_desenvolvimento' | 'arquivado';
    responsavel_id: string | null;
    created_at: string;
    // Joins
    categoria?: TemplateCategoria;
    responsavel?: { id: string; nome: string; email: string; foto_url: string | null };
}

export interface TemplateSite {
    id: string;
    nome: string;
    url: string;
    descricao: string | null;
    categoria_id: string | null;
    created_at: string;
    // Join
    categoria?: TemplateCategoria;
}

export interface SellerGoal {
    id: string;
    seller_name: string;
    month: string;
    year: string;
    goal_value: number;
    created_at?: string;
}

export interface FinancialGoal {
    id: string;
    name: string;
    target: number;
    current: number;
    unit: string;
    color: string;
    created_at?: string;
}

// ===== DIRETÓRIO MODULE =====

export interface DiretorioCliente {
    id: string;
    nome: string;
    segmento?: string;
    whatsapp?: string;
    email?: string;
    telefone?: string;
    site?: string;
    status: 'ativo' | 'inativo';
    observacoes?: string;
    created_at?: string;
}

export interface DiretorioContato {
    id: string;
    cliente_id: string;
    nome: string;
    cargo?: string;
    email?: string;
    whatsapp?: string;
    observacoes?: string;
    created_at?: string;
}

export interface DiretorioLogin {
    id: string;
    cliente_id: string;
    plataforma: string;
    email_acesso?: string;
    senha_criptografada?: string;
    url_acesso?: string;
    observacoes?: string;
    created_at?: string;
    // Client-side only (decrypted):
    senha_revelada?: string;
}

export interface DiretorioAssinatura {
    id: string;
    cliente_id: string;
    nome_ferramenta: string;
    responsavel_pag?: 'nos' | 'cliente';
    categoria?: 'API' | 'SaaS' | 'Outros' | string;
    valor_mensal?: number;
    data_vencimento?: string;
    status: 'ativa' | 'vencida' | 'cancelada';
    observacoes?: string;
    created_at?: string;
}

export interface DiretorioCusto {
    id: string;
    cliente_id: string;
    mes_ano: string; // "YYYY-MM"
    servico: string;
    descricao?: string;
    valor?: number;
    tipo?: string;
    origem: 'manual' | 'api';
    created_at?: string;
}

export interface DiretorioColaborador {
    id: string;
    nome: string;
    cargo?: string;
    email?: string;
    whatsapp?: string;
    telefone?: string;
    data_inicio?: string;
    tipo_contrato?: string;
    status: 'ativo' | 'inativo';
    // Sensitive fields
    cpf?: string;
    rg?: string;
    endereco?: string;
    data_nascimento?: string;
    created_at?: string;
}

export interface DiretorioColabPlataforma {
    id: string;
    colaborador_id: string;
    plataforma: string;
    email_utilizado?: string;
    nome_usuario?: string;
    observacoes?: string;
    created_at?: string;
}

export interface DiretorioColabDocumento {
    id: string;
    colaborador_id: string;
    nome_documento: string;
    categoria?: 'Pessoal' | 'Contratual' | 'Técnico' | 'Outros';
    arquivo_url?: string;
    observacoes?: string;
    created_at?: string;
}

export interface DiretorioFerramentaPredefinida {
    id: string;
    name: string;
    created_at?: string;
}

// ===== CONTROLE DE FATURAMENTO =====

export interface AsaasCobranca {
    id: string;
    cliente_id: string;
    cliente_nome: string;
    valor: number;
    status: 'pendente' | 'enviada' | 'nf_gerada' | 'nf_verificada';
    data_emissao: string;
    data_vencimento: string;
    numero_nf?: string | null;
    observacoes?: string | null;
    criado_por?: string | null;
    updated_at?: string;
    created_at?: string;
}

// ===== TASK TEMPLATES MODULE =====

export interface TaskTemplateSubtarefa {
    id: string;
    template_id: string;
    titulo: string;
    ordem: number;
    created_at?: string;
}

export interface TaskTemplate {
    id: string;
    nome: string;
    descricao?: string;
    criado_por?: string;
    ativo: boolean;
    created_at?: string;
    // Joined
    subtarefas?: TaskTemplateSubtarefa[];
}

// ===== BANK IMPORT MODULE =====

export interface BankImport {
    id: string;
    banco: 'mercado_pago' | 'santander';
    formato: 'ofx' | 'csv' | 'xlsx';
    data_importacao: string;
    status: 'pendente' | 'confirmado';
    total_transacoes: number;
    total_conciliadas: number;
    periodo_inicio: string | null;
    periodo_fim: string | null;
    created_at?: string;
}

export interface BankImportTransaction {
    id: string;
    import_id: string;
    descricao: string;
    valor: number;
    data: string;
    tipo: 'entrada' | 'saida';
    status_reconciliacao: 'novo' | 'duplicado' | 'conciliado' | 'ignorado';
    transaction_id: string | null;
    selecionado: boolean;
    categoria?: string;
    tipo_lancamento?: 'avulso' | 'recorrente' | 'imposto';
    created_at?: string;
}
