# 🔗 Notas de Integração - Badge + Sub-aba Feedbacks

**Data:** 18 de Março, 2026
**Objetivo:** Conectar Badge de Feedback com abertura da sub-aba
**Status:** PRONTO

---

## 🎯 O Fluxo Esperado

```
1. Modal do cliente abre
    ↓
2. BadgeFeedback renderiza: 😊 5 | ⚠️ 2 | 😞 0
    ↓
3. Usuário clica em qualquer mini-card
    ↓
4. Sub-aba "Feedbacks" abre automaticamente
    ↓
5. Lista de feedbacks do cliente é exibida
```

---

## 💻 Implementação no BadgeFeedback

O componente precisa receber um **callback** para abrir a sub-aba:

### **Versão Corrigida do BadgeFeedback.tsx:**

```typescript
import { FeedbackCRM } from '@/lib/types';

interface BadgeFeedbackProps {
    clientId: string;
    feedbacks: FeedbackCRM[];
    onOpenFeedbacksTab?: () => void; // ← NOVO: callback
}

export function BadgeFeedback({ clientId, feedbacks, onOpenFeedbacksTab }: BadgeFeedbackProps) {
    const clientFeedbacks = feedbacks.filter(f => f.client_id === clientId);
    const elogios = clientFeedbacks.filter(f => f.type === 'Elogio').length;
    const sugestoes = clientFeedbacks.filter(f => f.type === 'Sugestão').length;
    const reclamacoes = clientFeedbacks.filter(f => f.type === 'Reclamação').length;

    if (clientFeedbacks.length === 0) return null;

    const handleClick = () => {
        if (onOpenFeedbacksTab) {
            onOpenFeedbacksTab();
        }
    };

    return (
        <div className="feedback-badge" style={{ display: 'flex', gap: '8px' }}>
            {/* Cada mini-card chama handleClick */}
            <div onClick={handleClick} style={{ /* ... styles ... */ }}>
                😊 {elogios}
            </div>
            <div onClick={handleClick} style={{ /* ... styles ... */ }}>
                ⚠️ {sugestoes}
            </div>
            <div onClick={handleClick} style={{ /* ... styles ... */ }}>
                😞 {reclamacoes}
            </div>
        </div>
    );
}
```

---

## 🔧 Integração em page.tsx

**Onde está agora (linha ~2012):**
```typescript
<h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    {selectedClient.name}
    <BadgeFeedback
        clientId={selectedClient.id}
        feedbacks={feedbacks}
        onOpenFeedbacksTab={() => setClientTab('feedbacks')} // ← NOVO
    />
</h2>
```

**Explicação:**
- `onOpenFeedbacksTab` recebe uma função que chama `setClientTab('feedbacks')`
- Quando usuário clica no badge, a sub-aba de feedbacks abre automaticamente
- `setClientTab` já existe no page.tsx (linha ~125)

---

## 🎨 CSS Cursor Pointer

Adicione cursor pointer aos mini-cards para sinalizar que são clicáveis:

```typescript
style={{
    // ... outros styles ...
    cursor: 'pointer',
    transition: 'all 200ms ease',
    userSelect: 'none', // Evita seleção de texto ao clicar
}}
```

---

## 📋 Checklist de Integração

- [ ] BadgeFeedback aceita prop `onOpenFeedbacksTab`
- [ ] Cada mini-card tem `onClick={handleClick}`
- [ ] Em page.tsx, passar callback: `onOpenFeedbacksTab={() => setClientTab('feedbacks')}`
- [ ] Teste: clicar no badge → sub-aba abre
- [ ] Todos os 3 mini-cards têm clique funcionando

---

## 🧪 Teste Completo

```
1. Abrir CRM
2. Selecionar cliente com feedbacks
3. Modal abre → Badge renderiza com contadores
4. Clicar em qualquer mini-card
5. Sub-aba "Feedbacks" ativa automaticamente ✅
6. Lista de feedbacks do cliente aparece ✅
7. Clicar novamente em outro mini-card → Continua na aba
```

---

## 💡 Alternativa (se preferir diferente)

Se não quiser abrir a aba automaticamente, pode mostrar um tooltip:

```typescript
// Alternativa: Tooltip ao hover
<div
    title="5 elogios - clique para ver detalhes"
    onClick={handleClick}
    style={{ /* ... */ }}
>
    😊 5
</div>
```

Mas **recomendado:** Abrir a aba automaticamente (mais intuitivo).

---

**Pronto! Isso completa a integração do Badge com a funcionalidade de Feedbacks.**

