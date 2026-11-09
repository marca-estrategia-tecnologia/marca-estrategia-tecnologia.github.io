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
