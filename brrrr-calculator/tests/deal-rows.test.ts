// Tests for the DEALS_APP row arithmetic behind bulk delete (lib/deal-rows.ts).
//
// The contract: only the requested ids' rows are ever removed, and they come back
// bottom-up. Get the order wrong and each delete shifts the sheet under the next
// one, silently taking out a neighbouring deal.

import { describe, it, expect } from 'vitest'
import { rowsToDelete, missingIds, listingFacts } from '../lib/deal-rows'

// DEALS_APP column A: header + one row per deal.
const idColumn = [
  ['id'],
  ['aaa'], // row 2
  ['bbb'], // row 3
  ['ccc'], // row 4
  ['ddd'], // row 5
]

describe('rowsToDelete', () => {
  it('returns 1-based row numbers, descending', () => {
    expect(rowsToDelete(idColumn, ['bbb', 'ddd'])).toEqual([5, 3])
  })

  it('is descending regardless of the order ids arrive in', () => {
    expect(rowsToDelete(idColumn, ['ddd', 'aaa', 'ccc'])).toEqual([5, 4, 2])
  })

  it('never returns the header row', () => {
    expect(rowsToDelete(idColumn, ['id'])).toEqual([])
  })

  it('ignores ids that are not in the sheet', () => {
    expect(rowsToDelete(idColumn, ['bbb', 'nope'])).toEqual([3])
  })

  it('collapses duplicate ids to one row', () => {
    expect(rowsToDelete(idColumn, ['bbb', 'bbb'])).toEqual([3])
  })

  it('skips blank rows rather than matching them', () => {
    const sparse = [['id'], ['aaa'], [], ['ccc']]
    expect(rowsToDelete(sparse, [''])).toEqual([])
    expect(rowsToDelete(sparse, ['ccc'])).toEqual([4])
  })

  it('returns nothing for an empty id list', () => {
    expect(rowsToDelete(idColumn, [])).toEqual([])
  })
})

describe('missingIds', () => {
  it('reports only the ids with no row', () => {
    expect(missingIds(idColumn, ['aaa', 'gone', 'ddd'])).toEqual(['gone'])
  })

  it('reports nothing when every id is present', () => {
    expect(missingIds(idColumn, ['aaa', 'ddd'])).toEqual([])
  })
})

describe('listingFacts', () => {
  it('reads purchase price and year built out of a full Deal blob', () => {
    const json = JSON.stringify({ address: '1805 Cedar Wood', purchasePrice: 230000, yearBuilt: 2013, arv: 300000 })
    expect(listingFacts(json)).toEqual({ purchasePrice: 230000, yearBuilt: 2013 })
  })

  it('reads them out of a partial triage blob', () => {
    const json = '{"address":"7134 Kings Dr","arv":0,"hmlLevPP":69.565,"monthlyRent":0,"purchasePrice":125000,"refiLtv":65.0,"yearBuilt":1974}'
    expect(listingFacts(json)).toEqual({ purchasePrice: 125000, yearBuilt: 1974 })
  })

  it('reports 0 for absent keys', () => {
    expect(listingFacts('{"address":"No numbers here"}')).toEqual({ purchasePrice: 0, yearBuilt: 0 })
  })

  // One unreadable blob must not take the whole dashboard list down with it.
  it('survives a malformed, empty, or non-object blob', () => {
    const none = { purchasePrice: 0, yearBuilt: 0 }
    expect(listingFacts('')).toEqual(none)
    expect(listingFacts('{not json')).toEqual(none)
    expect(listingFacts('null')).toEqual(none)
    expect(listingFacts('42')).toEqual(none)
    expect(listingFacts('"a string"')).toEqual(none)
    expect(listingFacts('[1,2,3]')).toEqual(none)
  })

  it('ignores non-numeric and non-finite values', () => {
    expect(listingFacts('{"purchasePrice":"125000","yearBuilt":null}')).toEqual({ purchasePrice: 0, yearBuilt: 0 })
    // JSON has no Infinity/NaN literal, so this is the only way one arrives
    expect(listingFacts('{"purchasePrice":1e999,"yearBuilt":1974}')).toEqual({ purchasePrice: 0, yearBuilt: 1974 })
  })
})
