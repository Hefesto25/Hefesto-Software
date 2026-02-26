'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserCategory = 'Administrativa' | 'Financeira' | 'Operacional' | 'Comercial' | 'Jurídica' | 'Admin Geral';

interface User {
    id: string;
    name: string;
    category: UserCategory;
    avatar_url?: string;
    initials: string;
    allowed_modules?: string[];
}

interface AuthContextType {
    user: User;
    switchCategory: (category: UserCategory) => void;
    getAllowedModules: () => string[];
}

const defaultUser: User = {
    id: '1',
    name: 'Marcel Sgarioni',
    category: 'Admin Geral',
    initials: 'MS',
    avatar_url: '',
    allowed_modules: ['/', '/comercial', '/financeiro', '/operacional', '/administrativo', '/juridica', '/calendario', '/chat', '/configuracoes']
};

// Map Categories to allowed routes
const moduleAccessMap: Record<UserCategory, string[]> = {
    'Admin Geral': ['/', '/comercial', '/financeiro', '/operacional', '/administrativo', '/juridica', '/calendario', '/chat', '/configuracoes'],
    'Administrativa': ['/', '/administrativo', '/calendario', '/chat', '/configuracoes'],
    'Financeira': ['/', '/financeiro', '/calendario', '/chat', '/configuracoes'],
    'Operacional': ['/', '/operacional', '/calendario', '/chat', '/configuracoes'],
    'Comercial': ['/', '/comercial', '/calendario', '/chat', '/configuracoes'],
    'Jurídica': ['/', '/juridica', '/calendario', '/chat', '/configuracoes'],
};

const AuthContext = createContext<AuthContextType>({
    user: defaultUser,
    switchCategory: () => { },
    getAllowedModules: () => moduleAccessMap['Admin Geral']
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User>(defaultUser);

    const switchCategory = (category: UserCategory) => {
        setUser(prev => ({ ...prev, category, allowed_modules: moduleAccessMap[category] || moduleAccessMap['Admin Geral'] }));
    };

    const getAllowedModules = () => {
        return user.allowed_modules || moduleAccessMap[user.category];
    };

    return (
        <AuthContext.Provider value={{ user, switchCategory, getAllowedModules }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
