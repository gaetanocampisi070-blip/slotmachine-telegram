

//  sounds[s]) sounds[s].play(); }




/* =========================================================
   Mini Casino Deluxe - Tutto funzionante:
   - Salvataggi con backend Render + fallback locale
   - UI mobile fissa
   - Slot / Blackjack (carte vere) / Ruota / Gratta & Vinci
   - Missioni giornaliere, bonus login, jackpot progressivo
   - Classifica
   ========================================================= */

const API_BASE = "https://slot-backend-lsi6.onrender.com"; // <-- backend fornito
const STORAGE_KEY = "mini-casino-state-v1";

// ====== Player/State ======
const tgUser = (() => {
  try {
    const w = window?.Telegram?.WebApp?.initDataUnsafe?.user;
    if (w) return { id: String(w.id), name: w.username || (w.first_name + (w.last_name?(" "+w.last_name):"")) };
  } catch {}
  return null;
})();
const PLAYER_ID = tgUser?.id || ("guest-" + Math.floor(Math.random()*1e6));
const PLAYER_NAME = tgUser?.name || "guest";

const defaultState = {
  playerId: PLAYER_ID,
  playerName: PLAYER_NAME,
  money: 500,
  stamina: 20,
  xp: 0,
  level: 1,
  jackpot: 1000,

  missions: {
    date: "",            // YYYY-MM-DD
    spins: 0,            // fai 15 spin
    bjHands: 0,          // gioca 6 mani
    wheel: 0,            // gira 4 volte
    scratch: 0,          // gratta 2 biglietti
    rewards: {           // riscossi?
      spins: false,
      bjHands: false,
      wheel: false,
      scratch: false
    }
  }
};

let state = { ...defaultState };

// ====== Audio ======
const SND = {
  spin: new Audio("https://actions.google.com/sounds/v1/impacts/wood_plank_flicks.ogg"),
  win: new Audio("https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg"),
  lose: new Audio("https://actions.google.com/sounds/v1/cartoon/cartoon_cowbell.ogg"),
  coin: new Audio("https://actions.google.com/sounds/v1/cartoon/wood_plank_hit.ogg"),
  level: new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg"),
  cheer: new Audio("https://actions.google.com/sounds/v1/ambiences/indoor_crowd_cheer.ogg")
};
let soundOn = true;
function play(name){ if(soundOn && SND[name]) { SND[name].currentTime=0; SND[name].play().catch(()=>{}); } }
function vibrate(ms=20){ try{ if(document.getElementById("vibrateChk")?.checked) navigator.vibrate?.(ms);}catch{} }

// ====== Utils / UI ======
function $(sel){ return document.querySelector(sel); }
function $all(sel){ return Array.from(document.querySelectorAll(sel)); }
function fmt(n){ return Number(n).toLocaleString("it-IT"); }
function todayStr(){ return new Date().toISOString().slice(0,10); }

function toast(msg, type="info"){
  const t = document.createElement("div");
  t.className = "toast " + (type==="success"?"success": type==="warn"?"warn": type==="err"?"err":"");
  t.textContent = msg;
  $("#toast-container").appendChild(t);
  setTimeout(()=> t.remove(), 3000);
}

function updateHUD(){
  $("#money").textContent = fmt(state.money);
  $("#stamina").textContent = fmt(state.stamina);
  $("#levelLabel").textContent = "Lv." + state.level;
  const pct = Math.min(99, (state.xp % 100));
  $("#xpBar").style.width = pct + "%";
  $("#jackpot").textContent = fmt(state.jackpot);
  // Blackjack HUD mirror (semplicità)
  $("#player-total")?.textContent;
  $("#dealer-total")?.textContent;
  // Imposta pulsante suono
  $("#soundToggle").textContent = soundOn ? "🔊" : "🔇";
  $("#soundChk").checked = soundOn;
}

function showPage(page){
  $all(".page").forEach(p=>p.classList.remove("active"));
  $("#page-"+page).classList.add("active");
  if (page==="classifica") loadLeaderboard();
  if (page==="missioni") renderMissions();
}
window.showPage = showPage;

