export function formatCurrencyInput(value: string): string {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';
    const decimalValue = (parseInt(numericValue, 10) / 100).toFixed(2);
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(Number(decimalValue));
}

export function parseCurrencyInput(value: string): number {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return 0;
    return parseInt(numericValue, 10) / 100;
}

/**
 * Retorna um objeto Date local cujos valores (getHours, getDate, etc) 
 * refletem exatamente o fuso horário America/Bahia.
 */
export function getBahiaDate(): Date {
    const now = new Date();
    const tzStr = now.toLocaleString('en-US', { timeZone: 'America/Bahia' });
    return new Date(tzStr);
}

/**
 * Retorna a data de hoje no formato YYYY-MM-DD no fuso America/Bahia.
 */
export function getBahiaDateString(): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Bahia',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

/**
 * Retorna a hora atual no formato HH:MM no fuso America/Bahia.
 */
export function getBahiaTimeString(): string {
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Bahia',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date());
}

/**
 * Formata uma string de data (ex: '2026-12-05' ou '2026-12-05T00:00:00Z') mantendo o dia exato
 * sem sofrer deslocamento de fuso GMT para o dia anterior.
 */
export function formatLocalSystemDate(dateStr: string | undefined): string {
    if (!dateStr) return '';
    // Extrai apenas a porção YYYY-MM-DD (primeiros 10 caracteres)
    const baseDate = dateStr.slice(0, 10);
    const [year, month, day] = baseDate.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}/${month}/${year}`;
}

export const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444', '#06B6D4', '#14B8A6', '#6366F1', '#F97316'];

