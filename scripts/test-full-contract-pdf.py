import base64, io, json
from pathlib import Path
from playwright.sync_api import sync_playwright
import fitz

contract=Path('docs/contratos/sintone-contrato-2026-11-r2.txt').read_text()
assert len(contract)>12000
with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1200,'height':900})
  page.goto('about:blank')
  page.add_script_tag(path='node_modules/html2pdf.js/dist/html2pdf.bundle.min.js')
  encoded=page.evaluate("""async (contract) => {
     const node=document.createElement('article');
     node.style.cssText='width:750px;padding:42px;background:white;color:#1b2538;font-family:Arial,sans-serif;font-size:13px;line-height:1.75;box-sizing:border-box;position:absolute;left:-100000px;top:0;white-space:normal';
     const title=document.createElement('h1');title.textContent='SINTONE - CONTRATO DE DISTRIBUICAO MUSICAL';
     const identity=document.createElement('p');identity.textContent='Artista Teste - Pessoa Teste - CPF 000.000.000-00 - Versao 2026.11-R2';
     const body=document.createElement('div');body.textContent=contract;
     body.style.whiteSpace='pre-wrap';body.style.overflowWrap='anywhere';
     const footer=document.createElement('section');footer.textContent='Esse contrato foi assinado digitalmente por Artista Teste / Pessoa Teste em 14/11/2026 10:00:00.';
     footer.style.cssText='break-inside:avoid;page-break-inside:avoid;border-top:2px solid #0646bd;margin-top:32px;padding-top:18px';
     node.append(title,identity,body,footer);document.body.appendChild(node);
     try{
       const blob=await html2pdf().set({margin:[10,10,12,10],filename:'contract.pdf',image:{type:'jpeg',quality:0.97},html2canvas:{scale:1.7,backgroundColor:'#ffffff',useCORS:true},jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}}).from(node).outputPdf('blob');
       const array=new Uint8Array(await blob.arrayBuffer());
       let binary='';for(let i=0;i<array.length;i++)binary+=String.fromCharCode(array[i]);
       return btoa(binary);
     }finally{node.remove()}
  }""",contract)
  binary=base64.b64decode(encoded)
  assert binary[:5]==b'%PDF-',binary[:20]
  assert 200<len(binary)<=10*1024*1024, len(binary)
  pdf=fitz.open(stream=binary,filetype='pdf')
  print('PDF_BYTES',len(binary),'PAGES',pdf.page_count)
  assert pdf.page_count>=4, 'Documento completo deveria ocupar várias páginas'
  for index in [0,pdf.page_count-1]:
    pix=pdf[index].get_pixmap(matrix=fitz.Matrix(.75,.75),alpha=False)
    data=pix.samples
    # Pelo menos 1% dos pixels deve ser tinta / texto; uma página em branco é inválida.
    dark=sum(1 for i in range(0,len(data),3) if min(data[i],data[i+1],data[i+2])<190)
    ratio=dark/(pix.width*pix.height)
    print('PAGE',index+1,'DARK_RATIO',round(ratio,5))
    assert ratio>0.008, f'Page {index+1} looks blank'
  print('OK_FULL_CONTRACT_HTML2PDF')
  browser.close()
