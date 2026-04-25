// ============ STATE ============
let THEMES = [], PETS = [], CHARACTERS = [];
let VIDEO_CATEGORIES = [], VIDEOS = [];

let state = {
  view: 'map',
  currentLevel: null,
  currentTheme: null,
  currentLevelIdx: 0,
  currentStep: 0,
  speakIdx: 0,
  tempScore: { read: false, speak: 0, quiz: false },
  lastEarned: 0,
  progress: {},
  expandedThemes: {},
  apiKey: '',
  geminiKey: '',
  groqKey: '',
  aiProvider: 'claude',
  currentChar: null,
  chatHistory: [],
  loadError: null,
  // Flashcards
  flashcards: [],
  flashIdx: 0,
  flashFlipped: false,
  flashThemeId: null,
  // Listening
  listenItems: [],
  listenIdx: 0,
  listenFeedback: null,
  // Spelling
  spellWord: null,
  spellSlots: [],
  spellLetters: [],
  spellThemeId: null,
  // Stats
  totalWordsLearned: 0,
  totalSpoken: 0,
  totalQuizCorrect: 0,
  // Videos
  videoCategory: 'songs',
  currentVideo: null,
  videoCompleted: {},
  videoSpeed: 1,
  videoStep: 'watch',
  videoQuizFeedback: null,
  videoQuizScore: 0,
  videoQuizIdx: 0,
  // Vocab book
  vocabBook: [],
  // Daily review
  reviewStory: null,
  reviewLoading: false,
  // AI generated level
  aiGenTopic: '',
  aiGenLoading: false,
  aiGenResult: null,
  // Chat visualization
  chatLoading: false,
  chatJustReplied: false
};

// ============ STORAGE ============
try {
  const saved = localStorage.getItem('ea-progress-v2');
  if (saved) state.progress = JSON.parse(saved);
  const key = localStorage.getItem('ea-api-key');
  if (key) state.apiKey = key;
  const gKey = localStorage.getItem('ea-gemini-key');
  if (gKey) state.geminiKey = gKey;
  const grKey = localStorage.getItem('ea-groq-key');
  if (grKey) state.groqKey = grKey;
  const provider = localStorage.getItem('ea-provider');
  if (provider) state.aiProvider = provider;
  const stats = localStorage.getItem('ea-stats');
  if (stats) {
    const s = JSON.parse(stats);
    state.totalWordsLearned = s.totalWordsLearned || 0;
    state.totalSpoken = s.totalSpoken || 0;
    state.totalQuizCorrect = s.totalQuizCorrect || 0;
  }
  const vb = localStorage.getItem('ea-vocab-book');
  if (vb) state.vocabBook = JSON.parse(vb);
  const vc = localStorage.getItem('ea-video-completed');
  if (vc) state.videoCompleted = JSON.parse(vc);
} catch(e) {}

function saveProgress() { try { localStorage.setItem('ea-progress-v2', JSON.stringify(state.progress)); } catch(e) {} }
function saveApiKey() { try { localStorage.setItem('ea-api-key', state.apiKey); } catch(e) {} }
function saveGeminiKey() { try { localStorage.setItem('ea-gemini-key', state.geminiKey); } catch(e) {} }
function saveGroqKey() { try { localStorage.setItem('ea-groq-key', state.groqKey); } catch(e) {} }
function saveProvider() { try { localStorage.setItem('ea-provider', state.aiProvider); } catch(e) {} }
function saveVocabBook() { try { localStorage.setItem('ea-vocab-book', JSON.stringify(state.vocabBook)); } catch(e) {} }
function saveVideoCompleted() { try { localStorage.setItem('ea-video-completed', JSON.stringify(state.videoCompleted)); } catch(e) {} }
function saveStats() {
  try {
    localStorage.setItem('ea-stats', JSON.stringify({
      totalWordsLearned: state.totalWordsLearned,
      totalSpoken: state.totalSpoken,
      totalQuizCorrect: state.totalQuizCorrect
    }));
  } catch(e) {}
}

// ============ HELPERS ============
function levelKey(themeId, idx) { return themeId + '-' + idx; }
function totalStars() { return Object.values(state.progress).reduce((s, l) => s + (l.stars || 0), 0); }
function totalCompleted() { return Object.values(state.progress).filter(p => p.completed).length; }
function totalLevels() { return THEMES.reduce((s, t) => s + t.levels.length, 0); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function shuffle(arr) { const a = [...arr]; for (let i = a.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }

// ============ AUDIO (TTS + simple sound effects) ============
function speak(text, rate) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = rate || 0.9;
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('google'))
    || voices.find(v => v.lang === 'en-US')
    || voices.find(v => v.lang.startsWith('en'));
  if (enVoice) u.voice = enVoice;
  window.speechSynthesis.speak(u);
}
if ('speechSynthesis' in window) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

// Web Audio API 簡易音效
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  return audioCtx;
}
function playTone(freq, duration, type) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  gain.gain.value = 0.15;
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.stop(ctx.currentTime + duration);
}
function sfxCorrect() { playTone(523, 0.1); setTimeout(() => playTone(784, 0.2), 100); }
function sfxWrong() { playTone(220, 0.3, 'sawtooth'); }
function sfxClick() { playTone(800, 0.05); }
function sfxStar() { playTone(659, 0.1); setTimeout(() => playTone(784, 0.1), 80); setTimeout(() => playTone(988, 0.2), 160); }

// ============ CONFETTI ============
function fireConfetti() {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const colors = ['#F09595','#FAC775','#97C459','#85B7EB','#AFA9EC','#E24B4A','#5DCAA5'];
  const particles = [];
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: canvas.width/2, y: canvas.height/3,
      vx: (Math.random()-0.5)*15, vy: Math.random()*-15-5,
      size: Math.random()*8+4, color: colors[Math.floor(Math.random()*colors.length)],
      rot: Math.random()*Math.PI*2, vrot: (Math.random()-0.5)*0.3, life: 1
    });
  }
  let frame = 0;
  function tick() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.4; p.rot += p.vrot;
      p.life -= 0.012;
      if (p.life > 0) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        ctx.restore();
      }
    });
    frame++;
    if (frame < 120) requestAnimationFrame(tick);
    else canvas.remove();
  }
  tick();
}

// ============ RENDER ============
function render() {
  const app = document.getElementById('app');
  if (state.loadError) {
    app.innerHTML = '<div class="error-banner">⚠️ ' + state.loadError + '</div>';
    return;
  }
  let html = renderHeader() + renderNav();
  switch (state.view) {
    case 'map': html += renderMap(); break;
    case 'level': html += renderLevel(); break;
    case 'reward': html += renderReward(); break;
    case 'chat': html += renderChatMenu(); break;
    case 'chatActive': html += renderChat(); break;
    case 'flashHome': html += renderFlashHome(); break;
    case 'flash': html += renderFlash(); break;
    case 'listenHome': html += renderListenHome(); break;
    case 'listen': html += renderListen(); break;
    case 'spellHome': html += renderSpellHome(); break;
    case 'spell': html += renderSpell(); break;
    case 'stats': html += renderStats(); break;
    case 'videos': html += renderVideos(); break;
    case 'videoPlay': html += renderVideoPlay(); break;
    case 'vocabBook': html += renderVocabBook(); break;
    case 'review': html += renderReview(); break;
    case 'settings': html += renderSettings(); break;
    case 'aiGen': html += renderAiGen(); break;
  }
  app.innerHTML = html;
  attachHandlers();
}

function renderHeader() {
  return '<div class="header">' +
    '<h1 class="title">🗺️ English Adventure</h1>' +
    '<div class="stats">' +
      '<div class="stat-pill" id="stat-stars">⭐ ' + totalStars() + '</div>' +
      '<div class="stat-pill">🏆 ' + totalCompleted() + '/' + totalLevels() + '</div>' +
    '</div></div>';
}

function renderNav() {
  const subViews = ['level','reward','chatActive','flash','listen','spell','videoPlay'];
  if (subViews.includes(state.view)) return '';
  const tab = (id, icon, label) =>
    '<button class="nav-tab ' + (state.view === id ? 'active' : '') + '" data-nav="' + id + '">' + icon + ' ' + label + '</button>';
  return '<div class="nav-tabs">' +
    tab('map','🗺️','闖關') +
    tab('videos','🎬','影片') +
    tab('flashHome','📇','單字卡') +
    tab('listenHome','👂','聽力') +
    tab('spellHome','🔤','拼字') +
    tab('vocabBook','📔','單字本') +
    tab('review','📰','複習') +
    tab('chat','💬','AI對話') +
    tab('aiGen','🪄','AI出題') +
    tab('stats','📊','統計') +
    tab('settings','⚙️','設定') +
  '</div>';
}

// ============ MAP ============
function renderMap() {
  let prevDone = true;
  let html = '';
  THEMES.forEach((theme, tIdx) => {
    const expanded = state.expandedThemes[theme.id];
    const themeCompleted = theme.levels.filter((_, i) => {
      const p = state.progress[levelKey(theme.id, i)];
      return p && p.completed;
    }).length;
    const pct = Math.round(themeCompleted / theme.levels.length * 100);

    let levelsHtml = '';
    theme.levels.forEach((lvl, idx) => {
      const key = levelKey(theme.id, idx);
      const prog = state.progress[key] || {};
      const locked = !prevDone;
      const stars = prog.stars || 0;
      const starDisplay = locked ? '' : (stars > 0 ? '⭐'.repeat(stars) + '☆'.repeat(3-stars) : '☆☆☆');
      levelsHtml += '<div class="island ' + (locked ? 'locked' : '') + ' ' + (prog.completed ? 'completed' : '') + '"' +
        ' data-theme="' + theme.id + '" data-idx="' + idx + '">' +
        '<div class="island-icon">' + (locked ? '🔒' : lvl.icon) + '</div>' +
        '<div class="island-num">' + (tIdx + 1) + '-' + (idx + 1) + '</div>' +
        '<div class="island-stars">' + starDisplay + '</div>' +
      '</div>';
      prevDone = !!prog.completed;
    });

    html += '<div class="theme-section">' +
      '<div class="theme-header" data-theme-toggle="' + theme.id + '">' +
        '<div class="theme-title">' + theme.name + '</div>' +
        '<div class="theme-meta">' +
          '<div class="theme-bar"><div class="theme-bar-fill" style="width:' + pct + '%"></div></div>' +
          '<span>' + themeCompleted + '/' + theme.levels.length + '</span>' +
          '<span>' + (expanded ? '▼' : '▶') + '</span>' +
        '</div>' +
      '</div>' +
      (expanded ? '<div class="levels-grid">' + levelsHtml + '</div>' : '') +
    '</div>';
  });

  // Pets
  const stars = totalStars();
  let petsHtml = '';
  PETS.forEach(p => {
    const unlocked = stars >= p.stars;
    petsHtml += '<div class="pet ' + (unlocked ? 'unlocked' : 'locked') + '">' +
      '<span class="pet-icon">' + (unlocked ? p.icon : '❓') + '</span>' +
      '<span class="pet-name">' + p.name + '</span><br>' +
      '<span class="small-text">' + p.stars + '⭐</span>' +
    '</div>';
  });
  html += '<div class="pets-section">' +
    '<div style="font-weight:700; font-size:16px;">🎁 我的寵物收藏</div>' +
    '<div class="small-text" style="margin-top:4px;">收集星星解鎖寵物！</div>' +
    '<div class="pets-grid">' + petsHtml + '</div>' +
  '</div>';
  return html;
}

// ============ LEVEL ============
function renderLevel() {
  const lvl = state.currentLevel;
  const theme = THEMES.find(t => t.id === state.currentTheme);
  const useChinese = theme.useChinese;
  const tabs = useChinese
    ? ['📖 讀故事', '🎤 跟著念', '🎯 小測驗']
    : ['📖 Read', '🎤 Speak', '🎯 Quiz'];
  const tabsHtml = tabs.map((t, i) => {
    let cls = '';
    if (i === state.currentStep) cls = 'active';
    else if (i < state.currentStep) cls = 'done';
    return '<div class="step-tab ' + cls + '">' + t + '</div>';
  }).join('');

  let body = '';
  if (state.currentStep === 0) body = renderRead(lvl, useChinese);
  else if (state.currentStep === 1) body = renderSpeak(lvl, useChinese);
  else if (state.currentStep === 2) body = renderQuiz(lvl, useChinese);

  const titleDisplay = lvl.titleCn && useChinese
    ? lvl.title + ' <span class="small-text">(' + lvl.titleCn + ')</span>'
    : lvl.title;

  return '<div class="screen">' +
    '<button class="back-btn" id="back-btn">← ' + (useChinese ? '回地圖' : 'Back to map') + '</button>' +
    '<div class="level-header">' +
      '<div class="level-icon">' + lvl.icon + '</div>' +
      '<div class="level-name">' + titleDisplay + '</div>' +
    '</div>' +
    '<div class="step-tabs">' + tabsHtml + '</div>' +
    body +
  '</div>';
}

