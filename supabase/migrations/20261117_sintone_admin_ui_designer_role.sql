-- Migração aplicada em produção sob o nome sintone_admin_ui_designer_role.
begin;
alter table public.admin_user_roles drop constraint if exists admin_user_roles_role_check;
alter table public.admin_user_roles add constraint admin_user_roles_role_check check(role in ('admin','qc_specialist','ingestion_manager','customer_success','a_and_r','royalty_financial','ui_designer'));
create or replace function public.manage_sintone_team_roles(p_email text,p_roles text[])
returns void language plpgsql security definer set search_path='' as $$
declare target uuid; clean_email text:=lower(trim(p_email)); r text;
begin
 if not public.is_admin() then raise exception 'Acesso negado'; end if;
 if length(clean_email) not between 5 and 254 or p_roles is null or coalesce(array_length(p_roles,1),0)>7
    or exists(select 1 from unnest(p_roles) role where role not in ('admin','qc_specialist','ingestion_manager','customer_success','a_and_r','royalty_financial','ui_designer'))
 then raise exception 'E-mail ou cargos inválidos';end if;
 select id into target from auth.users where lower(email)=clean_email and deleted_at is null;
 if target is null then raise exception 'Conta não encontrada';end if;
 if target=auth.uid() and not 'admin'=any(p_roles) and not exists(select 1 from public.profiles where id=target and role='admin') then raise exception 'Não remova o próprio acesso administrativo';end if;
 delete from public.admin_user_roles where user_id=target;
 foreach r in array p_roles loop insert into public.admin_user_roles(user_id,email,role) values(target,clean_email,r);end loop;
end $$;
commit;
