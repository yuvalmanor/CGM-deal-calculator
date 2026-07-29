import { describe, it, expect } from 'vitest'
import { isDealDeskDeal, splitBySource } from '../lib/deal-source'

describe('isDealDeskDeal', () => {
  it('flags CGM-DealDesk triage ids', () => {
    expect(isDealDeskDeal('dd-19f61d76a4136269-0')).toBe(true)
    expect(isDealDeskDeal('dd-19fa374495edbe2f-12')).toBe(true)
  })

  it('does not flag calculator-minted UUIDs', () => {
    expect(isDealDeskDeal('f1a508c3-5509-471a-9890-40be1a611d95')).toBe(false)
    expect(isDealDeskDeal('632f93f6-56ee-4bbd-af65-a7b04db138c6')).toBe(false)
  })

  it('is prefix-anchored, not a substring match', () => {
    // a UUID can contain "dd-" mid-string; only the prefix marks the source
    expect(isDealDeskDeal('a4cc08c2-9fa5-dd-470e-97e4-a016e8356d9b')).toBe(false)
    expect(isDealDeskDeal('')).toBe(false)
  })
})

describe('splitBySource', () => {
  it('partitions and preserves order within each group', () => {
    const deals = [
      { id: 'f1a508c3-5509-471a-9890-40be1a611d95' },
      { id: 'dd-19f61d76a4136269-0' },
      { id: 'dd-19f61d228fcba6d2-0' },
      { id: '632f93f6-56ee-4bbd-af65-a7b04db138c6' },
    ]
    const { own, dealDesk } = splitBySource(deals)
    expect(own.map(d => d.id)).toEqual([
      'f1a508c3-5509-471a-9890-40be1a611d95',
      '632f93f6-56ee-4bbd-af65-a7b04db138c6',
    ])
    expect(dealDesk.map(d => d.id)).toEqual([
      'dd-19f61d76a4136269-0',
      'dd-19f61d228fcba6d2-0',
    ])
  })

  it('handles all-one-source lists', () => {
    expect(splitBySource([{ id: 'dd-1' }]).own).toEqual([])
    expect(splitBySource([{ id: 'uuid-ish' }]).dealDesk).toEqual([])
    expect(splitBySource([])).toEqual({ own: [], dealDesk: [] })
  })
})
