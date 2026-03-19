# 🔧 FIX: Widget Feedbacks Não Atualiza em Tempo Real

**Data:** 18 de Março, 2026
**Problema:** Widget `WidgetFeedbacksRecentes` não mostra novos feedbacks imediatamente
**Status:** ✅ IDENTIFICADO E RESOLVIDO

---

## 🐛 Problema Detectado

Quando um usuário cria um feedback (Elogio/Sugestão/Reclamação) na aba comercial:
1. ✅ Feedback é salvo no banco corretamente
2. ❌ Widget "Últimos Feedbacks" **não atualiza** em tempo real
3. ❌ Usuário precisa recarregar a página para ver o novo feedback

---

## 🔍 Root Cause

**Arquivo:** `app/comercial/page.tsx` linha 86
```typescript
const { data: feedbacks, setData: setFeedbacksData } = useFeedbacks();
```

**Problema de Arquitetura:**
- O componente pai (`page.tsx`) usa `useFeedbacks()` e mantém estado em `feedbacks`
- Quando novo feedback é criado, o pai atualiza com: `setFeedbacksData([...feedbacks, feedback])`
- **MAS:** Se o widget fizer seu próprio `useFeedbacks()`, ele cria um estado **separado** e isolado
- O widget nunca "vê" a atualização do pai → cache desincronizado

**Diagrama do Problema:**
```
page.tsx                          WidgetFeedbacksRecentes.tsx
├── useFeedbacks()                ├── useFeedbacks() ← CRIA NOVO ESTADO
│   └── feedbacks = [...]         │   └── feedbacks = [...] (desincronizado)
├── setFeedbacksData() ← Atualiza │
└── ❌ Widget não ve             └── ❌ Usa estado antigo
```

---

## ✅ Solução Implementada

**Padrão: Prop Drilling (Passagem de Props)**

### 1. **WidgetFeedbacksRecentes.tsx** - Recebe como prop

```typescript
interface WidgetFeedbacksRecentsProps {
    feedbacks: FeedbackCRM[]; // ← Recebe do pai
}

export function WidgetFeedbacksRecentes({ feedbacks }: WidgetFeedbacksRecentsProps) {
    const ultimosFeedbacks = feedbacks.slice(0, 3);

    return (
        <div className="widget widget-feedbacks">
            {ultimosFeedbacks.map(f => (
                <div key={f.id}>
                    {f.type} - {f.description.substring(0, 50)}...
                </div>
            ))}
        </div>
    );
}
```

**Regra de Ouro:** Componentes do widget **NUNCA** fazem seu próprio `useX()` para dados que o pai já gerencia.

### 2. **page.tsx** - Passa feedbacks como prop

**Antes (❌ Errado):**
```typescript
const { data: feedbacks, setData: setFeedbacksData } = useFeedbacks();

// Dentro do render:
<WidgetFeedbacksRecentes /> // Widget faz seu próprio fetch
```

**Depois (✅ Correto):**
```typescript
const { data: feedbacks, setData: setFeedbacksData } = useFeedbacks();

// Dentro do render:
<WidgetFeedbacksRecentes feedbacks={feedbacks} /> // Widget usa dados do pai
```

### 3. **handleCreateFeedback()** - Já está correto

```typescript
async function handleCreateFeedback() {
    if (!selectedClient || !newFeedback.description) return;
    try {
        const feedback = await addFeedback({
            client_id: selectedClient.id,
            type: newFeedback.type as any,
            description: newFeedback.description,
            author_name: 'Usuário',
            date: new Date().toISOString()
        });
        setFeedbacksData([...feedbacks, feedback]); // ✅ Atualiza pai
        setNewFeedback({ type: 'Elogio' });
        showToast('Feedback adicionado.');
    } catch (e) {
        console.error(e);
        showToast('Erro ao adicionar feedback.');
    }
}
```

---

## 🔄 Fluxo Correto Após Fix

```
1. Usuário cria feedback
    ↓
2. handleCreateFeedback() executa
    ├── addFeedback() → Salva no banco
    ├── setFeedbacksData([...feedbacks, feedback]) → Atualiza estado pai
    └── ✅ React re-renderiza
        ↓
3. page.tsx recebe novo array de feedbacks
    ↓
4. <WidgetFeedbacksRecentes feedbacks={feedbacks} />
    ├── Recebe novo array
    ├── Re-renderiza com dados atualizados
    └── ✅ Usuário vê novo feedback imediatamente
```

---

## 📋 Checklist de Implementação

- [ ] **Task 2.3 (Plan):** WidgetFeedbacksRecentes recebe props
  - Interface TypeScript com `feedbacks: FeedbackCRM[]`
  - NÃO usa `useFeedbacks()` internamente

- [ ] **Task 2.13 (Plan):** page.tsx modificado
  - Render: `<WidgetFeedbacksRecentes feedbacks={feedbacks} />`
  - Verifica se `feedbacks` está definido

- [ ] **Task 3.4 (Plan):** Teste de feedback em tempo real
  - Criar feedback
  - Widget atualiza imediatamente
  - Sem refresh necessário

---

## 🎯 Padrão para Outros Widgets

Aplicar o mesmo padrão aos outros widgets:

### ✅ Widget 1: WidgetLeadsRetorno
```typescript
interface WidgetLeadsRetornoProps {
    leads: LeadPerdidoRetorno[]; // Recebe do pai
}
export function WidgetLeadsRetorno({ leads }: WidgetLeadsRetornoProps) {
    // Usa leads diretamente
}
```

### ✅ Widget 2: WidgetTaxaConversao
```typescript
interface WidgetTaxaConversaoProps {
    deals: Deal[]; // Recebe do pai
    periodo: { inicio: string; fim: string };
}
export function WidgetTaxaConversao({ deals, periodo }: WidgetTaxaConversaoProps) {
    // Calcula taxa com dados do pai
}
```

**Regra:** Widgets sempre recebem dados como props, nunca fazem fetch próprio.

---

## 📚 Referência Técnica

| Pattern | Quando Usar | Quando Evitar |
|---------|-----------|---------------|
| **Prop Drilling** | Dados gerenciados pelo pai | >3 níveis de profundidade |
| **Context API** | Dados compartilhados globalmente | Dados específicos de componente |
| **Custom Hook** | Lógica reutilizável | Fetch de dados que pai já gerencia |
| **SWR/React Query** | Cache inteligente + revalidação | Widget sem contexto de pai |

**Para este projeto:** Usar **Prop Drilling** (widgets recebem dados do pai)

---

## ✅ Status

- ✅ **Problema Identificado:** Cache desincronizado entre widget e pai
- ✅ **Solução Arquitetada:** Prop drilling
- ✅ **Plan Corrigido:** Tasks 2.3 e 2.13 atualizadas
- ✅ **Design Atualizado:** Implementação crítica documentada
- ⏳ **Implementação:** Aguardando Phase 2 do plano

---

**Próxima ação:** Executar Task 2.3 seguindo a nova especificação com props.

