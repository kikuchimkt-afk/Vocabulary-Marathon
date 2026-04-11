/**
 * Sunshine 英単語クイズ アプリ
 * 英検大問1形式 空所補充4択
 */
'use strict';

// ====== State ======
const state = {
  quizData: {},       // { g1: [...], g2: [...], g3: [...] }
  grade: null,        // 'g1' | 'g2' | 'g3'
  tier: 'all',        // 'all' | 1 | 2 | 3
  type: 'all',        // 'all' | 'word' | 'idiom'
  selectedSections: [],  // [] = all, ['1','2'] = specific
  pageStart: null,    // number or null
  pageEnd: null,      // number or null
  questions: [],      // current quiz questions
  current: 0,
  correct: 0,
  wrong: 0,
  mistakes: [],       // { question, yourAnswer }
  answered: false,
  hintStage: 0,       // 0: no hint, 1: sentence JP shown, 2: choice JP shown
};

// ====== DOM Helpers ======
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const on = (el, ev, fn) => { if (el) el.addEventListener(ev, fn); };

// ====== Streak (連続トレーニング) ======
const STREAK_KEY = 'sunshine_quiz_streak';
const MILESTONES = [20, 40, 60, 80, 100, 150, 200, 365];

function getStreakData() {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  return { streak: 0, lastDate: null, totalDays: 0, shownMilestones: [] };
}

function saveStreakData(data) {
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(data)); } catch(e) {}
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function checkStreak() {
  const data = getStreakData();
  const today = getTodayStr();
  
  if (data.lastDate === today) return data; // already trained today
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
  
  if (data.lastDate === yesterdayStr) {
    // streak continues
    return data;
  } else if (data.lastDate && data.lastDate !== today) {
    // streak broken
    data.streak = 0;
    saveStreakData(data);
  }
  return data;
}

function recordTraining() {
  const data = getStreakData();
  const today = getTodayStr();
  
  if (data.lastDate === today) return data; // already counted
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
  
  if (data.lastDate === yesterdayStr) {
    data.streak++;
  } else {
    data.streak = 1;
  }
  data.lastDate = today;
  data.totalDays = (data.totalDays || 0) + 1;
  if (!data.shownMilestones) data.shownMilestones = [];
  
  saveStreakData(data);
  return data;
}

function renderStreakBadge() {
  const badge = $('#streakBadge');
  if (!badge) return;
  
  const data = checkStreak();
  const streak = data.streak;
  const today = getTodayStr();
  const trainedToday = data.lastDate === today;
  
  if (streak === 0 && !trainedToday) {
    badge.innerHTML = `
      <div class="streak-content">
        <span class="streak-icon">🌱</span>
        <span class="streak-text">今日からトレーニングを始めよう！</span>
      </div>`;
  } else {
    const flame = streak >= 30 ? '🔥🔥🔥' : streak >= 10 ? '🔥🔥' : streak >= 3 ? '🔥' : '✨';
    badge.innerHTML = `
      <div class="streak-content">
        <span class="streak-icon">${flame}</span>
        <div class="streak-info">
          <span class="streak-days">連続 <strong>${streak}</strong> 日継続中！</span>
          ${trainedToday ? '<span class="streak-done">✅ 今日のトレーニング完了</span>' : '<span class="streak-todo">📌 今日まだトレーニングしていません</span>'}
        </div>
      </div>
      <div class="streak-total">累計 ${data.totalDays || streak} 日</div>`;
  }
}

function checkMilestone(streakData) {
  const streak = streakData.streak;
  const shown = streakData.shownMilestones || [];
  
  for (const m of MILESTONES) {
    if (streak >= m && !shown.includes(m)) {
      streakData.shownMilestones.push(m);
      saveStreakData(streakData);
      showCelebrationModal(m, streak);
      return;
    }
  }
}

