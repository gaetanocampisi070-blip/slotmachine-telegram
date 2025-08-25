
// === VARIABILI GLOBALI ===
let money = 100;
let stamina = 100;
let currentBet = 10;

let tg = window.Telegram.WebApp;
let user = tg.initDataUnsafe?.user || { id: "guest", username: "ospite" };

// === FUNZIONE CAMBIO PAGINA ===
function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + page).classList.add("active");
  updateStats();
}

// === SLOT MACHINE ===
const symbols = ["💰", "⚡", "❌"];
document.getElementById("spinBtn").addEventListener("click", spinSlot);

function spinSlot() {
  if (money < currentBet) {
    document.getElementById("result").innerText = "❌ Non hai abbastanza monete!";
    return;
  }

  money -= currentBet;
  updateStats();

  let reels = [document.getElementById("reel1"), document.getElementById("reel2"), document.getElementById("reel3")];
  reels.forEach(r => {
    r.classList.add("spin");
    setTimeout(() => r.classList.remove("spin"), 600);
  });

  setTimeout(() => {
    let results = reels.map(r => {
      let sym = symbols[Math.floor(Math.random() * symbols.length)];
      r.innerText = sym;
      return sym;
    });

    if (results.every(s => s === "💰")) {
      money += currentBet * 3;
      document.getElementById("result").innerText = "💰 Hai vinto monete!";
    } else if (results.every(s => s === "⚡")) {
      stamina += 10;
      document.getElementById("result").innerText = "⚡ Hai guadagnato stamina!";
    } else if (results.every(s => s === "❌")) {
      money -= currentBet * 2;
      document.getElementById("result").innerText = "❌ Perdi il doppio!";
    } else {
      document.getElementById("result").innerText = "😢 Nessuna vincita...";
    }

    updateStats();
    saveProgress();
  }, 700);
}

// === BLACKJACK ===
let playerCards = [], dealerCards = [];

document.getElementById("hitBtn").addEventListener("click", hit);
document.getElementById("standBtn").addEventListener("click", stand);

function newDeckCard() {
  let cards = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  return cards[Math.floor(Math.random() * cards.length)];
}

function cardValue(card) {
  if (["J", "Q", "K"].includes(card)) return 10;
  if (card === "A") return 11;
  return parseInt(card);
}

function calcTotal(cards) {
  let total = cards.reduce((a, c) => a + cardValue(c), 0);
  let aces = cards.filter(c => c === "A").length;
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function startBlackjack() {
  if (money < currentBet) {
    document.getElementById("bj-result").innerText = "❌ Non hai abbastanza monete!";
    return;
  }

  money -= currentBet;
  playerCards = [newDeckCard(), newDeckCard()];
  dealerCards = [newDeckCard()];

  renderBJ();
  document.getElementById("bj-result").innerText = "";
}

function hit() {
  playerCards.push(newDeckCard());
  renderBJ();
  if (calcTotal(playerCards) > 21) endRound();
}

function stand() {
  while (calcTotal(dealerCards) < 17) dealerCards.push(newDeckCard());
  renderBJ();
  endRound();
}

function endRound() {
  let playerTotal = calcTotal(playerCards);
  let dealerTotal = calcTotal(dealerCards);

  if (playerTotal > 21) {
    document.getElementById("bj-result").innerText = "💥 Sballi! Perdi.";
  } else if (dealerTotal > 21 || playerTotal > dealerTotal) {
    money += currentBet * 2;
    document.getElementById("bj-result").innerText = "🏆 Hai vinto!";
  } else if (playerTotal === dealerTotal) {
    money += currentBet;
    document.getElementById("bj-result").innerText = "🤝 Pareggio!";
  } else {
    document.getElementById("bj-result").innerText = "❌ Il banco vince.";
  }

  updateStats();
  saveProgress();
}

function renderBJ() {
  document.getElementById("player-cards").innerText = playerCards.join(" ");
  document.getElementById("dealer-cards").innerText = dealerCards.join(" ");
  document.getElementById("player-total").innerText = calcTotal(playerCards);
  document.getElementById("dealer-total").innerText = calcTotal(dealerCards);
}

// Avvia nuova mano ogni volta che entri nella pagina Blackjack
document.querySelector("a[onclick=\"showPage('carte')\"]").addEventListener("click", startBlackjack);

// === LEADERBOARD ===
async function loadLeaderboard() {
  let res = await fetch("/leaderboard");
  let data = await res.json();

  let list = document.getElementById("leaderboard-list");
  list.innerHTML = "";
  data.forEach((p, i) => {
    let li = document.createElement("li");
    li.innerHTML = `${i+1}. ${p.username} <span>${p.coins} 💰</span>`;
    list.appendChild(li);
  });
}

// === SALVATAGGIO PROGRESSI ===
async function saveProgress() {
  await fetch("/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: user.id,
      username: user.username,
      coins: money
    })
  });
  loadLeaderboard();
}

// === UPDATE STATS ===
function updateStats() {
  document.getElementById("money").innerText = money;
  document.getElementById("stamina").innerText = stamina;
  document.getElementById("moneyBJ").innerText = money;
  document.getElementById("staminaBJ").innerText = stamina;
}

// === INIT ===
updateStats();
loadLeaderboard();
