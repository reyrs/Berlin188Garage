import { describe, it, expect } from 'vitest';
import { spkSentAt, findOldestWaitingForSlot, computeSlotBackfill } from './slotAllocation';
import { Order } from '../types';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'WO-TEST-0001',
    customerName: 'Test Customer',
    customerPhone: '081234567890',
    carBrand: 'Mercedes-Benz',
    carModel: 'C200',
    plateNumber: 'B 1 TEST',
    complaint: 'Test complaint',
    serviceType: 'Servis Rutin',
    status: 'dikerjakan',
    createdAt: '2026-08-01T08:00:00.000Z',
    findings: [],
    serviceItems: [],
    timeline: [],
    paymentStatus: 'belum_dibayar',
    ...overrides,
  };
}

function withSpkSentAt(timestamp: string): Order['timeline'] {
  return [{
    id: 't1', status: 'dikerjakan', timestamp,
    title: 'SPK Dikirim ke Mekanik', description: '', actor: 'Test',
  }];
}

describe('spkSentAt', () => {
  it('uses the SPK-sent timeline event timestamp when present', () => {
    const order = makeOrder({
      createdAt: '2026-08-01T08:00:00.000Z',
      timeline: withSpkSentAt('2026-08-01T10:00:00.000Z'),
    });
    expect(spkSentAt(order)).toBe(new Date('2026-08-01T10:00:00.000Z').getTime());
  });

  it('falls back to createdAt when no SPK-sent event exists', () => {
    const order = makeOrder({ createdAt: '2026-08-01T08:00:00.000Z', timeline: [] });
    expect(spkSentAt(order)).toBe(new Date('2026-08-01T08:00:00.000Z').getTime());
  });
});

describe('findOldestWaitingForSlot', () => {
  it('returns null when no order is waiting', () => {
    const orders = [makeOrder({ id: 'A', spkSent: true, slotNumber: 1 })];
    expect(findOldestWaitingForSlot(orders, 'B')).toBeNull();
  });

  it('excludes orders without spkSent', () => {
    const orders = [makeOrder({ id: 'A', spkSent: false, slotNumber: undefined })];
    expect(findOldestWaitingForSlot(orders, 'B')).toBeNull();
  });

  it('excludes orders that already have a slot', () => {
    const orders = [makeOrder({ id: 'A', spkSent: true, slotNumber: 3 })];
    expect(findOldestWaitingForSlot(orders, 'B')).toBeNull();
  });

  it('excludes orders already marked selesai', () => {
    const orders = [makeOrder({ id: 'A', spkSent: true, status: 'selesai', slotNumber: undefined })];
    expect(findOldestWaitingForSlot(orders, 'B')).toBeNull();
  });

  it('excludes the order being finished itself', () => {
    const orders = [makeOrder({ id: 'A', spkSent: true, slotNumber: undefined })];
    expect(findOldestWaitingForSlot(orders, 'A')).toBeNull();
  });

  it('picks the order whose SPK was sent earliest, not the one created earliest', () => {
    // B was checked in (created) before A, but A's SPK went out first —
    // A should win the freed slot, matching the documented intent in
    // slotAllocation.ts: late diagnosis shouldn't cut the queue.
    const orders = [
      makeOrder({
        id: 'A', spkSent: true, slotNumber: undefined,
        createdAt: '2026-08-01T09:00:00.000Z',
        timeline: withSpkSentAt('2026-08-01T09:30:00.000Z'),
      }),
      makeOrder({
        id: 'B', spkSent: true, slotNumber: undefined,
        createdAt: '2026-08-01T08:00:00.000Z',
        timeline: withSpkSentAt('2026-08-01T10:00:00.000Z'),
      }),
    ];
    expect(findOldestWaitingForSlot(orders, 'C')?.id).toBe('A');
  });
});

describe('computeSlotBackfill', () => {
  it('returns null when the finishing order had no slot', () => {
    const orders = [makeOrder({ id: 'A', slotNumber: undefined })];
    const finishing = makeOrder({ id: 'A', slotNumber: undefined });
    expect(computeSlotBackfill(orders, finishing)).toBeNull();
  });

  it('returns null when finishingOrder is undefined', () => {
    expect(computeSlotBackfill([], undefined)).toBeNull();
  });

  it('returns null when nobody is waiting for the freed slot', () => {
    const finishing = makeOrder({ id: 'A', slotNumber: 2 });
    expect(computeSlotBackfill([finishing], finishing)).toBeNull();
  });

  it('backfills the freed slot with the longest-waiting order', () => {
    const finishing = makeOrder({ id: 'A', slotNumber: 5 });
    const waiting = makeOrder({
      id: 'B', spkSent: true, slotNumber: undefined,
      timeline: withSpkSentAt('2026-08-01T09:00:00.000Z'),
    });
    const result = computeSlotBackfill([finishing, waiting], finishing);
    expect(result).toEqual({ backfillOrderId: 'B', freedSlot: 5 });
  });
});