// ====== Persistenza ======
async function saveToBackend(){
  try{
    await fetch(`${API_BASE}/save`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        player: state.playerName || PLAYER_NAME,
        playerId: state.playerId || PLAYER_ID,
        money: state.money,
        stamina: state.stamina,
        xp: state.xp,
        level: state.level,
        jackpot: state.jackpot,
        missions: state.missions
      })
    });
  }catch(e){
    // Silenzioso: usiamo fallback locale comunque
  }
}

async function loadFromBackend(){
  try{
    const res = await fetch(`${API_BASE}/state?playerId=${encodeURIComponent(PLAYER_ID)}`);
    if(!res.ok) throw 0;
    const data = await res.json();
    if (data && typeof data.money === "number"){
      state = { ...state, ...data };
      return true;
    }
  }catch(e){}
  return false;
}

function saveLocal(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadLocal(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw){
      const data = JSON.parse(raw);
      if(data && data.playerId === PLAYER_ID){
        state = { ...defaultState, ...data };
        return true;
      }
    }
  }catch(e){}
  return false;
}

async function saveProgress(){
  saveLocal();
  await saveToBackend();
}

async function initState(){
  // 1) prova backend
  const ok = await loadFromBackend();
  if(!ok){
    // 2) prova locale
    const ok2 = loadLocal();
    if(!ok2){
      // 3) default
      state = { ...defaultState, missions: { ...defaultState.missions, date: todayStr() } };
      saveLocal();
    }
  }
  // reset missioni se giorno nuovo
  if(state.missions.date !== todayStr()){
    state.missions = { ...defaultState.missions, date: todayStr() };
  }
  updateHUD();
}

// ====== Bonus Giornaliero ======
$("#dailyBtn").addEventListener("click", async ()=>{
  if (state.missions.date !== todayStr()){
    state.missions.date = todayStr(); // safety
  }
  const flagKey = "daily-claimed-"+todayStr()+"-"+PLAYER_ID;
  if(localStorage.getItem(flagKey)){
    toast("Bonus già riscattato oggi", "warn");
    return;
  }
  state.money += 200; state.stamina += 10; play("coin"); vibrate(30);
  toast("Bonus giornaliero +200💰 +10⚡", "success");
  localStorage.setItem(flagKey, "1");
  updateHUD(); await saveProgress();
});

