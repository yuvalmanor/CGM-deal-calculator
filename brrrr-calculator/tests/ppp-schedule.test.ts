import { describe, it, expect } from 'vitest'
import { parsePppSchedule, formatPppSchedule } from '../lib/ppp-schedule'

describe('parsePppSchedule', () => {
  it('parses comma-separated percents', () => {
    expect(parsePppSchedule('5,5,5')).toEqual([5, 5, 5])
  })

  it('parses slash-separated step-downs', () => {
    expect(parsePppSchedule('5/4/3/2/1')).toEqual([5, 4, 3, 2, 1])
  })

  it('tolerates spaces and decimals', () => {
    expect(parsePppSchedule(' 5 , 4.5 , 3 ')).toEqual([5, 4.5, 3])
  })

  it('empty input means no PPP', () => {
    expect(parsePppSchedule('')).toEqual([])
    expect(parsePppSchedule('   ')).toEqual([])
  })

  it('rejects garbage without committing', () => {
    expect(parsePppSchedule('abc')).toBeNull()
    expect(parsePppSchedule('5,x,3')).toBeNull()
    expect(parsePppSchedule('5,,3')).toBeNull()
    expect(parsePppSchedule('5,-2')).toBeNull()
  })

  it('round-trips through format', () => {
    for (const raw of ['5,5,5', '5/4/3/2/1', '']) {
      const parsed = parsePppSchedule(raw)!
      expect(parsePppSchedule(formatPppSchedule(parsed))).toEqual(parsed)
    }
  })
})
