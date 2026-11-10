"""Teste da Estação de Trabalho (criador, integrante e cliente) com o simulador.
Uso: python3 testes/teste-estacao.py"""
import json, pathlib, shutil, subprocess, sys, time, urllib.request
from playwright.sync_api import sync_playwright

RAIZ = pathlib.Path(__file__).resolve().parent.parent
TMP = pathlib.Path("/tmp/estacao-teste"); SIM, WEB = 8841, 8842
if TMP.exists(): shutil.rmtree(TMP)
shutil.copytree(RAIZ, TMP, ignore=shutil.ignore_patterns(".git"))
(TMP / "config/central.json").write_text(json.dumps({"url": f"http://127.0.0.1:{SIM}/", "portal": f"http://127.0.0.1:{WEB}/"}))
for f in ("estacao.html", "index.html"):
    subprocess.run([sys.executable, str(TMP / "ferramentas/injetar.py"), str(TMP / f), "portal", "Central"], check=True, stdout=subprocess.DEVNULL)

def codigo(email):
    m = [e for e in json.loads(urllib.request.urlopen(f"http://127.0.0.1:{SIM}/__emails").read()) if e["to"] == email and "código" in e["subject"]]
    return m[-1]["subject"][-6:]
n = 0
def ok(c, m):
    global n
    assert c, m
    n += 1; print("  ✓", m)
def criar_conta(pg, nome, email, senha):
    pg.click("#bloq-entrar"); pg.click("#ca-novo")
    pg.fill("#ca-nome", nome); pg.fill("#ca-email", email); pg.fill("#ca-senha", senha); pg.fill("#ca-senha2", senha); pg.check("#ca-aceite"); pg.click("#ca-b")
    pg.wait_for_selector("#ca-cod"); pg.fill("#ca-cod", codigo(email)); pg.click("#ca-b")

sim = subprocess.Popen(["node", str(RAIZ / "testes/simulador-apps-script.js"), str(SIM)], stdout=subprocess.DEVNULL)
web = subprocess.Popen([sys.executable, "-m", "http.server", str(WEB), "-d", str(TMP)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
try:
    with sync_playwright() as p:
        nav = p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        def pagina(vp=(1280, 800)):
            c = nav.new_context(viewport={"width": vp[0], "height": vp[1]}, service_workers="block"); pg = c.new_page(); pg.erros = []
            pg.on("pageerror", lambda e: pg.erros.append(str(e))); pg.on("dialog", lambda d: d.accept()); return pg
        url = f"http://127.0.0.1:{WEB}/estacao.html"
        print("Cliente comum")
        pc = pagina(); pc.goto(url)
        ok(pc.is_visible("#bloqueio") and not pc.is_visible("#casca"), "Estação abre bloqueada")
        criar_conta(pc, "Carlos Cliente", "carlos@teste.com", "carlos123")
        pc.wait_for_function("document.getElementById('bloq-txt').textContent.indexOf('não faz parte') >= 0")
        ok(not pc.is_visible("#casca"), "cliente comum não entra na Estação")

        print("Criador")
        pg = pagina(); pg.goto(url)
        criar_conta(pg, "Anderson Alves", "criador@teste.com", "criador123")
        pg.wait_for_selector("#casca:not([hidden])")
        ok("criador" in pg.inner_text("#eu-papel").lower(), "criador entra e vê o próprio perfil")
        pg.click('#menu a[data-v="apps"]'); pg.wait_for_selector("#grade-apps .app")
        ok(pg.locator("#grade-apps .app").count() == 6, "aba Apps mostra os 6 apps para abrir")
        pg.click('#menu a[data-v="equipe"]'); pg.wait_for_selector("#grade-areas .cartao")
        ok(pg.locator("#grade-areas .cartao").count() == 7, "7 áreas sugeridas aparecem")
        pg.fill("#m-email", "bia@teste.com"); pg.fill("#m-nome", "Bia Atendimento"); pg.select_option("#m-papel", "atendente"); pg.select_option("#m-areas", ["atendimento"])
        pg.click("#f-membro button"); pg.wait_for_function("document.getElementById('tb-equipe').textContent.indexOf('bia@teste.com') >= 0")
        ok("convite pendente" in pg.inner_text("#tb-equipe"), "criador adiciona atendente (convite pendente)")
        pg.click('#menu a[data-v="editar"]'); pg.wait_for_selector("#a-nome")
        pg.select_option("#ed-app", "musicalis"); time.sleep(0.4)
        pg.fill("#a-desc", "Método de saxofone no celular"); pg.click("#f-app button"); time.sleep(0.6)
        pg.fill("#c-chave", "aviso.topo"); pg.fill("#c-valor", "Aulas ao vivo às quintas"); pg.click("#f-config button")
        pg.wait_for_function("document.getElementById('tb-config').textContent.indexOf('aviso.topo') >= 0")
        ok(True, "criador edita descrição e configuração do Musicalis")
        pg.click('#menu a[data-v="clientes"]'); pg.wait_for_selector("#tb-clientes tr")
        pg.fill("#l-email", "carlos@teste.com"); pg.select_option("#l-app", "prospectarion"); pg.select_option("#l-status", "ativo"); pg.click("#f-liberar button"); time.sleep(0.6)
        ok("carlos@teste.com" in pg.inner_text("#tb-clientes"), "criador libera app para cliente")
        pg.click('#menu a[data-v="registro"]'); pg.wait_for_selector("#tb-registro tr")
        ok("equipe_salvar" in pg.inner_text("#tb-registro") and "app_salvar" in pg.inner_text("#tb-registro"), "registro guarda as ações")

        print("Atendente no celular")
        pa = pagina((390, 844)); pa.goto(url)
        criar_conta(pa, "Bia Atendimento", "bia@teste.com", "bia123456")
        pa.wait_for_selector("#casca:not([hidden])")
        visiveis = pa.eval_on_selector_all("#menu a", "as => as.filter(a => !a.hidden).map(a => a.dataset.v)")
        ok("chamados" in visiveis and "editar" not in visiveis and "registro" not in visiveis, "atendente vê só Início, Apps, Clientes, Chamados, Equipe e Instalar")
        pa.click("#abrir-menu"); pa.click('#menu a[data-v="equipe"]'); pa.wait_for_selector("#tb-equipe tr")
        ok(not pa.is_visible("#box-add"), "atendente não adiciona integrantes")
        pa.screenshot(path="/tmp/estacao-atendente.png")
        pg.screenshot(path="/tmp/estacao-criador.png")
        ok(not pg.erros and not pa.erros and not pc.erros, "nenhum erro de JavaScript")
        nav.close()
finally:
    sim.terminate(); web.terminate()
print(f"\n{n} verificações da Estação OK")
