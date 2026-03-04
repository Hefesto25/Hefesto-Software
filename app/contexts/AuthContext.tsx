'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export type UserCategory = 'Admin Geral' | 'Administrativa' | 'Financeira' | 'Operacional' | 'Comercial';

export interface UsuarioPerfil {
    id: string;
    nome: string;
    email: string;
    cargo?: string;
    categoria: UserCategory;
    foto_url?: string;
    modulos_acesso: string[];
    permissao_diretorio_clientes?: boolean;
    permissao_diretorio_colaboradores?: 'nenhuma' | 'basico' | 'sensivel';
    // Computed
    initials: string;
}

interface AuthContextType {
    user: UsuarioPerfil | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
    getAllowedModules: () => string[];
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signOut: async () => { },
    getAllowedModules: () => ['/'],
});

function getInitials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(n => n[0].toUpperCase())
        .join('');
}

const DEFAULT_MODULES_BY_CATEGORY: Record<UserCategory, string[]> = {
    'Admin Geral': ['/', '/comercial', '/financeiro', '/operacional', '/administrativo', '/calendario', '/chat', '/templates', '/diretorio', '/configuracoes', '/notificacoes'],
    'Administrativa': ['/', '/administrativo', '/calendario', '/chat', '/templates', '/diretorio', '/notificacoes'],
    'Financeira': ['/', '/financeiro', '/calendario', '/chat', '/notificacoes'],
    'Operacional': ['/', '/operacional', '/calendario', '/chat', '/notificacoes'],
    'Comercial': ['/', '/comercial', '/calendario', '/chat', '/notificacoes'],
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UsuarioPerfil | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const loadProfile = useCallback(async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error || !data) {
                // If no profile found, create a minimal one from auth user
                const { data: authUser } = await supabase.auth.getUser();
                if (authUser?.user) {
                    const fallback: UsuarioPerfil = {
                        id: authUser.user.id,
                        nome: authUser.user.email?.split('@')[0] || 'Usuário',
                        email: authUser.user.email || '',
                        categoria: 'Admin Geral',
                        modulos_acesso: DEFAULT_MODULES_BY_CATEGORY['Admin Geral'],
                        initials: getInitials(authUser.user.email?.split('@')[0] || 'U'),
                    };
                    setUser(fallback);
                }
                return;
            }

            const perfil: UsuarioPerfil = {
                id: data.id,
                nome: data.nome,
                email: data.email,
                cargo: data.cargo,
                categoria: data.categoria as UserCategory,
                foto_url: data.foto_url,
                modulos_acesso: data.modulos_acesso?.length
                    ? data.modulos_acesso
                    : DEFAULT_MODULES_BY_CATEGORY[data.categoria as UserCategory] || ['/'],
                permissao_diretorio_clientes: data.permissao_diretorio_clientes,
                permissao_diretorio_colaboradores: data.permissao_diretorio_colaboradores,
                initials: getInitials(data.nome),
            };
            setUser(perfil);
        } catch (e) {
            console.error('Error loading user profile:', e);
        }
    }, []);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                loadProfile(session.user.id).finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });

        // Listen to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                loadProfile(session.user.id);
            } else {
                setUser(null);
            }
        });

        return () => subscription.unsubscribe();
    }, [loadProfile]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        router.replace('/login');
    }, [router]);

    const getAllowedModules = useCallback((): string[] => {
        if (!user) return ['/'];
        return user.modulos_acesso;
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, session, loading, signOut, getAllowedModules }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
