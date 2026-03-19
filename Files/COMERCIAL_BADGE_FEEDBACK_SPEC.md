# 🎨 Especificação: BadgeFeedback Component

**Data:** 18 de Março, 2026
**Componente:** BadgeFeedback.tsx
**Localização:** `app/comercial/components/ClienteCRM/`
**Status:** PRONTO PARA IMPLEMENTAÇÃO

---

## 📍 Localização no UI

O badge aparece **no título do modal do cliente CRM**, ao lado do nome:

```
┌─────────────────────────────────────────────┐
│ 👤 João Silva - Empresa XYZ   [😊 5|⚠️ 2|😞 0]  ✕ │
├─────────────────────────────────────────────┤
│ [Detalhes] [Rentabilidade] [Reuniões] [...] │
└─────────────────────────────────────────────┘
```

**Arquivo:** Linha 2012 do `app/comercial/page.tsx`:
```typescript
<h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    {selectedClient.name}
    <BadgeFeedback clientId={selectedClient.id} feedbacks={feedbacks} />
</h2>
```

---

## 🎯 O Que o Componente Faz

### **Props:**
```typescript
interface BadgeFeedbackProps {
    clientId: string;
    feedbacks: FeedbackCRM[];
}
```

### **Comportamento:**
1. **Filtra feedbacks** do cliente: `feedbacks.filter(f => f.client_id === clientId)`
2. **Conta por tipo:**
   - Elogios (type === 'Elogio')
   - Sugestões (type === 'Sugestão')
   - Reclamações (type === 'Reclamação')
3. **Renderiza 3 mini-cards** lado a lado
4. **Clique em qualquer mini-card** → Abre sub-aba "Feedbacks" do modal

---

## 💻 Implementação Completa

```typescript
// app/comercial/components/ClienteCRM/BadgeFeedback.tsx

import { FeedbackCRM } from '@/lib/types';

interface BadgeFeedbackProps {
    clientId: string;
    feedbacks: FeedbackCRM[];
}

export function BadgeFeedback({ clientId, feedbacks }: BadgeFeedbackProps) {
    // Filtrar feedbacks do cliente
    const clientFeedbacks = feedbacks.filter(f => f.client_id === clientId);

    // Contar por tipo
    const elogios = clientFeedbacks.filter(f => f.type === 'Elogio').length;
    const sugestoes = clientFeedbacks.filter(f => f.type === 'Sugestão').length;
    const reclamacoes = clientFeedbacks.filter(f => f.type === 'Reclamação').length;

    // Se não há feedbacks, não renderiza nada
    if (clientFeedbacks.length === 0) {
        return null;
    }

    return (
        <div
            className="feedback-badge"
            style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
            }}
        >
            {/* Mini-card Elogios */}
            <div
                style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: elogios > 0 ? '#D1FAE5' : '#F3F4F6',
                    color: elogios > 0 ? '#047857' : '#6B7280',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#A7F3D0';
                    e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = elogios > 0 ? '#D1FAE5' : '#F3F4F6';
                    e.currentTarget.style.transform = 'scale(1)';
                }}
            >
                <span>😊</span>
                <span>{elogios}</span>
            </div>

            {/* Mini-card Sugestões */}
            <div
                style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: sugestoes > 0 ? '#FEF3C7' : '#F3F4F6',
                    color: sugestoes > 0 ? '#92400E' : '#6B7280',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FCD34D';
                    e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = sugestoes > 0 ? '#FEF3C7' : '#F3F4F6';
                    e.currentTarget.style.transform = 'scale(1)';
                }}
            >
                <span>⚠️</span>
                <span>{sugestoes}</span>
            </div>

            {/* Mini-card Reclamações */}
            <div
                style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    background: reclamacoes > 0 ? '#FEE2E2' : '#F3F4F6',
                    color: reclamacoes > 0 ? '#991B1B' : '#6B7280',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FECACA';
                    e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = reclamacoes > 0 ? '#FEE2E2' : '#F3F4F6';
                    e.currentTarget.style.transform = 'scale(1)';
                }}
            >
                <span>😞</span>
                <span>{reclamacoes}</span>
            </div>
        </div>
    );
}
```

---

## 🎨 Styles (Tailwind Alternative)

Se preferir usar Tailwind, adicione à sua classe:

```typescript
// Usando className em vez de style:
<div className="flex gap-2 items-center">
    {/* Elogios */}
    <div className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition hover:scale-105 ${
        elogios > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
    }`}>
        <span>😊</span> {elogios}
    </div>
    {/* ... mesmo padrão para sugestões e reclamações */}
</div>
```

---

## ✅ Checklist de Implementação

- [ ] Criar arquivo: `app/comercial/components/ClienteCRM/BadgeFeedback.tsx`
- [ ] Implementar interface `BadageFeedbackProps`
- [ ] Filtrar feedbacks por `clientId`
- [ ] Contar por tipo (Elogio, Sugestão, Reclamação)
- [ ] Renderizar 3 mini-cards com cores corretas
- [ ] Adicionar hover effects (scale + cor mais clara)
- [ ] Retornar `null` se não há feedbacks
- [ ] Importar em `app/comercial/page.tsx` (linha 2012)
- [ ] Testar: criar feedback → deve aparecer no badge imediatamente

---

## 🔗 Integração em page.tsx

**Já está pronto na linha 2012:**
```typescript
import { BadgeFeedback } from './ClienteCRM/BadgeFeedback';

// ... no render:
<h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
    {selectedClient.name}
    <BadgeFeedback clientId={selectedClient.id} feedbacks={feedbacks} />
</h2>
```

---

## 📊 Estados Visuais

| Estado | Visual | Quando |
|--------|--------|--------|
| **Com dados** | 😊 5 | `elogios > 0` |
| **Sem dados** | 😊 0 (cinza) | `elogios === 0` |
| **Hover** | Cor mais clara + scale 1.05 | Usuário passa mouse |

---

## 🎯 Dados de Exemplo

```typescript
// Se o cliente tem esses feedbacks:
feedbacks = [
    { id: '1', client_id: 'abc123', type: 'Elogio', description: 'Ótimo!' },
    { id: '2', client_id: 'abc123', type: 'Elogio', description: 'Perfeito!' },
    { id: '3', client_id: 'abc123', type: 'Sugestão', description: 'Melhorar...' },
    { id: '4', client_id: 'xyz789', type: 'Reclamação', description: 'Problema...' }, // Outro cliente
];

// Badge renderiza:
😊 2 | ⚠️ 1 | 😞 0
```

---

## 🧪 Teste Manual

1. Abrir CRM → Selecionar cliente
2. Criar um feedback (Elogio)
3. Verificar: Badge aparece com `😊 1 | ⚠️ 0 | 😞 0`
4. Criar outro feedback (Sugestão)
5. Verificar: Badge atualiza para `😊 1 | ⚠️ 1 | 😞 0`
6. Clicar no badge → Abre sub-aba Feedbacks do cliente

---

## ⚠️ Notas Importantes

- **Sem feedbacks:** Retorna `null` (não renderiza nada)
- **Atualização em tempo real:** Recebe `feedbacks` como prop, não faz fetch próprio
- **Clicabilidade:** Ao clicar em qualquer mini-card, deve abrir a sub-aba de feedbacks
- **Cores:** Use as cores do design system existente (emerald/amber/red)

---

**Pronto para implementação na Task 2.12 do plano!**

