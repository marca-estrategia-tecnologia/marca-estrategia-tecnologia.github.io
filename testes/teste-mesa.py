"""Teste da Mesa de Editais ligada ao servidor da Central (simulador).
Uso: python3 testes/teste-mesa.py /caminho/da/mesa"""
import json, pathlib, shutil, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
MESA = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/home/claude/mesa")
TMP = pathlib.Path("/tmp/mesa-teste"); SIM, WEB = 8797, 8798
if TMP.exists(): shutil.rmtree(TMP)
shutil.copytree(MESA, TMP, ignore=shutil.ignore_patterns(".git"))
h = (TMP / "index.html").read_text(encoding="utf-8").replace('CENTRAL_URL: "",', f'CENTRAL_URL: "http://127.0.0.1:{SIM}/",').replace("connect-src ", f"connect-src http://127.0.0.1:{SIM} ")
(TMP / "index.html").write_text(h, encoding="utf-8")
def codigo(email):
    m = [e for e in json.loads(urllib.request.urlopen(f"http://127.0.0.1:{SIM}/__emails").read()) if e["to"] == email and "código" in e["subject"]]
    return m[-1]["subject"][-6:]
n = 0
def ok(c, m):
    global n
    assert c, m
    n += 1; print("  ✓", m)
sim = subprocess.Popen(["node", str(RAIZ / "testes/simulador-apps-script.js"), str(SIM)], stdout=subprocess.DEVNULL)
web = subprocess.Popen([sys.executable, "-m", "http.server", str(WEB), "-d", str(TMP)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
try:
    with sync_playwright() as p:
        nav = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        pg = nav.new_page(viewport={"width": 390, "height": 844}); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)))
        popups = []; pg.context.on("page", lambda x: popups.append(x.url))
        pg.goto(f"http://127.0.0.1:{WEB}/index.html")
        print("Inscrição")
        pg.fill("#c-nome", "Carla Proponente"); pg.fill("#c-email", "carla@teste.com"); pg.fill("#c-cidade", "Sapucaia do Sul")
        pg.select_option("#c-uf", "RS"); pg.select_option("#c-perfil", index=1)
        pg.fill("#c-senha", "edital2026"); pg.fill("#c-senha2", "edital2027"); pg.check("#c-lgpd"); pg.click("#c-enviar")
        ok("não são iguais" in pg.inner_text("#c-aviso"), "confirmação de senha recusa senhas diferentes")
        pg.fill("#c-senha2", "edital2026"); pg.click("#c-enviar")
        pg.wait_for_selector(".passo-codigo .cod")
        ok(not popups, "inscrição não abre WhatsApp")
        rows = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{SIM}/__emails").read())
        ok(any(e["to"] == "carla@teste.com" for e in rows), "código de confirmação enviado ao e-mail")
        pg.fill(".passo-codigo .cod", "111111"); pg.click(".passo-codigo .ok-cod"); time.sleep(0.3)
        ok("incorreto" in pg.inner_text(".msg-cod") or "inválido" in pg.inner_text(".msg-cod"), "código errado é recusado")
        pg.fill(".passo-codigo .cod", codigo("carla@teste.com")); pg.click(".passo-codigo .ok-cod")
        pg.wait_for_selector("#painel", state="visible")
        ok("lista de lançamento" in pg.inner_text("#p-texto"), "cadastro confirmado: entra na lista de lançamento")
        ok(pg.inner_text("#topo-entrar") == "Minha Mesa", "fica conectada")
        print("Esqueci a senha")
        pg.click("#p-sair"); pg.fill("#l-email", "carla@teste.com"); pg.click("#l-esqueci")
        pg.wait_for_selector("#l-passo .cod")
        pg.fill("#l-passo .cod", codigo("carla@teste.com")); pg.fill("#l-passo .s1", "novaSenha1"); pg.fill("#l-passo .s2", "novaSenha2"); pg.click("#l-passo .ok-cod")
        ok("não são iguais" in pg.inner_text("#l-passo .msg-cod"), "nova senha exige repetição igual")
        pg.fill("#l-passo .s2", "novaSenha1"); pg.click("#l-passo .ok-cod")
        pg.wait_for_selector("#painel", state="visible")
        ok(True, "recupera a senha pelo código do e-mail")
        pg.click("#p-sair"); pg.fill("#l-email", "carla@teste.com"); pg.fill("#l-senha", "novaSenha1"); pg.click("#l-enviar")
        pg.wait_for_selector("#painel", state="visible"); ok(True, "entra com a nova senha")
        pg.reload(); pg.wait_for_selector("#painel", state="visible"); ok(True, "sessão continua depois de recarregar")
        ok(not erros, "nenhum erro de JavaScript")
        nav.close()
finally:
    sim.terminate(); web.terminate()
print(f"\n{n} verificações da Mesa OK")
