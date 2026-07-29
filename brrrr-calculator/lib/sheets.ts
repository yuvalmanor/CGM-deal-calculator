// server-side only — never import from a client component
import { google } from 'googleapis'

const TAB = 'DEALS_APP'
const HEADERS = ['id', 'address', 'savedAt', 'score', 'arv', 'moneyInDeal', 'monthlyNOI', 'inputsJson', 'settingsJson']

export interface DealSummary {
  id: string
  address: string
  savedAt: string
  score: number
  arv: number
  moneyInDeal: number
  monthlyNOI: number
  /**
   * Whether the summary columns were written by the calculator.
   * Every calculator save fills D–G; CGM-DealDesk triage rows leave them blank
   * (only E/arv is set). A blank score column therefore means "never opened and
   * saved here" — the dashboard renders those neutrally instead of as 0.0/NO-GO.
   */
  analyzed: boolean
}

type SheetClient = Awaited<ReturnType<typeof getClient>>

async function getClient() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  const sheetId = process.env.GOOGLE_SHEET_ID
  if (!keyJson || !sheetId) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_KEY or GOOGLE_SHEET_ID')
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(keyJson),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })
  return { sheets, sheetId }
}

async function ensureDealsTab(client: SheetClient): Promise<void> {
  const { sheets, sheetId } = client
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const exists = meta.data.sheets?.some(s => s.properties?.title === TAB)
  if (exists) return
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
  })
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${TAB}!A1:I1`,
    valueInputOption: 'RAW',
    requestBody: { values: [HEADERS] },
  })
}

async function findRowById(client: SheetClient, id: string): Promise<number | null> {
  const { sheets, sheetId } = client
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${TAB}!A:A`,
    })
    const rows = res.data.values ?? []
    const idx = rows.findIndex((r, i) => i > 0 && r[0] === id)
    return idx > 0 ? idx + 1 : null // convert to 1-based sheet row number
  } catch {
    return null
  }
}

export async function listDeals(): Promise<DealSummary[]> {
  const client = await getClient()
  const { sheets, sheetId } = client
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const exists = meta.data.sheets?.some(s => s.properties?.title === TAB)
  if (!exists) return []
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${TAB}!A:G`,
  })
  const rows = res.data.values ?? []
  return rows.slice(1).filter(r => r[0]).map(r => ({
    id:          String(r[0] ?? ''),
    address:     String(r[1] ?? ''),
    savedAt:     String(r[2] ?? ''),
    score:       parseFloat(r[3]) || 0,
    arv:         parseFloat(r[4]) || 0,
    moneyInDeal: parseFloat(r[5]) || 0,
    monthlyNOI:  parseFloat(r[6]) || 0,
    analyzed:    String(r[3] ?? '').trim() !== '',
  }))
}

// inputs is the deal's inputsJson parsed as-is; callers validate the shape.
// settings is the settingsJson column's raw string — deliberately NOT parsed
// here: the Term Sheet codec (lib/term-sheets.ts) owns interpreting it, and a
// malformed blob must never prevent the deal itself from loading (ADR-0003).
export async function loadDeal(id: string): Promise<{ inputs: unknown; settings: string }> {
  const client = await getClient()
  const { sheets, sheetId } = client
  const rowNum = await findRowById(client, id)
  if (!rowNum) throw new Error('NOT_FOUND')
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${TAB}!A${rowNum}:I${rowNum}`,
  })
  const row = res.data.values?.[0]
  if (!row) throw new Error('NOT_FOUND')
  return {
    inputs:   JSON.parse(row[7]),
    settings: String(row[8] ?? ''),
  }
}

interface DealPayload {
  address: string
  score: number
  arv: number
  moneyInDeal: number
  monthlyNOI: number
  inputsJson: string
  settingsJson: string
}

function buildRow(id: string, p: DealPayload): (string | number)[] {
  return [
    id, p.address, new Date().toISOString(),
    p.score, p.arv, p.moneyInDeal, p.monthlyNOI,
    p.inputsJson, p.settingsJson,
  ]
}

export async function saveDeal(payload: DealPayload): Promise<string> {
  const client = await getClient()
  await ensureDealsTab(client)
  const { sheets, sheetId } = client
  const id = crypto.randomUUID()
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${TAB}!A:I`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [buildRow(id, payload)] },
  })
  return id
}

export async function updateDeal(id: string, payload: DealPayload): Promise<void> {
  const client = await getClient()
  const { sheets, sheetId } = client
  const rowNum = await findRowById(client, id)
  if (!rowNum) throw new Error('NOT_FOUND')
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${TAB}!A${rowNum}:I${rowNum}`,
    valueInputOption: 'RAW',
    requestBody: { values: [buildRow(id, payload)] },
  })
}

export async function deleteDeal(id: string): Promise<void> {
  const client = await getClient()
  const { sheets, sheetId } = client
  const rowNum = await findRowById(client, id)
  if (!rowNum) throw new Error('NOT_FOUND')
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const sheet = meta.data.sheets?.find(s => s.properties?.title === TAB)
  const sheetGid = sheet?.properties?.sheetId ?? 0
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetGid,
            dimension: 'ROWS',
            startIndex: rowNum - 1, // 0-based inclusive
            endIndex: rowNum,       // 0-based exclusive
          },
        },
      }],
    },
  })
}
