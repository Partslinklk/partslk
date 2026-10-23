-- Phase 9: rate limiting shared by every server instance (replaces the in-memory counters).
create table if not exists rate_limits (
  key          text not null,
  window_start timestamptz not null,
  hits         integer not null default 0,
  primary key (key, window_start)
);
create index if not exists rate_limits_window_idx on rate_limits (window_start);

alter table rate_limits enable row level security;
