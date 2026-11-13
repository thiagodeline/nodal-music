/**
 * Nodal Music | contract-signer.js
 * Assinatura digital: carimbo -> PDF (html2pdf.js) -> Storage -> tabela user_contracts.
 *
 * Uso:
 *   ContractSigner.init({ supabase, user, profile: { nome, cpf, email, endereco } });
 */
(function () {
  'use strict';

  const BUCKET = 'contracts';
  const FILE_NAME = 'contrato_assinado.pdf';
  const TIMEZONE = 'America/Sao_Paulo';

  const $ = (id) => document.getElementById(id);
  const state = { supabase: null, user: null, profile: {}, busy: false, blobUrl: null };

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */

  function formatDateTime(date) {
    // 13/11/2026 20:05:11 (horário de Brasília)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false, timeZone: TIMEZONE
    }).format(date).replace(',', '');
  }

  async function getClientIp() {
    // Tenta obter o IP público; não bloqueia a assinatura se falhar.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    try {
      const res = await fetch('https://api.ipify.org?format=json', { signal: ctrl.signal });
      if (!res.ok) throw new Error('ip status ' + res.status);
      const { ip } = await res.json();
      return ip || 'não identificado';
    } catch (_) {
      return 'não identificado';
    } finally {
      clearTimeout(timer);
    }
  }

  function setError(msg) { $('sign-error').textContent = msg || ''; }

  function setBusy(busy) {
    state.busy = busy;
    const btn = $('btn-sign');
    btn.disabled = busy;
    btn.textContent = busy ? 'Assinando…' : 'Aceitar e Assinar';
    $('sign-name').disabled = busy;
    $('btn-cancel-sign').disabled = busy;
  }

  function fillFields(root, data) {
    root.querySelectorAll('[data-field]').forEach((el) => {
      const value = (data[el.dataset.field] || '').toString().trim();
      if (value) el.textContent = value; // textContent: nada é interpretado como HTML
    });
  }

  /* ------------------------------------------------------------------ */
  /* Geração do PDF                                                      */
  /* ------------------------------------------------------------------ */

  /** Clona o contrato, preenche dados do artista e acrescenta o carimbo de aceite. */
  function buildSignedNode({ name, whenText, ip }) {
    const clone = $('contract-body').cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.add('pdf-mode');

    // Dados do artista; o nome digitado vale como nome do LICENCIANTE.
    fillFields(clone, { ...state.profile, nome: name });

    const stamp = document.createElement('p');
    stamp.className = 'sign-stamp';
    stamp.textContent =
      `Este contrato foi assinado e aceito digitalmente por ${name} em ${whenText} | IP: ${ip}`;
    clone.appendChild(stamp);

    // html2canvas precisa que o elemento esteja renderizado (não pode ser display:none).
    const host = document.createElement('div');
    host.className = 'pdf-host';
    host.appendChild(clone);
    document.body.appendChild(host);
    return { clone, host };
  }

  async function generatePdfBlob(node) {
    const opt = {
      margin: [15, 15, 18, 15], // mm: topo, esquerda, baixo, direita
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'], avoid: ['h3', '.sign-stamp', '.party'] }
    };

    const pdf = await html2pdf().set(opt).from(node).toPdf().get('pdf');

    // Rodapé com numeração de páginas
    const total = pdf.internal.getNumberOfPages();
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    pdf.setFontSize(8);
    pdf.setTextColor(110);
    for (let i = 1; i <= total; i++) {
      pdf.setPage(i);
      pdf.text(`Nodal Music | Termo de Adesão | Página ${i} de ${total}`, w / 2, h - 8, { align: 'center' });
    }
    return pdf.output('blob');
  }

  /* ------------------------------------------------------------------ */
  /* Fluxo de assinatura                                                 */
  /* ------------------------------------------------------------------ */

  async function sign() {
    if (state.busy) return;
    setError('');

    const name = $('sign-name').value.trim().replace(/\s+/g, ' ');
    if (name.length < 5 || name.split(' ').length < 2) {
      setError('Digite seu nome completo (nome e sobrenome).');
      $('sign-name').focus();
      return;
    }

    setBusy(true);
    let host = null;
    try {
      const signedAt = new Date();
      const ip = await getClientIp();
      const whenText = formatDateTime(signedAt);

      // 1) HTML carimbado -> PDF
      const built = buildSignedNode({ name, whenText, ip });
      host = built.host;
      const blob = await generatePdfBlob(built.clone);

      // 2) Upload para contracts/<user_id>/contrato_assinado.pdf
      const path = `${state.user.id}/${FILE_NAME}`;
      const { error: upErr } = await state.supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: 'application/pdf', upsert: false });

      // Duplicado = tentativa anterior que enviou o arquivo mas não registrou a linha.
      const isDuplicate = upErr && (String(upErr.statusCode) === '409' || /exists|duplicate/i.test(upErr.message || ''));
      if (upErr && !isDuplicate) throw upErr;

      // 3) Metadados na tabela (pdf_url guarda o caminho do arquivo no bucket)
      const { error: dbErr } = await state.supabase.from('user_contracts').insert({
        user_id: state.user.id,
        signed_name: name,
        signed_at: signedAt.toISOString(),
        ip_address: ip,
        pdf_url: path
      });
      if (dbErr) throw dbErr;

      // 4) Download imediato
      showSigned({ blob, name, signedAt });
      $('sign-dialog').close();
      $('contract-dialog').close();
      document.dispatchEvent(new CustomEvent('contract:signed', { detail: { path, name, ip } }));
    } catch (err) {
      console.error('[ContractSigner]', err);
      setError('Não foi possível concluir a assinatura. Verifique sua conexão e tente novamente.');
    } finally {
      if (host) host.remove();
      setBusy(false);
    }
  }

  function showSigned({ blob, url, name, signedAt }) {
    if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);
    const href = blob ? (state.blobUrl = URL.createObjectURL(blob)) : url;

    const link = $('btn-download');
    link.href = href;
    link.download = FILE_NAME;
    $('signed-msg').textContent =
      `Contrato assinado por ${name} em ${formatDateTime(new Date(signedAt))}.`;
    $('signed-panel').style.display = 'block';
    $('btn-open-contract').textContent = 'Ler o contrato novamente';
  }

  /* ------------------------------------------------------------------ */
  /* Interface                                                           */
  /* ------------------------------------------------------------------ */

  function bindScrollGate() {
    const scroller = $('contract-scroll');
    const btn = $('btn-open-sign');
    const hint = $('scroll-hint');
    const check = () => {
      const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 24;
      if (atEnd) { btn.disabled = false; hint.textContent = 'Leitura concluída.'; }
    };
    scroller.addEventListener('scroll', check, { passive: true });
    return check;
  }

  async function loadExistingContract() {
    // Se o usuário já assinou, mostra o download em vez de pedir nova assinatura.
    const { data, error } = await state.supabase
      .from('user_contracts')
      .select('signed_name, signed_at, pdf_url')
      .eq('user_id', state.user.id)
      .maybeSingle();
    if (error || !data) return false;

    const { data: signedUrl } = await state.supabase.storage
      .from(BUCKET)
      .createSignedUrl(data.pdf_url, 3600, { download: FILE_NAME });
    if (signedUrl?.signedUrl) {
      showSigned({ url: signedUrl.signedUrl, name: data.signed_name, signedAt: data.signed_at });
    }
    document.dispatchEvent(new CustomEvent('contract:signed', { detail: { path: data.pdf_url, existing: true } }));
    return true;
  }

  function init({ supabase, user, profile }) {
    if (!supabase || !user) throw new Error('ContractSigner.init precisa de { supabase, user }');
    state.supabase = supabase;
    state.user = user;
    state.profile = profile || {};

    // Preenche dados do artista na leitura em tela
    fillFields($('contract-body'), state.profile);
    if (state.profile.nome) $('sign-name').value = state.profile.nome;

    const contractDlg = $('contract-dialog');
    const signDlg = $('sign-dialog');
    const recheck = bindScrollGate();

    $('btn-open-contract').addEventListener('click', () => {
      contractDlg.showModal();
      recheck();
    });
    $('btn-close-contract').addEventListener('click', () => contractDlg.close());
    $('btn-open-sign').addEventListener('click', () => { setError(''); signDlg.showModal(); $('sign-name').focus(); });
    $('btn-cancel-sign').addEventListener('click', () => signDlg.close());
    $('btn-sign').addEventListener('click', sign);
    $('sign-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') sign(); });

    // Impede fechar o modal de assinatura com Esc no meio do envio
    signDlg.addEventListener('cancel', (e) => { if (state.busy) e.preventDefault(); });

    loadExistingContract().catch((e) => console.error('[ContractSigner]', e));
  }

  window.ContractSigner = { init };
})();
