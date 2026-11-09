# Marca & Estratégia Tecnologia — Assessoria Empresarial

Central de Apps e serviços digitais para empresas, empreendedores e profissionais autônomos.

Fundador: Anderson Alves · Vale dos Sinos e Grande Porto Alegre / RS

## O que é este repositório

Aqui fica a **Central**: um único endereço web onde clientes conhecem e acessam os apps e contratam serviços, e onde o criador controla quem acessa cada ferramenta, por quanto tempo, e qual suporte foi solicitado.

| Camada | Função | Quem vê |
|---|---|---|
| Vitrine | Catálogo de apps e serviços, demonstrações, contato | Público |
| Área do cliente | Login, "Meus apps", plano, chamados de suporte, pedidos de serviço | Cliente |
| Painel do Criador | Empresas, usuários, licenças por app, chamados, versões, acessos | Somente o criador |
| Servidor de licenças | Cadastro, licenças assinadas e chamados (Google Apps Script + Planilha) | Backend |

Os apps **não** ficam neste repositório. Cada app continua no seu próprio lugar e apenas confere uma **licença assinada** emitida pela Central. Os dados de trabalho dos clientes (leads, agenda) não passam pela Central.

## Serviços oferecidos

- Construção e manutenção de sites
- Páginas de vendas e landing pages
- Conexão de redes sociais e WhatsApp
- Implantação, melhoria e manutenção dos apps da Central

## Catálogo de apps

Veja [`catalogo/apps.json`](catalogo/apps.json) e a auditoria em [`docs/AUDITORIA-2026-11-09.md`](docs/AUDITORIA-2026-11-09.md).

## Regras do repositório

1. Repositório público (GitHub Pages gratuito): **nenhuma senha, chave ou dado de cliente no código**. Segredos ficam nas Propriedades do Apps Script.
2. Nenhum app é alterado a partir daqui.
3. Toda mudança é registrada em commit com descrição clara.
4. Ferramentas pagas só com autorização expressa do criador (Política Zero Custo).

## Estrutura

| Pasta / arquivo | O que é |
|---|---|
| `index.html` | Portal: vitrine, serviços, Meus apps, Painel do Criador |
| `termos.html`, `privacidade.html` | Termos de Uso e Política de Privacidade (modelo a validar) |
| `servidor/central.gs` | Servidor de contas e licenças (Google Apps Script + planilha) |
| `kit/central-acesso.js` | Kit que entra em cada app: login, cadastro, esqueci a senha, licença, backup |
| `kit/adaptadores.js` | Liga a licença da Central ao plano interno de cada app |
| `ferramentas/` | `injetar.py`, `separar_apps.py`, `aviso_mudanca.py` |
| `testes/` | Simulador do Apps Script e testes no navegador |
| `docs/PUBLICAR.md` | Roteiro de publicação passo a passo |

## Fases

1. Vitrine + catálogo (sem login) — **próxima**
2. Servidor de licenças + Painel do Criador
3. Prospectarion e PRO IMOBILIÁRIA conferindo a licença da Central
4. Chamados de suporte e pedidos de serviço
5. Demais apps na Central
