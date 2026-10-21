// App Logic for Dispeçer Permi & Hukuk Drill
document.addEventListener("DOMContentLoaded", () => {
  // State
  let allQuestions = typeof QUESTIONS_DATA !== "undefined" ? QUESTIONS_DATA : [];
  let filteredQuestions = [...allQuestions];
  let currentIndex = 0;
  let currentCategory = "ALL";

  // Persistent user state in LocalStorage
  let userProgress = JSON.parse(localStorage.getItem("dispecer_progress") || "{}");
  // Structure: { [questionId]: { answered: true, selected: 1, isCorrect: true } }

  // DOM Elements
  const headerCorrect = document.getElementById("headerCorrectCount");
  const headerTotal = document.getElementById("headerTotalSeen");
  const filterPills = document.querySelectorAll(".filter-pill");
  const wrongFilterPill = document.getElementById("wrongFilterPill");
  
  const progressBarFill = document.getElementById("progressBarFill");
  const currentQNum = document.getElementById("currentQuestionNumber");
  const progressPercent = document.getElementById("progressPercent");

  const cardCategory = document.getElementById("cardCategory");
  const cardDifficulty = document.getElementById("cardDifficulty");
  const cardSlideRef = document.getElementById("cardSlideRef");
  const questionText = document.getElementById("questionText");
  const optionsGrid = document.getElementById("optionsGrid");

  const explanationBox = document.getElementById("explanationBox");
  const statusIcon = document.getElementById("statusIcon");
  const statusTitle = document.getElementById("statusTitle");
  const explanationText = document.getElementById("explanationText");

  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnRandom = document.getElementById("btnRandom");

  const btnScoreboard = document.getElementById("btnScoreboard");
  const scoreModal = document.getElementById("scoreModal");
  const btnCloseModal = document.getElementById("btnCloseModal");
  const btnResetProgress = document.getElementById("btnResetProgress");

  const modalCorrect = document.getElementById("modalCorrect");
  const modalWrong = document.getElementById("modalWrong");
  const modalPercent = document.getElementById("modalPercent");
  const scoreMotivationalMsg = document.getElementById("scoreMotivationalMsg");

  // Init
  function init() {
    updateWrongPillCount();
    applyFilter("ALL");
    setupListeners();
    updateHeaderStats();
  }

  // Filter logic
  function applyFilter(cat) {
    currentCategory = cat;
    filterPills.forEach(p => {
      p.classList.toggle("active", p.getAttribute("data-category") === cat);
    });

    if (cat === "ALL") {
      filteredQuestions = [...allQuestions];
    } else if (cat === "WRONG") {
      filteredQuestions = allQuestions.filter(q => {
        const prog = userProgress[q.id];
        return prog && prog.answered && !prog.isCorrect;
      });
      if (filteredQuestions.length === 0) {
        alert("Harika! Hiç yanlış yaptığın soru bulunmuyor.");
        applyFilter("ALL");
        return;
      }
    } else {
      filteredQuestions = allQuestions.filter(q => q.category === cat);
    }

    currentIndex = 0;
    renderQuestion();
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
    const progress = Math.round(((currentIndex + 1) / filteredQuestions.length) * 100);
    progressBarFill.style.width = `${progress}%`;
    currentQNum.textContent = `Soru ${currentIndex + 1} / ${filteredQuestions.length}`;
    progressPercent.textContent = `%${progress}`;

    // Question
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
    btnNext.textContent = currentIndex === filteredQuestions.length - 1 ? "Bitti 🏁" : "Sonraki →";
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
    updateHeaderStats();
    updateWrongPillCount();
    renderQuestion();

    // Haptic feedback if supported on mobile
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

  // Header and Stats
  function updateHeaderStats() {
    let correctCount = 0;
    let seenCount = 0;

    Object.values(userProgress).forEach(p => {
      if (p.answered) {
        seenCount++;
        if (p.isCorrect) correctCount++;
      }
    });

    headerCorrect.textContent = correctCount;
    headerTotal.textContent = seenCount;
  }

  function updateWrongPillCount() {
    let wrongCount = 0;
    Object.values(userProgress).forEach(p => {
      if (p.answered && !p.isCorrect) wrongCount++;
    });

    if (wrongCount > 0) {
      wrongFilterPill.style.display = "inline-block";
      wrongFilterPill.textContent = `Yanlışlarım (${wrongCount})`;
    } else {
      wrongFilterPill.style.display = "none";
    }
  }

  // Listeners
  function setupListeners() {
    filterPills.forEach(pill => {
      pill.addEventListener("click", () => {
        applyFilter(pill.getAttribute("data-category"));
      });
    });

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

    btnRandom.addEventListener("click", () => {
      currentIndex = Math.floor(Math.random() * filteredQuestions.length);
      renderQuestion();
    });

    btnScoreboard.addEventListener("click", openScoreModal);
    btnCloseModal.addEventListener("click", () => {
      scoreModal.style.display = "none";
    });

    btnResetProgress.addEventListener("click", () => {
      if (confirm("Tüm ilerlemeni ve çözdüğün soruları sıfırlamak istiyor musun?")) {
        userProgress = {};
        localStorage.removeItem("dispecer_progress");
        updateHeaderStats();
        updateWrongPillCount();
        if (currentCategory === "WRONG") applyFilter("ALL");
        else renderQuestion();
        scoreModal.style.display = "none";
      }
    });

    // Keyboard support (1-5 or A-E keys)
    window.addEventListener("keydown", (e) => {
      if (scoreModal.style.display === "flex") return;
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

    Object.values(userProgress).forEach(p => {
      if (p.answered) {
        answered++;
        if (p.isCorrect) correct++;
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
