# Auditoria dos sistemas — 09/11/2026

Fonte: leitura do código de `aap29/prospectarion` (commit ce9d394) e `MESA-DE-EDITAIS-BR/mesa-de-editais-br.github.io` (commit 75fe852). Nenhum arquivo foi alterado.

## Decisão sobre os CRMs

- **Prospectarion**: produto principal de CRM (já possui planos, teste, Pix, vitrine e manual).
- **PRO IMOBILIÁRIA**: edição imobiliária; a rotina diária mais completa (agenda, placar, radares, fila de prospecção, lixeira).
- **Prospecta** e **CorretoR PRO**: arquivados como doadores de funcionalidades (roteiros, objeções, landing page, módulo de construtoras).

## Falhas críticas

1. Licença e planos controlados no navegador do cliente (Prospectarion, Social Imob PRO).
2. Painel admin local com usuário `admin` e senha padrão no código público (Prospectarion).
3. Dados de trabalho só no aparelho, em todos os CRMs.
4. Um repositório com vários produtos misturados.
5. Seis cópias do Prospectarion.
6. Falta de termos de uso e política de privacidade.

## Pontos positivos

- Nenhuma chave de API, token ou dado real de cliente encontrado no código.
- Musicalis e Mesa de Editais mantêm segredos fora do código.
- Musicalis já usa licença assinada (ECDSA), planilha central, atualização automática e testes — é o modelo da Central.

## Atenção

O Musicalis é usado em `aap29.github.io/prospectarion/musicalis/app/`. Mover essa pasta sem redirecionamento quebra o app instalado dos alunos.
