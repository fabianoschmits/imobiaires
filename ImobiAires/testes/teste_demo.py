"""Smoke test local com Leaflet simulado. Não acessa nem valida imagens externas.
Requer Python + playwright (pip install playwright) e Chromium (playwright install chromium).
"""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from threading import Thread
import shutil
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]/'prototipo'
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/'
# Stub apenas da interface Leaflet usada pela aplicação, para testar lógica offline.
stub='''(()=>{const element=document.getElementById('map');let zoom=14, handlers={}; const map={setView(_,z){zoom=z;return this},getZoom(){return zoom},getBounds(){return{contains:()=>true}},on(ev,f){ev.split(' ').forEach(x=>handlers[x]=f);return this},getContainer(){return element},invalidateSize(){},flyTo(_,z){zoom=z;handlers.moveend?.()},fitBounds(){handlers.moveend?.()},removeLayer(){}};window.__clickMap=(lat,lng)=>handlers.click?.({latlng:{lat,lng}});function obj(){return{addTo(){return this},on(){return this},clearLayers(){}}}window.L={map:()=>map,tileLayer:obj,layerGroup:obj,control:{zoom:obj,scale:obj},polygon:obj,divIcon:o=>o,marker:obj,circleMarker:obj,polyline:obj};})();'''
checks=[]
with sync_playwright() as p:
    chromium=shutil.which('chromium')
    browser=p.chromium.launch(headless=True,executable_path=chromium or None,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
    def route(r):
        if r.request.url.startswith(url): r.continue_()
        elif 'leaflet.js' in r.request.url: r.fulfill(status=200,content_type='application/javascript',body=stub)
        else: r.abort()
    page.route('**/*',route)
    page.goto(url)
    page.locator('#cards .card').first.wait_for()
    assert page.locator('#cards .card').count()==12;checks.append('Catálogo: 12 imóveis')
    page.locator('[data-type="Terreno"]').click();assert page.locator('#cards .card').count()==6;checks.append('Filtro por categoria')
    page.locator('#filters').click();page.locator('#maxPrice').fill('150000');page.locator('#filterForm button.primary').click();assert page.locator('#cards .card').count()==3;checks.append('Filtro de preço')
    page.locator('#sort').select_option('low');assert '119.000' in page.locator('.card .price').first.inner_text();checks.append('Ordenação')
    page.locator('[data-type="Todos"]').click();page.locator('#filters').click();page.locator('#resetFilter').click();page.locator('#filterForm button.primary').click()
    page.locator('[data-open="T01"]').first.click();assert '149.900' in page.locator('#detail').inner_text() and '165.000' in page.locator('#detail').inner_text();checks.append('Detalhe e comparação de ofertas')
    page.locator('#detail [data-fav="T01"]').click();page.locator('#backList').click();page.locator('#saved').click();assert page.locator('#cards .card').count()==1
    page.reload();page.locator('#saved').click();assert page.locator('#cards .card').count()==1;checks.append('Favorito persiste após recarregar')
    page.locator('#explore').click();page.locator('[data-comp="T01"]').click();page.locator('[data-comp="T02"]').click();page.locator('#openCompare').click();assert page.locator('#compareTable th').count()>3;page.locator('[data-close="compareDialog"]').click();page.locator('#clearCompare').click();checks.append('Comparação de dois imóveis')
    page.locator('#agency').click();page.locator('#newProperty').click();form=page.locator('#propertyForm')
    for k,v in {'title':'Terreno teste','agency':'Agência fictícia teste','district':'Centro','price':'140000','area':'350'}.items():form.locator(f'[name="{k}"]').fill(v)
    page.locator('#pickLocation').click();page.evaluate('window.__clickMap(-29.606,-52.192)');page.locator('#finishDraw').click();form.locator('button.primary').click();assert 'Terreno teste' in page.locator('#detail').inner_text();checks.append('Cadastro e marcação simulada')
    page.locator('#offerHere').click();page.locator('#offerForm [name="agency"]').fill('Segunda agência teste');page.locator('#offerForm [name="price"]').fill('130000');page.locator('#offerForm button.primary').click();assert '130.000' in page.locator('#detail').inner_text();checks.append('Nova oferta em imóvel existente')
    page.reload();page.locator('#agency').click();assert 'Terreno teste' in page.locator('#mineList').inner_text();page.on('dialog',lambda d:d.accept());page.locator('#mineList [data-delete]').click();assert 'Nenhum imóvel' in page.locator('#mineList').inner_text();page.locator('[data-close="agencyDialog"]').click();checks.append('Persistência e exclusão do cadastro')
    for w in (390,360):
        page.set_viewport_size({'width':w,'height':844});page.reload();page.locator('#mobileToggle').click();assert page.locator('#panel').is_visible();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');checks.append(f'Mobile {w}px: lista e sem overflow horizontal')
    assert not errors, errors
    checks.append('Sem exceções JavaScript nos fluxos exercitados')
    browser.close()
server.shutdown()
print('\n'.join('OK: '+x for x in checks))
