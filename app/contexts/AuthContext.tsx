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
    'Admin Geral': ['/', '/comercial', '/financeiro', '/operacional', '/calendario', '/chat', '/templates', '/diretorio', '/configuracoes', '/notificacoes'],
    'Administrativa': ['/', '/calendario', '/chat', '/templates', '/diretorio', '/notificacoes'],
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
                // If no profile found, sign out to prevent unauthorized access
                console.error('User profile not found for ID:', userId, error);
                await supabase.auth.signOut();
                return;
            }

            const isAdminGeral = data.categoria === 'Admin Geral';
            const perfil: UsuarioPerfil = {
                id: data.id,
                nome: data.nome,
                email: data.email,
                cargo: data.cargo,
                categoria: data.categoria as UserCategory,
                foto_url: data.foto_url,
                modulos_acesso: isAdminGeral
                    ? DEFAULT_MODULES_BY_CATEGORY['Admin Geral']
                    : (data.modulos_acesso?.length
                        ? data.modulos_acesso
                        : DEFAULT_MODULES_BY_CATEGORY[data.categoria as UserCategory] || ['/']),
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
        let mounted = true;

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }: any) => {
            if (!mounted) return;
            setSession(session);
            if (session?.user) {
                loadProfile(session.user.id).finally(() => {
                    if (mounted) setLoading(false);
                });
            } else {
                setLoading(false);
            }
        });

        // Listen to auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
            if (!mounted) return;
            setSession(session);
            if (session?.user) {
                loadProfile(session.user.id);
            } else {
                setUser(null);
                // Use a functional update or a ref if loading was needed, 
                // but here we can just check the current state if we really need to redirect.
                // However, the middleware already handles the main redirect.
                router.replace('/login');
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [loadProfile, router]);

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