function renderRead(lvl, useChinese) {
  const storyHtml = lvl.story.map((sentence, sIdx) => {
    const words = sentence.split(' ').map(w =>
      '<span class="word" data-word="' + w.replace(/[.,!?]/g,'') + '">' + w + '</span>'
    ).join(' ');
    return '<div style="margin-bottom:6px;">' + words + ' <button class="btn btn-secondary btn-small" data-sentence-idx="' + sIdx + '">🔊</button></div>';
  }).join('');
  // Vocab section
  let vocabHtml = '';
  if (lvl.vocab && lvl.vocab.length) {
    vocabHtml = '<div style="margin-top:14px; padding:14px; background:#FAFAF7; border-radius:14px;">' +
      '<div style="font-weight:600; font-size:13px; margin-bottom:8px;">📝 ' + (useChinese ? '本關單字（點 ☆ 收藏）' : 'Words to learn (tap ☆ to save)') + '</div>' +
      '<div class="video-vocab-list">' +
        lvl.vocab.map(vc => {
          const inBook = state.vocabBook.some(x => x.en === vc[0]);
          return '<div class="video-vocab-chip ' + (inBook ? 'saved' : '') + '" data-vocab-en="' + escapeHtml(vc[0]) + '" data-vocab-cn="' + escapeHtml(vc[1]) + '" data-vocab-source="' + escapeHtml(lvl.title) + '">' +
            '<b>' + vc[0] + '</b> ' + vc[1] + ' ' + (inBook ? '★' : '☆') +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }
  return '<div class="hint">' + (useChinese ? '點任何單字聽發音 · 點 🔊 聽整句' : 'Tap any word to hear it · tap 🔊 to hear the sentence') + '</div>' +
    '<div class="story-box">' + storyHtml + '</div>' +
    vocabHtml +
    '<div class="controls">' +
      '<button class="btn btn-secondary" id="read-all">🔊 ' + (useChinese ? '念整篇' : 'Read all') + '</button>' +
      '<button class="btn btn-success" id="read-done">' + (useChinese ? '看完了，下一步' : 'Done, next step') + ' →</button>' +
    '</div>';
}

function renderSpeak(lvl, useChinese) {
  const sentence = lvl.story[state.speakIdx];
  const total = lvl.story.length;
  const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  return '<div class="hint">' + (useChinese ? '跟著念這個句子 · 第 ' + (state.speakIdx + 1) + ' / ' + total + ' 句' : 'Repeat · ' + (state.speakIdx + 1) + ' / ' + total) + '</div>' +
    '<div class="speak-box">' +
      '<div class="target-sentence">' + sentence + '</div>' +
      '<div class="speak-buttons-row">' +
        '<button class="speak-listen-btn" id="listen-btn" title="' + (useChinese ? '聽範例' : 'Listen') + '">' +
          '<span style="font-size:32px;">🔊</span>' +
          '<span style="font-size:12px; margin-top:4px;">' + (useChinese ? '聽範例' : 'Listen') + '</span>' +
        '</button>' +
        (supported
          ? '<button class="mic-btn" id="mic-btn" title="' + (useChinese ? '按麥克風開始錄音' : 'Tap to record') + '">' +
              '<span style="font-size:32px;">🎤</span>' +
              '<span style="font-size:12px; margin-top:4px;">' + (useChinese ? '錄音' : 'Record') + '</span>' +
            '</button>'
          : '<div class="hint">' + (useChinese ? '此瀏覽器不支援錄音' : 'Recording not supported') + '</div>') +
      '</div>' +
      '<div id="speak-result"></div>' +
    '</div>' +
    '<div class="controls"><button class="btn btn-secondary" id="skip">' + (useChinese ? '我念好了' : 'Done') + ' →</button></div>';
}

function renderQuiz(lvl, useChinese) {
  const q = lvl.quiz;
  const qDisplay = useChinese && q.qCn ? q.q + '<br><span class="small-text">' + q.qCn + '</span>' : q.q;
  const opts = q.options.map((o, i) => '<button class="option" data-idx="' + i + '">' + o + '</button>').join('');
  return '<div class="quiz-q">' + qDisplay + '</div>' +
    '<div class="options">' + opts + '</div>' +
    '<div id="quiz-feedback" style="text-align:center; margin-top:14px; min-height:24px; font-weight:600;"></div>';
}

function renderReward() {
  const stars = state.lastEarned;
  const starStr = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  const messages = ['不錯喔！繼續加油 💪', '很棒！表現很好 🎉', '太厲害了！滿星過關 🌟'];
  const total = totalStars();
  let unlock = '';
  PETS.forEach(p => {
    if (total >= p.stars && total - stars < p.stars) {
      unlock = '<div class="unlock-banner">🎉 解鎖新寵物：' + p.icon + ' ' + p.name + '！</div>';
    }
  });
  return '<div class="screen"><div class="reward">' +
    '<div class="reward-icon">' + state.currentLevel.icon + '</div>' +
    '<div class="reward-title">' + messages[stars-1] + '</div>' +
    '<div class="reward-stars">' + starStr + '</div>' +
    '<div class="small-text">關卡完成 · 累積 ' + total + ' ⭐</div>' +
    unlock +
    '<div style="margin-top:24px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">' +
      '<button class="btn btn-secondary" id="back-map">回地圖</button>' +
      '<button class="btn" id="next-level">下一關 →</button>' +
    '</div>' +
  '</div></div>';
}

// ============ FLASHCARDS ============
function renderFlashHome() {
  const themes = THEMES.map(t => {
    const wordCount = t.levels.reduce((s, l) => s + (l.vocab||[]).length, 0);
    return '<div class="feature-card" data-flash-theme="' + t.id + '">' +
      '<div class="feature-icon">' + t.name.split(' ')[0] + '</div>' +
      '<div class="feature-title">' + t.name.split(' ').slice(1).join(' ') + '</div>' +
      '<div class="feature-desc">' + wordCount + ' 個單字</div>' +
    '</div>';
  }).join('');
  return '<div class="screen">' +
    '<h2 style="margin-bottom:8px;">📇 單字卡練習</h2>' +
    '<div class="hint" style="text-align:left;">選一個主題，翻牌學單字。點卡片翻面，再點 🔊 聽發音。</div>' +
    '<div class="feature-grid">' + themes + '</div>' +
    '<div class="feature-card" data-flash-theme="all" style="margin-top:8px;">' +
      '<div class="feature-icon">🌈</div>' +
      '<div class="feature-title">混合所有主題</div>' +
      '<div class="feature-desc">隨機抽考</div>' +
    '</div>' +
  '</div>';
}

function startFlashcards(themeId) {
  let words = [];
  if (themeId === 'all') {
    THEMES.forEach(t => t.levels.forEach(l => (l.vocab||[]).forEach(v => words.push(v))));
  } else {
    const t = THEMES.find(x => x.id === themeId);
    t.levels.forEach(l => (l.vocab||[]).forEach(v => words.push(v)));
  }
  state.flashcards = shuffle(words);
  state.flashIdx = 0;
  state.flashFlipped = false;
  state.flashThemeId = themeId;
  state.view = 'flash';
  render();
  setTimeout(() => speak(state.flashcards[0][0], 0.85), 300);
}

function renderFlash() {
  const card = state.flashcards[state.flashIdx];
  if (!card) return '<div class="screen">No cards</div>';
  return '<div class="screen flashcard-screen">' +
    '<button class="back-btn" id="back-flashhome">← 換主題</button>' +
    '<div class="flashcard-header">' +
      '<div class="flashcard-progress">' + (state.flashIdx + 1) + ' / ' + state.flashcards.length + '</div>' +
      '<button class="btn btn-secondary btn-small" id="flash-shuffle">🔀 重新洗牌</button>' +
    '</div>' +
    '<div class="flashcard ' + (state.flashFlipped ? 'flipped' : '') + '" id="flashcard">' +
      (state.flashFlipped
        ? '<div class="flashcard-cn">' + card[1] + '</div><div class="flashcard-en" style="margin-top:16px;">' + card[0] + '</div>'
        : '<div class="flashcard-en">' + card[0] + '</div>') +
      '<div class="flashcard-hint">' + (state.flashFlipped ? '點卡片再翻回去' : '點卡片看中文') + '</div>' +
    '</div>' +
    '<div class="flashcard-controls">' +
      '<button class="btn btn-secondary" id="flash-prev">← 上一張</button>' +
      '<button class="btn" id="flash-speak">🔊 聽發音</button>' +
      '<button class="btn btn-success" id="flash-next">下一張 →</button>' +
    '</div>' +
  '</div>';
}

// ============ LISTENING TEST ============
function renderListenHome() {
  return '<div class="screen">' +
    '<h2 style="margin-bottom:8px;">👂 聽力測驗</h2>' +
    '<div class="hint" style="text-align:left;">系統會念一個英文單字，你選出對應的中文意思。</div>' +
    '<div class="feature-grid">' +
      '<div class="feature-card" data-listen-len="10"><div class="feature-icon">🥉</div><div class="feature-title">短測驗</div><div class="feature-desc">10 題 · 暖身</div></div>' +
      '<div class="feature-card" data-listen-len="20"><div class="feature-icon">🥈</div><div class="feature-title">中測驗</div><div class="feature-desc">20 題 · 練功</div></div>' +
      '<div class="feature-card" data-listen-len="30"><div class="feature-icon">🥇</div><div class="feature-title">長測驗</div><div class="feature-desc">30 題 · 挑戰</div></div>' +
    '</div>' +
  '</div>';
}

function startListening(count) {
  const all = [];
  THEMES.forEach(t => t.levels.forEach(l => (l.vocab||[]).forEach(v => all.push(v))));
  const items = shuffle(all).slice(0, count).map(correct => {
    const others = shuffle(all.filter(w => w[1] !== correct[1])).slice(0, 3);
    const opts = shuffle([correct, ...others]);
    return { word: correct[0], correctCn: correct[1], options: opts.map(o => o[1]) };
  });
  state.listenItems = items;
  state.listenIdx = 0;
  state.listenFeedback = null;
  state.listenScore = 0;
  state.view = 'listen';
  render();
  setTimeout(() => speak(items[0].word, 0.85), 400);
}

function renderListen() {
  if (state.listenIdx >= state.listenItems.length) {
    return '<div class="screen reward">' +
      '<div class="reward-icon">🎯</div>' +
      '<div class="reward-title">測驗完成！</div>' +
      '<div style="font-size:24px; font-weight:700; margin:16px;">' + state.listenScore + ' / ' + state.listenItems.length + ' 題答對</div>' +
      '<div style="margin-top:24px;"><button class="btn" id="back-listenhome">回聽力測驗</button></div>' +
    '</div>';
  }
  const item = state.listenItems[state.listenIdx];
  const opts = item.options.map(o => '<button class="option" data-listen-opt="' + escapeHtml(o) + '">' + o + '</button>').join('');
  return '<div class="screen">' +
    '<button class="back-btn" id="back-listenhome">← 結束</button>' +
    '<div class="hint">第 ' + (state.listenIdx + 1) + ' / ' + state.listenItems.length + ' 題 · 答對 ' + state.listenScore + ' 題</div>' +
    '<div class="listen-test">' +
      '<button class="listen-play-btn" id="listen-replay">🔊</button>' +
      '<div class="listen-q">點喇叭再聽一次，選出對應的中文意思</div>' +
    '</div>' +
    '<div class="options">' + opts + '</div>' +
    (state.listenFeedback ? '<div class="result ' + state.listenFeedback.type + '" style="margin-top:14px;">' + state.listenFeedback.text + '</div>' : '') +
  '</div>';
}

// ============ SPELLING ============
function renderSpellHome() {
  return '<div class="screen">' +
    '<h2 style="margin-bottom:8px;">🔤 拼字遊戲</h2>' +
    '<div class="hint" style="text-align:left;">看中文意思跟圖示，把字母按順序排出英文單字。</div>' +
    '<div class="feature-grid">' + THEMES.map(t => {
      const count = t.levels.reduce((s, l) => s + (l.vocab||[]).filter(v => v[0].length <= 8 && !v[0].includes(' ')).length, 0);
      return '<div class="feature-card" data-spell-theme="' + t.id + '">' +
        '<div class="feature-icon">' + t.name.split(' ')[0] + '</div>' +
        '<div class="feature-title">' + t.name.split(' ').slice(1).join(' ') + '</div>' +
        '<div class="feature-desc">' + count + ' 個短單字</div>' +
      '</div>';
    }).join('') + '</div>' +
  '</div>';
}

function startSpelling(themeId) {
  state.spellThemeId = themeId;
  state.spellWordsLeft = [];
  const t = THEMES.find(x => x.id === themeId);
  t.levels.forEach(l => (l.vocab||[]).forEach(v => {
    if (v[0].length <= 8 && !v[0].includes(' ')) state.spellWordsLeft.push(v);
  }));
  state.spellWordsLeft = shuffle(state.spellWordsLeft);
  nextSpellWord();
}

function nextSpellWord() {
  if (state.spellWordsLeft.length === 0) {
    startSpelling(state.spellThemeId);
    return;
  }
  const v = state.spellWordsLeft.shift();
  const word = v[0];
  state.spellWord = { en: word, cn: v[1] };
  state.spellSlots = new Array(word.length).fill('');
  // Letters: word's letters + 2-3 random distractors
  const distractors = [];
  const allLetters = 'abcdefghijklmnopqrstuvwxyz';
  while (distractors.length < Math.min(3, 12 - word.length)) {
    const l = allLetters[Math.floor(Math.random()*26)];
    distractors.push(l);
  }
  state.spellLetters = shuffle([...word.toLowerCase().split(''), ...distractors]).map((l, i) => ({ letter: l, used: false, id: i }));
  state.view = 'spell';
  render();
  setTimeout(() => speak(word, 0.8), 300);
}

function renderSpell() {
  if (!state.spellWord) return '<div class="screen">No word</div>';
  const slotsHtml = state.spellSlots.map((s, i) =>
    '<div class="spell-slot ' + (s ? 'filled' : '') + '" data-slot="' + i + '">' + (s || '') + '</div>'
  ).join('');
  const lettersHtml = state.spellLetters.map(l =>
    '<button class="spell-letter" data-letter-id="' + l.id + '" ' + (l.used ? 'disabled' : '') + '>' + l.letter.toUpperCase() + '</button>'
  ).join('');
  // Find an icon from levels matching this word
  let icon = '✨';
  THEMES.forEach(t => t.levels.forEach(l => {
    if ((l.vocab||[]).some(v => v[0] === state.spellWord.en)) icon = l.icon;
  }));
  return '<div class="screen">' +
    '<button class="back-btn" id="back-spellhome">← 換主題</button>' +
    '<div class="spell-screen">' +
      '<div class="spell-icon">' + icon + '</div>' +
      '<div class="spell-cn">' + state.spellWord.cn + '</div>' +
      '<div class="spell-clue">點字母排出英文單字</div>' +
      '<div class="spell-slots">' + slotsHtml + '</div>' +
      '<div class="spell-letters">' + lettersHtml + '</div>' +
      '<div style="text-align:center; margin-top:18px;">' +
        '<button class="btn btn-secondary btn-small" id="spell-listen">🔊 再聽一次</button> ' +
        '<button class="btn btn-secondary btn-small" id="spell-clear">🔄 清除重來</button> ' +
        '<button class="btn btn-small" id="spell-skip">下一個 →</button>' +
      '</div>' +
      '<div id="spell-feedback" style="text-align:center; min-height:30px; margin-top:14px; font-weight:600;"></div>' +
    '</div>' +
  '</div>';
}

// ============ STATS ============
function renderStats() {
  let totalVocab = 0;
  THEMES.forEach(t => t.levels.forEach(l => totalVocab += (l.vocab||[]).length));
  const themeStats = THEMES.map(t => {
    const done = t.levels.filter((_, i) => state.progress[levelKey(t.id,i)] && state.progress[levelKey(t.id,i)].completed).length;
    const pct = Math.round(done / t.levels.length * 100);
    return { name: t.name, done, total: t.levels.length, pct };
  });
  return '<div class="screen stats-screen">' +
    '<h2 style="margin-bottom:16px;">📊 學習統計</h2>' +
    '<div class="stats-grid">' +
      '<div class="stats-card"><div class="stats-card-num">' + totalCompleted() + '</div><div class="stats-card-label">完成關卡</div></div>' +
      '<div class="stats-card"><div class="stats-card-num">' + totalStars() + '</div><div class="stats-card-label">獲得星星</div></div>' +
      '<div class="stats-card"><div class="stats-card-num">' + state.totalSpoken + '</div><div class="stats-card-label">朗讀次數</div></div>' +
      '<div class="stats-card"><div class="stats-card-num">' + state.totalQuizCorrect + '</div><div class="stats-card-label">答對題數</div></div>' +
    '</div>' +
    '<h3 style="margin:8px 0;">各主題進度</h3>' +
    '<div class="stats-bars">' +
      themeStats.map(s => '<div class="stats-bar-row">' +
        '<div class="stats-bar-label">' + s.name + '</div>' +
        '<div class="stats-bar-bar"><div class="stats-bar-fill" style="width:' + s.pct + '%"></div></div>' +
        '<div class="stats-bar-num">' + s.done + '/' + s.total + '</div>' +
      '</div>').join('') +
    '</div>' +
    '<div style="margin-top:20px; padding:14px; background:#FEF3E2; border-radius:14px; font-size:13px; color:#5F5E5A; line-height:1.7;">' +
      '💡 共 <b>' + totalLevels() + '</b> 關、<b>' + totalVocab + '</b> 個單字可以學。<br>' +
      '繼續加油，每天玩 1-2 關，三個月就能讀完所有故事！' +
    '</div>' +
    '<div style="text-align:center; margin-top:20px;">' +
      '<button class="btn btn-secondary btn-small" id="stats-reset">🗑️ 重置所有進度</button>' +
    '</div>' +
  '</div>';
}

// ============ VIDEOS ============
function renderVideos() {
  const cats = VIDEO_CATEGORIES.map(c =>
    '<button class="video-tab ' + (state.videoCategory === c.id ? 'active' : '') + '" data-vidcat="' + c.id + '">' + c.name + '</button>'
  ).join('');
  const cat = VIDEO_CATEGORIES.find(c => c.id === state.videoCategory);
  const vids = VIDEOS.filter(v => v.category === state.videoCategory);
  const vidsHtml = vids.map(v => {
    const done = state.videoCompleted[v.id];
    const thumb = 'https://img.youtube.com/vi/' + v.youtubeId + '/mqdefault.jpg';
    return '<div class="video-card ' + (done ? 'completed' : '') + '" data-vid="' + v.id + '">' +
      '<img class="video-thumb" src="' + thumb + '" alt="' + escapeHtml(v.title) + '" loading="lazy">' +
      '<div class="video-card-body">' +
        '<div class="video-card-title">' + escapeHtml(v.title) + '</div>' +
        '<div class="video-card-cn">' + escapeHtml(v.titleCn) + '</div>' +
        '<div class="video-card-meta">' +
          '<span class="video-tag">' + v.level + '</span>' +
          '<span>⏱ ' + v.duration + '</span>' +
          (done ? '<span class="video-tag done">✓ 看過</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
  return '<div class="screen">' +
    '<h2 style="margin-bottom:6px;">🎬 影片區</h2>' +
    '<div class="hint" style="text-align:left;">' + (cat ? cat.desc : '') + '</div>' +
    '<div class="video-tabs">' + cats + '</div>' +
    '<div class="video-grid">' + vidsHtml + '</div>' +
    '<div style="margin-top:24px; padding:16px; background:linear-gradient(135deg,#FEF3E2,#FFE5D9); border-radius:14px;">' +
      '<div style="font-weight:700; margin-bottom:6px;">✨ 想看更多影片？</div>' +
      '<div class="small-text" style="margin-bottom:10px;">讓 AI 推薦適合的新影片，家長確認後可以加到 videos.json</div>' +
      '<button class="btn btn-small" id="ai-recommend-videos">✨ 請 AI 推薦影片</button>' +
    '</div>' +
    '<div id="ai-rec-result" style="margin-top:14px;"></div>' +
  '</div>';
}

async function recommendVideos() {
  const hasKey = (state.aiProvider === 'claude' && state.apiKey) || (state.aiProvider === 'gemini' && state.geminiKey) || (state.aiProvider === 'groq' && state.groqKey);
  if (!hasKey) { alert('請先到 ⚙️ 設定 設定 AI 金鑰'); return; }
  const result = document.getElementById('ai-rec-result');
  result.innerHTML = '<div style="padding:20px; text-align:center; color:#5F5E5A;">✨ AI 正在挑選適合的影片...</div>';

  const cat = VIDEO_CATEGORIES.find(c => c.id === state.videoCategory);
  const existing = VIDEOS.filter(v => v.category === state.videoCategory).map(v => v.title).join(', ');
  const catHint = state.videoCategory === 'songs' ? 'English nursery rhymes / kids songs (like Super Simple Songs, Pinkfong, CoComelon)'
    : state.videoCategory === 'stories' ? 'Short English cartoon episodes for kids (like Peppa Pig, Bluey, Maisy Mouse, Charlie and Lola)'
    : 'Educational English videos for kids (alphabet, numbers, phonics, vocabulary, like Alphablocks, Numberblocks, Gracie\'s Corner)';
  const systemPrompt = 'You recommend YouTube videos for kids aged 7-10 learning English. Category: "' + cat.name + '" (' + catHint + '). Avoid these already-included: ' + existing + '. Reply with ONLY a JSON array, no other text, no markdown, no explanations. Each item must have these exact keys: title, titleCn, channel, reason, searchQuery. The reason must be in Traditional Chinese, 15-25 characters. Example output:\n[{"title":"ABC Song","titleCn":"字母歌","channel":"Super Simple Songs","reason":"經典字母歌，發音清楚","searchQuery":"ABC song super simple"}]\nReturn 5 items.';

  try {
    let reply;
    const userMsg = [{ role: 'user', content: 'Recommend 5 videos. Reply with only the JSON array.' }];
    if (state.aiProvider === 'claude') reply = await callClaude(userMsg, systemPrompt);
    else if (state.aiProvider === 'gemini') reply = await callGemini(userMsg, systemPrompt);
    else reply = await callGroq(userMsg, systemPrompt);

    const recs = extractJSON(reply, 'array');
    if (!Array.isArray(recs) || recs.length === 0) throw new Error('AI 沒有回傳有效的影片清單');

    let html = '<div style="padding:16px; background:white; border-radius:14px; box-shadow:0 2px 8px rgba(0,0,0,0.04);">' +
      '<div style="font-weight:700; margin-bottom:12px;">📋 AI 推薦的 ' + recs.length + ' 部影片</div>' +
      '<div class="small-text" style="margin-bottom:12px;">點影片標題會開啟 YouTube 搜尋，找到後複製網址中 v= 後的 ID，加進 videos.json 即可。</div>';

    recs.forEach((r, i) => {
      const searchUrl = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(r.searchQuery || r.title || '');
      html += '<div style="padding:12px; border-top:1px solid #EFEFEC;">' +
        '<div style="font-weight:600; font-size:15px;">' +
          '<a href="' + searchUrl + '" target="_blank" style="color:#378ADD; text-decoration:none;">' +
            (i+1) + '. ' + escapeHtml(r.title || '') + ' 🔍' +
          '</a>' +
        '</div>' +
        '<div style="font-size:13px; color:#5F5E5A; margin:2px 0;">' + escapeHtml(r.titleCn || '') + ' · ' + escapeHtml(r.channel || '') + '</div>' +
        '<div style="font-size:12px; color:#854F0B; background:#FEF3E2; padding:6px 10px; border-radius:8px; margin-top:6px;">' +
          '💡 ' + escapeHtml(r.reason || '') +
        '</div>' +
      '</div>';
    });

    html += '<div style="margin-top:14px; padding:12px; background:#F8F8F5; border-radius:10px; font-size:12px; color:#5F5E5A; line-height:1.7;">' +
      '<b>📝 加進 videos.json 的步驟：</b><br>' +
      '1. 點 🔍 找到 YouTube 影片<br>' +
      '2. 複製網址中 watch?v= 後面那串字（例如 dQw4w9WgXcQ）<br>' +
      '3. 編輯 videos.json，仿照其他影片的格式加新項目<br>' +
      '4. 上傳 videos.json 到 GitHub' +
    '</div></div>';

    result.innerHTML = html;
  } catch (err) {
    result.innerHTML = '<div style="padding:16px; background:#FCEBEB; color:#A32D2D; border-radius:14px;">' +
      '<div style="font-weight:600; margin-bottom:6px;">⚠️ AI 推薦失敗</div>' +
      '<div style="font-size:13px;">' + escapeHtml(err.message) + '</div>' +
      '<div style="font-size:12px; margin-top:8px; color:#5F5E5A;">建議切到設定頁試另一個 AI 服務（Groq 通常最穩定）</div>' +
    '</div>';
  }
}

// 穩健的 JSON 抽取：處理 AI 可能在前後加文字、用 ```json 包起來等狀況
function extractJSON(text, expectType) {
  if (!text) throw new Error('AI 回覆是空的');
  // 1. 移除常見的 markdown 程式碼圍欄
  let cleaned = text.replace(/```json\s*|```\s*/g, '').trim();

  // 2. 直接嘗試解析
  try { return JSON.parse(cleaned); } catch(e) {}

  // 3. 找出第一個 [ 或 { 跟最後一個 ] 或 } 之間的內容
  const startChar = expectType === 'array' ? '[' : '{';
  const endChar = expectType === 'array' ? ']' : '}';
  const start = cleaned.indexOf(startChar);
  const end = cleaned.lastIndexOf(endChar);
  if (start >= 0 && end > start) {
    const sliced = cleaned.substring(start, end + 1);
    try { return JSON.parse(sliced); } catch(e) {}
  }

  // 4. 試另一種類型（有些 AI 會回 object 包 array）
  const altStart = expectType === 'array' ? '{' : '[';
  const altEnd = expectType === 'array' ? '}' : ']';
  const aStart = cleaned.indexOf(altStart);
  const aEnd = cleaned.lastIndexOf(altEnd);
  if (aStart >= 0 && aEnd > aStart) {
    try {
      const obj = JSON.parse(cleaned.substring(aStart, aEnd + 1));
      // 找 object 裡面是 array 的欄位
      if (expectType === 'array' && typeof obj === 'object') {
        for (const k of Object.keys(obj)) {
          if (Array.isArray(obj[k])) return obj[k];
        }
      }
    } catch(e) {}
  }

  throw new Error('AI 回覆不是有效的 JSON 格式。原始回覆：' + cleaned.substring(0, 100) + '...');
}

function renderVideoPlay() {
  const v = state.currentVideo;
  if (!v) return '';
  const speedBtns = [0.5, 0.75, 1, 1.25].map(s =>
    '<button class="speed-btn ' + (state.videoSpeed === s ? 'active' : '') + '" data-speed="' + s + '">' + s + 'x</button>'
  ).join('');
  // YouTube embed with custom playback rate trick
  const ytUrl = 'https://www.youtube.com/embed/' + v.youtubeId + '?enablejsapi=1&modestbranding=1&rel=0';

  let body = '';
  if (state.videoStep === 'watch') {
    body = '<div class="video-iframe-wrap"><iframe id="yt-iframe" src="' + ytUrl + '" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>' +
      '<div class="video-controls-bar">' +
        '<span class="video-speed-label">速度：</span>' +
        speedBtns +
      '</div>' +
      '<div class="video-info">' +
        '<div class="video-info-title">' + escapeHtml(v.title) + ' <span class="small-text">(' + escapeHtml(v.titleCn) + ')</span></div>' +
        '<div class="small-text" style="margin-bottom:8px;">' + escapeHtml(v.description) + '</div>' +
        '<div style="font-weight:600; font-size:13px; margin-top:12px;">📝 重點單字（點 ⭐ 收藏到單字本）</div>' +
        '<div class="video-vocab-list">' +
          v.vocab.map(vc => {
            const inBook = state.vocabBook.some(x => x.en === vc[0]);
            return '<div class="video-vocab-chip ' + (inBook ? 'saved' : '') + '" data-vocab-en="' + escapeHtml(vc[0]) + '" data-vocab-cn="' + escapeHtml(vc[1]) + '" data-vocab-source="影片：' + escapeHtml(v.title) + '">' +
              '<b>' + vc[0] + '</b> ' + vc[1] + ' ' + (inBook ? '★' : '☆') +
            '</div>';
          }).join('') +
        '</div>' +
        '<div style="text-align:center; margin-top:20px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">' +
          '<button class="btn btn-secondary" id="back-videos">← 返回</button>' +
          '<button class="btn" id="video-do-quiz">看完了 · 來測驗 →</button>' +
        '</div>' +
      '</div>';
  } else {
    // quiz step
    if (state.videoQuizIdx >= v.quiz.length) {
      const total = v.quiz.length;
      const score = state.videoQuizScore;
      // Mark completed
      if (!state.videoCompleted[v.id]) {
        state.videoCompleted[v.id] = { score, total, date: Date.now() };
        saveVideoCompleted();
        if (score === total) fireConfetti();
      }
      body = '<div class="reward">' +
        '<div class="reward-icon">🎯</div>' +
        '<div class="reward-title">影片測驗完成！</div>' +
        '<div style="font-size:24px; font-weight:700; margin:16px;">' + score + ' / ' + total + ' 題答對</div>' +
        '<div style="margin-top:24px; display:flex; gap:8px; justify-content:center; flex-wrap:wrap;">' +
          '<button class="btn btn-secondary" id="back-videos">回影片區</button>' +
          '<button class="btn" id="video-rewatch">重看影片</button>' +
        '</div>' +
      '</div>';
    } else {
      const q = v.quiz[state.videoQuizIdx];
      const opts = q.options.map((o, i) => '<button class="option" data-vquiz-idx="' + i + '">' + o + '</button>').join('');
      const qDisplay = q.qCn ? q.q + '<br><span class="small-text">' + q.qCn + '</span>' : q.q;
      body = '<div class="hint">第 ' + (state.videoQuizIdx + 1) + ' / ' + v.quiz.length + ' 題</div>' +
        '<div class="quiz-q">' + qDisplay + '</div>' +
        '<div class="options">' + opts + '</div>' +
        (state.videoQuizFeedback ? '<div class="result ' + state.videoQuizFeedback.type + '" style="margin-top:14px;">' + state.videoQuizFeedback.text + '</div>' : '');
    }
  }
  return '<div class="screen video-player-screen" style="padding:16px;">' +
    (state.videoStep === 'watch' ? '' : '<button class="back-btn" id="back-videos">← 結束</button>') +
    body +
  '</div>';
}

// ============ VOCAB BOOK ============
function renderVocabBook() {
  if (state.vocabBook.length === 0) {
    return '<div class="screen">' +
      '<h2 style="margin-bottom:8px;">📔 我的單字本</h2>' +
      '<div class="vocab-empty">' +
        '<div class="vocab-empty-icon">📭</div>' +
        '<div>還沒有收藏的單字</div>' +
        '<div class="hint">在影片重點單字裡點 ☆ 可以收藏到這裡</div>' +
      '</div>' +
    '</div>';
  }
  const items = [...state.vocabBook].reverse().map((w, i) =>
    '<div class="vocab-item">' +
      '<div class="vocab-item-en">' + escapeHtml(w.en) +
        '<button class="vocab-mini-btn" data-vocab-speak="' + escapeHtml(w.en) + '" style="border:none; padding:0; background:none; flex:0;">🔊</button>' +
      '</div>' +
      '<div class="vocab-item-cn">' + escapeHtml(w.cn) + '</div>' +
      (w.source ? '<div class="vocab-item-source">' + escapeHtml(w.source) + '</div>' : '') +
      '<div class="vocab-item-actions">' +
        '<button class="vocab-mini-btn danger" data-vocab-remove="' + escapeHtml(w.en) + '">刪除</button>' +
      '</div>' +
    '</div>'
  ).join('');
  return '<div class="screen">' +
    '<h2 style="margin-bottom:8px;">📔 我的單字本 <span class="small-text" style="font-weight:400;">共 ' + state.vocabBook.length + ' 個</span></h2>' +
    '<div class="hint" style="text-align:left;">看影片或玩單字卡時收藏的單字都會在這裡。</div>' +
    '<div class="vocab-toolbar">' +
      '<button class="btn btn-small" id="vocab-flash">📇 用這些單字練單字卡</button>' +
      '<button class="btn btn-secondary btn-small" id="vocab-clear">🗑 全部清空</button>' +
    '</div>' +
    '<div class="vocab-list-grid">' + items + '</div>' +
  '</div>';
}

// ============ DAILY REVIEW ============
function renderReview() {
  const hasKey = (state.aiProvider === 'claude' && state.apiKey) || (state.aiProvider === 'gemini' && state.geminiKey) || (state.aiProvider === 'groq' && state.groqKey);
  if (!hasKey) {
    return '<div class="screen">' +
      '<h2 style="margin-bottom:8px;">📰 每日複習短文</h2>' +
      '<div class="hint" style="text-align:left;">這個功能會用 AI 把你單字本的單字寫成一篇小故事，幫你在情境裡記單字。</div>' +
      '<div style="padding:20px; background:#FEF3E2; border-radius:14px; text-align:center;">⚠️ 需要先到 <b>⚙️ 設定</b> 設定 AI 金鑰</div>' +
    '</div>';
  }
  if (state.vocabBook.length < 3) {
    return '<div class="screen">' +
      '<h2 style="margin-bottom:8px;">📰 每日複習短文</h2>' +
      '<div class="hint" style="text-align:left;">這個功能會用 AI 把你單字本的單字寫成一篇小故事。</div>' +
      '<div class="vocab-empty">' +
        '<div class="vocab-empty-icon">📚</div>' +
        '<div>需要先收藏至少 3 個單字</div>' +
        '<div class="hint">目前單字本有 ' + state.vocabBook.length + ' 個</div>' +
      '</div>' +
    '</div>';
  }
  let body = '';
  if (state.reviewLoading) {
    body = '<div class="loading">✨ AI 正在編寫故事...</div>';
  } else if (state.reviewStory) {
    // Highlight vocab words in the story
    const vocabSet = state.vocabBook.map(v => v.en.toLowerCase());
    let storyHtml = state.reviewStory.story;
    vocabSet.forEach(v => {
      const re = new RegExp('\\b(' + v + ')\\b', 'gi');
      storyHtml = storyHtml.replace(re, '<span class="highlight-vocab" data-hl-word="' + v + '">$1</span>');
    });
    body = '<div class="review-card">' +
      '<div style="font-weight:700; font-size:16px;">📖 ' + escapeHtml(state.reviewStory.title) + '</div>' +
      '<div class="review-story">' + storyHtml + '</div>' +
      (state.reviewStory.translation ? '<div style="padding:14px; background:#F8F8F5; border-radius:10px; font-size:14px; color:#5F5E5A;">' + escapeHtml(state.reviewStory.translation) + '</div>' : '') +
      '<div style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">' +
        '<button class="btn btn-small" id="review-speak">🔊 朗讀整篇</button>' +
        '<button class="btn btn-secondary btn-small" id="review-regen">✦ 換一篇</button>' +
      '</div>' +
    '</div>';
  } else {
    body = '<div style="text-align:center; padding:30px;">' +
      '<div style="font-size:48px; margin-bottom:12px;">✨</div>' +
      '<div>讓 AI 用你的 ' + state.vocabBook.length + ' 個單字寫一篇短故事吧</div>' +
      '<div style="margin-top:20px;"><button class="btn" id="review-generate">✦ 產生複習故事</button></div>' +
    '</div>';
  }
  return '<div class="screen">' +
    '<h2 style="margin-bottom:8px;">📰 每日複習短文</h2>' +
    '<div class="hint" style="text-align:left;">用單字本的單字產生短文，在情境中複習。</div>' +
    body +
  '</div>';
}

// ============ SETTINGS ============
function renderSettings() {
  return '<div class="screen">' +
    '<h2 style="margin-bottom:16px;">⚙️ 設定</h2>' +

    '<h3 style="margin-bottom:8px;">🤖 AI 服務</h3>' +
    '<div class="hint" style="text-align:left;">AI 對話與複習短文都會用這個服務。三個都可以，免費額度 Groq > Gemini > Claude。</div>' +
    '<div class="ai-provider-tabs">' +
      '<button class="ai-provider-tab ' + (state.aiProvider === 'claude' ? 'active' : '') + '" data-provider="claude">Claude</button>' +
      '<button class="ai-provider-tab ' + (state.aiProvider === 'gemini' ? 'active' : '') + '" data-provider="gemini">Gemini</button>' +
      '<button class="ai-provider-tab ' + (state.aiProvider === 'groq' ? 'active' : '') + '" data-provider="groq">Groq</button>' +
    '</div>' +

    (state.aiProvider === 'claude' ?
      '<div class="api-setup" style="margin-top:12px;">' +
        '<div style="font-weight:700; margin-bottom:6px;">🔑 Anthropic Claude API Key</div>' +
        '<input type="password" id="claude-key-input" placeholder="sk-ant-..." value="' + escapeHtml(state.apiKey) + '">' +
        '<button class="btn btn-small" id="save-claude-key">儲存</button>' +
        '<div class="api-setup-help">' +
          '到 <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a> 註冊取得<br>' +
          '需綁信用卡 · 一次對話約 0.001-0.003 美元 · 對話品質最好' +
        '</div>' +
      '</div>'
    : state.aiProvider === 'gemini' ?
      '<div class="api-setup" style="margin-top:12px;">' +
        '<div style="font-weight:700; margin-bottom:6px;">🔑 Google Gemini API Key</div>' +
        '<input type="password" id="gemini-key-input" placeholder="貼上 Gemini API key" value="' + escapeHtml(state.geminiKey) + '">' +
        '<button class="btn btn-small" id="save-gemini-key">儲存</button>' +
        '<div class="api-setup-help">' +
          '到 <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a> 免費取得<br>' +
          '免費版每分鐘 15 次、每天 1500 次 · 不用綁信用卡' +
        '</div>' +
      '</div>'
    :
      '<div class="api-setup" style="margin-top:12px;">' +
        '<div style="font-weight:700; margin-bottom:6px;">🔑 Groq API Key</div>' +
        '<input type="password" id="groq-key-input" placeholder="貼上 Groq API key (gsk_...)" value="' + escapeHtml(state.groqKey) + '">' +
        '<button class="btn btn-small" id="save-groq-key">儲存</button>' +
        '<div class="api-setup-help">' +
          '到 <a href="https://console.groq.com/keys" target="_blank">console.groq.com/keys</a> 免費取得（Google 登入即可）<br>' +
          '免費版每分鐘 30 次、每天 14,400 次 · 速度很快 · 不用綁信用卡' +
        '</div>' +
      '</div>'
    ) +

    '<h3 style="margin:20px 0 8px;">💾 資料管理</h3>' +
    '<div style="display:flex; gap:8px; flex-wrap:wrap;">' +
      '<button class="btn btn-secondary btn-small" id="export-data">📥 匯出我的資料</button>' +
      '<button class="btn btn-secondary btn-small" id="import-data">📤 匯入備份</button>' +
      '<input type="file" id="import-file" style="display:none;" accept=".json">' +
    '</div>' +
    '<div class="hint" style="text-align:left; margin-top:6px;">匯出包含進度、單字本、設定。換瀏覽器或裝置時可用備份還原。</div>' +

    '<h3 style="margin:20px 0 8px;">📚 關於</h3>' +
    '<div style="background:#F8F8F5; padding:14px; border-radius:12px; font-size:13px; line-height:1.7; color:#5F5E5A;">' +
      'English Adventure 英文冒險島<br>' +
      '專為國小 1-3 年級設計的英文學習網站<br>' +
      '70 關闖關 · 18 部影片 · 單字本 · AI 對話<br>' +
    '</div>' +

  '</div>';
}


// ============ AI GENERATE LEVEL ============
function renderAiGen() {
  const hasKey = (state.aiProvider === 'claude' && state.apiKey) || (state.aiProvider === 'gemini' && state.geminiKey) || (state.aiProvider === 'groq' && state.groqKey);
  if (!hasKey) {
    return '<div class="screen">' +
      '<h2 style="margin-bottom:8px;">🪄 AI 出題</h2>' +
      '<div class="hint" style="text-align:left;">輸入主題，AI 幫你生成一個關卡（故事 + 單字 + 測驗）</div>' +
      '<div style="padding:20px; background:#FEF3E2; border-radius:14px; text-align:center;">⚠️ 需要先到 <b>⚙️ 設定</b> 設定 AI 金鑰</div>' +
    '</div>';
  }
  const suggestions = ['恐龍', '太空', '海底世界', '魔法', '機器人', '海盜', '公主', '消防員', '農場', '足球', '蝴蝶', '火車'];
  const chips = suggestions.map(s => '<button class="topic-chip" data-topic="' + escapeHtml(s) + '">' + s + '</button>').join('');

  let resultHtml = '';
  if (state.aiGenLoading) {
    resultHtml = '<div class="loading">✨ AI 正在編寫關卡...</div>';
  } else if (state.aiGenResult) {
    const r = state.aiGenResult;
    const story = r.story.map(s => '<div style="margin-bottom:6px;">' + escapeHtml(s) + '</div>').join('');
    const vocab = (r.vocab || []).map(v => '<div class="video-vocab-chip">' + escapeHtml(v[0]) + ' = ' + escapeHtml(v[1]) + '</div>').join('');
    const quizOpts = r.quiz.options.map((o, i) =>
      '<div style="padding:8px; background:' + (i === r.quiz.answer ? '#EAF3DE' : 'white') + '; border:1.5px solid ' + (i === r.quiz.answer ? '#97C459' : '#EFEFEC') + '; border-radius:8px; margin-bottom:4px;">' +
        (i === r.quiz.answer ? '✓ ' : '') + escapeHtml(o) +
      '</div>'
    ).join('');
    resultHtml = '<div class="gen-result-card">' +
      '<div style="font-size:32px; text-align:center;">' + (r.icon || '✨') + '</div>' +
      '<div style="font-weight:700; font-size:18px; text-align:center; margin-bottom:4px;">' + escapeHtml(r.title) + '</div>' +
      '<div class="small-text" style="text-align:center; margin-bottom:14px;">' + escapeHtml(r.titleCn || '') + '</div>' +

      '<div style="font-weight:600; font-size:13px; margin-bottom:6px;">📖 故事</div>' +
      '<div style="padding:14px; background:#FEF3E2; border-radius:10px; font-size:16px; line-height:1.8; margin-bottom:14px;">' + story + '</div>' +

      '<div style="font-weight:600; font-size:13px; margin-bottom:6px;">📝 單字</div>' +
      '<div class="video-vocab-list" style="margin-bottom:14px;">' + vocab + '</div>' +

      '<div style="font-weight:600; font-size:13px; margin-bottom:6px;">🎯 測驗</div>' +
      '<div style="padding:12px; background:#F8F8F5; border-radius:10px; margin-bottom:6px;">' +
        '<div style="font-weight:500; margin-bottom:8px;">Q: ' + escapeHtml(r.quiz.q) + (r.quiz.qCn ? ' <span class="small-text">(' + escapeHtml(r.quiz.qCn) + ')</span>' : '') + '</div>' +
        quizOpts +
      '</div>' +

      '<div style="display:flex; gap:8px; margin-top:16px; flex-wrap:wrap; justify-content:center;">' +
        '<button class="btn btn-secondary btn-small" id="ai-gen-speak">🔊 朗讀</button>' +
        '<button class="btn btn-secondary btn-small" id="ai-gen-regen">✦ 換一個</button>' +
        '<button class="btn btn-small" id="ai-gen-copy-json">📋 複製 JSON 加進關卡</button>' +
      '</div>' +
      '<div class="small-text" style="text-align:center; margin-top:8px;">複製後可以加進 levels.json 變成永久關卡</div>' +
    '</div>';
  }

  return '<div class="screen ai-gen-screen">' +
    '<h2 style="margin-bottom:8px;">🪄 AI 出題</h2>' +
    '<div class="hint" style="text-align:left;">輸入你想要的主題，AI 立刻幫你生成一個小故事 + 單字 + 測驗。</div>' +
    '<input type="text" class="topic-input" id="ai-gen-topic" placeholder="例如：恐龍、太空、足球..." value="' + escapeHtml(state.aiGenTopic) + '">' +
    '<div class="topic-suggestions">' + chips + '</div>' +
    '<div style="text-align:center; margin-top:12px;">' +
      '<button class="btn" id="ai-gen-go">✨ 生成關卡</button>' +
    '</div>' +
    resultHtml +
  '</div>';
}

async function generateAiLevel() {
  const topic = document.getElementById('ai-gen-topic').value.trim();
  if (!topic) { alert('請輸入主題'); return; }
  state.aiGenTopic = topic;
  state.aiGenLoading = true;
  state.aiGenResult = null;
  render();

  const systemPrompt = 'You are an English teacher creating learning content for a 7-10 year old child in Taiwan. Generate a level about the given topic. Output ONLY a JSON object (no markdown fences, no other text) with this exact structure: {"icon": "single emoji", "title": "Short English title (3-5 words)", "titleCn": "中文標題", "story": ["sentence 1.", "sentence 2.", "sentence 3.", "sentence 4."], "vocab": [["word","中文"], ["word","中文"], ["word","中文"], ["word","中文"], ["word","中文"]], "quiz": {"q": "Question in English", "qCn": "中文問題", "options": ["option A", "option B", "option C", "option D"], "answer": 0}}. Rules: story has 4-5 simple sentences (5-8 words each), vocab has 5 key words from the story with Chinese translation, quiz answer is the index 0-3 of correct option.';

  try {
    let reply;
    const userMsg = [{ role: 'user', content: 'Topic: ' + topic + '. Generate the level now.' }];
    if (state.aiProvider === 'claude') reply = await callClaude(userMsg, systemPrompt);
    else if (state.aiProvider === 'gemini') reply = await callGemini(userMsg, systemPrompt);
    else reply = await callGroq(userMsg, systemPrompt);
    state.aiGenResult = extractJSON(reply, 'object');
  } catch (err) {
    alert('生成失敗：' + err.message);
  } finally {
    state.aiGenLoading = false;
    render();
  }
}

function renderChatMenu() {
  const charsHtml = CHARACTERS.map(c => '<div class="character-card" data-char="' + c.id + '">' +
    '<div class="character-icon">' + c.icon + '</div>' +
    '<div class="character-name">' + c.name + '</div>' +
    '<div class="character-desc">' + c.desc + '</div>' +
  '</div>').join('');
  const hasKey = (state.aiProvider === 'claude' && state.apiKey) || (state.aiProvider === 'gemini' && state.geminiKey) || (state.aiProvider === 'groq' && state.groqKey);
  const providerName = state.aiProvider === 'claude' ? 'Claude' : state.aiProvider === 'gemini' ? 'Gemini' : 'Groq';
  return '<div class="chat-screen">' +
    (hasKey
      ? '<div style="padding:12px 16px; background:#EAF3DE; color:#3B6D11; border-radius:12px; margin-bottom:16px; font-size:13px;">✓ 已設定 ' + providerName + '，可以開始聊天</div>'
      : '<div style="padding:12px 16px; background:#FAEEDA; color:#854F0B; border-radius:12px; margin-bottom:16px; font-size:13px;">⚠️ 還沒有 AI 金鑰，請到 <b>⚙️ 設定</b> 先設定</div>'
    ) +
    '<h3 style="margin-top:8px;">選一個朋友來聊天 Choose a friend</h3>' +
    '<div class="character-grid">' + charsHtml + '</div>' +
  '</div>';
}

function getGreeting(charId) {
  const greetings = {
    leo: 'Hi! I am Leo. What is your name?',
    mimi: 'Hi! I am Mimi. How are you today?',
    rex: 'Hi! I am Rex. Want to hear a joke?',
    speedy: 'Vroom vroom! I am Speedy! Do you like fast cars?',
    chichi: 'Hi! I am ChiChi. I want to learn Chinese! Can you teach me?'
  };
  return greetings[charId] || 'Hi!';
}

// ============ EMOJI / MOOD DETECTION ============
const KEYWORD_EMOJIS = {
  // animals
  'cat': '🐱', 'dog': '🐶', 'bird': '🐦', 'fish': '🐟', 'rabbit': '🐰', 'lion': '🦁',
  'tiger': '🐯', 'bear': '🐻', 'panda': '🐼', 'pig': '🐷', 'cow': '🐮', 'horse': '🐴',
  'monkey': '🐵', 'elephant': '🐘', 'snake': '🐍', 'turtle': '🐢', 'frog': '🐸',
  'duck': '🦆', 'chicken': '🐔', 'sheep': '🐑', 'whale': '🐳', 'dolphin': '🐬',
  'butterfly': '🦋', 'bee': '🐝', 'spider': '🕷️', 'penguin': '🐧',
  // food
  'apple': '🍎', 'banana': '🍌', 'cake': '🎂', 'pizza': '🍕', 'ice cream': '🍦',
  'cookie': '🍪', 'bread': '🍞', 'milk': '🥛', 'water': '💧', 'juice': '🧃',
  'rice': '🍚', 'noodle': '🍜', 'sushi': '🍣', 'burger': '🍔', 'fries': '🍟',
  'egg': '🥚', 'cheese': '🧀', 'meat': '🍖', 'fruit': '🍓', 'vegetable': '🥕',
  'candy': '🍬', 'chocolate': '🍫', 'donut': '🍩', 'sandwich': '🥪',
  // weather/nature
  'sun': '☀️', 'rain': '🌧️', 'snow': '❄️', 'cloud': '☁️', 'star': '⭐',
  'moon': '🌙', 'flower': '🌸', 'tree': '🌳', 'beach': '🏖️', 'mountain': '⛰️',
  'ocean': '🌊', 'fire': '🔥', 'rainbow': '🌈',
  // toys/games
  'ball': '⚽', 'toy': '🧸', 'game': '🎮', 'book': '📚', 'music': '🎵',
  'car': '🚗', 'bike': '🚲', 'train': '🚂', 'plane': '✈️', 'boat': '⛵',
  'truck': '🚚', 'bus': '🚌', 'rocket': '🚀',
  // family/people
  'mom': '👩', 'dad': '👨', 'baby': '👶', 'family': '👨‍👩‍👧', 'friend': '🧑‍🤝‍🧑',
  'school': '🏫', 'teacher': '👩‍🏫', 'home': '🏠', 'park': '🏞️',
  // activities
  'swim': '🏊', 'run': '🏃', 'dance': '💃', 'sing': '🎤', 'sleep': '😴',
  'eat': '🍴', 'drink': '🥤', 'play': '🎮',
  // emotions/abstract
  'love': '❤️', 'happy': '😊', 'birthday': '🎉', 'gift': '🎁', 'magic': '✨'
};

function detectEmojis(text) {
  const lower = text.toLowerCase();
  const found = new Set();
  // sort by length desc to match longer phrases first
  const keys = Object.keys(KEYWORD_EMOJIS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const re = new RegExp('\\b' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?\\b', 'i');
    if (re.test(lower)) {
      found.add(KEYWORD_EMOJIS[k]);
      if (found.size >= 4) break;
    }
  }
  return [...found];
}

function detectMood(text) {
  const t = text.toLowerCase();
  // Question
  if (t.includes('?')) return { emoji: '🤔', name: 'curious' };
  // Excitement
  if (text.includes('!') || /\b(wow|yay|cool|awesome|amazing|great|fantastic)\b/i.test(t)) return { emoji: '😄', name: 'excited' };
  // Surprise
  if (/\b(really|wow|whoa|oh)\b/i.test(t)) return { emoji: '😮', name: 'surprised' };
  // Encouragement / tip
  if (/\b(good|nice|well done|try|let's|let us)\b/i.test(t)) return { emoji: '💡', name: 'encouraging' };
  // Joke / silly
  if (/\b(haha|funny|silly|joke|laugh)\b/i.test(t)) return { emoji: '😆', name: 'funny' };
  // Default
  return { emoji: '😊', name: 'friendly' };
}

function renderChat() {
  const char = state.currentChar;
  const supported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  // Determine character status
  let avatarClass = '';
  let statusText = '';
  let bubble = '';
  if (state.chatLoading) {
    avatarClass = 'thinking';
    statusText = '✨ ' + char.name + ' is thinking...';
    bubble = '<div class="chat-thought-bubble">💭</div>';
  } else if (state.chatJustReplied) {
    avatarClass = 'happy';
    const lastMsg = state.chatHistory[state.chatHistory.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      const mood = detectMood(lastMsg.content);
      statusText = char.name + ' is ' + mood.name;
      bubble = '<div class="chat-thought-bubble">' + mood.emoji + '</div>';
    }
  } else {
    statusText = 'Type or speak to start chatting!';
  }

  // Detect topic emojis from recent conversation (last 4 messages)
  const recentText = state.chatHistory.slice(-4).map(m => m.content).join(' ');
  const sceneEmojis = detectEmojis(recentText);

  let msgsHtml = state.chatHistory.map((m, i) => {
    if (m.role === 'user') return '<div class="msg-row user"><div class="msg user">' + escapeHtml(m.content) + '</div></div>';
    const mood = detectMood(m.content);
    const emojis = detectEmojis(m.content);
    const emojiBlock = emojis.length ? '<div class="msg-emojis">' + emojis.map(e => '<span class="msg-emoji">' + e + '</span>').join('') + '</div>' : '';
    return '<div class="msg-row">' +
      '<div class="msg ai">' +
        '<span class="msg-mood">' + mood.emoji + '</span>' + escapeHtml(m.content) +
        emojiBlock +
      '</div>' +
      '<button class="msg-speak" data-msg-idx="' + i + '" title="再聽一次">🔊</button>' +
    '</div>';
  }).join('');

  if (state.chatHistory.length === 0) {
    const greeting = getGreeting(char.id);
    const mood = detectMood(greeting);
    msgsHtml = '<div class="msg-row"><div class="msg ai">' +
      '<span class="msg-mood">' + mood.emoji + '</span>' + greeting +
      '</div><button class="msg-speak" data-greet="1" title="再聽一次">🔊</button></div>';
  }

  return '<div class="chat-screen">' +
    '<button class="back-btn" id="back-chat-menu">← 換朋友</button>' +
    '<div class="chat-character-display">' +
      bubble +
      '<div class="chat-character-avatar ' + avatarClass + '">' + char.icon + '</div>' +
      '<div class="chat-character-name">' + char.name + '</div>' +
      '<div class="chat-character-status">' + statusText + '</div>' +
    '</div>' +
    (sceneEmojis.length >= 2 ? '<div class="chat-scene"><div class="chat-scene-icons">' + sceneEmojis.join(' ') + '</div><div class="chat-scene-label">📖 你們在聊到的東西</div></div>' : '') +
    '<div class="chat-window" id="chat-window">' + msgsHtml + '</div>' +
    '<div class="chat-input-row">' +
      '<input type="text" class="chat-input" id="chat-input" placeholder="Type in English... (用英文打字)" autocomplete="off">' +
      (supported ? '<button class="chat-mic" id="chat-mic" title="按麥克風用說的">🎤</button>' : '') +
      '<button class="btn" id="chat-send">Send</button>' +
    '</div>' +
    '<div class="hint" style="text-align:left; margin-top:8px;">💡 試著用英文跟 ' + char.name + ' 聊天！可以打字或按麥克風說話 · 點 🔊 再聽一次</div>' +
  '</div>';
}

// ============ HANDLERS ============
function attachHandlers() {
  document.querySelectorAll('[data-nav]').forEach(el => {
    el.addEventListener('click', () => { state.view = el.dataset.nav; render(); });
  });
  document.querySelectorAll('[data-theme-toggle]').forEach(el => {
    el.addEventListener('click', () => {
      state.expandedThemes[el.dataset.themeToggle] = !state.expandedThemes[el.dataset.themeToggle];
      render();
    });
  });
  document.querySelectorAll('.island:not(.locked)').forEach(el => {
    el.addEventListener('click', () => {
      sfxClick();
      const tId = el.dataset.theme, idx = parseInt(el.dataset.idx);
      const theme = THEMES.find(t => t.id === tId);
      state.currentTheme = tId;
      state.currentLevel = theme.levels[idx];
      state.currentLevelIdx = idx;
      state.currentStep = 0; state.speakIdx = 0;
      state.tempScore = { read: false, speak: 0, quiz: false };
      state.view = 'level'; render();
    });
  });

  // Level back
  const back = document.getElementById('back-btn');
  if (back) back.addEventListener('click', () => { state.view = 'map'; render(); });

  // Read step
  if (state.view === 'level' && state.currentStep === 0) {
    document.querySelectorAll('.word').forEach(w => {
      w.addEventListener('click', () => speak(w.dataset.word, 0.85));
    });
    document.querySelectorAll('[data-sentence-idx]').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        speak(state.currentLevel.story[parseInt(b.dataset.sentenceIdx)], 0.9);
      });
    });
    const all = document.getElementById('read-all');
    if (all) all.addEventListener('click', () => speak(state.currentLevel.story.join(' '), 0.85));
    const done = document.getElementById('read-done');
    if (done) done.addEventListener('click', () => {
      state.tempScore.read = true;
      state.currentStep = 1; state.speakIdx = 0;
      // Track vocab learned (count first time seeing this level)
      if (!state.progress[levelKey(state.currentTheme, state.currentLevelIdx)]) {
        state.totalWordsLearned += (state.currentLevel.vocab || []).length;
        saveStats();
      }
      render();
    });
  }

  // Speak step
  if (state.view === 'level' && state.currentStep === 1) {
    const listen = document.getElementById('listen-btn');
    if (listen) listen.addEventListener('click', () => speak(state.currentLevel.story[state.speakIdx], 0.85));
    const mic = document.getElementById('mic-btn');
    if (mic) mic.addEventListener('click', startRecognition);
    const skip = document.getElementById('skip');
    if (skip) skip.addEventListener('click', nextSpeak);
  }

  // Quiz step
  if (state.view === 'level' && state.currentStep === 2) {
    document.querySelectorAll('.option').forEach(opt => {
      opt.addEventListener('click', () => {
        if (opt.classList.contains('disabled')) return;
        const idx = parseInt(opt.dataset.idx);
        const correct = state.currentLevel.quiz.answer;
        document.querySelectorAll('.option').forEach(o => o.classList.add('disabled'));
        if (idx === correct) {
          opt.classList.add('correct');
          state.tempScore.quiz = true;
          state.totalQuizCorrect++; saveStats();
          sfxCorrect();
          document.getElementById('quiz-feedback').innerHTML = '<span style="color:#3B6D11;">✨ 答對了！</span>';
          setTimeout(finishLevel, 1200);
        } else {
          opt.classList.add('wrong');
          document.querySelectorAll('.option')[correct].classList.add('correct');
          sfxWrong();
          document.getElementById('quiz-feedback').innerHTML = '<span style="color:#A32D2D;">再加油，正確答案已標示</span>';
          setTimeout(finishLevel, 1800);
        }
      });
    });
  }

  // Reward
  const backMap = document.getElementById('back-map');
  if (backMap) backMap.addEventListener('click', () => { state.view = 'map'; render(); });
  const nextLevel = document.getElementById('next-level');
  if (nextLevel) nextLevel.addEventListener('click', () => {
    const theme = THEMES.find(t => t.id === state.currentTheme);
    if (state.currentLevelIdx + 1 < theme.levels.length) {
      state.currentLevelIdx++;
      state.currentLevel = theme.levels[state.currentLevelIdx];
      state.currentStep = 0; state.speakIdx = 0;
      state.tempScore = { read: false, speak: 0, quiz: false };
      state.view = 'level';
    } else {
      state.view = 'map';
    }
    render();
  });

  // Chat menu
  const saveKey = document.getElementById('save-key');
  if (saveKey) saveKey.addEventListener('click', () => {
    state.apiKey = document.getElementById('api-key-input').value.trim();
    saveApiKey();
    alert('✓ 金鑰已儲存');
  });
  document.querySelectorAll('[data-char]').forEach(el => {
    el.addEventListener('click', () => {
      const hasKey = (state.aiProvider === 'claude' && state.apiKey) || (state.aiProvider === 'gemini' && state.geminiKey) || (state.aiProvider === 'groq' && state.groqKey);
      if (!hasKey) { alert('請先到 ⚙️ 設定 設定 AI 金鑰'); return; }
      state.currentChar = CHARACTERS.find(c => c.id === el.dataset.char);
      state.chatHistory = [];
      state.view = 'chatActive';
      render();
      setTimeout(() => speak(getGreeting(state.currentChar.id), 0.9), 300);
    });
  });
  const backChat = document.getElementById('back-chat-menu');
  if (backChat) backChat.addEventListener('click', () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    state.view = 'chat'; render();
  });
  const sendBtn = document.getElementById('chat-send');
  if (sendBtn) sendBtn.addEventListener('click', sendChat);
  const chatInput = document.getElementById('chat-input');
  if (chatInput) chatInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });
  const chatMic = document.getElementById('chat-mic');
  if (chatMic) chatMic.addEventListener('click', startChatRecognition);
  document.querySelectorAll('[data-msg-idx]').forEach(b => {
    b.addEventListener('click', () => {
      const msg = state.chatHistory[parseInt(b.dataset.msgIdx)];
      if (msg) speak(msg.content, 0.9);
    });
  });
  document.querySelectorAll('[data-greet]').forEach(b => {
    b.addEventListener('click', () => speak(getGreeting(state.currentChar.id), 0.9));
  });

  // Flashcards
  document.querySelectorAll('[data-flash-theme]').forEach(el => {
    el.addEventListener('click', () => { sfxClick(); startFlashcards(el.dataset.flashTheme); });
  });
  const backFlashHome = document.getElementById('back-flashhome');
  if (backFlashHome) backFlashHome.addEventListener('click', () => { state.view = 'flashHome'; render(); });
  const flashcard = document.getElementById('flashcard');
  if (flashcard) flashcard.addEventListener('click', () => {
    state.flashFlipped = !state.flashFlipped; render();
  });
  const flashPrev = document.getElementById('flash-prev');
  if (flashPrev) flashPrev.addEventListener('click', () => {
    state.flashIdx = Math.max(0, state.flashIdx - 1);
    state.flashFlipped = false;
    render();
    setTimeout(() => speak(state.flashcards[state.flashIdx][0], 0.85), 200);
  });
  const flashNext = document.getElementById('flash-next');
  if (flashNext) flashNext.addEventListener('click', () => {
    state.flashIdx = Math.min(state.flashcards.length - 1, state.flashIdx + 1);
    state.flashFlipped = false;
    render();
    setTimeout(() => speak(state.flashcards[state.flashIdx][0], 0.85), 200);
  });
  const flashSpeak = document.getElementById('flash-speak');
  if (flashSpeak) flashSpeak.addEventListener('click', () => speak(state.flashcards[state.flashIdx][0], 0.85));
  const flashShuffle = document.getElementById('flash-shuffle');
  if (flashShuffle) flashShuffle.addEventListener('click', () => {
    state.flashcards = shuffle(state.flashcards);
    state.flashIdx = 0;
    state.flashFlipped = false;
    render();
  });

  // Listening
  document.querySelectorAll('[data-listen-len]').forEach(el => {
    el.addEventListener('click', () => { sfxClick(); startListening(parseInt(el.dataset.listenLen)); });
  });
  const backListenHome = document.getElementById('back-listenhome');
  if (backListenHome) backListenHome.addEventListener('click', () => { state.view = 'listenHome'; render(); });
  const listenReplay = document.getElementById('listen-replay');
  if (listenReplay) listenReplay.addEventListener('click', () => speak(state.listenItems[state.listenIdx].word, 0.85));
  document.querySelectorAll('[data-listen-opt]').forEach(b => {
    b.addEventListener('click', () => {
      const item = state.listenItems[state.listenIdx];
      const chosen = b.dataset.listenOpt;
      if (chosen === item.correctCn) {
        b.classList.add('correct');
        state.listenScore++;
        sfxCorrect();
        state.listenFeedback = { type: 'good', text: '✨ 答對了！「' + item.word + '」 = ' + item.correctCn };
      } else {
        b.classList.add('wrong');
        document.querySelectorAll('[data-listen-opt]').forEach(x => {
          if (x.dataset.listenOpt === item.correctCn) x.classList.add('correct');
        });
        sfxWrong();
        state.listenFeedback = { type: 'try', text: '正確答案：「' + item.word + '」 = ' + item.correctCn };
      }
      document.querySelectorAll('[data-listen-opt]').forEach(x => x.classList.add('disabled'));
      render();
      setTimeout(() => {
        state.listenIdx++;
        state.listenFeedback = null;
        render();
        if (state.listenIdx < state.listenItems.length) {
          setTimeout(() => speak(state.listenItems[state.listenIdx].word, 0.85), 400);
        }
      }, 1800);
    });
  });

  // Spelling
  document.querySelectorAll('[data-spell-theme]').forEach(el => {
    el.addEventListener('click', () => { sfxClick(); startSpelling(el.dataset.spellTheme); });
  });
  const backSpellHome = document.getElementById('back-spellhome');
  if (backSpellHome) backSpellHome.addEventListener('click', () => { state.view = 'spellHome'; render(); });
  document.querySelectorAll('[data-letter-id]').forEach(b => {
    b.addEventListener('click', () => {
      const id = parseInt(b.dataset.letterId);
      const letterObj = state.spellLetters.find(l => l.id === id);
      if (!letterObj || letterObj.used) return;
      const emptyIdx = state.spellSlots.findIndex(s => !s);
      if (emptyIdx === -1) return;
      state.spellSlots[emptyIdx] = letterObj.letter;
      letterObj.used = true;
      // Check if filled
      if (state.spellSlots.every(s => s)) {
        const guess = state.spellSlots.join('').toLowerCase();
        const target = state.spellWord.en.toLowerCase();
        render();
        setTimeout(() => {
          const fb = document.getElementById('spell-feedback');
          if (guess === target) {
            document.querySelectorAll('.spell-slot').forEach(s => s.classList.add('correct'));
            sfxCorrect();
            if (fb) fb.innerHTML = '<span style="color:#3B6D11;">✨ 太棒了！「' + state.spellWord.en + '」</span>';
            setTimeout(nextSpellWord, 1500);
          } else {
            document.querySelectorAll('.spell-slot').forEach(s => s.classList.add('wrong'));
            sfxWrong();
            if (fb) fb.innerHTML = '<span style="color:#A32D2D;">再試試看！正確：' + state.spellWord.en + '</span>';
            setTimeout(() => {
              // reset slots/letters
              state.spellSlots = new Array(state.spellWord.en.length).fill('');
              state.spellLetters.forEach(l => l.used = false);
              render();
            }, 1800);
          }
        }, 50);
        return;
      }
      render();
    });
  });
  const spellListen = document.getElementById('spell-listen');
  if (spellListen) spellListen.addEventListener('click', () => speak(state.spellWord.en, 0.8));
  const spellClear = document.getElementById('spell-clear');
  if (spellClear) spellClear.addEventListener('click', () => {
    state.spellSlots = new Array(state.spellWord.en.length).fill('');
    state.spellLetters.forEach(l => l.used = false);
    render();
  });
  const spellSkip = document.getElementById('spell-skip');
  if (spellSkip) spellSkip.addEventListener('click', nextSpellWord);

  // Stats
  const statsReset = document.getElementById('stats-reset');
  if (statsReset) statsReset.addEventListener('click', () => {
    if (confirm('確定要清除所有進度嗎？星星跟解鎖的關卡都會歸零。')) {
      state.progress = {};
      state.totalWordsLearned = 0;
      state.totalSpoken = 0;
      state.totalQuizCorrect = 0;
      saveProgress(); saveStats();
      state.view = 'map';
      render();
    }
  });

  // Videos - category tabs
  document.querySelectorAll('[data-vidcat]').forEach(el => {
    el.addEventListener('click', () => { state.videoCategory = el.dataset.vidcat; render(); });
  });
  // Videos - AI recommend
  const aiRec = document.getElementById('ai-recommend-videos');
  if (aiRec) aiRec.addEventListener('click', recommendVideos);
  // Videos - card click
  document.querySelectorAll('[data-vid]').forEach(el => {
    el.addEventListener('click', () => {
      sfxClick();
      state.currentVideo = VIDEOS.find(v => v.id === el.dataset.vid);
      state.videoStep = 'watch';
      state.videoSpeed = 1;
      state.videoQuizIdx = 0;
      state.videoQuizScore = 0;
      state.videoQuizFeedback = null;
      state.view = 'videoPlay';
      render();
    });
  });
  // Video player back
  const backVideos = document.getElementById('back-videos');
  if (backVideos) backVideos.addEventListener('click', () => { state.view = 'videos'; render(); });
  // Video do quiz
  const doQuiz = document.getElementById('video-do-quiz');
  if (doQuiz) doQuiz.addEventListener('click', () => {
    state.videoStep = 'quiz';
    state.videoQuizIdx = 0;
    state.videoQuizScore = 0;
    render();
  });
  const rewatch = document.getElementById('video-rewatch');
  if (rewatch) rewatch.addEventListener('click', () => {
    state.videoStep = 'watch';
    render();
  });
  // Video speed
  document.querySelectorAll('[data-speed]').forEach(b => {
    b.addEventListener('click', () => {
      state.videoSpeed = parseFloat(b.dataset.speed);
      // Reload iframe with new speed (YouTube iframe API hack: use postMessage)
      const iframe = document.getElementById('yt-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command', func: 'setPlaybackRate', args: [state.videoSpeed]
        }), '*');
      }
      // Update active button without full re-render to avoid losing video state
      document.querySelectorAll('[data-speed]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    });
  });
  // Video vocab chip
  document.querySelectorAll('[data-vocab-en]').forEach(el => {
    el.addEventListener('click', () => {
      const en = el.dataset.vocabEn;
      const cn = el.dataset.vocabCn;
      const source = el.dataset.vocabSource || '';
      const exists = state.vocabBook.findIndex(v => v.en === en);
      if (exists >= 0) {
        state.vocabBook.splice(exists, 1);
      } else {
        state.vocabBook.push({ en, cn, source, date: Date.now() });
        sfxStar();
      }
      saveVocabBook();
      render();
    });
  });
  // Video quiz options
  document.querySelectorAll('[data-vquiz-idx]').forEach(b => {
    b.addEventListener('click', () => {
      if (b.classList.contains('disabled')) return;
      const idx = parseInt(b.dataset.vquizIdx);
      const q = state.currentVideo.quiz[state.videoQuizIdx];
      const correct = q.answer;
      document.querySelectorAll('[data-vquiz-idx]').forEach(x => x.classList.add('disabled'));
      if (idx === correct) {
        b.classList.add('correct');
        state.videoQuizScore++;
        sfxCorrect();
        state.videoQuizFeedback = { type: 'good', text: '✨ 答對了！' };
      } else {
        b.classList.add('wrong');
        document.querySelectorAll('[data-vquiz-idx]')[correct].classList.add('correct');
        sfxWrong();
        state.videoQuizFeedback = { type: 'try', text: '正確答案已標示' };
      }
      render();
      setTimeout(() => {
        state.videoQuizIdx++;
        state.videoQuizFeedback = null;
        render();
      }, 1500);
    });
  });

  // Vocab book
  document.querySelectorAll('[data-vocab-speak]').forEach(b => {
    b.addEventListener('click', e => {
      e.stopPropagation();
      speak(b.dataset.vocabSpeak, 0.85);
    });
  });
  document.querySelectorAll('[data-vocab-remove]').forEach(b => {
    b.addEventListener('click', () => {
      const en = b.dataset.vocabRemove;
      state.vocabBook = state.vocabBook.filter(v => v.en !== en);
      saveVocabBook();
      render();
    });
  });
  const vocabFlash = document.getElementById('vocab-flash');
  if (vocabFlash) vocabFlash.addEventListener('click', () => {
    state.flashcards = shuffle(state.vocabBook.map(v => [v.en, v.cn]));
    state.flashIdx = 0;
    state.flashFlipped = false;
    state.flashThemeId = 'vocabbook';
    state.view = 'flash';
    render();
    setTimeout(() => speak(state.flashcards[0][0], 0.85), 300);
  });
  const vocabClear = document.getElementById('vocab-clear');
  if (vocabClear) vocabClear.addEventListener('click', () => {
    if (confirm('確定要清空單字本嗎？')) {
      state.vocabBook = [];
      saveVocabBook();
      render();
    }
  });

  // Review
  const reviewGen = document.getElementById('review-generate');
  if (reviewGen) reviewGen.addEventListener('click', generateReviewStory);
  const reviewRegen = document.getElementById('review-regen');
  if (reviewRegen) reviewRegen.addEventListener('click', generateReviewStory);
  const reviewSpeak = document.getElementById('review-speak');
  if (reviewSpeak) reviewSpeak.addEventListener('click', () => {
    if (state.reviewStory) speak(state.reviewStory.story, 0.85);
  });
  document.querySelectorAll('[data-hl-word]').forEach(el => {
    el.addEventListener('click', () => speak(el.dataset.hlWord, 0.85));
  });

  // Settings
  document.querySelectorAll('[data-provider]').forEach(b => {
    b.addEventListener('click', () => {
      state.aiProvider = b.dataset.provider;
      saveProvider();
      render();
    });
  });
  const saveClaudeKey = document.getElementById('save-claude-key');
  if (saveClaudeKey) saveClaudeKey.addEventListener('click', () => {
    state.apiKey = document.getElementById('claude-key-input').value.trim();
    saveApiKey();
    alert('✓ Claude 金鑰已儲存');
  });
  const saveGemKey = document.getElementById('save-gemini-key');
  if (saveGemKey) saveGemKey.addEventListener('click', () => {
    state.geminiKey = document.getElementById('gemini-key-input').value.trim();
    saveGeminiKey();
    alert('✓ Gemini 金鑰已儲存');
  });
  const saveGrqKey = document.getElementById('save-groq-key');
  if (saveGrqKey) saveGrqKey.addEventListener('click', () => {
    state.groqKey = document.getElementById('groq-key-input').value.trim();
    saveGroqKey();
    alert('✓ Groq 金鑰已儲存');
  });
  const exportBtn = document.getElementById('export-data');
  if (exportBtn) exportBtn.addEventListener('click', exportData);
  const importBtn = document.getElementById('import-data');
  if (importBtn) importBtn.addEventListener('click', () => document.getElementById('import-file').click());
  const importFile = document.getElementById('import-file');
  if (importFile) importFile.addEventListener('change', importData);

  // AI Generate Level
  document.querySelectorAll('[data-topic]').forEach(b => {
    b.addEventListener('click', () => {
      document.getElementById('ai-gen-topic').value = b.dataset.topic;
      generateAiLevel();
    });
  });
  const aiGenGo = document.getElementById('ai-gen-go');
  if (aiGenGo) aiGenGo.addEventListener('click', generateAiLevel);
  const aiGenTopicInput = document.getElementById('ai-gen-topic');
  if (aiGenTopicInput) aiGenTopicInput.addEventListener('keydown', e => { if (e.key === 'Enter') generateAiLevel(); });
  const aiGenSpeak = document.getElementById('ai-gen-speak');
  if (aiGenSpeak) aiGenSpeak.addEventListener('click', () => {
    if (state.aiGenResult) speak(state.aiGenResult.story.join(' '), 0.85);
  });
  const aiGenRegen = document.getElementById('ai-gen-regen');
  if (aiGenRegen) aiGenRegen.addEventListener('click', generateAiLevel);
  const aiGenCopy = document.getElementById('ai-gen-copy-json');
  if (aiGenCopy) aiGenCopy.addEventListener('click', () => {
    if (!state.aiGenResult) return;
    const json = JSON.stringify(state.aiGenResult, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      alert('✓ JSON 已複製！\n\n貼到 levels.json 任一個主題的 levels 陣列就會變成永久關卡。');
    }).catch(() => {
      // Fallback: show in prompt
      prompt('複製這段 JSON：', json);
    });
  });
}

