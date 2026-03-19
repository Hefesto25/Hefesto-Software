# 📋 Design Detalhado: Novos Features da Aba Chat

**Data:** 18 de Março, 2026
**Versão:** 1.0
**Status:** Pronto para Implementação

---

## 🎯 Objetivo

Implementar 6 mudanças principais na aba de chat do Hefesto:
1. Aba de Membros (gerenciar participantes)
2. Aba de Configurações (editar canal)
3. Botão de Exclusão funcional
4. Pinned Messages com visualização no header (estilo WhatsApp)
5. Corrigir simetria e overflow no input de mensagens
6. Ícone visual para mensagens fixadas

---

## 📐 Arquitetura Geral

```
app/chat/page.tsx (componente principal)
├── <ChatHeader>
│   ├── <PinnedMessageBanner> ← NOVO
│   ├── Botões (Search, Pinned Panel, Members, Settings, Delete)
│   └── Handlers para abrir modais
│
├── <ChatMessages> (área principal)
│
├── <ChatInput>
│   └── Textarea com altura dinâmica + word-wrap
│
└── MODALS (dentro do main):
    ├── <MembersModal> ← NOVO
    ├── <SettingsModal> ← NOVO
    ├── <DeleteConfirmModal> ← NOVO
    └── <PinnedMessagesPanel> (já existe)
```

### State Management

```typescript
const [modal, setModal] = useState<ModalType>(null);
const [pinnedMessage, setPinnedMessage] = useState<Mensagem | null>(null);
const [chatMode, setChatMode] = useState<ChatMode>('canais');
const [activeCanalId, setActiveCanalId] = useState<string | null>(null);
```

---

## 🔧 Componentes Detalhados

### 1. `<PinnedMessageBanner>` (NOVO)

**Renderização:**
```typescript
// Aparece no topo do chat, entre o header e as mensagens
// APENAS se houver uma mensagem fixada

<div className="pinned-banner">
  <Pin size={16} style={{ fill: 'currentColor' }} />
  <span className="pinned-text">
    {pinnedMessage.autor.nome}: {pinnedMessage.conteudo.substring(0, 50)}...
  </span>
  <button onClick={() => scrollToMessage(pinnedMessage.id)}>
    Ver
  </button>
  {(isCreator || isAdmin) && (
    <button onClick={() => handleUnpinMessage(pinnedMessage.id)}>
      ✕
    </button>
  )}
</div>
```

**Comportamento:**
- Click em "Ver" → `scrollToMessage()` + `highlightMessage()`
- Click em "✕" → desafixar (apenas criador/admin)
- Se não há pinned message → não renderiza nada

**CSS:**
```css
.pinned-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: var(--accent-muted);
  border-bottom: 2px solid var(--accent);
  font-size: 13px;
  margin-bottom: 8px;
}

.pinned-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

---

### 2. `<MembersModal>` (NOVO)

**Renderização:**
```typescript
<div className="modal-overlay" onClick={closeModal}>
  <div className="modal-content">
    <h2>Gerenciar Membros</h2>

    {/* Lista de membros atuais */}
    <div className="members-list">
      <h3>Membros Atuais ({participantes.length})</h3>
      {participantes.map(p => (
        <label key={p.usuario_id}>
          <input
            type="checkbox"
            checked={selectedMembers.includes(p.usuario_id)}
            onChange={(e) => handleToggleMember(p.usuario_id, e.target.checked)}
            disabled={!isCreatorOrAdmin}
          />
          <span>{p.usuario.nome}</span>
          {p.usuario_id === activeCanal.criador_id && (
            <span className="badge badge-creator">Criador</span>
          )}
        </label>
      ))}
    </div>

    {/* Lista de usuários disponíveis para adicionar */}
    <div className="available-users">
      <h3>Adicionar Usuários</h3>
      {allUsuarios
        .filter(u => !participantes.some(p => p.usuario_id === u.id))
        .map(u => (
          <label key={u.id}>
            <input
              type="checkbox"
              checked={selectedMembers.includes(u.id)}
              onChange={(e) => handleToggleMember(u.id, e.target.checked)}
              disabled={!isCreatorOrAdmin}
            />
            <span>{u.nome}</span>
          </label>
        ))}
    </div>

    {/* Botões */}
    <div className="modal-actions">
      <button onClick={closeModal} className="btn-secondary">
        Cancelar
      </button>
      <button
        onClick={saveMembersChanges}
        disabled={!isCreatorOrAdmin}
        className="btn-primary"
      >
        Confirmar
      </button>
    </div>
  </div>
