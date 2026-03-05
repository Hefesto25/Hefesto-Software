'use client';

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type {
    TeamMember, Contact, Deal, Task,
    Canal, CanalParticipante, Mensagem, FinancialData,
    ExpenseCategory, FinancialGoal,
    FinancialType, FinancialCategory, BudgetPlan,
    FinancialTransaction, SellerGoal, OperationalTask,
    ClientCRM, MeetingCRM, FeedbackCRM,
    AdminDemand, AdminMeeting, ComercialTask,
    Contract, LegalDocument, LegalPendency,
    CalendarEvent,
    Notification, NotificationSettings,
    TemplateCategoria, TemplateModelo, TemplateSite,
    DiretorioCliente,
    DiretorioContato,
    DiretorioLogin,
    DiretorioAssinatura,
    DiretorioCusto,
    DiretorioColaborador,
    DiretorioColabPlataforma,
    DiretorioColabDocumento,
    FinancialTax, ComercialCommissionTier,
    ActiveTaskMention,
    DiretorioFerramentaPredefinida
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
    in_comercial_team?: boolean;
    permissao_diretorio_clientes?: boolean;
    permissao_diretorio_colaboradores?: 'nenhuma' | 'basico' | 'sensivel';
    created_at: string;
}

export function useUsuarios() {
    return useSupabaseTable<UsuarioDB>('usuarios', { column: 'created_at', ascending: false });
}

const SUPABASE_URL = 'https://hlqftzvwilbwchfqelqy.supabase.co';

import { createBrowserClient } from '@supabase/ssr';
import { supabaseUrl, supabaseAnonKey } from './supabase';

/**
 * Creates a new user via supabase.auth.signUp().
 * The trigger `on_auth_user_created` automatically creates the profile in `usuarios`.
 * Only requires nome, email, and password — other fields are edited later.
 */
import { createClient } from '@supabase/supabase-js';

export async function createUsuarioViaSignUp(payload: {
    email: string;
    password: string;
    nome: string;
}): Promise<{ success: boolean; error?: string }> {
    // 1. Get the current admin session
    const { data: { session: currentSession } } = await supabase.auth.getSession();

    // Create a vanilla client that does absolutely no persistence
    const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        }
    });

    const { data, error } = await tempSupabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
            data: {
                nome: payload.nome,
                categoria: "Operacional", // Padrao
                modulos_acesso: ["/"]
            },
        },
    });

    // 2. Regardless of what happened, restore the admin session on the main client 
    // to be absolutely sure the admin isn't logged out.
    if (currentSession) {
        await supabase.auth.setSession({
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token,
        });
    }

    if (error) {
        return { success: false, error: error.message };
    }

    if (!data.user) {
        return { success: false, error: 'Erro desconhecido ao criar usuário.' };
    }

    return { success: true };
}

/**
 * Updates a user profile in the `usuarios` table.
 * Admin can update any field; regular users can only update nome and foto_url (enforced by RLS).
 */
export async function updateUsuario(
    id: string,
    updates: Partial<Omit<UsuarioDB, 'id' | 'email' | 'created_at'>>
): Promise<{ success: boolean; user?: UsuarioDB; error?: string }> {
    const { data, error } = await supabase
        .from('usuarios')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        return { success: false, error: error.message };
    }
    return { success: true, user: data as UsuarioDB };
}

export async function uploadAvatar(file: File, userId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
        return { success: true, url: data.publicUrl };
    } catch (error: any) {
        console.error('Error uploading avatar:', error);
        return { success: false, error: error.message || 'Error uploading file' };
    }
}

