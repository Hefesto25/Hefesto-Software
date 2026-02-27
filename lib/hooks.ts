'use client';

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type {
    TeamMember, Contact, Deal, Task,
    Channel, ChatMessage, FinancialData,
    ExpenseCategory, FinancialGoal,
    FinancialType, FinancialCategory, BudgetPlan,
    FinancialTransaction, SellerGoal, OperationalTask,
    ClientCRM, MeetingCRM, FeedbackCRM,
    AdminDemand, AdminMeeting,
    Contract, LegalDocument, LegalPendency,
    CalendarEvent,
    Notification, NotificationSettings
} from './types';

// Generic hook for fetching data from a table
function useSupabaseTable<T>(
    table: string,
    orderBy?: { column: string; ascending?: boolean }
) {
    const [data, setData] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        let query = supabase.from(table).select('*');
        if (orderBy) {
            query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
        }
        const { data: result, error: err } = await query;
        if (err) {
            setError(err.message);
            console.error(`Error fetching ${table}:`, err);
        } else {
            setData((result as T[]) ?? []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [table, orderBy?.column, orderBy?.ascending]);

    return { data, loading, error, setData, refetch: fetchData };
}

// Team
export function useTeam() {
    return useSupabaseTable<TeamMember>('team_members');
}

// Usuarios (Auth-linked profiles)
export interface UsuarioDB {
    id: string;
    nome: string;
    email: string;
    cargo: string | null;
    categoria: string;
    foto_url: string | null;
    modulos_acesso: string[];
    created_at: string;
}

export function useUsuarios() {
    return useSupabaseTable<UsuarioDB>('usuarios', { column: 'created_at', ascending: false });
}

const SUPABASE_URL = 'https://hlqftzvwilbwchfqelqy.supabase.co';

export async function createUsuarioViaEdge(payload: {
    email: string;
    password: string;
    nome: string;
    cargo?: string;
    categoria: string;
    modulos_acesso: string[];
}): Promise<{ success: boolean; user?: UsuarioDB; error?: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'Sessão expirada. Faça login novamente.' };

    const res = await fetch(`${SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
        return { success: false, error: data.error || 'Erro desconhecido ao criar usuário.' };
    }
    return { success: true, user: data.user };
}

export async function deleteUsuarioViaEdge(userId: string): Promise<{ success: boolean; error?: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'Sessão expirada. Faça login novamente.' };

    const res = await fetch(`${SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ user_id: userId }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
        return { success: false, error: data.error || 'Erro desconhecido ao remover usuário.' };
    }
    return { success: true };
}

export async function addTeamMember(member: Omit<TeamMember, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('team_members').insert(member).select().single();
    if (error) throw error;
    return data as TeamMember;
}

export async function updateTeamMember(id: string, updates: Partial<TeamMember>) {
    const { data, error } = await supabase.from('team_members').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as TeamMember;
}

export async function removeTeamMember(id: string) {
    const { error } = await supabase.from('team_members').delete().eq('id', id);
    if (error) throw error;
}

// CRM
export function useContacts() {
    return useSupabaseTable<Contact>('contacts', { column: 'created_at', ascending: true });
}

export function useDeals() {
    return useSupabaseTable<Deal>('deals', { column: 'created_at', ascending: true });
}

export async function addDeal(deal: Omit<Deal, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('deals').insert(deal).select().single();
    if (error) throw error;
    return data as Deal;
}

export async function updateDeal(id: string, updates: Partial<Deal>) {
    const { data, error } = await supabase.from('deals').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as Deal;
}

export async function removeDeal(id: string) {
    const { error } = await supabase.from('deals').delete().eq('id', id);
    if (error) throw error;
}

// Operational Tasks
export function useOperationalTasks() {
    return useSupabaseTable<OperationalTask>('tarefas_operacionais', { column: 'data_criacao', ascending: true });
}

export async function addOperationalTask(task: Omit<OperationalTask, 'id' | 'data_criacao' | 'data_conclusao'>) {
    const { data, error } = await supabase.from('tarefas_operacionais').insert(task).select().single();
    if (error) throw error;
    return data as OperationalTask;
}

export async function updateOperationalTask(id: string, updates: Partial<OperationalTask>) {
    const { data, error } = await supabase.from('tarefas_operacionais').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as OperationalTask;
}

export async function removeOperationalTask(id: string) {
    const { error } = await supabase.from('tarefas_operacionais').delete().eq('id', id);
    if (error) throw error;
}

