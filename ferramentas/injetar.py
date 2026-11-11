#!/usr/bin/env python3
"""Coloca (ou atualiza) o kit central-acesso dentro do HTML de um app, inline, sem mexer no resto.

Uso:
  python3 ferramentas/injetar.py <app.html> <app-id> "<Nome do App>" [prefixo_backup ...]

A URL da Central vem de config/central.json ("url"). Rodar de novo só troca o bloco
entre os marcadores <!-- CENTRAL-ACESSO --> ... <!-- /CENTRAL-ACESSO -->.
"""
import json, re, sys, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
INI, FIM = "<!-- CENTRAL-ACESSO -->", "<!-- /CENTRAL-ACESSO -->"

def bloco(app, nome, prefixos, ponte=None):
    cfg = json.loads((RAIZ / "config" / "central.json").read_text(encoding="utf-8"))
    conf = {"url": cfg.get("url", ""), "app": app, "nome": nome, "portal": cfg.get("portal", "")}
    if app == "portal":
        conf["modo"] = "portal"
    if prefixos:
        conf["backup"] = {"prefixos": prefixos, "dias": cfg.get("backup_dias", 7)}
    if ponte:
        conf["ponte"] = ponte
    kit = (RAIZ / "kit" / "central-acesso.js").read_text(encoding="utf-8")
    return (INI + "\n<script>window.CENTRAL_CFG=" + json.dumps(conf, ensure_ascii=False) + ";</script>\n"
            "<script>\n" + kit.replace("</script", "<\\/script") + "\n</script>\n" + FIM)

def injetar(caminho, app, nome, prefixos, ponte=None):
    p = pathlib.Path(caminho)
    html = p.read_text(encoding="utf-8")
    novo = bloco(app, nome, prefixos, ponte)
    if INI in html:
        html = re.sub(re.escape(INI) + ".*?" + re.escape(FIM), lambda m: novo, html, flags=re.S)
    else:
        i = html.lower().rfind("</body>")
        if i < 0:
            raise SystemExit("Sem </body> em " + caminho)
        html = html[:i] + novo + "\n" + html[i:]
    p.write_text(html, encoding="utf-8")
    print("kit aplicado:", caminho)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        raise SystemExit(__doc__)
    extra = [a for a in sys.argv[4:] if not a.startswith("--ponte=")]
    pt = [a[len("--ponte="):] for a in sys.argv[4:] if a.startswith("--ponte=")]
    injetar(sys.argv[1], sys.argv[2], sys.argv[3], extra, json.loads(pt[0]) if pt else None)
