create or replace function private.gitco_ai_transform(payload jsonb, action jsonb) returns jsonb language plpgsql set search_path='' as $$
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