</div>
```

**Lógica:**
- Se não é criador/admin → apenas visualiza (checkboxes desabilitados)
- Click "Confirmar" → chama `addParticipante()` e `removeParticipante()`
- Fecha modal após salvar

**Permissões:**
- ✅ Criador do canal pode editar
- ✅ Admin Geral pode editar
- ❌ Outros usuários apenas visualizam

---

### 3. `<SettingsModal>` (NOVO)

**Renderização:**
```typescript
<div className="modal-overlay" onClick={closeModal}>
  <div className="modal-content">
    <h2>Configurações do Canal</h2>

    {!isCreatorOrAdmin && (
      <div className="alert alert-info">
        Apenas criador/admin podem editar configurações
      </div>
    )}

    {/* Nome */}
    <div className="form-group">
      <label>Nome do Canal</label>
      <input
        type="text"
        value={formData.nome}
        onChange={(e) => setFormData({...formData, nome: e.target.value})}
        disabled={!isCreatorOrAdmin}
        maxLength={50}
      />
    </div>

    {/* Descrição */}
    <div className="form-group">
      <label>Descrição</label>
      <textarea
        value={formData.descricao}
        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
        disabled={!isCreatorOrAdmin}
        rows={3}
        maxLength={200}
      />
    </div>

    {/* Tipo */}
    <div className="form-group">
      <label>Tipo de Canal</label>
      <select
        value={formData.tipo}
        onChange={(e) => setFormData({...formData, tipo: e.target.value})}
        disabled={!isCreatorOrAdmin}
      >
        <option value="canal">Canal</option>
        <option value="grupo_projeto">Grupo/Projeto</option>
      </select>
    </div>

    {/* Avatar */}
    <div className="form-group">
      <label>Avatar do Canal</label>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => handleAvatarUpload(e.target.files?.[0])}
        disabled={!isCreatorOrAdmin}
      />
      {formData.avatar_url && (
        <img
          src={formData.avatar_url}
          alt="Preview"
          style={{ width: 60, height: 60, borderRadius: 8, marginTop: 8 }}
        />
      )}
    </div>

    {/* Opção de Arquivar */}
    <div className="form-group">
      <label>
        <input
          type="checkbox"
          checked={formData.arquivado || false}
          onChange={(e) => setFormData({...formData, arquivado: e.target.checked})}
          disabled={!isCreatorOrAdmin}
        />
        <span>Arquivar canal (deixa visível mas sem mensagens novas)</span>
      </label>
    </div>

    {/* Botões */}
    <div className="modal-actions">
      <button onClick={closeModal} className="btn-secondary">
        Cancelar
      </button>
      <button
        onClick={saveSettings}
        disabled={!isCreatorOrAdmin}
        className="btn-primary"
      >
        Salvar Configurações
      </button>
      {isCreatorOrAdmin && (
        <button
          onClick={() => setModal('deleteConfirm')}
          className="btn-danger"
        >
          Deletar Canal
        </button>
      )}
    </div>
  </div>
</div>
```

**Lógica:**
- Carrega dados atuais do canal ao abrir
- Valida campos antes de salvar
- Usa `updateCanal()` para persistir mudanças
- Botão "Deletar Canal" abre `<DeleteConfirmModal>`

**Campos Editáveis:**
- ✅ Nome (max 50 caracteres)
- ✅ Descrição (max 200 caracteres)
- ✅ Tipo (canal ou grupo_projeto)
- ✅ Avatar (upload de imagem)
- ✅ Arquivado (checkbox)

---

### 4. `<DeleteConfirmModal>` (NOVO)

**Renderização:**
```typescript
<div className="modal-overlay" onClick={closeModal}>
  <div className="modal-content modal-danger">
    <h2>⚠️ Deletar Canal</h2>

    <p>
      Tem certeza que deseja deletar <strong>{activeCanal.nome}</strong>?
    </p>
    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
      Todas as mensagens e dados serão permanentemente removidos.
      Esta ação não pode ser desfeita.
    </p>

    {/* Botões */}
    <div className="modal-actions">
      <button
        onClick={closeModal}
        className="btn-secondary"
      >
        Cancelar
      </button>
      <button
        onClick={handleDeleteChannel}
        className="btn-danger"
      >
        Sim, Deletar Permanentemente
      </button>
    </div>
  </div>
