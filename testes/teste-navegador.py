"""Teste de ponta a ponta: portal + app de exemplo + simulador do servidor.
Uso: python3 testes/teste-navegador.py   (precisa de node e playwright)"""
import json, os, pathlib, shutil, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
TMP = pathlib.Path("/tmp/central-teste")
SIM, WEB = 8787, 8790

def preparar():
    if TMP.exists(): shutil.rmtree(TMP)
    shutil.copytree(RAIZ, TMP, ignore=shutil.ignore_patterns(".git"))
    cfg = json.loads((TMP / "config/central.json").read_text())
    cfg["url"] = f"http://127.0.0.1:{SIM}/"; cfg["portal"] = f"http://127.0.0.1:{WEB}/"
    (TMP / "config/central.json").write_text(json.dumps(cfg))
    subprocess.run([sys.executable, str(TMP / "ferramentas/injetar.py"), str(TMP / "index.html"), "portal", "Central"], check=True)
    (TMP / "app-exemplo.html").write_text("<!DOCTYPE html><html><head><meta charset='utf-8'><title>App</title></head><body><h1 id='app'>Conteúdo do app</h1>"
        "<script>localStorage.setItem('proinnovar.leads','[1,2,3]')</script></body></html>")
    subprocess.run([sys.executable, str(TMP / "ferramentas/injetar.py"), str(TMP / "app-exemplo.html"), "pro-imobiliaria", "PRO IMOBILIÁRIA", "proinnovar."], check=True)

def codigo(email):
    m = [e for e in json.loads(urllib.request.urlopen(f"http://127.0.0.1:{SIM}/__emails").read()) if e["to"] == email and "código" in e["subject"]]
    return m[-1]["subject"][-6:]

n = 0
def ok(cond, msg):
    global n
    assert cond, msg
    n += 1; print("  ✓", msg)

