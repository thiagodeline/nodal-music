'use client'
import type {AdminReleaseTrack} from './AdminPanel'

export default function AdminReleaseTracks({
  tracks,onPlay,busy
}:{tracks:AdminReleaseTrack[];onPlay:(id:string)=>void;busy:boolean}) {
  if(!tracks.length)return null // Older single releases have only releases.audio_path.
  return <section>
    <h3 className="sa-section-title">Faixas do lançamento ({tracks.length})</h3>
    {tracks.map(t=><div key={t.id} style={{
      border:'1px solid #dce5f2',borderRadius:9,padding:13,marginBottom:12
    }}>
      <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center',flexWrap:'wrap'}}>
        <strong>{t.position}. {t.title}</strong>
        <button className="sa-download" disabled={busy} onClick={()=>onPlay(t.id)}>Ouvir faixa</button>
      </div>
      <dl className="sa-details">
        <div className="sa-detail-field"><dt>ISRC</dt><dd>{t.isrc||'Atribuição pendente'}</dd></div>
        <div className="sa-detail-field"><dt>Idioma</dt><dd>{t.language}</dd></div>
        <div className="sa-detail-field"><dt>Explícito</dt><dd>{t.explicit?'Sim':'Não'}</dd></div>
        <div className="sa-detail-field"><dt>Feats</dt><dd>{t.featured_artists||'—'}</dd></div>
        <div className="sa-detail-field"><dt>Compositores</dt><dd>{t.composers||'—'}</dd></div>
        <div className="sa-detail-field"><dt>Produtores</dt><dd>{t.producers||'—'}</dd></div>
        <div className="sa-detail-field"><dt>Letristas</dt><dd>{t.lyricists||'—'}</dd></div>
        <div className="sa-detail-field"><dt>Outros créditos</dt><dd>{t.credits||'—'}</dd></div>
        <div className="sa-detail-field"><dt>Colaboradores</dt>
          <dd>{t.contributors?.length?t.contributors.map(c=>c.name+' ('+c.role+')').join(', '):'—'}</dd></div>
      </dl>
    </div>)}
  </section>
}
