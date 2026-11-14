from playwright.sync_api import sync_playwright
import json
URL = 'https://sintone.vercel.app/register'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1200, 'height': 900})
    errors=[]
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    resp = page.goto(URL, wait_until='domcontentloaded', timeout=60000)
    page.wait_for_timeout(2000)
    print("STATUS", resp.status if resp else None, "URL", page.url)
    print("TITLE", page.title())
    print("ERRORS", json.dumps(errors, ensure_ascii=False))
    print("CURRENT_CHECKBOX", page.locator('[role="checkbox"]').count(), "NATIVE_CHECKBOX", page.locator('input[type=checkbox]').count())
    print("TERMS_HTML", page.locator('.rg-terms').first.evaluate("(el) => el.outerHTML")[:4000] if page.locator('.rg-terms').count() else "NOT FOUND")
    if page.locator('[role="checkbox"]').count():
        btn=page.get_by_role('checkbox').first
        print("BEFORE", btn.get_attribute("aria-checked"),"VISIBLE",btn.is_visible())
        print("STYLE",btn.evaluate("""e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {rect:[r.x,r.y,r.width,r.height],pointerEvents:s.pointerEvents,visibility:s.visibility,display:s.display,elementAtCenter:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML?.slice(0,500)}}"""))
        btn.click(timeout=8000)
        page.wait_for_timeout(300)
        print("AFTER_CLICK", btn.get_attribute("aria-checked"))
        page.get_by_role('button',name="Li e aceito os").click(timeout=8000)
        page.wait_for_timeout(300)
        print("AFTER_TEXT_CLICK",btn.get_attribute("aria-checked"))
        print("LAST_ERRORS",json.dumps(errors,ensure_ascii=False))
    browser.close()
