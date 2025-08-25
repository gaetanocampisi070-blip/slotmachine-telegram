

// =====================
// VARIABILI GLOBALI
// =====================
let money = 100;
let stamina = 10;
let xp = 0;
let level = 1;
let jackpot = 1000;
const playerName = "guest"; // puoi collegare al login Telegram
const apiBase = "https://slot-backend-lsi6.onrender.com";

// =====================
// SUONI
// =====================
const sounds = {
  spin: new Audio("https://actions.google.com/sounds/v1/impacts/wood_plank_flicks.ogg"),
  win: new Audio("https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg"),
  lose: new Audio("https://actions.google.com/sounds/v1/cartoon/cartoon_cowbell.ogg"),
  coin: new Audio("https://actions.google.com/sounds/v1/cartoon/wood_plank_hit.ogg"),
  levelup: new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg"),
  applause: new Audio("https://actions.google.com/sounds/v1/ambiences/indoor_crowd_cheer.ogg")
};
let soundOn = true;
function playSound(s) { if (soundOn && sounds[s]) sounds[s].play(); }

// =====================
// INTERFACCIA
// =====================
function updateStats() {
  document.getElementById("money").textContent = money;
  document.getElementById("stamina").textContent = stamina;
  document.getElementById("moneyBJ").textContent = money;
  document.getElementById("staminaBJ").textContent = stamina;
  document.getElementById("xpBar").style.width = (xp % 100) + "%";
  document.getElementById("levelLabel").textContent = "Lv." + level;
}

// Notifiche (toasts)
function notify(msg, type="info") {
  const div = document.createElement("div");
  div.className = "toast " + type;
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3000);
}

// =====================
// NAVIGAZIONE
// =====================
function showPage(page) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + page).classList.add("active");
  if (page === "classifica") loadLeaderboard();
}
window.showPage = showPage;

// =====================
// SLOT MACHINE
// =====================
const symbols = ["🍒","🍋","🍊","🍉","⭐","💎","🔔","7️⃣"];
const spinBtn = document.getElementById("spinBtn");
spinBtn.addEventListener("click", spin);

let autoSpin = false;
async function spin() {
  if (stamina <= 0) {
    document.getElementById("result").textContent = "⚡ Energia finita!";
    playSound("lose");
    return;
  }

  stamina--;
  playSound("spin");

  const reels = document.querySelectorAll(".reel .strip");
  reels.forEach(strip => {
    strip.innerHTML = "";
    for (let i=0;i<10;i++) {
      const sym = symbols[Math.floor(Math.random()*symbols.length)];
      const d = document.createElement("div");
      d.className = "sym";
      d.textContent = sym;
      strip.appendChild(d);
    }
    strip.style.transform = "translateY(0)";
    setTimeout(()=> strip.style.transform = `translateY(-${Math.floor(Math.random()*9)*120}px)`, 50);
  });

  setTimeout(()=>{
    const s1 = reels[0].children[1].innerText;
    const s2 = reels[1].children[1].innerText;
    const s3 = reels[2].children[1].innerText;

    let msg = "😢 Hai perso!";
    if (s1===s2 && s2===s3) {
      money += 100;
      xp += 20;
      jackpot += 200;
      msg = "🏆 JACKPOT TRIPLA! +100";
      playSound("applause");
    } else if (s1===s2 || s2===s3) {
      money += 20;
      xp += 10;
      msg = "🎉 Coppia! +20";
      playSound("win");
    } else {
      money -= 5;
      jackpot += 10;
      playSound("lose");
    }
    document.getElementById("result").textContent = msg;
    levelUpCheck();
    updateStats();
    saveProgress();
    if (autoSpin) spin();
  }, 1000);
}

// =====================
// LIVELLI E XP
// =====================
function levelUpCheck() {
  if (xp >= level*100) {
    level++;
    stamina += 5;
    money += 50;
    notify("🎉 Sei salito al livello " + level + "! Bonus +50💰 +5⚡","success");
    playSound("levelup");
  }
}

// =====================
// BLACKJACK (semplice)
// =====================
document.getElementById("hitBtn").addEventListener("click", () => {
  stamina--;
  money -= 5;
  xp += 5;
  document.getElementById("bj-result").textContent = "🥲 Hai perso la mano (demo).";
  playSound("lose");
  levelUpCheck();
  updateStats();
  saveProgress();
});
document.getElementById("standBtn").addEventListener("click", () => {
  money += 15;
  xp += 10;
  document.getElementById("bj-result").textContent = "😎 Vittoria! +15";
  playSound("win");
  levelUpCheck();
  updateStats();
  saveProgress();
});

// =====================
// BONUS GIORNALIERO
// =====================
function dailyBonus() {
  const last = localStorage.getItem("lastBonus") || 0;
  const now = new Date().toDateString();
  if (last !== now) {
    money += 100;
    stamina += 10;
    localStorage.setItem("lastBonus", now);
    notify("🎁 Bonus giornaliero +100💰 +10⚡","success");
    playSound("coin");
    updateStats();
    saveProgress();
  }
}

// =====================
// MISSIONI
// =====================
let spinsToday = 0;
function checkMissions() {
  if (spinsToday >= 10) {
    money += 50;
    notify("✅ Missione completata: 10 spin! +50💰","success");
    spinsToday = 0;
  }
}

// Hook su spin
const oldSpin = spin;
spin = async function() {
  spinsToday++;
  await oldSpin();
  checkMissions();
};

// =====================
// BACKEND API
// =====================
async function saveProgress() {
  try {
    await fetch(apiBase + "/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player: playerName, money, stamina, xp, level, jackpot })
    });
  } catch (e) {
    console.error("Errore salvataggio", e);
  }
}

async function loadLeaderboard() {
  const list = document.getElementById("leaderboard-list");
  list.innerHTML = "<li>Caricamento...</li>";
  try {
    const res = await fetch(apiBase + "/leaderboard");
    const data = await res.json();
    list.innerHTML = "";
    data.forEach((p, i) => {
      const li = document.createElement("li");
      li.innerHTML = `${i+1}. ${p.player} <span>${p.money}💰</span>`;
      if (p.player === playerName) li.style.color = "gold";
      list.appendChild(li);
    });
  } catch (e) {
    list.innerHTML = "<li>Errore caricamento classifica</li>";
  }
}

// =====================
// CONTROLLO SUONI
// =====================
document.addEventListener("keydown", e=>{
  if (e.key==="m") { soundOn=!soundOn; notify(soundOn?"🔊 Suoni attivi":"🔇 Suoni mutati"); }
});

// =====================
// AVVIO
// =====================
updateStats();
dailyBonus();
notify("🎰 Benvenuto al Mini Casino! Premi M per ON/OFF suoni");
