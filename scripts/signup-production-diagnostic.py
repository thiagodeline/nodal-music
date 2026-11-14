import os, json, re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

url = os.environ.get('REGISTER_TEST_URL', 'http://127.0.0.1:3000/register')
project_ref = 'jklitdqichsuymgspvbe'
attempts = []
errors = []

with sync_playwright() as p:
  browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
  page = browser.new_page(viewport={'width': 1200, 'height': 900})
  page.on('pageerror', lambda e: errors.append(str(e)))
  def block_signup(route):
    attempts.append(route.request.url)
    route.abort('blockedbyclient') # nunca cria uma conta de teste
  page.route('**/auth/v1/signup*', block_signup)
  resp = page.goto(url, wait_until='networkidle', timeout=60000)
  assert resp and resp.status == 200, f'HTTP cadastro: {resp.status if resp else "no response"}'
  page.locator('#rg-name').fill('Teste Diagnostico')
  page.locator('#rg-email').fill('teste.diagnostico+blocked@example.org')
  page.locator('#rg-password').fill('TesteSenhaForte123!')
  page.locator('#rg-confirm').fill('TesteSenhaForte123!')
  toggle=page.get_by_role('checkbox')
  toggle.click()
  expect(toggle).to_have_attribute('aria-checked','true')
  submit=page.get_by_role('button',name='Criar conta grátis')
  expect(submit).to_be_enabled()
  submit.click()
  page.wait_for_timeout(1400)
  assert len(attempts)==1,f'Nenhum cadastro tentou acessar Supabase; erro={json.dumps(errors)} alerta={page.locator(".rg-alert").all_text_contents()}'
  assert project_ref+'.supabase.co/auth/v1/signup' in attempts[0], 'O site tentou cadastro em um projeto Supabase incorreto'
  print('REGISTRATION_CLIENT_OK: request to correct Supabase endpoint was intercepted without sending data')
  assert not errors,f'Browser JS errors: {errors}'
  alert=page.locator('.rg-alert').all_text_contents()
  print('SIGNUP_FEEDBACK_AFTER_SIMULATED_NETWORK_FAILURE',json.dumps(alert,ensure_ascii=False))

  public_config=Path('src/lib/supabase/public-config.ts').read_text()
  key_match=re.search(r"sb_publishable_[A-Za-z0-9_-]+",public_config)
  assert key_match, 'Não foi possível verificar a chave publicável'
  response=page.request.get('https://'+project_ref+'.supabase.co/auth/v1/settings',headers={'apikey':key_match.group(0)},timeout=15000)
  print('AUTH_SETTINGS_STATUS',response.status)
  assert response.ok, 'Endpoint público de autenticação Supabase não respondeu'
  flags=response.json()
  print('EMAIL_AUTH_AVAILABLE',bool(flags.get('external',{}).get('email',False)))
  print('DISABLE_SIGNUP',flags.get('disable_signup','not_reported'))
  browser_check=page.evaluate("""async ({url,key}) => {
    try {
      const r = await fetch(url, {headers:{'apikey':key}})
      return {status:r.status}
    } catch(e) {
      return {status:0,error:String(e)}
    }
  }""",{'url':'https://'+project_ref+'.supabase.co/auth/v1/settings','key':key_match.group(0)})
  print('BROWSER_TO_SUPABASE_SETTINGS_STATUS',browser_check['status'])
  assert browser_check['status']==200, 'Browser could not fetch Supabase GoTrue: '+str(browser_check)
  assert flags.get('external',{}).get('email',True), 'Login por e-mail desabilitado no Supabase'

  login=browser.new_page(viewport={'width': 1200, 'height': 900})
  login_hits=[]
  def block_login(route):
    login_hits.append(route.request.url)
    route.abort('blockedbyclient')
  login.route('**/auth/v1/token*',block_login)
  login.goto(url.replace('/register','/login'),wait_until='networkidle',timeout=60000)
  login.locator('#login-email').fill('teste.diagnostico+blocked@example.org')
  login.locator('#login-password').fill('TesteSenhaForte123!')
  login.get_by_role('button',name='Entrar',exact=True).click()
  login.wait_for_timeout(1000)
  assert login_hits, 'Tela de login não chamou Supabase'
  print('LOGIN_CLIENT_OK: request intercepted without any authentication attempt')
  browser.close()
