#!/usr/bin/env python3
"""Monta um repositório por app a partir do repositório antigo aap29/prospectarion.

Uso: python3 ferramentas/separar_apps.py <pasta do prospectarion antigo> <pasta de saída>

- Não altera o repositório antigo.
- Troca os endereços aap29.github.io/prospectarion/... pelos novos.
- Coloca o kit da Central (login, licença, esqueci a senha, backup) nos apps vendidos.
- Remove do repositório novo as cópias antigas e a cópia do criador com painel local.
"""
import json, pathlib, re, shutil, subprocess, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ANTIGO = "https://aap29.github.io/prospectarion/"
NOVOS = {
    "musicalis/": "https://musicalis-br.github.io/",
    "social-imob-pro/": "https://social-imob-360.github.io/",
    "social-imob/": "https://social-imob-360.github.io/criador/",
    "imoveis/": "https://imoveis-e-investimentos-rs.github.io/",
    "pro-imobiliaria/": "https://pro-imobiliaria.github.io/",
    "teste": "https://prospectarion.github.io/",
    "app": "https://prospectarion.github.io/",
}

def trocar_enderecos(pasta):
    for f in pasta.rglob("*"):
        if f.suffix not in {".html", ".js", ".json", ".py", ".gs", ".md", ".webmanifest"} or ".git" in f.parts:
            continue
        t = f.read_text(encoding="utf-8", errors="ignore")
        n = t
        for velho in sorted(NOVOS, key=len, reverse=True):  # mais específico primeiro
            n = n.replace(ANTIGO + velho, NOVOS[velho])
        n = n.replace("https://aap29.github.io/prospectarion", "https://prospectarion.github.io")
        if n != t:
            f.write_text(n, encoding="utf-8")

def adaptador(nome):
    t = (RAIZ / "kit" / "adaptadores.js").read_text(encoding="utf-8")
    m = re.search(r"/\* @" + re.escape(nome) + r" \*/(.*?)/\* @fim \*/", t, re.S)
    return m.group(1).strip() if m else ""

def kit(html, app, nome, prefixos, adapt=None):
    subprocess.run([sys.executable, str(RAIZ / "ferramentas" / "injetar.py"), str(html), app, nome] + prefixos, check=True)
    if adapt:
        t = html.read_text(encoding="utf-8")
        bloco = "<!-- CENTRAL-ADAPTADOR -->\n<script>\n" + adaptador(adapt) + "\n</script>\n<!-- /CENTRAL-ADAPTADOR -->"
        t = re.sub(r"<!-- CENTRAL-ADAPTADOR -->.*?<!-- /CENTRAL-ADAPTADOR -->", lambda m: bloco, t, flags=re.S) if "<!-- CENTRAL-ADAPTADOR -->" in t \
            else t.replace("<!-- CENTRAL-ACESSO -->", bloco + "\n<!-- CENTRAL-ACESSO -->", 1)
        html.write_text(t, encoding="utf-8")

def readme(pasta, titulo, texto):
    (pasta / "README.md").write_text(f"# {titulo}\n\n{texto}\n\nParte da Central Marca & Estratégia Tecnologia — https://marca-estrategia-tecnologia.github.io/\n", encoding="utf-8")
    (pasta / ".nojekyll").write_text("")

def copiar(origem, destino, ignorar=()):
    shutil.copytree(origem, destino, dirs_exist_ok=True, ignore=shutil.ignore_patterns("__pycache__", *ignorar))

