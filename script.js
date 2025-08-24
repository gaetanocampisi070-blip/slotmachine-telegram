
const symbols = ["🍒", "🍋", "⭐", "7️⃣", "🔔"];
let money = 100;
let stamina = 100;

const moneyEl = document.getElementById("money");
const staminaEl = document.getElementById("stamina");
const resultEl = document.getElementById("result");
const spinBtn = document.getElementById("spinBtn");

function spin() {
  if (stamina <= 0) {
    resultEl.textContent = "Hai finito la stamina! ⏳";
    return;
  }

  stamina -= 10;
  staminaEl.textContent = stamina;

  // Scelta casuale simboli
  const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
  const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
  const reel3 = symbols[Math.floor(Math.random() * symbols.length)];

  document.getElementById("reel1").textContent = reel1;
  document.getElementById("reel2").textContent = reel2;
  document.getElementById("reel3").textContent = reel3;

  // Controllo vincita
  if (reel1 === reel2 && reel2 === reel3) {
    money += 50;
    resultEl.textContent = "🎉 JACKPOT! Hai vinto +50!";
  } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
    money += 10;
    resultEl.textContent = "😊 Bella coppia! +10";
  } else {
    money -= 5;
    resultEl.textContent = "😢 Ritenta, sarai più fortunato!";
  }

  moneyEl.textContent = money;
}

spinBtn.addEventListener("click", spin);
