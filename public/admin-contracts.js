/**
 * Nodal Music | admin-contracts.js
 * Adiciona o botão [Baixar Contrato PDF] na lista de artistas do painel admin.
 *
 * Requisitos:
 *  - Admin logado (app_metadata.role = 'admin'; veja 01_supabase.sql)
 *  - supabase-js já inicializado (variável `supabaseClient`)
 *
 * Uso (na página admin, depois de carregar a lista de artistas):
 *   const artists = await AdminContracts.loadArtists();   // artistas + status do contrato
 *   tbody.innerHTML = artists.map(AdminContracts.rowHtml).join('');
 *   AdminContracts.bindDownloadButtons(tbody);
 */
const AdminContracts = (() => {
  'use strict';

  const BUCKET = 'contracts';

  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmtDate = (iso) =>
    new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' })
      .format(new Date(iso));

  /** Busca artistas e anexa o contrato (se houver). Ajuste a tabela/colunas de perfil ao seu schema. */
  async function loadArtists() {
    const [{ data: artists, error: e1 }, { data: contracts, error: e2 }] = await Promise.all([
      supabaseClient.from('profiles').select('id, full_name, email').order('full_name'),
      supabaseClient.from('user_contracts').select('user_id, signed_name, signed_at, ip_address, pdf_url')
    ]);
    if (e1 || e2) throw (e1 || e2);

    const byUser = new Map(contracts.map((c) => [c.user_id, c]));
    return artists.map((a) => ({ ...a, contract: byUser.get(a.id) || null }));
  }

  /** HTML de uma linha da tabela de artistas. */
  function rowHtml(artist) {
    const c = artist.contract;
    const action = c
      ? `<button type="button" class="btn-download-contract" data-user-id="${esc(artist.id)}"
                 data-path="${esc(c.pdf_url)}" data-name="${esc(artist.full_name)}">Baixar Contrato PDF</button>`
      : `<span class="muted">Não assinado</span>`;
    return `<tr>
      <td>${esc(artist.full_name)}</td>
      <td>${esc(artist.email)}</td>
      <td>${c ? esc(fmtDate(c.signed_at)) : '-'}</td>
      <td>${action}</td>
    </tr>`;
  }

  /** Gera URL assinada (60 s) e dispara o download. O bucket é privado. */
  async function download(path, artistName) {
    const safeName = String(artistName || 'artista').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    const { data, error } = await supabaseClient.storage
      .from(BUCKET)
      .createSignedUrl(path, 60, { download: `contrato_${safeName}.pdf` });
    if (error || !data?.signedUrl) throw error || new Error('URL não gerada');

    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /** Delegação de evento: um único listener para todos os botões da tabela. */
  function bindDownloadButtons(container) {
    container.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-download-contract');
      if (!btn) return;
      const original = btn.textContent;
      btn.disabled = true;
      btn.textContent = 'Gerando…';
      try {
        await download(btn.dataset.path, btn.dataset.name);
      } catch (err) {
        console.error('[AdminContracts]', err);
        alert('Não foi possível baixar o contrato. Confirme que você está logado como admin.');
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  }

  return { loadArtists, rowHtml, download, bindDownloadButtons };
})();
