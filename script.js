

/* === CONFIG BACKEND === */
const API_URL = "https://slot-backend-lsi6.onrender.com"; 
const USER_ID = Telegram?.WebApp?.initDataUnsafe?.user?.id || "demo";

/* === NAVIGAZIONE === */
function showPage(page){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.getElementById("page-"+page).classList.add("active");
}

/* === STATO === */
let money=100, stamina=100;

/* === BACKEND === */
async function loadProgress(){
  try{
    const res=await fetch(`${API_URL}/user/${USER_ID}`);
    const data=await res.json();
    money=data.money; stamina=data.stamina;
    updateUI();
  }catch(e){console.error("Errore load",e);}
}
async function saveProgress(){
  try{
    await fetch(`${API_URL}/user/${USER_ID}`,{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({money,stamina})
    });
  }catch(e){console.error("Errore save",e);}
}
function updateUI(){
  document.getElementById("money").textContent=money;
  document.getElementById("stamina").textContent=stamina;
  document.getElementById("moneyBJ").textContent=money;
  document.getElementById("staminaBJ").textContent=stamina;
}

/* === SLOT === */
const SYMBOLS=["🍒","🍋","🔔","⭐️","💎","7️⃣"], COPIES=24, REEL_HEIGHT=120;
const reels=[...document.querySelectorAll('.reel')], strips=reels.map(r=>r.querySelector('.strip'));
const spinBtn=document.getElementById("spinBtn"), resultEl=document.getElementById("result");
function buildStrips(){strips.forEach(strip=>{strip.innerHTML="";for(let i=0;i<COPIES;i++){const s=document.createElement("div");s.className="sym";s.textContent=SYMBOLS[i%SYMBOLS.length];strip.appendChild(s);}});} buildStrips();
const AC=new (window.AudioContext||window.webkitAudioContext)(); function tone(f,d=0.1){const o=AC.createOscillator(),g=AC.createGain();o.connect(g).connect(AC.destination);o.frequency.value=f;o.type='sine';g.gain.setValueAtTime(0.2,AC.currentTime);g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+d);o.start();o.stop(AC.currentTime+d);}
function spinSound(){tone(220,0.08);} function tickSound(){tone(880,0.05);} function winSound(){[660,880,990].forEach((f,i)=>setTimeout(()=>tone(f,0.08),i*120));}
const state=strips.map(()=>({y:0,speed:0,spinning:false,target:0,decel:false})); let raf; 
function loop(){state.forEach((rs,i)=>{if(!rs.spinning)return;rs.y+=rs.speed;if(rs.decel){rs.speed=Math.max(5,rs.speed*0.95);const mod=rs.y%(SYMBOLS.length*REEL_HEIGHT);const idx=Math.round(mod/REEL_HEIGHT)%SYMBOLS.length;if(rs.speed<=6&&idx===rs.target){rs.spinning=false;rs.speed=0;rs.y=Math.round(rs.y/REEL_HEIGHT)*REEL_HEIGHT;stopReel(i);}}strips[i].style.transform=`translateY(${-rs.y%(COPIES*REEL_HEIGHT)}px)`;});if(state.some(r=>r.spinning))raf=requestAnimationFrame(loop);}
let stopped=0; function stopReel(i){tickSound();stopped++;if(stopped===state.length){stopped=0;spinBtn.disabled=false;checkWin();}}
spinBtn.onclick=()=>{if(AC.state==="suspended")AC.resume();if(state.some(r=>r.spinning))return;if(stamina<=0){resultEl.textContent="⚡ Stamina finita!";return;}spinSound();spinBtn.disabled=true;stamina=Math.max(0,stamina-5);updateUI();state.forEach((rs,i)=>{rs.spinning=true;rs.decel=false;rs.speed=25+i*2;rs.target=Math.floor(Math.random()*SYMBOLS.length);setTimeout(()=>{rs.decel=true;},800+i*500);});loop();};
function centerIndex(rs){const mod=(rs.y%(SYMBOLS.length*REEL_HEIGHT));return Math.round(mod/REEL_HEIGHT)%SYMBOLS.length;}
function checkWin(){const idx=state.map(centerIndex);const win=idx.every(i=>i===idx[0]);if(win){money+=20;winSound();resultEl.textContent="🎉 Vincita! +20";}else{money-=5;resultEl.textContent="😢 Riprova...";}updateUI();saveProgress();}

