"""Explora cada app: entra com uma conta de teste (simulador), clica em todos os
botões e abas não destrutivos e registra erros de JavaScript, alertas e telas.
Uso: python3 testes/explorar-apps.py [pasta do prospectarion antigo]"""
import json, pathlib, shutil, subprocess, sys, time, urllib.request, re
from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ANTIGO = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/aap29/prospectarion"
C2, APPS = pathlib.Path("/tmp/central-ex"), pathlib.Path("/tmp/apps-ex")
SIM, WEB = 8811, 8812
for d in (C2, APPS):
    if d.exists(): shutil.rmtree(d)
shutil.copytree(RAIZ, C2, ignore=shutil.ignore_patterns(".git"))
(C2 / "config/central.json").write_text(json.dumps({"url": f"http://127.0.0.1:{SIM}/", "portal": "https://marca-estrategia-tecnologia.github.io/", "backup_dias": 7}))
subprocess.run([sys.executable, str(C2 / "ferramentas/separar_apps.py"), ANTIGO, str(APPS)], check=True, stdout=subprocess.DEVNULL)
for f, nm in (("index.html", "Marca & Estratégia"), ("estacao.html", "Estação de Trabalho")):
    subprocess.run([sys.executable, str(C2 / "ferramentas/injetar.py"), str(C2 / f), "portal", nm], check=True, stdout=subprocess.DEVNULL)
shutil.copytree(C2, APPS / "portal", ignore=shutil.ignore_patterns(".git", "testes"))
shutil.copytree("/home/claude/mesa-de-editais-br.github.io", APPS / "mesa", ignore=shutil.ignore_patterns(".git"))
for f in APPS.rglob("*.html"):
    t = f.read_text(encoding="utf-8", errors="ignore")
    t2 = t.replace("connect-src 'self'", f"connect-src 'self' http://127.0.0.1:{SIM}")
    if f.parent.name == "mesa" and f.name == "index.html":
        t2 = re.sub(r'CENTRAL_URL\s*:\s*"[^"]*"', f'CENTRAL_URL: "http://127.0.0.1:{SIM}/"', t2)
    if t2 != t: f.write_text(t2, encoding="utf-8")

def codigo(email):
    m = [e for e in json.loads(urllib.request.urlopen(f"http://127.0.0.1:{SIM}/__emails").read()) if e["to"] == email and "código" in e["subject"]]
    return m[-1]["subject"][-6:]
def post(d):
    r = urllib.request.Request(f"http://127.0.0.1:{SIM}/", data=json.dumps(d).encode(), method="POST")
    return json.loads(urllib.request.urlopen(r).read())

PERIGO = re.compile(r"sair|excluir|apagar|remover|limpar|zerar|resetar|reset|deletar|delete|descadastr|cancelar assinatura|restaurar|importar|enviar e-?mail|whats|wa\.me|imprimir|baixar|exportar|download|pagar|comprar|assinar|pix|instalar", re.I)

MARCA = """(() => {
  const vis = e => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const t = e => (e.innerText || e.value || e.getAttribute('aria-label') || e.title || '').trim().replace(/\\s+/g,' ').slice(0,45);
  const els = [...document.querySelectorAll('button,[role=button],[role=tab],a[href^="#"],a[href="javascript:void(0)"],[onclick],.tab,.nav-item,.menu-item')]
    .filter(e => !e.closest('#ca-raiz') && !e.dataset.ex && vis(e) && !e.disabled);
  let n = document.querySelectorAll('[data-ex]').length;
  return els.map(e => { e.dataset.ex = ++n; return {id: n, txt: t(e), href: e.getAttribute('href') || ''}; });
})()"""

def explorar(pg, nome, limite=160):
    rel = {"app": nome, "cliques": 0, "erros": [], "alertas": [], "botoes": [], "telas": set(), "falhas_clique": 0}
    pg.on("pageerror", lambda e: rel["erros"].append(str(e)[:180]))
    pg.on("dialog", lambda d: (rel["alertas"].append(d.message[:120]), d.dismiss()))
    feitos = set()
    for rodada in range(7):
        cands = pg.evaluate(MARCA)
        novos = [c for c in cands if c["txt"] and not PERIGO.search(c["txt"] + " " + c["href"]) and c["txt"] not in feitos]
        if not novos: break
        for c in novos:
            if rel["cliques"] >= limite: break
            feitos.add(c["txt"])
            antes = len(rel["erros"])
            try:
                ok = pg.evaluate(f'(() => {{ const e = document.querySelector(\'[data-ex="{c["id"]}"]\'); if (!e || !e.isConnected) return false; const r = e.getBoundingClientRect(); if (r.width < 2) return false; e.click(); return true; }})()')
                if not ok: continue
                pg.wait_for_timeout(350)
                rel["cliques"] += 1
                h = pg.evaluate("""(() => { const v = [...document.querySelectorAll('h1,h2,h3,.titulo,.page-title')].filter(e => e.offsetParent && e.innerText.trim()); return v.slice(0,2).map(e => e.innerText.trim().slice(0,40)).join(' / '); })()""")
                if h: rel["telas"].add(h)
                rel["botoes"].append(c["txt"] + (" ⚠ ERRO" if len(rel["erros"]) > antes else ""))
            except Exception:
                rel["falhas_clique"] += 1
            if "/apps-ex/" not in pg.url and not pg.url.startswith(f"http://127.0.0.1:{WEB}"):
                pg.go_back()
            pg.keyboard.press("Escape")
    rel["telas"] = sorted(rel["telas"])
    return rel

