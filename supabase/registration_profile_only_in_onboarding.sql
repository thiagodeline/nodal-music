-- SINTONE: o tipo de conta só é definido no onboarding.
-- O perfil nasce sem escolha (NULL) e a ação completeOnboarding
-- salva 'ARTIST' ou 'LABEL' junto com account_type.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id, email, name, registration_profile, terms_version, terms_accepted_at
  ) values (
    new.id,
    new.email,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 160), ''),
    case
      when new.raw_user_meta_data ->> 'registration_profile' in ('ARTIST','PRODUCER','LABEL')
        then new.raw_user_meta_data ->> 'registration_profile'
      else null
    end,
    new.raw_user_meta_data ->> 'terms_version',
    case when new.raw_user_meta_data ->> 'terms_version' is not null then now() end
  ) on conflict (id) do nothing;
  return new;
end
$$;
