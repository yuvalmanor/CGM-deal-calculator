// Tests for the DEALS_APP row arithmetic behind bulk delete (lib/deal-rows.ts).
//
// The contract: only the requested ids' rows are ever removed, and they come back
// bottom-up. Get the order wrong and each delete shifts the sheet under the next
// one, silently taking out a neighbouring deal.

import { describe, it, expect } from 'vitest'
import { rowsToDelete, missingIds } from '../lib/deal-rows'

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
