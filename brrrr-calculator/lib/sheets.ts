// server-side only — never import from a client component
import { google } from 'googleapis'
import { rowsToDelete, missingIds, listingFacts } from './deal-rows'

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
   * Purchase price — the listing's asking price, which is where triage puts it.
   * Read out of inputsJson rather than a summary column of its own; 0 = unknown.
   */
  purchasePrice: number
  /** Livable square footage, read out of inputsJson; 0 = unknown. */
  sqft: number
  /** Year built, read out of inputsJson; 0 = unknown. */
  yearBuilt: number
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
  // A:H, not A:G — the card's property facts (purchase price, sqft, year built)
  // have no summary column, so the list pulls them out of inputsJson (H), which
  // is the deal as last saved. Only the extracted numbers reach the client; the
  // blobs stay here.
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${TAB}!A:H`,
  })
  const rows = res.data.values ?? []
  return rows.slice(1).filter(r => r[0]).map(r => {
    const facts = listingFacts(String(r[7] ?? ''))
    return {
      id:            String(r[0] ?? ''),
      address:       String(r[1] ?? ''),
      savedAt:       String(r[2] ?? ''),
      score:         parseFloat(r[3]) || 0,
      // The deal's own arv (H) wins over the denormalised column E, which is only
      // a mirror written at save time — column E is the fallback for a blob that
      // could not be read at all.
      arv:           facts.arv || parseFloat(r[4]) || 0,
      moneyInDeal:   parseFloat(r[5]) || 0,
      monthlyNOI:    parseFloat(r[6]) || 0,
      purchasePrice: facts.purchasePrice,
      sqft:          facts.sqft,
      yearBuilt:     facts.yearBuilt,
      analyzed:      String(r[3] ?? '').trim() !== '',
    }
  })
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

async function getTabGid(client: SheetClient): Promise<number> {
  const { sheets, sheetId } = client
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId })
  const sheet = meta.data.sheets?.find(s => s.properties?.title === TAB)
  return sheet?.properties?.sheetId ?? 0
}

// One request per row. Google applies them in order, so the caller must pass
// rows descending — see rowsToDelete() in lib/deal-rows.ts.
async function deleteRows(client: SheetClient, rows: number[]): Promise<void> {
  const { sheets, sheetId } = client
  const sheetGid = await getTabGid(client)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: rows.map(rowNum => ({
        deleteDimension: {
          range: {
            sheetId: sheetGid,
            dimension: 'ROWS',
            startIndex: rowNum - 1, // 0-based inclusive
            endIndex: rowNum,       // 0-based exclusive
          },
        },
      })),
    },
  })
}

export async function deleteDeal(id: string): Promise<void> {
  const client = await getClient()
  const rowNum = await findRowById(client, id)
  if (!rowNum) throw new Error('NOT_FOUND')
  await deleteRows(client, [rowNum])
}

/**
 * Delete several deals in one pass.
 *
 * Row numbers are resolved from a single read of column A and removed in one
 * batch, bottom-up — deleting them one call at a time would re-read a sheet that
 * has already shifted under it. Ids with no row are reported back rather than
 * failing the whole request, so a stale dashboard tab can't block the delete.
 */
export async function deleteDeals(ids: string[]): Promise<{ deleted: number; missing: string[] }> {
  const client = await getClient()
  const { sheets, sheetId } = client
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${TAB}!A:A`,
  })
  const idColumn = (res.data.values ?? []) as string[][]
  const rows = rowsToDelete(idColumn, ids)
  const missing = missingIds(idColumn, ids)
  if (rows.length > 0) await deleteRows(client, rows)
  return { deleted: rows.length, missing }
}
