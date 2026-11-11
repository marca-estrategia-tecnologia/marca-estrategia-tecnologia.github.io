/* CENTRAL-ACESSO • kit de acesso dos apps da Marca & Estratégia Tecnologia  v1.1.0
 *
 * Entra em cada app (inline, pelo ferramentas/injetar.py). Faz:
 *  - login, cadastro com repetição de senha, confirmação do e-mail por código;
 *  - "Esqueci a senha" com código enviado ao e-mail cadastrado;
 *  - conferência da licença do app na Central (com 7 dias de tolerância sem internet);
 *  - lembrete semanal de cópia de segurança (baixar / restaurar) dos dados do aparelho;
 *  - menu "Minha conta": Meus apps, Suporte, Cópia de segurança, Sair.
 *  - entrar uma vez só: abre os outros apps com um passe de uso único (#ca-passe=...);
 *  - "Trazer meus dados do endereço antigo": copia os dados que ficaram no endereço antigo
 *    (aap29.github.io) para este app, pelo mesmo aparelho, sem arquivo no meio.
 *
 * Configuração (antes deste script):
 *   window.CENTRAL_CFG = { url:"https://script.google.com/macros/s/.../exec", app:"prospectarion",
 *     nome:"Prospectarion", portal:"https://marca-estrategia-tecnologia.github.io/",
 *     backup:{ prefixos:["prospectarion"], dias:7 } };
 * Sem url configurada o kit não bloqueia o app (só mostra o lembrete de backup).
 */
