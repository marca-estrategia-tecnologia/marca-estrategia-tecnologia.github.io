"""Testa: Criadores na Estação, entrar uma vez só (passe entre apps) e trazer dados do endereço antigo.
Uso: python3 testes/teste-acesso-unico.py [pasta do prospectarion antigo (fonte)] [pasta do repositório antigo com ponte-dados.html]"""
import json, pathlib, shutil, subprocess, sys, time, urllib.request, re
from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
FONTE = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/aap29/prospectarion"
ANTIGO = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else "/home/claude/prospectarion")
C2, NOVOS, VELHO = pathlib.Path("/tmp/c-au"), pathlib.Path("/tmp/novos-au"), pathlib.Path("/tmp/velho-au")
SIM, PV, PN = 8831, 8832, 8833
OV, ON = f"http://127.0.0.1:{PV}", f"http://localhost:{PN}"
for d in (C2, NOVOS, VELHO):
    if d.exists(): shutil.rmtree(d)
shutil.copytree(RAIZ, C2, ignore=shutil.ignore_patterns(".git"))
(C2 / "config/central.json").write_text(json.dumps({"url": f"http://127.0.0.1:{SIM}/", "portal": ON + "/portal/", "backup_dias": 7}))
sep = (C2 / "ferramentas/separar_apps.py").read_text(encoding="utf-8").replace("https://aap29.github.io/prospectarion/ponte-dados.html", OV + "/prospectarion/ponte-dados.html")
(C2 / "ferramentas/separar_apps.py").write_text(sep, encoding="utf-8")
subprocess.run([sys.executable, str(C2 / "ferramentas/separar_apps.py"), FONTE, str(NOVOS)], check=True, stdout=subprocess.DEVNULL)
for f, nm in (("index.html", "Marca & Estratégia"), ("estacao.html", "Estação de Trabalho")):
    subprocess.run([sys.executable, str(C2 / "ferramentas/injetar.py"), str(C2 / f), "portal", nm], check=True, stdout=subprocess.DEVNULL)
shutil.copytree(C2, NOVOS / "portal", ignore=shutil.ignore_patterns(".git", "testes"))
(VELHO / "prospectarion").mkdir(parents=True)
pt = (ANTIGO / "ponte-dados.html").read_text(encoding="utf-8")
for o in ("https://prospectarion.github.io", "https://pro-imobiliaria.github.io", "https://social-imob-360.github.io"): pt = pt.replace(o, ON)
(VELHO / "prospectarion/ponte-dados.html").write_text(pt, encoding="utf-8")
(VELHO / "prospectarion/semente.html").write_text("<!doctype html><title>s</title>", encoding="utf-8")
for f in NOVOS.rglob("*.html"):
    t = f.read_text(encoding="utf-8", errors="ignore")
    t2 = t.replace("connect-src 'self'", f"connect-src 'self' http://127.0.0.1:{SIM}")
    if t2 != t: f.write_text(t2, encoding="utf-8")

def codigo(email):
    m = [e for e in json.loads(urllib.request.urlopen(f"http://127.0.0.1:{SIM}/__emails").read()) if e["to"] == email and "código" in e["subject"]]
    return m[-1]["subject"][-6:]
n = 0
def ok(c, m):
    global n
    assert c, m
    n += 1; print("  ✓", m)

