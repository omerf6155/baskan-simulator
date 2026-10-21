// App Logic for Dispeçer Permi & Hukuk Drill (150 Soru & 20'lik Zor Sınav Modu)
document.addEventListener("DOMContentLoaded", () => {
  // State
  let rawQuestions = typeof QUESTIONS_DATA !== "undefined" ? QUESTIONS_DATA : [];
  let allQuestions = [];
  let filteredQuestions = [];
  let currentIndex = 0;
  let currentCategory = "ALL";
  let currentStatusFilter = "ALL"; // "ALL" | "EMPTY" | "WRONG" | "CORRECT"

  // App Modes: "PRACTICE" (150 Soru) or "EXAM" (20 Zor Soru)
  let appMode = localStorage.getItem("dispecer_active_mode") || "PRACTICE";

  // Persistent user state in LocalStorage (Genel Pratik)
  let userProgress = JSON.parse(localStorage.getItem("dispecer_progress") || "{}");

  // Question Shuffled Layouts in LocalStorage
  let optionLayouts = JSON.parse(localStorage.getItem("dispecer_option_layouts") || "{}");

  // Exam Mode State in LocalStorage
  let examServedIds = JSON.parse(localStorage.getItem("dispecer_exam_served_ids") || "[]");
  let activeExam = JSON.parse(localStorage.getItem("dispecer_active_exam") || "null");

  // Theme State
  let currentTheme = localStorage.getItem("dispecer_theme") || "dark";
  document.documentElement.setAttribute("data-theme", currentTheme);
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const themeIcon = document.getElementById("themeIcon");
  updateThemeIcon();

  function updateThemeIcon() {
    if (themeIcon) {
      themeIcon.textContent = currentTheme === "dark" ? "☀️" : "🌙";
    }
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      currentTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", currentTheme);
      localStorage.setItem("dispecer_theme", currentTheme);
      updateThemeIcon();
    });
  }

  // DOM Elements - Mode Switcher & Exam Bar
  const btnModePractice = document.getElementById("btnModePractice");
  const btnModeExam = document.getElementById("btnModeExam");
  const examInfoBar = document.getElementById("examInfoBar");
  const examRoundBadge = document.getElementById("examRoundBadge");
  const examPoolBadge = document.getElementById("examPoolBadge");
  const chkInstantFeedback = document.getElementById("chkInstantFeedback");
  const btnFinishExamTop = document.getElementById("btnFinishExamTop");
  const btnFinishExamBottom = document.getElementById("btnFinishExamBottom");

  // DOM Elements - Header & Filter Bars
  const headerCorrect = document.getElementById("headerCorrectCount");
  const headerTotal = document.getElementById("headerTotalSeen");
  const topStatsBadge = document.getElementById("topStatsBadge");
  const statusModeBar = document.querySelector(".status-mode-bar");
  const statusBtns = document.querySelectorAll(".status-btn");
  const badgeAllCount = document.getElementById("badgeAllCount");
  const badgeEmptyCount = document.getElementById("badgeEmptyCount");
  const badgeWrongCount = document.getElementById("badgeWrongCount");
  const badgeCorrectCount = document.getElementById("badgeCorrectCount");
  const filterScroll = document.querySelector(".filter-scroll");
  const filterPills = document.querySelectorAll(".filter-pill");

  // Progress & Navigation
  const progressBarFill = document.getElementById("progressBarFill");
  const currentQNum = document.getElementById("currentQuestionNumber");
  const progressPercent = document.getElementById("progressPercent");
  const qNavTrigger = document.getElementById("qNavTrigger");

  // Card Elements
  const cardCategory = document.getElementById("cardCategory");
  const cardDifficulty = document.getElementById("cardDifficulty");
  const cardSlideRef = document.getElementById("cardSlideRef");
  const btnRetrySingle = document.getElementById("btnRetrySingle");
  const questionText = document.getElementById("questionText");
  const optionsGrid = document.getElementById("optionsGrid");

  const explanationBox = document.getElementById("explanationBox");
  const statusIcon = document.getElementById("statusIcon");
  const statusTitle = document.getElementById("statusTitle");
  const explanationText = document.getElementById("explanationText");

  // Bottom Buttons
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnRandom = document.getElementById("btnRandom");
  const btnRetryMode = document.getElementById("btnRetryMode");

  // Grid Map Modal
  const btnGridModal = document.getElementById("btnGridModal");
  const gridModal = document.getElementById("gridModal");
  const btnCloseGridModal = document.getElementById("btnCloseGridModal");
  const questionGridContainer = document.getElementById("questionGridContainer");

  // Score Modal (Genel Pratik)
  const scoreModal = document.getElementById("scoreModal");
  const btnCloseScoreModal = document.getElementById("btnCloseScoreModal");
  const btnResetProgress = document.getElementById("btnResetProgress");
  const modalCorrect = document.getElementById("modalCorrect");
  const modalWrong = document.getElementById("modalWrong");
  const modalPercent = document.getElementById("modalPercent");
  const scoreMotivationalMsg = document.getElementById("scoreMotivationalMsg");

  // Exam Result Modal
  const examResultModal = document.getElementById("examResultModal");
  const btnCloseExamModal = document.getElementById("btnCloseExamModal");
  const examScoreBig = document.getElementById("examScoreBig");
  const examScorePercent = document.getElementById("examScorePercent");
  const examStatusTag = document.getElementById("examStatusTag");
  const examCorrectNum = document.getElementById("examCorrectNum");
  const examWrongNum = document.getElementById("examWrongNum");
  const examEmptyNum = document.getElementById("examEmptyNum");
  const examPoolProgressText = document.getElementById("examPoolProgressText");
  const examPoolFill = document.getElementById("examPoolFill");
  const examPoolSubText = document.getElementById("examPoolSubText");
  const btnNextExamBatch = document.getElementById("btnNextExamBatch");
  const btnReviewExamQuestions = document.getElementById("btnReviewExamQuestions");
  const btnBackToPractice = document.getElementById("btnBackToPractice");

  // Fisher-Yates array shuffler
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function cleanOptionText(opt) {
    return opt.replace(/^[A-E]\)\s*/, "").trim();
  }

  function getPreparedOptions(q, forceShuffle = false) {
    if (!forceShuffle && optionLayouts[q.id]) {
      return optionLayouts[q.id];
    }

    const items = q.options.map((opt, idx) => ({
      rawText: cleanOptionText(opt),
      isCorrect: idx === q.answer
    }));

    const shuffledItems = shuffleArray(items);
    const prefixes = ["A", "B", "C", "D", "E"];
    const layout = shuffledItems.map((item, idx) => ({
      prefix: prefixes[idx],
      display: `${prefixes[idx]}) ${item.rawText}`,
      rawText: item.rawText,
      isCorrect: item.isCorrect
    }));

    optionLayouts[q.id] = layout;
    localStorage.setItem("dispecer_option_layouts", JSON.stringify(optionLayouts));
    return layout;
  }

  // Get Hard Questions Pool (80 questions)
  function getHardQuestionsPool() {
    return rawQuestions.filter(q => q.difficulty && q.difficulty.includes("Zor"));
  }

  // Init App
  async function init() {
    if (!rawQuestions || rawQuestions.length < 150) {
      try {
        const res = await fetch(`questions.json?nocache=${Date.now()}`);
        if (res.ok) {
          const freshData = await res.json();
          if (Array.isArray(freshData) && freshData.length >= 150) {
            rawQuestions = freshData;
          }
        }
      } catch (err) {
        console.warn("Could not fetch fresh questions:", err);
      }
    }

    allQuestions = [...rawQuestions];
    allQuestions.forEach(q => getPreparedOptions(q, false));

    setupListeners();

    if (appMode === "EXAM") {
      enterExamMode(false);
    } else {
      enterPracticeMode();
    }
  }

  // ==========================================
  // EXAM MODE LOGIC (20 ZOR SORU)
  // ==========================================
  function enterExamMode(forceNew = false) {
    appMode = "EXAM";
    localStorage.setItem("dispecer_active_mode", "EXAM");

    btnModeExam.classList.add("active");
    btnModePractice.classList.remove("active");

    if (statusModeBar) statusModeBar.style.display = "none";
    if (filterScroll) filterScroll.style.display = "none";
    if (btnRetryMode) btnRetryMode.style.display = "none";
    if (btnRandom) btnRandom.style.display = "none";

    if (examInfoBar) examInfoBar.style.display = "flex";
    if (btnFinishExamBottom) btnFinishExamBottom.style.display = "inline-flex";

    const hardPool = getHardQuestionsPool();

    // Check if active exam exists and valid
    if (forceNew || !activeExam || !activeExam.questionIds || activeExam.questionIds.length !== 20) {
      startNewExamBatch(false);
    } else {
      loadExistingExam();
    }
  }

  function startNewExamBatch(alertUser = true) {
    const hardPool = getHardQuestionsPool();
    let unserved = hardPool.filter(q => !examServedIds.includes(q.id));

    if (unserved.length < 20) {
      if (alertUser || examServedIds.length >= hardPool.length) {
        alert("🎉 Harika! 80 zor sorunun tamamını turladın! Havuz sıfırlandı, yeni döngü başlıyor.");
      }
      examServedIds = [];
      localStorage.setItem("dispecer_exam_served_ids", JSON.stringify([]));
      unserved = [...hardPool];
    }

    // Pick 20 questions
    const shuffledPool = shuffleArray(unserved);
    const picked20 = shuffledPool.slice(0, 20);
    const pickedIds = picked20.map(q => q.id);

    // Shuffle options for these 20
    picked20.forEach(q => getPreparedOptions(q, true));

    // Update served IDs
    examServedIds.push(...pickedIds);
    localStorage.setItem("dispecer_exam_served_ids", JSON.stringify(examServedIds));

    const roundNum = Math.ceil(examServedIds.length / 20) || 1;

    activeExam = {
      round: roundNum,
      questionIds: pickedIds,
      answers: {},
      isFinished: false,
      instantFeedback: chkInstantFeedback ? chkInstantFeedback.checked : false
    };
    localStorage.setItem("dispecer_active_exam", JSON.stringify(activeExam));

    filteredQuestions = picked20;
    currentIndex = 0;

    updateExamUIElements();
    renderQuestion();
    buildGridMap();
  }

  function loadExistingExam() {
    const hardPoolMap = new Map(rawQuestions.map(q => [q.id, q]));
    filteredQuestions = activeExam.questionIds.map(id => hardPoolMap.get(id)).filter(Boolean);

    if (chkInstantFeedback) {
      chkInstantFeedback.checked = !!activeExam.instantFeedback;
    }

    currentIndex = 0;
    updateExamUIElements();
    renderQuestion();
    buildGridMap();
  }

  function updateExamUIElements() {
    const hardPool = getHardQuestionsPool();
    const totalHard = hardPool.length || 80;
    const servedCount = examServedIds.length;
    const currentRound = activeExam ? activeExam.round : 1;

    if (examRoundBadge) {
      examRoundBadge.textContent = `Sınav ${currentRound}/4`;
    }
    if (examPoolBadge) {
      examPoolBadge.textContent = `Havuz: ${servedCount}/${totalHard}`;
    }

    // Top stats in exam mode
    if (headerCorrect && headerTotal) {
      const ansCount = Object.keys(activeExam ? activeExam.answers : {}).length;
      let corrCount = 0;
      if (activeExam && activeExam.answers) {
        Object.values(activeExam.answers).forEach(a => {
          if (a.isCorrect) corrCount++;
        });
      }
      headerCorrect.textContent = corrCount;
      headerTotal.textContent = ansCount;
    }
  }

  function finishExam() {
    if (!activeExam) return;

    const totalQuestions = filteredQuestions.length;
    const answeredCount = Object.keys(activeExam.answers).length;

    if (answeredCount < totalQuestions && !activeExam.isFinished) {
      const proceed = confirm(`Henüz cevaplamadığın ${totalQuestions - answeredCount} soru var. Sınavı bitirip karneni görmek istiyor musun?`);
      if (!proceed) return;
    }

    activeExam.isFinished = true;
    localStorage.setItem("dispecer_active_exam", JSON.stringify(activeExam));

    let correctCount = 0;
    let wrongCount = 0;

    filteredQuestions.forEach(q => {
      const ans = activeExam.answers[q.id];
      if (ans) {
        if (ans.isCorrect) correctCount++;
        else wrongCount++;

        // Also record to userProgress so user's wrong list & overall stats stay up to date
        userProgress[q.id] = {
          answered: true,
          selectedRawText: ans.selectedRawText,
          isCorrect: ans.isCorrect
        };
      }
    });

    localStorage.setItem("dispecer_progress", JSON.stringify(userProgress));

    const emptyCount = totalQuestions - (correctCount + wrongCount);
    const scorePct = Math.round((correctCount / totalQuestions) * 100);
    const isPassed = scorePct >= 70;

    // Populate Exam Result Modal
    if (examScoreBig) examScoreBig.textContent = `${correctCount} / ${totalQuestions}`;
    if (examScorePercent) examScorePercent.textContent = `%${scorePct} BAŞARI`;

    if (examStatusTag) {
      examStatusTag.textContent = isPassed ? "GEÇTİ (Dispeçer Standardı)" : "KALDI (Tekrar Dene)";
      examStatusTag.className = "exam-status-tag " + (isPassed ? "pass" : "fail");
    }

    if (examCorrectNum) examCorrectNum.textContent = correctCount;
    if (examWrongNum) examWrongNum.textContent = wrongCount;
    if (examEmptyNum) examEmptyNum.textContent = emptyCount;

    const totalHard = getHardQuestionsPool().length || 80;
    const servedCount = examServedIds.length;
    const remainingCount = Math.max(0, totalHard - servedCount);

    if (examPoolProgressText) {
      examPoolProgressText.textContent = `${totalHard} zor sorunun ${servedCount} tanesini tamamladın.`;
    }
    if (examPoolFill) {
      const pct = Math.min(100, Math.round((servedCount / totalHard) * 100));
      examPoolFill.style.width = `${pct}%`;
    }
    if (examPoolSubText) {
      if (remainingCount === 0) {
        examPoolSubText.textContent = "Tüm 80 zor soru döngüsünü tamamladın! Sonraki sınavda havuz sıfırlanıp taze döngü başlayacak.";
      } else {
        examPoolSubText.textContent = `Sonraki sınavda henüz görmediğin 20 YENİ zor soru gelecek (Kalan: ${remainingCount}).`;
      }
    }

    if (examResultModal) examResultModal.classList.add("active");

    renderQuestion();
    buildGridMap();
  }

  // ==========================================
  // PRACTICE MODE LOGIC (150 SORU)
  // ==========================================
  function enterPracticeMode() {
    appMode = "PRACTICE";
    localStorage.setItem("dispecer_active_mode", "PRACTICE");

    btnModePractice.classList.add("active");
    btnModeExam.classList.remove("active");

    if (statusModeBar) statusModeBar.style.display = "flex";
    if (filterScroll) filterScroll.style.display = "flex";
    if (btnRetryMode) btnRetryMode.style.display = "inline-flex";
    if (btnRandom) btnRandom.style.display = "inline-flex";

    if (examInfoBar) examInfoBar.style.display = "none";
    if (btnFinishExamBottom) btnFinishExamBottom.style.display = "none";

    allQuestions = [...rawQuestions];
    applyCombinedFilters();
  }

  function applyCombinedFilters() {
    let list = allQuestions.filter(q => {
      // 1. Category check
      const matchCat = (currentCategory === "ALL" || q.category === currentCategory);
      if (!matchCat) return false;

      // 2. Status check
      const prog = userProgress[q.id];
      const isAnswered = prog && prog.answered;

      if (currentStatusFilter === "ALL") return true;
      if (currentStatusFilter === "EMPTY") return !isAnswered;
      if (currentStatusFilter === "WRONG") return isAnswered && !prog.isCorrect;
      if (currentStatusFilter === "CORRECT") return isAnswered && prog.isCorrect;

      return true;
    });

    if (currentStatusFilter === "WRONG") {
      shuffleEntireTest(true);
      list = shuffleArray(list);
    }

    if (list.length === 0) {
      if (currentStatusFilter === "WRONG") {
        alert("Süper! Yanlış yaptığın soru bulunmuyor.");
      } else if (currentStatusFilter === "EMPTY") {
        alert("Tüm soruları tamamladın!");
      }
      currentStatusFilter = "ALL";
      updateStatusBtnsActive();
      list = allQuestions.filter(q => currentCategory === "ALL" || q.category === currentCategory);
    }

    filteredQuestions = list;
    currentIndex = 0;
    renderQuestion();
    updateBadgesAndStats();
    buildGridMap();
  }

  function updateStatusBtnsActive() {
    statusBtns.forEach(btn => {
      btn.classList.toggle("active", btn.getAttribute("data-status-filter") === currentStatusFilter);
    });
  }

  function shuffleEntireTest(onlyWrongs = false) {
    if (onlyWrongs) {
      rawQuestions.forEach(q => {
        const prog = userProgress[q.id];
        if (prog && prog.answered && !prog.isCorrect) {
          getPreparedOptions(q, true);
        }
      });
    } else {
      rawQuestions.forEach(q => {
        getPreparedOptions(q, true);
      });
    }
  }

  // ==========================================
  // RENDER QUESTION (DUAL-MODE)
  // ==========================================
  function renderQuestion() {
    if (filteredQuestions.length === 0) return;
    const q = filteredQuestions[currentIndex];
    const opts = getPreparedOptions(q);

    // Card Meta
    cardCategory.textContent = q.category;
    cardDifficulty.textContent = q.difficulty;
    cardDifficulty.className = "badge difficulty-badge " + (q.difficulty.includes("Zor") ? "Zor" : "");
    cardSlideRef.textContent = q.slideRef || "REV02";

    // Progress Bar
    const totalCount = filteredQuestions.length;
    const progress = Math.round(((currentIndex + 1) / totalCount) * 100);
    progressBarFill.style.width = `${progress}%`;

    if (appMode === "EXAM") {
      currentQNum.textContent = `Sınav Sorusu ${currentIndex + 1} / ${totalCount} (#${q.id})`;
    } else {
      currentQNum.textContent = `Soru ${currentIndex + 1} / ${totalCount} (#${q.id})`;
    }
    progressPercent.textContent = `%${progress}`;

    // Question Text
    questionText.textContent = q.question;

    // Check Answers according to Mode
    if (appMode === "EXAM") {
      renderExamQuestion(q, opts, totalCount);
    } else {
      renderPracticeQuestion(q, opts, totalCount);
    }

    // Highlight active in grid
    highlightActiveInGrid(q.id);
  }

  function renderExamQuestion(q, opts, totalCount) {
    const examAns = activeExam ? activeExam.answers[q.id] : null;
    const isExamAnswered = !!examAns;
    const showRevealed = activeExam && (activeExam.isFinished || activeExam.instantFeedback);

    if (btnRetrySingle) btnRetrySingle.style.display = "none";

    optionsGrid.innerHTML = "";
    opts.forEach(optItem => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.innerHTML = `<span>${optItem.display}</span>`;

      if (showRevealed) {
        btn.disabled = true;
        if (optItem.isCorrect) {
          btn.classList.add("correct");
        } else if (isExamAnswered && optItem.rawText === examAns.selectedRawText) {
          btn.classList.add("wrong");
        } else {
          btn.classList.add("faded");
        }
      } else {
        if (isExamAnswered && optItem.rawText === examAns.selectedRawText) {
          btn.classList.add("exam-selected");
        }
        btn.addEventListener("click", () => handleExamSelectAnswer(optItem));
      }

      optionsGrid.appendChild(btn);
    });

    if (showRevealed && isExamAnswered) {
      showExplanation(examAns.isCorrect, q.explanation);
    } else {
      explanationBox.style.display = "none";
    }

    btnPrev.disabled = currentIndex === 0;
    btnNext.textContent = currentIndex === totalCount - 1 ? "Son Soru" : "Sonraki →";
  }

  function handleExamSelectAnswer(selectedOpt) {
    if (!activeExam || activeExam.isFinished) return;

    const q = filteredQuestions[currentIndex];
    const isCorrect = selectedOpt.isCorrect;

    activeExam.answers[q.id] = {
      selectedRawText: selectedOpt.rawText,
      isCorrect: isCorrect
    };

    localStorage.setItem("dispecer_active_exam", JSON.stringify(activeExam));

    updateExamUIElements();
    renderQuestion();
    buildGridMap();

    if (navigator.vibrate) {
      navigator.vibrate(isCorrect ? 30 : [50, 50, 50]);
    }
  }

  function renderPracticeQuestion(q, opts, totalCount) {
    const prog = userProgress[q.id];
    const isAnswered = prog && prog.answered;

    if (btnRetrySingle) {
      btnRetrySingle.style.display = isAnswered ? "inline-flex" : "none";
    }

    optionsGrid.innerHTML = "";
    opts.forEach(optItem => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.innerHTML = `<span>${optItem.display}</span>`;

      if (isAnswered) {
        btn.disabled = true;
        if (optItem.isCorrect) {
          btn.classList.add("correct");
        } else if (optItem.rawText === prog.selectedRawText) {
          btn.classList.add("wrong");
        } else {
          btn.classList.add("faded");
        }
      } else {
        btn.addEventListener("click", () => handlePracticeSelectAnswer(optItem));
      }

      optionsGrid.appendChild(btn);
    });

    if (isAnswered) {
      showExplanation(prog.isCorrect, q.explanation);
    } else {
      explanationBox.style.display = "none";
    }

    btnPrev.disabled = currentIndex === 0;
    btnNext.textContent = currentIndex === totalCount - 1 ? "Bitti 🏁" : "Sonraki →";

    if (btnRetryMode) {
      if (currentStatusFilter === "WRONG") {
        btnRetryMode.textContent = "🔄 Bu Yanlışları Yeniden Çöz";
      } else {
        btnRetryMode.textContent = "⚡ İlk Boşa Git";
      }
    }
  }

  function handlePracticeSelectAnswer(selectedOpt) {
    const q = filteredQuestions[currentIndex];
    const isCorrect = selectedOpt.isCorrect;

    userProgress[q.id] = {
      answered: true,
      selectedRawText: selectedOpt.rawText,
      isCorrect: isCorrect
    };

    localStorage.setItem("dispecer_progress", JSON.stringify(userProgress));
    updateBadgesAndStats();
    buildGridMap();
    renderQuestion();

    if (navigator.vibrate) {
      navigator.vibrate(isCorrect ? 30 : [50, 50, 50]);
    }
  }

  function resetCurrentQuestionForRetry() {
    const q = filteredQuestions[currentIndex];
    if (!q) return;

    delete userProgress[q.id];
    localStorage.setItem("dispecer_progress", JSON.stringify(userProgress));
    getPreparedOptions(q, true);

    updateBadgesAndStats();
    buildGridMap();
    renderQuestion();
  }

  function resetAllWrongQuestionsForRetry() {
    let wrongCount = 0;
    allQuestions.forEach(q => {
      const prog = userProgress[q.id];
      if (prog && prog.answered && !prog.isCorrect) {
        delete userProgress[q.id];
        getPreparedOptions(q, true);
        wrongCount++;
      }
    });

    if (wrongCount === 0) {
      alert("Yeniden çözülecek yanlış soru bulunmuyor!");
      return;
    }

    localStorage.setItem("dispecer_progress", JSON.stringify(userProgress));
    currentStatusFilter = "ALL";
    updateStatusBtnsActive();

    applyCombinedFilters();
    jumpToNextEmpty();
  }

  function showExplanation(isCorrect, explanation) {
    explanationBox.style.display = "block";
    explanationBox.className = "explanation-box " + (isCorrect ? "correct" : "wrong");
    statusIcon.textContent = isCorrect ? "✅" : "❌";
    statusTitle.textContent = isCorrect ? "Doğru Cevap!" : "Yanlış Cevap!";
    explanationText.textContent = explanation || "Açıklama mevcut değil.";
  }

  function jumpToNextEmpty() {
    const emptyIdx = filteredQuestions.findIndex(q => !userProgress[q.id] || !userProgress[q.id].answered);
    if (emptyIdx !== -1) {
      currentIndex = emptyIdx;
      renderQuestion();
    } else {
      alert("Bu filtrede tüm soruları cevapladın!");
    }
  }

  // ==========================================
  // QUESTION GRID MAP (1-150 / 1-20)
  // ==========================================
  function buildGridMap() {
    if (!questionGridContainer) return;
    questionGridContainer.innerHTML = "";

    const isExam = appMode === "EXAM";
    const modalTitle = gridModal ? gridModal.querySelector("h3") : null;

    if (modalTitle) {
      modalTitle.textContent = isExam ? "Sınav Soru Haritası (1 - 20)" : `Soru Haritası (1 - ${allQuestions.length})`;
    }

    const listToMap = isExam ? filteredQuestions : allQuestions;

    listToMap.forEach((q, idx) => {
      const btn = document.createElement("button");
      btn.className = "grid-q-btn";
      btn.id = `grid-btn-${q.id}`;
      btn.textContent = isExam ? (idx + 1) : q.id;

      let answered = false;
      let correct = false;

      if (isExam) {
        const ans = activeExam ? activeExam.answers[q.id] : null;
        if (ans) {
          answered = true;
          correct = ans.isCorrect;
        }
        if (answered) {
          if (activeExam && (activeExam.isFinished || activeExam.instantFeedback)) {
            btn.classList.add(correct ? "correct" : "wrong");
          } else {
            btn.classList.add("answered");
          }
        }
      } else {
        const prog = userProgress[q.id];
        if (prog && prog.answered) {
          answered = true;
          correct = prog.isCorrect;
          btn.classList.add(correct ? "correct" : "wrong");
        }
      }

      if (filteredQuestions[currentIndex] && filteredQuestions[currentIndex].id === q.id) {
        btn.classList.add("active");
      }

      btn.addEventListener("click", () => {
        let targetIdx = filteredQuestions.findIndex(item => item.id === q.id);
        if (targetIdx !== -1) {
          currentIndex = targetIdx;
          renderQuestion();
          if (gridModal) gridModal.classList.remove("active");
        } else {
          currentCategory = "ALL";
          currentStatusFilter = "ALL";
          filterPills.forEach(p => p.classList.toggle("active", p.getAttribute("data-category") === "ALL"));
          updateStatusBtnsActive();
          applyCombinedFilters();
          targetIdx = filteredQuestions.findIndex(item => item.id === q.id);
          if (targetIdx !== -1) {
            currentIndex = targetIdx;
            renderQuestion();
          }
          if (gridModal) gridModal.classList.remove("active");
        }
      });

      questionGridContainer.appendChild(btn);
    });
  }

  function highlightActiveInGrid(questionId) {
    const allGridBtns = document.querySelectorAll(".grid-q-btn");
    allGridBtns.forEach(btn => btn.classList.remove("active"));
    const activeBtn = document.getElementById(`grid-btn-${questionId}`);
    if (activeBtn) activeBtn.classList.add("active");
  }

  function updateBadgesAndStats() {
    if (appMode === "EXAM") {
      updateExamUIElements();
      return;
    }

    const total = allQuestions.length;
    let correctCount = 0;
    let wrongCount = 0;
    let answeredCount = 0;

    allQuestions.forEach(q => {
      const prog = userProgress[q.id];
      if (prog && prog.answered) {
        answeredCount++;
        if (prog.isCorrect) correctCount++;
        else wrongCount++;
      }
    });

    const emptyCount = total - answeredCount;

    if (badgeAllCount) badgeAllCount.textContent = total;
    if (badgeEmptyCount) badgeEmptyCount.textContent = emptyCount;
    if (badgeWrongCount) badgeWrongCount.textContent = wrongCount;
    if (badgeCorrectCount) badgeCorrectCount.textContent = correctCount;

    if (headerCorrect) headerCorrect.textContent = correctCount;
    if (headerTotal) headerTotal.textContent = answeredCount;
  }

  function handleResetAndReshuffleAll() {
    if (!confirm("Tüm test ilerlemen sıfırlanacak ve bütün şıklar yeniden karıştırılacak. Emin misin?")) return;
    localStorage.removeItem("dispecer_progress");
    localStorage.removeItem("dispecer_option_layouts");
    userProgress = {};
    optionLayouts = {};
    shuffleEntireTest(false);
    updateBadgesAndStats();
    buildGridMap();
    currentIndex = 0;
    renderQuestion();
    if (scoreModal) scoreModal.classList.remove("active");
  }

  function openScoreModal() {
    const total = allQuestions.length;
    let correctCount = 0;
    let wrongCount = 0;

    allQuestions.forEach(q => {
      const prog = userProgress[q.id];
      if (prog && prog.answered) {
        if (prog.isCorrect) correctCount++;
        else wrongCount++;
      }
    });

    const answeredCount = correctCount + wrongCount;
    const percent = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

    if (modalCorrect) modalCorrect.textContent = correctCount;
    if (modalWrong) modalWrong.textContent = wrongCount;
    if (modalPercent) modalPercent.textContent = `%${percent}`;

    if (scoreMotivationalMsg) {
      if (answeredCount === 0) {
        scoreMotivationalMsg.textContent = "Henüz soru çözmedin. Haydi başla!";
      } else if (percent >= 90) {
        scoreMotivationalMsg.textContent = "Mükemmel! Tam dispeçer standardı!";
      } else if (percent >= 70) {
        scoreMotivationalMsg.textContent = "Çok iyi! Yanlış yaptığın konuları tekrar ederek 100'e ulaşabilirsin.";
      } else {
        scoreMotivationalMsg.textContent = "Pratik yapmaya devam! Slayt referanslarına göz atarak eksikleri kapatabilirsin.";
      }
    }

    if (scoreModal) scoreModal.classList.add("active");
  }

  // ==========================================
  // EVENT LISTENERS SETUP
  // ==========================================
  function setupListeners() {
    // Mode Switcher buttons
    if (btnModePractice) {
      btnModePractice.addEventListener("click", () => enterPracticeMode());
    }
    if (btnModeExam) {
      btnModeExam.addEventListener("click", () => enterExamMode(false));
    }

    // Exam Info Bar actions
    if (btnFinishExamTop) {
      btnFinishExamTop.addEventListener("click", () => finishExam());
    }
    if (btnFinishExamBottom) {
      btnFinishExamBottom.addEventListener("click", () => finishExam());
    }
    if (chkInstantFeedback) {
      chkInstantFeedback.addEventListener("change", (e) => {
        if (activeExam) {
          activeExam.instantFeedback = e.target.checked;
          localStorage.setItem("dispecer_active_exam", JSON.stringify(activeExam));
          renderQuestion();
          buildGridMap();
        }
      });
    }

    // Exam Result Modal Actions
    if (btnCloseExamModal) {
      btnCloseExamModal.addEventListener("click", () => examResultModal.classList.remove("active"));
    }
    if (btnNextExamBatch) {
      btnNextExamBatch.addEventListener("click", () => {
        if (examResultModal) examResultModal.classList.remove("active");
        startNewExamBatch(true);
      });
    }
    if (btnReviewExamQuestions) {
      btnReviewExamQuestions.addEventListener("click", () => {
        if (examResultModal) examResultModal.classList.remove("active");
        if (activeExam) {
          activeExam.instantFeedback = true;
          if (chkInstantFeedback) chkInstantFeedback.checked = true;
          renderQuestion();
          buildGridMap();
        }
      });
    }
    if (btnBackToPractice) {
      btnBackToPractice.addEventListener("click", () => {
        if (examResultModal) examResultModal.classList.remove("active");
        enterPracticeMode();
      });
    }

    // Status Filter buttons (Practice Mode)
    statusBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        currentStatusFilter = btn.getAttribute("data-status-filter");
        updateStatusBtnsActive();
        applyCombinedFilters();
      });
    });

    // Category pills (Practice Mode)
    filterPills.forEach(pill => {
      pill.addEventListener("click", () => {
        filterPills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        currentCategory = pill.getAttribute("data-category");
        applyCombinedFilters();
      });
    });

    // Navigation buttons
    btnPrev.addEventListener("click", () => {
      if (currentIndex > 0) {
        currentIndex--;
        renderQuestion();
      }
    });

    btnNext.addEventListener("click", () => {
      if (currentIndex < filteredQuestions.length - 1) {
        currentIndex++;
        renderQuestion();
      } else {
        if (appMode === "EXAM") {
          finishExam();
        } else {
          openScoreModal();
        }
      }
    });

    // Retry single question
    if (btnRetrySingle) {
      btnRetrySingle.addEventListener("click", () => resetCurrentQuestionForRetry());
    }

    // Bottom Action Button (Retry Mode / Jump to empty)
    if (btnRetryMode) {
      btnRetryMode.addEventListener("click", () => {
        if (currentStatusFilter === "WRONG") {
          resetAllWrongQuestionsForRetry();
        } else {
          jumpToNextEmpty();
        }
      });
    }

    // Random question
    if (btnRandom) {
      btnRandom.addEventListener("click", () => {
        if (filteredQuestions.length > 1) {
          let nextIdx;
          do {
            nextIdx = Math.floor(Math.random() * filteredQuestions.length);
          } while (nextIdx === currentIndex);
          currentIndex = nextIdx;
          renderQuestion();
        }
      });
    }

    // Question number click
    if (qNavTrigger) {
      qNavTrigger.addEventListener("click", () => {
        buildGridMap();
        if (gridModal) gridModal.classList.add("active");
      });
    }

    // Header score click
    if (topStatsBadge) {
      topStatsBadge.addEventListener("click", () => {
        if (appMode === "EXAM") {
          finishExam();
        } else {
          openScoreModal();
        }
      });
    }

    // Grid Modal Open/Close
    if (btnGridModal) {
      btnGridModal.addEventListener("click", () => {
        buildGridMap();
        if (gridModal) gridModal.classList.add("active");
      });
    }

    if (btnCloseGridModal) {
      btnCloseGridModal.addEventListener("click", () => {
        if (gridModal) gridModal.classList.remove("active");
      });
    }

    // Score Modal Close
    if (btnCloseScoreModal) {
      btnCloseScoreModal.addEventListener("click", () => {
        if (scoreModal) scoreModal.classList.remove("active");
      });
    }

    // Reset Progress Button
    if (btnResetProgress) {
      btnResetProgress.addEventListener("click", () => handleResetAndReshuffleAll());
    }

    // Modal background click close
    [gridModal, scoreModal, examResultModal].forEach(modal => {
      if (modal) {
        modal.addEventListener("click", (e) => {
          if (e.target === modal) {
            modal.classList.remove("active");
          }
        });
      }
    });

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (gridModal && gridModal.classList.contains("active")) return;
      if (scoreModal && scoreModal.classList.contains("active")) return;
      if (examResultModal && examResultModal.classList.contains("active")) return;

      if (e.key === "ArrowLeft") {
        if (currentIndex > 0) {
          currentIndex--;
          renderQuestion();
        }
      } else if (e.key === "ArrowRight") {
        if (currentIndex < filteredQuestions.length - 1) {
          currentIndex++;
          renderQuestion();
        }
      } else if (["1", "2", "3", "4", "5"].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        const optBtns = optionsGrid.querySelectorAll(".option-btn");
        if (optBtns[idx] && !optBtns[idx].disabled) {
          optBtns[idx].click();
        }
      }
    });
  }

  // Start initialization
  init();
});
