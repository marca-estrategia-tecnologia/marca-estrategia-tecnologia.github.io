/**
 * MARCA & ESTRATÉGIA TECNOLOGIA • Servidor de Contas e Licenças da Central
 * (Google Apps Script ligado a uma planilha — custo zero)
 *
 * Um servidor só para todos os apps: cadastro, confirmação de e-mail por código,
 * login, recuperação de senha por e-mail, licença por app, chamados de suporte
 * e Painel do Criador.
 *
 * COMO ATIVAR (uma vez) — passo a passo completo em docs/PUBLICAR.md
 * 1. Crie a planilha "Central • Contas e Licenças" no Google Drive.
 * 2. Extensões → Apps Script → apague o conteúdo → cole este arquivo → Salvar.
 * 3. Engrenagem (Configurações do projeto) → Propriedades do script → adicionar:
 *      CRIADOR_EMAILS = seu e-mail (vários separados por vírgula)
 *      PIMENTA        = texto longo e aleatório (40+ letras e números). Nunca compartilhe.
 *      NOME_REMETENTE = Marca & Estratégia Tecnologia   (opcional)
 * 4. Rode a função "instalar" uma vez (botão Executar) e autorize o acesso ao e-mail.
 * 5. Implantar → Nova implantação → App da Web → Executar como: Eu → Acesso: Qualquer pessoa.
 * 6. Copie o endereço que termina em /exec e cole em CENTRAL_URL nos apps.
 *
 * SEGURANÇA
 * - Senha nunca é salva: sal + hash SHA-256 com 5.000 rodadas + PIMENTA privada.
 * - Códigos de e-mail: 6 dígitos, valem 15 minutos, 5 tentativas, salvos só como hash.
 * - Bloqueio de 15 minutos após 5 senhas erradas. Limite de 5 e-mails por hora por conta.
 * - "Esqueci a senha" nunca revela se o e-mail existe.
 * - Trocar ou redefinir a senha encerra todas as sessões abertas.
 * - Criador definido só nas Propriedades do script, nunca no código público.
 * - Textos limpos antes de gravar (nada começa com = + - @: evita fórmulas na planilha).
 */

var VERSAO = "1.0.0";
var MIN_HASH_RODADAS = 5000;
var SESSAO_DIAS = 30;
var CODIGO_MIN = 15;

var ABAS = {
  Contas:    ["email","nome","whatsapp","cidade","estado","perfil","extra","sal","hash","confirmado","status","criado","ultimoAcesso","acessos","origem","consentimento","observacoes"],
  Licencas:  ["email","app","plano","status","vencimento","criado","atualizado","observacoes"],
  Apps:      ["app","nome","descricao","url","venda","statusInicial","diasTeste","publico","ordem"],
  Sessoes:   ["token","email","criado","expira"],
  Codigos:   ["email","tipo","hash","expira","tentativas"],
  Envios:    ["email","quando"],
  Falhas:    ["email","falhas","bloqueadoAte"],
  Chamados:  ["id","email","app","tipo","mensagem","status","criado","resposta"],
  Registro:  ["quando","email","acao","app","detalhe"]
};

/* Apps padrão: criados na aba "Apps" ao instalar. Edite pela planilha ou pelo Painel do Criador. */
var APPS_PADRAO = [
  ["prospectarion","Prospectarion","CRM e prospecção para corretores, consultores e pequenas empresas.","https://prospectarion.github.io/","","teste",7,"sim",1],
  ["pro-imobiliaria","PRO IMOBILIÁRIA","Prospecção, agenda e atendimento para corretores e imobiliárias.","https://pro-imobiliaria.github.io/","","analise",0,"sim",2],
  ["social-imob-360","Social Imob 360","Planejamento e produção de conteúdo para redes sociais.","https://social-imob-360.github.io/","","teste",7,"sim",3],
  ["musicalis","Musicalis","Método musical no celular, com acompanhamento do aluno.","https://musicalis.github.io/","https://musicalis.github.io/pagar/","ativo",0,"sim",4],
  ["mesa-de-editais","Mesa de Editais","Radar de editais culturais e apoio à escrita de projetos.","https://mesa-de-editais-br.github.io/","","lista",0,"sim",5]
];

/* ============================== ENTRADA ============================== */

function doPost(e){
  var lock = LockService.getScriptLock();
  try{
    lock.waitLock(15000);
    var d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var f = ACOES[String(d.acao || "")];
    if(!f) return json_({ok:false, erro:"acao", mensagem:"Ação desconhecida."});
    return json_(f(d));
  }catch(err){
    registrar_("", "erro", "", String(err && err.message || err).slice(0, 300));
    return json_({ok:false, erro:"servidor", mensagem:"Falha no servidor. Tente de novo em instantes."});
  }finally{ try{ lock.releaseLock(); }catch(x){} }
}

