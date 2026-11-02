-- AI operates on the app's actual app_state payload, using the caller's identity.
create table public.gitco_ai_actions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 action jsonb not null, before_hash text not null, created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '5 minutes', executed_at timestamptz
);
alter table public.gitco_ai_actions enable row level security;
revoke all on public.gitco_ai_actions from anon,authenticated;
create table public.gitco_ai_requests (user_id uuid not null references auth.users(id) on delete cascade, requested_at timestamptz not null default now());
create index on public.gitco_ai_requests(user_id,requested_at);
alter table public.gitco_ai_requests enable row level security;
revoke all on public.gitco_ai_requests from anon,authenticated;

create function public.gitco_ai_context() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; u uuid:=auth.uid();
begin
 if u is null or not private.gitco_is_admin() then raise exception 'AI_ADMIN_REQUIRED' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,1));
 if (select count(*) from public.gitco_ai_requests where user_id=u and requested_at>now()-interval '1 minute')>=10 then raise exception 'AI_RATE_LIMIT'; end if;
 insert into public.gitco_ai_requests(user_id) values(u);
 delete from public.gitco_ai_requests where requested_at<now()-interval '1 day';
 select payload into result from public.app_state where user_id=u;
 return coalesce(result,'{"projects":[],"clients":[]}'::jsonb);
end $$;

-- Validate every field again in the database; the model cannot choose SQL or arbitrary tables.
create function private.gitco_ai_transform(payload jsonb, action jsonb) returns jsonb language plpgsql set search_path='' as $$
declare op text:=action->>'operation'; vals jsonb:=action->'values'; items jsonb:=coalesce(payload->'projects','[]'); p jsonb; idx int; ti int; tasks jsonb; k text; v jsonb; allowed text[]; new_id bigint;
begin
 if jsonb_typeof(action) is distinct from 'object' or jsonb_typeof(vals) is distinct from 'object' then raise exception 'INVALID_ACTION'; end if;
 if op not in ('create_project','update_project','create_task','update_task') or op is null then raise exception 'UNSUPPORTED_OPERATION'; end if;
 if op like '%project' then allowed:=array['name','client','type','location','start','due','status','description','progress','archived'];
 else allowed:=array['name','due','status','progress']; end if;
 for k,v in select * from jsonb_each(vals) loop
  if not k=any(allowed) then raise exception 'FIELD_NOT_ALLOWED'; end if;
  if k='progress' then if jsonb_typeof(v)<>'number' or (v::text)::numeric<0 or (v::text)::numeric>100 then raise exception 'INVALID_PROGRESS'; end if;
  elsif k='archived' then if jsonb_typeof(v)<>'boolean' then raise exception 'INVALID_ARCHIVED'; end if;
  else if jsonb_typeof(v)<>'string' or length(v#>>'{}')>4000 then raise exception 'INVALID_TEXT'; end if; end if;
  if k in ('start','due') and v#>>'{}'<>'' then
   if v#>>'{}' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'INVALID_DATE'; end if;
   perform (v#>>'{}')::date;
  end if;
 end loop;
 if vals ? 'name' and length(trim(vals->>'name'))=0 then raise exception 'NAME_REQUIRED'; end if;
 if vals ? 'status' and ((op like '%project' and vals->>'status' not in ('active','blocked','completed')) or (op like '%task' and vals->>'status' not in ('notStarted','active','blocked','done'))) then raise exception 'INVALID_STATUS'; end if;
 if op='create_project' then
  if not vals ? 'name' then raise exception 'NAME_REQUIRED'; end if;
  new_id:=floor(extract(epoch from clock_timestamp())*1000)::bigint;
  while exists(select 1 from jsonb_array_elements(items) e where e->>'id'=new_id::text) loop new_id:=new_id+1; end loop;
  p:=jsonb_build_object('id',new_id,'name','','client','','type','','location','','start','','due','','status','active','progress',0,'description','','archived',false,'stages','[]'::jsonb,'alerts','[]'::jsonb,'attachments','[]'::jsonb)||vals;
  return jsonb_set(payload,'{projects}',jsonb_build_array(p)||items);
 end if;
 select (ord-1)::int,value into idx,p from jsonb_array_elements(items) with ordinality as e(value,ord) where value->>'id'=action->>'project_id';
 if idx is null then raise exception 'PROJECT_NOT_FOUND'; end if;
 if op='update_project' then p:=p||vals;
 else
  tasks:=coalesce(p->'stages','[]');
  if op='create_task' then
   if not vals ? 'name' then raise exception 'NAME_REQUIRED'; end if;
   tasks:=tasks||jsonb_build_array(jsonb_build_object('name','','due','','status','notStarted','progress',0)||vals);
  else
   if action->>'task_index' is null or action->>'task_index' !~ '^\d{1,6}$' then raise exception 'INVALID_TASK'; end if;
   ti:=(action->>'task_index')::int;
   if ti>=jsonb_array_length(tasks) then raise exception 'TASK_NOT_FOUND'; end if;
   tasks:=jsonb_set(tasks,array[ti::text],(tasks->ti)||vals);
  end if;
  p:=jsonb_set(p,'{stages}',tasks);
 end if;
 return jsonb_set(payload,array['projects',idx::text],p);
end $$;

create function public.gitco_ai_propose(action_input jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare current_payload jsonb; result jsonb; action_id uuid;
begin
 if auth.uid() is null or not private.gitco_is_admin() then raise exception 'AI_ADMIN_REQUIRED' using errcode='42501'; end if;
 select payload into current_payload from public.app_state where user_id=auth.uid();
 current_payload:=coalesce(current_payload,'{"projects":[],"clients":[]}');
 result:=private.gitco_ai_transform(current_payload,action_input);
 insert into public.gitco_ai_actions(user_id,action,before_hash) values(auth.uid(),action_input,md5(current_payload::text)) returning id into action_id;
 return jsonb_build_object('id',action_id,'action',action_input,'expires_in',300);
end $$;

create function public.gitco_ai_confirm(action_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.gitco_ai_actions; current_payload jsonb; result jsonb;
begin
 if auth.uid() is null or not private.gitco_is_admin() then raise exception 'AI_ADMIN_REQUIRED' using errcode='42501'; end if;
 select * into a from public.gitco_ai_actions where id=action_id and user_id=auth.uid() for update;
 if not found or a.expires_at<now() or a.executed_at is not null then raise exception 'CONFIRMATION_EXPIRED_OR_USED'; end if;
 insert into public.app_state(user_id,payload,updated_at) values(auth.uid(),'{"projects":[],"clients":[]}',now()) on conflict do nothing;
 select payload into current_payload from public.app_state where user_id=auth.uid() for update;
 if md5(current_payload::text)<>a.before_hash then raise exception 'DATA_CHANGED_RETRY'; end if;
 result:=private.gitco_ai_transform(current_payload,a.action);
 update public.app_state set payload=result,updated_at=now() where user_id=auth.uid();
 update public.gitco_ai_actions set executed_at=now() where id=action_id;
 return jsonb_build_object('ok',true,'payload',result);
end $$;
revoke all on function private.gitco_ai_transform(jsonb,jsonb) from public,anon,authenticated;
revoke all on function public.gitco_ai_context(),public.gitco_ai_propose(jsonb),public.gitco_ai_confirm(uuid) from public,anon;
grant execute on function public.gitco_ai_context(),public.gitco_ai_propose(jsonb),public.gitco_ai_confirm(uuid) to authenticated;