function showCelebrationModal(milestone, streak) {
  const modal = document.createElement('div');
  modal.className = 'celebration-overlay';
  modal.id = 'celebrationModal';
  
  const emoji = milestone >= 100 ? '👑' : milestone >= 60 ? '🏆' : milestone >= 40 ? '🎖️' : '🥇';
  const title = milestone >= 100 ? '伝説の努力家！' : milestone >= 60 ? '素晴らしい継続力！' : milestone >= 40 ? '驚異的な集中力！' : 'すごい！よく頑張った！';
  
  modal.innerHTML = `
    <div class="celebration-modal slide-up">
      <div class="celebration-confetti">🎊</div>
      <div class="celebration-emoji">${emoji}</div>
      <h2 class="celebration-title">🎉 ${milestone}日連続達成！ 🎉</h2>
      <p class="celebration-subtitle">${title}</p>
      <div class="celebration-streak">
        <div class="celebration-days">${streak}</div>
        <div class="celebration-label">日連続トレーニング</div>
      </div>
      <div class="celebration-reward">
        📸 このスクリーンショットを保存して<br>
        教室で先生に見せると<br>
        <strong>✨ 素敵なプレゼント ✨</strong>がもらえるよ！
      </div>
      <div class="celebration-date">${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div class="celebration-name">☀️ Sunshine 英単語クイズ</div>
      <button class="celebration-close" onclick="closeCelebration()">閉じる</button>
    </div>`;
  
  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('show'));
}

