import { Analytics } from '@analytics-core/client';

// Module-level singleton so non-React code (e.g. auth-context) can emit events.
export const analyticsInstance = new Analytics();
