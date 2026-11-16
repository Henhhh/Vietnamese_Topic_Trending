import { describe, expect, it } from 'vitest'
import {
  FEED_STATUS,
  RUN_STATUS,
  TOPIC_STATUS,
  formatAxisLabel,
  formatDate,
  formatDateTime,
  formatDay,
  formatGrowth,
  formatNumber,
  formatTime,
  label,
} from './labels'

describe('label', () => {
  it('maps known codes to Vietnamese', () => {
    expect(label(TOPIC_STATUS, 'rising')).toBe('Đang tăng')
    expect(label(RUN_STATUS, 'partial')).toBe('Hoàn thành một phần')
    expect(label(FEED_STATUS, 'no_data')).toBe('Chưa có dữ liệu')
  })

  it('shows the raw code for an unknown value instead of a blank', () => {
    expect(label(TOPIC_STATUS, 'exploding')).toBe('exploding')
  })
})

describe('formatNumber', () => {
  it('uses the Vietnamese thousands separator', () => {
    expect(formatNumber(1284)).toBe('1.284')
    expect(formatNumber(1234567)).toBe('1.234.567')
    expect(formatNumber(0)).toBe('0')
  })
})

describe('formatGrowth', () => {
  it('shows arrows for rise and fall', () => {
    expect(formatGrowth(68)).toBe('↑ 68%')
    expect(formatGrowth(-12)).toBe('↓ 12%')
  })

  it('shows 0% when unchanged', () => {
    expect(formatGrowth(0)).toBe('0%')
  })

  it('shows "Mới xuất hiện" when there is no percentage', () => {
    expect(formatGrowth(null)).toBe('Mới xuất hiện')
    expect(formatGrowth(undefined)).toBe('Mới xuất hiện')
  })
})

describe('time formatting (always Vietnam time)', () => {
  const iso = '2026-11-16T08:15:00+07:00'

  it('formats time, day, date and date-time', () => {
    expect(formatTime(iso)).toBe('08:15')
    expect(formatDay(iso)).toBe('16/11')
    expect(formatDate(iso)).toBe('16/11/2026')
    expect(formatDateTime(iso)).toBe('08:15, 16/11/2026')
  })

  it('converts from another offset, whatever the machine time zone is', () => {
    expect(formatDateTime('2026-11-16T01:15:00Z')).toBe('08:15, 16/11/2026')
    expect(formatDateTime('2026-11-15T20:15:00-05:00')).toBe('08:15, 16/11/2026')
  })

  it('shows midnight as 00:00, not 24:00', () => {
    expect(formatTime('2026-11-16T00:00:00+07:00')).toBe('00:00')
  })

  it('rolls into the next day for late UTC times', () => {
    expect(formatDay('2026-11-15T18:00:00Z')).toBe('16/11')
  })
})

describe('formatAxisLabel', () => {
  const iso = '2026-11-15T10:00:00+07:00'

  it('uses HH:00 for the hourly ranges', () => {
    expect(formatAxisLabel(iso, '6h')).toBe('10:00')
    expect(formatAxisLabel(iso, '24h')).toBe('10:00')
  })

  it('uses dd/MM for 7 days', () => {
    expect(formatAxisLabel(iso, '7d')).toBe('15/11')
  })
})
