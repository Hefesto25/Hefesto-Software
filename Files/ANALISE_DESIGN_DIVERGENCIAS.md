# Análise de Divergências: Aba Comercial Design

**Data:** 18 de Março, 2026
**Status:** ⚠️ ANÁLISE PRELIMINAR

---

## Estrutura Atual vs. Especificação

### ✅ Componentes Implementados
1. **WidgetLeadsRetorno** - ✅ Renderizado no dashboard
2. **WidgetTaxaConversao** - ✅ Renderizado no dashboard
3. **WidgetFeedbacksRecentes** - ✅ Renderizado no dashboard
4. **FilaRetornoTab** - ✅ Importado na página
5. **FunilConversaoTab** - ✅ Importado na página
6. **BadgeFeedback** - ✅ Importado na página

### 📐 Grid Layout dos Widgets (Atual)
```
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
  • WidgetLeadsRetorno
  • WidgetTaxaConversao
  • WidgetFeedbacksRecentes
</div>
```

**Especificação esperada:**
```
3 widgets em grid igual → ✅ CORRETO
Espaçamento (gap: 16) → ✅ ADEQUADO
Altura mínima dos widgets → ⚠️ VERIFICAR (min-h-[140px] definido)
```

---

## Possíveis Divergências Identificadas

### 🔴 Nível CRÍTICO
1. **Integração das Abas**
   - [ ] Tabs estão sendo renderizadas quando `activeTab` muda?
   - [ ] Verificar: `activeTab === 'fila_retorno'`, `activeTab === 'funil'`
   - **Action:** Revisar page.tsx linhas que renderizam estas abas

2. **Props dos Widgets**
   - [ ] WidgetLeadsRetorno recebe `vencidos`, `proximos7d` ✅
   - [ ] WidgetTaxaConversao recebe `conversaoData` ✅
   - [ ] WidgetFeedbacksRecentes recebe `feedbacks` ✅
   - **Status:** Props parecem corretos

### 🟡 Nível MÉDIO
3. **Responsividade**
   - [ ] Grid com 3 colunas quebra em tablets/mobile?
   - [ ] Não há media queries no style inline
   - **Expected spec:** Responsivo para >=768px
   - **Action:** Adicionar breakpoints CSS

4. **Tipografia e Spacing**
   - [ ] Widgets usam `kpi-card` class - verificar CSS
   - [ ] Font sizes: 10px (labels), 9px (sub-labels), 28px (valores)
   - [ ] Cores: inline `style={{ color: 'var(--text-muted)' }}`
   - **Status:** Parece correto, mas variáveis CSS podem estar desalinhadas

5. **Ícones e Cores**
   - [ ] WidgetLeadsRetorno: icone vermelho, badge vermelha ✅
   - [ ] WidgetTaxaConversao: icone azul, trends ✅
   - [ ] WidgetFeedbacksRecentes: icone azul (accent-muted) ✅
   - **Status:** Cores parecem coerentes

### 🟢 Nível BAIXO
6. **Acessibilidade**
   - [ ] Labels descritivos ✅
   - [ ] Cores suficientemente contrastadas - **VERIFICAR**
   - [ ] WCAG 2.1 AA compliance

---

## Recomendações de Ação

### Fase 1: Validação Técnica
1. ✅ Verificar se todas as tabs estão renderizando corretamente
2. ⚠️ Fazer login e tirar screenshots para validar visualmente
3. ⚠️ Comparar cores reais vs. variáveis CSS definidas

### Fase 2: Correções Necessárias
1. **Responsividade:** Adicionar `@media (max-width: 1024px)` para quebrar grid para 2 colunas
2. **Espaçamento:** Confirmar que margin/padding estão conforme spec
3. **Cores:** Validar que `var(--text-muted)`, `var(--accent)`, etc. existem no CSS global

### Fase 3: Otimizações de Design
1. Adicionar transições suaves em hover (já presente em alguns componentes)
2. Validar contrast ratio em modo light/dark
3. Testar em diferentes resoluções

---

## Próximo Passo
**➡️ Task 10:** Fazer login e tirar screenshots para identificar divergências visuais reais
