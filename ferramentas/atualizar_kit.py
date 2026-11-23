"""Atualiza SÓ o kit de acesso (e o adaptador) dentro dos repositórios dos apps já publicados,
sem reconstruir os apps a partir do código antigo (preserva tudo o que foi mudado direto em cada app).

Uso: python3 ferramentas/atualizar_kit.py /caminho/da/pasta/com/os/repositorios
     (a pasta deve conter prospectarion.github.io, pro-imobiliaria.github.io, social-imob-360.github.io)
"""
import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import separar_apps as sa  # reaproveita kit(), PONTES e o caminho da ponte

APPS = [
    ("prospectarion.github.io/index.html", "prospectarion", "Prospectarion", ["prospectarion"], "prospectarion", "prospectarion"),
    ("pro-imobiliaria.github.io/index.html", "pro-imobiliaria", "PRO IMOBILIÁRIA", ["proinnovar."], "pro-imobiliaria", "pro-imobiliaria"),
    ("social-imob-360.github.io/index.html", "social-imob-360", "Social Imob 360", [], "social-imob-360", "social-imob-360"),
    ("social-imob-360.github.io/criador/index.html", "social-imob-360", "Social Imob 360 • Criador", [], "social-imob-360", "social-imob-360-criador"),
]

if __name__ == "__main__":
    base = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/home/claude/apps-final")
    for rel, app, nome, prefixos, adapt, ponte in APPS:
        alvo = base / rel
        if not alvo.exists():
            print("pulei (não existe):", alvo); continue
        sa.kit(alvo, app, nome, prefixos, adapt, ponte)
        print("kit atualizado:", alvo)
