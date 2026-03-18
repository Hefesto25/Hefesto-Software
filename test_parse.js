const text = `
09/03/2026 Tarifa Manutencao Conta Corrente -99,00 151,31
06/03/2026 Rendimento Liquido De Contamax 0,01 250,31
06/03/2026 Pix Enviado -550,00 250,30
18/02/2026 Pagamento De Boleto Outros Bancos 0000000000 -90,00 1.050,80
02/03/2026 Pix Recebido 4.000,00 4.014,44
15/03/2024  TED RECEBIDA - FULANO  -  1.250,00
`;

function parseBRDate(raw) {
    const parts = raw.split('/');
    if (parts.length !== 3) return null;
    const [day, month, year] = parts;
    const date = new Date(year + '-' + month + '-' + day + 'T00:00:00');
    if (isNaN(date.getTime())) return null;
    return year + '-' + month + '-' + day;
}

function parseSantanderPDF(text) {
    const transactions = [];

    // OLD FORMAT
    // Example line: "15/03/2024  TED RECEBIDA - FULANO  -  1.250,00"
    const oldLineRegex = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s{2,}(\d{1,3}(?:\.\d{3})*,\d{2})?\s*(-|–)?\s*(\d{1,3}(?:\.\d{3})*,\d{2})?/g;
    
    // NEW FORMAT (App Santander Empresas)
    // Example line: "09/03/2026 Tarifa Manutencao Conta Corrente -99,00 151,31"
    const newLineRegex = /(?:^|\n)(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/g;

    const matchesOld = Array.from(text.matchAll(oldLineRegex));
    const matchesNew = Array.from(text.matchAll(newLineRegex));

    console.log("OLD MATCHES:", matchesOld.length);
    console.log("NEW MATCHES:", matchesNew.length);
    
    // We can just process lines individually.
    const lines = text.split('\n');
    for (const line of lines) {
        if (!line.trim()) continue;
        
        let matched = false;
        
        // Try new format first (more strict with the balance value at the end)
        const newMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})$/);
        if (newMatch) {
            const data = parseBRDate(newMatch[1]);
            const descricao = newMatch[2].trim();
            const valorStr = newMatch[3].replace(/\./g, '').replace(',', '.');
            const valor = parseFloat(valorStr);
            
            if (data && descricao.length >= 3 && !isNaN(valor)) {
                transactions.push({
                    descricao,
                    valor: Math.abs(valor),
                    data,
                    tipo: valor >= 0 ? 'entrada' : 'saida'
                });
                matched = true;
            }
        }
        
        if (!matched) {
            // Try old format
            const oldMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s{2,}(\d{1,3}(?:\.\d{3})*,\d{2})?\s*(-|–)?\s*(\d{1,3}(?:\.\d{3})*,\d{2})?/);
            if (oldMatch) {
                const data = parseBRDate(oldMatch[1]);
                const descricao = oldMatch[2].trim();
                const debito = oldMatch[3] ? parseFloat(oldMatch[3].replace(/\./g, '').replace(',', '.')) : null;
                const credito = oldMatch[5] ? parseFloat(oldMatch[5].replace(/\./g, '').replace(',', '.')) : null;

                if (data && descricao.length >= 3 && (debito || credito)) {
                    if (debito && debito > 0) {
                        transactions.push({ descricao, valor: debito, data, tipo: 'saida' });
                    } else if (credito && credito > 0) {
                        transactions.push({ descricao, valor: credito, data, tipo: 'entrada' });
                    }
                }
            }
        }
    }
    return transactions;
}

console.log(parseSantanderPDF(text));
