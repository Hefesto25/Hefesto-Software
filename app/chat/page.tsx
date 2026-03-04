'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, Hash, Plus, Paperclip, X, Users, Trash2, Settings, Reply, Download, FileText, Image as ImageIcon, FolderKanban, Activity, LayoutDashboard, Clock, ChevronLeft } from 'lucide-react';
import {
    useCanais, useCanalParticipantes, useMensagens, useUsuarios,
    createCanal, updateCanal, deleteCanal, addParticipante, removeParticipante,
    sendMensagem, deleteMensagem, createMentionNotification, uploadChatFile,
    useActiveTasksForMention
} from '@/lib/hooks';
import type { Canal, Mensagem, ActiveTaskMention } from '@/lib/types';
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

export default function ChatPage() {
    const { user } = useAuth();
    const userId = user?.id;
    const { data: canais, loading: loadingCanais, setData: setCanais, refetch: refetchCanais } = useCanais(userId);
    const { data: allUsuarios } = useUsuarios();
    const [activeCanalId, setActiveCanalId] = useState<string | null>(null);
    const { data: mensagens, loading: loadingMensagens, setData: setMensagens, refetch: refetchMensagens } = useMensagens(activeCanalId);
    const { data: participantes, refetch: refetchParticipantes } = useCanalParticipantes(activeCanalId);

    const [messageText, setMessageText] = useState('');
    const [modal, setModal] = useState<ModalType>(null);
    const [saving, setSaving] = useState(false);
    const [replyTo, setReplyTo] = useState<Mensagem | null>(null);
    const [showParticipantDropdown, setShowParticipantDropdown] = useState(false);

    // Create/Edit form state
    const [formNome, setFormNome] = useState('');
    const [formDescricao, setFormDescricao] = useState('');
    const [formTipo, setFormTipo] = useState<'canal' | 'grupo_projeto'>('canal');
    const [formParticipantes, setFormParticipantes] = useState<string[]>([]);

    // Menção de Usuários
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionIdx, setMentionIdx] = useState(0);

    // Menção de Tarefas
    const [taskMentionQuery, setTaskMentionQuery] = useState<string | null>(null);
    const [taskMentionIdx, setTaskMentionIdx] = useState(0);
    const [selectedTaskModule, setSelectedTaskModule] = useState<ActiveTaskMention['module'] | null>(null);
    const [selectedTasks, setSelectedTasks] = useState<ActiveTaskMention[]>([]);

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch active tasks for mentions based on user permissions
    const { tasks: activeTasks } = useActiveTasksForMention(user?.modulos_acesso || []);

    // Presence state
    const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

    // Set initial channel
    useEffect(() => {
        if (canais.length > 0 && !activeCanalId) setActiveCanalId(canais[0].id);
    }, [canais, activeCanalId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [mensagens]);

    // Realtime: subscribe to new messages for active channel
    useEffect(() => {
        if (!activeCanalId) return;
        const channel = supabase
            .channel(`chat-messages-${activeCanalId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'mensagens',
                filter: `canal_id=eq.${activeCanalId}`,
            }, async (payload) => {
                // Fetch the full message with author join
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
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'mensagens',
                filter: `canal_id=eq.${activeCanalId}`,
            }, (payload) => {
                setMensagens((prev: Mensagem[]) =>
                    prev.map(m => m.id === payload.new.id ? { ...m, ...payload.new } as Mensagem : m)
                );
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [activeCanalId, setMensagens]);

    // Presence tracking
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

        // Inactivity timeout (5 minutes)
        let inactivityTimer: NodeJS.Timeout;
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            presenceChannel.track({ user_id: userId, online_at: new Date().toISOString() });
            inactivityTimer = setTimeout(() => {
                presenceChannel.untrack();
            }, 5 * 60 * 1000);
        };
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keydown', resetTimer);
        resetTimer();

        return () => {
            presenceChannel.untrack();
            supabase.removeChannel(presenceChannel);
            clearTimeout(inactivityTimer);
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
        };
    }, [userId]);

    const activeCanal = canais.find(c => c.id === activeCanalId);
    const onlineMembersCount = participantes.filter(p => onlineUserIds.has(p.usuario_id)).length;

    // Mention logic
    const mentionMembers = useMemo(() => {
        if (mentionQuery === null) return [];
        return participantes
            .filter(p => p.usuario?.nome.toLowerCase().includes(mentionQuery.toLowerCase()) && p.usuario_id !== userId)
            .slice(0, 6);
    }, [mentionQuery, participantes, userId]);

    const filteredTasks = useMemo(() => {
        if (taskMentionQuery === null) return [];
        let filtered = activeTasks;
        if (selectedTaskModule) {
            filtered = filtered.filter(t => t.module === selectedTaskModule);
        }
        if (taskMentionQuery) {
            filtered = filtered.filter(t => t.title.toLowerCase().includes(taskMentionQuery.toLowerCase()));
        }
        return filtered.slice(0, 10);
    }, [taskMentionQuery, selectedTaskModule, activeTasks]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setMessageText(val);
        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = val.slice(0, cursorPos);

        // Check for @@ task mention first
        const doubleAtMatch = textBeforeCursor.match(/@@([^@]*)$/);
        if (doubleAtMatch) {
            setTaskMentionQuery(doubleAtMatch[1]);
            setTaskMentionIdx(0);
            setMentionQuery(null);
            return;
        } else {
            setTaskMentionQuery(null);
            setSelectedTaskModule(null);
        }

        // Check for @ user mention only if not a task mention
        const singleAtMatch = textBeforeCursor.match(/(^|\s)@(\w*)$/);
        if (singleAtMatch) {
            setMentionQuery(singleAtMatch[2]);
            setMentionIdx(0);
            setTaskMentionQuery(null);
        } else {
            setMentionQuery(null);
        }
    };

    const insertMention = (userName: string) => {
        if (!inputRef.current) return;
        const cursorPos = inputRef.current.selectionStart;
        const textBefore = messageText.slice(0, cursorPos);
        const textAfter = messageText.slice(cursorPos);
        const newBefore = textBefore.replace(/@\w*$/, `@${userName} `);
        setMessageText(newBefore + textAfter);
        setMentionQuery(null);
        inputRef.current.focus();
    };

    const insertTaskMention = (task: ActiveTaskMention) => {
        if (!inputRef.current) return;
        const cursorPos = inputRef.current.selectionStart;
        const textBefore = messageText.slice(0, cursorPos);
        const textAfter = messageText.slice(cursorPos);

        // Formato visual no texto: [[Título da Tarefa | Módulo | Fazendo]]
        const formattedTaskText = `[[${task.title} | ${task.module} | ${task.status}]] `;
        const newBefore = textBefore.replace(/@@([^@]*)$/, formattedTaskText);

        setMessageText(newBefore + textAfter);
        setSelectedTasks(prev => [...prev.filter(t => t.id !== task.id), task]);
        setTaskMentionQuery(null);
        setSelectedTaskModule(null);
        inputRef.current.focus();
    };

    // Send message
    const handleSend = async () => {
        if (!messageText.trim() || !activeCanalId || !userId || !user) return;

        const text = messageText.trim();
        // Check which selected tasks are actually present in the final message text
        const finalMentionedTasks = selectedTasks.filter(task => {
            const pattern = `[[${task.title} | ${task.module} | ${task.status}]]`;
            return text.includes(pattern);
        });

        setMessageText('');
        setReplyTo(null);
        setMentionQuery(null);
        setTaskMentionQuery(null);
        setSelectedTasks([]);

        const result = await sendMensagem({
            canal_id: activeCanalId,
            autor_id: userId,
            conteudo: text,
            resposta_de: replyTo?.id || undefined,
            mencoes_tarefas: finalMentionedTasks.length > 0 ? finalMentionedTasks : undefined,
        });

        // Process mentions for notifications
        if (result.success && result.mensagem) {
            const mentionRegex = /@(\S+)/g;
            let match;
            while ((match = mentionRegex.exec(text)) !== null) {
                const mentionedName = match[1];
                const mentionedUser = participantes.find(
                    p => p.usuario?.nome.toLowerCase().startsWith(mentionedName.toLowerCase())
                );
                if (mentionedUser && mentionedUser.usuario_id !== userId) {
                    await createMentionNotification({
                        mencionado_id: mentionedUser.usuario_id,
                        autor_nome: user.nome,
                        canal_nome: activeCanal?.nome || '',
                        canal_id: activeCanalId,
                        mensagem_id: result.mensagem.id,
                        trecho: text,
                    });
                }
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Task Mention Navigation
        if (taskMentionQuery !== null) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setTaskMentionIdx(i => Math.min(i + 1, filteredTasks.length - 1)); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); setTaskMentionIdx(i => Math.max(i - 1, 0)); return; }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                if (filteredTasks.length > 0) {
                    insertTaskMention(filteredTasks[taskMentionIdx]);
                }
                return;
            }
            if (e.key === 'Escape') { setTaskMentionQuery(null); setSelectedTaskModule(null); return; }
        }

        // User Mention Navigation
        if (mentionQuery !== null && mentionMembers.length > 0) {
            if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIdx(i => Math.min(i + 1, mentionMembers.length - 1)); return; }
            if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIdx(i => Math.max(i - 1, 0)); return; }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertMention(mentionMembers[mentionIdx].usuario?.nome || '');
                return;
            }
            if (e.key === 'Escape') { setMentionQuery(null); return; }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // File upload
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeCanalId || !userId) return;
        if (file.size > 10 * 1024 * 1024) { alert('Tamanho máximo: 10MB'); return; }

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
        e.target.value = '';
    };

    // Delete message
    const handleDeleteMsg = async (msgId: string) => {
        await deleteMensagem(msgId);
    };

    // Create channel
    const handleCreateCanal = async () => {
        if (!formNome.trim() || !userId) return;
        setSaving(true);
        const result = await createCanal({
            nome: formNome.trim(),
            descricao: formDescricao.trim() || undefined,
            tipo: formTipo,
            criador_id: userId,
            participante_ids: formParticipantes,
        });
        if (result.success && result.canal) {
            await refetchCanais();
            setActiveCanalId(result.canal.id);
        }
        setSaving(false);
        setModal(null);
    };

    // Edit channel
    const handleEditCanal = async () => {
        if (!activeCanalId || !formNome.trim()) return;
        setSaving(true);
        await updateCanal(activeCanalId, { nome: formNome.trim(), descricao: formDescricao.trim() });
        await refetchCanais();
        setSaving(false);
        setModal(null);
    };

    // Delete channel
    const handleDeleteCanal = async () => {
        if (!activeCanalId) return;
        setSaving(true);
        await deleteCanal(activeCanalId);
        setActiveCanalId(null);
        await refetchCanais();
        setSaving(false);
        setModal(null);
    };

    // Add/remove participant
    const handleToggleParticipante = async (uid: string) => {
        if (!activeCanalId) return;
        const isParticipant = participantes.some(p => p.usuario_id === uid);
        if (isParticipant) await removeParticipante(activeCanalId, uid);
        else await addParticipante(activeCanalId, uid);
        await refetchParticipantes();
    };

    // Open modals
    const openCreateModal = () => {
        setFormNome(''); setFormDescricao(''); setFormTipo('canal'); setFormParticipantes([]);
        setModal('create');
    };
    const openEditModal = () => {
        if (!activeCanal) return;
        setFormNome(activeCanal.nome); setFormDescricao(activeCanal.descricao || '');
        setModal('edit');
    };

    // Handle task click for redirection
    const handleTaskClick = (taskId: string, moduleName: string) => {
        const moduleMap: Record<string, string> = {
            'Operacional': '/operacional',
            'Comercial': '/comercial',
            'Administrativo': '/administrativo',
            'Financeiro': '/financeiro'
        };
        const path = moduleMap[moduleName] || '/';
        const url = `${path}?task_id=${taskId}`;
        window.open(url, '_blank');
    };

    // Render mention text with highlighted mentions (users and tasks)
    const renderMsgText = (text: string, msg: Mensagem) => {
        const parts = text.split(/(\[\[.*?\]\]|@\S+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('[[') && part.endsWith(']]')) {
                // Task Mention
                const inner = part.slice(2, -2);
                const segments = inner.split('|').map(s => s.trim());
                if (segments.length === 3) {
                    const [title, module, status] = segments;
                    // Find task ID from the saved mentions array, if available
                    const taskData = msg.mencoes_tarefas?.find(t => t.title === title && t.module === module);
                    const taskId = taskData?.id;

                    return (
                        <span
                            key={i}
                            onClick={taskId ? () => handleTaskClick(taskId, module) : undefined}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 mb-[2px] rounded border align-middle transition-colors ${taskId ? 'cursor-pointer' : 'cursor-default'}`}
                            style={{
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                borderColor: 'rgba(59, 130, 246, 0.2)',
                                color: 'rgb(96, 165, 250)'
                            }}
                            title={taskId ? "Clique para ir até a tarefa" : "Tarefa não encontrada"}
                        >
                            <span className="font-medium" style={{ fontSize: '0.9em', lineHeight: 1 }}>{title}</span>
                            <span style={{ fontSize: '0.65em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.7, background: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: 3 }}>
                                {module}
                            </span>
                        </span>
                    );
                }
            }
            if (part.startsWith('@')) {
                return <span key={i} className="chat-mention">{part}</span>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    // Group messages + date separators
    const renderMessages = () => {
        const elements: React.ReactNode[] = [];
        let lastDate = '';
        let lastAuthorId = '';

        mensagens.forEach((msg, idx) => {
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
                && (new Date(msg.created_at).getTime() - new Date(mensagens[idx - 1].created_at).getTime()) < 300000;
            lastAuthorId = msg.autor_id || '';

            const authorName = msg.autor?.nome || 'Usuário';
            const authorColor = getColor(authorName);

            elements.push(
                <div key={msg.id} className={`chat-message ${isGrouped ? 'grouped' : ''} ${msg.deletada ? 'deleted' : ''}`} id={`msg-${msg.id}`}>
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
                        {isGrouped && (
                            <span className="chat-message-time-hover">{formatTime(msg.created_at)}</span>
                        )}

                        {/* Reply quote */}
                        {msg.mensagem_original && !msg.deletada && (
                            <div className="chat-reply-quote">
                                <span className="chat-reply-author">{msg.mensagem_original.autor?.nome || 'Usuário'}</span>
                                <span className="chat-reply-text">{msg.mensagem_original.conteudo?.slice(0, 80) || '...'}</span>
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
                            <div className="chat-message-text">{renderMsgText(msg.conteudo || '', msg)}</div>
                        )}

                        {/* Actions */}
                        {!msg.deletada && (
                            <div className="chat-message-actions">
                                <button onClick={() => setReplyTo(msg)} title="Responder"><Reply size={14} /></button>
                                {msg.autor_id === userId && (
                                    <button onClick={() => handleDeleteMsg(msg.id)} title="Apagar"><Trash2 size={14} /></button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            );
        });

        return elements;
    };

    if (loadingCanais) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)' }}>Carregando...</div>;
    }

    const canaisCanal = canais.filter(c => c.tipo === 'canal');
    const canaisGrupo = canais.filter(c => c.tipo === 'grupo_projeto');

    return (
        <div className="chat-layout">
            {/* Channels sidebar */}
            <div className="chat-channels">
                <div className="chat-channels-header">
                    <span>Canais</span>
                    <button onClick={openCreateModal} className="chat-icon-btn" title="Novo Canal"><Plus size={16} /></button>
                </div>

                {canaisCanal.length > 0 && (
                    <>
                        <div className="channel-section-title"><Hash size={12} /> Canais de Texto</div>
                        {canaisCanal.map(canal => (
                            <div key={canal.id} className={`channel-item ${activeCanalId === canal.id ? 'active' : ''}`} onClick={() => setActiveCanalId(canal.id)}>
                                <Hash size={14} className="hash" />
                                <span className="channel-name">{canal.nome}</span>
                            </div>
                        ))}
                    </>
                )}

                {canaisGrupo.length > 0 && (
                    <>
                        <div className="channel-section-title" style={{ marginTop: 12 }}><FolderKanban size={12} /> Grupos de Projeto</div>
                        {canaisGrupo.map(canal => (
                            <div key={canal.id} className={`channel-item ${activeCanalId === canal.id ? 'active' : ''}`} onClick={() => setActiveCanalId(canal.id)}>
                                <FolderKanban size={14} className="hash" />
                                <span className="channel-name">{canal.nome}</span>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Chat main area */}
            <div className="chat-main">
                {activeCanal ? (
                    <>
                        <div className="chat-header">
                            {activeCanal.tipo === 'canal' ? <Hash size={18} style={{ color: 'var(--text-muted)' }} /> : <FolderKanban size={18} style={{ color: 'var(--text-muted)' }} />}
                            <div style={{ flex: 1 }}>
                                <div className="chat-header-name">{activeCanal.nome}</div>
                                <div className="chat-header-desc">
                                    {activeCanal.descricao || ''}
                                    {participantes.length > 0 && (
                                        <span style={{ marginLeft: 8 }}>
                                            · <span style={{ color: onlineMembersCount > 0 ? 'var(--success)' : 'var(--text-muted)' }}>●</span> {onlineMembersCount} online
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button className="chat-icon-btn" onClick={() => setModal('participants')} title="Membros"><Users size={16} /></button>
                                {(activeCanal.criador_id === userId || user?.categoria === 'Admin Geral') && (
                                    <>
                                        <button className="chat-icon-btn" onClick={openEditModal} title="Editar Canal"><Settings size={16} /></button>
                                        <button className="chat-icon-btn" onClick={() => setModal('deleteConfirm')} title="Excluir Canal"><Trash2 size={16} /></button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="chat-messages">
                            {loadingMensagens ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Carregando mensagens...</div>
                            ) : mensagens.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40, fontSize: 13 }}>
                                    Nenhuma mensagem ainda. Comece a conversa! 💬
                                </div>
                            ) : (
                                renderMessages()
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Reply bar */}
                        {replyTo && (
                            <div className="chat-reply-bar">
                                <Reply size={14} />
                                <span>Respondendo a <strong>{replyTo.autor?.nome || 'Usuário'}</strong>: {replyTo.conteudo?.slice(0, 60)}...</span>
                                <button onClick={() => setReplyTo(null)} className="chat-icon-btn"><X size={14} /></button>
                            </div>
                        )}

                        {/* Mention dropdown */}
                        {mentionQuery !== null && mentionMembers.length > 0 && (
                            <div className="chat-mention-dropdown">
                                {mentionMembers.map((p, i) => (
                                    <div
                                        key={p.usuario_id}
                                        className={`chat-mention-item ${i === mentionIdx ? 'active' : ''}`}
                                        onClick={() => insertMention(p.usuario?.nome || '')}
                                    >
                                        <div className="chat-mention-avatar" style={{ background: getColor(p.usuario?.nome || '') }}>
                                            {getInitials(p.usuario?.nome || '')}
                                        </div>
                                        {p.usuario?.nome}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Task Mention (@@) dropdown */}
                        {taskMentionQuery !== null && (
                            <div className="chat-mention-dropdown" style={{ width: 400, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 320 }}>
                                {/* Area Selection View */}
                                {!selectedTaskModule && !taskMentionQuery && (
                                    <div style={{ padding: '20px' }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 16, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Selecione uma Área</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            {(user?.modulos_acesso || []).includes('/comercial') && (
                                                <button onClick={() => setSelectedTaskModule('Comercial')} style={{ padding: '16px', borderRadius: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-primary)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}>
                                                    <div style={{ padding: 10, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6' }}><Activity size={20} /></div>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Comercial</span>
                                                </button>
                                            )}
                                            {((user?.modulos_acesso || []).includes('/operacional') || !user?.modulos_acesso) && (
                                                <button onClick={() => setSelectedTaskModule('Operacional')} style={{ padding: '16px', borderRadius: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-primary)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}>
                                                    <div style={{ padding: 10, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}><LayoutDashboard size={20} /></div>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Operacional</span>
                                                </button>
                                            )}
                                            {((user?.modulos_acesso || []).includes('/administrativo') || (user?.modulos_acesso || []).includes('/configuracoes')) && (
                                                <button onClick={() => setSelectedTaskModule('Administrativo')} style={{ padding: '16px', borderRadius: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-primary)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}>
                                                    <div style={{ padding: 10, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}><Users size={20} /></div>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Administrativo</span>
                                                </button>
                                            )}
                                            {(user?.modulos_acesso || []).includes('/financeiro') && (
                                                <button onClick={() => setSelectedTaskModule('Financeiro')} style={{ padding: '16px', borderRadius: 12, background: 'var(--bg-tertiary)', border: '1px solid var(--border-default)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand-primary)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}>
                                                    <div style={{ padding: 10, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}><Clock size={20} /></div>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Financeiro</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Task Selection View */}
                                {(selectedTaskModule || taskMentionQuery) && (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-primary)' }}>
                                            {!taskMentionQuery && (
                                                <button
                                                    onClick={() => setSelectedTaskModule(null)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, padding: '4px 8px', borderRadius: 4 }}
                                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                                                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                                >
                                                    <ChevronLeft size={14} /> Voltar
                                                </button>
                                            )}
                                            <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                                {taskMentionQuery ? `Buscando "${taskMentionQuery}"` : selectedTaskModule}
                                            </div>
                                            {selectedTaskModule && (
                                                <span style={{ fontSize: 11, background: 'rgba(59, 130, 246, 0.1)', color: 'var(--brand-primary)', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>{filteredTasks.length} tarefas</span>
                                            )}
                                        </div>
                                        <div style={{ overflowY: 'auto', padding: '8px 0' }}>
                                            {filteredTasks.length === 0 ? (
                                                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Nenhuma tarefa ativa encontrada.</div>
                                            ) : (
                                                filteredTasks.map((task, i) => (
                                                    <div
                                                        key={task.id}
                                                        className={`chat-mention-item ${i === taskMentionIdx ? 'active' : ''}`}
                                                        onClick={() => insertTaskMention(task)}
                                                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '10px 16px', gap: 4, height: 'auto' }}
                                                    >
                                                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3 }}>{task.title}</div>
                                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                            <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 4 }}>{task.module}</span>
                                                            <span style={{ fontSize: 12, color: 'var(--brand-primary)', fontWeight: 500 }}>{task.status}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="chat-input-container">
                            <div className="chat-input">
                                <button onClick={() => fileInputRef.current?.click()} className="chat-icon-btn" title="Anexar arquivo">
                                    <Paperclip size={18} />
                                </button>
                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.txt" />
                                <textarea
                                    ref={inputRef}
                                    placeholder={`Mensagem em #${activeCanal.nome}...`}
                                    value={messageText}
                                    onChange={handleInputChange}
                                    onKeyDown={handleKeyDown}
                                    rows={1}
                                />
                                <button onClick={handleSend} disabled={!messageText.trim()} title="Enviar">
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                        Selecione um canal ou crie um novo
                    </div>
                )}
            </div>

            {/* ========== MODALS ========== */}

            {/* Create Channel Modal */}
            {modal === 'create' && (
                <div className="modal-overlay" onClick={() => { setModal(null); setShowParticipantDropdown(false); }}>
                    <div
                        className="modal-content"
                        onClick={e => { e.stopPropagation(); setShowParticipantDropdown(false); }}
                        style={{ maxWidth: 480, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}
                    >
                        <div className="modal-header">
                            <h3>Novo Canal</h3>
                            <button onClick={() => setModal(null)} className="chat-icon-btn"><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
                            <div>
                                <label className="form-label">Nome do Canal</label>
                                <input className="form-input" value={formNome} onChange={e => setFormNome(e.target.value)} placeholder="ex: comercial" />
                            </div>
                            <div>
                                <label className="form-label">Descrição</label>
                                <input className="form-input" value={formDescricao} onChange={e => setFormDescricao(e.target.value)} placeholder="Opcional" />
                            </div>
                            <div>
                                <label className="form-label">Tipo</label>
                                <select className="form-input" value={formTipo} onChange={e => { setFormTipo(e.target.value as 'canal' | 'grupo_projeto'); setShowParticipantDropdown(false); }}>
                                    <option value="canal">Canal de Texto</option>
                                    <option value="grupo_projeto">Grupo de Projeto</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Participantes</label>
                                {/* Tag box + inline dropdown — no floating */}
                                <div
                                    style={{ border: '1px solid var(--border-default)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-primary)' }}
                                    onClick={e => e.stopPropagation()}
                                >
                                    {/* Tag + placeholder row */}
                                    <div
                                        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 12px', cursor: 'pointer', minHeight: 46, alignItems: 'center' }}
                                        onClick={() => setShowParticipantDropdown(v => !v)}
                                    >
                                        {formParticipantes.map(uid => {
                                            const u = allUsuarios.find(x => x.id === uid);
                                            if (!u) return null;
                                            return (
                                                <span key={uid} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-secondary)', border: '1px solid var(--border-default)', borderRadius: 20, padding: '3px 10px 3px 6px', fontSize: 12 }}>
                                                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: getColor(u.nome), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                                        {getInitials(u.nome)}
                                                    </div>
                                                    {u.nome}
                                                    <span
                                                        onClick={e => { e.stopPropagation(); setFormParticipantes(prev => prev.filter(x => x !== uid)); }}
                                                        style={{ cursor: 'pointer', opacity: 0.6, fontSize: 16, lineHeight: 1, fontWeight: 700, marginLeft: 2 }}
                                                    >×</span>
                                                </span>
                                            );
                                        })}
                                        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                                            {formParticipantes.length === 0 ? 'Selecione os participantes...' : 'Adicionar mais...'}
                                        </span>
                                    </div>
                                    {/* Inline dropdown list — NOT absolute positioned */}
                                    {showParticipantDropdown && (
                                        <div style={{ borderTop: '1px solid var(--border-default)', maxHeight: 200, overflowY: 'auto' }}>
                                            {allUsuarios.filter(u => u.id !== userId && !formParticipantes.includes(u.id)).length === 0 ? (
                                                <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>Todos já foram adicionados</div>
                                            ) : (
                                                allUsuarios.filter(u => u.id !== userId && !formParticipantes.includes(u.id)).map(u => (
                                                    <div
                                                        key={u.id}
                                                        onClick={() => setFormParticipantes(prev => [...prev, u.id])}
                                                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', fontSize: 13 }}
                                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-muted)')}
                                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                                    >
                                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: getColor(u.nome), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                                                            {getInitials(u.nome)}
                                                        </div>
                                                        {u.nome}
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-primary" onClick={handleCreateCanal} disabled={saving || !formNome.trim()}>
                                {saving ? 'Criando...' : 'Criar'}
                            </button>
                            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                        </div>
                    </div>
                </div>
            )}



            {/* Edit Channel Modal */}
            {modal === 'edit' && activeCanal && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h3>Editar Canal</h3>
                            <button onClick={() => setModal(null)} className="chat-icon-btn"><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div>
                                <label className="form-label">Nome</label>
                                <input className="form-input" value={formNome} onChange={e => setFormNome(e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">Descrição</label>
                                <input className="form-input" value={formDescricao} onChange={e => setFormDescricao(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleEditCanal} disabled={saving}>
                                {saving ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Manage Participants Modal */}
            {modal === 'participants' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h3>Membros do Canal</h3>
                            <button onClick={() => setModal(null)} className="chat-icon-btn"><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: 400, overflow: 'auto' }}>
                            {allUsuarios.map(u => {
                                const isParticipant = participantes.some(p => p.usuario_id === u.id);
                                const isOnline = onlineUserIds.has(u.id);
                                return (
                                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: getColor(u.nome), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>
                                                {getInitials(u.nome)}
                                            </div>
                                            <span style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: isOnline ? 'var(--success)' : '#555', border: '2px solid var(--bg-secondary)' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 500 }}>{u.nome}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
                                        </div>
                                        {(activeCanal?.criador_id === userId || user?.categoria === 'Admin Geral') && (
                                            <button
                                                className={`btn ${isParticipant ? 'btn-secondary' : 'btn-primary'}`}
                                                style={{ fontSize: 11, padding: '4px 10px' }}
                                                onClick={() => handleToggleParticipante(u.id)}
                                            >
                                                {isParticipant ? 'Remover' : 'Adicionar'}
                                            </button>
                                        )}
                                        {!(activeCanal?.criador_id === userId || user?.categoria === 'Admin Geral') && (
                                            <span style={{ fontSize: 11, color: isParticipant ? 'var(--success)' : 'var(--text-muted)' }}>
                                                {isParticipant ? 'Membro' : '—'}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setModal(null)}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {modal === 'deleteConfirm' && (
                <div className="modal-overlay" onClick={() => setModal(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3>Excluir Canal</h3>
                            <button onClick={() => setModal(null)} className="chat-icon-btn"><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                Excluir este canal apagará <strong>todas as mensagens permanentemente</strong>. Esta ação não pode ser desfeita.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
                            <button className="btn" style={{ background: '#EF4444', color: '#fff' }} onClick={handleDeleteCanal} disabled={saving}>
                                {saving ? 'Excluindo...' : 'Excluir Canal'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
