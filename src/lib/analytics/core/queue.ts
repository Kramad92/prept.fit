export type QueuedItem =
  | { kind: 'track'; event: string; props?: Record<string, unknown> }
  | { kind: 'screen'; name: string; props?: Record<string, unknown> }
  | { kind: 'identify'; userId: string; traits?: Record<string, unknown> }
  | { kind: 'alias'; newUserId: string; anonymousId: string };

export class EventQueue {
  private items: QueuedItem[] = [];
  constructor(private cap: number = 100) {}

  push(item: QueuedItem): void {
    this.items.push(item);
    if (this.items.length > this.cap) this.items.shift();
  }

  drain(): QueuedItem[] {
    const out = this.items;
    this.items = [];
    return out;
  }
}
