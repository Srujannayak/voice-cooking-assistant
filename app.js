/* ===== app.js: main logic for UI, TTS, recognition, commands, timer ===== */

let currentRecipe = RECIPES[0];   // load first recipe
let stepIndex = 0;
let timerInterval = null;

// --- Render functions ---------------------------------
function renderRecipe() {
  document.getElementById('recipe-title').textContent = currentRecipe.title;
  const ingList = document.getElementById('ingredients-list');
  ingList.innerHTML = currentRecipe.ingredients.map(i => `<li>${i}</li>`).join('');
  renderStep();
}

function renderStep() {
  document.getElementById('step-number').textContent = `Step ${stepIndex + 1}`;
  document.getElementById('step-text').textContent = currentRecipe.steps[stepIndex];
  // speak the step automatically (optional)
  speak(currentRecipe.steps[stepIndex]);
}

// --- Text-to-Speech (TTS) -----------------------------
function speak(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel(); // stop any previous speech
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  window.speechSynthesis.speak(u);
}

// --- Speech Recognition setup -------------------------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript.toLowerCase().trim();
    document.getElementById('status').textContent = `Heard: ${text}`;
    handleCommand(text);
  };

  recognition.onerror = (e) => {
    console.warn('SpeechRecognition error', e);
    document.getElementById('status').textContent = `Error: ${e.error}`;
  };

  recognition.onend = () => {
    // After recognition stops, reset status
    document.getElementById('status').textContent = 'Status: Not Listening';
  };
} else {
  document.getElementById('status').textContent = 'Speech recognition not supported in this browser.';
}

// --- Command handler ----------------------------------
function handleCommand(cmd) {
  // basic keywords + numbers extraction
  if (cmd.includes('start') || cmd.includes('begin')) {
    stepIndex = 0; renderStep(); return;
  }
  if (cmd.includes('next') || cmd.includes('forward') || cmd.includes('skip')) {
    nextStep(); return;
  }
  if (cmd.includes('previous') || cmd.includes('back')) {
    prevStep(); return;
  }
  if (cmd.includes('repeat') || cmd.includes('again')) {
    speak(currentRecipe.steps[stepIndex]); return;
  }
  if (cmd.includes('ingredient') || cmd.includes('ingredients') || cmd.includes('what do i need')) {
    speak('Ingredients are: ' + currentRecipe.ingredients.join(', ')); return;
  }
  if (cmd.includes('how much') || cmd.includes('quantity')) {
    // naive search for ingredient keywords inside current recipe ingredients
    const found = currentRecipe.ingredients.find(i => {
      const words = i.toLowerCase().split(/\s+/);
      // check if any word in ingredient appears in cmd
      return words.some(w => cmd.includes(w));
    });
    if (found) speak(found);
    else speak("I could not find that ingredient exactly. Try asking 'show ingredients'.");
    return;
  }
  if (cmd.includes('timer')) {
    const num = cmd.match(/\d+/);
    if (num) startTimer(parseInt(num[0], 10));
    else speak('For how many minutes?');
    return;
  }
  // fallback
  speak("Sorry, I didn't understand. Try: next, previous, repeat, show ingredients, set timer for 2 minutes.");
}

// --- Timer functions ----------------------------------
function startTimer(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) { speak('Please specify a valid number of minutes.'); return; }
  if (timerInterval) clearInterval(timerInterval);
  let remaining = minutes * 60; // seconds
  document.getElementById('timer-value').textContent = `${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
  speak(`Timer set for ${minutes} minutes.`);
  timerInterval = setInterval(() => {
    remaining--;
    document.getElementById('timer-value').textContent = `${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`;
    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;
      speak('Timer finished.');
      document.getElementById('timer-value').textContent = '00:00';
    }
  }, 1000);
}

// --- Button callbacks --------------------------------
function nextStep() {
  if (stepIndex < currentRecipe.steps.length - 1) { stepIndex++; renderStep(); }
  else speak('This is the last step.');
}
function prevStep() {
  if (stepIndex > 0) { stepIndex--; renderStep(); }
  else speak('This is the first step.');
}

// wire UI buttons
document.getElementById('mic-btn').addEventListener('click', () => {
  if (!recognition) return alert('Speech recognition not supported. Use Chrome.');
  document.getElementById('status').textContent = 'Listening...';
  recognition.start();
});
document.getElementById('next-btn').addEventListener('click', nextStep);
document.getElementById('prev-btn').addEventListener('click', prevStep);
document.getElementById('repeat-btn').addEventListener('click', () => speak(currentRecipe.steps[stepIndex]));

// initial render
renderRecipe();