function closeCelebration() {
  const modal = $('#celebrationModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  }
}

// ====== Data Loading ======
async function loadData() {
  const files = ['g1_quiz.json', 'g2_quiz.json', 'g3_quiz.json'];
  for (const f of files) {
    const key = f.replace('_quiz.json', '');
    try {
      const res = await fetch(f);
      state.quizData[key] = await res.json();
    } catch (e) {
      console.warn(`Failed to load ${f}:`, e);
      state.quizData[key] = [];
    }
  }
}

// ====== ページ番号抽出 ======
function extractPageNum(pageStr) {
  if (!pageStr) return null;
  const m = pageStr.match(/p\.(\d+)/);
  return m ? parseInt(m[1]) : null;
}

// ====== セクションソート（教科書ページ順）======
function sortSectionsByPage(data) {
  // 各セクションの最小ページ番号を計算
  const minPages = {};
  data.forEach(q => {
    const s = q.section;
    if (!s) return;
    const pn = extractPageNum(q.page);
    if (pn !== null) {
      minPages[s] = Math.min(minPages[s] || 9999, pn);
    }
  });
  // ページ番号順でソート
  return (a, b) => (minPages[a] || 9999) - (minPages[b] || 9999);
}

// ====== セクションラベル ======
function sectionLabel(s) {
  if (/^\d+$/.test(s)) return 'Program ' + s;
  if (s.startsWith('L')) return 'Let\'s Read ' + s.slice(1);
  if (s.startsWith('FR')) return 'Further Reading ' + s.slice(2);
  if (s === 'WW') return 'Word Web';
  return s;
}

// ====== Setup Screen ======
function initSetup() {
  const grades = [
    { key: 'g1', label: '中学1年', icon: '📗' },
    { key: 'g2', label: '中学2年', icon: '📘' },
    { key: 'g3', label: '中学3年', icon: '📙' },
  ];

  const gradeBtns = $('#gradeBtns');
  gradeBtns.innerHTML = grades.map(g => {
    const count = (state.quizData[g.key] || []).length;
    return `<button class="grade-btn" data-grade="${g.key}">
      ${g.icon} ${g.label}
      <span class="count">${count}問</span>
    </button>`;
  }).join('');

  gradeBtns.querySelectorAll('.grade-btn').forEach(btn => {
    on(btn, 'click', () => {
      gradeBtns.querySelectorAll('.grade-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.grade = btn.dataset.grade;
      state.selectedSections = [];
      state.pageStart = null;
      state.pageEnd = null;
      $('#pageStart').value = '';
      $('#pageEnd').value = '';
      renderSectionChips();
      updateSummary();
    });
  });

  // Tier buttons
  const tierBtns = $('#tierBtns');
  const tiers = [
    { key: 'all', label: '全Tier', cls: 'tier-all' },
    { key: 1, label: 'Tier 1', cls: 'tier-1' },
    { key: 2, label: 'Tier 2', cls: 'tier-2' },
    { key: 3, label: 'Tier 3', cls: 'tier-3' },
  ];

  tierBtns.innerHTML = tiers.map(t => 
    `<button class="tier-btn ${t.cls} ${t.key === 'all' ? 'active' : ''}" data-tier="${t.key}">${t.label}</button>`
  ).join('');

  tierBtns.querySelectorAll('.tier-btn').forEach(btn => {
    on(btn, 'click', () => {
      tierBtns.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.tier = btn.dataset.tier === 'all' ? 'all' : parseInt(btn.dataset.tier);
      updateSummary();
    });
  });

  // Config change listeners
  on($('#questionCount'), 'change', updateSummary);
  on($('#questionType'), 'change', () => { state.type = $('#questionType').value; updateSummary(); });

  // Page range listeners
  on($('#pageStart'), 'input', () => {
    const v = $('#pageStart').value.trim();
    state.pageStart = v ? parseInt(v) : null;
    updateSummary();
  });
  on($('#pageEnd'), 'input', () => {
    const v = $('#pageEnd').value.trim();
    state.pageEnd = v ? parseInt(v) : null;
    updateSummary();
  });

  // Start button
  on($('#startBtn'), 'click', startQuiz);
  on($('#nextBtn'), 'click', nextQuestion);
}

function renderSectionChips() {
  const container = $('#sectionChips');
  if (!container) return;
  container.innerHTML = '';
  if (!state.grade) {
    container.innerHTML = '<div style="color:var(--text-dim);font-size:0.75rem;padding:0.5rem 0">学年を選択してください</div>';
    return;
  }

  const data = state.quizData[state.grade] || [];
  const sectionSet = [...new Set(data.map(q => q.section).filter(Boolean))].sort(sortSectionsByPage(data));

  // 「全て」チップ
  const allActive = state.selectedSections.length === 0;
  const allChip = document.createElement('button');
  allChip.className = 'section-chip' + (allActive ? ' active all' : '');
  allChip.textContent = '全て';
  allChip.addEventListener('click', () => {
    state.selectedSections = [];
    renderSectionChips();
    updatePageRange();
    updateSummary();
  });
  container.appendChild(allChip);

  // 各セクションチップ
  sectionSet.forEach(s => {
    const count = data.filter(q => q.section === s).length;
    const isActive = state.selectedSections.includes(s);
    const chip = document.createElement('button');
    chip.className = 'section-chip' + (isActive ? ' active' : '');
    chip.dataset.section = s;
    chip.innerHTML = `${sectionLabel(s)} <span class="chip-count">${count}</span>`;
    chip.addEventListener('click', () => {
      if (isActive) {
        state.selectedSections = state.selectedSections.filter(x => x !== s);
      } else {
        state.selectedSections.push(s);
      }
      renderSectionChips();
      updatePageRange();
      updateSummary();
    });
    container.appendChild(chip);
  });
}

function updatePageRange() {
  // 選択セクションのページ範囲を表示
  const rangeInfo = $('#pageRangeInfo');
  if (!rangeInfo) return;

  if (!state.grade) {
    rangeInfo.textContent = '';
    return;
  }

  let qs = state.quizData[state.grade] || [];
  if (state.selectedSections.length > 0) {
    qs = qs.filter(q => state.selectedSections.includes(q.section));
  }

  const pageNums = qs.map(q => extractPageNum(q.page)).filter(n => n !== null);
  if (pageNums.length === 0) {
    rangeInfo.textContent = '';
    return;
  }
  const minP = Math.min(...pageNums);
  const maxP = Math.max(...pageNums);
  rangeInfo.textContent = `(範囲: p.${minP} 〜 p.${maxP})`;
}

function getFilteredQuestions() {
  if (!state.grade) return [];
  let qs = state.quizData[state.grade] || [];

  // Tier filter
  if (state.tier !== 'all') {
    qs = qs.filter(q => q.tier === state.tier);
  }

  // Type filter
  if (state.type !== 'all') {
    qs = qs.filter(q => q.type === state.type);
  }

  // Section filter
  if (state.selectedSections.length > 0) {
    qs = qs.filter(q => state.selectedSections.includes(q.section));
  }

  // Page range filter
  if (state.pageStart !== null || state.pageEnd !== null) {
    qs = qs.filter(q => {
      const pn = extractPageNum(q.page);
      if (pn === null) return false;
      if (state.pageStart !== null && pn < state.pageStart) return false;
      if (state.pageEnd !== null && pn > state.pageEnd) return false;
      return true;
    });
  }

  return qs;
}

function updateSummary() {
  const filtered = getFilteredQuestions();
  const matchCount = filtered.length;
  let pickCount = parseInt($('#questionCount').value) || matchCount;
  if (pickCount === 0 || pickCount > matchCount) pickCount = matchCount;

  $('#matchCount').textContent = matchCount;
  $('#pickCount').textContent = pickCount;
  $('#startBtn').disabled = matchCount === 0;

  // ページ範囲情報も更新
  updatePageRange();
}

// ====== Quiz Logic ======
function startQuiz() {
  const filtered = getFilteredQuestions();
  let count = parseInt($('#questionCount').value) || filtered.length;
  if (count === 0 || count > filtered.length) count = filtered.length;

  const order = $('#questionOrder').value;
  let questions = [...filtered];

  if (order === 'random') {
    // Fisher-Yates shuffle
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
  }

  questions = questions.slice(0, count);

  // Shuffle choices for each question
  questions.forEach(q => {
    q._shuffledChoices = [...q.choices].sort(() => Math.random() - 0.5);
  });

  state.questions = questions;
  state.current = 0;
  state.correct = 0;
  state.wrong = 0;
  state.mistakes = [];
  state.answered = false;

  showScreen('quiz');
  renderQuestion();
}

function renderQuestion() {
  const q = state.questions[state.current];
  if (!q) return;

  state.answered = false;
  state.hintStage = 0;
  const total = state.questions.length;

  // Progress
  $('#progressFill').style.width = `${(state.current / total) * 100}%`;

  // Score bar
  const answered = state.correct + state.wrong;
  const accuracy = answered > 0 ? Math.round((state.correct / answered) * 100) : 0;
  $('#correctCount').textContent = state.correct;
  $('#wrongCount').textContent = state.wrong;
  $('#accuracy').textContent = `${accuracy}%`;

  // Question header
  const tierClass = `t${q.tier}`;
  const tierLabel = `Tier ${q.tier}`;
  const typeLabel = q.type === 'idiom' ? 'イディオム' : '単語';
  $('#questionHeader').innerHTML = `
    <span class="q-num">Q${state.current + 1} / ${total}</span>
    <span>
      <span class="tier-badge ${tierClass}">${tierLabel}</span>
      ${q.type === 'idiom' ? `<span class="type-badge">${typeLabel}</span>` : ''}
    </span>
  `;

  // Sentence (日本語訳は非表示)
  const sentenceHtml = q.sentence.replace(/\(\s*\)/g, '<span class="blank">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>');
  let cardHtml = `
    <div class="sentence-en">${sentenceHtml}</div>
    <div class="sentence-ja" id="sentenceJa" style="display:none">${q.sentence_ja}</div>
  `;

  // Idiom hint
  if (q.type === 'idiom' && q.idiom) {
    const idiomDisplay = q.idiom.replace(q.answer, '(    )');
    cardHtml += `
      <div class="idiom-hint">
        💡 イディオム: <span class="idiom-word">${idiomDisplay}</span>
        → ${q.idiom_translation || q.answer_translation}
      </div>
    `;
  }

  const sentenceCard = $('#sentenceCard');
  sentenceCard.innerHTML = cardHtml;
  sentenceCard.classList.add('fade-in');

  // Choices（日本語訳は非表示）
  const choicesEl = $('#choices');
  const choices = q._shuffledChoices;
  choicesEl.innerHTML = choices.map((c, i) => {
    const jpText = c.translation ? `<div class="choice-jp" style="display:none">${c.translation}</div>` : '';
    return `<button class="choice-btn fade-in" data-idx="${i}" style="animation-delay: ${i * 0.05}s">
      <span class="choice-num">${i + 1}</span>
      <div class="choice-text">
        ${c.word}
        ${jpText}
      </div>
    </button>`;
  }).join('');

  choicesEl.querySelectorAll('.choice-btn').forEach(btn => {
    on(btn, 'click', () => handleAnswer(parseInt(btn.dataset.idx)));
  });

  // Hint button
  updateHintButton();

  // Hide next btn
  $('#nextBtn').style.display = 'none';
}

function updateHintButton() {
  const hintBtn = $('#hintBtn');
  if (!hintBtn) return;

  if (state.hintStage === 0) {
    hintBtn.textContent = '💡 ヒント①：例文の日本語訳';
    hintBtn.style.display = 'block';
    hintBtn.className = 'hint-btn';
  } else if (state.hintStage === 1) {
    hintBtn.textContent = '💡 ヒント②：選択肢の日本語訳';
    hintBtn.style.display = 'block';
    hintBtn.className = 'hint-btn hint-stage2';
  } else {
    hintBtn.style.display = 'none';
  }
}

function showHint() {
  if (state.answered) return;

  state.hintStage++;

  if (state.hintStage === 1) {
    // 第1段階: 例文の日本語訳を表示
    const ja = $('#sentenceJa');
    if (ja) {
      ja.style.display = 'block';
      ja.classList.add('fade-in');
    }
  } else if (state.hintStage >= 2) {
    // 第2段階: 選択肢の日本語訳を表示
    $$('.choice-jp').forEach(el => {
      el.style.display = 'block';
      el.classList.add('fade-in');
    });
  }

  updateHintButton();
}

function handleAnswer(idx) {
  if (state.answered) return;
  state.answered = true;

  const q = state.questions[state.current];
  const choices = q._shuffledChoices;
  const selected = choices[idx];
  const isCorrect = selected.correct;

  if (isCorrect) {
    state.correct++;
  } else {
    state.wrong++;
    state.mistakes.push({
      question: q,
      yourAnswer: selected.word,
    });
  }

  // Visual feedback
  const btns = $$('.choice-btn');
  btns.forEach((btn, i) => {
    btn.classList.add('answered');
    if (choices[i].correct) {
      btn.classList.add('correct');
      if (isCorrect) btn.classList.add('pop');
    } else if (i === idx) {
      btn.classList.add('wrong', 'shake');
    } else {
      btn.classList.add('dimmed');
    }
  });

  // 回答後: 全ての日本語訳を表示
  const ja = $('#sentenceJa');
  if (ja) ja.style.display = 'block';
  $$('.choice-jp').forEach(el => { el.style.display = 'block'; });
  // ヒントボタンを非表示
  const hintBtn = $('#hintBtn');
  if (hintBtn) hintBtn.style.display = 'none';

  // Update blank with answer
  const blank = $('#sentenceCard').querySelector('.blank');
  if (blank) {
    blank.textContent = q.answer;
    blank.style.borderColor = isCorrect ? 'var(--success)' : 'var(--danger)';
    blank.style.color = isCorrect ? 'var(--success)' : 'var(--danger)';
  }

  // Update score bar
  const answered = state.correct + state.wrong;
  const accuracy = answered > 0 ? Math.round((state.correct / answered) * 100) : 0;
  $('#correctCount').textContent = state.correct;
  $('#wrongCount').textContent = state.wrong;
  $('#accuracy').textContent = `${accuracy}%`;

  // Show next button
  const nextBtn = $('#nextBtn');
  if (state.current < state.questions.length - 1) {
    nextBtn.textContent = '次の問題 →';
  } else {
    nextBtn.textContent = '結果を見る 🏆';
  }
  nextBtn.style.display = 'block';
  nextBtn.classList.add('fade-in');

  // 音声再生
  playAnswerAudio(q);
}

// ====== Audio Playback ======
let currentAudio = null;

function playAnswerAudio(q) {
  if (!q.audioHash) return;
  
  const url = `audio/${q.audioHash}.mp3`;
  
  // スピーカーボタンを追加
  const card = $('#sentenceCard');
  if (card && !card.querySelector('.audio-btn')) {
    const btn = document.createElement('button');
    btn.className = 'audio-btn fade-in';
    btn.innerHTML = '🔊';
    btn.title = '音声を再生';
    btn.onclick = () => playAudioFile(url);
    card.appendChild(btn);
  }
  
  // 自動再生
  setTimeout(() => playAudioFile(url), 300);
}

function playAudioFile(url) {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  currentAudio = new Audio(url);
  currentAudio.play().catch(() => {
    // autoplay blocked - user can tap the speaker button
  });
}

function nextQuestion() {
  state.current++;
  if (state.current >= state.questions.length) {
    showResult();
  } else {
    renderQuestion();
  }
}

// ====== Result Screen ======
function showResult() {
  showScreen('result');

  // ストリーク記録
  const streakData = recordTraining();

  const total = state.questions.length;
  const correct = state.correct;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  let message = '';
  let messageStyle = '';
  if (accuracy === 100) {
    message = '🏆 パーフェクト！完璧です！';
    messageStyle = 'background: var(--success-glow); color: var(--success);';
  } else if (accuracy >= 80) {
    message = '🌟 素晴らしい！よく頑張りました！';
    messageStyle = 'background: var(--primary-glow); color: var(--primary-light);';
  } else if (accuracy >= 60) {
    message = '💪 いい調子！もう少し頑張ろう！';
    messageStyle = 'background: var(--warning-glow); color: var(--warning);';
  } else {
    message = '📚 復習してもう一度挑戦しよう！';
    messageStyle = 'background: var(--danger-glow); color: var(--danger);';
  }

  const gradeLabel = { g1: '中学1年', g2: '中学2年', g3: '中学3年' }[state.grade] || '';
  const tierLabel = state.tier === 'all' ? '全Tier' : `Tier ${state.tier}`;

  let mistakesHtml = '';
  if (state.mistakes.length > 0) {
    mistakesHtml = `
      <div class="mistakes-section">
        <h3>❌ 間違えた問題 (${state.mistakes.length}問)</h3>
        ${state.mistakes.map(m => {
          const sentenceHighlighted = m.question.sentence.replace(
            /\(\s*\)/g,
            `<strong style="color:var(--success)">${m.question.answer}</strong>`
          );
          return `<div class="mistake-item">
            <div class="mistake-sentence">${sentenceHighlighted}</div>
            <div class="mistake-answer">✅ ${m.question.answer}${m.question.answer_translation ? ` (${m.question.answer_translation})` : ''}</div>
            <div class="mistake-yours">あなたの回答: ${m.yourAnswer}</div>
          </div>`;
        }).join('')}
      </div>
    `;
  }

  $('#resultScreen').innerHTML = `
    <div class="header">
      <h1>☀️ Sunshine 英単語クイズ</h1>
      <p>${gradeLabel} · ${tierLabel}</p>
    </div>
    <div class="result-card slide-up">
      <div class="result-score">${accuracy}%</div>
      <div class="result-label">正答率</div>
      <div class="result-message" style="${messageStyle}">${message}</div>
      <div class="result-stats">
        <div class="result-stat s-correct">
          <div class="value">${correct}</div>
          <div class="label">正解</div>
        </div>
        <div class="result-stat s-wrong">
          <div class="value">${state.wrong}</div>
          <div class="label">不正解</div>
        </div>
        <div class="result-stat s-total">
          <div class="value">${total}</div>
          <div class="label">問題数</div>
        </div>
      </div>
      <div class="result-actions">
        <button class="retry-btn" onclick="retryQuiz()">🔄 もう一度</button>
        ${state.mistakes.length > 0 ? '<button class="retry-mistakes-btn" onclick="retryMistakes()">📝 間違えた問題だけ</button>' : ''}
        <button class="home-btn" onclick="goHome()">🏠 ホームへ</button>
      </div>
      ${mistakesHtml}
    </div>
  `;

  // ストリークバッジ更新&マイルストーンチェック
  renderStreakBadge();
  setTimeout(() => checkMilestone(streakData), 800);
}

function retryQuiz() {
  startQuiz();
}

function retryMistakes() {
  if (state.mistakes.length === 0) return;

  // ミスした問題だけでクイズを構成
  const questions = state.mistakes.map(m => m.question);

  // シャッフル
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  // 選択肢も再シャッフル
  questions.forEach(q => {
    q._shuffledChoices = [...q.choices].sort(() => Math.random() - 0.5);
  });

  state.questions = questions;
  state.current = 0;
  state.correct = 0;
  state.wrong = 0;
  state.mistakes = [];
  state.answered = false;

  showScreen('quiz');
  renderQuestion();
}

function goHome() {
  showScreen('setup');
}

// ====== Help Manual ======
function showHelp() {
  const overlay = document.createElement('div');
  overlay.className = 'help-overlay';
  overlay.id = 'helpModal';
  overlay.innerHTML = `
    <div class="help-modal slide-up">
      <div class="help-header">
        <h2>📖 使い方ガイド</h2>
        <button class="help-close-x" onclick="closeHelp()">×</button>
      </div>
      <div class="help-body">
        <div class="help-section">
          <h3>🎯 クイズの始め方</h3>
          <ol>
            <li><strong>学年を選択</strong>：中学1年・2年・3年から選ぶ</li>
            <li><strong>出題範囲を絞る</strong>（任意）：ProgramやLet's Readなどセクションをタップして選択</li>
            <li><strong>ページ指定</strong>（任意）：教科書のページ番号で範囲を指定</li>
            <li><strong>Tierフィルター</strong>：難易度で絞り込み</li>
            <li><strong>クイズ開始</strong>をタップ！</li>
          </ol>
        </div>

        <div class="help-section">
          <h3>💡 Tier（難易度）について</h3>
          <ul>
            <li><span class="help-tier t1">Tier 1</span> 基本語彙（必須！）</li>
            <li><span class="help-tier t2">Tier 2</span> 標準語彙（テスト頻出）</li>
            <li><span class="help-tier t3">Tier 3</span> 発展語彙（チャレンジ）</li>
          </ul>
        </div>

        <div class="help-section">
          <h3>❓ クイズ画面の操作</h3>
          <ul>
            <li><strong>4つの選択肢</strong>から正しい答えを選ぶ</li>
            <li><strong>💡 ヒントボタン</strong>をタップすると：
              <br>① 例文の日本語訳が表示
              <br>② 選択肢の日本語訳が表示</li>
            <li><strong>🔊 スピーカー</strong>：解答後に例文の音声を再生</li>
            <li><strong>🏠</strong>：ホームに戻る</li>
          </ul>
        </div>

        <div class="help-section">
          <h3>📊 結果画面</h3>
          <ul>
            <li><strong>🔄 もう一度</strong>：同じ設定で再チャレンジ</li>
            <li><strong>📝 間違えた問題だけ</strong>：ミスした問題だけで復習</li>
            <li><strong>🏠 ホームへ</strong>：設定画面に戻る</li>
          </ul>
        </div>

        <div class="help-section">
          <h3>🔥 連続トレーニング</h3>
          <p>毎日クイズを完了すると連続日数がカウントされます。</p>
          <ul>
            <li><strong>20日・40日・60日...</strong> 達成でお祝い画面が出ます！</li>
            <li>📸 スクリーンショットを保存して先生に見せると<strong>プレゼント</strong>がもらえます！</li>
          </ul>
        </div>
      </div>
      <button class="help-close-btn" onclick="closeHelp()">閉じる</button>
    </div>`;
  
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
}

function closeHelp() {
  const modal = $('#helpModal');
  if (modal) {
    modal.classList.remove('show');
    setTimeout(() => modal.remove(), 300);
  }
}

// ====== Screen Management ======
function showScreen(name) {
  $('#setupScreen').style.display = name === 'setup' ? 'block' : 'none';
  $('#quizScreen').style.display = name === 'quiz' ? 'block' : 'none';
  $('#resultScreen').style.display = name === 'result' ? 'block' : 'none';
  window.scrollTo(0, 0);
}

// ====== Init ======
async function init() {
  // Show loading
  $('#app').innerHTML = `
    <div class="header">
      <h1>☀️ Sunshine 英単語クイズ</h1>
      <p>データを読み込んでいます...</p>
    </div>
    <div class="loading">
      <div class="spinner"></div>
      読み込み中...
    </div>
  `;

  await loadData();

  // Restore HTML
  $('#app').innerHTML = `
    <div class="setup-screen" id="setupScreen">
      <div class="header">
        <h1>☀️ Sunshine 英単語クイズ</h1>
        <p>開隆堂サンシャイン中学英語 · 4択空所補充</p>
        <button class="help-btn" onclick="showHelp()">❓ 使い方</button>
      </div>
      <div class="streak-badge" id="streakBadge"></div>
      <div class="setup-card">
        <h2>📚 学年を選択</h2>
        <div class="grade-btns" id="gradeBtns"></div>

        <h2>📄 出題範囲</h2>
        <div class="section-chips" id="sectionChips">
          <div style="color:var(--text-dim);font-size:0.75rem;padding:0.5rem 0">学年を選択してください</div>
        </div>
        <div class="page-range">
          <label>📃 ページ指定 <span class="page-range-info" id="pageRangeInfo"></span></label>
          <div class="page-range-inputs">
            <input type="number" id="pageStart" placeholder="開始" min="1" max="200">
            <span class="page-range-sep">〜</span>
            <input type="number" id="pageEnd" placeholder="終了" min="1" max="200">
          </div>
        </div>

        <h2>🏷️ Tier フィルター</h2>
        <div class="tier-btns" id="tierBtns"></div>

        <h2>⚙️ 出題設定</h2>
        <div class="config-row">
          <div class="config-item">
            <label>📦 問題数</label>
            <select id="questionCount">
              <option value="10">10問</option>
              <option value="20" selected>20問</option>
              <option value="30">30問</option>
              <option value="50">50問</option>
              <option value="0">全問</option>
            </select>
          </div>
          <div class="config-item">
            <label>🔀 出題順</label>
            <select id="questionOrder">
              <option value="random" selected>ランダム</option>
              <option value="sequential">順番通り</option>
            </select>
          </div>
        </div>
        <div class="config-row">
          <div class="config-item">
            <label>📖 タイプ</label>
            <select id="questionType">
              <option value="all" selected>すべて</option>
              <option value="word">単語のみ</option>
              <option value="idiom">イディオムのみ</option>
            </select>
          </div>
        </div>

        <div class="summary-badge" id="summaryBadge">
          <div class="stat">📝 対象: <strong id="matchCount">0</strong>問</div>
          <div class="stat">🎯 出題: <strong id="pickCount">0</strong>問</div>
        </div>
        <button class="start-btn" id="startBtn" disabled>🚀 クイズ開始</button>
      </div>
    </div>
    <div class="quiz-screen" id="quizScreen">
      <div class="score-bar" id="scoreBar">
        <button class="quiz-home-btn" onclick="goHome()" title="ホームに戻る">🏠</button>
        <span>⭕ <span class="correct-count" id="correctCount">0</span></span>
        <span class="accuracy" id="accuracy">0%</span>
        <span>❌ <span class="wrong-count" id="wrongCount">0</span></span>
      </div>
      <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
      <div class="question-header" id="questionHeader"></div>
      <div class="sentence-card" id="sentenceCard"></div>
      <div class="choices" id="choices"></div>
      <button class="hint-btn" id="hintBtn" onclick="showHint()">💡 ヒント①：例文の日本語訳</button>
      <button class="next-btn" id="nextBtn">次の問題 →</button>
    </div>
    <div class="result-screen" id="resultScreen"></div>
  `;

  initSetup();
  renderStreakBadge();
  showScreen('setup');
}

document.addEventListener('DOMContentLoaded', init);