export async function deleteUsuarioViaEdge(userId: string): Promise<{ success: boolean; error?: string; details?: any }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { success: false, error: 'Sessão expirada. Faça login novamente.' };

    const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
        headers: {
            Authorization: `Bearer ${session.access_token}`
        }
    });

    if (error) {
        return { success: false, error: error.message || 'Erro desconhecido ao remover usuário.', details: error };
    }

    if (data?.error) {
        return { success: false, error: data.error, details: data };
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

// Comercial Commission Tiers
export function useComercialCommissionTiers() {
    return useSupabaseTable<ComercialCommissionTier>('comercial_commission_tiers', { column: 'min_value', ascending: true });
}

export async function addComercialCommissionTier(tier: Omit<ComercialCommissionTier, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('comercial_commission_tiers').insert(tier).select().single();
    if (error) throw error;
    return data as ComercialCommissionTier;
}

export async function updateComercialCommissionTier(id: string, updates: Partial<ComercialCommissionTier>) {
    const { data, error } = await supabase.from('comercial_commission_tiers').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as ComercialCommissionTier;
}

export async function removeComercialCommissionTier(id: string) {
    const { error } = await supabase.from('comercial_commission_tiers').delete().eq('id', id);
    if (error) throw error;
}

// Tasks
export function useTasks() {
    return useSupabaseTable<Task>('tasks', { column: 'created_at', ascending: true });
}

// Chat
// =========== CHAT MODULE ===========

export function useCanais(userId: string | undefined) {
    const [data, setData] = useState<Canal[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCanais = async () => {
        if (!userId) { setData([]); setLoading(false); return; }
        setLoading(true);
        const { data: result, error } = await supabase
            .from('canais')
            .select('*')
            .order('created_at', { ascending: true });
        if (error) console.error('Error fetching canais:', error);
        else setData((result as Canal[]) ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchCanais(); }, [userId]);
    return { data, loading, setData, refetch: fetchCanais };
}

export function useCanalParticipantes(canalId: string | null) {
    const [data, setData] = useState<(CanalParticipante & { usuario?: { id: string; nome: string; email: string; foto_url: string | null } })[]>([]);
    const [loading, setLoading] = useState(true);

    const fetch = async () => {
        if (!canalId) { setData([]); setLoading(false); return; }
        setLoading(true);
        const { data: result, error } = await supabase
            .from('canal_participantes')
            .select('*, usuario:usuarios(id, nome, email, foto_url)')
            .eq('canal_id', canalId);
        if (error) console.error('Error fetching participantes:', error);
        else setData(result ?? []);
        setLoading(false);
    };

    useEffect(() => { fetch(); }, [canalId]);
    return { data, loading, setData, refetch: fetch };
}

export function useMensagens(canalId: string | null) {
    const [data, setData] = useState<Mensagem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMensagens = async () => {
        if (!canalId) { setData([]); setLoading(false); return; }
        setLoading(true);
        const { data: result, error } = await supabase
            .from('mensagens')
            .select(`
                *,
                autor:usuarios!autor_id(id, nome, email, foto_url),
                mensagem_original:mensagens!resposta_de(id, conteudo, autor:usuarios!autor_id(nome))
            `)
            .eq('canal_id', canalId)
            .order('created_at', { ascending: true });
        if (error) console.error('Error fetching mensagens:', error);
        else setData((result as Mensagem[]) ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchMensagens(); }, [canalId]);
    return { data, loading, setData, refetch: fetchMensagens };
}

// --- CRUD: Canais ---
export async function createCanal(payload: { nome: string; descricao?: string; tipo: 'canal' | 'grupo_projeto'; criador_id: string; participante_ids: string[] }) {
    const { data: canal, error } = await supabase
        .from('canais')
        .insert({ nome: payload.nome, descricao: payload.descricao || null, tipo: payload.tipo, criador_id: payload.criador_id })
        .select()
        .single();
    if (error || !canal) return { success: false, error: error?.message || 'Erro ao criar canal' };

    // Add participants (including creator)
    const allIds = [...new Set([payload.criador_id, ...payload.participante_ids])];
    const participantes = allIds.map(uid => ({ canal_id: canal.id, usuario_id: uid }));
    const { error: pError } = await supabase.from('canal_participantes').insert(participantes);
    if (pError) console.error('Error adding participantes:', pError);

    return { success: true, canal: canal as Canal };
}

export async function updateCanal(id: string, updates: { nome?: string; descricao?: string }) {
    const { error } = await supabase.from('canais').update(updates).eq('id', id);
    return { success: !error, error: error?.message };
}

export async function deleteCanal(id: string) {
    const { error } = await supabase.from('canais').delete().eq('id', id);
    return { success: !error, error: error?.message };
}

// --- CRUD: Participantes ---
export async function addParticipante(canalId: string, usuarioId: string) {
    const { error } = await supabase.from('canal_participantes').insert({ canal_id: canalId, usuario_id: usuarioId });
    return { success: !error, error: error?.message };
}

export async function removeParticipante(canalId: string, usuarioId: string) {
    const { error } = await supabase.from('canal_participantes').delete().eq('canal_id', canalId).eq('usuario_id', usuarioId);
    return { success: !error, error: error?.message };
}

// --- CRUD: Mensagens ---
export async function sendMensagem(payload: {
    canal_id: string;
    autor_id: string;
    conteudo?: string;
    tipo?: 'texto' | 'imagem' | 'arquivo';
    arquivo_url?: string;
    arquivo_nome?: string;
    arquivo_tamanho?: number;
    resposta_de?: string;
    mencoes_tarefas?: any[];
}) {
    const { data, error } = await supabase
        .from('mensagens')
        .insert({
            canal_id: payload.canal_id,
            autor_id: payload.autor_id,
            conteudo: payload.conteudo || null,
            tipo: payload.tipo || 'texto',
            arquivo_url: payload.arquivo_url || null,
            arquivo_nome: payload.arquivo_nome || null,
            arquivo_tamanho: payload.arquivo_tamanho || null,
            resposta_de: payload.resposta_de || null,
            mencoes_tarefas: payload.mencoes_tarefas || [],
        })
        .select(`*, autor:usuarios!autor_id(id, nome, email, foto_url)`)
        .single();
    if (error) return { success: false, error: error.message };
    return { success: true, mensagem: data as Mensagem };
}

export async function deleteMensagem(id: string) {
    // 1. Fetch to see if it has a file
    const { data: msg } = await supabase
        .from('mensagens')
        .select('arquivo_url')
        .eq('id', id)
        .single();

    // 2. Delete from Storage if needed
    if (msg?.arquivo_url) {
        try {
            const urlObj = new URL(msg.arquivo_url);
            const pathParts = urlObj.pathname.split('/chat-files/');
            if (pathParts.length > 1) {
                const filePath = pathParts[1];
                await supabase.storage.from('chat-files').remove([filePath]);
            }
        } catch (e) {
            console.error("Error deleting file from storage:", e);
        }
    }

    const { error } = await supabase
        .from('mensagens')
        .update({ deletada: true, conteudo: null, arquivo_url: null, arquivo_nome: null, arquivo_tamanho: null })
        .eq('id', id);
    return { success: !error, error: error?.message };
}

// --- Mention Notification ---
export async function createMentionNotification(payload: {
    mencionado_id: string;
    autor_nome: string;
    canal_nome: string;
    canal_id: string;
    mensagem_id: string;
    trecho: string;
}) {
    const { error } = await supabase.from('notificacoes').insert({
        usuario_id: payload.mencionado_id,
        tipo: 'mencao_chat',
        titulo: `${payload.autor_nome} mencionou você em #${payload.canal_nome}`,
        mensagem: `"${payload.trecho.slice(0, 100)}"`,
        redirecionamento: `/chat?canal=${payload.canal_id}&msg=${payload.mensagem_id}`,
        modulo_origem: 'chat',
    });
    return { success: !error, error: error?.message };
}

// --- File upload ---
function sanitizeFilename(name: string): string {
    return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/\s+/g, '_')           // Spaces to underscores
        .replace(/[^a-zA-Z0-9._-]/g, '') // Only safe chars
        .slice(0, 200);                 // Limit length
}

export async function uploadChatFile(file: File, canalId: string) {
    const safeName = sanitizeFilename(file.name);
    const filePath = `${canalId}/${Date.now()}_${safeName}`;
    const { data, error } = await supabase.storage.from('chat-files').upload(filePath, file, { upsert: false });
    if (error) return { success: false, error: error.message };
    const { data: urlData } = supabase.storage.from('chat-files').getPublicUrl(data.path);
    return { success: true, url: urlData.publicUrl, nome: file.name, tamanho: file.size };
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

export function useFinancialTaxes() {
    return useSupabaseTable<FinancialTax>('financial_taxes', { column: 'data_vencimento', ascending: true });
}

export async function addFinancialTax(tax: Omit<FinancialTax, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('financial_taxes').insert(tax).select().single();
    if (error) throw error;
    return data as FinancialTax;
}

export async function updateFinancialTax(id: string, updates: Partial<FinancialTax>) {
    const { data, error } = await supabase.from('financial_taxes').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as FinancialTax;
}

export async function removeFinancialTax(id: string) {
    const { error } = await supabase.from('financial_taxes').delete().eq('id', id);
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

// ===== COMERCIAL TASKS =====
export function useComercialTasks() {
    return useSupabaseTable<ComercialTask>('comercial_tasks', { column: 'created_at', ascending: false });
}

export async function addComercialTask(task: Omit<ComercialTask, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('comercial_tasks').insert(task).select().single();
    if (error) throw error;
    return data as ComercialTask;
}

export async function updateComercialTask(id: string, updates: Partial<ComercialTask>) {
    const { data, error } = await supabase.from('comercial_tasks').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return data as ComercialTask;
}

export async function removeComercialTask(id: string) {
    const { error } = await supabase.from('comercial_tasks').delete().eq('id', id);
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
/**
 * Fetches calendar events for a specific user.
 * userId=null will fetch no events. Use 'all' to fetch all events (admins only).
 */
export function useCalendarEvents(userId?: string | null) {
    const [data, setData] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        let query = supabase.from('calendar_events').select('*').order('data', { ascending: true });
        // If userId is provided, filter to events owned or participated in by that user
        if (userId && userId !== 'all') {
            query = query.or(`owner_id.eq.${userId},participantes_ids.cs.{${userId}}`);
        }
        const { data: result, error: err } = await query;
        if (err) {
            console.error('Error fetching calendar_events:', err);
        } else {
            setData((result as CalendarEvent[]) ?? []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]);

    return { data, loading, setData, refetch: fetchData };
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

/**
 * Sends task assignment notifications to all newly added assignees and
 * creates a calendar event for each one with the task dates.
 */
export async function sendAssigneeNotificationsAndCalendar(
    newIds: string[],
    taskTitle: string,
    modulo: string,
    taskId: string,
    dataInicio?: string,
    dataTermino?: string,
    cor?: string
): Promise<void> {
    const path = `/${modulo.toLowerCase()}`;
    await Promise.allSettled(newIds.map(async (uid) => {
        // Notification
        await createNotificationIfEnabled(
            uid,
            'tarefa_atribuida',
            `Você foi adicionado à tarefa '${taskTitle}' em ${modulo}.`,
            `Você foi adicionado à tarefa '${taskTitle}' em ${modulo}.`,
            `${path}?task_id=${taskId}`,
            modulo
        );
        // Calendar event (only if dates are provided)
        if (dataInicio || dataTermino) {
            await addCalendarEvent({
                titulo: `[${modulo}] ${taskTitle}`,
                data: dataInicio || dataTermino || '',
                hora_inicio: undefined,
                hora_fim: undefined,
                participantes_ids: [uid],
                owner_id: uid,
                descricao: `Tarefa no módulo ${modulo}`,
                cor: cor || '#3B82F6',
                origem: 'tarefa',
            });
        }
    }));
}

// =========== TEMPLATES MODULE ===========

const SUPABASE_STORAGE_URL = 'https://hlqftzvwilbwchfqelqy.supabase.co/storage/v1/object/public';

export function useTemplateCategorias(tipo?: 'modelo' | 'site') {
    const [data, setData] = useState<TemplateCategoria[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCategorias = async () => {
        setLoading(true);
        let query = supabase.from('template_categorias').select('*').order('nome');
        if (tipo) query = query.eq('tipo', tipo);
        const { data: result, error } = await query;
        if (error) console.error('Error fetching template_categorias:', error);
        else setData((result as TemplateCategoria[]) ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchCategorias(); }, [tipo]);
    return { data, loading, refetch: fetchCategorias };
}

export async function createTemplateCategoria(nome: string, tipo: 'modelo' | 'site') {
    const { data, error } = await supabase.from('template_categorias').insert({ nome, tipo }).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

export async function updateTemplateCategoria(id: string, nome: string) {
    const { error } = await supabase.from('template_categorias').update({ nome }).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function deleteTemplateCategoria(id: string) {
    const { error } = await supabase.from('template_categorias').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

export function useTemplateModelos() {
    const [data, setData] = useState<TemplateModelo[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchModelos = async () => {
        setLoading(true);
        const { data: result, error } = await supabase
            .from('template_modelos')
            .select('*, categoria:template_categorias(id, nome, tipo), responsavel:usuarios!responsavel_id(id, nome, email, foto_url)')
            .order('created_at', { ascending: false });
        if (error) console.error('Error fetching template_modelos:', error);
        else setData((result as TemplateModelo[]) ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchModelos(); }, []);
    return { data, loading, refetch: fetchModelos };
}

export async function createTemplateModelo(payload: Omit<TemplateModelo, 'id' | 'created_at' | 'categoria' | 'responsavel'>) {
    const { data, error } = await supabase.from('template_modelos').insert(payload).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

export async function updateTemplateModelo(id: string, updates: Partial<Omit<TemplateModelo, 'id' | 'created_at' | 'categoria' | 'responsavel'>>) {
    const { error } = await supabase.from('template_modelos').update(updates).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function deleteTemplateModelo(id: string) {
    const { error } = await supabase.from('template_modelos').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

export function useTemplateSites() {
    const [data, setData] = useState<TemplateSite[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSites = async () => {
        setLoading(true);
        const { data: result, error } = await supabase
            .from('template_sites')
            .select('*, categoria:template_categorias(id, nome, tipo)')
            .order('nome');
        if (error) console.error('Error fetching template_sites:', error);
        else setData((result as TemplateSite[]) ?? []);
        setLoading(false);
    };

    useEffect(() => { fetchSites(); }, []);
    return { data, loading, refetch: fetchSites };
}

export async function createTemplateSite(payload: Omit<TemplateSite, 'id' | 'created_at' | 'categoria'>) {
    const { data, error } = await supabase.from('template_sites').insert(payload).select().single();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

export async function updateTemplateSite(id: string, updates: Partial<Omit<TemplateSite, 'id' | 'created_at' | 'categoria'>>) {
    const { error } = await supabase.from('template_sites').update(updates).eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function deleteTemplateSite(id: string) {
    const { error } = await supabase.from('template_sites').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function uploadTemplateImage(file: File): Promise<{ url: string | null; error?: string }> {
    const ext = file.name.split('.').pop();
    const filePath = `modelos/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from('template-images').upload(filePath, file, { upsert: false });
    if (error) return { url: null, error: error.message };
    const { data: urlData } = supabase.storage.from('template-images').getPublicUrl(data.path);
    return { url: urlData.publicUrl };
}

// --- Task Mentions ---
export function useActiveTasksForMention(userModules: string[] = []) {
    const [tasks, setTasks] = useState<ActiveTaskMention[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        const fetchTasks = async () => {
            setLoading(true);
            const allTasks: ActiveTaskMention[] = [];

            try {
                // Operacional
                if (userModules.includes('/operacional') || userModules.length === 0) {
                    const { data: opData } = await supabase.from('tarefas_operacionais')
                        .select('id, titulo, cliente_nome, status')
                        .not('status', 'in', '("Finalizado", "concluido")');
                    if (opData) {
                        allTasks.push(...opData.map((t: any) => ({
                            id: t.id,
                            title: `${t.cliente_nome} - ${t.titulo}`,
                            module: 'Operacional' as const,
                            status: t.status
                        })));
                    }
                }

                // Comercial
                if (userModules.includes('/comercial') || userModules.length === 0) {
                    const { data: comData } = await supabase.from('deals')
                        .select('id, title, company, stage')
                        .not('stage', 'in', '("fechado", "perdido")');
                    if (comData) {
                        const stageMap: Record<string, string> = {
                            prospeccao: 'Prospecção',
                            diagnostico: 'Diagnóstico',
                            negociacao: 'Negociação'
                        };
                        allTasks.push(...comData.map((d: any) => ({
                            id: d.id,
                            title: `${d.company} - ${d.title}`,
                            module: 'Comercial' as const,
                            status: stageMap[d.stage] || d.stage
                        })));
                    }
                    // Also include internal team tasks
                    const { data: tarefasData } = await supabase.from('comercial_tasks')
                        .select('id, titulo, status')
                        .not('status', 'eq', 'Finalizado');
                    if (tarefasData) {
                        allTasks.push(...tarefasData.map((t: any) => ({
                            id: t.id,
                            title: t.titulo,
                            module: 'Comercial' as const,
                            status: t.status
                        })));
                    }
                }


                // Administrativo
                if (userModules.includes('/administrativo') || userModules.includes('/configuracoes') || userModules.length === 0) {
                    const { data: admData } = await supabase.from('admin_demands')
                        .select('id, titulo, status')
                        .not('status', 'in', '("Finalizado")');
                    if (admData) {
                        allTasks.push(...admData.map((a: any) => ({
                            id: a.id,
                            title: a.titulo,
                            module: 'Administrativo' as const,
                            status: a.status
                        })));
                    }
                }

                // Financeiro
                if (userModules.includes('/financeiro') || userModules.length === 0) {
                    const { data: finData } = await supabase.from('financial_transactions')
                        .select('id, descricao, status')
                        .eq('status', 'pendente');
                    if (finData) {
                        allTasks.push(...finData.map((f: any) => ({
                            id: f.id,
                            title: f.descricao,
                            module: 'Financeiro' as const,
                            status: 'Pendente' // Format to display
                        })));
                    }
                }

                if (mounted) setTasks(allTasks);
            } catch (err) {
                console.error("Error fetching tasks for mention:", err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchTasks();
        return () => { mounted = false; };
    }, [userModules]);

    return { tasks, loading };
}

// ===== DIRETÓRIO MODULE =====

// 1. Clientes
export function useDiretorioClientes() {
    return useSupabaseTable<DiretorioCliente>('diretorio_clientes', { column: 'nome', ascending: true });
}
export async function addDiretorioCliente(cliente: Omit<DiretorioCliente, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('diretorio_clientes').insert(cliente).select().single();
    if (error) throw error; return data as DiretorioCliente;
}
export async function updateDiretorioCliente(id: string, updates: Partial<DiretorioCliente>) {
    const { data, error } = await supabase.from('diretorio_clientes').update(updates).eq('id', id).select().single();
    if (error) throw error; return data as DiretorioCliente;
}
export async function removeDiretorioCliente(id: string) {
    const { error } = await supabase.from('diretorio_clientes').delete().eq('id', id);
    if (error) throw error;
}

// 2. Contatos
export function useDiretorioContatos(clienteId: string | null) {
    const [data, setData] = useState<DiretorioContato[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!clienteId) { setData([]); setLoading(false); return; }
        supabase.from('diretorio_contatos').select('*').eq('cliente_id', clienteId).order('nome').then(({ data }) => {
            setData(data || []); setLoading(false);
        });
    }, [clienteId]);
    return { data, loading, setData };
}
export async function addDiretorioContato(contato: Omit<DiretorioContato, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('diretorio_contatos').insert(contato).select().single();
    if (error) throw error; return data as DiretorioContato;
}
export async function updateDiretorioContato(id: string, updates: Partial<DiretorioContato>) {
    const { data, error } = await supabase.from('diretorio_contatos').update(updates).eq('id', id).select().single();
    if (error) throw error; return data as DiretorioContato;
}
export async function removeDiretorioContato(id: string) {
    const { error } = await supabase.from('diretorio_contatos').delete().eq('id', id);
    if (error) throw error;
}

// 3. Logins
export function useDiretorioLogins(clienteId: string | null) {
    const [data, setData] = useState<DiretorioLogin[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!clienteId) { setData([]); setLoading(false); return; }
        // We do NOT select senha_criptografada to avoid exposing it unnecessarily on initial load, but for simplicity we select all here
        // The password remains hashed
        supabase.from('diretorio_logins').select('*').eq('cliente_id', clienteId).order('plataforma').then(({ data }) => {
            setData(data || []); setLoading(false);
        });
    }, [clienteId]);
    return { data, loading, setData };
}
export async function upsertDiretorioLogin(params: {
    p_id?: string | null;
    p_cliente_id: string;
    p_plataforma: string;
    p_email_acesso?: string;
    p_raw_password?: string;
    p_url_acesso?: string;
    p_observacoes?: string;
}) {
    const { data, error } = await supabase.rpc('upsert_diretorio_login', params);
    if (error) throw error; return data as DiretorioLogin;
}
export async function removeDiretorioLogin(id: string) {
    const { error } = await supabase.from('diretorio_logins').delete().eq('id', id);
    if (error) throw error;
}
export async function revealDiretorioPassword(loginId: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('reveal_diretorio_login_password', { p_login_id: loginId });
    if (error) throw error; return data;
}

// 4. Assinaturas
export function useDiretorioAssinaturas(clienteId: string | null) {
    const [data, setData] = useState<DiretorioAssinatura[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!clienteId) { setData([]); setLoading(false); return; }
        supabase.from('diretorio_assinaturas').select('*').eq('cliente_id', clienteId).order('data_vencimento').then(({ data }) => {
            setData(data || []); setLoading(false);
        });
    }, [clienteId]);
    return { data, loading, setData };
}

export function useAllDiretorioAssinaturas() {
    const [data, setData] = useState<DiretorioAssinatura[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        supabase.from('diretorio_assinaturas').select('*').order('data_vencimento').then(({ data }) => {
            setData(data || []); setLoading(false);
        });
    }, []);
    return { data, loading, setData };
}
export async function addDiretorioAssinatura(assinatura: Omit<DiretorioAssinatura, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('diretorio_assinaturas').insert(assinatura).select().single();
    if (error) throw error; return data as DiretorioAssinatura;
}
export async function updateDiretorioAssinatura(id: string, updates: Partial<DiretorioAssinatura>) {
    const { data, error } = await supabase.from('diretorio_assinaturas').update(updates).eq('id', id).select().single();
    if (error) throw error; return data as DiretorioAssinatura;
}
export async function removeDiretorioAssinatura(id: string) {
    const { error } = await supabase.from('diretorio_assinaturas').delete().eq('id', id);
    if (error) throw error;
}
// 4b. Ferramentas Predefinidas (Diretório)
export function useDiretorioFerramentasPredefinidas() {
    return useSupabaseTable<DiretorioFerramentaPredefinida>('diretorio_ferramentas_predefinidas', { column: 'name', ascending: true });
}
export async function addDiretorioFerramentaPredefinida(ferramenta: Omit<DiretorioFerramentaPredefinida, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('diretorio_ferramentas_predefinidas').insert(ferramenta).select().single();
    if (error) throw error; return data as DiretorioFerramentaPredefinida;
}
export async function removeDiretorioFerramentaPredefinida(id: string) {
    const { error } = await supabase.from('diretorio_ferramentas_predefinidas').delete().eq('id', id);
    if (error) throw error;
}

// 5. Custos
export function useDiretorioCustos(clienteId: string | null) {
    const [data, setData] = useState<DiretorioCusto[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!clienteId) { setData([]); setLoading(false); return; }
        supabase.from('diretorio_custos').select('*').eq('cliente_id', clienteId).order('mes_ano', { ascending: false }).then(({ data }) => {
            setData(data || []); setLoading(false);
        });
    }, [clienteId]);
    return { data, loading, setData };
}

export function useDiretorioCustosAll() {
    return useSupabaseTable<DiretorioCusto>('diretorio_custos', { column: 'mes_ano', ascending: false });
}
export async function addDiretorioCusto(custo: Omit<DiretorioCusto, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('diretorio_custos').insert(custo).select().single();
    if (error) throw error; return data as DiretorioCusto;
}
export async function updateDiretorioCusto(id: string, updates: Partial<DiretorioCusto>) {
    const { data, error } = await supabase.from('diretorio_custos').update(updates).eq('id', id).select().single();
    if (error) throw error; return data as DiretorioCusto;
}
export async function removeDiretorioCusto(id: string) {
    const { error } = await supabase.from('diretorio_custos').delete().eq('id', id);
    if (error) throw error;
}

// 6. Colaboradores
export function useDiretorioColaboradores() {
    return useSupabaseTable<DiretorioColaborador>('diretorio_colaboradores', { column: 'nome', ascending: true });
}
export async function addDiretorioColaborador(colab: Omit<DiretorioColaborador, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('diretorio_colaboradores').insert(colab).select().single();
    if (error) throw error; return data as DiretorioColaborador;
}
export async function updateDiretorioColaborador(id: string, updates: Partial<DiretorioColaborador>) {
    const { data, error } = await supabase.from('diretorio_colaboradores').update(updates).eq('id', id).select().single();
    if (error) throw error; return data as DiretorioColaborador;
}
export async function removeDiretorioColaborador(id: string) {
    const { error } = await supabase.from('diretorio_colaboradores').delete().eq('id', id);
    if (error) throw error;
}

// 7. Colaborador Plataformas
export function useDiretorioColabPlataformas(colaboradorId: string | null) {
    const [data, setData] = useState<DiretorioColabPlataforma[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!colaboradorId) { setData([]); setLoading(false); return; }
        supabase.from('diretorio_colab_plataformas').select('*').eq('colaborador_id', colaboradorId).order('plataforma').then(({ data }) => {
            setData(data || []); setLoading(false);
        });
    }, [colaboradorId]);
    return { data, loading, setData };
}
export async function addDiretorioColabPlataforma(plat: Omit<DiretorioColabPlataforma, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('diretorio_colab_plataformas').insert(plat).select().single();
    if (error) throw error; return data as DiretorioColabPlataforma;
}
export async function updateDiretorioColabPlataforma(id: string, updates: Partial<DiretorioColabPlataforma>) {
    const { data, error } = await supabase.from('diretorio_colab_plataformas').update(updates).eq('id', id).select().single();
    if (error) throw error; return data as DiretorioColabPlataforma;
}
export async function removeDiretorioColabPlataforma(id: string) {
    const { error } = await supabase.from('diretorio_colab_plataformas').delete().eq('id', id);
    if (error) throw error;
}

// 8. Colaborador Documentos
export function useDiretorioColabDocumentos(colaboradorId: string | null) {
    const [data, setData] = useState<DiretorioColabDocumento[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!colaboradorId) { setData([]); setLoading(false); return; }
        supabase.from('diretorio_colab_documentos').select('*').eq('colaborador_id', colaboradorId).order('created_at', { ascending: false }).then(({ data }) => {
            setData(data || []); setLoading(false);
        });
    }, [colaboradorId]);
    return { data, loading, setData };
}
export async function addDiretorioColabDocumento(doc: Omit<DiretorioColabDocumento, 'id' | 'created_at'>) {
    const { data, error } = await supabase.from('diretorio_colab_documentos').insert(doc).select().single();
    if (error) throw error; return data as DiretorioColabDocumento;
}
export async function updateDiretorioColabDocumento(id: string, updates: Partial<DiretorioColabDocumento>) {
    const { data, error } = await supabase.from('diretorio_colab_documentos').update(updates).eq('id', id).select().single();
    if (error) throw error; return data as DiretorioColabDocumento;
}
export async function removeDiretorioColabDocumento(id: string) {
    const { error } = await supabase.from('diretorio_colab_documentos').delete().eq('id', id);
    if (error) throw error;
}
export async function uploadDiretorioDocumento(file: File, colaboradorId: string) {
    const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100);
    const filePath = `${colaboradorId}/${Date.now()}_${safeName}`;
    const { data, error } = await supabase.storage.from('diretorio-docs').upload(filePath, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from('diretorio-docs').getPublicUrl(data.path);
    return urlData.publicUrl;
}
