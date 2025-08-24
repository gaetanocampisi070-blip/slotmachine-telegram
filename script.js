// Variabili di gioco
let money = 100; // Soldi iniziali
let stamina = 100; // Stamina iniziale
let maxStamina = 100; // Massima stamina
let staminaRechargeTime = 300000; // 5 minuti in millisecondi
let rechargeTimer = null;

// Funzione per ricaricare la stamina ogni 5 minuti
function rechargeStamina() {
    stamina = maxStamina;
    document.getElementById("stamina").textContent = stamina;
    document.getElementById("time").textContent = "5:00";
}

// Funzione per avviare il conto alla rovescia per la ricarica
function startStaminaCountdown() {
    let countdown = staminaRechargeTime;
    let interval = setInterval(function() {
        countdown -= 1000;
        let minutes = Math.floor(countdown / 60000);
        let seconds = Math.floor((countdown % 60000) / 1000);
        document.getElementById("time").textContent = `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
        
        if (countdown <= 0) {
            clearInterval(interval);
            rechargeStamina();
        }
    }, 1000);
}

// Funzione per girare la slot
function spinSlot() {
    if (stamina > 0) {
        stamina -= 10; // Ogni giro della slot consuma 10 stamina
        document.getElementById("stamina").textContent = stamina;

        // Simuliamo un risultato di slot (ad esempio, 3 numeri casuali)
        let result = Math.floor(Math.random() * 100);
        let resultText = "";

        if (result < 50) { // Se il risultato è sotto il 50%, vinciamo
            let winAmount = Math.floor(Math.random() * 50) + 10; // Vincita casuale tra 10 e 60 monete
            money += winAmount;
            resultText = `Hai vinto ${winAmount} monete!`;
        } else { // Se il risultato è maggiore del 50%, perdiamo
            let lossAmount = Math.floor(Math.random() * 30) + 5; // Perdita casuale tra 5 e 35 monete
            money -= lossAmount;
            resultText = `Hai perso ${lossAmount} monete...`;
        }

        // Mostriamo il risultato
        document.getElementById("result").textContent = resultText;
        document.getElementById("money").textContent = money;
    } else {
        alert("Stamina esaurita! Attendi il recupero.");
    }
}

// Avvia il recupero della stamina quando la pagina è caricata
window.onload = function() {
    startStaminaCountdown();
    document.getElementById("spinBtn").addEventListener("click", spinSlot);
};
