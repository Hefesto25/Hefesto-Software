# Comercial Design Fix - Restauração da Identidade Visual

## Goal
Analisar, identificar e corrigir divergências de design na aba comercial que foram introduzidas em uma edição anterior, restaurando coerência visual, simetria e alinhamento com os padrões da plataforma.

---

## Analysis Phase

- [ ] **Task 1:** Revisar screenshots atuais vs. spec (COMERCIAL_VISUAL_DESIGN.md) → Documentar 5-10 divergências específicas (layout, spacing, cores, tipografia)
  - Verify: Lista de problemas identificados com prints anotados

- [ ] **Task 2:** Explorar componentes afetados (WidgetTaxaConversao, FilaRetornoTab, FunilConversaoTab, BadgeFeedback, page.tsx)
  - Verify: Componentes com código desorganizado identificados

- [ ] **Task 3:** Criar visual comparison doc com before/after (usar /screenshots depois)
  - Verify: Documento com screenshots esperados vs. atuais

---

## Design Restoration Phase

- [ ] **Task 4:** Usar `/frontend-design` para redefine visual system (tipografia, spacing, cores, grid)
  - Owner: Design Lead (sub-agent)
  - Verify: Design system spec atualizado + Figma/mockup

- [ ] **Task 5:** Aplicar fixes ao `WidgetTaxaConversao.tsx` (alinhamento, spacing, responsividade)
  - Owner: Frontend Dev 1 (sub-agent)
  - Verify: Componente renderiza corretamente, sem quebras

- [ ] **Task 6:** Corrigir `FilaRetornoTab.tsx` (card layouts, cores de urgência, tipografia)
  - Owner: Frontend Dev 1 (sub-agent)
  - Verify: Cards exibem corretamente com cores coerentes

- [ ] **Task 7:** Restaurar `FunilConversaoTab.tsx` (tabela, gráfico, spacing)
  - Owner: Frontend Dev 2 (sub-agent)
  - Verify: Gráfico + tabela alinhados e simétricos

- [ ] **Task 8:** Revisar `BadgeFeedback.tsx` (mini-cards layout, cores background)
  - Owner: Frontend Dev 2 (sub-agent)
  - Verify: 3 colunas renderizam com simetria

- [ ] **Task 9:** Usar `/ui-ux-pro-max` para validar decisões de design
  - Owner: Design Lead (sub-agent)
  - Verify: Score de UX >= 8/10 em todas as abas

---

## Validation Phase

- [ ] **Task 10:** Fazer login (credenciais fornecidas) → Tirar screenshots com `/screenshots`
  - Owner: QA (sub-agent)
  - Verify: Screenshots salvos em `/screenshots-comercial-fixed/`

- [ ] **Task 11:** Comparar visual antes/depois → Confirmar alinhamento com spec
  - Owner: Design Lead + QA (sub-agent)
  - Verify: Checklist de 10 divergências resolvidas ✅

- [ ] **Task 12:** Testar responsividade (mobile, tablet, desktop) → Capturar e comparar
  - Owner: QA (sub-agent)
  - Verify: Breakpoints funcionam corretamente

- [ ] **Task 13:** Limpar credenciais (env.local) e gerar relatório final
  - Owner: QA (sub-agent)
  - Verify: Relatório com antes/depois, scores de UX, recomendações

---

## Done When
- [ ] Todos os problemas identificados estão listados e documentados
- [ ] Componentes restaurados com design coerente
- [ ] `/ui-ux-pro-max` valida UX >= 8/10
- [ ] Screenshots confirmam alinhamento com spec
- [ ] Credenciais limpas do repositório
- [ ] Relatório final entregue

---

## Notes
- **Credenciais:** Nunca salvar em arquivo; usar apenas durante exec
- **Sub-agents:** 1 Design Lead + 2 Frontend Devs + 1 QA
- **Screenshots:** Usar `/screenshots` skill para capturas consistentes
- **Validação:** Sempre comparar com COMERCIAL_VISUAL_DESIGN.md como source of truth
