-- SINTONE: atualização de cadastro, revisão de lançamentos e créditos detalhados.
-- Já aplicada ao projeto Supabase 'nodalmusic' em 14/11/2026.
-- Reexecutável em uma cópia nova do banco após criar as tabelas base.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS registration_profile text;

ALTER TABLE public.releases
  ADD COLUMN IF NOT EXISTS featured_artists text,
  ADD COLUMN IF NOT EXISTS subgenre text,
  ADD COLUMN IF NOT EXISTS composers text,
  ADD COLUMN IF NOT EXISTS producers text,
  ADD COLUMN IF NOT EXISTS lyricists text,
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_registration_profile_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_registration_profile_check
  CHECK (registration_profile IS NULL OR registration_profile IN ('ARTIST', 'PRODUCER', 'LABEL'));

ALTER TABLE public.releases DROP CONSTRAINT IF EXISTS releases_rejection_reason_length;
ALTER TABLE public.releases ADD CONSTRAINT releases_rejection_reason_length
  CHECK (rejection_reason IS NULL OR char_length(rejection_reason) <= 1500);

CREATE INDEX IF NOT EXISTS releases_status_created_idx ON public.releases(status, created_at DESC);

-- Mantém o gatilho já existente de criação de perfis e persiste o tipo
-- escolhido no cadastro. Esses dados NÃO concedem privilégios administrativos.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, name, registration_profile, terms_version, terms_accepted_at
  ) VALUES (
    NEW.id,
    NEW.email,
    nullif(left(btrim(coalesce(NEW.raw_user_meta_data ->> 'full_name', '')), 160), ''),
    CASE
      WHEN NEW.raw_user_meta_data ->> 'registration_profile' IN ('ARTIST', 'PRODUCER', 'LABEL')
        THEN NEW.raw_user_meta_data ->> 'registration_profile'
      ELSE 'ARTIST'
    END,
    NEW.raw_user_meta_data ->> 'terms_version',
    CASE WHEN NEW.raw_user_meta_data ->> 'terms_version' IS NOT NULL THEN now() END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END
$$;