def cadastrar(pg, nome, email, senha):
    pg.wait_for_selector("#ca-novo", timeout=8000); pg.click("#ca-novo")
    pg.fill("#ca-nome", nome); pg.fill("#ca-email", email); pg.fill("#ca-senha", senha); pg.fill("#ca-senha2", senha); pg.check("#ca-aceite"); pg.click("#ca-b")
    pg.wait_for_selector("#ca-cod"); pg.fill("#ca-cod", codigo(email)); pg.click("#ca-b")

sim = subprocess.Popen(["node", str(RAIZ / "testes/simulador-apps-script.js"), str(SIM)], stdout=subprocess.DEVNULL)
web = subprocess.Popen([sys.executable, "-m", "http.server", str(WEB), "-d", str(APPS)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
saida = []
try:
    with sync_playwright() as p:
        nav = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        base = f"http://127.0.0.1:{WEB}"
        # criador (para liberar o PRO IMOBILIÁRIA e abrir a Estação)
        post({"acao": "cadastrar", "app": "", "nome": "Anderson Alves", "email": "criador@teste.com", "senha": "criador123", "consentimento": "v1"})
        tk = post({"acao": "confirmar", "email": "criador@teste.com", "codigo": codigo("criador@teste.com")})["token"]

        alvos = [
            ("Portal Marca & Estratégia", "/portal/index.html", None, (390, 844)),
            ("Estação de Trabalho", "/portal/estacao.html", "criador", (1280, 860)),
            ("Prospectarion (app)", "/prospectarion.github.io/index.html", "cad", (1280, 860)),
            ("Prospectarion (demo)", "/prospectarion.github.io/demo.html", None, (1280, 860)),
            ("Prospectarion (vitrine)", "/prospectarion.github.io/vitrine.html", None, (390, 844)),
            ("PRO IMOBILIÁRIA", "/pro-imobiliaria.github.io/index.html", "cad-liberar", (1280, 860)),
            ("Social Imob 360 PRO", "/social-imob-360.github.io/index.html", "cad", (1280, 860)),
            ("Social Imob 360 (criador)", "/social-imob-360.github.io/criador/index.html", "cad", (1280, 860)),
            ("Musicalis (venda)", "/musicalis-br.github.io/index.html", None, (390, 844)),
            ("Musicalis (app)", "/musicalis-br.github.io/app/index.html", None, (390, 844)),
            ("Imóveis e Investimentos RS", "/imoveis-e-investimentos-rs.github.io/index.html", None, (390, 844)),
            ("Mesa de Editais", "/mesa/index.html", None, (1280, 860)),
        ]
        for i, (nome, url, modo, vp) in enumerate(alvos):
            ctx = nav.new_context(viewport={"width": vp[0], "height": vp[1]}, service_workers="block")
            pg = ctx.new_page()
            pg.on("dialog", lambda d: d.dismiss())
            entrada = "sem login"
            try:
                pg.goto(base + url, wait_until="load", timeout=30000); pg.wait_for_timeout(1200)
                if modo == "criador":
                    pg.evaluate("window.CentralAcesso && CentralAcesso.entrar()")
                    pg.wait_for_selector("#ca-email", timeout=8000)
                    pg.fill("#ca-email", "criador@teste.com"); pg.fill("#ca-senha", "criador123"); pg.click("#ca-b")
                    pg.wait_for_timeout(2500); entrada = "conta criadora"
                elif modo and modo.startswith("cad"):
                    em = f"teste{i}@teste.com"
                    cadastrar(pg, "Cliente Teste", em, "senha12345"); pg.wait_for_timeout(1500)
                    entrada = "cadastro novo (teste grátis)"
                    if modo == "cad-liberar":
                        post({"acao": "adminLicenca", "token": tk, "email": em, "app": "pro-imobiliaria", "status": "ativo", "plano": "mensal", "vencimento": "2099-12-31"})
                        pg.click("#ca-sair"); pg.fill("#ca-email", em); pg.fill("#ca-senha", "senha12345"); pg.click("#ca-b"); pg.wait_for_timeout(2000)
                        entrada = "cadastro + liberação pelo criador"
                    if pg.is_visible("#ca-raiz"):
                        entrada += " — AINDA BLOQUEADO: " + pg.inner_text("#ca-raiz")[:120].replace("\n", " ")
                r = explorar(pg, nome)
            except Exception as e:
                r = {"app": nome, "erro_geral": str(e)[:200]}
            r["entrada"] = entrada
            saida.append(r); print(nome, r.get("cliques"), "cliques,", len(r.get("erros", [])), "erros", file=sys.stderr)
            ctx.close()
        nav.close()
finally:
    sim.kill(); web.kill()
json.dump(saida, open("/home/claude/auditoria/exploracao.json", "w"), ensure_ascii=False, indent=1)
