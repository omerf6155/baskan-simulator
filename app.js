/**
 * KAPADOKYA UHY DISPATCHER DRILL - CORE APPLICATION ENGINE
 * 1,395 Soru · 140 Blok · 35 Checkpoint
 * 0-Hata Kuralı & Otomasyonlu Çalışma Sistemi
 */

(function () {
  'use strict';

  // --- STATE MANAGEMENT ---
  const STORAGE_KEY = 'uhy_dispatcher_v2_state';

  let state = {
    completedBlocks: [],     // [1, 2, 3...]
    currentBlock: 1,         // 1 to 140
    checkpointScores: {},    // { [checkpointId]: { bestScore: 38, total: 40, date: '...' } }
    errorBank: [],           // [ { qId: 10, userAns: 1, correctAns: 2, source: 'Blok 1', timestamp: 12345 } ]
    currentTab: 'tab1'       // 'tab1', 'tab2', 'tab3'
  };

  let allQuestions = [];
  let blockQuestionsMap = {};     // { [blockId]: [q1, q2, ...] }
  let checkpointQuestionsMap = {};// { [checkpointId]: [q1, q2, ...] }
  let questionsById = {};

  // Active in-memory quiz states
  let currentQuizAnswers = {};
  let currentQuizMissedIds = [];
  let currentCheckpointId = null;
  let currentCheckpointAnswers = {};
  let errorFilter = 'all';

  // --- INITIALIZATION ---
  document.addEventListener('DOMContentLoaded', () => {
    loadState();
    initDatabase();
    setupNavigation();
    setupModals();
    renderCurrentTab();
  });

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      updateGlobalBadges();
    } catch (e) {
      console.warn('Save state error:', e);
    }
  }

  function initDatabase() {
    if (window.QUESTIONS_DATABASE && Array.isArray(window.QUESTIONS_DATABASE)) {
      allQuestions = window.QUESTIONS_DATABASE;
    } else {
      console.error('QUESTIONS_DATABASE not found on window!');
      return;
    }

    // Build indexing maps
    allQuestions.forEach(q => {
      questionsById[q.id] = q;

      const bId = q.block_id || Math.floor((q.id - 1) / 10) + 1;
      if (!blockQuestionsMap[bId]) blockQuestionsMap[bId] = [];
      blockQuestionsMap[bId].push(q);

      const cpId = q.checkpoint_id || Math.floor((q.id - 1) / 40) + 1;
      if (!checkpointQuestionsMap[cpId]) checkpointQuestionsMap[cpId] = [];
      checkpointQuestionsMap[cpId].push(q);
    });

    // Make sure currentBlock is valid
    const totalBlocks = Object.keys(blockQuestionsMap).length;
    if (state.currentBlock < 1) state.currentBlock = 1;
    if (state.currentBlock > totalBlocks) state.currentBlock = totalBlocks;

    updateGlobalBadges();
  }

  function updateGlobalBadges() {
    const totalQ = allQuestions.length;
    const totalBlocks = Object.keys(blockQuestionsMap).length;
    const completedBlocksCount = state.completedBlocks.length;
    const errorCount = state.errorBank.length;

    // Header badges
    const currentBlockNavBadge = document.getElementById('currentBlockNavBadge');
    if (currentBlockNavBadge) {
      currentBlockNavBadge.textContent = `Blok ${state.currentBlock}`;
    }

    const globalStatsText = document.getElementById('globalStatsText');
    if (globalStatsText) {
      globalStatsText.textContent = `${totalQ} Soru · ${completedBlocksCount}/${totalBlocks} Blok Bitti`;
    }

    // Bottom nav badges
    const checkpointAvailableBadge = document.getElementById('checkpointAvailableBadge');
    if (checkpointAvailableBadge) {
      const unlockedCount = getUnlockedCheckpointsCount();
      checkpointAvailableBadge.textContent = unlockedCount;
    }

    const errorCountBadge = document.getElementById('errorCountBadge');
    if (errorCountBadge) {
      errorCountBadge.textContent = errorCount;
      errorCountBadge.style.display = errorCount > 0 ? 'inline-block' : 'none';
    }

    const errorTotalBadge = document.getElementById('errorTotalBadge');
    if (errorTotalBadge) {
      errorTotalBadge.textContent = `${errorCount} Hata`;
    }
  }

  function getUnlockedCheckpointsCount() {
    let count = 0;
    const totalCheckpoints = Object.keys(checkpointQuestionsMap).length;
    for (let cpId = 1; cpId <= totalCheckpoints; cpId++) {
      if (isCheckpointUnlocked(cpId)) count++;
    }
    return count;
  }

  function isCheckpointUnlocked(cpId) {
    // Checkpoint k unlocks when blocks (4k-3), (4k-2), (4k-1), 4k are completed!
    const reqBlocks = [cpId * 4 - 3, cpId * 4 - 2, cpId * 4 - 1, cpId * 4];
    return reqBlocks.every(b => state.completedBlocks.includes(b));
  }

  // --- NAVIGATION (TABS) ---
  function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-item');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });
  }

  function switchTab(tabId) {
    state.currentTab = tabId;

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.add('hidden');
    });

    const activeView = document.getElementById(`${tabId}View`);
    if (activeView) activeView.classList.remove('hidden');

    renderCurrentTab();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderCurrentTab() {
    if (state.currentTab === 'tab1') {
      renderBlockStudyScreen();
    } else if (state.currentTab === 'tab2') {
      renderCheckpointList();
    } else if (state.currentTab === 'tab3') {
      renderErrorBank();
    }
  }

  // ==========================================================
  // TAB 1: 10'LUK BLOKLAR (EZBER & TEST SİSTEMİ)
  // ==========================================================

  // Subview A: Ezber & Hafıza Bloğu (Önce Cevaplar)
  function renderBlockStudyScreen() {
    showBlockSubview('blockStudyScreen');

    const bId = state.currentBlock;
    const questions = blockQuestionsMap[bId] || [];
    const totalBlocks = Object.keys(blockQuestionsMap).length;

    // Set badges
    document.getElementById('studyBlockBadge').textContent = `BLOK ${bId} / ${totalBlocks}`;
    const startNum = (bId - 1) * 10 + 1;
    const endNum = startNum + questions.length - 1;
    document.getElementById('studyRangeBadge').textContent = `Sorular ${startNum} - ${endNum}`;

    const listContainer = document.getElementById('studyQuestionsList');
    listContainer.innerHTML = '';

    const letters = ['A', 'B', 'C', 'D'];

    questions.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'q-card';

      let optionsHtml = '';
      q.options.forEach((opt, oIdx) => {
        const isCorrect = oIdx === q.answer;
        optionsHtml += `
          <div class="study-opt ${isCorrect ? 'is-correct' : ''}">
            <span class="opt-letter">${letters[oIdx]})</span>
            <span class="opt-text">${escapeHtml(opt)}</span>
            ${isCorrect ? '<span class="correct-tag">✓ Doğru Cevap</span>' : ''}
          </div>
        `;
      });

      card.innerHTML = `
        <div class="q-card-header">
          <span class="q-num-badge">Soru ${idx + 1} (${q.orig_id || '#' + q.id})</span>
          <span class="q-category-tag">${escapeHtml(q.category || 'Dispeç')}</span>
        </div>
        <div class="q-text">${escapeHtml(q.question)}</div>
        <div class="study-options-list">
          ${optionsHtml}
        </div>
        <div class="memory-peg-box">
          ${escapeHtml(q.explanation || 'Bu soru için hafıza çivisi: Doğru cevabı dikkatlice ezberle.')}
        </div>
      `;

      listContainer.appendChild(card);
    });

    // Start Test button
    const btnStart = document.getElementById('btnStartBlockQuiz');
    btnStart.onclick = () => {
      renderBlockQuizScreen();
    };

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Subview B: 10 Soruluk Test Ekranı
  function renderBlockQuizScreen() {
    showBlockSubview('blockQuizScreen');

    const bId = state.currentBlock;
    const questions = blockQuestionsMap[bId] || [];
    currentQuizAnswers = {};

    document.getElementById('quizBlockBadge').textContent = `Blok ${bId} Testi`;
    updateQuizProgress(0, questions.length);

    const listContainer = document.getElementById('quizQuestionsList');
    listContainer.innerHTML = '';

    const letters = ['A', 'B', 'C', 'D'];

    questions.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'q-card';
      card.id = `quizCard_${q.id}`;

      let optionsHtml = '';
      q.options.forEach((opt, oIdx) => {
        optionsHtml += `
          <button type="button" class="quiz-opt-btn" data-qid="${q.id}" data-oidx="${oIdx}">
            <span class="opt-circle">${letters[oIdx]}</span>
            <span class="opt-text">${escapeHtml(opt)}</span>
          </button>
        `;
      });

      card.innerHTML = `
        <div class="q-card-header">
          <span class="q-num-badge">Soru ${idx + 1} / ${questions.length}</span>
          <span class="q-category-tag">${escapeHtml(q.category || 'Dispeç')}</span>
        </div>
        <div class="q-text">${escapeHtml(q.question)}</div>
        <div class="quiz-options-grid">
          ${optionsHtml}
        </div>
      `;

      listContainer.appendChild(card);
    });

    // Attach option click handlers
    listContainer.querySelectorAll('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = parseInt(btn.getAttribute('data-qid'), 10);
        const oIdx = parseInt(btn.getAttribute('data-oidx'), 10);

        currentQuizAnswers[qId] = oIdx;

        // Visual selection
        const siblings = listContainer.querySelectorAll(`.quiz-opt-btn[data-qid="${qId}"]`);
        siblings.forEach(s => s.classList.remove('selected'));
        btn.classList.add('selected');

        const answeredCount = Object.keys(currentQuizAnswers).length;
        updateQuizProgress(answeredCount, questions.length);

        if (navigator.vibrate) navigator.vibrate(10);
      });
    });

    // Submit Quiz Button
    const btnSubmit = document.getElementById('btnSubmitBlockQuiz');
    btnSubmit.onclick = () => {
      const answeredCount = Object.keys(currentQuizAnswers).length;
      if (answeredCount < questions.length) {
        // Find first unanswered question
        for (let q of questions) {
          if (currentQuizAnswers[q.id] === undefined) {
            const cardEl = document.getElementById(`quizCard_${q.id}`);
            if (cardEl) {
              cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              cardEl.style.borderColor = 'var(--danger)';
              setTimeout(() => { cardEl.style.borderColor = ''; }, 1500);
            }
            alert(`Cano, henüz cevaplamadığın soru var! (${answeredCount}/${questions.length})`);
            break;
          }
        }
        return;
      }

      evaluateBlockQuiz(questions);
    };

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateQuizProgress(answered, total) {
    const countEl = document.getElementById('quizAnsweredCount');
    const fillEl = document.getElementById('quizProgressFill');
    if (countEl) countEl.textContent = `${answered} / ${total} İşaretlendi`;
    if (fillEl) fillEl.style.width = `${(answered / total) * 100}%`;
  }

  // Subview C: Sonuç & Hata İnceleme Ekranı
  function evaluateBlockQuiz(questions) {
    showBlockSubview('blockResultScreen');

    const bId = state.currentBlock;
    const missed = [];
    const correct = [];

    questions.forEach(q => {
      const userAns = currentQuizAnswers[q.id];
      if (userAns === q.answer) {
        correct.push(q);
      } else {
        missed.push({
          q: q,
          userAns: userAns,
          correctAns: q.answer
        });
        // Record into Error Bank
        recordError(q.id, userAns, q.answer, `Blok ${bId}`);
      }
    });

    currentQuizMissedIds = missed.map(m => m.q.id);

    const isPerfect = missed.length === 0;

    // Banner rendering
    const banner = document.getElementById('resultBanner');
    const letters = ['A', 'B', 'C', 'D'];

    if (isPerfect) {
      banner.className = 'result-banner success';
      banner.innerHTML = `
        <div class="result-icon">🎯</div>
        <h2 class="result-title">Kusursuz! 10/10 Tam İsabet!</h2>
        <div class="result-score-text">0 Yanlış - Blok ${bId} Başarıyla Tamamlandı!</div>
        <p class="result-subdesc">Bu blok hafızana tam kilitlendi. Bir sonraki blok seni bekliyor!</p>
      `;

      // Mark block as completed if not already
      if (!state.completedBlocks.includes(bId)) {
        state.completedBlocks.push(bId);
        saveState();
      }

      // Checkpoint progress note
      const cpId = Math.ceil(bId / 4);
      const cpBlocks = [cpId * 4 - 3, cpId * 4 - 2, cpId * 4 - 1, cpId * 4];
      const cpDone = cpBlocks.filter(b => state.completedBlocks.includes(b)).length;

      document.getElementById('mistakesReviewContainer').innerHTML = `
        <div class="memory-peg-box" style="margin-top: 16px;">
          <strong>🎯 Checkpoint ${cpId} İlerlemesi:</strong> ${cpDone}/4 Blok Tamamlandı.<br>
          ${cpDone === 4 ? '🎉 <strong>Tebrikler!</strong> Bu 4 blok bitti, Checkpoint ' + cpId + ' (40 Soru) Denemesi açıldı!' : 'Kalan ' + (4 - cpDone) + ' blok tamamlanınca ' + cpId + '. Checkpoint (40 Soru) açılacak.'}
        </div>
      `;

      // Footer button: Go to next block
      const totalBlocks = Object.keys(blockQuestionsMap).length;
      const footerActions = document.getElementById('resultFooterActions');
      if (bId < totalBlocks) {
        footerActions.innerHTML = `
          <button class="primary-btn btn-cta" id="btnNextBlock">
            <span>Sonraki Bloğa Geç (Blok ${bId + 1}) ➡️</span>
          </button>
        `;
        document.getElementById('btnNextBlock').onclick = () => {
          state.currentBlock = bId + 1;
          saveState();
          renderBlockStudyScreen();
        };
      } else {
        footerActions.innerHTML = `
          <div class="memory-peg-box" style="text-align: center; width: 100%;">
            🏆 <strong>TÜM 140 BLOK TAMAMLANDI!</strong> Efsanesin cano!
          </div>
        `;
      }

    } else {
      // Mistakes exist - Enforce 0 Wrong Rule
      banner.className = 'result-banner failed';
      banner.innerHTML = `
        <div class="result-icon">⚠️</div>
        <h2 class="result-title">0 Yanlış Kuralı Devrede!</h2>
        <div class="result-score-text">${correct.length} Doğru · ${missed.length} Yanlış</div>
        <p class="result-subdesc">Bir sonraki bloğa geçebilmek için bu bloktaki tüm yanlışları 0'a indirmen gerekiyor. Aşağıdaki nedenleri incele ve telafi testine başla!</p>
      `;

      // Render mistakes review cards (Buradaki Sistem)
      const listContainer = document.getElementById('reviewMistakesList');
      listContainer.innerHTML = '';

      missed.forEach((m, idx) => {
        const q = m.q;
        const userOptText = q.options[m.userAns] || 'Boş';
        const correctOptText = q.options[m.correctAns];

        const card = document.createElement('div');
        card.className = 'mistake-card';
        card.innerHTML = `
          <div class="q-card-header">
            <span class="q-num-badge" style="color: var(--danger)">Hata #${idx + 1} (${q.orig_id || '#' + q.id})</span>
            <span class="q-category-tag">${escapeHtml(q.category || 'Dispeç')}</span>
          </div>
          <div class="q-text">${escapeHtml(q.question)}</div>
          <div class="mistake-answers-box">
            <div class="mistake-ans-row wrong">
              <span class="ans-indicator">❌ Senin Cevabın:</span>
              <span><strong>${letters[m.userAns]})</strong> ${escapeHtml(userOptText)}</span>
            </div>
            <div class="mistake-ans-row correct">
              <span class="ans-indicator">✅ Doğru Cevap:</span>
              <span><strong>${letters[m.correctAns]})</strong> ${escapeHtml(correctOptText)}</span>
            </div>
          </div>
          <div class="memory-peg-box">
            ${escapeHtml(q.explanation || 'Doğru şıkkı hafızana kaydet.')}
          </div>
        `;
        listContainer.appendChild(card);
      });

      // Footer Button: Retry Mistakes
      const footerActions = document.getElementById('resultFooterActions');
      footerActions.innerHTML = `
        <button class="primary-btn btn-danger" id="btnStartRetryQuiz">
          <span>Yanlışları Tekrar Çöz (${missed.length} Soru) 🔄</span>
        </button>
      `;
      document.getElementById('btnStartRetryQuiz').onclick = () => {
        renderBlockRetryScreen(missed.map(m => m.q));
      };
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Subview D: Hızlı Telafi Testi (Sadece Yanlış Yapılan Sorular)
  function renderBlockRetryScreen(retryQuestions) {
    showBlockSubview('blockRetryScreen');

    const letters = ['A', 'B', 'C', 'D'];
    const retryAnswers = {};

    updateRetryProgress(0, retryQuestions.length);

    const listContainer = document.getElementById('retryQuestionsList');
    listContainer.innerHTML = '';

    retryQuestions.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'q-card';
      card.id = `retryCard_${q.id}`;

      let optionsHtml = '';
      q.options.forEach((opt, oIdx) => {
        optionsHtml += `
          <button type="button" class="quiz-opt-btn" data-qid="${q.id}" data-oidx="${oIdx}">
            <span class="opt-circle">${letters[oIdx]}</span>
            <span class="opt-text">${escapeHtml(opt)}</span>
          </button>
        `;
      });

      card.innerHTML = `
        <div class="q-card-header">
          <span class="q-num-badge" style="color: #f87171">Telafi Sorusu ${idx + 1} / ${retryQuestions.length}</span>
          <span class="q-category-tag">${escapeHtml(q.category || 'Dispeç')}</span>
        </div>
        <div class="q-text">${escapeHtml(q.question)}</div>
        <div class="quiz-options-grid">
          ${optionsHtml}
        </div>
      `;

      listContainer.appendChild(card);
    });

    listContainer.querySelectorAll('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = parseInt(btn.getAttribute('data-qid'), 10);
        const oIdx = parseInt(btn.getAttribute('data-oidx'), 10);

        retryAnswers[qId] = oIdx;

        const siblings = listContainer.querySelectorAll(`.quiz-opt-btn[data-qid="${qId}"]`);
        siblings.forEach(s => s.classList.remove('selected'));
        btn.classList.add('selected');

        const answeredCount = Object.keys(retryAnswers).length;
        updateRetryProgress(answeredCount, retryQuestions.length);

        if (navigator.vibrate) navigator.vibrate(10);
      });
    });

    const btnSubmitRetry = document.getElementById('btnSubmitRetryQuiz');
    btnSubmitRetry.onclick = () => {
      const answeredCount = Object.keys(retryAnswers).length;
      if (answeredCount < retryQuestions.length) {
        alert(`Cano, telafi testindeki tüm soruları işaretlemelisin! (${answeredCount}/${retryQuestions.length})`);
        return;
      }

      // Check answers
      const stillMissed = [];
      retryQuestions.forEach(q => {
        if (retryAnswers[q.id] === q.answer) {
          // Solved correctly! Remove from error bank
          removeError(q.id);
        } else {
          stillMissed.push(q);
        }
      });

      if (stillMissed.length === 0) {
        // SUCCESS: All mistakes resolved! Block is complete (0 wrong achieved!)
        const bId = state.currentBlock;
        if (!state.completedBlocks.includes(bId)) {
          state.completedBlocks.push(bId);
          saveState();
        }
        alert(`Harika cano! Yanlışların tamamını düzelttin. Blok ${bId} 10/10 ile tamamlandı! 🎉`);
        
        // Re-evaluate to show congratulations & advance button
        evaluateBlockQuiz(blockQuestionsMap[bId]);
      } else {
        alert(`Hala ${stillMissed.length} soruda takıldın. Nedenleri tekrar inceleyip hemen telafi edelim!`);
        renderBlockRetryScreen(stillMissed);
      }
    };

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateRetryProgress(answered, total) {
    const countEl = document.getElementById('retryAnsweredCount');
    const fillEl = document.getElementById('retryProgressFill');
    if (countEl) countEl.textContent = `${answered} / ${total} İşaretlendi`;
    if (fillEl) fillEl.style.width = `${(answered / total) * 100}%`;
  }

  function showBlockSubview(subviewId) {
    const subviews = ['blockStudyScreen', 'blockQuizScreen', 'blockResultScreen', 'blockRetryScreen'];
    subviews.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', id !== subviewId);
    });
  }

  // ==========================================================
  // TAB 2: CHECKPOINTS (40'LIK DENEMELER)
  // ==========================================================
  function renderCheckpointList() {
    showCheckpointSubview('checkpointListScreen');

    const container = document.getElementById('checkpointCardsContainer');
    container.innerHTML = '';

    const totalCheckpoints = Object.keys(checkpointQuestionsMap).length;

    for (let cpId = 1; cpId <= totalCheckpoints; cpId++) {
      const questions = checkpointQuestionsMap[cpId] || [];
      const isUnlocked = isCheckpointUnlocked(cpId);
      const scoreData = state.checkpointScores[cpId];

      const startQ = (cpId - 1) * 40 + 1;
      const endQ = startQ + questions.length - 1;

      // Calculate block completion progress for this checkpoint
      const reqBlocks = [cpId * 4 - 3, cpId * 4 - 2, cpId * 4 - 1, cpId * 4];
      const completedReqBlocks = reqBlocks.filter(b => state.completedBlocks.includes(b)).length;

      const card = document.createElement('div');
      card.className = `checkpoint-row-card ${isUnlocked ? 'unlocked' : 'locked'}`;

      let statusBadgeHtml = '';
      let actionBtnHtml = '';

      if (isUnlocked) {
        if (scoreData) {
          statusBadgeHtml = `<span class="checkpoint-status-badge done">En İyi: ${scoreData.bestScore}/40 (%${Math.round((scoreData.bestScore/40)*100)})</span>`;
          actionBtnHtml = `<button class="checkpoint-action-btn" data-cpid="${cpId}">Tekrar Çöz (${questions.length} Soru) 🔄</button>`;
        } else {
          statusBadgeHtml = `<span class="checkpoint-status-badge available">Çözülmeye Hazır</span>`;
          actionBtnHtml = `<button class="checkpoint-action-btn" data-cpid="${cpId}">40'lık Denemeyi Başlat 🚀</button>`;
        }
      } else {
        statusBadgeHtml = `<span class="checkpoint-status-badge locked">🔒 Kilitli (${completedReqBlocks}/4 Blok)</span>`;
        actionBtnHtml = `<button class="checkpoint-action-btn disabled" disabled>Blok ${reqBlocks[0]}-${reqBlocks[3]}'ü Tamamla</button>`;
      }

      card.innerHTML = `
        <div class="checkpoint-top-meta">
          <div class="checkpoint-title-wrap">
            <h3>${cpId}. Checkpoint</h3>
            <span class="checkpoint-range-sub">Sorular ${startQ} - ${endQ} (${questions.length} Soru)</span>
          </div>
          ${statusBadgeHtml}
        </div>
        ${actionBtnHtml}
      `;

      container.appendChild(card);
    }

    // Attach click events
    container.querySelectorAll('.checkpoint-action-btn:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        const cpId = parseInt(btn.getAttribute('data-cpid'), 10);
        startCheckpointQuiz(cpId);
      });
    });
  }

  function startCheckpointQuiz(cpId) {
    currentCheckpointId = cpId;
    currentCheckpointAnswers = {};
    showCheckpointSubview('checkpointQuizScreen');

    const questions = checkpointQuestionsMap[cpId] || [];
    const letters = ['A', 'B', 'C', 'D'];

    document.getElementById('checkpointQuizTitle').textContent = `${cpId}. Checkpoint (${questions.length} Soru)`;
    updateCheckpointProgress(0, questions.length);

    const container = document.getElementById('checkpointQuestionsContainer');
    container.innerHTML = '';

    questions.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'q-card';
      card.id = `cpCard_${q.id}`;

      let optionsHtml = '';
      q.options.forEach((opt, oIdx) => {
        optionsHtml += `
          <button type="button" class="quiz-opt-btn" data-qid="${q.id}" data-oidx="${oIdx}">
            <span class="opt-circle">${letters[oIdx]}</span>
            <span class="opt-text">${escapeHtml(opt)}</span>
          </button>
        `;
      });

      card.innerHTML = `
        <div class="q-card-header">
          <span class="q-num-badge">Soru ${idx + 1} / ${questions.length} (${q.orig_id || '#' + q.id})</span>
          <span class="q-category-tag">${escapeHtml(q.category || 'Dispeç')}</span>
        </div>
        <div class="q-text">${escapeHtml(q.question)}</div>
        <div class="quiz-options-grid">
          ${optionsHtml}
        </div>
      `;

      container.appendChild(card);
    });

    container.querySelectorAll('.quiz-opt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = parseInt(btn.getAttribute('data-qid'), 10);
        const oIdx = parseInt(btn.getAttribute('data-oidx'), 10);

        currentCheckpointAnswers[qId] = oIdx;

        const siblings = container.querySelectorAll(`.quiz-opt-btn[data-qid="${qId}"]`);
        siblings.forEach(s => s.classList.remove('selected'));
        btn.classList.add('selected');

        const answeredCount = Object.keys(currentCheckpointAnswers).length;
        updateCheckpointProgress(answeredCount, questions.length);

        if (navigator.vibrate) navigator.vibrate(10);
      });
    });

    // Exit Button
    document.getElementById('btnExitCheckpoint').onclick = () => {
      if (confirm('Denemeden çıkmak istiyor musun? İlerlemen kaydedilmeyecektir.')) {
        renderCheckpointList();
      }
    };

    // Submit Checkpoint
    document.getElementById('btnSubmitCheckpointQuiz').onclick = () => {
      const answeredCount = Object.keys(currentCheckpointAnswers).length;
      if (answeredCount < questions.length) {
        if (!confirm(`Henüz ${questions.length - answeredCount} soru boş! Denemeyi yine de bitirmek istiyor musun?`)) {
          return;
        }
      }
      evaluateCheckpointQuiz(cpId, questions);
    };

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateCheckpointProgress(answered, total) {
    const countEl = document.getElementById('checkpointAnsweredCount');
    const fillEl = document.getElementById('checkpointProgressFill');
    if (countEl) countEl.textContent = `${answered} / ${total}`;
    if (fillEl) fillEl.style.width = `${(answered / total) * 100}%`;
  }

  function evaluateCheckpointQuiz(cpId, questions) {
    showCheckpointSubview('checkpointResultScreen');

    const letters = ['A', 'B', 'C', 'D'];
    let correctCount = 0;
    const missed = [];

    questions.forEach(q => {
      const userAns = currentCheckpointAnswers[q.id];
      if (userAns === q.answer) {
        correctCount++;
      } else {
        missed.push({
          q: q,
          userAns: userAns !== undefined ? userAns : -1,
          correctAns: q.answer
        });
        // Auto log to error bank
        recordError(q.id, userAns, q.answer, `${cpId}. Checkpoint`);
      }
    });

    // Update state score
    const prevBest = state.checkpointScores[cpId]?.bestScore || 0;
    state.checkpointScores[cpId] = {
      bestScore: Math.max(prevBest, correctCount),
      total: questions.length,
      lastScore: correctCount,
      date: new Date().toISOString()
    };
    saveState();

    const banner = document.getElementById('checkpointResultBanner');
    const percent = Math.round((correctCount / questions.length) * 100);
    const isPass = percent >= 75;

    banner.className = `result-banner ${isPass ? 'success' : 'failed'}`;
    banner.innerHTML = `
      <div class="result-icon">${isPass ? '🏆' : '📊'}</div>
      <h2 class="result-title">${cpId}. Checkpoint Tamamlandı!</h2>
      <div class="result-score-text">${correctCount} / ${questions.length} Doğru (%${percent})</div>
      <p class="result-subdesc">${isPass ? 'Harika sonuç! Bilgilerin pekişti.' : 'Biraz daha pratik yapmalısın. Hatalarını incele!'}</p>
    `;

    // Render mistake cards
    const listContainer = document.getElementById('checkpointMistakesReviewList');
    listContainer.innerHTML = '';

    if (missed.length > 0) {
      const heading = document.createElement('h3');
      heading.className = 'section-heading';
      heading.textContent = `Bu Denemedeki Hatalar (${missed.length} Soru)`;
      listContainer.appendChild(heading);

      missed.forEach((m, idx) => {
        const q = m.q;
        const userOptText = m.userAns >= 0 ? q.options[m.userAns] : 'Boş Bırakıldı';
        const correctOptText = q.options[m.correctAns];

        const card = document.createElement('div');
        card.className = 'mistake-card';
        card.innerHTML = `
          <div class="q-card-header">
            <span class="q-num-badge" style="color: var(--danger)">Hata #${idx + 1} (${q.orig_id || '#' + q.id})</span>
            <span class="q-category-tag">${escapeHtml(q.category || 'Dispeç')}</span>
          </div>
          <div class="q-text">${escapeHtml(q.question)}</div>
          <div class="mistake-answers-box">
            <div class="mistake-ans-row wrong">
              <span class="ans-indicator">❌ Senin Cevabın:</span>
              <span><strong>${m.userAns >= 0 ? letters[m.userAns] + ')' : ''}</strong> ${escapeHtml(userOptText)}</span>
            </div>
            <div class="mistake-ans-row correct">
              <span class="ans-indicator">✅ Doğru Cevap:</span>
              <span><strong>${letters[m.correctAns]})</strong> ${escapeHtml(correctOptText)}</span>
            </div>
          </div>
          <div class="memory-peg-box">
            ${escapeHtml(q.explanation || 'Doğru şıkkı hafızana kaydet.')}
          </div>
        `;
        listContainer.appendChild(card);
      });
    }

    document.getElementById('btnBackToCheckpoints').onclick = () => {
      renderCheckpointList();
    };

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showCheckpointSubview(subviewId) {
    const subviews = ['checkpointListScreen', 'checkpointQuizScreen', 'checkpointResultScreen'];
    subviews.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', id !== subviewId);
    });
  }

  // ==========================================================
  // TAB 3: HATA BANKASI (YANLIŞ YAPILAN SORULAR)
  // ==========================================================
  function recordError(qId, userAns, correctAns, source) {
    // If question already in error bank, update it
    const existingIdx = state.errorBank.findIndex(e => e.qId === qId);
    const entry = {
      qId: qId,
      userAns: userAns,
      correctAns: correctAns,
      source: source,
      timestamp: Date.now()
    };

    if (existingIdx >= 0) {
      state.errorBank[existingIdx] = entry;
    } else {
      state.errorBank.unshift(entry);
    }
    saveState();
  }

  function removeError(qId) {
    state.errorBank = state.errorBank.filter(e => e.qId !== qId);
    saveState();
  }

  function renderErrorBank() {
    const container = document.getElementById('errorBankCardsContainer');
    container.innerHTML = '';

    const letters = ['A', 'B', 'C', 'D'];
    const allErrors = state.errorBank;

    // Filter counts
    const blockErrors = allErrors.filter(e => e.source && e.source.startsWith('Blok'));
    const checkpointErrors = allErrors.filter(e => e.source && e.source.includes('Checkpoint'));

    document.getElementById('chipAllCount').textContent = allErrors.length;
    document.getElementById('chipBlockCount').textContent = blockErrors.length;
    document.getElementById('chipCheckpointCount').textContent = checkpointErrors.length;

    let filtered = allErrors;
    if (errorFilter === 'block') filtered = blockErrors;
    else if (errorFilter === 'checkpoint') filtered = checkpointErrors;

    const actionBar = document.getElementById('errorActionBar');
    if (filtered.length > 0) {
      actionBar.style.display = 'block';
      const btnDrill = document.getElementById('btnStartErrorDrill');
      btnDrill.onclick = () => {
        const errorQuestions = filtered.map(e => questionsById[e.qId]).filter(Boolean);
        switchTab('tab1');
        renderBlockRetryScreen(errorQuestions);
      };
    } else {
      actionBar.style.display = 'none';
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-icon">🎉</div>
          <h3>Tertemiz Cano!</h3>
          <p>${allErrors.length === 0 ? 'Şu anda hiç kayıtlı yanlış soru yok. Blokları çözmeye devam et!' : 'Bu filtrede hiç hata bulunmuyor.'}</p>
        </div>
      `;
      return;
    }

    filtered.forEach(err => {
      const q = questionsById[err.qId];
      if (!q) return;

      const userOptText = err.userAns >= 0 && q.options[err.userAns] ? q.options[err.userAns] : 'Boş Bırakıldı';
      const correctOptText = q.options[q.answer];

      const card = document.createElement('div');
      card.className = 'mistake-card';
      card.id = `errCard_${q.id}`;

      card.innerHTML = `
        <div class="q-card-header">
          <span class="q-num-badge" style="color: var(--danger)">${escapeHtml(err.source || 'Hata')} · ${q.orig_id || '#' + q.id}</span>
          <span class="q-category-tag">${escapeHtml(q.category || 'Dispeç')}</span>
        </div>
        <div class="q-text">${escapeHtml(q.question)}</div>
        <div class="mistake-answers-box">
          <div class="mistake-ans-row wrong">
            <span class="ans-indicator">❌ Yanlışın:</span>
            <span><strong>${err.userAns >= 0 ? letters[err.userAns] + ')' : ''}</strong> ${escapeHtml(userOptText)}</span>
          </div>
          <div class="mistake-ans-row correct">
            <span class="ans-indicator">✅ Doğru Cevap:</span>
            <span><strong>${letters[q.answer]})</strong> ${escapeHtml(correctOptText)}</span>
          </div>
        </div>
        <div class="memory-peg-box">
          ${escapeHtml(q.explanation || 'Doğru şıkkı hafızana kaydet.')}
        </div>
        <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
          <button class="primary-btn btn-cta" style="width: auto; padding: 8px 16px; font-size: 13px;" data-retry-qid="${q.id}">
            Bu Soruyu Tekrar Çöz 🎯
          </button>
        </div>
      `;

      container.appendChild(card);
    });

    // Attach mini retry handlers
    container.querySelectorAll('button[data-retry-qid]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = parseInt(btn.getAttribute('data-retry-qid'), 10);
        const q = questionsById[qId];
        if (q) {
          switchTab('tab1');
          renderBlockRetryScreen([q]);
        }
      });
    });

    // Chip filter handlers
    document.querySelectorAll('.filter-chips-row .chip').forEach(chip => {
      chip.onclick = () => {
        document.querySelectorAll('.filter-chips-row .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        errorFilter = chip.getAttribute('data-filter');
        renderErrorBank();
      };
    });
  }

  // ==========================================================
  // MODALS (BLOCK PICKER & SETTINGS)
  // ==========================================================
  function setupModals() {
    // Block Picker
    const btnBlockPicker = document.getElementById('btnBlockPicker');
    const blockPickerModal = document.getElementById('blockPickerModal');
    const btnCloseBlockPicker = document.getElementById('btnCloseBlockPicker');

    btnBlockPicker.onclick = () => {
      renderBlockGrid();
      blockPickerModal.classList.remove('hidden');
    };

    btnCloseBlockPicker.onclick = () => {
      blockPickerModal.classList.add('hidden');
    };

    blockPickerModal.onclick = (e) => {
      if (e.target === blockPickerModal) blockPickerModal.classList.add('hidden');
    };

    // Settings Modal
    const btnSettings = document.getElementById('btnSettings');
    const settingsModal = document.getElementById('settingsModal');
    const btnCloseSettings = document.getElementById('btnCloseSettings');

    btnSettings.onclick = () => {
      settingsModal.classList.remove('hidden');
    };

    btnCloseSettings.onclick = () => {
      settingsModal.classList.add('hidden');
    };

    settingsModal.onclick = (e) => {
      if (e.target === settingsModal) settingsModal.classList.add('hidden');
    };

    // Reset All Progress
    const btnReset = document.getElementById('btnResetAllProgress');
    btnReset.onclick = () => {
      if (confirm('DİKKAT! Tüm tamamlanan bloklar, puanlar ve hata bankası sıfırlanacaktır. Emin misin cano?')) {
        state = {
          completedBlocks: [],
          currentBlock: 1,
          checkpointScores: {},
          errorBank: [],
          currentTab: 'tab1'
        };
        saveState();
        settingsModal.classList.add('hidden');
        switchTab('tab1');
        alert('Tüm ilerleme sıfırlandı. 1. Bloktan tertemiz başlıyorsun!');
      }
    };
  }

  function renderBlockGrid() {
    const grid = document.getElementById('blockPickerGrid');
    grid.innerHTML = '';

    const totalBlocks = Object.keys(blockQuestionsMap).length;

    for (let bId = 1; bId <= totalBlocks; bId++) {
      const btn = document.createElement('button');
      btn.className = 'block-grid-btn';
      btn.textContent = bId;

      const isCompleted = state.completedBlocks.includes(bId);
      const isCurrent = state.currentBlock === bId;

      if (isCompleted) {
        btn.classList.add('completed');
      } else if (isCurrent) {
        btn.classList.add('current');
      }

      btn.onclick = () => {
        state.currentBlock = bId;
        saveState();
        document.getElementById('blockPickerModal').classList.add('hidden');
        switchTab('tab1');
      };

      grid.appendChild(btn);
    }
  }

  // --- UTILITY ---
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