function doGet(){ return json_({ok:true, servico:"Central Marca & Estratégia Tecnologia", versao:VERSAO}); }

var ACOES = {
  cadastrar: cadastrar_,
  confirmar: confirmar_,
  reenviarCodigo: reenviarCodigo_,
  entrar: entrar_,
  sessao: sessao_,
  sair: sair_,
  esqueciSenha: esqueciSenha_,
  redefinirSenha: redefinirSenha_,
  trocarSenha: trocarSenha_,
  acesso: acesso_,
  catalogo: catalogo_,
  meusApps: meusApps_,
  pedirAcesso: pedirAcesso_,
  chamado: chamado_,
  adminResumo: soCriador_(adminResumo_),
  adminContas: soCriador_(adminContas_),
  adminLicenca: soCriador_(adminLicenca_),
  adminChamados: soCriador_(adminChamados_),
  adminChamado: soCriador_(adminChamado_),
  adminConta: soCriador_(adminConta_)
};

/* ============================== CONTAS ============================== */

function cadastrar_(d){
  var email = limpaEmail_(d.email), senha = String(d.senha || ""), app = limpaApp_(d.app);
  if(!email) return erro_("dados", "Informe um e-mail válido.");
  var fraca = senhaFraca_(senha); if(fraca) return erro_("senha", fraca);
  if(String(d.nome || "").trim().split(/\s+/).length < 2) return erro_("dados", "Informe nome e sobrenome.");
  if(!d.consentimento) return erro_("dados", "É preciso aceitar os Termos de Uso e a Política de Privacidade.");
  var sh = aba_("Contas"), n = acharLinha_(sh, "email", email);
  if(n > 0){
    var c = lerLinha_(sh, n, "Contas");
    if(String(c.confirmado) === "sim") return erro_("email_existe", "Este e-mail já tem conta. Use Entrar ou Esqueci a senha.");
    gravarCampos_(sh, n, "Contas", {sal:c.sal, hash:c.hash}); // não troca a senha de conta não confirmada por terceiros
    var env = enviarCodigo_(email, "confirmar", c.nome);
    if(!env.ok) return env;
    return {ok:true, confirmar:true, email:email, mensagem:"Esta conta ainda não foi confirmada. Enviamos um novo código para o seu e-mail."};
  }
  var sal = Utilities.getUuid(), agora = new Date();
  var linha = {
    email:email, nome:limpa_(d.nome,120), whatsapp:String(d.whatsapp || "").replace(/\D/g,"").slice(0,13),
    cidade:limpa_(d.cidade,80), estado:limpa_(d.estado,2).toUpperCase(), perfil:limpa_(d.perfil,80),
    extra:limpa_(JSON.stringify(d.extra || {}),2000), sal:sal, hash:hash_(senha, sal), confirmado:"nao",
    status:"ativo", criado:agora, ultimoAcesso:"", acessos:0, origem:limpa_(d.origem || app,80),
    consentimento:limpa_(d.consentimento,120) + " • " + agora.toISOString(), observacoes:""
  };
  sh.appendRow(ABAS.Contas.map(function(k){ return linha[k]; }));
  if(app) garantirLicenca_(email, app);
  registrar_(email, "cadastro", app, "");
  var r = enviarCodigo_(email, "confirmar", linha.nome);
  if(!r.ok) return r;
  return {ok:true, confirmar:true, email:email, mensagem:"Enviamos um código de 6 dígitos para o seu e-mail. Digite-o para confirmar o cadastro."};
}

function confirmar_(d){
  var email = limpaEmail_(d.email);
  var v = validarCodigo_(email, "confirmar", d.codigo);
  if(!v.ok) return v;
  var sh = aba_("Contas"), n = acharLinha_(sh, "email", email);
  if(n < 1) return erro_("conta", "Conta não encontrada.");
  gravarCampos_(sh, n, "Contas", {confirmado:"sim"});
  registrar_(email, "confirmou", "", "");
  return abrirSessao_(email, limpaApp_(d.app), sh, n);
}