// ============ RECOGNITION ============
function startRecognition() {
  const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
  if (!SR) return;
  const rec = new SR();
  rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = false;
  const mic = document.getElementById('mic-btn');
  const result = document.getElementById('speak-result');
  mic.classList.add('recording');
  result.innerHTML = '<div class="result try">🎙️ 聽你說...</div>';
  rec.onresult = (e) => {
    const said = e.results[0][0].transcript.toLowerCase().replace(/[.,!?]/g,'').trim();
    const target = state.currentLevel.story[state.speakIdx].toLowerCase().replace(/[.,!?]/g,'').trim();
    const targetWords = target.split(' '), saidWords = said.split(' ');
    let matches = 0;
    targetWords.forEach(w => { if (saidWords.includes(w)) matches++; });
    const score = matches / targetWords.length;
    mic.classList.remove('recording');
    if (score >= 0.7) {
      result.innerHTML = '<div class="result good">👍 很棒！你說的：「' + said + '」</div>';
      state.tempScore.speak++;
      state.totalSpoken++; saveStats();
      sfxCorrect();
      setTimeout(nextSpeak, 1500);
    } else {
      result.innerHTML = '<div class="result try">🔁 再試一次！你說的：「' + said + '」<br>應該是：「' + state.currentLevel.story[state.speakIdx] + '」</div>';
    }
  };
  rec.onerror = (e) => {
    mic.classList.remove('recording');
    let msg = '沒聽到聲音，再試一次';
    if (e.error === 'not-allowed') msg = '請允許麥克風權限後再試';
    if (e.error === 'network') msg = '網路問題，請確認連線';
    result.innerHTML = '<div class="result try">' + msg + '</div>';
  };
  rec.onend = () => mic.classList.remove('recording');
  try { rec.start(); } catch(e) { mic.classList.remove('recording'); }
}