def montar(antigo, saida):
    antigo, saida = pathlib.Path(antigo), pathlib.Path(saida)
    saida.mkdir(parents=True, exist_ok=True)

    # 1. Prospectarion: a edição de clientes vira o app; demo continua; cópias antigas e a do criador ficam no repositório antigo
    p = saida / "prospectarion.github.io"; p.mkdir(exist_ok=True)
    for f in ["demo.html", "vitrine.html", "instalar.html", "manifest-demo.webmanifest", "icone-192.png", "icone-512.png"]:
        shutil.copy2(antigo / f, p / f)
    shutil.copy2(antigo / "app.html", p / "index.html")
    man = json.loads((antigo / "manifest-app.webmanifest").read_text(encoding="utf-8"))
    man.update({"id": "./", "start_url": "./", "scope": "./"})
    (p / "manifest.webmanifest").write_text(json.dumps(man, ensure_ascii=False, indent=2), encoding="utf-8")
    h = (p / "index.html").read_text(encoding="utf-8")
    h = h.replace('href="manifest-app.webmanifest"', 'href="manifest.webmanifest"').replace("senha:'1234'", "senha:''")
    (p / "index.html").write_text(h, encoding="utf-8")
    for f in ["demo.html"]:
        t = (p / f).read_text(encoding="utf-8").replace("senha:'1234'", "senha:''").replace('href="teste.html"', 'href="./"')
        (p / f).write_text(t, encoding="utf-8")
    sw = (antigo / "sw.js").read_text(encoding="utf-8")
    sw = re.sub(r"var CACHE = '[^']+';", "var CACHE = 'prospectarion-central-1';", sw)
    sw = re.sub(r"var ARQUIVOS = \[[^\]]+\];", "var ARQUIVOS = ['index.html', 'demo.html', 'manifest.webmanifest', 'manifest-demo.webmanifest', 'icone-192.png', 'icone-512.png'];", sw)
    sw = sw.replace("if (nome && nome.indexOf('.') === -1) nome += '.html';", "if (!nome) nome = 'index.html';\n  if (nome.indexOf('.') === -1) nome += '.html';")
    (p / "sw.js").write_text(sw, encoding="utf-8")
    readme(p, "Prospectarion", "CRM e prospecção para corretores, consultores e pequenas empresas.\n\n- `index.html`: o app (acesso pela conta da Central).\n- `demo.html`: demonstração pública.\n- `vitrine.html` e `instalar.html`: página de venda e manual.")

    # 2. PRO IMOBILIÁRIA (+ relatório diário de leads)
    p = saida / "pro-imobiliaria.github.io"
    copiar(antigo / "pro-imobiliaria", p)
    copiar(antigo / "ferramentas", p / "ferramentas")
    readme(p, "PRO IMOBILIÁRIA", "Prospecção, agenda e atendimento imobiliário. `ferramentas/relatorio-leads` gera o PDF diário de leads.")

    # 3. Social Imob 360: versão de venda na raiz; a do criador em /criador/
    p = saida / "social-imob-360.github.io"
    copiar(antigo / "social-imob-pro", p)
    copiar(antigo / "social-imob", p / "criador")
    readme(p, "Social Imob 360", "Planejamento e produção de conteúdo para redes sociais.\n\n- raiz: versão de venda (Social Imob 360 PRO).\n- `criador/`: app do criador e `criador/fonte-venda/` (gera a versão de venda).")

    # 4. Musicalis: mantém a licença própria (já assinada digitalmente)
    p = saida / "musicalis-br.github.io"
    copiar(antigo / "musicalis", p)
    readme(p, "Musicalis", "Método musical no celular. App em `app/`; páginas de venda na raiz. Fontes e testes em `fonte/` (ver `fonte/LEIA-ME.md`).")

    # 5. Imóveis e Investimentos RS
    p = saida / "imoveis-e-investimentos-rs.github.io"
    copiar(antigo / "imoveis", p)

    for d in saida.iterdir():
        if d.is_dir():
            trocar_enderecos(d)

    # Kit da Central nos apps de uso com login
    kit(saida / "prospectarion.github.io" / "index.html", "prospectarion", "Prospectarion", ["prospectarion"], "prospectarion")
    kit(saida / "pro-imobiliaria.github.io" / "index.html", "pro-imobiliaria", "PRO IMOBILIÁRIA", ["proinnovar."])
    kit(saida / "social-imob-360.github.io" / "index.html", "social-imob-360", "Social Imob 360", [], "social-imob-360")
    kit(saida / "social-imob-360.github.io" / "criador" / "index.html", "social-imob-360", "Social Imob 360 • Criador", [], "social-imob-360")
    print("Repositórios montados em", saida)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    montar(sys.argv[1], sys.argv[2])
