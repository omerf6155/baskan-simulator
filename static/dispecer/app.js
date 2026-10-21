// App Logic for Dispeçer Permi & Hukuk Drill
document.addEventListener("DOMContentLoaded", () => {
  // State
  let allQuestions = typeof QUESTIONS_DATA !== "undefined" ? QUESTIONS_DATA : [];
  let filteredQuestions = [...allQuestions];
  let currentIndex = 0;
  let currentCategory = "ALL";
  let currentStatusFilter = "ALL"; // "ALL" | "EMPTY" | "WRONG" | "CORRECT"

  // Persistent user state in LocalStorage
  let userProgress = JSON.parse(localStorage.getItem("dispecer_progress") || "{}");
  // Structure: { [questionId]: { answered: true, selected: 1, isCorrect: true } }

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

  // DOM Elements
  const headerCorrect = document.getElementById("headerCorrectCount");
  const headerTotal = document.getElementById("headerTotalSeen");
  const topStatsBadge = document.getElementById("topStatsBadge");

  // Status Filter Buttons
  const statusBtns = document.querySelectorAll(".status-btn");
  const badgeAllCount = document.getElementById("badgeAllCount");
  const badgeEmptyCount = document.getElementById("badgeEmptyCount");
  const badgeWrongCount = document.getElementById("badgeWrongCount");
  const badgeCorrectCount = document.getElementById("badgeCorrectCount");

  // Category Pills
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
  const btnNextEmpty = document.getElementById("btnNextEmpty");

  // Grid Map Modal
  const btnGridModal = document.getElementById("btnGridModal");
  const gridModal = document.getElementById("gridModal");
  const btnCloseGridModal = document.getElementById("btnCloseGridModal");
  const questionGridContainer = document.getElementById("questionGridContainer");

  // Score Modal
  const scoreModal = document.getElementById("scoreModal");
  const btnCloseScoreModal = document.getElementById("btnCloseScoreModal");
  const btnResetProgress = document.getElementById("btnResetProgress");

  const modalCorrect = document.getElementById("modalCorrect");
  const modalWrong = document.getElementById("modalWrong");
  const modalPercent = document.getElementById("modalPercent");
  const scoreMotivationalMsg = document.getElementById("scoreMotivationalMsg");

  // Init
  function init() {
    updateBadgesAndStats();
    buildGridMap();
    applyCombinedFilters();
    setupListeners();
  }

  // Apply Category + Status Filters
  function applyCombinedFilters() {
    filteredQuestions = allQuestions.filter(q => {
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

    if (filteredQuestions.length === 0) {
      if (currentStatusFilter === "WRONG") {
        alert("Süper! Yanlış yaptığın soru bulunmuyor.");
      } else if (currentStatusFilter === "EMPTY") {
        alert("Tüm soruları tamamladın! Boş soru kalmadı.");
      }
      currentStatusFilter = "ALL";
      updateStatusBtnsActive();
      filteredQuestions = allQuestions.filter(q => currentCategory === "ALL" || q.category === currentCategory);
    }

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

  // Render Current Question
  function renderQuestion() {
    if (filteredQuestions.length === 0) return;
    const q = filteredQuestions[currentIndex];

    // Card Meta
    cardCategory.textContent = q.category;
    cardDifficulty.textContent = q.difficulty;
    cardDifficulty.className = "badge difficulty-badge " + (q.difficulty.includes("Zor") ? "Zor" : "");
    cardSlideRef.textContent = q.slideRef || "REV02";

    // Progress Bar
    const totalCount = filteredQuestions.length;
    const progress = Math.round(((currentIndex + 1) / totalCount) * 100);
    progressBarFill.style.width = `${progress}%`;
    currentQNum.textContent = `Soru ${currentIndex + 1} / ${totalCount} (No: #${q.id})`;
    progressPercent.textContent = `%${progress}`;

    // Question Text
    questionText.textContent = q.question;

    // Check if previously answered
    const prog = userProgress[q.id];
    const isAnswered = prog && prog.answered;

    // Options
    optionsGrid.innerHTML = "";
    q.options.forEach((optText, optIdx) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.innerHTML = `<span>${optText}</span>`;

      if (isAnswered) {
        btn.disabled = true;
        if (optIdx === q.answer) {
          btn.classList.add("correct");
        } else if (optIdx === prog.selected) {
          btn.classList.add("wrong");
        } else {
          btn.classList.add("faded");
        }
      } else {
        btn.addEventListener("click", () => handleSelectAnswer(optIdx));
      }

      optionsGrid.appendChild(btn);
    });

    // Explanation Box
    if (isAnswered) {
      showExplanation(prog.isCorrect, q.explanation);
    } else {
      explanationBox.style.display = "none";
    }

    // Navigation buttons state
    btnPrev.disabled = currentIndex === 0;
    btnNext.textContent = currentIndex === totalCount - 1 ? "Bitti 🏁" : "Sonraki →";

    // Update active in grid
    highlightActiveInGrid(q.id);
  }

  // Answer handler
  function handleSelectAnswer(selectedIdx) {
    const q = filteredQuestions[currentIndex];
    const isCorrect = selectedIdx === q.answer;

    userProgress[q.id] = {
      answered: true,
      selected: selectedIdx,
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

  function showExplanation(isCorrect, text) {
    explanationBox.style.display = "block";
    explanationBox.className = "explanation-box " + (isCorrect ? "correct" : "wrong");
    statusIcon.textContent = isCorrect ? "✅" : "❌";
    statusTitle.textContent = isCorrect ? "DOĞRU CEVAP!" : "YANLIŞ CEVAP!";
    statusTitle.style.color = isCorrect ? "var(--success)" : "var(--danger)";
    explanationText.textContent = text;
  }

  // Find and jump to first unattempted question
  function jumpToNextEmpty() {
    // Search starting from next index
    const total = filteredQuestions.length;
    for (let offset = 1; offset <= total; offset++) {
      const targetIdx = (currentIndex + offset) % total;
      const targetQ = filteredQuestions[targetIdx];
      if (!userProgress[targetQ.id] || !userProgress[targetQ.id].answered) {
        currentIndex = targetIdx;
        renderQuestion();
        return;
      }
    }
    alert("Bu filtrede cevaplanmamış boş soru kalmadı!");
  }

  // Build 1-100 Question Grid Map
  function buildGridMap() {
    questionGridContainer.innerHTML = "";
    allQuestions.forEach((q, idx) => {
      const btn = document.createElement("button");
      btn.className = "grid-q-btn";
      btn.textContent = q.id;

      const prog = userProgress[q.id];
      if (prog && prog.answered) {
        btn.classList.add(prog.isCorrect ? "correct" : "wrong");
      }

      btn.addEventListener("click", () => {
        // Find in current filtered list or switch to ALL
        let foundIdx = filteredQuestions.findIndex(item => item.id === q.id);
        if (foundIdx === -1) {
          // Reset filters to ALL so user can view that question
          currentCategory = "ALL";
          currentStatusFilter = "ALL";
          updateStatusBtnsActive();
          filterPills.forEach(p => p.classList.toggle("active", p.getAttribute("data-category") === "ALL"));
          filteredQuestions = [...allQuestions];
          foundIdx = q.id - 1;
        }
        currentIndex = foundIdx;
        renderQuestion();
        gridModal.style.display = "none";
      });

      questionGridContainer.appendChild(btn);
    });

    const activeQ = filteredQuestions[currentIndex];
    if (activeQ) highlightActiveInGrid(activeQ.id);
  }

  function highlightActiveInGrid(qId) {
    const gridBtns = questionGridContainer.querySelectorAll(".grid-q-btn");
    gridBtns.forEach(btn => {
      btn.classList.toggle("current", btn.textContent === String(qId));
    });
  }

  // Header and Status Badges
  function updateBadgesAndStats() {
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

    const emptyCount = allQuestions.length - answeredCount;

    headerCorrect.textContent = correctCount;
    headerTotal.textContent = answeredCount;

    badgeAllCount.textContent = allQuestions.length;
    badgeEmptyCount.textContent = emptyCount;
    badgeWrongCount.textContent = wrongCount;
    badgeCorrectCount.textContent = correctCount;
  }

  // Setup Listeners
  function setupListeners() {
    // Status Mode Filter Buttons (Tümü, Boşlar, Yanlışlar, Doğrular)
    statusBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        currentStatusFilter = btn.getAttribute("data-status-filter");
        updateStatusBtnsActive();
        applyCombinedFilters();
      });
    });

    // Category Filter Pills
    filterPills.forEach(pill => {
      pill.addEventListener("click", () => {
        currentCategory = pill.getAttribute("data-category");
        filterPills.forEach(p => p.classList.toggle("active", p.getAttribute("data-category") === currentCategory));
        applyCombinedFilters();
      });
    });

    // Nav Buttons
    btnNext.addEventListener("click", () => {
      if (currentIndex < filteredQuestions.length - 1) {
        currentIndex++;
        renderQuestion();
      } else {
        openScoreModal();
      }
    });

    btnPrev.addEventListener("click", () => {
      if (currentIndex > 0) {
        currentIndex--;
        renderQuestion();
      }
    });

    btnNextEmpty.addEventListener("click", jumpToNextEmpty);

    btnRandom.addEventListener("click", () => {
      currentIndex = Math.floor(Math.random() * filteredQuestions.length);
      renderQuestion();
    });

    // Grid Modal
    btnGridModal.addEventListener("click", () => {
      gridModal.style.display = "flex";
    });
    qNavTrigger.addEventListener("click", () => {
      gridModal.style.display = "flex";
    });
    btnCloseGridModal.addEventListener("click", () => {
      gridModal.style.display = "none";
    });

    // Score Modal
    topStatsBadge.addEventListener("click", openScoreModal);
    btnCloseScoreModal.addEventListener("click", () => {
      scoreModal.style.display = "none";
    });

    btnResetProgress.addEventListener("click", () => {
      if (confirm("Tüm ilerlemeni ve çözdüğün soruları sıfırlamak istiyor musun?")) {
        userProgress = {};
        localStorage.removeItem("dispecer_progress");
        updateBadgesAndStats();
        buildGridMap();
        applyCombinedFilters();
        scoreModal.style.display = "none";
      }
    });

    // Close modal on background click
    window.addEventListener("click", (e) => {
      if (e.target === gridModal) gridModal.style.display = "none";
      if (e.target === scoreModal) scoreModal.style.display = "none";
    });

    // Keyboard support
    window.addEventListener("keydown", (e) => {
      if (scoreModal.style.display === "flex" || gridModal.style.display === "flex") return;
      if (e.key === "ArrowRight") btnNext.click();
      if (e.key === "ArrowLeft") btnPrev.click();
      
      const q = filteredQuestions[currentIndex];
      if (userProgress[q.id] && userProgress[q.id].answered) return;

      const keyMap = { "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "a": 0, "b": 1, "c": 2, "d": 3, "e": 4, "A": 0, "B": 1, "C": 2, "D": 3, "E": 4 };
      if (e.key in keyMap) {
        handleSelectAnswer(keyMap[e.key]);
      }
    });
  }

  function openScoreModal() {
    let correct = 0;
    let wrong = 0;
    let answered = 0;

    allQuestions.forEach(q => {
      const prog = userProgress[q.id];
      if (prog && prog.answered) {
        answered++;
        if (prog.isCorrect) correct++;
        else wrong++;
      }
    });

    const percent = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    modalCorrect.textContent = correct;
    modalWrong.textContent = wrong;
    modalPercent.textContent = `%${percent}`;

    if (answered === 0) {
      scoreMotivationalMsg.textContent = "Henüz soru çözmedin. İlk soruyla başla!";
    } else if (percent >= 85) {
      scoreMotivationalMsg.textContent = "🔥 Efsanesin! Dispeçerlik tek ders sınavı çantada keklik!";
    } else if (percent >= 70) {
      scoreMotivationalMsg.textContent = "👏 Gayet başarılı! Birkaç yanlışı da temizledin mi tamamdır.";
    } else {
      scoreMotivationalMsg.textContent = "💪 Pratiğe devam! Yanlışlarım sekmesinden hatalı soruları tekrar çöz.";
    }

    scoreModal.style.display = "flex";
  }

  // Start
  init();
});
