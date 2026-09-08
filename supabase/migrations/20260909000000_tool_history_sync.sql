-- Tool history sync: store usage history per authenticated owner and sync bidirectionally.
create table if not exists public.tool_history (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  tool_id text not null,
  tool_title text not null default '',
  action text not null,
  input text not null check (char_length(input) <= 250000),
  output text not null default '',
  options jsonb not null default '{}'::jsonb,
  summary text not null default '',
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists tool_history_owner_tool_created_idx on public.tool_history(owner_id, tool_id, created_at desc);

create trigger hckr_tool_history_updated_at before update on public.tool_history for each row execute function public.hckr_set_updated_at();

alter table public.tool_history enable row level security;
revoke all on public.tool_history from anon;
grant select, insert, update, delete on public.tool_history to authenticated;

create policy "history owner manages tool history" on public.tool_history for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create or replace function public.hckr_sync_snapshot()
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'workspaces', coalesce((select jsonb_agg(to_jsonb(workspaces) - 'owner_id' - 'deleted_at' order by updated_at, id)
      from workspaces where owner_id = auth.uid() and deleted_at is null), '[]'::jsonb),
    'columns', coalesce((select jsonb_agg(to_jsonb(board_columns) - 'owner_id' - 'deleted_at' order by workspace_id, position, id)
      from board_columns where owner_id = auth.uid() and deleted_at is null), '[]'::jsonb),
    'cards', coalesce((select jsonb_agg(to_jsonb(board_cards) - 'owner_id' - 'deleted_at' order by workspace_id, column_id, position, id)
      from board_cards where owner_id = auth.uid() and deleted_at is null), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(to_jsonb(saved_items) - 'owner_id' - 'deleted_at' order by workspace_id, updated_at, id)
      from saved_items where owner_id = auth.uid() and deleted_at is null), '[]'::jsonb),
    'versions', coalesce((select jsonb_agg(to_jsonb(saved_item_versions) - 'owner_id' order by item_id, revision, id)
      from saved_item_versions where owner_id = auth.uid()), '[]'::jsonb),
    'tool_history', coalesce((select jsonb_agg(to_jsonb(tool_history) - 'owner_id' - 'deleted_at' order by created_at desc, id)
      from tool_history where owner_id = auth.uid() and deleted_at is null), '[]'::jsonb)
  );
$$;

