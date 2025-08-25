


const SERVER_URL = "https://slot-backend-lsi6.onrender.com";
const tg = window.Telegram.WebApp;
const USER_ID = tg.initDataUnsafe?.user?.id || Math.floor(Math.random()*1000000);
const USER_NAME = tg.initDataUnsafe?.user?.first_name || "Anonimo";

let money = 100;
let stamina = 100;
const symbols = ["🍒","🍋","🔔","⭐","💎","7️⃣"];

const reels = [
  document.getElementById("reel1"),
  document.getElementById("reel2"),
  document.getElementById("reel3")
];

// Carica dati dal server
async function loadPlayer() {
  const res = await fetch(`${SERVER_URL}/load/${USER_ID}`);
  const data = await res.json();
  money = data.money;
  stamina = data.stamina;
  updateUI();
}

// Salva dati sul server
async function savePlayer() {
  await fetch(`${SERVER_URL}/save`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      user_id: USER_ID,
      name: USER_NAME,
      money: money,
      stamina: stamina
    })
  });
}

// Gioca
async function spin() {
  if (money <= 0) {
    document.getElementById("result").textContent = "Sei senza soldi!";
    return;
  }

  money -= 10;
  stamina -= 5;
  animateReels();

  setTimeout(() => {
    const results = reels.map(r => symbols[Math.floor(Math.random() * symbols.length)]);
    reels.forEach((r, i) => r.textContent = results[i]);

    if (results[0] === results[1] && results[1] === results[2]) {
      money += 50;
      document.getElementById("result").textContent = "🎉 Hai vinto 50!";
    } else {
      document.getElementById("result").textContent = "😢 Hai perso 10.";
    }

    updateUI();
    savePlayer();
    updateLeaderboard();
  }, 1000);
}

// Animazione rulli
function animateReels() {
  reels.forEach(r => {
    r.style.transform = "translateY(-20px)";
    setTimeout(() => r.style.transform = "translateY(0)", 200);
  });
}

// UI
function updateUI() {
  document.getElementById("money").textContent = money;
  document.getElementById("stamina").textContent = stamina;
}

// Classifica
async function updateLeaderboard() {
  const res = await fetch(`${SERVER_URL}/leaderboard`);
  const leaderboard = await res.json();
  const list = document.getElementById("leaderboard-list");
  list.innerHTML = "";
  leaderboard.forEach((p, i) => {
    const li = document.createElement("li");
    li.textContent = `${i+1}. ${p.name} - 💰 ${p.money}`;
    list.appendChild(li);
  });
}

// Eventi
document.getElementById("spinBtn").addEventListener("click", spin);

// Avvio
loadPlayer();
updateLeaderboard();
setInterval(updateLeaderboard, 10000);
