/* Adaptadores: ligam a licença da Central ao plano interno de cada app.
 * Cada bloco é copiado para dentro do app pelo ferramentas/separar_apps.py.
 * Regra: a Central decide quem usa e até quando; o código de ativação local deixa de valer. */

/* @prospectarion */
(function(){
  function planoInterno(l){
    var p = String((l && l.plano) || "").toLowerCase();
    if(p === "criador" || p === "vitalicio") return "vitalicio";
    if(p === "semestral" || p === "anual" || p === "mensal") return p;
    return (l && l.vencimento) ? "anual" : "vitalicio"; // teste e liberações sem nome de plano
  }
  document.addEventListener("central:liberado", function(e){
    try{
      var l = e.detail && e.detail.licenca; if(!l || typeof APP === "undefined") return;
      APP.user.plano = planoInterno(l);
      APP.user.exp = l.vencimento || "";
      APP.user.codigo = "CENTRAL";
      if(typeof saveAll === "function") saveAll();
      var m = document.getElementById("mod-pagamento");
      if(m && m.classList.contains("ativo") && typeof pubVoltarApp === "function") pubVoltarApp();
    }catch(err){}
  });
  /* O código de ativação local foi substituído pela conta da Central */
  document.addEventListener("DOMContentLoaded", function(){
    var c = document.getElementById("pub-codigo");
    var bloco = c && c.closest("div[style*='dashed']");
    if(bloco) bloco.innerHTML = '<p style="text-align:center;font-size:13px;margin:0">🔑 O acesso agora é pela sua conta: <b>Minha conta</b>, no canto da tela.</p>';
  });
})();
/* @fim */

/* @social-imob-360 */
(function(){
  document.addEventListener("central:liberado", function(e){
    try{
      var l = e.detail && e.detail.licenca; if(!l || typeof cliLic !== "function") return;
      var L = cliLic(), p = String(l.plano || "").toLowerCase();
      L.plano = (p === "mensal" || p === "semestral" || p === "anual") ? p : (l.vencimento ? "anual" : "vitalicio");
      L.venc = l.vencimento || "";
      L.ativadoEm = new Date().toISOString(); L.origem = "central";
      if(typeof salvarCfg === "function") salvarCfg();
      if(typeof cliBloqueio === "function") cliBloqueio();
    }catch(err){}
  });
})();
/* @fim */

/* @pro-imobiliaria */
(function(){
  /* Quem entra na Central como criador (e-mails 1 a 4) não precisa do PIN interno do perfil principal:
   * a conta da Central já comprovou quem é. Para os demais, o PIN continua valendo. */
  function ehCriador(){ try{ var c = window.CentralAcesso && CentralAcesso.conta(); return !!(c && c.criador); }catch(e){ return false; } }
  function liberarDono(){
    if(!ehCriador()) return;
    try{ sessionStorage.setItem("proinnovar.ok", "1"); }catch(e){}
    if(document.getElementById("pinForm") && !sessionStorage.getItem("ca-pin-recarregou")){
      try{ sessionStorage.setItem("ca-pin-recarregou", "1"); }catch(e){}
      try{ localStorage.setItem("proinnovar.perfilAparelho", JSON.stringify("owner")); }catch(e){}
      location.reload();
    }
  }
  function avisoRegistro(){
    var f = document.getElementById("regForm");
    if(!f || document.getElementById("ca-trazer-reg") || !window.CentralAcesso || !CentralAcesso.trazerDados) return;
    var d = document.createElement("div");
    d.id = "ca-trazer-reg";
    d.style.cssText = "background:#E8FAFB;border:1px solid #5CE1E6;color:#00404C;border-radius:12px;padding:12px 14px;margin:0 0 14px;font:14px/1.45 system-ui,sans-serif";
    d.innerHTML = '<b>Já usava este app no endereço antigo?</b> Traga seus leads, seu registro e seu PIN de antes com um toque, neste aparelho.' +
      '<br><button type="button" style="margin-top:8px;border:0;border-radius:10px;padding:10px 14px;background:#0097B2;color:#fff;font-weight:700;cursor:pointer">Trazer meus dados do endereço antigo</button>';
    d.querySelector("button").onclick = function(){ CentralAcesso.trazerDados(); };
    f.parentNode.insertBefore(d, f);
  }
  document.addEventListener("central:liberado", function(){ liberarDono(); avisoRegistro(); });
  document.addEventListener("DOMContentLoaded", function(){ setTimeout(function(){ liberarDono(); avisoRegistro(); }, 400); });
  new MutationObserver(function(){ avisoRegistro(); if(document.getElementById("pinForm")) liberarDono(); }).observe(document.documentElement, {childList:true, subtree:true});
})();
/* @fim */