function nextSpeak() {
  state.speakIdx++;
  if (state.speakIdx >= state.currentLevel.story.length) {
    state.currentStep = 2; state.speakIdx = 0;
  }
  render();
}

function finishLevel() {
  const lvl = state.currentLevel;
  let stars = 1;
  if (state.tempScore.speak >= Math.ceil(lvl.story.length / 2)) stars++;
  if (state.tempScore.quiz) stars++;
  const key = levelKey(state.currentTheme, state.currentLevelIdx);
  const prev = state.progress[key] || { stars: 0 };
  const wasNew = !prev.completed;
  state.progress[key] = { completed: true, stars: Math.max(prev.stars, stars) };
  saveProgress();
  state.lastEarned = stars;
  state.view = 'reward';
  render();
  // celebrate
  sfxStar();
  if (stars >= 2) fireConfetti();
}

// ============ CHAT API ============
function startChatRecognition() {
  const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
  if (!SR) return;
  const rec = new SR();
  rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = false;
  const mic = document.getElementById('chat-mic');
  mic.classList.add('recording');
  rec.onresult = (e) => {
    document.getElementById('chat-input').value = e.results[0][0].transcript;
    mic.classList.remove('recording');
  };
  rec.onerror = () => mic.classList.remove('recording');
  rec.onend = () => mic.classList.remove('recording');
  try { rec.start(); } catch(e) { mic.classList.remove('recording'); }
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  const hasKey = (state.aiProvider === 'claude' && state.apiKey) || (state.aiProvider === 'gemini' && state.geminiKey) || (state.aiProvider === 'groq' && state.groqKey);
  if (!hasKey) { alert('請先到 ⚙️ 設定 設定 AI 金鑰'); return; }
  input.value = '';
  state.chatHistory.push({ role: 'user', content: text });
  state.chatLoading = true;
  state.chatJustReplied = false;
  render();

  const win = document.getElementById('chat-window');
  if (win) win.scrollTop = win.scrollHeight;

  try {
    let reply;
    if (state.aiProvider === 'claude') {
      reply = await callClaude(state.chatHistory, state.currentChar.system);
    } else if (state.aiProvider === 'gemini') {
      reply = await callGemini(state.chatHistory, state.currentChar.system);
    } else {
      reply = await callGroq(state.chatHistory, state.currentChar.system);
    }
    state.chatHistory.push({ role: 'assistant', content: reply });
    state.chatLoading = false;
    state.chatJustReplied = true;
    setTimeout(() => speak(reply, 0.9), 200);
    render();
    const w = document.getElementById('chat-window');
    if (w) w.scrollTop = w.scrollHeight;
    // Reset justReplied flag after animation
    setTimeout(() => { state.chatJustReplied = false; }, 1500);
  } catch (err) {
    state.chatLoading = false;
    state.chatHistory.push({ role: 'assistant', content: '⚠️ 錯誤：' + err.message });
    render();
  }
}

