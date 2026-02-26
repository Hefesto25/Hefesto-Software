'use client';

import { useState, useEffect } from 'react';
import { Send, Hash, Plus, Smile, Paperclip } from 'lucide-react';
import { useChannels, useMessages, useTeam } from '@/lib/hooks';
import type { Channel } from '@/lib/types';

export default function ChatPage() {
    const { data: channels, loading: loadingChannels } = useChannels();
    const { data: team, loading: loadingTeam } = useTeam();
    const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
    const [messageText, setMessageText] = useState('');

    // Set initial channel when channels load
    useEffect(() => {
        if (channels.length > 0 && !activeChannelId) {
            setActiveChannelId(channels[0].id);
        }
    }, [channels, activeChannelId]);

    const { data: channelMessages, loading: loadingMessages } = useMessages(activeChannelId);

    if (loadingChannels || loadingTeam) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)' }}>Carregando...</div>;
    }

    const currentChannel = channels.find(c => c.id === activeChannelId) || channels[0];

    return (
        <div className="chat-layout">
            {/* Channels sidebar */}
            <div className="chat-channels">
                <div className="chat-channels-header">
                    <span>Canais</span>
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><Plus size={16} /></button>
                </div>
                <div className="channel-section-title">Canais</div>
                {channels.map(channel => (
                    <div
                        key={channel.id}
                        className={`channel-item ${activeChannelId === channel.id ? 'active' : ''}`}
                        onClick={() => setActiveChannelId(channel.id)}
                    >
                        <Hash size={16} className="hash" />
                        {channel.name}
                        {channel.unread > 0 && <span className="unread">{channel.unread}</span>}
                    </div>
                ))}
                <div className="channel-section-title" style={{ marginTop: 8 }}>Mensagens Diretas</div>
                {team.slice(1, 4).map(member => (
                    <div key={member.id} className="channel-item">
                        <div style={{
                            width: 18, height: 18, borderRadius: '50%', background: member.avatar_color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 8, fontWeight: 700, color: 'white', position: 'relative'
                        }}>
                            {member.initials}
                            <span style={{
                                position: 'absolute', bottom: -1, right: -1, width: 6, height: 6,
                                borderRadius: '50%', border: '1.5px solid var(--bg-secondary)',
                                background: member.status === 'online' ? 'var(--success)' : member.status === 'away' ? 'var(--warning)' : 'var(--text-muted)',
                            }} />
                        </div>
                        {member.name.split(' ')[0]}
                    </div>
                ))}
            </div>

            {/* Chat main area */}
            <div className="chat-main">
                <div className="chat-header">
                    <Hash size={18} style={{ color: 'var(--text-muted)' }} />
                    <div>
                        <div className="chat-header-name">{currentChannel?.name}</div>
                        <div className="chat-header-desc">{currentChannel?.description}</div>
                    </div>
                </div>

                <div className="chat-messages">
                    {loadingMessages ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Carregando mensagens...</div>
                    ) : (
                        channelMessages.map(msg => (
                            <div key={msg.id} className="chat-message">
                                <div className="chat-message-avatar" style={{ background: msg.avatar_color }}>
                                    {msg.author.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </div>
                                <div className="chat-message-content">
                                    <div className="chat-message-header">
                                        <span className="chat-message-name">{msg.author}</span>
                                        <span className="chat-message-time">{msg.time}</span>
                                    </div>
                                    <div className="chat-message-text">{msg.text}</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="chat-input-container">
                    <div className="chat-input">
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                            <Paperclip size={18} />
                        </button>
                        <input
                            type="text"
                            placeholder={`Mensagem em #${currentChannel?.name}...`}
                            value={messageText}
                            onChange={e => setMessageText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') setMessageText(''); }}
                        />
                        <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                            <Smile size={18} />
                        </button>
                        <button onClick={() => setMessageText('')}>
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Members sidebar */}
            <div className="chat-members">
                <div className="chat-members-title">Online — {team.filter(t => t.status === 'online').length}</div>
                {team.filter(t => t.status === 'online').map(member => (
                    <div key={member.id} className="member-item">
                        <div className="member-avatar" style={{ background: member.avatar_color }}>
                            {member.initials}
                            <span className={`member-status ${member.status}`} />
                        </div>
                        <div>
                            <div className="member-name">{member.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{member.role}</div>
                        </div>
                    </div>
                ))}
                <div className="chat-members-title" style={{ marginTop: 20 }}>Ausente — {team.filter(t => t.status === 'away').length}</div>
                {team.filter(t => t.status === 'away').map(member => (
                    <div key={member.id} className="member-item">
                        <div className="member-avatar" style={{ background: member.avatar_color }}>
                            {member.initials}
                            <span className={`member-status ${member.status}`} />
                        </div>
                        <div>
                            <div className="member-name">{member.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{member.role}</div>
                        </div>
                    </div>
                ))}
                <div className="chat-members-title" style={{ marginTop: 20 }}>Offline — {team.filter(t => t.status === 'offline').length}</div>
                {team.filter(t => t.status === 'offline').map(member => (
                    <div key={member.id} className="member-item">
                        <div className="member-avatar" style={{ background: member.avatar_color }}>
                            {member.initials}
                            <span className={`member-status ${member.status}`} />
                        </div>
                        <div>
                            <div className="member-name">{member.name}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{member.role}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
