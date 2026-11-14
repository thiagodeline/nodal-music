from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1200,'height':1200})
    page.goto('about:blank')
    page.add_script_tag(path='node_modules/html2pdf.js/dist/html2pdf.bundle.min.js')
    result=page.evaluate("""async () => {
      const node = document.createElement('article');
      node.style.cssText='width:750px;padding:42px;background:white;color:black;font-family:Arial,sans-serif;line-height:1.7;position:absolute;left:-100000px;top:0';
      const title=document.createElement('h1');
      title.textContent='SINTONE - TESTE DE CONTRATO';
      const body=document.createElement('p');
      body.textContent='Clausulas do contrato de distribuicao musical. '.repeat(90);
      const signature=document.createElement('strong');
      signature.textContent='Esse contrato foi assinado digitalmente por Artista Teste / Pessoa Teste em 14/11/2026 10:00:00.';
      node.append(title,body,signature);
      document.body.appendChild(node);
      try {
        const blob=await html2pdf().set({
          margin:[10,10,12,10],
          image:{type:'jpeg',quality:.97},
          html2canvas:{scale:1.7,backgroundColor:'#ffffff',useCORS:true},
          jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
          pagebreak:{mode:['css','legacy']}
        }).from(node).outputPdf('blob');
        const bytes=new Uint8Array(await blob.arrayBuffer());
        return {size:blob.size,header:String.fromCharCode(...bytes.slice(0,5)),mime:blob.type};
      } finally {node.remove()}
    }""")
    print('PDF_SMOKE',result)
    assert result['header']=='%PDF-' and result['size']>1500
    browser.close()
