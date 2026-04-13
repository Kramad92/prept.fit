import type { AnalyticsAdapter } from '../types';

export class NoopAdapter implements AnalyticsAdapter {
  name = 'noop';
  init() {}
  identify() {}
  alias() {}
  track() {}
  screen() {}
  reset() {}
}
