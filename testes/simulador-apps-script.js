/* Simulador local do Google Apps Script para testar servidor/central.gs sem Google.
 * Uso: node testes/simulador-apps-script.js [porta]
 * - POST /        → doPost (igual ao endereço /exec)
 * - GET  /__emails → últimos e-mails "enviados" (só para os testes lerem o código)
 * Nada aqui vai para produção. */
const fs = require("fs"), path = require("path"), http = require("http"), vm = require("vm"), crypto = require("crypto");

function criarSimulador(props){
  const abas = {}, emails = [];
  function Sheet(nome){
    this.nome = nome; this.rows = [];
  }
  Sheet.prototype = {
    getName(){ return this.nome; },
    appendRow(r){ this.rows.push(r.slice()); },
    setFrozenRows(){},
    getLastRow(){ return this.rows.length; },
    deleteRow(n){ this.rows.splice(n - 1, 1); },
    getDataRange(){ const s = this; return {getValues(){ return s.rows.map(r => r.slice()); }}; },
    getRange(r, c, nr, nc){
      const s = this; nr = nr || 1; nc = nc || 1;
      return {
        setValue(v){ while(s.rows.length < r) s.rows.push([]); s.rows[r-1][c-1] = v; },
        setValues(vs){ vs.forEach((linha, i) => linha.forEach((v, j) => { while(s.rows.length < r+i) s.rows.push([]); s.rows[r-1+i][c-1+j] = v; })); },
        getValues(){ const out = []; for(let i = 0; i < nr; i++){ const l = []; for(let j = 0; j < nc; j++) l.push((s.rows[r-1+i] || [])[c-1+j] ?? ""); out.push(l); } return out; }
      };
    }
  };
  const toSigned = b => Array.from(b, x => x > 127 ? x - 256 : x);
  const toBuf = v => Array.isArray(v) ? Buffer.from(v.map(x => x & 255)) : Buffer.from(String(v), "utf8");
  const ctx = {
    SpreadsheetApp:{ getActiveSpreadsheet(){ return {
      getSheetByName(n){ return abas[n] || null; },
      insertSheet(n){ return (abas[n] = new Sheet(n)); }
    }; } },
    PropertiesService:{ getScriptProperties(){ return { getProperty(k){ return props[k] ?? null; }, setProperty(k, v){ props[k] = v; }, deleteProperty(k){ delete props[k]; } }; } },
    Session:{ getEffectiveUser(){ return { getEmail(){ return "criador@teste.com"; } }; } },
    Logger:{ log(){} },
    Utilities:{
      DigestAlgorithm:{SHA_256:"sha256"}, Charset:{UTF_8:"utf8"},
      getUuid(){ return crypto.randomUUID(); },
      computeDigest(alg, v){ return toSigned(crypto.createHash("sha256").update(toBuf(v)).digest()); },
      base64Encode(b){ return toBuf(b).toString("base64"); },
      formatDate(d, tz, f){ const p = n => String(n).padStart(2, "0"); d = new Date(d);
        return f.replace("yyyy", d.getFullYear()).replace("yy", String(d.getFullYear()).slice(2)).replace("MM", p(d.getMonth()+1)).replace("dd", p(d.getDate())).replace("HH", p(d.getHours())).replace("mm", p(d.getMinutes())).replace("ss", p(d.getSeconds())); }
    },
    MailApp:{ sendEmail(o){ emails.push(Object.assign({quando:new Date().toISOString()}, o)); }, getRemainingDailyQuota(){ return 100; } },
    LockService:{ getScriptLock(){ return {waitLock(){}, releaseLock(){}}; } },
    ContentService:{ MimeType:{JSON:"json"}, createTextOutput(t){ return {setMimeType(){ return {conteudo:t}; }}; } },
    console, Date, Math, JSON, String, Number, Object, Array, RegExp, Error
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "servidor", "central.gs"), "utf8"), ctx);
  ctx.instalar();
  return {
    chamar(dados){ return JSON.parse(ctx.doPost({postData:{contents:JSON.stringify(dados)}}).conteudo); },
    emails, abas, ctx
  };
}

module.exports = {criarSimulador};

if(require.main === module){
  const porta = Number(process.argv[2] || 8787);
  const sim = criarSimulador({CRIADOR_EMAILS:"criador@teste.com", PIMENTA:"pimenta-de-teste-com-mais-de-vinte-caracteres"});
  http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if(req.method === "GET" && req.url.startsWith("/__emails")){ res.end(JSON.stringify(sim.emails)); return; }
    if(req.method === "GET"){ res.end(JSON.stringify({ok:true, simulador:true})); return; }
    let corpo = ""; req.on("data", c => corpo += c); req.on("end", () => {
      res.setHeader("Content-Type", "application/json");
      try{ res.end(JSON.stringify(sim.chamar(JSON.parse(corpo || "{}")))); }
      catch(e){ res.statusCode = 500; res.end(JSON.stringify({ok:false, erro:String(e)})); }
    });
  }).listen(porta, () => console.log("Simulador da Central em http://127.0.0.1:" + porta));
}
