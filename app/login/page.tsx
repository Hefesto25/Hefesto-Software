'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Redirect if already logged in
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) router.replace('/');
        });
    }, [router]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (!email || !password) return;
        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (authError) {
                if (
                    authError.message.includes('Invalid login credentials') ||
                    authError.message.includes('Invalid email or password') ||
                    authError.status === 400
                ) {
                    setError('E-mail ou senha incorretos. Tente novamente.');
                } else {
                    setError('Erro ao conectar. Verifique sua conexão e tente novamente.');
                }
                setLoading(false);
                return;
            }

            // Success — middleware will handle redirect, but push manually too
            router.push('/');
        } catch {
            setError('Erro ao conectar. Verifique sua conexão e tente novamente.');
            setLoading(false);
        }
    }

    return (
        <div className="login-page" style={{ background: 'transparent', overflow: 'hidden' }}>
            {/* Background Looping GIF (Blurred) */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 0,
                overflow: 'hidden',
                background: '#0a0a0f'
            }}>
                <img
                    src="/login-bg.gif"
                    alt="Background Animation"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transform: 'scale(1.1)',
                        filter: 'blur(8px) brightness(0.6)'
                    }}
                />
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, rgba(14, 20, 66, 0.4) 0%, rgba(8, 11, 42, 0.8) 100%)',
                    zIndex: 1
                }} />
            </div>

            <div className="login-card" style={{ position: 'relative', zIndex: 10 }}>
                {/* Logo */}
                <div className="login-logo">
                    <div className="login-logo-icon">
                        <img src="/logo.png" alt="Hefesto Logo" />
                    </div>
                    <div>
                        <h1 className="login-logo-title">HEFESTO IA</h1>
                        <span className="login-logo-subtitle">Software Interno</span>
                    </div>
                </div>

                {/* Form */}
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="login-field">
                        <label className="login-label" htmlFor="email">E-mail</label>
                        <input
                            id="email"
                            type="email"
                            className="login-input"
                            placeholder="seu@hefestoia.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            autoComplete="email"
                            disabled={loading}
                            required
                        />
                    </div>

                    <div className="login-field">
                        <label className="login-label" htmlFor="password">Senha</label>
                        <div className="login-input-wrapper">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className="login-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                autoComplete="current-password"
                                disabled={loading}
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                className="login-eye-btn"
                                onClick={() => setShowPassword(v => !v)}
                                tabIndex={-1}
                                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="login-error" role="alert">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="login-btn"
                        disabled={loading || !email || !password}
                    >
                        {loading ? (
                            <>
                                <Loader2 size={16} className="login-spinner" />
                                Entrando...
                            </>
                        ) : (
                            <>
                                <LogIn size={16} />
                                Entrar
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
