#!/usr/bin/env python3
"""Prepara o repositório ANTIGO (aap29/prospectarion) para a mudança de endereço.

Uso: python3 ferramentas/aviso_mudanca.py <pasta do prospectarion antigo>

- Apps com dados no aparelho: faixa "Este app mudou de endereço" com
  "Levar meus dados" (baixa a cópia no formato do kit da Central) e "Abrir o novo endereço".
- Páginas sem dados de usuário (venda, manual, site de imóveis): redirecionam sozinhas.
- Nada é apagado. Rodar de novo só atualiza os blocos marcados.
"""
import json, pathlib, re, sys

INI, FIM = "<!-- AVISO-MUDANCA -->", "<!-- /AVISO-MUDANCA -->"

APPS = {  # arquivo: (app id, nome, novo endereço, prefixos do localStorage ou None se o app tem backup próprio)
    "app.html": ("prospectarion", "Prospectarion", "https://prospectarion.github.io/", ["prospectarion"]),
    "teste.html": ("prospectarion", "Prospectarion", "https://prospectarion.github.io/", ["prospectarion"]),
    "pro-imobiliaria/index.html": ("pro-imobiliaria", "PRO IMOBILIÁRIA", "https://pro-imobiliaria.github.io/", ["proinnovar."]),
    "social-imob-pro/index.html": ("social-imob-360", "Social Imob 360", "https://social-imob-360.github.io/", None),
    "social-imob/index.html": ("social-imob-360", "Social Imob 360", "https://social-imob-360.github.io/criador/", None),
    "musicalis/app/index.html": ("musicalis", "Musicalis", "https://musicalis-br.github.io/app/", None),
}
REDIRECIONAR = {
    "vitrine.html": "https://prospectarion.github.io/vitrine.html",
    "instalar.html": "https://prospectarion.github.io/instalar.html",
    "demo.html": "https://prospectarion.github.io/demo.html",
    "pro/index.html": "https://pro-imobiliaria.github.io/",
}
PASTAS_REDIRECIONAR = {"musicalis": "https://musicalis-br.github.io/", "imoveis": "https://imoveis-e-investimentos-rs.github.io/"}

def faixa(app, nome, url, prefixos):
    cfg = json.dumps({"app": app, "nome": nome, "url": url, "prefixos": prefixos}, ensure_ascii=False)
    return INI + """
<div id="mudanca" role="region" aria-label="Mudança de endereço" style="position:fixed;left:0;right:0;top:0;z-index:2147483646;background:#0A1628;color:#fff;font:14px/1.45 system-ui,sans-serif;padding:12px 14px;box-shadow:0 4px 16px rgba(0,0,0,.35)">
<div style="max-width:760px;margin:auto"><strong style="color:#E8B84B">Este app mudou de endereço.</strong> <span id="mudanca-txt"></span>
<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><button type="button" id="mudanca-dados" style="font:600 13px system-ui;border:0;border-radius:8px;padding:8px 12px;background:#E8B84B;color:#0A1628;cursor:pointer">1. Levar meus dados</button>
<a id="mudanca-ir" style="font:600 13px system-ui;border-radius:8px;padding:8px 12px;background:#fff;color:#0A1628;text-decoration:none">2. Abrir o novo endereço</a>
<button type="button" id="mudanca-fechar" style="font:600 13px system-ui;border:0;background:none;color:#AFC0D6;text-decoration:underline;cursor:pointer">Continuar aqui por enquanto</button></div></div></div>
<script>(function(){var C=""" + cfg + """;var t=document.getElementById("mudanca-txt"),b=document.getElementById("mudanca-dados");
document.getElementById("mudanca-ir").href=C.url;document.getElementById("mudanca-fechar").onclick=function(){document.getElementById("mudanca").remove();};
if(C.prefixos){t.textContent="Seus dados ficam neste aparelho. Abra o novo endereço, entre na sua conta e toque em Minha conta → Trazer meus dados do endereço antigo (ou baixe a cópia aqui e use Restaurar cópia).";
b.onclick=function(){var o={};for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(C.prefixos.some(function(p){return k.indexOf(p)===0;}))o[k]=localStorage.getItem(k);}
var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({app:C.app,nome:C.nome,gerado:new Date().toISOString(),origem:location.href,chaves:o})],{type:"application/json"}));
a.download=C.app+"-copia-mudanca.json";document.body.appendChild(a);a.click();b.textContent="Cópia baixada ✓";};}
else if(C.app==="musicalis"){t.textContent="Toque em Levar meu progresso: a versão nova abre já com sua conta, práticas e selos.";b.textContent="1. Levar meu progresso";
b.onclick=function(){try{var p=(typeof pacoteMigracao==="function")&&pacoteMigracao();if(!p){alert("Entre na sua conta aqui primeiro e toque de novo.");return;}var t2=b64uEnc(JSON.stringify(p));
if(t2.length>=400000){copiarBackup();alert("Progresso copiado. Na versão nova, cole em Perfil → Backup.");location.href=C.url;return;}location.href=C.url+"#migrar="+t2;}catch(e){alert("Use Perfil → Backup → Copiar meu backup e cole na versão nova.");}};}
else{t.textContent="Seus dados ficam neste aparelho. No endereço novo, entre na sua conta e use Minha conta → Trazer meus dados do endereço antigo.";b.style.display="none";}})();</script>
""" + FIM

def redirecionar(url):
    return INI + '\n<meta http-equiv="refresh" content="0; url=' + url + '">\n<link rel="canonical" href="' + url + '">\n<script>location.replace(' + json.dumps(url) + ' + location.hash);</script>\n' + FIM

def aplicar(arquivo, bloco, no_head=False):
    t = arquivo.read_text(encoding="utf-8", errors="ignore")
    if INI in t:
        t = re.sub(re.escape(INI) + ".*?" + re.escape(FIM), lambda m: bloco, t, flags=re.S)
    else:
        marca = "</head>" if no_head else "</body>"
        i = t.lower().rfind(marca) if not no_head else t.lower().find(marca)
        if i < 0 and no_head:
            m = re.search(r"<head[^>]*>", t, re.I)
            i = m.end() if m else -1
        if i < 0: return False
        t = t[:i] + bloco + "\n" + t[i:]
    arquivo.write_text(t, encoding="utf-8")
    return True

def main(antigo):
    antigo = pathlib.Path(antigo)
    for rel, (app, nome, url, pref) in APPS.items():
        if aplicar(antigo / rel, faixa(app, nome, url, pref)): print("faixa:", rel)
    for rel, url in REDIRECIONAR.items():
        if aplicar(antigo / rel, redirecionar(url), True): print("redireciona:", rel)
    for pasta, base in PASTAS_REDIRECIONAR.items():
        for f in (antigo / pasta).rglob("*.html"):
            rel = f.relative_to(antigo / pasta).as_posix()
            if rel.startswith(("app/", "fonte/")): continue
            destino = base + (rel[:-len("index.html")] if rel.endswith("index.html") else rel)
            if aplicar(f, redirecionar(destino), True): print("redireciona:", f.relative_to(antigo))

if __name__ == "__main__":
    if len(sys.argv) != 2: raise SystemExit(__doc__)
    main(sys.argv[1])