function reenviarCodigo_(d){
  var email = limpaEmail_(d.email), tipo = d.tipo === "senha" ? "senha" : "confirmar";
  var sh = aba_("Contas"), n = email ? acharLinha_(sh, "email", email) : -1;
  if(n > 0){
    var c = lerLinha_(sh, n, "Contas");
    if(tipo === "senha" || String(c.confirmado) !== "sim"){
      var r = enviarCodigo_(email, tipo, c.nome);
      if(!r.ok && r.erro === "limite") return r;
    }
  }
  return {ok:true, mensagem:"Se o e-mail estiver cadastrado, um novo código foi enviado."};
}

function entrar_(d){
  var email = limpaEmail_(d.email), senha = String(d.senha || ""), app = limpaApp_(d.app);
  if(!email || !senha) return erro_("dados", "Informe e-mail e senha.");
  var bloq = bloqueado_(email); if(bloq) return bloq;
  var sh = aba_("Contas"), n = acharLinha_(sh, "email", email);
  var c = n > 0 ? lerLinha_(sh, n, "Contas") : null;
  if(!c || hash_(senha, c.sal) !== c.hash){ falhou_(email); return erro_("login", "E-mail ou senha incorretos."); }
  limparFalhas_(email);
  if(String(c.status) === "bloqueado") return erro_("conta_bloqueada", "Esta conta está suspensa. Fale com o suporte.");
  if(String(c.confirmado) !== "sim"){
    enviarCodigo_(email, "confirmar", c.nome);
    return {ok:false, erro:"nao_confirmado", email:email, mensagem:"Confirme seu e-mail para entrar. Enviamos um novo código."};
  }
  if(app) garantirLicenca_(email, app);
  return abrirSessao_(email, app, sh, n);
}

function sessao_(d){
  var s = sessaoValida_(d.token);
  if(!s) return erro_("sessao", "Sessão expirada. Entre de novo.");
  var sh = aba_("Contas"), n = acharLinha_(sh, "email", s.email);
  if(n < 1) return erro_("sessao", "Sessão expirada. Entre de novo.");
  var c = lerLinha_(sh, n, "Contas");
  if(String(c.status) === "bloqueado") return erro_("conta_bloqueada", "Esta conta está suspensa. Fale com o suporte.");
  return {ok:true, token:d.token, conta:contaPublica_(c), licenca:d.app ? licencaPublica_(s.email, limpaApp_(d.app)) : null};
}

function sair_(d){
  var sh = aba_("Sessoes"), n = acharLinha_(sh, "token", hashToken_(d.token));
  if(n > 0) sh.deleteRow(n);
  return {ok:true};
}

function esqueciSenha_(d){
  var email = limpaEmail_(d.email);
  var neutro = {ok:true, mensagem:"Se o e-mail estiver cadastrado, você vai receber um código para criar uma nova senha. Confira também a caixa de spam."};
  if(!email) return erro_("dados", "Informe o e-mail do cadastro.");
  var sh = aba_("Contas"), n = acharLinha_(sh, "email", email);
  if(n < 1){ registrar_(email, "esqueci_inexistente", "", ""); return neutro; }
  var c = lerLinha_(sh, n, "Contas");
  var r = enviarCodigo_(email, "senha", c.nome);
  if(!r.ok && r.erro === "limite") return r;
  registrar_(email, "esqueci", "", "");
  return neutro;
}

function redefinirSenha_(d){
  var email = limpaEmail_(d.email), nova = String(d.novaSenha || "");
  var fraca = senhaFraca_(nova); if(fraca) return erro_("senha", fraca);
  var v = validarCodigo_(email, "senha", d.codigo);
  if(!v.ok) return v;
  var sh = aba_("Contas"), n = acharLinha_(sh, "email", email);
  if(n < 1) return erro_("codigo", "Código inválido.");
  var sal = Utilities.getUuid();
  gravarCampos_(sh, n, "Contas", {sal:sal, hash:hash_(nova, sal), confirmado:"sim"});
  encerrarSessoes_(email);
  limparFalhas_(email);
  registrar_(email, "redefiniu_senha", "", "");
  avisarPorEmail_(email, "Sua senha foi alterada", "A senha da sua conta foi alterada agora. Se não foi você, responda este e-mail imediatamente.");
  return abrirSessao_(email, limpaApp_(d.app), sh, n);
}

function trocarSenha_(d){
  var s = sessaoValida_(d.token); if(!s) return erro_("sessao", "Sessão expirada. Entre de novo.");
  var sh = aba_("Contas"), n = acharLinha_(sh, "email", s.email), c = lerLinha_(sh, n, "Contas");
  if(hash_(String(d.atual || ""), c.sal) !== c.hash) return erro_("login", "A senha atual não confere.");
  var fraca = senhaFraca_(String(d.nova || "")); if(fraca) return erro_("senha", fraca);
  var sal = Utilities.getUuid();
  gravarCampos_(sh, n, "Contas", {sal:sal, hash:hash_(String(d.nova), sal)});
  encerrarSessoes_(s.email);
  registrar_(s.email, "trocou_senha", "", "");
  return abrirSessao_(s.email, "", sh, n);
}