// ====== Missioni ======
const missionDefs = {
  spins:   { label:"Fai 15 spin alla Slot", target:15, reward:{money:150, stamina:5, xp:20} },
  bjHands: { label:"Gioca 6 mani di Blackjack", target:6, reward:{money:120, stamina:4, xp:20} },
  wheel:   { label:"Gira la Ruota 4 volte", target:4, reward:{money:100, stamina:3, xp:15} },
  scratch: { label:"Gratta 2 biglietti", target:2, reward:{money:80, stamina:3, xp:15} }
};
function renderMissions(){
  const ul = $("#missions");
  ul.innerHTML = "";
  Object.keys(missionDefs).forEach(k=>{
    const def = missionDefs[k];
    const cur = state.missions[k] || 0;
    const done = cur >= def.target;
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="left">
        <div style="font-weight:800">${def.label}</div>
        <div class="progress"><i style="width:${Math.min(100, Math.round(cur/def.target*100))}%"></i></div>
        <small>${cur}/${def.target}</small>
      </div>
      <div class="right">
        <div><small>Ricompensa:</small> <b>+${def.reward.money}💰 +${def.reward.stamina}⚡ +${def.reward.xp}XP</b></div>
        <button class="mini-btn claim" data-k="${k}" ${done && !state.missions.rewards[k] ? "" : "disabled"}>Riscatta</button>
      </div>
    `;
    ul.appendChild(li);
  });
  $all(".claim").forEach(btn=>{
    btn.addEventListener("click", async (e)=>{
      const k = e.currentTarget.getAttribute("data-k");
      const def = missionDefs[k];
      const cur = state.missions[k] || 0;
      if (cur >= def.target && !state.missions.rewards[k]){
        state.money += def.reward.money;
        state.stamina += def.reward.stamina;
        state.xp += def.reward.xp;
        state.missions.rewards[k] = true;
        play("cheer"); vibrate(40);
        toast("Ricompensa missione riscattata!", "success");
        updateHUD(); await saveProgress(); renderMissions();
        levelUpCheck();
      }
    });
  });
}
function addMissionProgress(k, inc=1){
  state.missions[k] = (state.missions[k]||0) + inc;
}

// ====== Level Up ======
function levelUpCheck(){
  const needed = state.level*100;
  while(state.xp >= needed){
    state.xp -= needed;
    state.level += 1;
    state.money += 100;
    state.stamina += 5;
    play("level"); toast(`Level Up! Lv.${state.level} (+100💰 +5⚡)`, "success");
  }
  updateHUD();
}

// ====== Slot Machine ======
const symbols = ["🍒","🍋","🍊","🍉","⭐","💎","🔔","7️⃣"];
let autoSpin = false;

$("#autoBtn").addEventListener("click", ()=>{
  autoSpin = !autoSpin;
  $("#autoBtn").classList.toggle("ghost", !autoSpin);
  $("#autoBtn").textContent = autoSpin ? "⏹️ Stop" : "♻️ Auto";
});

$("#spinBtn").addEventListener("click", ()=> doSpin());

function fillReel(strip){
  strip.innerHTML = "";
  // 16 simboli per “spin” fluido
  for(let i=0;i<16;i++){
    const d = document.createElement("div");
    d.className = "sym";
    d.textContent = symbols[Math.floor(Math.random()*symbols.length)];
    strip.appendChild(d);
  }
}

async function doSpin(){
  if (state.stamina <= 0){ toast("Energia finita!", "warn"); play("lose"); return; }
  state.stamina--; play("spin"); vibrate(10);

  const strips = $all(".reel .strip");
  strips.forEach(fillReel);

  // animazione: fermiamo ogni rullo con offset differente
  strips.forEach((s,idx)=>{
    s.style.transform = "translateY(0)";
    const stopRow = 1 + Math.floor(Math.random()*12); // riga "visibile"
    setTimeout(()=>{ s.style.transform = `translateY(-${stopRow*120}px)`; }, 80 + idx*180);
  });

  // calcolo risultato quando il terzo rullo termina
  setTimeout(async ()=>{
    // prendi il simbolo della riga 1 (visibile) di ogni rullo
    const chosen = strips.map(s => s.children[1]?.textContent || s.children[0]?.textContent);
    let delta = -5, msg = "😢 Niente… -5💰", cls = "lose";

    const [a,b,c] = chosen;
    if(a===b && b===c){
      delta = +120; msg = "🏆 TRIPLA! +120💰"; cls="win"; play("cheer");
      state.xp += 25; state.jackpot += 200;
    }else if(a===b || b===c){
      delta = +20; msg = "🎉 Coppia! +20💰"; cls="win"; play("win");
      state.xp += 10; state.jackpot += 40;
    }else{
      play("lose"); state.jackpot += 10;
    }
    state.money += delta; $("#result").className = "result "+cls; $("#result").textContent = msg;

    addMissionProgress("spins", 1);
    levelUpCheck();
    updateHUD();
    await saveProgress();

    if(autoSpin) doSpin();
  }, 1500);
}

// ====== Blackjack ======
let deck = [];
function buildDeck(){
  const suits = ["♠","♥","♦","♣"];
  const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const d = [];
  for(const s of suits){
    for(const r of ranks){
      const v = r==="A"?11 : (["J","Q","K"].includes(r)?10:Number(r));
      d.push({suit:s, rank:r, val:v});
    }
  }
  // mescola
  for(let i=d.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
function cardEl(c){
  const div = document.createElement("div");
  div.className = "card " + ((c.suit==="♥"||c.suit==="♦")?"red":"");
  div.innerHTML = `<div class="rank">${c.rank}</div><div class="suit">${c.suit}</div>`;
  setTimeout(()=>div.classList.add("dealt"), 20);
  return div;
}
function totalVal(hand){
  let sum = 0, aces = 0;
  for(const c of hand){ sum += c.val; if(c.rank==="A") aces++; }
  while(sum>21 && aces>0){ sum -= 10; aces--; }
  return sum;
}

let player=[], dealer=[], bjInProgress=false, dealerHidden=null;

function renderBJ(){
  const pc = $("#player-cards"), dc = $("#dealer-cards");
  pc.innerHTML=""; dc.innerHTML="";
  player.forEach(c=> pc.appendChild(cardEl(c)));
  dealer.forEach((c,i)=>{
    if (i===0 && dealerHidden){ // carta coperta
      const back = document.createElement("div");
      back.className = "card";
      back.style.background = "linear-gradient(135deg,#253063,#171c3d)";
      back.innerHTML = `<div class="rank">🂠</div>`;
      setTimeout(()=>back.classList.add("dealt"), 20);
      dc.appendChild(back);
    }else{
      dc.appendChild(cardEl(c));
    }
  });
  $("#player-total").textContent = totalVal(player);
  $("#dealer-total").textContent = dealerHidden ? "?" : totalVal(dealer);
}

function bjReset(){
  deck = buildDeck(); player=[]; dealer=[]; bjInProgress=false; dealerHidden=null;
  $("#bj-result").textContent = "";
  renderBJ();
}

$("#bjDealBtn").addEventListener("click", ()=>{
  if (state.stamina<=0){ toast("Energia finita!", "warn"); return; }
  state.stamina--; play("coin"); vibrate(10);
  deck = buildDeck();
  player=[deck.pop(), deck.pop()];
  dealer=[deck.pop(), deck.pop()];
  dealerHidden = true; bjInProgress=true;
  renderBJ();
  updateHUD(); saveProgress();
});

$("#hitBtn").addEventListener("click", ()=>{
  if(!bjInProgress) return;
  player.push(deck.pop());
  renderBJ();
  const pv = totalVal(player);
  if(pv>21){
    dealerHidden=false; bjInProgress=false;
    $("#bj-result").textContent = "💥 Sballato! -10💰";
    state.money -= 10; play("lose"); addMissionProgress("bjHands",1);
    updateHUD(); saveProgress();
  }
});
$("#standBtn").addEventListener("click", ()=>{
  if(!bjInProgress) return;
  dealerHidden=false;
  // pesca dealer finché <17
  while(totalVal(dealer)<17){ dealer.push(deck.pop()); }
  const pv = totalVal(player), dv = totalVal(dealer);
  let msg="", delta=0, cls="";
  if(dv>21 || pv>dv){ msg="😎 Vittoria! +20💰"; delta=+20; cls="win"; play("win"); state.xp+=15; }
  else if(pv<dv){ msg="🥲 Banco vince! -10💰"; delta=-10; cls="lose"; play("lose"); }
  else { msg="🟰 Pareggio!"; delta=0; cls=""; }
  state.money += delta; $("#bj-result").className="result "+cls; $("#bj-result").textContent=msg;
  bjInProgress=false; addMissionProgress("bjHands",1);
  levelUpCheck(); updateHUD(); saveProgress();
});

// ====== Ruota della Fortuna ======
const wheelCanvas = $("#wheelCanvas");
const wctx = wheelCanvas.getContext("2d");
const prizes = [
  {label:"+20💰", value:20},
  {label:"+0", value:0},
  {label:"+50💰", value:50},
  {label:"-10💰", value:-10},
  {label:"+80💰", value:80},
  {label:"+30💰", value:30},
  {label:"Jackpot +200", value:200, jackpot:true},
  {label:"+10⚡", stamina:10}
];
let spinning=false, angle=0, speed=0;

function drawWheel(){
  const cx = wheelCanvas.width/2, cy = wheelCanvas.height/2, r = Math.min(cx,cy)-8;
  const seg = prizes.length;
  wctx.clearRect(0,0,wheelCanvas.width,wheelCanvas.height);
  for(let i=0;i<seg;i++){
    const start = angle + i*(2*Math.PI/seg);
    const end = start + (2*Math.PI/seg);
    wctx.beginPath();
    wctx.moveTo(cx,cy);
    wctx.arc(cx,cy,r,start,end);
    wctx.fillStyle = i%2? "#2b2f59" : "#1d224b";
    wctx.fill();
    // testo
    wctx.save();
    wctx.translate(cx,cy);
    wctx.rotate(start+(end-start)/2);
    wctx.textAlign="right"; wctx.fillStyle="#ffd166"; wctx.font="bold 16px system-ui";
    wctx.fillText(prizes[i].label, r-12, 6);
    wctx.restore();
  }
  // centro
  wctx.beginPath();
  wctx.arc(cx,cy,28,0,Math.PI*2);
  wctx.fillStyle="#ffd166"; wctx.fill();
}
drawWheel();

function animWheel(){
  if(!spinning) return;
  angle += speed;
  speed *= 0.985; // attrito
  if(speed < 0.002){
    spinning = false;
    angle = (angle % (Math.PI*2) + Math.PI*2)%(Math.PI*2);
    const seg = prizes.length;
    const idx = (seg - Math.floor((angle/(2*Math.PI))*seg) - 1 + seg)%seg; // in alto
    const prize = prizes[idx];
    resolvePrize(prize);
    return;
  }
  drawWheel();
  requestAnimationFrame(animWheel);
}

function resolvePrize(p){
  let msg=""; let cls="";
  if(p.jackpot){
    state.jackpot += 200; state.money += 50; msg = "💥 Jackpot +200 (pool) e +50💰!"; cls="win"; play("cheer");
  }else if(typeof p.value === "number"){
    state.money += p.value; msg = p.value>=0 ? `🎉 Vincita +${p.value}💰` : `💸 ${p.value}💰`; cls=p.value>=0?"win":"lose"; play(p.value>=0?"win":"lose");
  }else if(p.stamina){
    state.stamina += p.stamina; msg = `⚡ Energia +${p.stamina}`; cls="win"; play("coin");
  }
  $("#wheelResult").className="result "+cls; $("#wheelResult").textContent = msg;
  addMissionProgress("wheel",1);
  state.xp += 10; levelUpCheck(); updateHUD(); saveProgress();
}

$("#spinWheelBtn").addEventListener("click", ()=>{
  if(spinning) return;
  if(state.stamina<=0){ toast("Energia finita!", "warn"); return; }
  state.stamina--; play("spin"); vibrate(10);
  speed = 0.35 + Math.random()*0.25;
  spinning = true;
  animWheel();
  updateHUD(); saveProgress();
});

// ====== Gratta & Vinci ======
const scratch = {
  canvas: $("#scratchCanvas"),
  ctx: null,
  scratching:false,
  last:null,
  prize:0
};
scratch.ctx = scratch.canvas.getContext("2d");

function newScratch(){
  // genera premio (peso medio)
  const pool = [0,0,10,20,50,0,0,80,0,0,30];
  scratch.prize = pool[Math.floor(Math.random()*pool.length)];
  $("#scratchPrize").textContent = scratch.prize>0 ? `🎁 +${scratch.prize}💰` : "💤 Ritenta";
  // copri con strato grigio
  scratch.ctx.globalCompositeOperation = "source-over";
  scratch.ctx.fillStyle = "#9aa0b9";
  scratch.ctx.fillRect(0,0,scratch.canvas.width, scratch.canvas.height);
  scratch.ctx.fillStyle = "#b8bed3";
  for(let i=0;i<30;i++){ // pattern maculato
    scratch.ctx.beginPath();
    scratch.ctx.arc(Math.random()*scratch.canvas.width, Math.random()*scratch.canvas.height, 10+Math.random()*18, 0, Math.PI*2);
    scratch.ctx.fill();
  }
  $("#scratchResult").textContent = "Gratta oltre il 60% per scoprire il premio!";
}
newScratch();

function scratchAt(x,y){
  scratch.ctx.globalCompositeOperation = "destination-out";
  scratch.ctx.beginPath();
  scratch.ctx.arc(x, y, 16, 0, Math.PI*2);
  scratch.ctx.fill();
}

function getClearedRatio(){
  const img = scratch.ctx.getImageData(0,0,scratch.canvas.width,scratch.canvas.height).data;
  let transparent = 0;
  for(let i=3; i<img.length; i+=4){
    if(img[i]===0) transparent++;
  }
  return transparent / (img.length/4);
}

function finishScratch(){
  const ratio = getClearedRatio();
  if(ratio>=0.6){
    let msg="", cls="";
    if(scratch.prize>0){ state.money += scratch.prize; msg = `🎉 Hai vinto +${scratch.prize}💰`; cls="win"; play("win"); }
    else { msg="😅 Nessuna vincita, ritenta!"; cls=""; play("lose"); }
    $("#scratchResult").className="result "+cls; $("#scratchResult").textContent = msg;
    addMissionProgress("scratch",1);
    state.xp += 10; levelUpCheck(); updateHUD(); saveProgress();
  }else{
    $("#scratchResult").textContent = `Hai grattato il ${(ratio*100|0)}% — continua!`;
  }
}

/* Eventi mouse/touch */
function posFromEvent(e){
  const rect = scratch.canvas.getBoundingClientRect();
  const touch = e.touches?.[0];
  const cx = (touch?.clientX ?? e.clientX) - rect.left;
  const cy = (touch?.clientY ?? e.clientY) - rect.top;
  return {x: cx, y: cy};
}
function startScratch(e){ scratch.scratching=true; scratch.last=posFromEvent(e); scratchAt(scratch.last.x, scratch.last.y); e.preventDefault(); }
function moveScratch(e){ if(!scratch.scratching) return; const p = posFromEvent(e); scratchAt(p.x,p.y); e.preventDefault(); }
function endScratch(e){ if(!scratch.scratching) return; scratch.scratching=false; finishScratch(); e.preventDefault(); }

scratch.canvas.addEventListener("mousedown", startScratch, {passive:false});
scratch.canvas.addEventListener("mousemove", moveScratch, {passive:false});
scratch.canvas.addEventListener("mouseup", endScratch, {passive:false});
scratch.canvas.addEventListener("mouseleave", endScratch, {passive:false});

scratch.canvas.addEventListener("touchstart", startScratch, {passive:false});
scratch.canvas.addEventListener("touchmove", moveScratch, {passive:false});
scratch.canvas.addEventListener("touchend", endScratch, {passive:false});

$("#newScratchBtn").addEventListener("click", ()=> newScratch());

// ====== Classifica ======
async function loadLeaderboard(){
  const ul = $("#leaderboard-list");
  ul.innerHTML = "<li>Caricamento…</li>";
  try{
    const res = await fetch(`${API_BASE}/leaderboard`);
    const data = await res.json();
    ul.innerHTML = "";
    (data||[]).slice(0,50).forEach((p, i)=>{
      const li = document.createElement("li");
      li.innerHTML = `<span>${i+1}. ${p.player||p.playerName||"?"}</span> <span>${fmt(p.money??0)}💰</span>`;
      if(p.playerId===PLAYER_ID || p.player===PLAYER_NAME) li.classList.add("me");
      ul.appendChild(li);
    });
  }catch(e){
    // fallback a locale (solo me)
    ul.innerHTML = "";
    const li = document.createElement("li");
    li.className = "me";
    li.innerHTML = `<span>1. ${PLAYER_NAME}</span> <span>${fmt(state.money)}💰</span>`;
    ul.appendChild(li);
  }
}

// ====== Suoni / vibrazioni ======
$("#soundToggle").addEventListener("click", ()=>{
  soundOn = !soundOn;
  updateHUD();
});
$("#soundChk")?.addEventListener("change", e=>{ soundOn = e.target.checked; updateHUD(); });

// ====== Avvio ======
(async ()=>{
  // Attiva suoni su primo tocco (policy mobile)
  ["touchstart","click"].forEach(ev=>{
    window.addEventListener(ev, ()=>{
      Object.values(SND).forEach(a=>{ try{ a.play().then(()=>a.pause()).catch(()=>{}); }catch{} });
    }, {once:true});
  });

  await initState();
  renderMissions();
  bjReset();
  drawWheel();
})();