create or replace function public.hckr_apply_sync_batch(p_changes jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  change jsonb;
  payload jsonb;
  entity text;
  operation text;
begin
  if auth.uid() is null then raise exception 'Authentication is required'; end if;

  for change in select value from jsonb_array_elements(coalesce(p_changes, '[]'::jsonb)) loop
    entity := change->>'entity';
    operation := change->>'operation';
    payload := change->'payload';
    if payload is null or payload->>'id' is null then raise exception 'Invalid sync change'; end if;

    if operation = 'delete' then
      if entity = 'workspace' then delete from workspaces where id = payload->>'id' and owner_id = auth.uid();
      elsif entity = 'board_columns' then delete from board_columns where id = payload->>'id' and owner_id = auth.uid();
      elsif entity = 'board_cards' then delete from board_cards where id = payload->>'id' and owner_id = auth.uid();
      elsif entity = 'saved_items' then delete from saved_items where id = payload->>'id' and owner_id = auth.uid();
      elsif entity = 'saved_item_versions' then delete from saved_item_versions where id = payload->>'id' and owner_id = auth.uid();
      elsif entity = 'tool_history' then delete from tool_history where id = payload->>'id' and owner_id = auth.uid();
      else raise exception 'Unknown sync entity %', entity;
      end if;
    elsif operation = 'upsert' then
      if entity = 'workspace' then
        insert into workspaces (id, owner_id, name, key, archived, revision, created_at, updated_at)
        values (payload->>'id', auth.uid(), payload->>'name', payload->>'key', coalesce((payload->>'archived')::boolean, false), coalesce((payload->>'revision')::integer, 1), coalesce((payload->>'created_at')::timestamptz, now()), coalesce((payload->>'updated_at')::timestamptz, now()))
        on conflict (id) do update set name = excluded.name, key = excluded.key, archived = excluded.archived, revision = excluded.revision, updated_at = excluded.updated_at
        where workspaces.owner_id = auth.uid() and (excluded.revision > workspaces.revision or (excluded.revision = workspaces.revision and excluded.updated_at > workspaces.updated_at));
      elsif entity = 'board_columns' then
        insert into board_columns (id, owner_id, workspace_id, name, position, revision, created_at, updated_at)
        values (payload->>'id', auth.uid(), payload->>'workspace_id', payload->>'name', (payload->>'position')::integer, coalesce((payload->>'revision')::integer, 1), coalesce((payload->>'created_at')::timestamptz, now()), coalesce((payload->>'updated_at')::timestamptz, now()))
        on conflict (id) do update set workspace_id = excluded.workspace_id, name = excluded.name, position = excluded.position, revision = excluded.revision, updated_at = excluded.updated_at
        where board_columns.owner_id = auth.uid() and (excluded.revision > board_columns.revision or (excluded.revision = board_columns.revision and excluded.updated_at > board_columns.updated_at));
      elsif entity = 'board_cards' then
        insert into board_cards (id, owner_id, workspace_id, column_id, ticket_number, title, url, fav_icon_url, note, tags, comments, position, archived, revision, created_at, updated_at)
        values (payload->>'id', auth.uid(), payload->>'workspace_id', payload->>'column_id', (payload->>'ticket_number')::integer, payload->>'title', coalesce(payload->>'url', ''), coalesce(payload->>'fav_icon_url', ''), coalesce(payload->>'note', ''), coalesce(payload->'tags', '[]'::jsonb), coalesce(payload->'comments', '[]'::jsonb), (payload->>'position')::integer, coalesce((payload->>'archived')::boolean, false), coalesce((payload->>'revision')::integer, 1), coalesce((payload->>'created_at')::timestamptz, now()), coalesce((payload->>'updated_at')::timestamptz, now()))
        on conflict (id) do update set workspace_id = excluded.workspace_id, column_id = excluded.column_id, ticket_number = excluded.ticket_number, title = excluded.title, url = excluded.url, fav_icon_url = excluded.fav_icon_url, note = excluded.note, tags = excluded.tags, comments = excluded.comments, position = excluded.position, archived = excluded.archived, revision = excluded.revision, updated_at = excluded.updated_at
        where board_cards.owner_id = auth.uid() and (excluded.revision > board_cards.revision or (excluded.revision = board_cards.revision and excluded.updated_at > board_cards.updated_at));
      elsif entity = 'saved_items' then
        insert into saved_items (id, owner_id, workspace_id, type, title, content, revision, created_at, updated_at)
        values (payload->>'id', auth.uid(), payload->>'workspace_id', payload->>'type', payload->>'title', payload->>'content', coalesce((payload->>'revision')::integer, 1), coalesce((payload->>'created_at')::timestamptz, now()), coalesce((payload->>'updated_at')::timestamptz, now()))
        on conflict (id) do update set workspace_id = excluded.workspace_id, type = excluded.type, title = excluded.title, content = excluded.content, revision = excluded.revision, updated_at = excluded.updated_at
        where saved_items.owner_id = auth.uid() and (excluded.revision > saved_items.revision or (excluded.revision = saved_items.revision and excluded.updated_at > saved_items.updated_at));
      elsif entity = 'saved_item_versions' then
        insert into saved_item_versions (id, owner_id, item_id, content, revision, created_at)
        values (payload->>'id', auth.uid(), payload->>'item_id', payload->>'content', (payload->>'revision')::integer, coalesce((payload->>'created_at')::timestamptz, now()))
        on conflict (id) do nothing;
      elsif entity = 'tool_history' then
        insert into tool_history (id, owner_id, tool_id, tool_title, action, input, output, options, summary, revision, created_at, updated_at)
        values (payload->>'id', auth.uid(), payload->>'tool_id', coalesce(payload->>'tool_title', ''), payload->>'action', payload->>'input', coalesce(payload->>'output', ''), coalesce(payload->'options', '{}'::jsonb), coalesce(payload->>'summary', ''), coalesce((payload->>'revision')::integer, 1), coalesce((payload->>'created_at')::timestamptz, now()), coalesce((payload->>'updated_at')::timestamptz, now()))
        on conflict (id) do update set tool_id = excluded.tool_id, tool_title = excluded.tool_title, action = excluded.action, input = excluded.input, output = excluded.output, options = excluded.options, summary = excluded.summary, revision = excluded.revision, updated_at = excluded.updated_at
        where tool_history.owner_id = auth.uid() and (excluded.revision > tool_history.revision or (excluded.revision = tool_history.revision and excluded.updated_at > tool_history.updated_at));
      else raise exception 'Unknown sync entity %', entity;
      end if;
    else
      raise exception 'Unknown sync operation %', operation;
    end if;
  end loop;
end;
$$;
