import type { FinancialTransaction } from './types'
import * as XLSX from 'xlsx'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ParsedTransaction {
  descricao: string
  valor: number
  data: string       // ISO date string: YYYY-MM-DD
  tipo: 'entrada' | 'saida'
}

export interface ReconciliationResult {
  conciliadas: Array<{ bankTx: ParsedTransaction; registeredTx: FinancialTransaction }>
  naoEncontradas: FinancialTransaction[]  // registered but not in bank statement
  novasNoBanco: ParsedTransaction[]        // in bank statement but not registered
}

// ─── OFX Parser ──────────────────────────────────────────────────────────────

/**
 * Parse an OFX file (Santander or Mercado Pago — both follow the OFX standard)
 * Returns an array of ParsedTransaction.
 */
export async function parseOFX(file: File): Promise<ParsedTransaction[]> {
  const text = await file.text()
  const transactions: ParsedTransaction[] = []

  // OFX uses SGML-like tags; extract STMTTRN blocks
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  const matches = text.matchAll(stmtTrnRegex)

  for (const match of matches) {
    const block = match[1]

    const trnType = extractTag(block, 'TRNTYPE') ?? ''
    const dtPosted = extractTag(block, 'DTPOSTED') ?? ''
    const trnAmt = extractTag(block, 'TRNAMT') ?? '0'
    const memo = extractTag(block, 'MEMO') ?? extractTag(block, 'NAME') ?? 'Sem descrição'

    const valor = parseFloat(trnAmt.replace(',', '.'))
    if (isNaN(valor)) continue

    const data = parseOFXDate(dtPosted)
    if (!data) continue

    const tipo: 'entrada' | 'saida' =
      trnType === 'CREDIT' || valor > 0 ? 'entrada' : 'saida'

    transactions.push({
      descricao: memo.trim(),
      valor: Math.abs(valor),
      data,
      tipo,
    })
  }

  // Fallback for OFX without closing tags (SGML format used by some banks)
  if (transactions.length === 0) {
    return parseOFXSGML(text)
  }

  return transactions
}

/** Fallback parser for SGML-format OFX (no closing tags) */
function parseOFXSGML(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = []
  const blocks = text.split('<STMTTRN>')
  blocks.shift() // remove header

  for (const block of blocks) {
    const trnType = extractSGMLTag(block, 'TRNTYPE') ?? ''
    const dtPosted = extractSGMLTag(block, 'DTPOSTED') ?? ''
    const trnAmt = extractSGMLTag(block, 'TRNAMT') ?? '0'
    const memo = extractSGMLTag(block, 'MEMO') ?? extractSGMLTag(block, 'NAME') ?? 'Sem descrição'

    const valor = parseFloat(trnAmt.replace(',', '.'))
    if (isNaN(valor)) continue

    const data = parseOFXDate(dtPosted)
    if (!data) continue

    const tipo: 'entrada' | 'saida' =
      trnType === 'CREDIT' || valor > 0 ? 'entrada' : 'saida'

    transactions.push({
      descricao: memo.trim(),
      valor: Math.abs(valor),
      data,
      tipo,
    })
  }

  return transactions
}

// ─── Spreadsheet Parser (CSV, XLSX) ─────────────────────────────────────────