async function callClaude(history, systemPrompt) {
  const messages = history.map(m => ({ role: m.role, content: m.content }));
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': state.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages: messages
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

async function callGemini(history, systemPrompt) {
  // Gemini uses a slightly different format
  const contents = history.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + encodeURIComponent(state.geminiKey);
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: contents,
      generationConfig: { maxOutputTokens: 300, temperature: 0.7 }
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates[0].content.parts[0].text;
}

async function callGroq(history, systemPrompt) {
  // Groq uses OpenAI-compatible format
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({ role: m.role, content: m.content }))
  ];
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'authorization': 'Bearer ' + state.groqKey,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: messages,
      max_tokens: 300,
      temperature: 0.7
    })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

async function generateReviewStory() {
  state.reviewLoading = true;
  state.reviewStory = null;
  render();
  // Pick recent vocab (up to 8)
  const vocab = state.vocabBook.slice(-8);
  const wordList = vocab.map(v => v.en + '(' + v.cn + ')').join(', ');
  const systemPrompt = 'You are a writer for English learning. Write a very short story (3-5 sentences, 50-80 words) for a 7-10 year old child. Use VERY simple English. The story MUST naturally include these words: ' + vocab.map(v => v.en).join(', ') + '. After the story, on a new line write a Chinese translation. Format response as JSON: {"title": "short English title", "story": "the story", "translation": "中文翻譯"}. Only output the JSON, no other text or markdown.';
  try {
    let reply;
    if (state.aiProvider === 'claude') {
      reply = await callClaude([{ role: 'user', content: 'Write a story using these words: ' + wordList }], systemPrompt);
    } else if (state.aiProvider === 'gemini') {
      reply = await callGemini([{ role: 'user', content: 'Write a story using these words: ' + wordList }], systemPrompt);
    } else {
      reply = await callGroq([{ role: 'user', content: 'Write a story using these words: ' + wordList }], systemPrompt);
    }
    // Parse JSON from reply
    state.reviewStory = extractJSON(reply, 'object');
  } catch (err) {
    alert('產生失敗：' + err.message);
  } finally {
    state.reviewLoading = false;
    render();
  }
}