</div>
```

**Lógica:**
- Click "Sim, Deletar" → chama `deleteCanal(activeCanalId)`
- Após deletar → redireciona para Canais
- Apenas criador/admin conseguem ver este modal

---

### 5. `<ChatInput>` (MODIFICADO)

**Renderização:**
```typescript
<div className="chat-input-container">
  <div className="chat-input">
    {/* Botão de anexo */}
    <button
      onClick={() => fileInputRef.current?.click()}
      className="chat-icon-btn"
      title="Anexar arquivo"
    >
      <Paperclip size={18} />
    </button>
    <input
      type="file"
      ref={fileInputRef}
      style={{ display: 'none' }}
      onChange={handleFileUpload}
    />

    {/* Textarea com altura dinâmica */}
    <textarea
      ref={inputRef}
      placeholder={`Mensagem em #${activeCanal.nome}...`}
      value={messageText}
      onChange={(e) => {
        setMessageText(e.target.value);
        autoResizeTextarea(e.target);
      }}
      onKeyDown={handleKeyDown}
      rows={1}
    />

    {/* Botão de envio */}
    <button
      onClick={handleSend}
      disabled={!messageText.trim()}
      className="chat-icon-btn"
      title="Enviar mensagem"
    >
      <Send size={16} />
    </button>
  </div>
</div>
```

**Função Auto-Resize:**
```typescript
const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
  // Reset para calcular novo tamanho
  textarea.style.height = 'auto';

  // Calcula altura com limite máximo de 120px
  const newHeight = Math.min(textarea.scrollHeight, 120);
  textarea.style.height = `${newHeight}px`;
};
```

**CSS Atualizado:**
```css
.chat-input-container {
  padding: 12px 20px;
  border-top: 1px solid var(--border-default);
}

.chat-input {
  display: flex;
  align-items: center;        /* ← CENTRALIZA VERTICALMENTE */
  gap: 10px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  padding: 10px 12px;         /* ← SIMETRIA HORIZONTAL */
}

.chat-input textarea {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 13.5px;
  font-family: inherit;
  resize: none;
  max-height: 120px;
  line-height: 1.5;
  padding: 0;

  /* ← WORD-WRAP PARA QUEBRA AUTOMÁTICA */
  word-break: break-word;
  word-wrap: break-word;
  white-space: pre-wrap;
  overflow-wrap: break-word;
}

.chat-input textarea::placeholder {
  color: var(--text-muted);
}

.chat-input button {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  border: none;
  background: var(--accent);
  color: #000;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.chat-input button:hover {
  background: var(--accent-hover);
  box-shadow: var(--shadow-glow);
}

.chat-input button:disabled {
  background: var(--bg-tertiary);
  color: var(--text-muted);
  cursor: not-allowed;
  box-shadow: none;
}
```

---

## 💾 Lógica de Pinned Messages

### State
```typescript
const [pinnedMessage, setPinnedMessage] = useState<Mensagem | null>(null);
```

### Função: Fixar Mensagem
```typescript
const handlePinMessage = async (mensagemId: string) => {
  try {
    // Se já tem uma fixada, desfixa a anterior
    if (pinnedMessage) {
      await pinMensagem(pinnedMessage.id, false);
    }

    // Fixa a nova
    const msg = mensagens.find(m => m.id === mensagemId);
    await pinMensagem(mensagemId, true);
    setPinnedMessage(msg || null);
  } catch (error) {
    alert('Erro ao fixar mensagem: ' + error.message);
  }
};
```

### Função: Desafixar
```typescript
const handleUnpinMessage = async (mensagemId: string) => {
  try {
    await pinMensagem(mensagemId, false);
    setPinnedMessage(null);
  } catch (error) {
    alert('Erro ao desafixar mensagem: ' + error.message);
  }
};
```

### Função: Scroll para Mensagem Fixada
```typescript
const scrollToMessage = (mensagemId: string) => {
  const element = document.getElementById(`msg-${mensagemId}`);

  if (element) {
    // Scroll suave até a mensagem
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Adiciona destaque visual temporário
    element.classList.add('message-highlight');
    setTimeout(() => element.classList.remove('message-highlight'), 2000);
  }
};
```

### Carregar Pinned Message ao Mudar de Canal
```typescript
useEffect(() => {
  const loadPinnedMessage = async () => {
    if (!activeCanalId) return;

    const pinned = await usePinnedMensagens(activeCanalId);
    // Pega a primeira (que é a única fixada)
    setPinnedMessage(pinned.data?.[0] || null);
  };

  loadPinnedMessage();
}, [activeCanalId]);
```

### Renderizar Indicador na Mensagem
```typescript
{msg.pinada && (
  <div className="message-pinned-indicator">
    <Pin size={14} style={{ fill: 'currentColor' }} />
    <span>Fixado</span>
  </div>
)}
```

### CSS para Pinned Indicator
```css
.message-pinned-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--accent);
  background: var(--accent-muted);
  padding: 2px 6px;
  border-radius: 4px;
  width: fit-content;
  margin-top: 4px;
}

