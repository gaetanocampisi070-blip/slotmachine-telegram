





const SERVER_URL = "https://slot-backend-lsi6.onrender.com";
const tg = window.Telegram.WebApp;
const USER_ID = tg.initDataUnsafe?.user?.id || Math.floor(Math.random()*1000000);
const USER_NAME = tg.initDataUnsafe?.user?.first_name || "Anonimo";

let money = 100;
let stamina = 100;

// ===== NAVBAR =====
function showPage(name) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + name).classList.add("active");
  updateUI();
}

// ===== SERVER =====
async function loadPlayer() {
  try {
    const res = await fetch(`${SERVER_URL}/load/${USER_ID}`);
    const data = await res.json();
    money = data.money;
    stamina = data.stamina;
    updateUI();
  } catch (e) { console.log("Errore caricamento dati:", e); }
}
async function savePlayer() {
  await fetch(`${SERVER_URL}/save`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({user_id: USER_ID, name: USER_NAME, money, stamina})
  });
}

// ===== SLOT =====
const symbols = ["🍒","🍋","🔔","⭐","💎","7️⃣"];
const reels = [document.getElementById("reel1"), document.getElementById("reel2"), document.getElementById("reel3")];

async function spin() {
  if (money < 10) { document.getElementById("result").textContent="Non hai abbastanza soldi!"; return; }
  money -= 10; stamina -= 5;
  animateReels();

  setTimeout(() => {
    const results = reels.map(()=> symbols[Math.floor(Math.random()*symbols.length)]);
    reels.forEach((r,i)=> r.textContent = results[i]);

    if (results[0]===results[1] && results[1]===results[2]) {
      money += 50;
      document.getElementById("result").textContent="🎉 Jackpot! +50💰";
    } else {
      document.getElementById("result").textContent="😢 Hai perso 10";
    }
    updateUI(); savePlayer(); updateLeaderboard();
  },1000);
}
function animateReels() {
  reels.forEach(r=>{
    r.style.transform="translateY(-20px)";
    setTimeout(()=>r.style.transform="translateY(0)",200);
  });
}

// ===== CLASSIFICA =====
async function updateLeaderboard() {
  try {
    const res = await fetch(`${SERVER_URL}/leaderboard`);
    const leaderboard = await res.json();
    const list = document.getElementById("leaderboard-list");
    list.innerHTML="";
    leaderboard.forEach((p,i)=>{
      const li=document.createElement("li");
      li.textContent=`${i+1}. ${p.name} - 💰 ${p.money}`;
      list.appendChild(li);
    });
  } catch (e) { console.log("Errore classifica:", e); }
}

// ===== BLACKJACK =====
let playerCards=[], dealerCards=[];

function getRandomCard() { return Math.floor(Math.random()*10)+1; }
function sum(cards) { return cards.reduce((a,b)=>a+b,0); }

function startBlackjack() {
  if (money < 10) {
    document.getElementById("bj-result").textContent="Non hai abbastanza soldi!";
    return;
  }
  money -= 10; // costo mano
  playerCards=[getRandomCard(), getRandomCard()];
  dealerCards=[getRandomCard()];
  renderBJ();
}

function renderBJ() {
  document.getElementById("player-cards").textContent=playerCards.join(", ");
  document.getElementById("dealer-cards").textContent=dealerCards.join(", ");
  document.getElementById("player-total").textContent=sum(playerCards);
  document.getElementById("dealer-total").textContent=sum(dealerCards);
  updateUI();
}

document.getElementById("hitBtn").addEventListener("click",()=>{
  playerCards.push(getRandomCard());
  renderBJ();
  if (sum(playerCards)>21) endBlackjack();
});
document.getElementById("standBtn").addEventListener("click",()=>endBlackjack());

function endBlackjack() {
  while(sum(dealerCards)<17) dealerCards.push(getRandomCard());
  renderBJ();
  let player=sum(playerCards), dealer=sum(dealerCards);
  let res="";
  if (player>21) res="Hai sballato 😢";
  else if (dealer>21 || player>dealer) {res="Hai vinto 🎉 +20💰"; money+=20;}
  else if (player===dealer) res="Pareggio 🤝";
  else res="Banco vince 😢";

  document.getElementById("bj-result").textContent=res;
  stamina -= 5;
  updateUI(); savePlayer(); updateLeaderboard();
  setTimeout(startBlackjack,2000); // nuova mano
}

// ===== UI =====
function updateUI() {
  document.getElementById("money").textContent=money;
  document.getElementById("stamina").textContent=stamina;
  document.getElementById("moneyBJ").textContent=money;
  document.getElementById("staminaBJ").textContent=stamina;
}

// ===== AVVIO =====
document.getElementById("spinBtn").addEventListener("click", spin);
loadPlayer(); updateLeaderboard(); setInterval(updateLeaderboard,10000);
startBlackjack();