/* ============================== LICENÇAS E APPS ============================== */

function acesso_(d){
  var app = limpaApp_(d.app);
  var s = sessaoValida_(d.token); if(!s) return erro_("sessao", "Sessão expirada. Entre de novo.");
  if(!app) return erro_("dados", "App não informado.");
  var sh = aba_("Contas"), n = acharLinha_(sh, "email", s.email), c = lerLinha_(sh, n, "Contas");
  if(String(c.status) === "bloqueado") return {ok:true, liberado:false, motivo:"conta_bloqueada", mensagem:"Conta suspensa. Fale com o suporte."};
  garantirLicenca_(s.email, app);
  var l = licencaPublica_(s.email, app);
  registrar_(s.email, "acesso", app, l.status);
  return {ok:true, liberado:l.liberado, licenca:l, conta:contaPublica_(c), mensagem:l.mensagem};
}

function catalogo_(){
  return {ok:true, apps:lerApps_().filter(function(a){ return a.publico === "sim"; }).map(function(a){
    return {app:a.app, nome:a.nome, descricao:a.descricao, url:a.url, venda:a.venda, diasTeste:Number(a.diasTeste) || 0};
  })};
}

function meusApps_(d){
  var s = sessaoValida_(d.token); if(!s) return erro_("sessao", "Sessão expirada. Entre de novo.");
  var apps = lerApps_(), mapa = {};
  apps.forEach(function(a){ mapa[a.app] = a; });
  var lics = lerTudo_("Licencas").filter(function(l){ return l.email === s.email; });
  return {ok:true, apps:lics.map(function(l){
    var a = mapa[l.app] || {nome:l.app, url:"", descricao:""};
    var p = licencaPublica_(s.email, l.app);
    return {app:l.app, nome:a.nome, descricao:a.descricao, url:a.url, venda:a.venda, status:p.status, plano:p.plano, vencimento:p.vencimento, liberado:p.liberado, mensagem:p.mensagem};
  })};
}

function pedirAcesso_(d){
  var s = sessaoValida_(d.token); if(!s) return erro_("sessao", "Sessão expirada. Entre de novo.");
  var app = limpaApp_(d.app); if(!app) return erro_("dados", "App não informado.");
  garantirLicenca_(s.email, app);
  var l = licencaPublica_(s.email, app);
  if(!l.liberado){
    avisarCriador_("Pedido de acesso: " + app, s.email + " pediu acesso ao app " + app + " (plano: " + limpa_(d.plano || "não informado", 60) + ").");
  }
  registrar_(s.email, "pedido_acesso", app, limpa_(d.plano, 60));
  return {ok:true, licenca:l, mensagem:l.liberado ? "Seu acesso já está liberado." : "Pedido registrado. Você recebe a liberação por e-mail."};
}

function chamado_(d){
  var s = sessaoValida_(d.token); if(!s) return erro_("sessao", "Sessão expirada. Entre de novo.");
  var msg = limpa_(d.mensagem, 2000); if(msg.length < 5) return erro_("dados", "Descreva o pedido em poucas palavras.");
  var id = "CH-" + Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyMMdd-HHmmss");
  aba_("Chamados").appendRow([id, s.email, limpaApp_(d.app) || "geral", limpa_(d.tipo || "suporte", 40), msg, "aberto", new Date(), ""]);
  avisarCriador_("Novo chamado " + id, s.email + " • " + (d.app || "geral") + " • " + (d.tipo || "suporte") + "\n\n" + msg);
  avisarPorEmail_(s.email, "Recebemos seu chamado " + id, "Recebemos seu pedido e vamos responder por e-mail.\n\nResumo: " + msg);
  return {ok:true, id:id, mensagem:"Chamado " + id + " registrado. Você recebe a resposta por e-mail."};
}

function garantirLicenca_(email, app){
  var sh = aba_("Licencas"), rows = lerTudo_("Licencas");
  for(var i = 0; i < rows.length; i++) if(rows[i].email === email && rows[i].app === app) return rows[i];
  var a = lerApps_().filter(function(x){ return x.app === app; })[0];
  var statusIni = ehCriador_(email) ? "ativo" : (a ? String(a.statusInicial || "analise") : "analise");
  var plano = ehCriador_(email) ? "criador" : (statusIni === "teste" ? "teste" : "");
  var venc = "";
  if(statusIni === "teste"){ var dias = Number(a && a.diasTeste) || 7; venc = new Date(Date.now() + dias * 864e5); }
  var nova = {email:email, app:app, plano:plano, status:statusIni, vencimento:venc, criado:new Date(), atualizado:new Date(), observacoes:""};
  sh.appendRow(ABAS.Licencas.map(function(k){ return nova[k]; }));
  return nova;
}

