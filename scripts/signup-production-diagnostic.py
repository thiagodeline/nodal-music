import json, re, asyncio
from playwright.async_api import async_playwright

async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width': 1250,'height':920})
  faults=[]; requests=[]; logs=[]
  page.on('pageerror',lambda e:faults.append(str(e)))
  page.on('requestfailed',lambda r:requests.append({'url':r.url.split('?')[0].split('/auth/v1')[0], 'failure':r.failure}))
  page.on('console',lambda c: logs.append({'type':c.type,'text':c.text[:300]}) if c.type=='error' else None)
  async def intercept(route):
   print('SIGNUP_HTTP_ATTEMPT', route.request.url.split('/auth/v1/')[0]+"/auth/v1/signup")
   await route.abort('blockedbyclient') # Never create a test account
  await page.route('**/auth/v1/signup*',intercept)
  resp=await page.goto('https://sintone.vercel.app/register',wait_until='networkidle',timeout=60000)
  print('HTTP',resp.status,'TITLE',await page.title())
  scripts=await page.locator('script[src]').evaluate_all('(els)=>els.map(el=>el.src)')
  urls=[]
  for src in scripts:
   try:
    body=await (await page.request.get(src,timeout=10000)).text()
    for u in re.findall(r'https?://[a-z0-9.-]+\\.supabase\\.co',body,re.I):
     if u not in urls: urls.append(u)
   except Exception as e: print('SCRIPT_FETCH_FAILED',type(e).__name__)
  print('SUPABASE_URLS_EMBEDDED',json.dumps(urls))
  for k,v in [('rg-name','Teste Diagnostico'),('rg-email','teste.diagnostico+blocked@example.org'),('rg-password','TesteSenhaForte123!'),('rg-confirm','TesteSenhaForte123!')]:
   await page.locator('#'+k).fill(v)
  cb=page.get_by_role('checkbox')
  await cb.click()
  print('TERMS_CHECKED',await cb.get_attribute('aria-checked'))
  button=page.get_by_role('button',name='Criar conta grátis')
  print('SUBMIT_ENABLED',await button.is_enabled())
  if await button.is_enabled():
   await button.click()
   await page.wait_for_timeout(2000)
   print('FEEDBACK', (await page.locator('.rg-alert').all_text_contents())[:4])
  print('PAGE_ERRORS',json.dumps(faults[:5]))
  print('FAILED_REQUESTS',json.dumps(requests[:8]))
  print('CONSOLE_ERRORS',json.dumps(logs[:5]))
  await browser.close()

asyncio.run(main())
