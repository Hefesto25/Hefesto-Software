# 🚀 BRIEF PARA IMPLEMENTAÇÃO - Hefesto Chat Features

**Status**: Pronto para Implementação
**Prioridade**: Alta
**Complexidade**: Média

---

## 📝 O QUE PRECISA SER FEITO

Você receberá um documento detalhado (`CHAT_FEATURES_DESIGN.md`) com o design completo.
Este brief é um **resumo executivo rápido**.

---

## 6 TAREFAS PRINCIPAIS

### 1️⃣ ABA MEMBROS
- Modal simples com lista de usuários
- Checkboxes para adicionar/remover membros
- Apenas criador + admin podem editar
- Outras pessoas apenas visualizam

**Componente:** `<MembersModal>`

---

### 2️⃣ ABA CONFIGURAÇÕES
- Editar: Nome, Descrição, Tipo, Avatar, Arquivar
- Botão para deletar canal
- Apenas criador + admin podem editar

**Componentes:** `<SettingsModal>` + `<DeleteConfirmModal>`

---

### 3️⃣ PINNED MESSAGES (tipo WhatsApp)
- **Apenas 1 mensagem fixada por vez**
- Aparece como banner no topo do chat
- Ao clicar no banner → scrolla até a mensagem e destaca
- Ícone de pino preenchido + badge "Fixado" na mensagem

**Componente:** `<PinnedMessageBanner>`

---

### 4️⃣ INPUT DE MENSAGENS (Corrigir)
- **Altura dinâmica**: Cresce ao digitar (máx 120px)
- **Centralizado**: Alinhamento vertical correto (align-items: center)
- **Word-wrap**: Texto quebra linha automaticamente

**Arquivo:** `app/globals.css` + `app/chat/page.tsx`

---

### 5️⃣ BOTÃO DELETE NÃO FUNCIONA
- Adicionar `onClick={() => setModal('deleteConfirm')}`
- Botão já existe, só falta o handler

**Arquivo:** `app/chat/page.tsx` (linha ~902)

---

### 6️⃣ BOTÕES SETTINGS/EDIT NÃO FUNCIONAM
- Adicionar `onClick={() => setModal('settings')}`
- Botão já existe, só falta o handler

**Arquivo:** `app/chat/page.tsx` (linha ~901)

---

## 🎯 ARQUITETURA

```
Novos Componentes:
├── <MembersModal>
├── <SettingsModal>
├── <DeleteConfirmModal>
└── <PinnedMessageBanner>

Modificações:
├── app/chat/page.tsx (adicionar lógica + handlers)
├── app/globals.css (CSS do input)
└── lib/hooks.ts (usar funções existentes: pinMensagem, updateCanal, deleteCanal)
```

---

## 💾 MUDANÇAS NO DATABASE

**Já existe:**
- Tabela `mensagens` com coluna `pinada` (boolean)
- Funções: `pinMensagem()`, `updateCanal()`, `deleteCanal()`

**Nada novo para criar no banco!**

---

## 🔑 PERMISSÕES

```
Editando Canal (Settings):
✅ Criador do canal
✅ Admin Geral
❌ Outros usuários (apenas visualizam)

Fixando Mensagens:
✅ Criador do canal
✅ Admin Geral
❌ Outros usuários

Deletando Canal:
✅ Criador do canal
✅ Admin Geral
❌ Outros usuários
```

---

## 📦 DEPENDÊNCIAS EXISTENTES

Tudo que você precisa já existe!

```typescript
// Hooks (em lib/hooks.ts)
- updateCanal()
- deleteCanal()
- pinMensagem()
- addParticipante()
- removeParticipante()

// Componentes
- Modal system (já implementado)
- ChatHeader (já existe)
- ChatInput (modificar CSS apenas)

// Utils
- AVATAR_COLORS
- getInitials()
- getColor()
```

---

## 🛠️ ORDEM DE IMPLEMENTAÇÃO (RECOMENDADA)

1. **CSS first** (mais rápido): Corrigir input (align-items + word-wrap)
2. **Pinned Banner**: Componente simples, funcionalidade isolada
3. **Delete + Settings handlers**: Adicionar 2 linhas de onClick
4. **Members Modal**: Modal com checkboxes
5. **Settings Modal**: Modal com form
6. **Delete Confirm Modal**: Modal de confirmação simples
7. **Testes e integração**: Garantir que tudo funciona junto

---

## 📐 COMPONENTE EXEMPLO: DeleteConfirmModal

```typescript
<div className="modal-overlay">
  <div className="modal-content">
    <h2>⚠️ Deletar Canal</h2>
    <p>Tem certeza que deseja deletar <strong>{activeCanal.nome}</strong>?</p>
    <p>Todas as mensagens serão permanentemente removidas.</p>

    <div className="modal-actions">
      <button onClick={closeModal}>Cancelar</button>
      <button
        onClick={async () => {
          await deleteCanal(activeCanalId);
          setActiveCanalId(null); // Volta para Canais
        }}
        className="btn-danger"
      >
        Sim, Deletar
      </button>
    </div>
  </div>
</div>
```

---

## ⏱️ ESTIMATIVA DE TEMPO

| Tarefa | Tempo |
|--------|-------|
| CSS do input | 15 min |
| PinnedMessageBanner | 30 min |
| Delete + Settings handlers | 5 min |
| MembersModal | 45 min |
| SettingsModal | 1h |
| DeleteConfirmModal | 15 min |
| Testes + Integração | 1h |
| **TOTAL** | **~3h 45 min** |

---

## 📄 DOCUMENTAÇÃO COMPLETA

Veja o arquivo `CHAT_FEATURES_DESIGN.md` para:
- Código completo de cada componente
- CSS detalhado
- Decision Log (por que cada escolha foi feita)
- Lógica de pinned messages (funções, hooks)
- State management (modais)
- Checklist de implementação

---

## ❓ DÚVIDAS FREQUENTES

**P: Como fixar apenas 1 mensagem?**
R: Se já tem uma fixada, desfixa a anterior antes de fixar a nova.

**P: Onde aparece a mensagem fixada?**
R: No topo do chat, como um banner (tipo WhatsApp).

**P: Quem pode fixar mensagens?**
R: Criador do canal + Admin Geral.

**P: O banco de dados precisa mudar?**
R: Não! Tudo já existe.

**P: Preciso criar novos hooks?**
R: Não! Todos os hooks necessários já existem.

---

## ✅ ÚLTIMO CHECKLIST ANTES DE COMEÇAR

- [ ] Tenho o arquivo `CHAT_FEATURES_DESIGN.md` com design completo
- [ ] Entendi as 6 tarefas principais
- [ ] Sou o Gemini pronto para implementar
- [ ] Vou seguir a ordem recomendada de implementação
- [ ] Vou testar cada componente individualmente

---

**Documento criado:** 18 de Março, 2026
**Versão:** 1.0
**Status:** ✅ Pronto para Implementação
