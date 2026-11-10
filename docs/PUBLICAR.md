# Roteiro de publicação — Central e apps em repositórios próprios

Tudo já está construído e testado. Estes passos dependem da sua conta (Google e GitHub).
Faça na ordem. Cada passo leva poucos minutos.

## Passo 1 — Criar as organizações e repositórios no GitHub (você)

Para cada linha: **+** → **New organization** → plano **Free** → nome da organização.
Dentro dela: **New repository** → nome do repositório → **Public** → **sem README**.

| Organização | Repositório |
|---|---|
| `marca-estrategia-tecnologia` | `marca-estrategia-tecnologia.github.io` |
| `prospectarion` | `prospectarion.github.io` |
| `pro-imobiliaria` | `pro-imobiliaria.github.io` |
| `social-imob-360` | `social-imob-360.github.io` |
| `musicalis-br` | `musicalis-br.github.io` |
| `imoveis-e-investimentos-rs` | `imoveis-e-investimentos-rs.github.io` |

Nome ocupado? Use o mesmo com `-br` no final e avise o Claude (os endereços são trocados automaticamente).

## Passo 2 — Ligar o servidor da Central (você, uma vez)

1. No Google Drive, crie a planilha **Central • Contas e Licenças** (com a conta que vai enviar os e-mails).
2. **Extensões → Apps Script** → apague o conteúdo → cole o arquivo `servidor/central.gs` → **Salvar**.
3. Engrenagem **Configurações do projeto** → **Propriedades do script** → adicionar:
   - `CRIADOR_EMAILS` = seu e-mail de login (o mesmo que você vai usar na Central)
   - `PIMENTA` = um texto longo e aleatório, 40+ letras e números. Guarde em lugar seguro e nunca compartilhe.
4. No topo, escolha a função **instalar** → **Executar** → autorize (Google pede permissão para planilha e e-mail).
5. **Implantar → Nova implantação** → tipo **App da Web** → Executar como: **Eu** → Quem pode acessar: **Qualquer pessoa** → **Implantar**.
6. Copie o endereço que termina em **/exec** e mande para o Claude.
7. Opcional: **Acionadores** → adicionar → função `limparExpirados` → diário.

Limite gratuito do Google para e-mails: confira em https://developers.google.com/apps-script/guides/services/quotas (conta Gmail comum tem cota diária menor que Google Workspace).

## Passo 3 — Publicar (Claude)

Com o endereço /exec e os repositórios criados, o Claude:
1. grava o endereço em `config/central.json`, na Mesa (`CONFIG.CENTRAL_URL`) e remonta os apps;
2. envia cada repositório e liga o GitHub Pages;
3. roda os testes de novo.

Para você ligar o GitHub Pages em cada repositório (se o Claude não tiver permissão): **Settings → Pages → Deploy from a branch → main → / (root) → Save**.

## Passo 4 — Primeiro acesso (você)

1. Abra `https://marca-estrategia-tecnologia.github.io/` → **Entrar → Criar conta** com o e-mail de `CRIADOR_EMAILS`.
2. Confirme o código do e-mail. O **Painel do Criador** aparece logo abaixo de Meus apps.
3. Na aba **Apps** da planilha você ajusta nome, descrição, link de venda, status inicial (`teste`, `analise`, `lista`, `ativo`) e dias de teste de cada app.

## Passo 5 — Mesa de Editais (você aprova)

O ramo `correcao-inscricao-central` do repositório da Mesa tem a correção da inscrição.
Só junte ao `main` **depois** do Passo 3 (o Claude coloca o endereço da Central nele):
https://github.com/MESA-DE-EDITAIS-BR/mesa-de-editais-br.github.io/compare/main...correcao-inscricao-central

## Passo 6 — Aviso de mudança nos endereços antigos (você aprova)

O ramo `aviso-mudanca-endereco` do repositório `aap29/prospectarion` coloca a faixa "Este app mudou de endereço"
(com "Levar meus dados") e redireciona páginas de venda e o site de imóveis.
Só junte ao `main` **depois** que os apps novos estiverem no ar:
https://github.com/aap29/prospectarion/compare/main...aviso-mudanca-endereco

Nada é apagado do repositório antigo. A sua cópia de criador (`index.html`) não foi alterada.

## O que muda para cada usuário

| App | Usuário atual | O que ele faz |
|---|---|---|
| PRO IMOBILIÁRIA | Você | No endereço antigo: Levar meus dados. No novo: criar conta → Minha conta → Cópia de segurança → Restaurar. |
| Prospectarion | Clientes do app antigo | Mesmo caminho do PRO IMOBILIÁRIA. Libere cada cliente no Painel do Criador. |
| Social Imob 360 | Você e clientes | Backup pelo próprio app (menu de backup) e importar no endereço novo. |
| Musicalis | 2 alunos no plano gratuito | Abrem o novo endereço e entram de novo. A licença própria do Musicalis continua. |
| Mesa de Editais | Lista de lançamento | Nada: o endereço não muda. |

## Testes automáticos

```
node testes/teste-servidor.js                    # 33 verificações do servidor
python3 testes/teste-navegador.py                # portal, login, esqueci a senha, painel
python3 testes/teste-mesa.py <pasta da mesa>     # inscrição da Mesa
python3 testes/teste-apps.py <pasta do prospectarion antigo>   # apps separados
```
