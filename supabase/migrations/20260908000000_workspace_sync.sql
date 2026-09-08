-- hckr-tools private workspace sync. All application rows belong to auth.uid().
create table if not exists public.workspaces (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  archived boolean not null default false,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.board_columns (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null,
  position integer not null,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.board_cards (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  column_id text not null references public.board_columns(id) on delete cascade,
  title text not null,
  url text not null default '',
  fav_icon_url text not null default '',
  note text not null default '',
  tags jsonb not null default '[]'::jsonb,
  position integer not null,
  archived boolean not null default false,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.saved_items (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  type text not null check (type in ('json', 'regex', 'diff', 'markdown', 'text', 'curl')),
  title text not null,
  content text not null check (char_length(content) <= 250000),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.saved_item_versions (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.saved_items(id) on delete cascade,
  content text not null check (char_length(content) <= 250000),
  revision integer not null,
  created_at timestamptz not null default now()
);

create index if not exists board_columns_owner_workspace_idx on public.board_columns(owner_id, workspace_id, position);
create index if not exists board_cards_owner_workspace_idx on public.board_cards(owner_id, workspace_id, column_id, position);
create index if not exists saved_items_owner_workspace_idx on public.saved_items(owner_id, workspace_id, updated_at desc);

create or replace function public.hckr_set_updated_at()
returns trigger language plpgsql security invoker as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger hckr_workspaces_updated_at before update on public.workspaces for each row execute function public.hckr_set_updated_at();
create trigger hckr_board_columns_updated_at before update on public.board_columns for each row execute function public.hckr_set_updated_at();
create trigger hckr_board_cards_updated_at before update on public.board_cards for each row execute function public.hckr_set_updated_at();
create trigger hckr_saved_items_updated_at before update on public.saved_items for each row execute function public.hckr_set_updated_at();

alter table public.workspaces enable row level security;
alter table public.board_columns enable row level security;
alter table public.board_cards enable row level security;
alter table public.saved_items enable row level security;
alter table public.saved_item_versions enable row level security;

revoke all on public.workspaces, public.board_columns, public.board_cards, public.saved_items, public.saved_item_versions from anon;
grant select, insert, update, delete on public.workspaces, public.board_columns, public.board_cards, public.saved_items, public.saved_item_versions to authenticated;

create policy "workspace owner manages workspaces" on public.workspaces for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "workspace owner manages columns" on public.board_columns for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "workspace owner manages cards" on public.board_cards for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "workspace owner manages saved items" on public.saved_items for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "workspace owner manages saved versions" on public.saved_item_versions for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
