'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
    Send, Hash, Plus, Paperclip, X, Users, Trash2, Settings, Reply, Download, FileText,
    Image as ImageIcon, FolderKanban, Activity, LayoutDashboard, Clock, ChevronLeft,
    Search, MessageSquare, Pin, Loader2
} from 'lucide-react';
import {
    useCanais, useCanalParticipantes, useMensagens, useUsuarios,
    createCanal, updateCanal, deleteCanal, addParticipante, removeParticipante,
    sendMensagem, deleteMensagem, createMentionNotification, uploadChatFile,
    useActiveTasksForMention, useDMs, useDMMensagens, getOrCreateDM, sendDMMensagem,
    deleteDMMensagem, uploadDMFile, useSearchMensagens, usePinnedMensagens, pinMensagem
} from '@/lib/hooks';
import type { Canal, Mensagem, ActiveTaskMention, DM, DMMensagem } from '@/lib/types';
import type { UsuarioDB } from '@/lib/hooks';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AVATAR_COLORS } from '@/lib/utils';

function getColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }
function getInitials(name: string) { return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase(); }

function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(dateStr: string) {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Hoje';
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

type ModalType = 'create' | 'edit' | 'participants' | 'deleteConfirm' | null;
type ChatMode = 'canais' | 'dms';

export default function ChatPage() {
    const router = useRouter();
    const { user } = useAuth();
    const userId = user?.id;

    // Chat mode
    const [chatMode, setChatMode] = useState<ChatMode>('canais');

    // Canais
    const { data: canais, loading: loadingCanais, setData: setCanais, refetch: refetchCanais } = useCanais(userId);
    const { data: allUsuarios } = useUsuarios();
    const [activeCanalId, setActiveCanalId] = useState<string | null>(null);
    const { data: mensagens, loading: loadingMensagens, setData: setMensagens, refetch: refetchMensagens } = useMensagens(activeCanalId);
    const { data: participantes, refetch: refetchParticipantes } = useCanalParticipantes(activeCanalId);

    // DMs
    const { data: dms, loading: loadingDMs, setData: setDMs, refetch: refetchDMs } = useDMs(userId);
    const [activeDMId, setActiveDMId] = useState<string | null>(null);
    const { data: dmMensagens, loading: loadingDMMensagens, setData: setDMMensagens, refetch: refetchDMMensagens } = useDMMensagens(activeDMId);
    const [searchQuery, setSearchQuery] = useState('');

    // Search Modal
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [searchModalQuery, setSearchModalQuery] = useState('');
    const { results: searchResults, loading: loadingSearch } = useSearchMensagens(searchModalQuery, userId);

    // Pinned Messages
    const [showPinned, setShowPinned] = useState(false);
    const { data: pinnedMensagens, loading: loadingPinned, setData: setPinnedMensagens } = usePinnedMensagens(activeCanalId);

    const [messageText, setMessageText] = useState('');
    const [modal, setModal] = useState<ModalType>(null);
    const [saving, setSaving] = useState(false);
    const [replyTo, setReplyTo] = useState<Mensagem | null>(null);
    const [showParticipantDropdown, setShowParticipantDropdown] = useState(false);

    const [formNome, setFormNome] = useState('');
    const [formDescricao, setFormDescricao] = useState('');
    const [formTipo, setFormTipo] = useState<'canal' | 'grupo_projeto'>('canal');
    const [formParticipantes, setFormParticipantes] = useState<string[]>([]);

    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionIdx, setMentionIdx] = useState(0);
    const [taskMentionQuery, setTaskMentionQuery] = useState<string | null>(null);
    const [taskMentionIdx, setTaskMentionIdx] = useState(0);
    const [selectedTaskModule, setSelectedTaskModule] = useState<ActiveTaskMention['module'] | null>(null);
    const [selectedTasks, setSelectedTasks] = useState<ActiveTaskMention[]>([]);

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { tasks: activeTasks } = useActiveTasksForMention(user?.modulos_acesso || []);
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

    // Set initial channel
    useEffect(() => {
        if (chatMode === 'canais' && canais.length > 0 && !activeCanalId) {
            setActiveCanalId(canais[0].id);
        }
        if (chatMode === 'dms' && dms.length > 0 && !activeDMId) {
            setActiveDMId(dms[0].id);
        }
    }, [canais, dms, chatMode, activeCanalId, activeDMId]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mensagens, dmMensagens]);

    // Realtime: Canais
    useEffect(() => {
        if (!activeCanalId || chatMode !== 'canais') return;
        const channel = supabase
            .channel(`chat-messages-${activeCanalId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'mensagens',
                filter: `canal_id=eq.${activeCanalId}`,
            }, async (payload) => {
                const { data } = await supabase
                    .from('mensagens')
                    .select('*, autor:usuarios!autor_id(id, nome, email, foto_url)')
                    .eq('id', payload.new.id)
                    .single();
                if (data) {
                    setMensagens((prev: Mensagem[]) => {
                        if (prev.some(m => m.id === data.id)) return prev;
                        return [...prev, data as Mensagem];
                    });
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [activeCanalId, chatMode, setMensagens]);

    // Realtime: DMs
    useEffect(() => {
        if (!activeDMId || chatMode !== 'dms') return;
        const channel = supabase
            .channel(`dm-messages-${activeDMId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'dm_mensagens',
                filter: `dm_id=eq.${activeDMId}`,
            }, async (payload) => {
                const { data } = await supabase
                    .from('dm_mensagens')
                    .select('*, autor:usuarios!autor_id(id, nome, email, foto_url)')
                    .eq('id', payload.new.id)
                    .single();
                if (data) {
                    setDMMensagens((prev: DMMensagem[]) => {
                        if (prev.some(m => m.id === data.id)) return prev;
                        return [...prev, data as DMMensagem];
                    });
                }
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [activeDMId, chatMode, setDMMensagens]);

    // Presence
    useEffect(() => {
        if (!userId) return;
        const presenceChannel = supabase.channel('online-users', { config: { presence: { key: userId } } });
        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const ids = new Set<string>();
                Object.keys(state).forEach(k => ids.add(k));
                setOnlineUserIds(ids);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({ user_id: userId, online_at: new Date().toISOString() });
                }
            });
        return () => { presenceChannel.untrack(); supabase.removeChannel(presenceChannel); };
    }, [userId]);

    // Keyboard shortcut: Cmd+K for search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setShowSearchModal(prev => !prev);
            }
            if (e.key === 'Escape') {
                setShowSearchModal(false);
                setSearchModalQuery('');
            }
        };
        // Attach to both window and document for better compatibility
        window.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('keydown', handleKeyDown, true);
        return () => {
            window.removeEventListener('keydown', handleKeyDown, true);
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, []);

    // Get current chat context
    const activeCanal = canais.find(c => c.id === activeCanalId);
    const activeDM = dms.find(d => d.id === activeDMId);
    const otherUser = activeDM && userId ? (activeDM.usuario_a_id === userId ? activeDM.usuario_b : activeDM.usuario_a) : null;

    // Handle input
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setMessageText(val);
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = val.slice(0, cursorPos);

        const doubleAtMatch = textBeforeCursor.match(/@@([^@]*)$/);
        if (doubleAtMatch) {
            setTaskMentionQuery(doubleAtMatch[1]);
            setMentionQuery(null);
            return;
        } else {
            setTaskMentionQuery(null);
            setSelectedTaskModule(null);
        }

        const singleAtMatch = textBeforeCursor.match(/(^|\s)@(\w*)$/);
        if (singleAtMatch) {
            setMentionQuery(singleAtMatch[2]);
        } else {
            setMentionQuery(null);
        }
    };

    // Send message
    const handleSend = async () => {
        if (!messageText.trim() || !userId || !user) return;

        const text = messageText.trim();
        const finalMentionedTasks = selectedTasks.filter(task => {
            const pattern = `[[${task.title} | ${task.module} | ${task.status}]]`;
            return text.includes(pattern);
        });

        setMessageText('');
        setReplyTo(null);
        setMentionQuery(null);
        setTaskMentionQuery(null);
        setSelectedTasks([]);

        if (chatMode === 'canais' && activeCanalId) {
            await sendMensagem({
                canal_id: activeCanalId,
                autor_id: userId,
                conteudo: text,
                resposta_de: replyTo?.id || undefined,
                mencoes_tarefas: finalMentionedTasks.length > 0 ? finalMentionedTasks : undefined,
            });
        } else if (chatMode === 'dms' && activeDMId) {
            await sendDMMensagem({
                dm_id: activeDMId,
                autor_id: userId,
                conteudo: text,
            });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // File upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !userId) return;
        if (file.size > 10 * 1024 * 1024) { alert('Tamanho máximo: 10MB'); return; }

        if (chatMode === 'canais' && activeCanalId) {
            const result = await uploadChatFile(file, activeCanalId);
            if (!result.success) { alert('Erro ao enviar arquivo: ' + result.error); return; }
            const tipo = file.type.startsWith('image/') ? 'imagem' : 'arquivo';
            await sendMensagem({
                canal_id: activeCanalId,
                autor_id: userId,
                conteudo: tipo === 'imagem' ? undefined : file.name,
                tipo,
                arquivo_url: result.url,
                arquivo_nome: result.nome,
                arquivo_tamanho: result.tamanho,
            });
        } else if (chatMode === 'dms' && activeDMId) {
            const result = await uploadDMFile(file, activeDMId);
            if (!result.success) { alert('Erro ao enviar arquivo: ' + result.error); return; }
            const tipo = file.type.startsWith('image/') ? 'imagem' : 'arquivo';
            await sendDMMensagem({
                dm_id: activeDMId,
                autor_id: userId,
                conteudo: tipo === 'imagem' ? undefined : file.name,
                tipo,
                arquivo_url: result.url,
                arquivo_nome: result.nome,
                arquivo_tamanho: result.tamanho,
            });
        }
        e.target.value = '';
    };

    // Render messages
    const renderMessages = (msgs: Mensagem[] | DMMensagem[]) => {
        const elements: React.ReactNode[] = [];
        let lastDate = '';
        let lastAuthorId = '';

        msgs.forEach((msg, idx) => {
            const msgDate = new Date(msg.created_at).toDateString();
            if (msgDate !== lastDate) {
                lastDate = msgDate;
                lastAuthorId = '';
                elements.push(
                    <div key={`date-${msgDate}`} className="chat-date-separator">
                        <span>{formatDateSeparator(msg.created_at)}</span>
                    </div>
                );
            }

            const isGrouped = msg.autor_id === lastAuthorId && idx > 0
                && (new Date(msg.created_at).getTime() - new Date(msgs[idx - 1].created_at).getTime()) < 300000;
            lastAuthorId = msg.autor_id || '';

            const authorName = msg.autor?.nome || 'Usuário';
            const authorColor = getColor(authorName);

            elements.push(
                <div key={msg.id} id={`msg-${msg.id}`} className={`chat-message ${isGrouped ? 'grouped' : ''} ${msg.deletada ? 'deleted' : ''}`}>
                    {!isGrouped && (
                        <div className="chat-message-avatar" style={{ background: authorColor }}>
                            {getInitials(authorName)}
                        </div>
                    )}
                    {isGrouped && <div className="chat-message-avatar-spacer" />}
                    <div className="chat-message-content">
                        {!isGrouped && (
                            <div className="chat-message-header">
                                <span className="chat-message-name">{authorName}</span>
                                <span className="chat-message-time">{formatTime(msg.created_at)}</span>
                            </div>
                        )}
                        {msg.deletada ? (
                            <div className="chat-message-text deleted-text">Mensagem apagada</div>
                        ) : msg.tipo === 'imagem' && msg.arquivo_url ? (
                            <div className="chat-message-image">
                                <img src={msg.arquivo_url} alt="Imagem" loading="lazy" onClick={() => window.open(msg.arquivo_url!, '_blank')} />
                            </div>
                        ) : msg.tipo === 'arquivo' && msg.arquivo_url ? (
                            <div className="chat-file-card">
                                <FileText size={20} />
                                <div className="chat-file-info">
                                    <span className="chat-file-name">{msg.arquivo_nome || 'Arquivo'}</span>
                                    <span className="chat-file-size">{msg.arquivo_tamanho ? formatFileSize(msg.arquivo_tamanho) : ''}</span>
                                </div>
                                <a href={msg.arquivo_url} target="_blank" rel="noopener noreferrer" className="chat-file-download">
                                    <Download size={16} />
                                </a>
                            </div>
                        ) : (
                            <div className="chat-message-text">{msg.conteudo || ''}</div>
                        )}

                        {!msg.deletada && (
                            <div className="chat-message-actions">
                                {chatMode === 'canais' && <button onClick={() => setReplyTo(msg as Mensagem)} title="Responder"><Reply size={14} /></button>}
                                {chatMode === 'canais' && (activeCanal?.criador_id === userId || user?.categoria === 'Admin Geral') && 'canal_id' in msg && (
                                    <button
                                        onClick={async () => {
                                            const msgTyped = msg as Mensagem;
                                            await pinMensagem(msgTyped.id, !msgTyped.pinada);
                                            if (!msgTyped.pinada) {
                                                const updated = { ...msgTyped, pinada: true };
                                                setPinnedMensagens([updated, ...pinnedMensagens]);
                                            } else {
                                                setPinnedMensagens(pinnedMensagens.filter(m => m.id !== msgTyped.id));
                                            }
                                        }}
                                        title={(msg as Mensagem).pinada ? 'Desafixar' : 'Afixar'}
                                        style={{ color: (msg as Mensagem).pinada ? 'var(--accent)' : 'inherit' }}
                                    >
                                        <Pin size={14} />
                                    </button>
                                )}
                                {msg.autor_id === userId && (
                                    <button onClick={() => {
                                        if (chatMode === 'canais') deleteMensagem(msg.id);
                                        else if (chatMode === 'dms') deleteDMMensagem(msg.id);
                                    }} title="Apagar"><Trash2 size={14} /></button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        });

        return elements;
    };

    // Render sidebar
    const filteredDMs = dms.filter(dm => {
        const name = dm.usuario_a_id === userId ? dm.usuario_b?.nome : dm.usuario_a?.nome;
        return !searchQuery || name?.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const filteredCanais = canais.filter(c => !searchQuery || c.nome.toLowerCase().includes(searchQuery.toLowerCase()));

    if (loadingCanais || loadingDMs) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)' }}>Carregando...</div>;
    }

    const isLoading = chatMode === 'canais' ? loadingMensagens : loadingDMMensagens;
    const currentMessages = chatMode === 'canais' ? mensagens : dmMensagens;

    return (
        <div className="chat-layout">
            {/* Skip Link for keyboard navigation */}
            <a href="#chat-main" className="skip-link">Pular para conteúdo principal</a>

            {/* Search Modal */}
            {showSearchModal && (
                <div className="search-modal-overlay" onClick={() => setShowSearchModal(false)}>
                    <div className="search-modal" onClick={e => e.stopPropagation()}>
                        <div className="search-modal-input-wrapper">
                            <input
                                type="text"
                                className="search-modal-input"
                                placeholder="Buscar mensagens... (mín. 2 caracteres)"
                                value={searchModalQuery}
                                onChange={e => setSearchModalQuery(e.target.value)}
                                autoFocus
                                aria-label="Campo de busca de mensagens"
                            />
                        </div>
                        <div className="search-modal-results">
                            {loadingSearch && (
                                <div className="search-modal-empty">
                                    <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                                </div>
                            )}
                            {!loadingSearch && searchResults.length === 0 && searchModalQuery.length >= 2 && (
                                <div className="search-modal-empty">Nenhuma mensagem encontrada</div>
                            )}
                            {!loadingSearch && searchModalQuery.length < 2 && (
                                <div className="search-modal-empty">Digite pelo menos 2 caracteres para buscar</div>
                            )}
                            {searchResults.map((msg) => (
                                <div
                                    key={msg.id}
                                    className="search-result-item"
                                    onClick={() => {
                                        setActiveCanalId(msg.canal_id);
                                        setShowSearchModal(false);
                                        setSearchModalQuery('');
                                        setTimeout(() => {
                                            document.getElementById(`msg-${msg.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }, 100);
                                    }}
                                >
                                    <div className="search-result-canal">#{msg.canal?.nome || 'Canal'}</div>
                                    <div className="search-result-content">{msg.conteudo}</div>
                                    <div className="search-result-meta">
                                        <span>{msg.autor?.nome || 'Usuário'}</span>
                                        <span>{new Date(msg.created_at).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Pinned Messages Panel */}
            {showPinned && chatMode === 'canais' && (
                <div className="pinned-panel">
                    <div className="pinned-panel-header">
                        <span className="pinned-panel-title">📌 Fixadas ({pinnedMensagens.length})</span>
                        <button
                            className="pinned-panel-close"
                            onClick={() => setShowPinned(false)}
                            aria-label="Fechar painel de mensagens fixadas"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className="pinned-panel-list">
                        {pinnedMensagens.length === 0 ? (
                            <div className="pinned-panel-empty">Nenhuma mensagem fixada ainda</div>
                        ) : (
                            pinnedMensagens.map((msg) => (
                                <div key={msg.id} className="pinned-item">
                                    <div className="pinned-item-author">{msg.autor?.nome || 'Usuário'}</div>
                                    <div className="pinned-item-content">{msg.conteudo}</div>
                                    <div className="pinned-item-time">
                                        {new Date(msg.created_at).toLocaleDateString('pt-BR')}
                                    </div>
                                    {(msg.autor_id === userId || activeCanal?.criador_id === userId || user?.categoria === 'Admin Geral') && (
                                        <button
                                            className="pinned-item-unpin"
                                            onClick={async () => {
                                                await pinMensagem(msg.id, false);
                                                setPinnedMensagens(pinnedMensagens.filter(m => m.id !== msg.id));
                                            }}
                                        >
                                            Desafixar
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Create Canal Modal */}
            {modal === 'create' && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setModal(null)}>
                    <div style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: 24, maxWidth: 400, width: '90%', boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, fontWeight: 600 }}>Criar Canal</h2>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Nome</label>
                            <input
                                type="text"
                                value={formNome}
                                onChange={e => setFormNome(e.target.value)}
                                placeholder="Nome do canal"
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: 13, background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                                aria-label="Nome do canal"
                            />
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Descrição</label>
                            <textarea
                                value={formDescricao}
                                onChange={e => setFormDescricao(e.target.value)}
                                placeholder="Descrição (opcional)"
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: 13, background: 'var(--bg-secondary)', color: 'var(--text-primary)', minHeight: 60, boxSizing: 'border-box', fontFamily: 'inherit' }}
                                aria-label="Descrição do canal"
                            />
                        </div>

                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: 'var(--text-muted)' }}>Tipo</label>
                            <select
                                value={formTipo}
                                onChange={e => setFormTipo(e.target.value as 'canal' | 'grupo_projeto')}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-default)', borderRadius: 6, fontSize: 13, background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                                aria-label="Tipo de canal"
                            >
                                <option value="canal">Canal</option>
                                <option value="grupo_projeto">Grupo de Projeto</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setModal(null)}
                                style={{ padding: '8px 16px', border: '1px solid var(--border-default)', borderRadius: 6, background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
                                aria-label="Cancelar"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={async () => {
                                    if (!formNome.trim() || !userId) return;
                                    setSaving(true);
                                    const result = await createCanal({
                                        nome: formNome,
                                        descricao: formDescricao || undefined,
                                        tipo: formTipo,
                                        criador_id: userId,
                                        participante_ids: formParticipantes
                                    });
                                    setSaving(false);
                                    if (result.success) {
                                        setCanais([...canais, result.canal as Canal]);
                                        setFormNome('');
                                        setFormDescricao('');
                                        setFormTipo('canal');
                                        setFormParticipantes([]);
                                        setModal(null);
                                    } else {
                                        alert('Erro ao criar canal: ' + result.error);
                                    }
                                }}
                                disabled={!formNome.trim() || saving}
                                style={{ padding: '8px 16px', background: 'var(--accent)', color: '#000', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: !formNome.trim() || saving ? 0.5 : 1 }}
                                aria-label="Criar canal"
                            >
                                {saving ? 'Criando...' : 'Criar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <nav className="chat-channels" role="navigation" aria-label="Navegação de chat">
                {/* Header com user info */}
                <div className="chat-sidebar-header" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: getColor(user?.nome || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                        {getInitials(user?.nome || '')}
                    </div>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.nome}</div>
                </div>

                {/* Mode Tabs */}
                <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border-default)', padding: '8px 0' }}>
                    <button
                        onClick={() => { setChatMode('dms'); setActiveDMId(null); }}
                        aria-label="Alternar para conversas diretas"
                        aria-pressed={chatMode === 'dms'}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            fontSize: 12,
                            fontWeight: chatMode === 'dms' ? 600 : 500,
                            color: chatMode === 'dms' ? 'var(--accent)' : 'var(--text-muted)',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: chatMode === 'dms' ? '2px solid var(--accent)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <MessageSquare size={14} style={{ marginRight: 6, display: 'inline' }} aria-hidden="true" /> DMs
                    </button>
                    <button
                        onClick={() => { setChatMode('canais'); setActiveCanalId(null); }}
                        aria-label="Alternar para canais"
                        aria-pressed={chatMode === 'canais'}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            fontSize: 12,
                            fontWeight: chatMode === 'canais' ? 600 : 500,
                            color: chatMode === 'canais' ? 'var(--accent)' : 'var(--text-muted)',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: chatMode === 'canais' ? '2px solid var(--accent)' : 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Hash size={14} style={{ marginRight: 6, display: 'inline' }} aria-hidden="true" /> Canais
                    </button>
                </div>

                {/* Search */}
                <div style={{ padding: '12px 12px', borderBottom: '1px solid var(--border-default)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--bg-tertiary)', borderRadius: 8 }}>
                        <Search size={14} color="var(--text-muted)" aria-hidden="true" />
                        <input
                            type="text"
                            placeholder={chatMode === 'dms' ? 'Buscar pessoa...' : 'Buscar canal...'}
                            aria-label={chatMode === 'dms' ? 'Buscar conversa' : 'Buscar canal'}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)' }}
                        />
                    </div>
                </div>

                {/* Content */}
                {chatMode === 'dms' ? (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                        {filteredDMs.length === 0 ? (
                            <div>
                                {searchQuery ? (
                                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                                        Nenhuma conversa encontrada
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>
                                            Usuários Disponíveis
                                        </div>
                                        {allUsuarios?.filter(u => u.id !== userId).map(usuario => (
                                            <button
                                                key={usuario.id}
                                                onClick={async () => {
                                                    const result = await getOrCreateDM(usuario.id);
                                                    if (result.success && result.dmId) {
                                                        setActiveDMId(result.dmId);
                                                        refetchDMs();
                                                    } else {
                                                        alert('Erro ao iniciar conversa: ' + result.error);
                                                    }
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '12px 16px',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    borderBottom: '1px solid var(--border-default)',
                                                    color: 'var(--text-primary)',
                                                    textAlign: 'left',
                                                    cursor: 'pointer',
                                                    fontSize: 13,
                                                    transition: 'background 0.2s'
                                                }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                aria-label={`Iniciar conversa com ${usuario.nome}`}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: getColor(usuario.nome), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                                        {getInitials(usuario.nome)}
                                                    </div>
                                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                                        <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usuario.nome}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usuario.email}</div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                        ) : (
                            filteredDMs.map(dm => {
                                const otherUserId = dm.usuario_a_id === userId ? dm.usuario_b_id : dm.usuario_a_id;
                                const otherUserData = dm.usuario_a_id === userId ? dm.usuario_b : dm.usuario_a;
                                const isActive = activeDMId === dm.id;
                                return (
                                    <div
                                        key={dm.id}
                                        onClick={() => setActiveDMId(dm.id)}
                                        style={{
                                            padding: '8px 12px',
                                            margin: '2px 6px',
                                            borderRadius: 8,
                                            background: isActive ? 'var(--accent-muted)' : 'transparent',
                                            color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10
                                        }}
                                        onMouseEnter={e => !isActive && (e.currentTarget.style.background = 'var(--bg-secondary)')}
                                        onMouseLeave={e => !isActive && (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: getColor(otherUserData?.nome || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                            {getInitials(otherUserData?.nome || '')}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'inherit', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {otherUserData?.nome}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                Ativo agora
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                        <div style={{ padding: '12px 12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Canais</span>
                                <button onClick={() => setModal('create')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 4 }}>
                                    <Plus size={14} />
                                </button>
                            </div>
                            {filteredCanais.filter(c => c.tipo === 'canal').length > 0 ? (
                                filteredCanais.filter(c => c.tipo === 'canal').map(canal => (
                                    <div
                                        key={canal.id}
                                        onClick={() => setActiveCanalId(canal.id)}
                                        style={{
                                            padding: '8px 12px',
                                            margin: '2px 0',
                                            borderRadius: 8,
                                            background: activeCanalId === canal.id ? 'var(--accent-muted)' : 'transparent',
                                            color: activeCanalId === canal.id ? 'var(--accent)' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8
                                        }}
                                        onMouseEnter={e => !activeCanalId === canal.id && (e.currentTarget.style.background = 'var(--bg-secondary)')}
                                        onMouseLeave={e => !activeCanalId === canal.id && (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <Hash size={14} />
                                        <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {canal.nome}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0' }}>Nenhum canal</div>
                            )}
                        </div>

                        <div style={{ padding: '12px 12px', borderTop: '1px solid var(--border-default)' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Grupos</span>
                            {filteredCanais.filter(c => c.tipo === 'grupo_projeto').length > 0 ? (
                                filteredCanais.filter(c => c.tipo === 'grupo_projeto').map(canal => (
                                    <div
                                        key={canal.id}
                                        onClick={() => setActiveCanalId(canal.id)}
                                        style={{
                                            padding: '8px 12px',
                                            margin: '4px 0',
                                            borderRadius: 8,
                                            background: activeCanalId === canal.id ? 'var(--accent-muted)' : 'transparent',
                                            color: activeCanalId === canal.id ? 'var(--accent)' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 8
                                        }}
                                        onMouseEnter={e => !activeCanalId === canal.id && (e.currentTarget.style.background = 'var(--bg-secondary)')}
                                        onMouseLeave={e => !activeCanalId === canal.id && (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <FolderKanban size={14} />
                                        <span style={{ fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {canal.nome}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0' }}>Nenhum grupo</div>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* Main Chat Area */}
            <main className="chat-main" role="main" id="chat-main">
                {activeCanal && chatMode === 'canais' ? (
                    <>
                        <div className="chat-header">
                            <Hash size={18} style={{ color: 'var(--text-muted)' }} />
                            <div style={{ flex: 1 }}>
                                <div className="chat-header-name">{activeCanal.nome}</div>
                                <div className="chat-header-desc">{activeCanal.descricao || ''}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button className="chat-icon-btn" onClick={() => setShowSearchModal(true)} title="Buscar (Cmd+K)" aria-label="Abrir busca de mensagens"><Search size={16} /></button>
                                <button
                                    className="chat-icon-btn"
                                    onClick={() => setShowPinned(!showPinned)}
                                    title="Mensagens fixadas"
                                    aria-label="Mostrar mensagens fixadas"
                                    style={{ position: 'relative' }}
                                >
                                    <Pin size={16} />
                                    {pinnedMensagens.length > 0 && (
                                        <span style={{
                                            position: 'absolute',
                                            top: -4,
                                            right: -4,
                                            background: 'var(--accent)',
                                            color: '#000',
                                            fontSize: 10,
                                            fontWeight: 700,
                                            width: 16,
                                            height: 16,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {pinnedMensagens.length}
                                        </span>
                                    )}
                                </button>
                                <button className="chat-icon-btn" onClick={() => setModal('participants')} title="Membros"><Users size={16} /></button>
                                {(activeCanal.criador_id === userId || user?.categoria === 'Admin Geral') && (
                                    <>
                                        <button className="chat-icon-btn" title="Editar"><Settings size={16} /></button>
                                        <button className="chat-icon-btn" title="Excluir"><Trash2 size={16} /></button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="chat-messages" role="log" aria-live="polite" aria-label="Mensagens do canal">
                            {isLoading ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Carregando mensagens...</div>
                            ) : currentMessages.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: 13 }}>
                                    Nenhuma mensagem ainda. Comece a conversa! 💬
                                </div>
                            ) : (
                                renderMessages(currentMessages)
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {replyTo && (
                            <div className="chat-reply-bar">
                                <Reply size={14} />
                                <span>Respondendo a <strong>{replyTo.autor?.nome || 'Usuário'}</strong>: {replyTo.conteudo?.slice(0, 60)}...</span>
                                <button onClick={() => setReplyTo(null)} className="chat-icon-btn"><X size={14} /></button>
                            </div>
                        )}

                        <div className="chat-input-container">
                            <div className="chat-input">
                                <button onClick={() => fileInputRef.current?.click()} className="chat-icon-btn" aria-label="Anexar arquivo" title="Anexar arquivo">
                                    <Paperclip size={18} aria-hidden="true" />
                                </button>
                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} aria-label="Selecionar arquivo para enviar" />
                                <textarea
                                    ref={inputRef}
                                    placeholder={`Mensagem em #${activeCanal.nome}...`}
                                    value={messageText}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    rows={1}
                                    aria-label={`Campo de mensagem para ${activeCanal.nome}`}
                                />
                                <button onClick={handleSend} disabled={!messageText.trim()} aria-label="Enviar mensagem" title="Enviar">
                                    <Send size={16} aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : activeDM && chatMode === 'dms' && otherUser ? (
                    <>
                        <div className="chat-header">
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: getColor(otherUser.nome), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                                {getInitials(otherUser.nome)}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div className="chat-header-name">{otherUser.nome}</div>
                                <div className="chat-header-desc" style={{ fontSize: 12 }}>
                                    <span style={{ color: onlineUserIds.has(otherUser.id) ? 'var(--success)' : 'var(--text-muted)' }}>●</span> {onlineUserIds.has(otherUser.id) ? 'Online' : 'Offline'}
                                </div>
                            </div>
                        </div>

                        <div className="chat-messages" role="log" aria-live="polite" aria-label={`Mensagens com ${otherUser.nome}`}>
                            {isLoading ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Carregando mensagens...</div>
                            ) : currentMessages.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: 13 }}>
                                    Comece uma conversa com {otherUser.nome}! 👋
                                </div>
                            ) : (
                                renderMessages(currentMessages)
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="chat-input-container">
                            <div className="chat-input">
                                <button onClick={() => fileInputRef.current?.click()} className="chat-icon-btn" aria-label="Anexar arquivo" title="Anexar arquivo">
                                    <Paperclip size={18} aria-hidden="true" />
                                </button>
                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} aria-label="Selecionar arquivo para enviar" />
                                <textarea
                                    ref={inputRef}
                                    placeholder={`Mensagem para ${otherUser.nome}...`}
                                    value={messageText}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    rows={1}
                                    aria-label={`Campo de mensagem para ${otherUser.nome}`}
                                />
                                <button onClick={handleSend} disabled={!messageText.trim()} aria-label="Enviar mensagem" title="Enviar">
                                    <Send size={16} aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', flexDirection: 'column', gap: 16 }}>
                        <MessageSquare size={48} opacity={0.3} />
                        <div style={{ textAlign: 'center', fontSize: 14 }}>
                            {chatMode === 'dms' ? (
                                <>
                                    <div>Selecione uma conversa para começar</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>ou inicie uma nova conversa com um colega</div>
                                </>
                            ) : (
                                <>
                                    <div>Selecione um canal ou crie um novo</div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