export async function parseSpreadsheet(file: File): Promise<ParsedTransaction[]> {
  const transactions: ParsedTransaction[] = []
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, dateNF: 'dd/mm/yyyy' })

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i]
    if (!Array.isArray(row) || row.length < 2) continue

    let dataStr = ''
    let descricao = ''
    let valor = NaN

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || '').trim()
      if (!cell) continue

      // Date in DD/MM/YYYY
      if (!dataStr && /^(\d{2})\/(\d{2})\/(\d{4})$/.test(cell)) {
         dataStr = cell
      }
      else if (!dataStr && /^(\d{4})-(\d{2})-(\d{2})$/.test(cell)) {
         const match = cell.match(/^(\d{4})-(\d{2})-(\d{2})$/)
         if (match) dataStr = `${match[3]}/${match[2]}/${match[1]}`
      }
      // Exclude header rows from description
      else if (!descricao && cell.length >= 3 && !['data', 'data de emissão', 'valor', 'saldo', 'histórico', 'descrição', 'lançamento'].includes(cell.toLowerCase())) {
         descricao = cell
      }
      else if (isNaN(valor)) {
        // Find currency-like values
        const cleanCell = cell.replace(/[^\d.,-]/g, '')
        if (/^-?\d{1,3}(?:\.\d{3})*(?:,\d{2})?$|^-?\d+([.,]\d+)?$/.test(cleanCell) && cleanCell !== '-' && cleanCell !== '') {
           let parsed = NaN
           if (cleanCell.includes(',') && !cleanCell.includes('.')) {
             parsed = parseFloat(cleanCell.replace(',', '.'))
           } else if (cleanCell.includes('.') && cleanCell.includes(',')) {
             parsed = parseFloat(cleanCell.replace(/\./g, '').replace(',', '.'))
           } else {
             parsed = parseFloat(cleanCell)
           }
           if (!isNaN(parsed) && parsed !== 0) valor = parsed
        }
      }
    }

    if (dataStr && descricao && !isNaN(valor)) {
       const dateParts = dataStr.split('/')
       if (dateParts.length === 3) {
           const isoDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`
           transactions.push({
               descricao,
               valor: Math.abs(valor),
               data: isoDate,
               tipo: valor >= 0 ? 'entrada' : 'saida'
           })
       }
    }
  }

  return transactions
}


// ─── Reconciliation ───────────────────────────────────────────────────────────

/**
 * Compare bank statement transactions against registered financial transactions.
 * Matches by: same type + valor exato + data ± 1 dia.
 */
export function reconcileTransactions(
  bankTransactions: ParsedTransaction[],
  registeredTransactions: FinancialTransaction[]
): ReconciliationResult {
  const conciliadas: ReconciliationResult['conciliadas'] = []
  const novasNoBanco: ParsedTransaction[] = []
  const matchedRegisteredIds = new Set<string>()

  for (const bankTx of bankTransactions) {
    const bankDate = new Date(bankTx.data + 'T00:00:00')

    const match = registeredTransactions.find((reg) => {
      if (matchedRegisteredIds.has(reg.id)) return false
      if (reg.tipo !== bankTx.tipo) return false
      if (Math.abs(reg.valor - bankTx.valor) > 0.01) return false

      const regDate = new Date(reg.data_vencimento + 'T00:00:00')
      const diffDays = Math.abs((bankDate.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24))

      return diffDays <= 1
    })

    if (match) {
      conciliadas.push({ bankTx, registeredTx: match })
      matchedRegisteredIds.add(match.id)
    } else {
      novasNoBanco.push(bankTx)
    }
  }

  const naoEncontradas = registeredTransactions.filter(
    (reg) =>
      reg.status === 'pendente' && !matchedRegisteredIds.has(reg.id)
  )

  return { conciliadas, naoEncontradas, novasNoBanco }
}

/**
 * Check if a parsed transaction is likely a duplicate of existing registered transactions.
 * Used in the review modal to warn the user.
 */
export function isDuplicate(
  tx: ParsedTransaction,
  registeredTransactions: FinancialTransaction[]
): boolean {
  const txDate = new Date(tx.data + 'T00:00:00')

  return registeredTransactions.some((reg) => {
    if (reg.tipo !== tx.tipo) return false
    if (Math.abs(reg.valor - tx.valor) > 0.01) return false

    const regDate = new Date(reg.data_vencimento + 'T00:00:00')
    const diffDays = Math.abs((txDate.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24))

    return diffDays <= 1
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractTag(text: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : null
}

function extractSGMLTag(text: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}>([^\\n<]+)`, 'i')
  const match = text.match(regex)
  return match ? match[1].trim() : null
}

/** Parse OFX date format: YYYYMMDD or YYYYMMDDHHMMSS[.mmm][Z] → YYYY-MM-DD */
function parseOFXDate(raw: string): string | null {
  const clean = raw.replace(/[^\d]/g, '').substring(0, 8)
  if (clean.length < 8) return null

  const year = clean.substring(0, 4)
  const month = clean.substring(4, 6)
  const day = clean.substring(6, 8)

  const date = new Date(`${year}-${month}-${day}T00:00:00`)
  if (isNaN(date.getTime())) return null

  return `${year}-${month}-${day}`
}

/** Parse Brazilian date format: DD/MM/YYYY → YYYY-MM-DD */
function parseBRDate(raw: string): string | null {
  const parts = raw.split('/')
  if (parts.length !== 3) return null

  const [day, month, year] = parts
  const date = new Date(`${year}-${month}-${day}T00:00:00`)
  if (isNaN(date.getTime())) return null

  return `${year}-${month}-${day}`
}