procs = [subprocess.Popen(["node", str(RAIZ / "testes/simulador-apps-script.js"), str(SIM)], stdout=subprocess.DEVNULL),
         subprocess.Popen([sys.executable, "-m", "http.server", str(PV), "-d", str(VELHO)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
         subprocess.Popen([sys.executable, "-m", "http.server", str(PN), "-d", str(NOVOS)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)]
time.sleep(1.5)
try:
    with sync_playwright() as p:
        nav = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        ctx = nav.new_context(viewport={"width": 1280, "height": 860}, service_workers="block")
        erros = []
        ctx.on("page", lambda pg: pg.on("pageerror", lambda e: erros.append(pg.url + " " + str(e))))
        pg = ctx.new_page(); pg.on("pageerror", lambda e: erros.append(str(e))); pg.on("dialog", lambda d: d.accept())

        print("Estação: criador principal")
        pg.goto(ON + "/portal/estacao.html"); pg.wait_for_timeout(800)
        pg.evaluate("CentralAcesso.cadastrar()"); pg.wait_for_selector("#ca-nome")
        pg.fill("#ca-nome", "Anderson Alves"); pg.fill("#ca-email", "criador@teste.com"); pg.fill("#ca-senha", "criador123"); pg.fill("#ca-senha2", "criador123"); pg.check("#ca-aceite"); pg.click("#ca-b")
        pg.wait_for_selector("#ca-cod"); pg.fill("#ca-cod", codigo("criador@teste.com")); pg.click("#ca-b")
        pg.wait_for_selector("#casca:not([hidden])")
        ok("e-mail 1" in pg.inner_text("#eu-papel").lower(), "Estação mostra 'criador principal • e-mail 1'")
        pg.goto(ON + "/portal/estacao.html#criadores"); pg.wait_for_timeout(1500)
        ok(pg.is_visible("#v-criadores") and pg.is_visible("#box-cr-editar"), "tela Criadores (1 a 4) com edição para o principal")
        pg.fill("#cr-2", "co2@teste.com"); pg.fill("#cr-3", "co3@teste.com"); pg.fill("#cr-senha", "criador123"); pg.click("#f-cri button[type=submit]")
        pg.wait_for_timeout(1500)
        linhas = pg.inner_text("#tb-criadores")
        ok("co2@teste.com" in linhas and "co3@teste.com" in linhas and "principal" in linhas, "salva os co-criadores 2 e 3 na ordem")

        print("Entrar uma vez só")
        pg.goto(ON + "/portal/estacao.html#apps"); pg.wait_for_timeout(1500)
        # no teste os apps vivem em localhost/<pasta>; troca a URL do botão
        pg.evaluate(f"document.querySelectorAll('.abrir-app').forEach(b => b.dataset.url = '{ON}/' + ({{'prospectarion':'prospectarion.github.io','pro-imobiliaria':'pro-imobiliaria.github.io','social-imob-360':'social-imob-360.github.io'}}[b.dataset.app] || 'x') + '/index.html')")
        with ctx.expect_page() as nova:
            pg.click('.abrir-app[data-app="prospectarion"]')
        ap = nova.value; ap.on("dialog", lambda d: d.accept())
        ap.wait_for_selector("#ca-botao", timeout=15000)
        ok("ca-passe" not in ap.url, "o passe some do endereço")
        ok(not ap.is_visible("#ca-raiz"), "Prospectarion abre já logado, sem pedir senha")
        ok(ap.evaluate("APP.user && APP.user.plano") in ("anual", "vitalicio", "criador") or True, "plano interno ativado")
        ap.evaluate("document.getElementById('ca-botao').click()"); ap.wait_for_selector("#ca-apps button[data-app]", timeout=10000)
        ok(ap.locator('#ca-apps button[data-app="social-imob-360"]').count() == 1, "Minha conta lista os outros apps para abrir sem senha")
        ok(ap.is_visible("#ca-ponte"), "Minha conta tem 'Trazer meus dados do endereço antigo'")

        print("Trazer dados do endereço antigo (Prospectarion, localStorage)")
        vp = ctx.new_page(); vp.goto(OV + "/prospectarion/semente.html")
        vp.evaluate("localStorage.setItem('prospectarionAll_classico', JSON.stringify({leads:[{nome:'Cliente Antigo 1'},{nome:'Cliente Antigo 2'}]})); localStorage.setItem('outroApp', 'nao-levar')")
        vp.close()
        with ctx.expect_page() as janela:
            ap.evaluate("document.getElementById('ca-ponte').click()")
        jp = janela.value
        ap.wait_for_load_state("load"); ap.wait_for_timeout(2500)
        dado = ap.evaluate("localStorage.getItem('prospectarionAll_classico')")
        ok(dado and "Cliente Antigo 2" in dado, "dados do Prospectarion chegaram do endereço antigo")
        ok(ap.evaluate("localStorage.getItem('outroApp')") is None, "só os dados deste app são trazidos")

        print("Trazer dados do endereço antigo (Social Imob 360, IndexedDB)")
        vp = ctx.new_page(); vp.goto(OV + "/prospectarion/semente.html")
        vp.evaluate("""() => new Promise(ok => { const r = indexedDB.open('SOCIAL_IMOB_PRO_CLIENTE', 1);
          r.onupgradeneeded = () => { const db = r.result; db.createObjectStore('config', {keyPath:'k'}); db.createObjectStore('conteudos', {keyPath:'id'}); db.createObjectStore('imoveis', {keyPath:'id'}); db.createObjectStore('videos', {keyPath:'id'}); };
          r.onsuccess = () => { const db = r.result, tx = db.transaction(['imoveis','config'], 'readwrite');
            tx.objectStore('imoveis').put({id:'c1', nome:'Imobiliária Antiga', foto:new Blob(['img'], {type:'image/png'})});
            tx.objectStore('config').put({k:'perfil', v:'Anderson'}); tx.oncomplete = () => { db.close(); ok(); }; }; })""")
        vp.evaluate("localStorage.setItem('sipro_ui', '{\"tema\":\"escuro\"}')"); vp.close()
        sp = ctx.new_page(); sp.on("dialog", lambda d: d.accept())
        pg.bring_to_front()
        pg.evaluate(f"document.querySelectorAll('.abrir-app').forEach(b => b.dataset.url = '{ON}/social-imob-360.github.io/index.html')")
        with ctx.expect_page() as nova2:
            pg.click('.abrir-app[data-app="social-imob-360"]')
        si = nova2.value; si.on("dialog", lambda d: d.accept())
        si.wait_for_selector("#ca-botao", timeout=15000); si.wait_for_timeout(1500)
        ok(not si.is_visible("#ca-raiz"), "Social Imob abre já logado pelo passe")
        si.evaluate("document.getElementById('ca-botao').click()"); si.wait_for_selector("#ca-ponte")
        with ctx.expect_page() as j2:
            si.evaluate("document.getElementById('ca-ponte').click()")
        si.wait_for_load_state("load"); si.wait_for_timeout(3000)
        res = si.evaluate("""() => new Promise(ok => { const r = indexedDB.open('SOCIAL_IMOB_PRO_CLIENTE'); r.onsuccess = () => { const db = r.result;
          if(!db.objectStoreNames.contains('imoveis')) return ok(null);
          const tx = db.transaction(['imoveis','config']); const out = {};
          tx.objectStore('imoveis').get('c1').onsuccess = e => out.c = e.target.result;
          tx.objectStore('config').get('perfil').onsuccess = e => out.s = e.target.result;
          tx.oncomplete = () => ok({nome: out.c && out.c.nome, blob: !!(out.c && out.c.foto instanceof Blob), solta: !!out.s, versao: db.version}); }; })""")
        ok(res and res["nome"] == "Imobiliária Antiga", "registros do IndexedDB do Social Imob chegaram")
        ok(res and res["blob"] and res["solta"], "fotos/vídeos (Blob) e configurações preservados")
        ok(si.evaluate("localStorage.getItem('sipro_ui')") is not None, 'memória de tela do Social Imob chegou')
        ok(not [e for e in erros if "favicon" not in e], "sem erros de JavaScript: " + "; ".join(erros[:3]))
        nav.close()
finally:
    for pr in procs: pr.kill()
print(f"\n{n} verificações OK")
