/**
 * KAPADOKYA UHY DISPATCHER DRILL - DUAL-TRACK CORE ENGINE (v2.2)
 * Track 1: UHY Dispeç (505 Slayt / 496 Özgün - Slayt 80'den Başlar)
 * Track 2: Genel Sorular (1,095 DOCX / 1,058 Özgün - S.679'dan Başlar)
 * 0-Yanlış Kuralı, Ghost Error Temizliği & Akıllı Havuz Seçimi
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'uhy_dual_tracks_state_v3';
  const SESSION_TRACK_KEY = 'uhy_session_track_chosen_v2';
  const THEME_KEY = 'uhy_theme_preference_v2';

  // Master Application State
  let appState = {
    version: 2,
    activeTrack: 'pptx', // 'pptx' or 'docx'
    currentTab: 'tab1',  // 'tab1', 'tab2', 'tab3'
    tracks: {
      pptx: {
        currentBlock: 1, // 1. bloktan başlar (Slayt 2-26)
        completedBlocks: [],
        checkpointScores: {},
        errorBank: []
      },
      docx: {
        currentBlock: 65,
        completedBlocks: Array.from({ length: 64 }, (_, i) => i + 1),
        checkpointScores: {},
        errorBank: []
      }
    }
  };

  // In-memory indexed structures for active track
  let currentTrackData = null;
  let activeQuestions = [];
  let blockQuestionsMap = {};
  let checkpointQuestionsMap = {};
  let questionsById = {};

  // Transient quiz states
  let currentQuizAnswers = {};
  let currentCheckpointId = null;
  let currentCheckpointAnswers = {};
  let errorFilter = 'all';

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadSavedState();
    setupTrackData();
    setupDOMEvents();
    renderAllViews();
    checkSessionWelcome();
  });

  function safeScrollToTop() {
    try {
      window.scrollTo(0, 0);
    } catch (e) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  // --- THEME MANAGEMENT ---
  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(savedTheme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}

    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#000000' : '#ffffff');
    }
  }

  // --- STATE MANAGEMENT ---
  function loadSavedState() {
    try {
      let saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        // Fallback check from v2 if exists
        saved = localStorage.getItem('uhy_dual_tracks_state_v2');
      }
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.tracks) {
          appState = { ...appState, ...parsed };

          // Always enforce pptx track as primary
          appState.activeTrack = 'pptx';

          // Scrub any phantom errors where userAns was undefined/null/-1
          ['pptx', 'docx'].forEach(k => {
            if (appState.tracks[k] && Array.isArray(appState.tracks[k].errorBank)) {
              appState.tracks[k].errorBank = appState.tracks[k].errorBank.filter(e => 
                e && e.userAns !== undefined && e.userAns !== null && e.userAns !== -1
              );
            }
          });

          // 25-Question Block Migration for PPTX:
          if (appState.tracks.pptx) {
            if (!appState.tracks.pptx.currentBlock || appState.tracks.pptx.currentBlock > 20 || appState.tracks.pptx.currentBlock < 1) {
              appState.tracks.pptx.currentBlock = 1;
            }
            if (Array.isArray(appState.tracks.pptx.completedBlocks)) {
              appState.tracks.pptx.completedBlocks = appState.tracks.pptx.completedBlocks.filter(b => b <= 20);
            }
          }
        }
      }
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }
  }

  function saveCurrentState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      updateTopBarAndBadges();
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  // --- SESSION WELCOME & TRACK PICKER ---
  function checkSessionWelcome() {
    // 500 Slayt havuzu varsayilan ve tek odaktir; modal asla otomatik acilmaz!
    sessionStorage.setItem(SESSION_TRACK_KEY, 'true');
  }

  function openTrackPickerModal() {
    updateTrackPickerModalData();
    const modal = document.getElementById('trackPickerModal');
    if (modal) modal.classList.remove('hidden');
  }

  function closeTrackPickerModal() {
    const modal = document.getElementById('trackPickerModal');
    if (modal) modal.classList.add('hidden');
  }

  function updateTrackPickerModalData() {
    const pptxState = appState.tracks.pptx;
    const pptxData = window.DATA_TRACKS ? window.DATA_TRACKS.pptx : null;
    if (pptxData) {
      const currSlide = getFirstSlideOfBlock('pptx', pptxState.currentBlock);
      const doneBlocks = pptxState.completedBlocks.length;
      const pct = Math.round((doneBlocks / pptxData.totalBlocks) * 100);
      document.getElementById('choosePPTXCurrTag').textContent = `Slayt ${currSlide}'den Devam`;
      document.getElementById('choosePPTXMetaText').textContent = `Slayt ${currSlide} / ${pptxData.totalSourceCount} · ${doneBlocks}/${pptxData.totalBlocks} Blok (%${pct})`;
    }

    const docxState = appState.tracks.docx;
    const docxData = window.DATA_TRACKS ? window.DATA_TRACKS.docx : null;
    if (docxData) {
      const currQ = getFirstDocxOfBlock(docxState.currentBlock);
      const doneBlocks = docxState.completedBlocks.length;
      const pct = Math.round((doneBlocks / docxData.totalBlocks) * 100);
      document.getElementById('chooseDOCXCurrTag').textContent = `S.${currQ}'den Devam`;
      document.getElementById('chooseDOCXMetaText').textContent = `Soru ${currQ} / ${docxData.totalSourceCount} · ${doneBlocks}/${docxData.totalBlocks} Blok (%${pct})`;
    }

    const choosePPTX = document.getElementById('chooseTrackPPTX');
    const chooseDOCX = document.getElementById('chooseTrackDOCX');
    if (choosePPTX) choosePPTX.classList.toggle('active', appState.activeTrack === 'pptx');
    if (chooseDOCX) chooseDOCX.classList.toggle('active', appState.activeTrack === 'docx');
  }

  // --- TRACK SETUP ---
  function setupTrackData() {
    if (!window.DATA_TRACKS) {
      console.error('DATA_TRACKS not found!');
      return;
    }

    const tKey = appState.activeTrack;
    currentTrackData = window.DATA_TRACKS[tKey];
    activeQuestions = currentTrackData.questions || [];

    // Re-index
    blockQuestionsMap = {};
    checkpointQuestionsMap = {};
    questionsById = {};

    activeQuestions.forEach(q => {
      questionsById[q.id] = q;

      const bId = q.block_id || Math.floor((q.id - 1) / (tKey === 'pptx' ? 25 : 10)) + 1;
      if (!blockQuestionsMap[bId]) blockQuestionsMap[bId] = [];
      blockQuestionsMap[bId].push(q);

      const cpId = q.checkpoint_id || Math.floor((q.id - 1) / 40) + 1;
      if (!checkpointQuestionsMap[cpId]) checkpointQuestionsMap[cpId] = [];
      checkpointQuestionsMap[cpId].push(q);
    });

    const trackState = appState.tracks[tKey];
    const totalBlocks = Object.keys(blockQuestionsMap).length;
    if (!trackState.currentBlock || trackState.currentBlock < 1) trackState.currentBlock = 1;
    if (trackState.currentBlock > totalBlocks) trackState.currentBlock = totalBlocks;
  }

  function selectTrack(trackKey) {
    appState.activeTrack = trackKey;
    sessionStorage.setItem(SESSION_TRACK_KEY, 'true');
    saveCurrentState();
    setupTrackData();
    closeTrackPickerModal();
    renderAllViews();
    safeScrollToTop();
  }

  // --- DOM EVENTS ---
  function setupDOMEvents() {
    // Header Track Pill Button (opens picker anytime)
    document.getElementById('activeTrackBtn').addEventListener('click', () => {
      openTrackPickerModal();
    });

    // Theme Toggle Button
    const btnTheme = document.getElementById('btnThemeToggle');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        const curr = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = curr === 'dark' ? 'light' : 'dark';
        applyTheme(next);
      });
    }

    // Track Picker Modal Choices
    document.getElementById('chooseTrackPPTX').addEventListener('click', () => selectTrack('pptx'));
    document.getElementById('chooseTrackDOCX').addEventListener('click', () => selectTrack('docx'));
    document.getElementById('btnCloseTrackPicker').addEventListener('click', closeTrackPickerModal);
    document.getElementById('trackPickerModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('trackPickerModal')) closeTrackPickerModal();
    });

    // Navigation Tabs
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    setupModals();
  }

  function switchTab(tabId) {
    appState.currentTab = tabId;

    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    document.querySelectorAll('.tab-view').forEach(view => {
      view.classList.add('hidden');
    });

    const activeView = document.getElementById(`${tabId}View`);
    if (activeView) activeView.classList.remove('hidden');

    renderTabContent();
    safeScrollToTop();
  }

  function renderAllViews() {
    updateTopBarAndBadges();
    renderTabContent();
  }

  function renderTabContent() {
    if (appState.currentTab === 'tab1') {
      renderBlockQuizScreen();
    } else if (appState.currentTab === 'tab2') {
      renderCheckpointList();
    } else if (appState.currentTab === 'tab3') {
      renderErrorBank();
    }
  }

  function updateTopBarAndBadges() {
    const tKey = appState.activeTrack;
    const trackState = appState.tracks[tKey];
    const tData = window.DATA_TRACKS ? window.DATA_TRACKS[tKey] : null;

    // Header Pill Label
    const activeTrackLabel = document.getElementById('activeTrackLabel');
    const activeTrackDot = document.getElementById('activeTrackDot');
    if (activeTrackLabel && activeTrackDot) {
      if (tKey === 'pptx') {
        const currSlide = getFirstSlideOfBlock('pptx', trackState.currentBlock);
        activeTrackLabel.textContent = `Slayt S.${currSlide}`;
        activeTrackDot.style.backgroundColor = '#ffffff';
        activeTrackDot.style.boxShadow = 'none';
      } else {
        const currQ = getFirstDocxOfBlock(trackState.currentBlock);
        activeTrackLabel.textContent = `Genel S.${currQ}`;
        activeTrackDot.style.backgroundColor = '#ffffff';
        activeTrackDot.style.boxShadow = 'none';
      }
    }

    const currentBlockNavBadge = document.getElementById('currentBlockNavBadge');
    if (currentBlockNavBadge) {
      currentBlockNavBadge.textContent = `Blok ${trackState.currentBlock}`;
    }

    // Dynamic Navigation Tab 1 Label
    const navTab1Label = document.querySelector('#navTab1 .nav-label');
    if (navTab1Label) {
      navTab1Label.textContent = tKey === 'pptx' ? "25'lik Bloklar" : "10'luk Bloklar";
    }

    // Dynamic Hero Description in Study Screen
    const studyHeroDesc = document.querySelector('#blockStudyScreen .hero-desc');
    if (studyHeroDesc) {
      const bQuestions = blockQuestionsMap[trackState.currentBlock] || [];
      const qCount = bQuestions.length || (tKey === 'pptx' ? 25 : 10);
      studyHeroDesc.innerHTML = `Önce ${qCount} sorunun doğru şıklarını ve 💡 <strong>Hafıza Çivilerini</strong> zihnine kazı. Hazır olunca teste başla!`;
    }

    // Bottom badges
    const cpBadge = document.getElementById('checkpointAvailableBadge');
    if (cpBadge) {
      cpBadge.textContent = getUnlockedCheckpointsCount();
    }

    const errBadge = document.getElementById('errorCountBadge');
    if (errBadge) {
      const errCount = trackState.errorBank.length;
      errBadge.textContent = errCount;
      errBadge.style.display = errCount > 0 ? 'inline-block' : 'none';
    }

    const errTotalBadge = document.getElementById('errorTotalBadge');
    if (errTotalBadge) {
      errTotalBadge.textContent = `${trackState.errorBank.length} Hata`;
    }
  }

  function getFirstSlideOfBlock(trackKey, bId) {
    if (trackKey !== 'pptx') return 1;
    const questions = (window.DATA_TRACKS?.pptx?.questions || []).filter(q => q.block_id === bId);
    return questions.length > 0 ? questions[0].slide_num : 1;
  }

  function getFirstDocxOfBlock(bId) {
    const questions = (window.DATA_TRACKS?.docx?.questions || []).filter(q => q.block_id === bId);
    return questions.length > 0 ? questions[0].docx_num : 1;
  }

  function getRequiredBlocksForCheckpoint(tKey, cpId) {
    if (tKey === 'pptx') {
      return [cpId * 2 - 1, cpId * 2]; // Her 2 blok (50 soru) = 1 Checkpoint
    }
    return [cpId * 4 - 3, cpId * 4 - 2, cpId * 4 - 1, cpId * 4]; // 4 blok (40 soru) = 1 Checkpoint
  }

  function getUnlockedCheckpointsCount() {
    const tKey = appState.activeTrack;
    const trackState = appState.tracks[tKey];
    let count = 0;
    const totalCheckpoints = Object.keys(checkpointQuestionsMap).length;
    for (let cpId = 1; cpId <= totalCheckpoints; cpId++) {
      const reqBlocks = getRequiredBlocksForCheckpoint(tKey, cpId);
      if (reqBlocks.every(b => trackState.completedBlocks.includes(b))) {
        count++;
      }
    }
    return count;
  }

  function isCheckpointUnlocked(cpId) {
    const tKey = appState.activeTrack;
    const trackState = appState.tracks[tKey];
    const reqBlocks = getRequiredBlocksForCheckpoint(tKey, cpId);
    return reqBlocks.every(b => trackState.completedBlocks.includes(b));
  }

  // ==========================================================
  // TAB 1: 10'LUK BLOKLAR (EZBER & TEST SİSTEMİ)
  // ==========================================================
  function renderBlockStudyScreen() {
    showBlockSubview('blockStudyScreen');

    const tKey = appState.activeTrack;
    const trackState = appState.tracks[tKey];
    const bId = trackState.currentBlock;
    const questions = blockQuestionsMap[bId] || [];
    const totalBlocks = Object.keys(blockQuestionsMap).length;

    document.getElementById('studyBlockBadge').textContent = `BLOK ${bId} / ${totalBlocks}`;
    
    if (tKey === 'pptx') {
      const startS = questions.length > 0 ? questions[0].slide_num : 1;
      const endS = questions.length > 0 ? questions[questions.length - 1].slide_num : startS;
      document.getElementById('studyRangeBadge').textContent = `Slayt S.${startS} - S.${endS}`;
    } else {
      const startD = questions.length > 0 ? questions[0].docx_num : 1;
      const endD = questions.length > 0 ? questions[questions.length - 1].docx_num : startD;
      document.getElementById('studyRangeBadge').textContent = `Genel S.${startD} - S.${endD}`;
    }

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

      let traceBadge = '';
      if (tKey === 'pptx') {
        traceBadge = `📙 ${q.slide_label || 'Slayt S.' + q.slide_num} / 505`;
        if (q.dup_slides && q.dup_slides.length > 0) {
          traceBadge += ` (Tekrar: S.${q.dup_slides.join(', S.')})`;
        }
      } else {
        traceBadge = `📘 ${q.docx_label || 'Genel S.' + q.docx_num} / 1095`;
      }

      card.innerHTML = `
        <div class="q-card-header">
          <span class="q-num-badge">${traceBadge}</span>
          <span class="q-category-tag">${escapeHtml(q.category || 'Dispeç')}</span>
        </div>
        <div class="q-text">${escapeHtml(q.question)}</div>
        <div class="study-options-list">
          ${optionsHtml}
        </div>
        <div class="memory-peg-box">
          ${escapeHtml(q.explanation || 'Doğru seçeneği hafızana al.')}
        </div>
      `;

      listContainer.appendChild(card);
    });

    const btnStart = document.getElementById('btnStartBlockQuiz');
    if (btnStart) {
      const btnText = btnStart.querySelector('.btn-text');
      if (btnText) btnText.textContent = `Soruları Ver / Teste Başla (${questions.length} Soru) 🚀`;
      btnStart.onclick = () => {
        renderBlockQuizScreen();
      };
    }

    safeScrollToTop();
  }

  function renderBlockQuizScreen() {
    showBlockSubview('blockQuizScreen');

    const tKey = appState.activeTrack;
    const trackState = appState.tracks[tKey];
    const bId = trackState.currentBlock;
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

      const traceBadge = tKey === 'pptx' ? `📙 Slayt S.${q.slide_num}` : `📘 Genel S.${q.docx_num}`;

      card.innerHTML = `
        <div class="q-card-header">
          <span class="q-num-badge">${traceBadge} · Soru ${idx + 1} / ${questions.length}</span>
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

        currentQuizAnswers[qId] = oIdx;

        const siblings = listContainer.querySelectorAll(`.quiz-opt-btn[data-qid="${qId}"]`);
        siblings.forEach(s => s.classList.remove('selected'));
        btn.classList.add('selected');

        const answeredCount = Object.keys(currentQuizAnswers).length;
        updateQuizProgress(answeredCount, questions.length);

        if (navigator.vibrate) navigator.vibrate(10);
      });
    });

    document.getElementById('btnSubmitBlockQuiz').onclick = () => {
      const answeredCount = Object.keys(currentQuizAnswers).length;
      if (answeredCount < questions.length) {
        for (let q of questions) {
          if (currentQuizAnswers[q.id] === undefined) {
            const cardEl = document.getElementById(`quizCard_${q.id}`);
            if (cardEl) {
              cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              cardEl.style.borderColor = 'var(--danger)';
              setTimeout(() => { cardEl.style.borderColor = ''; }, 1500);
            }
            alert(`Cano, henüz işaretlemediğin sorular var! (${answeredCount}/${questions.length})`);
            break;
          }
        }
        return;
      }
      evaluateBlockQuiz(questions);
    };

    safeScrollToTop();
  }

  function updateQuizProgress(answered, total) {
    const countEl = document.getElementById('quizAnsweredCount');
    const fillEl = document.getElementById('quizProgressFill');
    if (countEl) countEl.textContent = `${answered} / ${total} İşaretlendi`;
    if (fillEl) fillEl.style.width = `${(answered / total) * 100}%`;
  }

  function evaluateBlockQuiz(questions) {
    const tKey = appState.activeTrack;
    const trackState = appState.tracks[tKey];
    const bId = trackState.currentBlock;
    const missed = [];
    const correct = [];

    questions.forEach(q => {
      const userAns = currentQuizAnswers[q.id];
      if (userAns !== undefined && userAns === q.answer) {
        correct.push(q);
        removeError(q.id); // If it was in error bank, clear it
      } else if (userAns !== undefined && userAns !== q.answer) {
        missed.push({
          q: q,
          userAns: userAns,
          correctAns: q.answer
        });
        recordError(q.id, userAns, q.answer, `Blok ${bId}`);
      }
    });

    if (missed.length === 0) {
      showBlockSuccess(bId);
    } else {
      showBlockMistakesReview(bId, missed, correct);
    }
  }

  function showBlockSuccess(bId) {
    showBlockSubview('blockResultScreen');

    const tKey = appState.activeTrack;
    const trackState = appState.tracks[tKey];
    const questions = blockQuestionsMap[bId] || [];
    const totalQ = questions.length || (tKey === 'pptx' ? 25 : 10);

    if (!trackState.completedBlocks.includes(bId)) {
      trackState.completedBlocks.push(bId);
      saveCurrentState();
    }

    const banner = document.getElementById('resultBanner');
    banner.className = 'result-banner success';
    banner.innerHTML = `
      <div class="result-icon">🎯</div>
      <h2 class="result-title">${totalQ}/${totalQ} Kusursuz!</h2>
      <div class="result-score-text">0 Yanlış - Blok ${bId} Başarıyla Kilitlendi!</div>
      <p class="result-subdesc">Bu ${totalQ} sorunun tamamı hafızana çivilendi. Bir sonraki blok seni bekliyor!</p>
    `;

    const cpBlocksPerCheckpoint = tKey === 'pptx' ? 2 : 4;
    const cpQuestionsCount = tKey === 'pptx' ? 50 : 40;
    const cpId = Math.ceil(bId / cpBlocksPerCheckpoint);
    const cpBlocks = getRequiredBlocksForCheckpoint(tKey, cpId);
    const cpDone = cpBlocks.filter(b => trackState.completedBlocks.includes(b)).length;

    document.getElementById('mistakesReviewContainer').innerHTML = `
      <div class="memory-peg-box" style="margin-top: 16px;">
        <strong>🎯 Checkpoint ${cpId} İlerlemesi:</strong> ${cpDone}/${cpBlocksPerCheckpoint} Blok Tamamlandı.<br>
        ${cpDone === cpBlocksPerCheckpoint ? '🎉 <strong>Tebrikler!</strong> Checkpoint ' + cpId + ' (' + cpQuestionsCount + ' Soru) Denemesi açıldı!' : 'Kalan ' + (cpBlocksPerCheckpoint - cpDone) + ' blok tamamlanınca Checkpoint ' + cpId + ' açılacak.'}
      </div>
    `;

    const totalBlocks = Object.keys(blockQuestionsMap).length;
    const footerActions = document.getElementById('resultFooterActions');
    if (bId < totalBlocks) {
      footerActions.innerHTML = `
        <button class="primary-btn btn-cta" id="btnNextBlock">
          <span>Sonraki Bloğa Geç (Blok ${bId + 1}) ➔</span>
        </button>
      `;
      document.getElementById('btnNextBlock').onclick = () => {
        trackState.currentBlock = bId + 1;
        saveCurrentState();
        renderBlockQuizScreen();
      };
    } else {
      footerActions.innerHTML = `
        <div class="memory-peg-box" style="text-align: center; width: 100%;">
          🏆 <strong>TÜM BLOKLAR TAMAMLANDI!</strong> Efsanesin cano!
        </div>
      `;
    }

    safeScrollToTop();
  }

  function showBlockMistakesReview(bId, missed, correct) {
    showBlockSubview('blockResultScreen');

    const tKey = appState.activeTrack;
    const letters = ['A', 'B', 'C', 'D'];
    const banner = document.getElementById('resultBanner');

    banner.className = 'result-banner failed';
    banner.innerHTML = `
      <div class="result-icon">⚠️</div>
      <h2 class="result-title">0 Yanlış Kuralı Devrede!</h2>
      <div class="result-score-text">${correct.length} Doğru · ${missed.length} Yanlış</div>
      <p class="result-subdesc">Bir sonraki bloğa geçebilmek için bu bloktaki tüm yanlışları 0'a indirmen gerekiyor. Nedenleri incele ve telafi testine başla!</p>
    `;

    const listContainer = document.getElementById('reviewMistakesList');
    listContainer.innerHTML = '';

    missed.forEach((m, idx) => {
      const q = m.q;
      const userOptText = q.options[m.userAns] || 'Boş';
      const correctOptText = q.options[m.correctAns];
      const traceBadge = tKey === 'pptx' ? `📙 Slayt S.${q.slide_num}` : `📘 Genel S.${q.docx_num}`;

      const card = document.createElement('div');
      card.className = 'mistake-card';
      card.innerHTML = `
        <div class="q-card-header">
          <span class="q-num-badge" style="color: var(--danger)">${traceBadge} · Hata #${idx + 1}</span>
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

    const footerActions = document.getElementById('resultFooterActions');
    footerActions.innerHTML = `
      <button class="primary-btn btn-danger" id="btnStartRetryQuiz">
        <span>Yanlışları Tekrar Çöz (${missed.length} Soru) 🔄</span>
      </button>
    `;
    document.getElementById('btnStartRetryQuiz').onclick = () => {
      renderBlockRetryScreen(missed.map(m => m.q), 'block');
    };

    safeScrollToTop();
  }

  function renderBlockRetryScreen(retryQuestions, retryContext = 'block') {
    showBlockSubview('blockRetryScreen');

    const letters = ['A', 'B', 'C', 'D'];
    const retryAnswers = {};
    const tKey = appState.activeTrack;

    const retryBadge = document.getElementById('retryBadgeTitle');
    if (retryBadge) {
      retryBadge.textContent = retryContext === 'error_bank' ? 'Hata Bankası Telafi Testi' : 'Telafi Testi (0 Yanlış İçin)';
    }

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

      const traceBadge = tKey === 'pptx' ? `📙 Slayt S.${q.slide_num}` : `📘 Genel S.${q.docx_num}`;

      card.innerHTML = `
        <div class="q-card-header">
          <span class="q-num-badge" style="color: #f87171">${traceBadge} · Soru ${idx + 1} / ${retryQuestions.length}</span>
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

    document.getElementById('btnSubmitRetryQuiz').onclick = () => {
      const answeredCount = Object.keys(retryAnswers).length;
      if (answeredCount < retryQuestions.length) {
        alert(`Cano, telafi testindeki tüm soruları işaretlemelisin! (${answeredCount}/${retryQuestions.length})`);
        return;
      }

      const stillMissed = [];
      retryQuestions.forEach(q => {
        if (retryAnswers[q.id] === q.answer) {
          removeError(q.id);
        } else {
          stillMissed.push(q);
        }
      });

      if (stillMissed.length === 0) {
        if (retryContext === 'block') {
          const trackState = appState.tracks[tKey];
          const bId = trackState.currentBlock;
const bQCount = (blockQuestionsMap[bId] || []).length || (tKey === 'pptx' ? 25 : 10);
          alert(Harika cano! Yanlışların tamamını düzelttin. Blok  / ile tamamlandı! 🎯);
          showBlockSuccess(bId);
        } else {
          alert('Harika cano! Seçili tüm hataları başarıyla temizledin! 🎉');
          switchTab('tab3');
        }
      } else {
        alert(`Hala ${stillMissed.length} soruda takıldın. Hemen telafi edelim!`);
        renderBlockRetryScreen(stillMissed, retryContext);
      }
    };

    safeScrollToTop();
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

    const tKey = appState.activeTrack;
    const trackState = appState.tracks[tKey];
    const container = document.getElementById('checkpointCardsContainer');
    container.innerHTML = '';

    const totalCheckpoints = Object.keys(checkpointQuestionsMap).length;

    for (let cpId = 1; cpId <= totalCheckpoints; cpId++) {
      const questions = checkpointQuestionsMap[cpId] || [];
      const isUnlocked = isCheckpointUnlocked(cpId);
      const scoreData = trackState.checkpointScores[cpId];

      let rangeLabel = '';
      if (tKey === 'pptx') {
        const startS = questions.length > 0 ? questions[0].slide_num : 1;
        const endS = questions.length > 0 ? questions[questions.length - 1].slide_num : startS;
        rangeLabel = `Slayt S.${startS} - S.${endS} (${questions.length} Soru)`;
      } else {
        const startD = questions.length > 0 ? questions[0].docx_num : 1;
        const endD = questions.length > 0 ? questions[questions.length - 1].docx_num : startD;
        rangeLabel = `Genel S.${startD} - S.${endD} (${questions.length} Soru)`;
      }

      const reqBlocks = getRequiredBlocksForCheckpoint(tKey, cpId);
      const totalReqBlocks = reqBlocks.length;
      const maxScore = questions.length || (tKey === 'pptx' ? 50 : 40);
      const completedReqBlocks = reqBlocks.filter(b => trackState.completedBlocks.includes(b)).length;

      const card = document.createElement('div');
      card.className = `checkpoint-row-card ${isUnlocked ? 'unlocked' : 'locked'}`;

      let statusBadgeHtml = '';
      let actionBtnHtml = '';

      if (isUnlocked) {
        if (scoreData) {
          statusBadgeHtml = `<span class="checkpoint-status-badge done">En İyi: ${scoreData.bestScore}/${maxScore} (%${Math.round((scoreData.bestScore/maxScore)*100)})</span>`;
          actionBtnHtml = `<button class="checkpoint-action-btn" data-cpid="${cpId}">Tekrar Çöz (${questions.length} Soru) 🔄</button>`;
        } else {
          statusBadgeHtml = `<span class="checkpoint-status-badge available">Çözülmeye Hazır</span>`;
          actionBtnHtml = `<button class="checkpoint-action-btn" data-cpid="${cpId}">${maxScore}'lik Denemeyi Başlat 🚀</button>`;
        }
      } else {
        statusBadgeHtml = `<span class="checkpoint-status-badge locked">🔒 Kilitli (${completedReqBlocks}/${totalReqBlocks} Blok)</span>`;
        actionBtnHtml = `<button class="checkpoint-action-btn disabled" disabled>Blok ${reqBlocks[0]}-${reqBlocks[reqBlocks.length - 1]}'ü Tamamla</button>`;
      }

      card.innerHTML = `
        <div class="checkpoint-top-meta">
          <div class="checkpoint-title-wrap">
            <h3>${cpId}. Checkpoint</h3>
            <span class="checkpoint-range-sub">${rangeLabel}</span>
          </div>
          ${statusBadgeHtml}
        </div>
        ${actionBtnHtml}
      `;

      container.appendChild(card);
    }

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

    const tKey = appState.activeTrack;
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

      const traceBadge = tKey === 'pptx' ? `📙 Slayt S.${q.slide_num}` : `📘 Genel S.${q.docx_num}`;

      card.innerHTML = `
        <div class="q-card-header">
          <span class="q-num-badge">${traceBadge} · Soru ${idx + 1} / ${questions.length}</span>
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

    document.getElementById('btnExitCheckpoint').onclick = () => {
      if (confirm('Denemeden çıkmak istiyor musun? İlerlemen kaydedilmeyecektir.')) {
        renderCheckpointList();
      }
    };

    document.getElementById('btnSubmitCheckpointQuiz').onclick = () => {
      const answeredCount = Object.keys(currentCheckpointAnswers).length;
      if (answeredCount < questions.length) {
        if (!confirm(`Henüz ${questions.length - answeredCount} soru boş! Denemeyi yine de bitirmek istiyor musun?`)) {
          return;
        }
      }
      evaluateCheckpointQuiz(cpId, questions);
    };

    safeScrollToTop();
  }

  function updateCheckpointProgress(answered, total) {
    const countEl = document.getElementById('checkpointAnsweredCount');
    const fillEl = document.getElementById('checkpointProgressFill');
    if (countEl) countEl.textContent = `${answered} / ${total}`;
    if (fillEl) fillEl.style.width = `${(answered / total) * 100}%`;
  }

  function evaluateCheckpointQuiz(cpId, questions) {
    showCheckpointSubview('checkpointResultScreen');

    const tKey = appState.activeTrack;
    const trackState = appState.tracks[tKey];
    const letters = ['A', 'B', 'C', 'D'];
    let correctCount = 0;
    const missed = [];

    questions.forEach(q => {
      const userAns = currentCheckpointAnswers[q.id];
      if (userAns !== undefined && userAns === q.answer) {
        correctCount++;
        removeError(q.id);
      } else {
        missed.push({
          q: q,
          userAns: userAns !== undefined ? userAns : -1,
          correctAns: q.answer
        });
        if (userAns !== undefined && userAns !== -1) {
          recordError(q.id, userAns, q.answer, `${cpId}. Checkpoint`);
        }
      }
    });

    const prevBest = trackState.checkpointScores[cpId]?.bestScore || 0;
    trackState.checkpointScores[cpId] = {
      bestScore: Math.max(prevBest, correctCount),
      total: questions.length,
      lastScore: correctCount,
      date: new Date().toISOString()
    };
    saveCurrentState();

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
        const traceBadge = tKey === 'pptx' ? `📙 Slayt S.${q.slide_num}` : `📘 Genel S.${q.docx_num}`;

        const card = document.createElement('div');
        card.className = 'mistake-card';
        card.innerHTML = `
          <div class="q-card-header">
            <span class="q-num-badge" style="color: var(--danger)">${traceBadge} · Hata #${idx + 1}</span>
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

    safeScrollToTop();
  }

  function showCheckpointSubview(subviewId) {
    const subviews = ['checkpointListScreen', 'checkpointQuizScreen', 'checkpointResultScreen'];
    subviews.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', id !== subviewId);
    });
  }

  // ==========================================================
  // TAB 3: HATA BANKASI
  // ==========================================================
  function recordError(qId, userAns, correctAns, source) {
    // SAFEGUARD: Never record an error if answer was undefined, null or -1
    if (userAns === undefined || userAns === null || userAns === -1) {
      return;
    }

    const tKey = appState.activeTrack;
    const trackState = appState.tracks[tKey];
    const existingIdx = trackState.errorBank.findIndex(e => e.qId === qId);
    const entry = {
      qId: qId,
      userAns: userAns,
      correctAns: correctAns,
      source: source,
      timestamp: Date.now()
    };

    if (existingIdx >= 0) {
      trackState.errorBank[existingIdx] = entry;
    } else {
      trackState.errorBank.unshift(entry);
    }
    saveCurrentState();
  }

  function removeError(qId) {
    const tKey = appState.activeTrack;
    const trackState = appState.tracks[tKey];
    trackState.errorBank = trackState.errorBank.filter(e => e.qId !== qId);
    saveCurrentState();
  }

  function renderErrorBank() {
    const container = document.getElementById('errorBankCardsContainer');
    container.innerHTML = '';

    const tKey = appState.activeTrack;
    const trackState = appState.tracks[tKey];
    const letters = ['A', 'B', 'C', 'D'];
    const allErrors = trackState.errorBank;

    const blockErrors = allErrors.filter(e => e.source && e.source.startsWith('Blok'));
    const checkpointErrors = allErrors.filter(e => e.source && e.source.includes('Checkpoint'));

    document.getElementById('chipAllCount').textContent = allErrors.length;
    document.getElementById('chipBlockCount').textContent = blockErrors.length;
    document.getElementById('chipCheckpointCount').textContent = checkpointErrors.length;

    const chipBlockBtn = document.querySelector('.filter-chips-row button[data-filter="block"]');
    if (chipBlockBtn) {
      const blockLabel = tKey === 'pptx' ? "25'lik Blok Hataları" : "10'luk Blok Hataları";
      chipBlockBtn.innerHTML = `${blockLabel} (<span id="chipBlockCount">${blockErrors.length}</span>)`;
    }

    let filtered = allErrors;
    if (errorFilter === 'block') filtered = blockErrors;
    else if (errorFilter === 'checkpoint') filtered = checkpointErrors;

    const actionBar = document.getElementById('errorActionBar');
    if (filtered.length > 0) {
      actionBar.style.display = 'block';
      document.getElementById('btnStartErrorDrill').onclick = () => {
        const errorQuestions = filtered.map(e => questionsById[e.qId]).filter(Boolean);
        switchTab('tab1');
        renderBlockRetryScreen(errorQuestions, 'error_bank');
      };
    } else {
      actionBar.style.display = 'none';
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box">
          <div class="empty-icon">🎉</div>
          <h3>Tertemiz Cano!</h3>
          <p>${allErrors.length === 0 ? 'Bu havuzda şu anda hiç kayıtlı hata yok. Blokları çözmeye devam et!' : 'Bu filtrede hata bulunamadı.'}</p>
        </div>
      `;
      return;
    }

    filtered.forEach(err => {
      const q = questionsById[err.qId];
      if (!q) return;

      const userOptText = err.userAns >= 0 && q.options[err.userAns] ? q.options[err.userAns] : 'Boş Bırakıldı';
      const correctOptText = q.options[q.answer];
      const traceBadge = tKey === 'pptx' ? `📙 Slayt S.${q.slide_num}` : `📘 Genel S.${q.docx_num}`;

      const card = document.createElement('div');
      card.className = 'mistake-card';
      card.id = `errCard_${q.id}`;

      card.innerHTML = `
        <div class="q-card-header">
          <span class="q-num-badge" style="color: var(--danger)">${traceBadge} · ${escapeHtml(err.source || 'Hata')}</span>
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

    container.querySelectorAll('button[data-retry-qid]').forEach(btn => {
      btn.addEventListener('click', () => {
        const qId = parseInt(btn.getAttribute('data-retry-qid'), 10);
        const q = questionsById[qId];
        if (q) {
          switchTab('tab1');
          renderBlockRetryScreen([q], 'error_bank');
        }
      });
    });

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
  // MODALS (SYNC / SAVE, BLOCK PICKER & SETTINGS)
  // ==========================================================
  function setupModals() {
    // 1. SYNC / SAVE MODAL
    const syncModal = document.getElementById('syncModal');
    document.getElementById('btnSyncModal').onclick = () => {
      syncModal.classList.remove('hidden');
    };
    document.getElementById('btnCloseSync').onclick = () => {
      syncModal.classList.add('hidden');
    };
    syncModal.onclick = (e) => {
      if (e.target === syncModal) syncModal.classList.add('hidden');
    };

    document.getElementById('btnCopySaveCode').onclick = () => {
      const code = JSON.stringify(appState);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
          alert('Save kodu kopyalandı cano! Bu kodu gece Antigravity sohbetine yapıştırabilirsin.');
        }).catch(() => {
          prompt('Save kodun burada, kopyalayabilirsin:', code);
        });
      } else {
        prompt('Save kodun burada, kopyalayabilirsin:', code);
      }
    };

    document.getElementById('btnDownloadSaveFile').onclick = () => {
      const blob = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `uhy_dispec_save_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    document.getElementById('btnApplySaveCode').onclick = () => {
      const val = document.getElementById('importSaveInput').value.trim();
      if (!val) {
        alert('Lütfen geçerli bir save kodu yapıştır cano!');
        return;
      }
      try {
        const parsed = JSON.parse(val);
        if (parsed && parsed.tracks) {
          appState = parsed;
          saveCurrentState();
          setupTrackData();
          renderAllViews();
          syncModal.classList.add('hidden');
          alert('İlerleme başarıyla yüklendi! Kaldığın yerden tam gaz devam.');
        } else {
          alert('Geçersiz save kodu formatı.');
        }
      } catch (e) {
        alert('Kod okunamadı. Lütfen tam kopyaladığından emin ol.');
      }
    };

    // 2. BLOCK PICKER MODAL
    const blockPickerModal = document.getElementById('blockPickerModal');
    document.getElementById('btnBlockPicker').onclick = () => {
      renderBlockGrid();
      blockPickerModal.classList.remove('hidden');
    };
    document.getElementById('btnCloseBlockPicker').onclick = () => {
      blockPickerModal.classList.add('hidden');
    };
    blockPickerModal.onclick = (e) => {
      if (e.target === blockPickerModal) blockPickerModal.classList.add('hidden');
    };

    // 3. SETTINGS MODAL
    const settingsModal = document.getElementById('settingsModal');
    document.getElementById('btnSettings').onclick = () => {
      settingsModal.classList.remove('hidden');
    };
    document.getElementById('btnCloseSettings').onclick = () => {
      settingsModal.classList.add('hidden');
    };
    settingsModal.onclick = (e) => {
      if (e.target === settingsModal) settingsModal.classList.add('hidden');
    };

    document.getElementById('btnResetTrackProgress').onclick = () => {
      const tKey = appState.activeTrack;
      if (confirm(`DİKKAT! ${tKey === 'pptx' ? 'UHY Dispeç' : 'Genel Sorular'} havuzundaki ilerlemen sıfırlanacaktır. Emin misin cano?`)) {
        appState.tracks[tKey] = {
          currentBlock: 1,
          completedBlocks: [],
          checkpointScores: {},
          errorBank: []
        };
        saveCurrentState();
        settingsModal.classList.add('hidden');
        renderAllViews();
        alert('Bu havuz 1. bloktan itibaren sıfırlandı.');
      }
    };
  }

  function renderBlockGrid() {
    const tKey = appState.activeTrack;
    const trackState = appState.tracks[tKey];
    const grid = document.getElementById('blockPickerGrid');
    grid.innerHTML = '';

    const totalBlocks = Object.keys(blockQuestionsMap).length;
    document.getElementById('blockPickerTitle').textContent = `${tKey === 'pptx' ? 'UHY Dispeç' : 'Genel Sorular'} (${totalBlocks} Blok)`;

    for (let bId = 1; bId <= totalBlocks; bId++) {
      const btn = document.createElement('button');
      btn.className = 'block-grid-btn';
      btn.textContent = bId;
      const bQuestions = blockQuestionsMap[bId] || [];
      btn.title = `Blok ${bId}: ${bQuestions.length} Soru`;

      const isCompleted = trackState.completedBlocks.includes(bId);
      const isCurrent = trackState.currentBlock === bId;

      if (isCompleted) {
        btn.classList.add('completed');
      } else if (isCurrent) {
        btn.classList.add('current');
      }

      btn.onclick = () => {
        trackState.currentBlock = bId;
        saveCurrentState();
        document.getElementById('blockPickerModal').classList.add('hidden');
        renderBlockQuizScreen();
      };

      grid.appendChild(btn);
    }
  }

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