.message-highlight {
  background: rgba(var(--accent-rgb), 0.1) !important;
  animation: highlight 0.5s ease-in-out;
}

@keyframes highlight {
  0% {
    background: rgba(var(--accent-rgb), 0.3) !important;
  }
  100% {
    background: rgba(var(--accent-rgb), 0.1) !important;
  }
}
```

---

## 🎛️ State Management de Modais

```typescript
type ModalType = 'create' | 'edit' | 'participants' | 'settings' | 'deleteConfirm' | null;

const [modal, setModal] = useState<ModalType>(null);

// Renderizar modais condicionalmente
{modal === 'participants' && (
  <MembersModal
    onClose={() => setModal(null)}
    activeCanalId={activeCanalId}
  />
)}

{modal === 'settings' && (
  <SettingsModal
    onClose={() => setModal(null)}
    activeCanalId={activeCanalId}
  />
)}

{modal === 'deleteConfirm' && (
  <DeleteConfirmModal
    onClose={() => setModal(null)}
    activeCanalId={activeCanalId}
  />
)}

{modal === 'edit' && (
  <SettingsModal
    onClose={() => setModal(null)}
    activeCanalId={activeCanalId}
  />
)}
```

---

## 📋 Decision Log

| # | Decisão | Alternativas Consideradas | Escolhido | Razão |
|---|---------|--------------------------|-----------|-------|
| 1 | Arquitetura | Monolítica vs Modular | **Modular** | Facilita manutenção, testes e reutilização |
| 2 | Pinned Messages | Múltiplos vs 1 por vez | **1 por vez** | Simples, limpo e intuitivo (estilo WhatsApp) |
| 3 | Modal de Membros | Form adicional vs Checkbox | **Checkbox** | Mais rápido e direto para selecionar |
| 4 | Settings Modal | Form simples vs Wizard | **Form simples** | Suficiente para os campos e não complexo demais |
| 5 | Delete Confirmation | Dialog interativo vs Modal | **Modal simples** | Confirmação clara e rápida |
| 6 | Input Altura | Fixa vs Dinâmica | **Dinâmica** | Melhor UX ao digitar textos longos |
| 7 | Input Alinhamento | flex-end vs center | **center** | Simetria visual e profissional |
| 8 | Texto Overflow | Truncate vs Word-wrap | **Word-wrap** | Texto completo sempre visível |
| 9 | Permissões | Roles complexos vs Simples | **Criador+Admin** | Suficiente e simples de implementar |
| 10 | Upload Avatar | Separado vs Integrado | **Integrado no Settings** | Centralizado e evita múltiplos passos |

---

## ✅ Checklist de Implementação

- [ ] Criar componente `<PinnedMessageBanner>`
- [ ] Criar componente `<MembersModal>`
- [ ] Criar componente `<SettingsModal>`
- [ ] Criar componente `<DeleteConfirmModal>`
- [ ] Atualizar CSS do `.chat-input` (alinhamento + word-wrap)
- [ ] Implementar função `autoResizeTextarea()`
- [ ] Implementar lógica de `handlePinMessage()`
- [ ] Implementar lógica de `handleUnpinMessage()`
- [ ] Implementar função `scrollToMessage()`
- [ ] Carregar pinned message ao mudar de canal (useEffect)
- [ ] Adicionar indicador visual de pinned na mensagem
- [ ] Adicionar onClick handlers aos botões (Settings, Delete)
- [ ] Testar todos os modais
- [ ] Testar pinned messages
- [ ] Testar input com texto longo
- [ ] Testar permissões (criador vs outros usuários)

---

## 🚀 Próximos Passos

1. **Implementação**: Use este documento como referência para o Gemini/desenvolvimento
2. **Testes**: Teste cada componente individualmente
3. **Integração**: Integre com o sistema existente
4. **Review**: Valide com o usuário final

---

**Documento criado em:** 18 de Março, 2026
**Pronto para:** Implementação
