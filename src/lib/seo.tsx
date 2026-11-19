/** Serialização segura de dados estruturados em script JSON-LD no servidor. */
export function JsonLd({data}:{data:Record<string,unknown>|Record<string,unknown>[]}) {
 return <script type="application/ld+json" dangerouslySetInnerHTML={{
  __html:JSON.stringify(data).replace(/</g,'\\u003c')
 }}/>
}