function licencaPublica_(email, app){
  var l = lerTudo_("Licencas").filter(function(x){ return x.email === email && x.app === app; })[0];
  if(!l) return {app:app, status:"sem_licenca", liberado:false, mensagem:"Você ainda não tem acesso a este app."};
  var venc = l.vencimento ? new Date(l.vencimento) : null;
  var status = String(l.status || "analise");
  var vencido = venc && venc.getTime() < Date.now();
  var liberado = (status === "ativo" || status === "teste") && !vencido;
  var msgs = {
    ativo: "Acesso liberado.", teste: "Período de teste ativo.",
    analise: "Seu acesso está em análise. Você recebe a liberação por e-mail.",
    lista: "Você está na lista de lançamento. Avisaremos por e-mail quando abrir.",
    bloqueado: "Acesso suspenso. Fale com o suporte."
  };
  return {
    app:app, plano:String(l.plano || ""), status:vencido ? "vencido" : status,
    vencimento:venc ? venc.toISOString() : "", liberado:liberado,
    mensagem:vencido ? "Seu acesso venceu. Renove para continuar." : (msgs[status] || "")
  };
}

/* ============================== PAINEL DO CRIADOR ============================== */

function soCriador_(f){
  return function(d){
    var s = sessaoValida_(d.token);
    if(!s || !ehCriador_(s.email)) return erro_("proibido", "Acesso restrito ao criador.");
    d._email = s.email;
    return f(d);
  };
}

function adminResumo_(){
  var contas = lerTudo_("Contas"), lics = lerTudo_("Licencas"), ch = lerTudo_("Chamados");
  var porApp = {};
  lics.forEach(function(l){
    var p = licencaPublica_(l.email, l.app);
    porApp[l.app] = porApp[l.app] || {total:0, liberados:0, analise:0, lista:0, vencidos:0};
    porApp[l.app].total++;
    if(p.liberado) porApp[l.app].liberados++;
    if(p.status === "analise") porApp[l.app].analise++;
    if(p.status === "lista") porApp[l.app].lista++;
    if(p.status === "vencido") porApp[l.app].vencidos++;
  });
  return {ok:true, contas:contas.length, confirmadas:contas.filter(function(c){ return String(c.confirmado) === "sim"; }).length,
    chamadosAbertos:ch.filter(function(c){ return c.status !== "resolvido"; }).length, porApp:porApp, apps:lerApps_()};
}

function adminContas_(){
  var lics = lerTudo_("Licencas");
  return {ok:true, contas:lerTudo_("Contas").map(function(c){
    var p = contaPublica_(c);
    p.criado = c.criado ? new Date(c.criado).toISOString() : "";
    p.ultimoAcesso = c.ultimoAcesso ? new Date(c.ultimoAcesso).toISOString() : "";
    p.acessos = Number(c.acessos) || 0; p.status = String(c.status || "ativo"); p.confirmado = String(c.confirmado);
    p.licencas = lics.filter(function(l){ return l.email === c.email; }).map(function(l){ return licencaPublica_(c.email, l.app); });
    return p;
  })};
}

function adminLicenca_(d){
  var email = limpaEmail_(d.email), app = limpaApp_(d.app);
  if(!email || !app) return erro_("dados", "Informe e-mail e app.");
  var status = String(d.status || "");
  if(["ativo","teste","analise","lista","bloqueado"].indexOf(status) < 0) return erro_("dados", "Status inválido.");
  garantirLicenca_(email, app);
  var sh = aba_("Licencas"), rows = sh.getDataRange().getValues(), cab = rows[0];
  for(var i = 1; i < rows.length; i++){
    if(String(rows[i][0]).toLowerCase() === email && String(rows[i][1]) === app){
      var venc = d.vencimento ? new Date(d.vencimento + "T23:59:59-03:00") : "";
      gravarCampos_(sh, i + 1, "Licencas", {plano:limpa_(d.plano, 40), status:status, vencimento:venc, atualizado:new Date(), observacoes:limpa_(d.observacoes, 300)});
      break;
    }
  }
  registrar_(d._email, "admin_licenca", app, email + " → " + status);
  var p = licencaPublica_(email, app);
  if(d.avisar && p.liberado){
    var a = lerApps_().filter(function(x){ return x.app === app; })[0] || {nome:app, url:""};
    avisarPorEmail_(email, "Seu acesso ao " + a.nome + " foi liberado",
      "Seu acesso ao " + a.nome + " está liberado" + (p.vencimento ? " até " + Utilities.formatDate(new Date(p.vencimento), "America/Sao_Paulo", "dd/MM/yyyy") : "") +
      ".\n\nAbra o app: " + a.url + "\nEntre com o seu e-mail e a sua senha de cadastro.");
  }
  return {ok:true, licenca:p};
}

