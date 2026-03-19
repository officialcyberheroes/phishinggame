/* ═══════════════════════════════════════════════
   EMAIL PHISHER!  —  game.js
═══════════════════════════════════════════════ */

// ── Background Music ───────────────────────────
const bgMusic = new Audio('bgmusic.mp3');
bgMusic.loop   = true;
bgMusic.volume = 0.3;
let musicMuted = false;

function toggleMusic() {
  musicMuted = !musicMuted;
  bgMusic.muted = musicMuted;
  const btn  = document.getElementById('mute-btn');
  const on   = document.getElementById('mute-icon-on');
  const off  = document.getElementById('mute-icon-off');
  if (musicMuted) {
    btn.classList.add('muted');
    on.style.display  = 'none';
    off.style.display = '';
  } else {
    btn.classList.remove('muted');
    on.style.display  = '';
    off.style.display = 'none';
  }
}

// ── Sound Effects ──────────────────────────────
const sfx = {
  correct: new Audio('correct.mp3'),
  wrong:   new Audio('wrong.mp3'),
};
sfx.correct.volume = 0.6;
sfx.wrong.volume   = 0.6;

function playSound(key) {
  try { sfx[key].currentTime = 0; sfx[key].play().catch(() => {}); } catch (_) {}
}

// ── Fake timestamps for the inbox list row ─────
const FAKE_TIMES = [
  'Just now', '1 min ago', '2 mins ago', '4 mins ago',
  '8 mins ago', '12 mins ago', '18 mins ago', '25 mins ago',
];
function fakeTime() { return FAKE_TIMES[Math.floor(Math.random() * FAKE_TIMES.length)]; }