preparar()
sim = subprocess.Popen(["node", str(TMP / "testes/simulador-apps-script.js"), str(SIM)], stdout=subprocess.DEVNULL)
web = subprocess.Popen([sys.executable, "-m", "http.server", str(WEB), "-d", str(TMP)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
try:
    with sync_playwright() as p:
        nav = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        pg = nav.new_page(viewport={"width": 390, "height": 844})
        erros = []; pg.on("pageerror", lambda e: erros.append(str(e)))
        pg.on("dialog", lambda d: d.accept("Preciso de um site para minha loja") if d.type == "prompt" else d.accept())
        print("Portal: cadastro com confirmação de senha e código por e-mail")
        pg.goto(f"http://127.0.0.1:{WEB}/index.html")
        ok(pg.locator(".cartao").count() >= 9, "catálogo e serviços aparecem")
        pg.click("#nav-conta"); pg.click("#ca-novo")
        pg.fill("#ca-nome", "Joana Cliente"); pg.fill("#ca-email", "joana@teste.com")
        pg.fill("#ca-senha", "segura123"); pg.fill("#ca-senha2", "outra1234"); pg.check("#ca-aceite"); pg.click("#ca-b")
        pg.wait_for_function("document.getElementById('ca-msg') && document.getElementById('ca-msg').textContent.length > 0")
        ok("não são iguais" in pg.inner_text("#ca-msg"), "senhas diferentes são recusadas na tela")
        pg.fill("#ca-senha2", "segura123"); pg.click("#ca-b")
        pg.wait_for_selector("#ca-cod")
        pg.fill("#ca-cod", codigo("joana@teste.com")); pg.click("#ca-b")
        pg.wait_for_selector("#meus-apps", state="visible")
        ok("Joana" in pg.inner_text("#ola"), "confirma o e-mail e abre Meus apps")
        pg.click(".quero[data-app=prospectarion]"); pg.wait_for_selector("#grade-meus a:has-text('Abrir app')")
        ok(True, "Testar grátis libera o Prospectarion e mostra o link do app")
        pg.click(".pedir[data-servico=Sites]"); time.sleep(0.4)
        print("Portal: esqueci a senha")
        pg.click("#btn-sair"); pg.click("#nav-conta"); pg.fill("#ca-email", "joana@teste.com"); pg.click("#ca-esq"); pg.click("#ca-b")
        pg.wait_for_selector("#ca-cod")
        pg.fill("#ca-cod", codigo("joana@teste.com")); pg.fill("#ca-senha", "novinha123"); pg.fill("#ca-senha2", "novinha123"); pg.click("#ca-b")
        pg.wait_for_selector("#meus-apps", state="visible")
        ok(True, "recupera a senha com o código e entra")
        pg.click("#btn-sair")

        print("App: trava de acesso pela Central")
        pa = nav.new_page(viewport={"width": 390, "height": 844}); pa.on("pageerror", lambda e: erros.append(str(e)))
        pa.on("dialog", lambda d: d.accept())
        pa.goto(f"http://127.0.0.1:{WEB}/app-exemplo.html"); pa.wait_for_selector("#ca-email")
        ok(pa.is_visible("#ca-raiz"), "app pede login antes de abrir")
        pa.fill("#ca-email", "joana@teste.com"); pa.fill("#ca-senha", "novinha123"); pa.click("#ca-b")
        pa.wait_for_selector("#ca-ped")
        ok("análise" in pa.inner_text("#ca-raiz"), "sem licença: mostra 'em análise' e não abre o app")
        pa.click("#ca-ped"); time.sleep(0.4)

        print("Criador libera pelo painel")
        pg.click("#nav-conta"); pg.click("#ca-novo")
        pg.fill("#ca-nome", "Anderson Alves"); pg.fill("#ca-email", "criador@teste.com"); pg.fill("#ca-senha", "criador123"); pg.fill("#ca-senha2", "criador123"); pg.check("#ca-aceite"); pg.click("#ca-b")
        pg.wait_for_selector("#ca-cod"); pg.fill("#ca-cod", codigo("criador@teste.com")); pg.click("#ca-b")
        pg.wait_for_selector("#painel", state="visible"); pg.wait_for_selector("#tab-contas tbody tr")
        ok("joana@teste.com" in pg.inner_text("#tab-contas"), "painel lista a cliente e as licenças")
        ok(pg.locator(".lic[data-app=portal]").count() == 0, "entrar pelo portal não cria licença falsa")
        pg.fill("#l-email", "joana@teste.com"); pg.select_option("#l-app", "pro-imobiliaria"); pg.select_option("#l-status", "ativo"); pg.fill("#l-venc", "2099-12-31")
        pg.click("#f-liberar button"); time.sleep(0.5)
        mails = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{SIM}/__emails").read())
        ok(any(m["to"] == "joana@teste.com" and "liberado" in m["subject"] for m in mails), "cliente recebe o link do app por e-mail")
        ok(any("[Central]" in m["subject"] for m in mails), "criador recebe aviso de pedidos e chamados")

        pa.reload(); pa.wait_for_selector("#ca-botao")
        ok(not pa.is_visible("#ca-raiz") and pa.is_visible("#app"), "depois de liberado, o app abre")
        pa.wait_for_selector("#ca-faixa", timeout=8000)
        ok("Cópia de segurança" in pa.inner_text("#ca-faixa"), "lembrete de cópia de segurança aparece")
        with pa.expect_download() as d: pa.click("#ca-bk-baixar")
        dados = json.loads(pathlib.Path(d.value.path()).read_text())
        ok(dados["chaves"].get("proinnovar.leads") == "[1,2,3]" and not any(k.startswith("central.") for k in dados["chaves"]), "cópia baixada contém só os dados do app")
        pa.click("#ca-botao"); ok("joana@teste.com" in pa.inner_text("#ca-raiz"), "menu Minha conta mostra a conta")
        pg.screenshot(path="/tmp/central-portal.png", full_page=False)
        ok(not erros, "nenhum erro de JavaScript")
        nav.close()
finally:
    sim.terminate(); web.terminate()
print(f"\n{n} verificações no navegador OK")