function adminConta_(d){
  var email = limpaEmail_(d.email), status = d.status === "bloqueado" ? "bloqueado" : "ativo";
  var sh = aba_("Contas"), n = acharLinha_(sh, "email", email);
  if(n < 1) return erro_("conta", "Conta não encontrada.");
  gravarCampos_(sh, n, "Contas", {status:status});
  if(status === "bloqueado") encerrarSessoes_(email);
  registrar_(d._email, "admin_conta", "", email + " → " + status);
  return {ok:true};
}

function adminChamados_(){
  return {ok:true, chamados:lerTudo_("Chamados").map(function(c){
    c.criado = c.criado ? new Date(c.criado).toISOString() : ""; return c;
  }).reverse()};
}

function adminChamado_(d){
  var sh = aba_("Chamados"), n = acharLinha_(sh, "id", String(d.id || ""));
  if(n < 1) return erro_("dados", "Chamado não encontrado.");
  var c = lerLinha_(sh, n, "Chamados");
  var resp = limpa_(d.resposta, 3000);
  gravarCampos_(sh, n, "Chamados", {status:d.status === "resolvido" ? "resolvido" : "em_andamento", resposta:resp});
  if(resp) avisarPorEmail_(c.email, "Resposta ao chamado " + c.id, resp + "\n\nSeu pedido: " + c.mensagem);
  return {ok:true};
}

/* ============================== E-MAIL E CÓDIGOS ============================== */

function enviarCodigo_(email, tipo, nome){
  var envios = aba_("Envios"), umaHora = Date.now() - 36e5;
  var recentes = lerTudo_("Envios").filter(function(x){ return x.email === email && new Date(x.quando).getTime() > umaHora; }).length;
  if(recentes >= 5) return erro_("limite", "Muitos códigos enviados. Aguarde alguns minutos e tente de novo.");
  var codigo = String(Math.floor(100000 + Math.random() * 900000));
  var sh = aba_("Codigos"), n = -1, rows = sh.getDataRange().getValues();
  for(var i = 1; i < rows.length; i++) if(String(rows[i][0]) === email && String(rows[i][1]) === tipo){ n = i + 1; break; }
  var reg = [email, tipo, hash_(codigo, email + tipo), new Date(Date.now() + CODIGO_MIN * 6e4), 0];
  if(n > 0) sh.getRange(n, 1, 1, reg.length).setValues([reg]); else sh.appendRow(reg);
  envios.appendRow([email, new Date()]);
  var titulo = tipo === "senha" ? "Código para criar uma nova senha" : "Confirme seu cadastro";
  var texto = tipo === "senha" ? "Recebemos um pedido para criar uma nova senha." : "Falta só confirmar o seu e-mail.";
  var html = '<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#0A1628">' +
    '<p style="font-size:13px;color:#1B3A6B;font-weight:bold;letter-spacing:.5px">MARCA &amp; ESTRATÉGIA TECNOLOGIA</p>' +
    '<h2 style="margin:8px 0">' + titulo + '</h2><p>Olá' + (nome ? ", " + esc_(String(nome).split(" ")[0]) : "") + "! " + texto + ' Use este código:</p>' +
    '<p style="font-size:34px;letter-spacing:8px;font-weight:bold;background:#F4F6FA;padding:14px;text-align:center;border-radius:8px">' + codigo + '</p>' +
    '<p>O código vale por ' + CODIGO_MIN + ' minutos. Se você não pediu, ignore este e-mail: nada será alterado.</p>' +
    '<p style="font-size:12px;color:#666">Nunca pedimos sua senha por e-mail ou WhatsApp.</p></div>';
  MailApp.sendEmail({to:email, subject:titulo + " • código " + codigo, htmlBody:html, name:remetente_()});
  return {ok:true};
}

