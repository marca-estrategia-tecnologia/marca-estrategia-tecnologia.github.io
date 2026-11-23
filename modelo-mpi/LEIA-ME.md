# Modelo do M&E Produção (Marketing Produção)

Este é o modelo em branco do M&E Produção para oferecer a uma nova empresa cliente da Marca & Estratégia.
Ele não é publicado como app: serve de base para gerar a instância de cada empresa.

1. Prepare a logo branca da empresa (PNG com fundo transparente).
2. Gere a instância:
   `python3 ferramentas/gerar_mpi.py mpi-NOMEDAEMPRESA "NOME CURTO" "Nome completo" slug-da-empresa caminho/logo.png dominio.com.br`
3. Troque os ícones em `mpi-NOMEDAEMPRESA/img/` (icone-*.png e mpi.ico).
4. No banco do M&E Produção: cadastre a empresa com o mesmo slug e crie o perfil do Criador para ela.
5. Publique e envie à empresa o link `.../mpi-NOMEDAEMPRESA/` e as entradas por papel (`direcao/`, `marketing/`, `corretor/`).