/* === BLACKJACK === */
const suits=["H","D","C","S"], values=["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
let deck=[],playerHand=[],dealerHand=[];
const playerCardsEl=document.getElementById("player-cards"),dealerCardsEl=document.getElementById("dealer-cards"),playerTotalEl=document.getElementById("player-total"),dealerTotalEl=document.getElementById("dealer-total"),resultBJ=document.getElementById("bj-result");
function createDeck(){deck=[];for(let s of suits){for(let v of values){deck.push(v+s);}}deck.sort(()=>Math.random()-0.5);}
function cardValue(card){const v=card.slice(0,-1);if(v==="A")return 11;if(["K","Q","J"].includes(v))return 10;return parseInt(v);}
function handValue(hand){let val=0,aces=0;for(let c of hand){const v=cardValue(c);val+=v;if(c.startsWith("A"))aces++;}while(val>21&&aces>0){val-=10;aces--;}return val;}
function renderHand(el,hand){el.innerHTML="";hand.forEach((c,i)=>{const img=document.createElement("img");img.src=`https://deckofcardsapi.com/static/img/${c}.png`;setTimeout(()=>img.classList.add("dealt"),i*200);el.appendChild(img);});}
function startGame(){createDeck();playerHand=[];dealerHand=[];resultBJ.textContent="";playerHand.push(deck.pop(),deck.pop());dealerHand.push(deck.pop(),deck.pop());renderHand(playerCardsEl,playerHand);renderHand(dealerCardsEl,dealerHand);playerTotalEl.textContent=handValue(playerHand);dealerTotalEl.textContent=handValue(dealerHand);document.getElementById("hitBtn").disabled=false;document.getElementById("standBtn").disabled=false;}
function endGame(msg){resultBJ.textContent=msg;document.getElementById("hitBtn").disabled=true;document.getElementById("standBtn").disabled=true;if(msg.includes("vinto")){money+=15;}if(msg.includes("perso")){money-=10;}updateUI();saveProgress();setTimeout(startGame,3000);}
document.getElementById("hitBtn").onclick=()=>{playerHand.push(deck.pop());renderHand(playerCardsEl,playerHand);playerTotalEl.textContent=handValue(playerHand);if(handValue(playerHand)>21){endGame("😢 Sballato!");}};
document.getElementById("standBtn").onclick=()=>{let dealerVal=handValue(dealerHand);while(dealerVal<17){dealerHand.push(deck.pop());renderHand(dealerCardsEl,dealerHand);dealerVal=handValue(dealerHand);}playerTotalEl.textContent=handValue(playerHand);dealerTotalEl.textContent=dealerVal;const pv=handValue(playerHand),dv=dealerVal;if(dv>21||pv>dv){endGame("🎉 Hai vinto!");}else if(pv<dv){endGame("😢 Hai perso...");}else{endGame("🤝 Pareggio");}};
startGame();

/* === CLASSIFICA === */
async function loadLeaderboard(){
  try{
    const res=await fetch(`${API_URL}/leaderboard`);
    const board=await res.json();
    const list=document.getElementById("leaderboard-list");
    list.innerHTML="";
    board.forEach((row,i)=>{
      const li=document.createElement("li");
      li.innerHTML=`<span>#${i+1}</span> ${row.user} <span>${row.money} 💰</span>`;
      list.appendChild(li);
    });
  }catch(e){console.error("Errore leaderboard",e);}
}
document.querySelector('a[onclick="showPage(\'classifica\')"]').addEventListener("click",loadLeaderboard);

/* === INIT === */
loadProgress();
