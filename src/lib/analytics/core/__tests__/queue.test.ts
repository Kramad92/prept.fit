import { describe, it, expect } from 'vitest';
import { EventQueue } from '../queue';

describe('EventQueue', () => {
  it('stores items up to cap and drops oldest on overflow', () => {
    const q = new EventQueue(3);
    q.push({ kind: 'track', event: 'a' });
    q.push({ kind: 'track', event: 'b' });
    q.push({ kind: 'track', event: 'c' });
    q.push({ kind: 'track', event: 'd' });
    const drained = q.drain();
    expect(drained.map((i) => (i.kind === 'track' ? i.event : ''))).toEqual(['b', 'c', 'd']);
  });

  it('drain empties the queue', () => {
    const q = new EventQueue(10);
    q.push({ kind: 'track', event: 'a' });
    q.drain();
    expect(q.drain()).toEqual([]);
  });
});