function validarCodigo_(email, tipo, codigo){
  if(!email || !/^\d{6}$/.test(String(codigo || ""))) return erro_("codigo", "Digite o código de 6 dígitos recebido por e-mail.");
  var sh = aba_("Codigos"), rows = sh.getDataRange().getValues();
  for(var i = 1; i < rows.length; i++){
    if(String(rows[i][0]) === email && String(rows[i][1]) === tipo){
      var tent = Number(rows[i][4]) || 0;
      if(new Date(rows[i][3]).getTime() < Date.now()) return erro_("codigo_expirado", "O código expirou. Peça um novo.");
      if(tent >= 5) return erro_("codigo_bloqueado", "Muitas tentativas. Peça um novo código.");
      if(hash_(String(codigo), email + tipo) !== String(rows[i][2])){
        sh.getRange(i + 1, 5).setValue(tent + 1);
        return erro_("codigo", "Código incorreto. Restam " + (4 - tent) + " tentativas.");
      }
      sh.deleteRow(i + 1);
      return {ok:true};
    }
  }
  return erro_("codigo", "Código inválido. Peça um novo.");
}

function avisarPorEmail_(email, assunto, texto){
  try{ MailApp.sendEmail({to:email, subject:assunto, body:texto + "\n\nMarca & Estratégia Tecnologia", name:remetente_()}); }catch(e){}
}
function avisarCriador_(assunto, texto){
  var lista = criadores_(); if(lista.length) avisarPorEmail_(lista.join(","), "[Central] " + assunto, texto);
}
function remetente_(){ return String(PropertiesService.getScriptProperties().getProperty("NOME_REMETENTE") || "Marca & Estratégia Tecnologia"); }

/* ============================== SESSÕES E SEGURANÇA ============================== */

function abrirSessao_(email, app, sh, n){
  var token = Utilities.getUuid() + Utilities.getUuid();
  aba_("Sessoes").appendRow([hashToken_(token), email, new Date(), new Date(Date.now() + SESSAO_DIAS * 864e5)]);
  var c = lerLinha_(sh, n, "Contas");
  gravarCampos_(sh, n, "Contas", {ultimoAcesso:new Date(), acessos:(Number(c.acessos) || 0) + 1});
  if(app) garantirLicenca_(email, app);
  registrar_(email, "entrou", app, "");
  return {ok:true, token:token, conta:contaPublica_(c), licenca:app ? licencaPublica_(email, app) : null};
}

function sessaoValida_(token){
  if(!token || String(token).length < 40) return null;
  var h = hashToken_(token), rows = aba_("Sessoes").getDataRange().getValues();
  for(var i = 1; i < rows.length; i++){
    if(String(rows[i][0]) === h){
      if(new Date(rows[i][3]).getTime() < Date.now()) return null;
      return {email:String(rows[i][1])};
    }
  }
  return null;
}

function encerrarSessoes_(email){
  var sh = aba_("Sessoes"), rows = sh.getDataRange().getValues();
  for(var i = rows.length - 1; i >= 1; i--) if(String(rows[i][1]) === email) sh.deleteRow(i + 1);
}

function bloqueado_(email){
  var sh = aba_("Falhas"), n = acharLinha_(sh, "email", email);
  if(n < 1) return null;
  var f = lerLinha_(sh, n, "Falhas");
  if(f.bloqueadoAte && new Date(f.bloqueadoAte).getTime() > Date.now())
    return erro_("bloqueio", "Muitas tentativas erradas. Aguarde 15 minutos ou use Esqueci a senha.");
  return null;
}
function falhou_(email){
  var sh = aba_("Falhas"), n = acharLinha_(sh, "email", email);
  if(n < 1){ sh.appendRow([email, 1, ""]); return; }
  var f = lerLinha_(sh, n, "Falhas"), q = (Number(f.falhas) || 0) + 1;
  gravarCampos_(sh, n, "Falhas", {falhas:q >= 5 ? 0 : q, bloqueadoAte:q >= 5 ? new Date(Date.now() + 15 * 6e4) : ""});
}
function limparFalhas_(email){
  var sh = aba_("Falhas"), n = acharLinha_(sh, "email", email);
  if(n > 0) sh.deleteRow(n);
}

function senhaFraca_(s){
  if(s.length < 8 || s.length > 64) return "A senha precisa ter de 8 a 64 caracteres.";
  if(!/[A-Za-zÀ-ú]/.test(s) || !/\d/.test(s)) return "A senha precisa ter letras e números.";
  return "";
}

