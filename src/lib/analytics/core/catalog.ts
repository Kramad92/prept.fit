export type EventMap = {
  user_signed_up: { method: 'email' | 'google' | 'apple' };
  user_logged_in: { method: 'email' | 'google' | 'apple' };
  user_logged_out: Record<string, never>;
  page_viewed: { path: string; referrer?: string };
  screen_viewed: { name: string; params?: Record<string, unknown> };
  session_started: { source: 'cold' | 'foreground' };
  session_ended: { duration_ms: number };
  // product
  workout_started: { workout_id: string; source: 'library' | 'plan' | 'custom' };
  workout_completed: { workout_id: string; duration_ms: number };
  meal_logged: { meal_id: string; portion: number };
  plan_created: { plan_id: string; type: 'workout' | 'meal' };
  client_invited: { method: 'email' | 'link' };
};

export type EventName = keyof EventMap;
