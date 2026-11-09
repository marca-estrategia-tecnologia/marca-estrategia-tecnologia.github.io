"""Testa os apps separados com o kit da Central ligado ao simulador.
Uso: python3 testes/teste-apps.py <pasta do prospectarion antigo>"""
import json, pathlib, shutil, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ANTIGO = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/aap29/prospectarion"
C2, APPS = pathlib.Path("/tmp/central-c2"), pathlib.Path("/tmp/apps-teste")
SIM, WEB = 8801, 8802
for d in (C2, APPS):
    if d.exists(): shutil.rmtree(d)
shutil.copytree(RAIZ, C2, ignore=shutil.ignore_patterns(".git"))
(C2 / "config/central.json").write_text(json.dumps({"url": f"http://127.0.0.1:{SIM}/", "portal": "https://marca-estrategia-tecnologia.github.io/", "backup_dias": 7}))
subprocess.run([sys.executable, str(C2 / "ferramentas/separar_apps.py"), ANTIGO, str(APPS)], check=True, stdout=subprocess.DEVNULL)
for f in APPS.rglob("*.html"):
    t = f.read_text(encoding="utf-8", errors="ignore")
    if "connect-src" in t: f.write_text(t.replace("connect-src 'self'", f"connect-src 'self' http://127.0.0.1:{SIM}"), encoding="utf-8")

def codigo(email):
    m = [e for e in json.loads(urllib.request.urlopen(f"http://127.0.0.1:{SIM}/__emails").read()) if e["to"] == email and "código" in e["subject"]]
    return m[-1]["subject"][-6:]
def post(d):
    r = urllib.request.Request(f"http://127.0.0.1:{SIM}/", data=json.dumps(d).encode(), method="POST")
    return json.loads(urllib.request.urlopen(r).read())
n = 0
def ok(c, m):
    global n
    assert c, m
    n += 1; print("  ✓", m)

def cadastrar(pg, nome, email, senha):
    pg.wait_for_selector("#ca-novo"); pg.click("#ca-novo")
    pg.fill("#ca-nome", nome); pg.fill("#ca-email", email); pg.fill("#ca-senha", senha); pg.fill("#ca-senha2", senha); pg.check("#ca-aceite"); pg.click("#ca-b")
    pg.wait_for_selector("#ca-cod"); pg.fill("#ca-cod", codigo(email)); pg.click("#ca-b")

sim = subprocess.Popen(["node", str(RAIZ / "testes/simulador-apps-script.js"), str(SIM)], stdout=subprocess.DEVNULL)
web = subprocess.Popen([sys.executable, "-m", "http.server", str(WEB), "-d", str(APPS)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
try:
    with sync_playwright() as p:
        nav = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        def pagina():
            ctx = nav.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
            pg = ctx.new_page(); pg.erros = []
            pg.on("pageerror", lambda e: pg.erros.append(str(e))); pg.on("dialog", lambda d: d.accept())
            return pg
        base = f"http://127.0.0.1:{WEB}"

        print("Prospectarion")
        pg = pagina(); pg.goto(base + "/prospectarion.github.io/index.html")
        ok(pg.is_visible("#ca-raiz") or pg.wait_for_selector("#ca-raiz.ca-on"), "pede conta antes de abrir")
        cadastrar(pg, "Paulo Corretor", "paulo@teste.com", "paulo1234")
        pg.wait_for_selector("#ca-botao")
        est = pg.evaluate("({plano: APP.user.plano, codigo: APP.user.codigo, exp: APP.user.exp, pag: document.getElementById('mod-pagamento').classList.contains('ativo')})")
        ok(est["codigo"] == "CENTRAL" and est["plano"] == "anual" and est["exp"], "teste de 7 dias da Central ativa o plano interno com vencimento")
        ok(not est["pag"], "não mostra a tela de pagamento depois de liberado")
        ok("1234" not in pg.content().split("CENTRAL-ACESSO")[0] or "senha:''" in pg.content(), "senha padrão 1234 removida")
        ok(not pg.erros, "sem erros de JavaScript")

        print("PRO IMOBILIÁRIA")
        pi = pagina(); pi.goto(base + "/pro-imobiliaria.github.io/index.html")
        cadastrar(pi, "Rita Corretora", "rita@teste.com", "rita12345")
        pi.wait_for_selector("#ca-ped"); ok("análise" in pi.inner_text("#ca-raiz"), "fica em análise até o criador liberar")
        post({"acao": "cadastrar", "app": "", "nome": "Anderson Alves", "email": "criador@teste.com", "senha": "criador123", "consentimento": "v1"})
        tk = post({"acao": "confirmar", "email": "criador@teste.com", "codigo": codigo("criador@teste.com")})["token"]
        post({"acao": "adminLicenca", "token": tk, "email": "rita@teste.com", "app": "pro-imobiliaria", "status": "ativo", "plano": "mensal", "vencimento": "2099-12-31"})
        pi.click("#ca-sair"); pi.fill("#ca-email", "rita@teste.com"); pi.fill("#ca-senha", "rita12345"); pi.click("#ca-b")
        pi.wait_for_selector("#ca-botao"); ok(not pi.is_visible("#ca-raiz"), "libera depois da aprovação no painel")
        ok(not pi.erros, "sem erros de JavaScript")

        print("Social Imob 360")
        ps = pagina(); ps.goto(base + "/social-imob-360.github.io/index.html")
        cadastrar(ps, "Lia Produtora", "lia@teste.com", "lia123456")
        ps.wait_for_selector("#ca-botao"); time.sleep(1)
        lic = ps.evaluate("typeof cliLic === 'function' ? cliLic() : null")
        ok(lic and lic.get("origem") == "central" and lic.get("plano") == "anual", "teste da Central ativa o plano interno")
        ok(ps.locator("#cliBloq").count() == 0, "sem bloqueio de plano depois de liberado")
        ok(not ps.erros, "sem erros de JavaScript")

        print("Musicalis e site de imóveis (sem kit, só endereços)")
        pm = pagina(); pm.goto(base + "/musicalis.github.io/index.html"); time.sleep(1)
        links = pm.eval_on_selector_all("a[href]", "as => as.map(a => a.getAttribute('href'))")
        ok(not any("aap29" in l for l in links), "página de venda do Musicalis sem endereço antigo")
        ok(not pm.erros, "Musicalis sem erros de JavaScript")
        pv = pagina(); pv.goto(base + "/imoveis-e-investimentos-rs.github.io/index.html"); time.sleep(1)
        ok(not pv.erros, "site de imóveis sem erros de JavaScript")
        nav.close()
finally:
    sim.terminate(); web.terminate()
print(f"\n{n} verificações dos apps OK")
