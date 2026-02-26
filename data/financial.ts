export const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const financialData = [
    { month: 'Jan', receita: 85000, custos: 32000, despesas: 18000, lucro_bruto: 53000, lucro_liquido: 35000 },
    { month: 'Fev', receita: 92000, custos: 34000, despesas: 19500, lucro_bruto: 58000, lucro_liquido: 38500 },
    { month: 'Mar', receita: 78000, custos: 30000, despesas: 17000, lucro_bruto: 48000, lucro_liquido: 31000 },
    { month: 'Abr', receita: 105000, custos: 38000, despesas: 22000, lucro_bruto: 67000, lucro_liquido: 45000 },
    { month: 'Mai', receita: 115000, custos: 41000, despesas: 24000, lucro_bruto: 74000, lucro_liquido: 50000 },
    { month: 'Jun', receita: 98000, custos: 36000, despesas: 20000, lucro_bruto: 62000, lucro_liquido: 42000 },
    { month: 'Jul', receita: 110000, custos: 39000, despesas: 23000, lucro_bruto: 71000, lucro_liquido: 48000 },
    { month: 'Ago', receita: 125000, custos: 44000, despesas: 26000, lucro_bruto: 81000, lucro_liquido: 55000 },
    { month: 'Set', receita: 118000, custos: 42000, despesas: 25000, lucro_bruto: 76000, lucro_liquido: 51000 },
    { month: 'Out', receita: 130000, custos: 46000, despesas: 27000, lucro_bruto: 84000, lucro_liquido: 57000 },
    { month: 'Nov', receita: 140000, custos: 49000, despesas: 29000, lucro_bruto: 91000, lucro_liquido: 62000 },
    { month: 'Dez', receita: 155000, custos: 54000, despesas: 32000, lucro_bruto: 101000, lucro_liquido: 69000 },
];

export const expenseCategories = [
    { name: 'Salários', value: 98000, color: '#F59E0B' },
    { name: 'Marketing', value: 42000, color: '#3B82F6' },
    { name: 'Infraestrutura', value: 35000, color: '#10B981' },
    { name: 'Software/SaaS', value: 28000, color: '#8B5CF6' },
    { name: 'Escritório', value: 18000, color: '#EF4444' },
    { name: 'Viagens', value: 12000, color: '#EC4899' },
    { name: 'Outros', value: 9500, color: '#6B7280' },
];

export const cashFlowData = financialData.map((item, i) => {
    const saldo = financialData.slice(0, i + 1).reduce((acc, d) => acc + d.lucro_liquido, 0);
    return { ...item, saldo_acumulado: saldo };
});

export const marginsData = financialData.map(item => ({
    month: item.month,
    margem_bruta: ((item.lucro_bruto / item.receita) * 100).toFixed(1),
    margem_operacional: (((item.receita - item.custos - item.despesas * 0.6) / item.receita) * 100).toFixed(1),
    margem_liquida: ((item.lucro_liquido / item.receita) * 100).toFixed(1),
    pct_custos: ((item.custos / item.receita) * 100).toFixed(1),
    pct_despesas: ((item.despesas / item.receita) * 100).toFixed(1),
}));

export const dreData = {
    receita_bruta: financialData.reduce((a, d) => a + d.receita, 0),
    deducoes: 45000,
    receita_liquida: financialData.reduce((a, d) => a + d.receita, 0) - 45000,
    custos_servicos: financialData.reduce((a, d) => a + d.custos, 0),
    lucro_bruto: financialData.reduce((a, d) => a + d.lucro_bruto, 0),
    despesas_operacionais: {
        administrativas: 98000,
        comerciais: 42000,
        marketing: 35000,
        tecnologia: 28000,
        gerais: 39500,
    },
    total_despesas: financialData.reduce((a, d) => a + d.despesas, 0),
    lucro_operacional: 0,
    resultado_financeiro: -12000,
    lucro_antes_ir: 0,
    ir_csll: 0,
    lucro_liquido: financialData.reduce((a, d) => a + d.lucro_liquido, 0),
};

dreData.lucro_operacional = dreData.lucro_bruto - dreData.total_despesas;
dreData.lucro_antes_ir = dreData.lucro_operacional + dreData.resultado_financeiro;
dreData.ir_csll = dreData.lucro_antes_ir * 0.15;

export const dailyCashFlow = [
    { date: '2026-02-01', descricao: 'Receita Projeto Alpha', tipo: 'entrada', valor: 15000, saldo: 215000 },
    { date: '2026-02-03', descricao: 'Aluguel Escritório', tipo: 'saida', valor: 4500, saldo: 210500 },
    { date: '2026-02-05', descricao: 'Folha de Pagamento', tipo: 'saida', valor: 32000, saldo: 178500 },
    { date: '2026-02-07', descricao: 'Receita Consultoria', tipo: 'entrada', valor: 8500, saldo: 187000 },
    { date: '2026-02-10', descricao: 'AWS/Infra Cloud', tipo: 'saida', valor: 2800, saldo: 184200 },
    { date: '2026-02-12', descricao: 'Receita Projeto Beta', tipo: 'entrada', valor: 22000, saldo: 206200 },
    { date: '2026-02-14', descricao: 'Marketing Digital', tipo: 'saida', valor: 5500, saldo: 200700 },
    { date: '2026-02-15', descricao: 'Licenças Software', tipo: 'saida', valor: 3200, saldo: 197500 },
    { date: '2026-02-18', descricao: 'Receita Manutenção', tipo: 'entrada', valor: 6000, saldo: 203500 },
    { date: '2026-02-19', descricao: 'Impostos', tipo: 'saida', valor: 8900, saldo: 194600 },
];

export const goals = [
    { name: 'Receita Anual', target: 1500000, current: 1351000, color: '#F59E0B' },
    { name: 'Margem Líquida', target: 40, current: 36.2, unit: '%', color: '#10B981' },
    { name: 'Redução de Custos', target: 15, current: 8, unit: '%', color: '#3B82F6' },
    { name: 'Reserva Emergência', target: 200000, current: 145000, color: '#8B5CF6' },
];