(function(){
"use strict";
var CFG = window.CENTRAL_CFG || {};
var MODO = CFG.modo || "app";
var APPID = MODO === "portal" ? "" : (CFG.app || "");
var LS = "central." + (CFG.app || "portal") + ".";
var TOLERANCIA_OFFLINE = 7 * 864e5, RECHECAR = 6 * 36e5;
var raiz, estado = {email:"", tela:""};
var LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAAwFBMVEUAl7L8/v4AAAAAia4AeK9Wt8pzxdTM6e+94+qq2+QppbwAl7Jj5+oBaq8Al7IAqqqFzNk5q8QAk6kAl68AlrEVoLhjvc7b8PQAlrKc1uBW2eKS0d0Af38Af78A//9d5OZBrcI7xtJLyNtK0tsAVaoAf/8mtsgjfcAxmMoGW7AdssUdrMEoicQln7gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAqtMw+AAAAQHRSTlP+/wD//////////9X//7MD//8WNWn///9T////AwQB//////8DAv//////////AAAAAAAAAAAAAAAAAAAAAAAA9rUFOQAAA2VJREFUeNrNWQl2ozAMFQjMTiBsgaTN1qbtLPe/3niB2E7SvoZqZvpfCCDLH0sytqKAO+GBH1WdJ3AXkryuxs4KMJ43j+6yzmEW8nrpPm5swoXrrhKYjWQlKTThwl3m8CXky5FREm7cKoEvIqnczUT44K6AACsZGhD2VkCCSlgNLg8vEIEHmxM+P+VUhPnTswsLGgdOblyAu0zoCJMlN7kGQtTc5ISSMFlABaSooKYlrCGnJcwhoSUkpvvfwDmdmthvC3ERsz4MgrBvm6lpxyIpYY3xgKa5SRM7TiDhSDQYR84ZTKq0gZYUqhOLpCyI2mtG3yBwHPDNO2fNFax2J+Y9QknmF1JwTYlrQ993It/vjXsMncLXY+R8qrXjHXtj0BdWG1YK92gbI+bEyF0WTPxNoPVK0zEmOsNGGU9mPKEUEmQTS6CHCmBemwgsF4kwaEGkZox0baAdGkhpqD39HiHo7qORhqTFc0Mvpb3VSyP8gLA1JMajpd+wsJ/6KUKmJRGW9sCRmZG8n7BFduGJ6b6fR1iinuMxIp9Nk140z2RzfkUSgRXzewkDaIzZVEgwBX8mofFK7dAEzCIMjSBfTZRvQhjTElo+ZCSEoMU9AaF6lTu1WQQUhPxNicTy9lusCaW5Qs8kbDGG03E4nmBnvm08+DNXG+63YyowiNtphcGd2F9mEXawT7cHfxjSo/CmWqfjQgx95noIQ3p4eTmkQ9rIhStar8ObAfokYdGk2+Htl19u0x/m9l3CB3tKc7lJMTQJ05fyNfNtwhtz3Lnc9ZidO4wSYfLrq5/xERoa13xoDt+Xu7CRfSgHqSQBTjwow3ZI99qo60ykNHd1nrFc7PNOtDtLIh5mgeNZYx2/l4d0IgHrVKYgN8eumwRcwpRKx+Dn/rA/8VG0jK/Wu9v5nJ3mxZeiJr71cs1NQv9qVozW2PC9caLHAeB5fJv1+AfVtWw5n8SReUqBK7+hVtT6FqGHmDUZirM4PNGQeZlQECeUTcC/M/HlKalUVH0tS1A9WLSNhN5I6ClC0Sy6K4WJ0FOK0qrsOl7j6MEyWbWOJqPUk6bi5AjxrEuTvxImMqZvOxP/9e/RhP4HOHmJgLyIQV5mIS8EkZeq6Itp1OU++oIkecmUvqhLX3amL4zTl+7p/1yg+/vjD8/mLV2yipnrAAAAAElFTkSuQmCC";

function ls(k, v){ try{ if(v === undefined) return JSON.parse(localStorage.getItem(LS + k) || "null"); if(v === null) localStorage.removeItem(LS + k); else localStorage.setItem(LS + k, JSON.stringify(v)); }catch(e){ return null; } }
function api(dados){
  if(!CFG.url) return Promise.reject(new Error("sem_url"));
  return fetch(CFG.url, {method:"POST", headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify(dados)})
    .then(function(r){ return r.json(); });
}
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }

/* ---------- estilos (isolados em #ca-raiz) ---------- */
var CSS = "#ca-raiz{position:fixed;inset:0;z-index:2147483000;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(10,22,40,.92);font:15px/1.45 Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0A1628;overflow:auto}" +
"#ca-raiz.ca-on{display:flex}#ca-raiz *{box-sizing:border-box}" +
"#ca-raiz .ca-caixa{background:#fff;border-radius:16px;width:100%;max-width:400px;padding:24px 22px;box-shadow:0 20px 60px rgba(0,0,0,.4);margin:auto}" +
"#ca-raiz .ca-topo{display:flex;align-items:center;gap:10px;margin:0 0 10px}#ca-raiz .ca-topo img{width:40px;height:40px;border-radius:11px;flex:0 0 40px}#ca-raiz .ca-topo .ca-marca{margin:0}" +
"#ca-raiz .ca-marca{font-size:11px;letter-spacing:1.2px;font-weight:700;color:#004AAD;text-transform:uppercase;margin:0 0 4px}" +
"#ca-raiz h2{margin:0 0 6px;font-size:22px;line-height:1.2;color:#0A1628}#ca-raiz p{margin:6px 0 12px;color:#334}" +
"#ca-raiz label{display:block;font-size:13px;font-weight:600;margin:10px 0 4px;color:#1B3A6B}" +
"#ca-raiz input[type=email],#ca-raiz input[type=password],#ca-raiz input[type=text],#ca-raiz input[type=tel],#ca-raiz textarea{width:100%;padding:12px;border:1.5px solid #C8D0DC;border-radius:10px;font:inherit;background:#fff;color:#0A1628}" +
"#ca-raiz input:focus,#ca-raiz textarea:focus{outline:none;border-color:#1B3A6B;box-shadow:0 0 0 3px rgba(27,58,107,.15)}" +
"#ca-raiz .ca-codigo{letter-spacing:10px;text-align:center;font-size:24px;font-weight:700}" +
"#ca-raiz button{font:inherit;cursor:pointer;border-radius:10px;border:0;padding:12px 14px;width:100%;margin-top:14px;font-weight:700}" +
"#ca-raiz .ca-pri{background:#0A1628;color:#fff}#ca-raiz .ca-pri:disabled{opacity:.6;cursor:wait}" +
"#ca-raiz .ca-sec{background:#F1F4F9;color:#1B3A6B;margin-top:8px}" +
"#ca-raiz .ca-link{background:none;color:#1B3A6B;text-decoration:underline;padding:6px;margin-top:6px;font-weight:600}" +
"#ca-raiz .ca-msg{border-radius:10px;padding:10px 12px;margin:12px 0 0;font-size:14px;display:none}" +
"#ca-raiz .ca-msg.ca-erro{display:block;background:#FDECEC;color:#8A1C1C}#ca-raiz .ca-msg.ca-ok{display:block;background:#E8F5EC;color:#1E5B32}" +
"#ca-raiz .ca-msg.ca-info{display:block;background:#E8FAFB;color:#00404C}" +
"#ca-raiz .ca-check{display:flex;gap:8px;align-items:flex-start;font-weight:400;color:#334}#ca-raiz .ca-check input{margin-top:3px;width:18px;height:18px}" +
"#ca-raiz .ca-ver{position:relative}#ca-raiz .ca-ver button{position:absolute;right:6px;top:6px;width:auto;margin:0;padding:6px 8px;background:#F1F4F9;color:#1B3A6B;font-size:12px}" +
"#ca-raiz .ca-pe{font-size:12px;color:#667;margin-top:14px;text-align:center}#ca-raiz .ca-pe a{color:#1B3A6B}" +
"#ca-raiz .ca-forca{height:4px;border-radius:2px;background:#E5E9F0;margin-top:6px;overflow:hidden}#ca-raiz .ca-forca i{display:block;height:100%;width:0;background:#0097B2;transition:width .2s}" +
"#ca-botao{position:fixed;left:12px;bottom:12px;z-index:2147482999;border:0;border-radius:999px;padding:9px 13px;background:#0097B2;color:#fff;font:600 13px Inter,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:pointer;opacity:.9}" +
"#ca-faixa{position:fixed;left:12px;right:12px;bottom:58px;z-index:2147482998;max-width:520px;margin:auto;background:#E8FAFB;color:#00404C;border:1px solid #5CE1E6;border-radius:12px;padding:12px 14px;font:14px/1.4 Inter,system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.2)}" +
"#ca-faixa button{font:600 13px Inter,system-ui,sans-serif;border:0;border-radius:8px;padding:8px 10px;margin:8px 8px 0 0;cursor:pointer;background:#0A1628;color:#fff}#ca-faixa .ca-depois{background:transparent;color:#00404C;text-decoration:underline}" +
"@media print{#ca-raiz,#ca-botao,#ca-faixa{display:none!important}}";

function montar(){
  if(raiz) return;
  var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  raiz = document.createElement("div"); raiz.id = "ca-raiz"; raiz.setAttribute("role", "dialog"); raiz.setAttribute("aria-modal", "true");
  document.body.appendChild(raiz);
}

/* ---------- telas ---------- */
function caixa(titulo, sub, corpo, rodape){
  return '<div class="ca-caixa"><div class="ca-topo"><img src="' + LOGO + '" alt="Marca &amp; Estratégia" width="40" height="40"><p class="ca-marca">' + esc(CFG.nome || "Central") + ' • Marca &amp; Estratégia Tecnologia</p></div><h2>' + titulo + '</h2>' +
    (sub ? '<p>' + sub + '</p>' : '') + corpo + '<div class="ca-msg" id="ca-msg" role="status" aria-live="polite"></div>' + (rodape || "") + '</div>';
}
function campoSenha(id, rot, auto){
  return '<label for="' + id + '">' + rot + '</label><div class="ca-ver"><input id="' + id + '" type="password" autocomplete="' + auto + '" minlength="8" maxlength="64" required><button type="button" data-ver="' + id + '" aria-label="Mostrar senha">ver</button></div>';
}
function pe(){
  var p = CFG.portal || "";
  return '<p class="ca-pe">' + (p ? '<a href="' + esc(p) + 'termos.html" target="_blank" rel="noopener">Termos de Uso</a> • <a href="' + esc(p) + 'privacidade.html" target="_blank" rel="noopener">Privacidade</a>' : '') + '</p>';
}
function mostrar(html, foco){
  montar(); raiz.innerHTML = html; raiz.classList.add("ca-on");
  raiz.querySelectorAll("[data-ver]").forEach(function(b){ b.onclick = function(){ var i = document.getElementById(b.getAttribute("data-ver")); var v = i.type === "password"; i.type = v ? "text" : "password"; b.textContent = v ? "ocultar" : "ver"; }; });
  var f = raiz.querySelector(foco || "input"); if(f) setTimeout(function(){ f.focus(); }, 30);
}
function fechar(){ if(raiz){ raiz.classList.remove("ca-on"); raiz.innerHTML = ""; } }
function msg(tipo, texto){ var m = document.getElementById("ca-msg"); if(m){ m.className = "ca-msg ca-" + tipo; m.textContent = texto; } }
function ocupado(btn, sim){ if(btn){ btn.disabled = sim; if(sim){ btn.dataset.t = btn.textContent; btn.textContent = "Aguarde…"; } else if(btn.dataset.t) btn.textContent = btn.dataset.t; } }
function v(id){ var e = document.getElementById(id); return e ? e.value.trim() : ""; }
function senhaFraca(s){ if(s.length < 8) return "A senha precisa ter pelo menos 8 caracteres."; if(!/[A-Za-zÀ-ú]/.test(s) || !/\d/.test(s)) return "Use letras e números na senha."; return ""; }
function ligarForca(id){
  var i = document.getElementById(id), barra = document.getElementById(id + "-f"); if(!i || !barra) return;
  i.addEventListener("input", function(){ var s = i.value, p = 0; if(s.length >= 8) p++; if(s.length >= 12) p++; if(/\d/.test(s) && /[A-Za-z]/.test(s)) p++; if(/[^A-Za-z0-9]/.test(s)) p++; barra.style.width = (p * 25) + "%"; });
}
function falhaRede(btn){ ocupado(btn, false); msg("erro", "Sem conexão com a Central agora. Confira a internet e tente de novo."); }

function telaEntrar(aviso){
  estado.tela = "entrar";
  mostrar(caixa("Entrar", "Use o e-mail e a senha da sua conta.",
    '<form id="ca-f"><label for="ca-email">E-mail</label><input id="ca-email" type="email" autocomplete="email" required value="' + esc(estado.email) + '">' +
    campoSenha("ca-senha", "Senha", "current-password") + '<button class="ca-pri" id="ca-b">Entrar</button></form>' +
    '<button class="ca-link" id="ca-esq">Esqueci a senha</button><button class="ca-sec" id="ca-novo">Criar conta</button>', pe()), estado.email ? "#ca-senha" : "#ca-email");
  if(aviso) msg(aviso[0], aviso[1]);
  document.getElementById("ca-esq").onclick = function(){ estado.email = v("ca-email"); telaEsqueci(); };
  document.getElementById("ca-novo").onclick = function(){ estado.email = v("ca-email"); telaCadastro(); };
  document.getElementById("ca-f").onsubmit = function(e){
    e.preventDefault(); var b = document.getElementById("ca-b"); estado.email = v("ca-email").toLowerCase();
    if(!estado.email || !v("ca-senha")) return msg("erro", "Informe e-mail e senha.");
    ocupado(b, true);
    api({acao:"entrar", email:estado.email, senha:document.getElementById("ca-senha").value, app:APPID}).then(function(r){
      ocupado(b, false);
      if(r.ok) return entrou(r);
      if(r.erro === "nao_confirmado") return telaCodigo("confirmar", r.mensagem);
      msg("erro", r.mensagem || "Não foi possível entrar.");
    }).catch(function(){ falhaRede(b); });
  };
}

function telaCadastro(){
  estado.tela = "cadastro";
  var p = CFG.portal || "";
  mostrar(caixa("Criar conta", "Uma conta só para todos os apps da Marca &amp; Estratégia Tecnologia.",
    '<form id="ca-f"><label for="ca-nome">Nome e sobrenome</label><input id="ca-nome" type="text" autocomplete="name" required maxlength="120">' +
    '<label for="ca-email">E-mail</label><input id="ca-email" type="email" autocomplete="email" required value="' + esc(estado.email) + '">' +
    '<label for="ca-whats">WhatsApp com DDD <span style="font-weight:400">(opcional)</span></label><input id="ca-whats" type="tel" autocomplete="tel" maxlength="20">' +
    campoSenha("ca-senha", "Crie uma senha (8+ caracteres, letras e números)", "new-password") + '<div class="ca-forca"><i id="ca-senha-f"></i></div>' +
    campoSenha("ca-senha2", "Repita a senha", "new-password") +
    '<label class="ca-check"><input type="checkbox" id="ca-aceite" required> <span>Li e aceito os ' + (p ? '<a href="' + esc(p) + 'termos.html" target="_blank" rel="noopener">Termos de Uso</a> e a <a href="' + esc(p) + 'privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a>' : 'Termos de Uso e a Política de Privacidade') + '.</span></label>' +
    '<button class="ca-pri" id="ca-b">Criar conta</button></form><button class="ca-link" id="ca-voltar">Já tenho conta</button>'), "#ca-nome");
  ligarForca("ca-senha");
  document.getElementById("ca-voltar").onclick = function(){ estado.email = v("ca-email"); telaEntrar(); };
  document.getElementById("ca-f").onsubmit = function(e){
    e.preventDefault(); var b = document.getElementById("ca-b");
    var s1 = document.getElementById("ca-senha").value, s2 = document.getElementById("ca-senha2").value;
    if(v("ca-nome").split(/\s+/).length < 2) return msg("erro", "Informe nome e sobrenome.");
    var f = senhaFraca(s1); if(f) return msg("erro", f);
    if(s1 !== s2) return msg("erro", "As duas senhas não são iguais.");
    if(!document.getElementById("ca-aceite").checked) return msg("erro", "Aceite os Termos e a Política de Privacidade para continuar.");
    estado.email = v("ca-email").toLowerCase(); ocupado(b, true);
    api({acao:"cadastrar", app:APPID, nome:v("ca-nome"), email:estado.email, whatsapp:v("ca-whats"), senha:s1,
      consentimento:"Termos e Privacidade v1 aceitos em " + (CFG.nome || "Central"), origem:CFG.app}).then(function(r){
      ocupado(b, false);
      if(r.ok && r.confirmar) return telaCodigo("confirmar", r.mensagem);
      if(r.erro === "email_existe") return telaEntrar(["info", r.mensagem]);
      msg("erro", r.mensagem || "Não foi possível criar a conta.");
    }).catch(function(){ falhaRede(b); });
  };
}

function telaCodigo(tipo, aviso){
  estado.tela = "codigo";
  var senha = tipo === "senha";
  mostrar(caixa(senha ? "Criar nova senha" : "Confirme seu e-mail",
    "Enviamos um código de 6 dígitos para <strong>" + esc(estado.email) + "</strong>. Confira também a caixa de spam.",
    '<form id="ca-f"><label for="ca-cod">Código</label><input id="ca-cod" class="ca-codigo" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\\d{6}" required>' +
    (senha ? campoSenha("ca-senha", "Nova senha (8+ caracteres, letras e números)", "new-password") + '<div class="ca-forca"><i id="ca-senha-f"></i></div>' + campoSenha("ca-senha2", "Repita a nova senha", "new-password") : '') +
    '<button class="ca-pri" id="ca-b">' + (senha ? "Salvar nova senha" : "Confirmar") + '</button></form>' +
    '<button class="ca-link" id="ca-reenv">Reenviar código</button><button class="ca-link" id="ca-voltar">Voltar</button>'), "#ca-cod");
  if(aviso) msg("info", aviso);
  if(senha) ligarForca("ca-senha");
  document.getElementById("ca-voltar").onclick = function(){ telaEntrar(); };
  document.getElementById("ca-reenv").onclick = function(){
    api({acao:"reenviarCodigo", email:estado.email, tipo:tipo}).then(function(r){ msg(r.ok ? "ok" : "erro", r.mensagem || "Código reenviado."); }).catch(function(){ msg("erro", "Sem conexão agora."); });
  };
  document.getElementById("ca-f").onsubmit = function(e){
    e.preventDefault(); var b = document.getElementById("ca-b"), cod = v("ca-cod").replace(/\D/g, "");
    if(cod.length !== 6) return msg("erro", "Digite os 6 números do código.");
    var dados = {acao:senha ? "redefinirSenha" : "confirmar", email:estado.email, codigo:cod, app:APPID};
    if(senha){
      var s1 = document.getElementById("ca-senha").value, s2 = document.getElementById("ca-senha2").value;
      var f = senhaFraca(s1); if(f) return msg("erro", f);
      if(s1 !== s2) return msg("erro", "As duas senhas não são iguais.");
      dados.novaSenha = s1;
    }
    ocupado(b, true);
    api(dados).then(function(r){ ocupado(b, false); if(r.ok) return entrou(r); msg("erro", r.mensagem || "Código inválido."); }).catch(function(){ falhaRede(b); });
  };
}

function telaEsqueci(){
  estado.tela = "esqueci";
  mostrar(caixa("Esqueci a senha", "Informe o e-mail da sua conta. Vamos enviar um código para você criar uma nova senha.",
    '<form id="ca-f"><label for="ca-email">E-mail cadastrado</label><input id="ca-email" type="email" autocomplete="email" required value="' + esc(estado.email) + '">' +
    '<button class="ca-pri" id="ca-b">Enviar código</button></form><button class="ca-link" id="ca-voltar">Voltar</button>'), "#ca-email");
  document.getElementById("ca-voltar").onclick = function(){ telaEntrar(); };
  document.getElementById("ca-f").onsubmit = function(e){
    e.preventDefault(); var b = document.getElementById("ca-b"); estado.email = v("ca-email").toLowerCase();
    if(!estado.email) return msg("erro", "Informe o e-mail.");
    ocupado(b, true);
    api({acao:"esqueciSenha", email:estado.email}).then(function(r){ ocupado(b, false); if(r.ok) return telaCodigo("senha", r.mensagem); msg("erro", r.mensagem); }).catch(function(){ falhaRede(b); });
  };
}

function telaSemAcesso(l){
  estado.tela = "sem_acesso";
  var portal = CFG.portal ? '<a href="' + esc(CFG.portal) + '#apps" style="display:block;text-align:center;margin-top:12px;color:#1B3A6B;font-weight:700">Ver planos e meus apps</a>' : '';
  mostrar(caixa(l.status === "vencido" ? "Acesso vencido" : "Acesso ainda não liberado", esc(l.mensagem || ""),
    '<button class="ca-pri" id="ca-ped">Pedir liberação</button>' + portal + '<button class="ca-sec" id="ca-sair">Entrar com outra conta</button>'));
  document.getElementById("ca-ped").onclick = function(){
    var b = this; ocupado(b, true);
    api({acao:"pedirAcesso", token:ls("token"), app:APPID}).then(function(r){ ocupado(b, false); msg(r.ok ? "ok" : "erro", r.mensagem); if(r.licenca && r.licenca.liberado) liberar(r); }).catch(function(){ falhaRede(b); });
  };
  document.getElementById("ca-sair").onclick = sair;
}

/* ---------- sessão e licença ---------- */
function entrou(r){
  ls("token", r.token); ls("conta", r.conta);
  if(MODO === "portal"){ fechar(); document.dispatchEvent(new CustomEvent("central:entrou", {detail:r})); return; }
  conferir(true);
}
function liberar(r){
  ls("ok", {quando:Date.now(), licenca:r.licenca || null}); fechar(); botao();
  document.dispatchEvent(new CustomEvent("central:liberado", {detail:r}));
}
function conferir(forcar){
  var t = ls("token");
  if(!t) return telaEntrar();
  var ultimo = ls("ok");
  if(!forcar && ultimo && Date.now() - ultimo.quando < RECHECAR){ botao(); return; }
  api({acao:"acesso", token:t, app:APPID}).then(function(r){
    if(!r.ok){ ls("token", null); ls("ok", null); return telaEntrar(["info", r.mensagem || "Entre de novo."]); }
    if(r.conta) ls("conta", r.conta);
    if(r.liberado) return liberar(r);
    ls("ok", null); telaSemAcesso(r.licenca || {});
  }).catch(function(){
    if(ultimo && Date.now() - ultimo.quando < TOLERANCIA_OFFLINE){ botao(); return; }
    telaEntrar(["erro", "Sem internet para conferir seu acesso. Conecte-se e tente de novo."]);
  });
}
function sair(){
  var t = ls("token"); if(t) api({acao:"sair", token:t}).catch(function(){});
  ls("token", null); ls("ok", null); ls("conta", null);
  var b = document.getElementById("ca-botao"); if(b) b.remove();
  if(MODO === "portal"){ document.dispatchEvent(new CustomEvent("central:saiu")); return; }
  telaEntrar();
}

/* ---------- menu Minha conta ---------- */
function botao(){
  if(MODO === "portal" || document.getElementById("ca-botao")) return;
  var b = document.createElement("button"); b.id = "ca-botao"; b.type = "button"; b.textContent = "Minha conta"; b.onclick = menu;
  document.body.appendChild(b);
}
function menu(){
  var c = ls("conta") || {};
  var portal = '<div id="ca-apps" style="margin-top:6px"><small style="color:#667">Carregando seus apps…</small></div>';
  mostrar(caixa("Minha conta", esc(c.nome || "") + (c.email ? "<br><small>" + esc(c.email) + "</small>" : ""),
    portal + '<button class="ca-sec" id="ca-sup">Pedir suporte</button>' + (CFG.backup ? '<button class="ca-sec" id="ca-bk">Cópia de segurança</button>' : '') + (CFG.ponte ? '<button class="ca-sec" id="ca-ponte">Trazer meus dados do endereço antigo</button>' : '') +
    '<button class="ca-sec" id="ca-sair">Sair</button><button class="ca-link" id="ca-fechar">Fechar</button>', pe()));
  document.getElementById("ca-fechar").onclick = fechar;
  document.getElementById("ca-sair").onclick = sair;
  document.getElementById("ca-sup").onclick = telaSuporte;
  if(CFG.backup) document.getElementById("ca-bk").onclick = function(){ fechar(); faixaBackup(true); };
  if(CFG.ponte) document.getElementById("ca-ponte").onclick = trazerDados;
  listarApps(document.getElementById("ca-apps"));
}
function listarApps(caixaApps){
  if(!caixaApps) return;
  api({acao:"meusApps", token:ls("token")}).then(function(r){
    var outros = (r.apps || []).filter(function(a){ return a.url && a.app !== APPID; });
    if(!r.ok || !outros.length){ caixaApps.innerHTML = CFG.portal ? '<a class="ca-sec" style="display:block;text-align:center;text-decoration:none;padding:12px;border-radius:10px" href="' + esc(CFG.portal) + '" target="_blank" rel="noopener">Ver todos os apps</a>' : ""; return; }
    caixaApps.innerHTML = '<small style="color:#667;font-weight:600">Abrir outro app (sem digitar a senha de novo)</small>' + outros.map(function(a){
      return '<button class="ca-sec" data-app="' + esc(a.app) + '" data-url="' + esc(a.url) + '"' + (a.liberado ? '' : ' style="opacity:.7"') + '>' + esc(a.nome) + (a.liberado ? '' : ' • ' + esc(a.status)) + '</button>';
    }).join("");
    [].forEach.call(caixaApps.querySelectorAll("button[data-app]"), function(b){ b.onclick = function(){ abrirApp(b.dataset.url, b.dataset.app); }; });
  }).catch(function(){ caixaApps.innerHTML = ""; });
}

/* ---------- entrar uma vez só: passe de uso único para abrir outro app ---------- */
function abrirApp(url, app){
  var janela = window.open("about:blank", "_blank");
  var ir = function(destino){ if(janela){ try{ janela.opener = null; }catch(e){} janela.location.href = destino; } else location.href = destino; };
  var t = ls("token");
  if(!t || !CFG.url) return ir(url);
  api({acao:"passe", token:t, app:app}).then(function(r){
    ir(r.ok && r.passe ? url.split("#")[0] + "#ca-passe=" + encodeURIComponent(r.passe) : url);
  }).catch(function(){ ir(url); });
}
function lerPasse(){
  var m = String(location.hash || "").match(/ca-passe=([A-Za-z0-9%]+)/);
  if(!m) return "";
  try{ history.replaceState(null, "", location.pathname + location.search); }catch(e){ location.hash = ""; }
  return decodeURIComponent(m[1]);
}

/* ---------- trazer os dados do endereço antigo (mesmo aparelho) ----------
 * Abre a página-ponte do endereço antigo numa janela; ela lê os dados daquele endereço
 * e manda só para este app (origem conferida dos dois lados). */
function trazerDados(){
  if(!CFG.ponte) return;
  if(!confirmar("Trazer os dados que ficaram no endereço antigo deste app, neste aparelho?\n\nOs dados atuais deste app neste aparelho serão substituídos pelos do endereço antigo.")) return;
  var origemPonte = new URL(CFG.ponte.url).origin;
  var w = window.open(CFG.ponte.url + "?app=" + encodeURIComponent(CFG.ponte.app) + "&para=" + encodeURIComponent(location.origin), "ca-ponte", "width=420,height=520");
  if(!w){ alert("O navegador bloqueou a janela. Permita pop-ups para este site e tente de novo."); return; }
  var tempo = setTimeout(function(){ window.removeEventListener("message", ouvir); }, 120000);
  function ouvir(e){
    if(e.origin !== origemPonte || !e.data || e.data.tipo !== "ponte-dados" || e.data.app !== CFG.ponte.app) return;
    window.removeEventListener("message", ouvir); clearTimeout(tempo);
    gravarDadosPonte(e.data).then(function(n){
      try{ w.postMessage({tipo:"ponte-ok", n:n}, origemPonte); }catch(x){}
      alert(n ? "Pronto! " + n + " itens trazidos do endereço antigo. O app vai recarregar." : "Não encontrei dados deste app no endereço antigo neste aparelho. Se você usava em outro celular ou computador, faça isto lá.");
      if(n) location.reload();
    }).catch(function(err){ alert("Não consegui gravar os dados: " + (err && err.message || err)); });
  }
  window.addEventListener("message", ouvir);
}
function gravarDadosPonte(d){
  var n = 0, pref = (CFG.ponte.prefixos || []);
  var trazidos = {};
  Object.keys(d.ls || {}).forEach(function(k){ if(pref.some(function(p){ return k.indexOf(p) === 0; })){ localStorage.setItem(k, d.ls[k]); trazidos[k] = d.ls[k]; n++; } });
  // o app pode salvar o estado atual ao recarregar (pagehide): regrava o que veio por último
  var regravar = function(){ Object.keys(trazidos).forEach(function(k){ try{ localStorage.setItem(k, trazidos[k]); }catch(e){} }); };
  window.addEventListener("pagehide", regravar); window.addEventListener("beforeunload", regravar);
  var bancos = (d.idb || []).filter(function(b){ return (CFG.ponte.idb || []).indexOf(b.nome) >= 0; });
  return bancos.reduce(function(prom, b){ return prom.then(function(){ return gravarBanco(b).then(function(q){ n += q; }); }); }, Promise.resolve()).then(function(){ return n; });
}
function gravarBanco(b){
  return new Promise(function(ok, falha){
    var existe = indexedDB.databases ? indexedDB.databases().then(function(l){ return l.some(function(x){ return x.name === b.nome; }); }) : Promise.resolve(true);
    existe.then(function(sim){
      var req = sim ? indexedDB.open(b.nome) : indexedDB.open(b.nome, b.versao || 1);
      req.onupgradeneeded = function(){
        var db = req.result;
        b.lojas.forEach(function(l){
          if(db.objectStoreNames.contains(l.nome)) return;
          var os = db.createObjectStore(l.nome, {keyPath:l.keyPath || undefined, autoIncrement:!!l.autoIncrement});
          (l.indices || []).forEach(function(ix){ try{ os.createIndex(ix.nome, ix.keyPath, {unique:!!ix.unique, multiEntry:!!ix.multiEntry}); }catch(e){} });
        });
      };
      req.onerror = function(){ falha(req.error); };
      req.onsuccess = function(){
        var db = req.result, nomes = b.lojas.map(function(l){ return l.nome; }).filter(function(x){ return db.objectStoreNames.contains(x); });
        if(!nomes.length){ db.close(); return ok(0); }
        var tx = db.transaction(nomes, "readwrite"), q = 0;
        b.lojas.forEach(function(l){
          if(nomes.indexOf(l.nome) < 0) return;
          var os = tx.objectStore(l.nome); os.clear();
          l.registros.forEach(function(r){ if(os.keyPath) os.put(r.v); else os.put(r.v, r.k); q++; });
        });
        tx.oncomplete = function(){ db.close(); ok(q); };
        tx.onerror = function(){ db.close(); falha(tx.error); };
      };
    }).catch(falha);
  });
}
function telaSuporte(){
  mostrar(caixa("Pedir suporte", "Descreva o que aconteceu. A resposta chega no seu e-mail.",
    '<form id="ca-f"><label for="ca-txt">Mensagem</label><textarea id="ca-txt" rows="5" maxlength="2000" required></textarea><button class="ca-pri" id="ca-b">Enviar</button></form><button class="ca-link" id="ca-fechar">Fechar</button>'), "#ca-txt");
  document.getElementById("ca-fechar").onclick = fechar;
  document.getElementById("ca-f").onsubmit = function(e){
    e.preventDefault(); var b = document.getElementById("ca-b"); ocupado(b, true);
    api({acao:"chamado", token:ls("token"), app:APPID, tipo:"suporte", mensagem:v("ca-txt")}).then(function(r){ ocupado(b, false); msg(r.ok ? "ok" : "erro", r.mensagem); }).catch(function(){ falhaRede(b); });
  };
}

/* ---------- cópia de segurança (dados do aparelho) ---------- */
function chavesDoApp(){
  var pref = (CFG.backup && CFG.backup.prefixos) || [], out = {};
  for(var i = 0; i < localStorage.length; i++){
    var k = localStorage.key(i);
    if(pref.some(function(p){ return k.indexOf(p) === 0; })) out[k] = localStorage.getItem(k);
  }
  return out;
}
function baixarBackup(){
  var dados = {app:APPID, nome:CFG.nome, gerado:new Date().toISOString(), origem:location.origin + location.pathname, chaves:chavesDoApp()};
  var blob = new Blob([JSON.stringify(dados)], {type:"application/json"});
  var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = (CFG.app || "app") + "-copia-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
  ls("backup", Date.now());
}
function restaurarBackup(){
  var i = document.createElement("input"); i.type = "file"; i.accept = ".json,application/json";
  i.onchange = function(){
    var f = i.files[0]; if(!f) return;
    f.text().then(function(t){
      var d = JSON.parse(t);
      if(!d || !d.chaves || (d.app && d.app !== CFG.app)) throw new Error("arquivo");
      var n = Object.keys(d.chaves).length;
      if(!confirmar("Restaurar " + n + " registros da cópia de " + String(d.gerado || "").slice(0, 10) + "? Os dados atuais deste aparelho serão substituídos.")) return;
      var pref = (CFG.backup && CFG.backup.prefixos) || [];
      Object.keys(d.chaves).forEach(function(k){ if(pref.some(function(p){ return k.indexOf(p) === 0; })) localStorage.setItem(k, d.chaves[k]); });
      location.reload();
    }).catch(function(){ faixaTexto("Este arquivo não é uma cópia válida deste app."); });
  };
  i.click();
}
function confirmar(t){ try{ return window.confirm(t); }catch(e){ return true; } }
function faixaTexto(t){ var f = document.getElementById("ca-faixa"); if(f) f.querySelector("span").textContent = t; }
function faixaBackup(forcar){
  if(!CFG.backup || document.getElementById("ca-faixa")) return;
  var dias = CFG.backup.dias || 7, ultimo = ls("backup"), adiado = ls("backup_adiado");
  if(!forcar){
    if(!Object.keys(chavesDoApp()).length) return;
    if(ultimo && Date.now() - ultimo < dias * 864e5) return;
    if(adiado && Date.now() - adiado < 864e5) return;
  }
  var f = document.createElement("div"); f.id = "ca-faixa"; f.setAttribute("role", "region"); f.setAttribute("aria-label", "Cópia de segurança");
  f.innerHTML = '<strong>Cópia de segurança</strong><br><span>' + (ultimo ? "Sua última cópia foi em " + new Date(ultimo).toLocaleDateString("pt-BR") + "." : "Você ainda não fez cópia dos dados deste aparelho.") +
    " Os dados ficam só neste aparelho: baixe uma cópia e guarde no Drive ou no e-mail.</span><br>" +
    '<button type="button" id="ca-bk-baixar">Baixar cópia agora</button><button type="button" id="ca-bk-rest">Restaurar cópia</button><button type="button" class="ca-depois" id="ca-bk-dep">Lembrar amanhã</button>';
  document.body.appendChild(f);
  document.getElementById("ca-bk-baixar").onclick = function(){ baixarBackup(); f.remove(); };
  document.getElementById("ca-bk-rest").onclick = restaurarBackup;
  document.getElementById("ca-bk-dep").onclick = function(){ ls("backup_adiado", Date.now()); f.remove(); };
}

/* ---------- início ---------- */
window.CentralAcesso = {
  api: function(d){ if(ls("token") && !d.token) d.token = ls("token"); return api(d); },
  entrar: telaEntrar, cadastrar: telaCadastro, esqueci: telaEsqueci, sair: sair, fechar: fechar,
  conta: function(){ return ls("conta"); }, token: function(){ return ls("token"); },
  baixarBackup: baixarBackup, restaurarBackup: restaurarBackup, configurado: !!CFG.url, versao: "1.1.0", abrirApp: abrirApp, trazerDados: trazerDados
};
function iniciar(){
  var passe = CFG.url ? lerPasse() : "";
  if(passe){
    api({acao:"usarPasse", passe:passe, app:APPID}).then(function(r){
      if(r.ok && r.token){ ls("ok", null); entrou(r); if(MODO !== "portal") setTimeout(function(){ faixaBackup(false); }, 4000); }
      else if(MODO !== "portal") conferir(false);
    }).catch(function(){ if(MODO !== "portal") conferir(false); });
    return;
  }
  if(MODO === "portal") return;
  setTimeout(function(){ faixaBackup(false); }, 4000);
  if(!CFG.url) return; // Central ainda não implantada: o app segue funcionando como antes
  conferir(false);
}
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
})();