// Seller Goals
export function useSellerGoals() {
    return useSupabaseTable<SellerGoal>('seller_goals');
}

export async function addSellerGoal(goal: Omit<SellerGoal, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('seller_goals').insert(goal).select().single();
    if (error) throw error;
    return data as SellerGoal;
}

export async function updateSellerGoal(id: string, updates: Partial<SellerGoal>) {
    const { data, error } = await supabase.from('seller_goals').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as SellerGoal;
}

export async function removeSellerGoal(id: string) {
    const { error } = await supabase.from('seller_goals').delete().eq('id', id);
    if (error) throw error;
}

// Tasks
export function useTasks() {
    return useSupabaseTable<Task>('tasks', { column: 'created_at', ascending: true });
}

// Chat
export function useChannels() {
    return useSupabaseTable<Channel>('channels', { column: 'created_at', ascending: true });
}

export function useMessages(channelId: string | null) {
    const [data, setData] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMessages = async () => {
        if (!channelId) {
            setData([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const { data: result, error: err } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('channel_id', channelId)
            .order('created_at', { ascending: true });

        if (err) {
            setError(err.message);
            console.error('Error fetching messages:', err);
        } else {
            setData((result as ChatMessage[]) ?? []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchMessages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channelId]);

    return { data, loading, error, setData, refetch: fetchMessages };
}

// Financial
export function useFinancialData() {
    return useSupabaseTable<FinancialData>('financial_data', { column: 'sort_order', ascending: true });
}

export function useExpenseCategories() {
    return useSupabaseTable<ExpenseCategory>('expense_categories');
}

export function useFinancialTransactions() {
    return useSupabaseTable<FinancialTransaction>('financial_transactions', { column: 'data_vencimento', ascending: true });
}

export async function addFinancialTransaction(item: Omit<FinancialTransaction, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('financial_transactions').insert(item).select().single();
    if (error) throw error;
    return data as FinancialTransaction;
}

export async function updateFinancialTransaction(id: string, updates: Partial<FinancialTransaction>) {
    const { data, error } = await supabase.from('financial_transactions').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as FinancialTransaction;
}

export async function removeFinancialTransaction(id: string) {
    const { error } = await supabase.from('financial_transactions').delete().eq('id', id);
    if (error) throw error;
}

export function useFinancialTypes() {
    return useSupabaseTable<FinancialType>('financial_types', { column: 'name', ascending: true });
}

export async function addFinancialType(type: Omit<FinancialType, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('financial_types').insert(type).select().single();
    if (error) throw error;
    return data as FinancialType;
}

export async function removeFinancialType(id: string) {
    const { error } = await supabase.from('financial_types').delete().eq('id', id);
    if (error) throw error;
}

export function useFinancialCategories() {
    return useSupabaseTable<FinancialCategory>('financial_categories', { column: 'name', ascending: true });
}

export async function addFinancialCategory(category: Omit<FinancialCategory, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('financial_categories').insert(category).select().single();
    if (error) throw error;
    return data as FinancialCategory;
}

export async function removeFinancialCategory(id: string) {
    const { error } = await supabase.from('financial_categories').delete().eq('id', id);
    if (error) throw error;
}

// ===== BUDGET PLAN =====
export function useGoals() {
    return useSupabaseTable<FinancialGoal>('financial_goals', { column: 'created_at', ascending: true });
}

export function useBudgetPlan() {
    return useSupabaseTable<BudgetPlan>('budget_plan', { column: 'category', ascending: true });
}

export async function addBudgetPlanItem(item: Omit<BudgetPlan, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('budget_plan').insert(item).select().single();
    if (error) throw error;
    return data as BudgetPlan;
}

export async function updateBudgetPlanItem(id: string, updates: Partial<BudgetPlan>) {
    const { data, error } = await supabase.from('budget_plan').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as BudgetPlan;
}

export async function removeBudgetPlanItem(id: string) {
    const { error } = await supabase.from('budget_plan').delete().eq('id', id);
    if (error) throw error;
}

// ===== GOALS CRUD =====
export async function addGoal(goal: Omit<FinancialGoal, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('financial_goals').insert(goal).select().single();
    if (error) throw error;
    return data as FinancialGoal;
}

export async function updateGoal(id: string, updates: Partial<FinancialGoal>) {
    const { data, error } = await supabase.from('financial_goals').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as FinancialGoal;
}

export async function removeGoal(id: string) {
    const { error } = await supabase.from('financial_goals').delete().eq('id', id);
    if (error) throw error;
}

// ===== ACCOUNTS PAYABLE/RECEIVABLE =====


// CRM Entities
export function useClients() {
    return useSupabaseTable<ClientCRM>('clients', { column: 'created_at', ascending: false });
}

export async function addClient(client: Omit<ClientCRM, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('clients').insert(client).select().single();
    if (error) throw error;
    return data as ClientCRM;
}

export async function updateClient(id: string, updates: Partial<ClientCRM>) {
    const { data, error } = await supabase.from('clients').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as ClientCRM;
}

export async function removeClient(id: string) {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
}

export function useMeetings() {
    return useSupabaseTable<MeetingCRM>('meetings', { column: 'date', ascending: true });
}

export async function addMeeting(meeting: Omit<MeetingCRM, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('meetings').insert(meeting).select().single();
    if (error) throw error;
    return data as MeetingCRM;
}

export async function updateMeeting(id: string, updates: Partial<MeetingCRM>) {
    const { data, error } = await supabase.from('meetings').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as MeetingCRM;
}

export async function removeMeeting(id: string) {
    const { error } = await supabase.from('meetings').delete().eq('id', id);
    if (error) throw error;
}

export function useFeedbacks() {
    return useSupabaseTable<FeedbackCRM>('feedbacks', { column: 'date', ascending: false });
}

export async function addFeedback(feedback: Omit<FeedbackCRM, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('feedbacks').insert(feedback).select().single();
    if (error) throw error;
    return data as FeedbackCRM;
}

export async function updateFeedback(id: string, updates: Partial<FeedbackCRM>) {
    const { data, error } = await supabase.from('feedbacks').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as FeedbackCRM;
}

export async function removeFeedback(id: string) {
    const { error } = await supabase.from('feedbacks').delete().eq('id', id);
    if (error) throw error;
}

// ===== ADMINISTRATIVE =====
export function useAdminDemands() {
    return useSupabaseTable<AdminDemand>('admin_demands', { column: 'created_at', ascending: false });
}

export async function addAdminDemand(demand: Omit<AdminDemand, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('admin_demands').insert(demand).select().single();
    if (error) throw error;
    return data as AdminDemand;
}

export async function updateAdminDemand(id: string, updates: Partial<AdminDemand>) {
    const { data, error } = await supabase.from('admin_demands').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as AdminDemand;
}

export async function removeAdminDemand(id: string) {
    const { error } = await supabase.from('admin_demands').delete().eq('id', id);
    if (error) throw error;
}

export function useAdminMeetings() {
    return useSupabaseTable<AdminMeeting>('admin_meetings', { column: 'data_hora', ascending: false });
}

export async function addAdminMeeting(meeting: Omit<AdminMeeting, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('admin_meetings').insert(meeting).select().single();
    if (error) throw error;
    return data as AdminMeeting;
}

export async function updateAdminMeeting(id: string, updates: Partial<AdminMeeting>) {
    const { data, error } = await supabase.from('admin_meetings').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as AdminMeeting;
}

export async function removeAdminMeeting(id: string) {
    const { error } = await supabase.from('admin_meetings').delete().eq('id', id);
    if (error) throw error;
}

// ===== LEGAL =====
export function useContracts() {
    return useSupabaseTable<Contract>('contracts', { column: 'created_at', ascending: false });
}

export async function addContract(contract: Omit<Contract, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('contracts').insert(contract).select().single();
    if (error) throw error;
    return data as Contract;
}

export async function updateContract(id: string, updates: Partial<Contract>) {
    const { data, error } = await supabase.from('contracts').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as Contract;
}

export async function removeContract(id: string) {
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) throw error;
}

export function useLegalDocuments() {
    return useSupabaseTable<LegalDocument>('legal_documents', { column: 'created_at', ascending: false });
}

export async function addLegalDocument(doc: Omit<LegalDocument, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('legal_documents').insert(doc).select().single();
    if (error) throw error;
    return data as LegalDocument;
}

export async function updateLegalDocument(id: string, updates: Partial<LegalDocument>) {
    const { data, error } = await supabase.from('legal_documents').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as LegalDocument;
}

export async function removeLegalDocument(id: string) {
    const { error } = await supabase.from('legal_documents').delete().eq('id', id);
    if (error) throw error;
}

export function useLegalPendencies() {
    return useSupabaseTable<LegalPendency>('legal_pendencies', { column: 'created_at', ascending: false });
}

export async function addLegalPendency(pendency: Omit<LegalPendency, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('legal_pendencies').insert(pendency).select().single();
    if (error) throw error;
    return data as LegalPendency;
}

export async function updateLegalPendency(id: string, updates: Partial<LegalPendency>) {
    const { data, error } = await supabase.from('legal_pendencies').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as LegalPendency;
}

export async function removeLegalPendency(id: string) {
    const { error } = await supabase.from('legal_pendencies').delete().eq('id', id);
    if (error) throw error;
}

// ===== CALENDAR =====
export function useCalendarEvents() {
    return useSupabaseTable<CalendarEvent>('calendar_events', { column: 'data', ascending: true });
}

export async function addCalendarEvent(event: Omit<CalendarEvent, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('calendar_events').insert(event).select().single();
    if (error) throw error;
    return data as CalendarEvent;
}

export async function updateCalendarEvent(id: string, updates: Partial<CalendarEvent>) {
    const { data, error } = await supabase.from('calendar_events').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as CalendarEvent;
}

export async function removeCalendarEvent(id: string) {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) throw error;
}

// ===== NOTIFICATIONS =====
export function useNotifications(usuarioId: string) {
    const [data, setData] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        const { data: result, error } = await supabase
            .from('notificacoes')
            .select('*')
            .eq('usuario_id', usuarioId)
            .order('criada_em', { ascending: false });
        if (error) {
            console.error('Error fetching notifications:', error.message, error.details);
        } else {
            setData((result as Notification[]) ?? []);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (usuarioId) fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuarioId]);

    return { data, loading, setData, refetch: fetchData };
}

export async function addNotification(notification: Omit<Notification, 'id' | 'lida' | 'lida_em'>) {
    const { data, error } = await supabase.from('notificacoes').insert({
        ...notification,
        lida: false,
    }).select().single();
    if (error) throw error;
    return data as Notification;
}

export async function markNotificationAsRead(id: string) {
    const { data, error } = await supabase.from('notificacoes').update({
        lida: true,
        lida_em: new Date().toISOString()
    }).eq('id', id).select().single();
    if (error) throw error;
    return data as Notification;
}

export async function markAllNotificationsAsRead(usuarioId: string) {
    const { error } = await supabase.from('notificacoes').update({
        lida: true,
        lida_em: new Date().toISOString()
    }).eq('usuario_id', usuarioId).eq('lida', false);
    if (error) throw error;
}

export async function removeReadNotifications(usuarioId: string) {
    const { error } = await supabase.from('notificacoes').delete()
        .eq('usuario_id', usuarioId).eq('lida', true);
    if (error) throw error;
}

// ===== NOTIFICATION SETTINGS =====
export function useNotificationSettings(usuarioId: string) {
    const [data, setData] = useState<NotificationSettings | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        const { data: result, error } = await supabase
            .from('notification_settings')
            .select('*')
            .eq('usuario_id', usuarioId)
            .maybeSingle();
        if (error) {
            console.error('Error fetching notification settings:', error.message, error.details);
        } else {
            setData(result as NotificationSettings | null);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (usuarioId) fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [usuarioId]);

    return { data, loading, setData, refetch: fetchData };
}

export async function upsertNotificationSettings(settings: Omit<NotificationSettings, 'id'>) {
    const { data, error } = await supabase.from('notification_settings').upsert(
        settings,
        { onConflict: 'usuario_id' }
    ).select().single();
    if (error) throw error;
    return data as NotificationSettings;
}

/**
 * Creates a notification only if the target user has that notification type enabled.
 * Returns the created notification or null if the type is disabled.
 */
export async function createNotificationIfEnabled(
    usuarioId: string,
    tipo: Notification['tipo'],
    titulo: string,
    mensagem: string,
    redirecionamento?: string,
    moduloOrigem?: string
): Promise<Notification | null> {
    // Check user settings
    const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('usuario_id', usuarioId)
        .maybeSingle();

    if (settings) {
        const s = settings as NotificationSettings;
        if (tipo === 'tarefa_atribuida' && !s.notif_tarefa_atribuida) return null;
        if (tipo === 'tarefa_vencimento' && !s.notif_tarefa_vencimento) return null;
        if (tipo === 'mencao_chat' && !s.notif_mencao_chat) return null;
    }

    return addNotification({
        usuario_id: usuarioId,
        tipo,
        titulo,
        mensagem,
        redirecionamento,
        modulo_origem: moduloOrigem,
        criada_em: new Date().toISOString()
    });
}
