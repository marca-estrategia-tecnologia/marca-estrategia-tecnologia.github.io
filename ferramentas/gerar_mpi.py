"""Gera uma instância do MPI (Marketing Produção) para uma empresa, a partir do modelo em modelo-mpi/.

Uso: python3 ferramentas/gerar_mpi.py PASTA_DESTINO "NOME CURTO" "Nome completo da empresa" slug-da-empresa caminho/logo-branca.png [dominio-email]
Ex.: python3 ferramentas/gerar_mpi.py mpi-proimob "PRO IMOB" "PRO IMOB Imóveis e Investimentos" proimob logo.png proimob.com.br
Depois: cadastrar a empresa (slug) no banco do MPI e criar o perfil do Criador para ela.
"""
import sys, shutil, pathlib, re
src = pathlib.Path(__file__).resolve().parent.parent / 'modelo-mpi'
dst, curto, completo, slug, logo = sys.argv[1:6]
dominio = sys.argv[6] if len(sys.argv) > 6 else 'empresa.com.br'
dst = pathlib.Path(dst)
if dst.exists(): shutil.rmtree(dst)
shutil.copytree(src, dst, ignore=shutil.ignore_patterns('LEIA-ME.md'))
shutil.copy(logo, dst / 'img' / 'logo-empresa-branca.png')
def js(t):  # mesmo formato de escape do pacote original
    return ''.join(c if ord(c) < 128 else '\\x%02X' % ord(c) if ord(c) < 256 else '\\u%04X' % ord(c) for c in t)
for f in dst.rglob('*'):
    if f.suffix not in ('.html', '.webmanifest', '.js', '.url'): continue
    s = f.read_text(encoding='utf8')
    s = s.replace('{{EMPRESA_CURTO_MAIUSC_JS}}', js(curto.upper())).replace('{{EMPRESA_CURTO_JS}}', js(curto)).replace('{{EMPRESA_COMPLETO_JS}}', js(completo))
    s = s.replace('{{EMPRESA_CURTO_MAIUSC}}', curto.upper()).replace('{{EMPRESA_CURTO}}', curto).replace('{{EMPRESA_COMPLETO}}', completo)
    s = s.replace('{{SLUG}}', slug).replace('{{DOMINIO}}', dominio).replace('{{PASTA}}', dst.name)
    f.write_text(s, encoding='utf8')
print('MPI gerado em', dst)