function hash_(texto, sal){
  var pimenta = String(PropertiesService.getScriptProperties().getProperty("PIMENTA") || "");
  if(pimenta.length < 20) throw new Error("Configure a PIMENTA nas Propriedades do script (20+ caracteres).");
  var v = String(sal) + "|" + texto + "|" + pimenta;
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, v, Utilities.Charset.UTF_8);
  for(var i = 1; i < MIN_HASH_RODADAS; i++) b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, b.concat(b.slice(0, 8)));
  return Utilities.base64Encode(b);
}
function hashToken_(t){
  return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(t || ""), Utilities.Charset.UTF_8));
}

function criadores_(){
  return String(PropertiesService.getScriptProperties().getProperty("CRIADOR_EMAILS") || "")
    .toLowerCase().split(",").map(function(s){ return s.trim(); }).filter(String);
}
function ehCriador_(email){ return criadores_().indexOf(String(email || "").toLowerCase()) >= 0; }

function contaPublica_(c){
  return {email:c.email, nome:c.nome, cidade:c.cidade, estado:c.estado, perfil:c.perfil, whatsapp:c.whatsapp, criador:ehCriador_(c.email)};
}

/* ============================== PLANILHA ============================== */

function instalar(){
  Object.keys(ABAS).forEach(function(n){ aba_(n); });
  var apps = aba_("Apps");
  if(apps.getLastRow() < 2) APPS_PADRAO.forEach(function(r){ apps.appendRow(r); });
  hash_("teste", "teste"); // confere a PIMENTA
  MailApp.getRemainingDailyQuota(); // pede a autorização de e-mail
  return "Central instalada. Agora faça a implantação como App da Web.";
}

function limparExpirados(){ // opcional: acionador diário
  var agora = Date.now();
  [["Sessoes",3],["Codigos",3]].forEach(function(p){
    var sh = aba_(p[0]), rows = sh.getDataRange().getValues();
    for(var i = rows.length - 1; i >= 1; i--) if(new Date(rows[i][p[1]]).getTime() < agora) sh.deleteRow(i + 1);
  });
  var env = aba_("Envios"), r2 = env.getDataRange().getValues();
  for(var j = r2.length - 1; j >= 1; j--) if(new Date(r2[j][1]).getTime() < agora - 864e5) env.deleteRow(j + 1);
}

function aba_(nome){
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(nome);
  if(!sh){ sh = ss.insertSheet(nome); sh.appendRow(ABAS[nome]); sh.setFrozenRows(1); }
  return sh;
}
function lerTudo_(nome){
  var rows = aba_(nome).getDataRange().getValues(), cab = ABAS[nome], out = [];
  for(var i = 1; i < rows.length; i++){
    var o = {}; cab.forEach(function(k, j){ o[k] = rows[i][j]; });
    if(o.email !== undefined) o.email = String(o.email).toLowerCase();
    out.push(o);
  }
  return out;
}
function lerApps_(){
  var a = lerTudo_("Apps");
  if(!a.length) return APPS_PADRAO.map(function(r){ var o = {}; ABAS.Apps.forEach(function(k, j){ o[k] = r[j]; }); return o; });
  return a.sort(function(x, y){ return (Number(x.ordem) || 99) - (Number(y.ordem) || 99); });
}
function acharLinha_(sh, campo, valor){
  var nome = sh.getName(), col = ABAS[nome].indexOf(campo), rows = sh.getDataRange().getValues();
  var v = String(valor || "").toLowerCase();
  for(var i = 1; i < rows.length; i++) if(String(rows[i][col]).toLowerCase() === v) return i + 1;
  return -1;
}
function lerLinha_(sh, n, nome){
  var cab = ABAS[nome], v = sh.getRange(n, 1, 1, cab.length).getValues()[0], o = {};
  cab.forEach(function(k, j){ o[k] = v[j]; });
  return o;
}
function gravarCampos_(sh, n, nome, campos){
  Object.keys(campos).forEach(function(k){ sh.getRange(n, ABAS[nome].indexOf(k) + 1).setValue(campos[k]); });
}
function registrar_(email, acao, app, detalhe){
  try{ aba_("Registro").appendRow([new Date(), email || "", acao, app || "", limpa_(detalhe, 300)]); }catch(e){}
}

/* ============================== UTILITÁRIOS ============================== */

function limpa_(s, max){
  var t = String(s == null ? "" : s).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max || 200);
  return /^[=+\-@]/.test(t) ? "'" + t : t;
}
function limpaEmail_(s){
  var e = String(s || "").trim().toLowerCase().slice(0, 120);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : "";
}
function limpaApp_(s){ return String(s || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40); }
function esc_(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
function erro_(codigo, mensagem){ return {ok:false, erro:codigo, mensagem:mensagem}; }
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