// ── Avatar helpers ─────────────────────────────
const AVATAR_PALETTE = [
  '#1a73e8','#d93025','#188038','#e37400',
  '#9334e6','#007b83','#c5221f','#0d652d',
];
function avatarColour(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}
function displayName(from) {
  return from.split('@')[0].replace(/[._-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
function initial(from) {
  const clean = from.replace(/[^a-zA-Z]/g, '');
  return (clean[0] || '?').toUpperCase();
}

// ══════════════════════════════════════════════════════════
//  EMAIL SCENARIOS  — loaded from email.json
// ══════════════════════════════════════════════════════════
let scenarios = [];

document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.querySelector('.btn-start');
  startBtn.disabled = true;
  startBtn.textContent = '⏳ Loading emails…';

  fetch('email.json')
    .then(r => { if (!r.ok) throw new Error('fetch failed'); return r.json(); })
    .then(data => {
      scenarios = data;
      startBtn.disabled    = false;
      startBtn.textContent = '▶ \u00a0Start Clearing Inbox!';
    })
    .catch(() => {
      startBtn.disabled    = false;
      startBtn.textContent = '⚠️ Serve via local server to load emails';
      startBtn.style.background = '#c0392b';
      startBtn.style.color      = '#fff';
      startBtn.style.animation  = 'none';
    });
});

// ── scenarios now live in email.json (fetched above) ──
// scenarios loaded from email.json via fetch above

// ══════════════════════════════════════════════════════════
//  GAME STATE
// ══════════════════════════════════════════════════════════
const TOTAL_TIME = 60;
let timeLeft, score, streak, bestStreak, answered, correct, wrong;
let currentScenario, timerInterval;
let isAnswering = false;
let usedIndices  = [];

function getRandom() {
  if (usedIndices.length >= scenarios.length) usedIndices = [];
  let idx;
  do { idx = Math.floor(Math.random() * scenarios.length); }
  while (usedIndices.includes(idx));
  usedIndices.push(idx);
  return scenarios[idx];
}

// ── Screen management ──────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Start / Restart ────────────────────────────
function startGame() {
  if (!scenarios.length) return;   // guard: wait for email.json to load
  timeLeft = TOTAL_TIME;
  score = 0; streak = 0; bestStreak = 0;
  answered = 0; correct = 0; wrong = 0;
  usedIndices = [];
  isAnswering  = false;

  // start background music on first user interaction
  bgMusic.play().catch(() => {});

  updateHUD();
  updateTimerBar();
  loadNewScenario();
  showScreen('game-screen');

  timerInterval = setInterval(() => {
    timeLeft--;
    document.getElementById('timer-val').textContent = timeLeft;
    updateTimerBar();
    if (timeLeft <= 0) { clearInterval(timerInterval); endGame(); }
  }, 1000);
}

function restartGame() {
  clearInterval(timerInterval);
  startGame();
}

// ── Load scenario → update both inbox row + reading pane ──
function loadNewScenario() {
  currentScenario = getRandom();
  const s   = currentScenario;
  const col = avatarColour(s.from);
  const ini = initial(s.from);
  const dsp = displayName(s.from);
  const ts  = fakeTime();

  // ── Inbox list row ──
  document.getElementById('row-sender').textContent  = dsp;
  document.getElementById('row-subject').textContent = s.subject;
  document.getElementById('row-preview').textContent = s.body.slice(0, 80) + '…';
  document.getElementById('row-date').textContent    = ts;

  // ── Reading pane ──
  document.getElementById('rp-subject').textContent      = s.subject;
  document.getElementById('rp-display-name').textContent = dsp;
  document.getElementById('rp-from-addr').textContent    = s.from;
  document.getElementById('rp-date').textContent         = ts;
  document.getElementById('rp-body').textContent         = s.body;

  const av = document.getElementById('rp-avatar');
  av.textContent       = ini;
  av.style.background  = col;

  // Reset feedback
  document.getElementById('feedback-banner').className = 'rp-feedback';
  document.getElementById('btn-legit').disabled    = false;
  document.getElementById('btn-phishing').disabled = false;
  isAnswering = false;

  // Re-trigger slide-in on reading pane
  const rp = document.getElementById('reading-pane');
  rp.classList.remove('rp-animate');
  void rp.offsetWidth;
  rp.classList.add('rp-animate');

  // Sidebar stats
  document.getElementById('sb-correct').textContent = correct;
  document.getElementById('sb-wrong').textContent   = wrong;
  document.getElementById('sb-streak').textContent  = bestStreak;
}

// ── Answer ─────────────────────────────────────
function answer(choice) {
  if (isAnswering || timeLeft <= 0) return;
  isAnswering = true;

  document.getElementById('btn-legit').disabled    = true;
  document.getElementById('btn-phishing').disabled = true;

  answered++;
  const isCorrect = (choice === currentScenario.type);

  if (isCorrect) {
    score += 10;
    streak++;
    correct++;
    if (streak > bestStreak) bestStreak = streak;
    if (streak % 3 === 0) { score += 5; showStreakPopup(); }
    playSound('correct');
    showFeedback(true);
  } else {
    score -= 5;
    streak = 0;
    wrong++;
    playSound('wrong');
    showFeedback(false);
  }

  updateHUD();
  setTimeout(loadNewScenario, 1500);
}

// ── HUD ────────────────────────────────────────
function updateHUD() {
  document.getElementById('score-val').textContent  = score;
  document.getElementById('streak-val').textContent = streak;
}

function updateTimerBar() {
  const pct = (timeLeft / TOTAL_TIME) * 100;
  const bar  = document.getElementById('timer-bar');
  bar.style.width = pct + '%';
  if      (pct > 50) bar.style.background = 'var(--gm-green)';
  else if (pct > 25) bar.style.background = 'var(--gm-orange)';
  else               bar.style.background = 'var(--gm-red)';
}

// ── Feedback banner ────────────────────────────
function showFeedback(isCorrect) {
  const banner = document.getElementById('feedback-banner');
  document.getElementById('fb-icon').textContent  = isCorrect ? '✅' : '❌';
  document.getElementById('fb-label').textContent = isCorrect ? '+10 Correct! - ' : '-5 Wrong! - ';
  document.getElementById('fb-explanation').textContent = currentScenario.explanation;
  banner.className = 'rp-feedback ' + (isCorrect ? 'correct' : 'wrong');
}

// ── Streak popup ───────────────────────────────
function showStreakPopup() {
  const p = document.getElementById('streak-popup');
  p.textContent = '🔥 ' + streak + '-Streak Bonus! +5';
  p.className = 'streak-popup show';
  setTimeout(() => { p.className = 'streak-popup hide'; }, 1300);
  setTimeout(() => { p.className = 'streak-popup'; }, 1600);
}

// ── End game ───────────────────────────────────
function endGame() {
  showScreen('end-screen');

  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  document.getElementById('end-score').textContent    = score;
  document.getElementById('end-accuracy').textContent = accuracy + '%';
  document.getElementById('end-answered').textContent = answered;
  document.getElementById('end-correct').textContent  = correct;
  document.getElementById('end-wrong').textContent    = wrong;
  document.getElementById('end-streak').textContent   = bestStreak;
  document.getElementById('end-accuracy').style.color = accuracy >= 70 ? 'var(--gm-green)' : 'var(--gm-red)';

  // ── Grade + supervisor verdict ──
  let grade, gradeClass, gradeLabel, verdict, badgeText, badgeStyle;

  if (accuracy >= 95 && score >= 150) {
    grade      = 'S';
    gradeClass = 'grade-S';
    gradeLabel = 'Outstanding Cyber Defender';
    badgeText  = '🏆 Exceptional Performance';
    badgeStyle = 'color:var(--gm-orange)';
    verdict    = '"...okay, I genuinely was not expecting that. You cleared my inbox better than I ever could. You\'re not just staying as an intern! Talk to HR about a full-time offer nowww."';
  } else if (accuracy >= 85) {
    grade      = 'A';
    gradeClass = 'grade-A';
    gradeLabel = 'Expert Threat Spotter';
    badgeText  = '✅ Strong Performance';
    badgeStyle = 'color:var(--gm-green)';
    verdict    = '"Nicely done! You\'ve got a sharp eye for suspicious emails.. I\'m genuinely impressed for a first day. See me tomorrow morning, I might have something more permanent in mind."';
  } else if (accuracy >= 70) {
    grade      = 'B';
    gradeClass = 'grade-B';
    gradeLabel = 'Skilled Email Analyst';
    badgeText  = '👍 Good Performance';
    badgeStyle = 'color:var(--gm-blue)';
    verdict    = '"Good work overall. A few emails slipped through but your instincts are definitely there. You\'ve earned your lunch break. Keep sharpening those skills and you\'ll go far here."';
  } else if (accuracy >= 55) {
    grade      = 'C';
    gradeClass = 'grade-C';
    gradeLabel = 'Average Awareness';
    badgeText  = '😐 Needs Improvement';
    badgeStyle = 'color:var(--gm-purple)';
    verdict    = '"Not bad... but honestly, not great either. Some of those phishing emails were pretty obvious and they still slipped past you. Mandatory security awareness training. Next week. Don\'t be late."';
  } else if (accuracy >= 40) {
    grade      = 'D';
    gradeClass = 'grade-D';
    gradeLabel = 'Needs Serious Training';
    badgeText  = '⚠️ Below Expectations';
    badgeStyle = 'color:var(--gm-orange)';
    verdict    = '"I\'m honestly a little concerned right now. Several very obvious phishing attempts got right past you. Come see me in my office tomorrow at 9 AM. We need to have a proper conversation about this."';
  } else {
    grade      = 'F';
    gradeClass = 'grade-F';
    gradeLabel = 'Security Risk 🚨';
    badgeText  = '🚨 Critical Failure';
    badgeStyle = 'color:var(--gm-red)';
    verdict    = '"...I don\'t even know where to begin. I gave you one task. One. This is a serious cybersecurity liability. I\'ve already looped in HR. Please do not touch any company emails until further notice. 😐"';
  }

  // Apply grade
  const gc = document.getElementById('grade-circle');
  gc.textContent = grade;
  gc.className   = 'grade-circle ' + gradeClass;
  document.getElementById('grade-label').textContent = gradeLabel;

  // Apply supervisor verdict
  document.getElementById('sv-bubble').innerHTML =
    `<div class="end-bubble-arrow"></div><span>${verdict}</span>`;

  // Apply badge
  const badge = document.getElementById('end-boss-badge');
  badge.textContent  = badgeText;
  badge.style.cssText = badgeStyle + '; font-size:0.72rem; font-weight:700; background:var(--gm-surface2); border:1px solid var(--gm-border); border-radius:20px; padding:3px 10px; white-space:nowrap;';
}