function exportData() {
  const data = {
    progress: state.progress,
    vocabBook: state.vocabBook,
    videoCompleted: state.videoCompleted,
    stats: {
      totalWordsLearned: state.totalWordsLearned,
      totalSpoken: state.totalSpoken,
      totalQuizCorrect: state.totalQuizCorrect
    },
    exportDate: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'english-adventure-backup-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (confirm('確定要匯入這份備份嗎？目前的資料會被覆蓋。')) {
        if (data.progress) { state.progress = data.progress; saveProgress(); }
        if (data.vocabBook) { state.vocabBook = data.vocabBook; saveVocabBook(); }
        if (data.videoCompleted) { state.videoCompleted = data.videoCompleted; saveVideoCompleted(); }
        if (data.stats) {
          state.totalWordsLearned = data.stats.totalWordsLearned || 0;
          state.totalSpoken = data.stats.totalSpoken || 0;
          state.totalQuizCorrect = data.stats.totalQuizCorrect || 0;
          saveStats();
        }
        alert('✓ 匯入成功！');
        render();
      }
    } catch (err) {
      alert('匯入失敗：檔案格式錯誤');
    }
  };
  reader.readAsText(file);
}

// ============ LOAD ============
async function loadLevels() {
  try {
    const [resL, resV] = await Promise.all([fetch('levels.json'), fetch('videos.json')]);
    if (!resL.ok) throw new Error('levels.json HTTP ' + resL.status);
    if (!resV.ok) throw new Error('videos.json HTTP ' + resV.status);
    const data = await resL.json();
    const vdata = await resV.json();
    THEMES = data.themes;
    PETS = data.pets;
    CHARACTERS = data.characters;
    VIDEO_CATEGORIES = vdata.categories;
    VIDEOS = vdata.videos;
    if (THEMES.length > 0) state.expandedThemes[THEMES[0].id] = true;
    render();
  } catch (e) {
    state.loadError = '載入關卡資料失敗：' + e.message + '<br><br>' +
      '<b>原因可能是：</b><br>' +
      '1. 你直接用瀏覽器開啟 index.html（file:// 開頭）→ 瀏覽器擋住讀取 levels.json<br>' +
      '2. levels.json 不在跟 index.html 同一個資料夾<br><br>' +
      '<b>解法：</b><br>' +
      '• <b>推薦</b>：直接上傳到 GitHub Pages，從網址開啟<br>' +
      '• 或在資料夾跑 <code>python3 -m http.server 8000</code>，瀏覽器開 http://localhost:8000';
    render();
  }
}

loadLevels();
