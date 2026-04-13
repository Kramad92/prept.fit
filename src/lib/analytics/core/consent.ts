export class Consent {
  granted = false;
  private listeners: Array<(v: boolean) => void> = [];

  set(value: boolean): void {
    if (value === this.granted) return;
    this.granted = value;
    for (const fn of this.listeners) fn(value);
  }

  onChange(fn: (v: boolean) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }
}
