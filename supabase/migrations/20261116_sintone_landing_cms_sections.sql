-- CMS modular SINTONE: configuração da landing pública.
alter table public.landing_page_config
 add column if not exists announcement_active boolean not null default false,
 add column if not exists announcement_text text not null default '🚀 Distribuição rápida para +64 plataformas de streaming',
 add column if not exists announcement_link text not null default '/register',
 add column if not exists hero_title text not null default 'Envie sua música para mais de 50 plataformas de streaming!',
 add column if not exists hero_subtitle text not null default 'Distribuidora digital 100% brasileira.',
 add column if not exists hero_cta_text text not null default 'Criar conta grátis',
 add column if not exists hero_cta_url text not null default '/register',
 add column if not exists pricing_badge text not null default 'Plano Gratuito',
 add column if not exists pricing_title text not null default 'Grátis',
 add column if not exists pricing_price text not null default 'R$ 0,00',
 add column if not exists pricing_subtitle text not null default 'Sem mensalidade ou taxa de adesão',
 add column if not exists pricing_features jsonb not null default '["Painel do artista com estatísticas","Acompanhamento de lançamentos em tempo real","Relatórios detalhados de royalties","Solicitação de saques via Pix"]'::jsonb,
 add column if not exists faq_items jsonb not null default '[{"q":"O serviço é gratuito?","a":"Você pode cadastrar sua conta sem mensalidade. Confira os limites e condições do plano antes de enviar seu lançamento."},{"q":"Quanto tempo demora o lançamento?","a":"Recomendamos enviar com antecedência para revisão e entrega às lojas. O prazo final depende de cada plataforma."}]'::jsonb,
 add column if not exists dsp_enabled jsonb not null default '["spotify","applemusic","youtubemusic","tiktok","deezer","tidal","amazonmusic","instagram"]'::jsonb;
alter table public.landing_page_config
 add constraint landing_faq_array check(jsonb_typeof(faq_items)='array'),
 add constraint landing_features_array check(jsonb_typeof(pricing_features)='array'),
 add constraint landing_dsp_array check(jsonb_typeof(dsp_enabled)='array');
-- Leitura pública e atualização com is_admin() permanecem regidas pelas políticas já existentes.
