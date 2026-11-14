from playwright.sync_api import sync_playwright, expect
import os, json

url = os.environ.get('REGISTER_TEST_URL', 'http://127.0.0.1:3000/register')
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    for width, height in [(1200, 900), (390, 844)]:
        page = browser.new_page(viewport={'width': width, 'height': height})
        errors = []
        page.on('pageerror', lambda err: errors.append(str(err)))
        response = page.goto(url, wait_until='domcontentloaded', timeout=60000)
        assert response and response.status == 200, f'Falha HTTP em {url}'
        toggle = page.get_by_role('checkbox', name='Aceito os Termos de Serviço e a Política de Privacidade')
        toggle.wait_for(state='visible', timeout=25000)
        expect(toggle).to_have_attribute('aria-checked', 'false')
        rect = toggle.bounding_box()
        center = page.evaluate('''([x,y]) => {
          const element = document.elementFromPoint(x, y)
          return element ? (element.outerHTML || '').slice(0,200) : 'none'
        }''', [rect['x'] + rect['width']/2, rect['y'] + rect['height']/2])
        print('VIEWPORT', width, height, 'HTTP', response.status, 'CENTER_TARGET', center)
        toggle.click(timeout=10000)
        expect(toggle).to_have_attribute('aria-checked', 'true', timeout=5000)
        page.get_by_role('button', name='Li e aceito os').click(timeout=10000)
        expect(toggle).to_have_attribute('aria-checked', 'false', timeout=5000)
        toggle.click(timeout=10000)
        expect(toggle).to_have_attribute('aria-checked', 'true', timeout=5000)
        assert not errors, f'JS errors: {json.dumps(errors, ensure_ascii=False)}'
        print('PASSOU: clique na caixa e no texto, alternância de estado e zero erros JS')
        page.close()
    browser.close()
