// ==================== GLOBAL APP STATE ====================
let gameState = null;
let currentPressOption = null;
let isMatchSimulating = false;
let viewingFinishedMatch = false;
let teamsList = [];
let allLeagueSquads = [];
let currentTransferMarketCategory = "all";
let marketData = { scout_picks: [], world_stars: [], free_agents: [] };
let activeNegotiation = null;

// ==================== BAŞLANGIÇTA ÇALIŞ ====================
document.addEventListener("DOMContentLoaded", () => {
  fetchState();
  loadTeamsList();
  loadScoutCandidates();
  loadSponsors();
  loadTransferMarket();
  lucide.createIcons();
});

function showToast(msg) {
  const box = document.getElementById("toast-box");
  const txt = document.getElementById("toast-text");
  if (!box || !txt) return;
  txt.innerText = msg;
  box.classList.add("opacity-100", "translate-y-0");
  box.classList.remove("opacity-0", "translate-y-3");
  setTimeout(() => {
    box.classList.add("opacity-0", "translate-y-3");
    box.classList.remove("opacity-100", "translate-y-0");
  }, 3200);
}

function formatMoney(num) {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(0) + "M ₺";
  }
  return Number(num || 0).toLocaleString("tr-TR") + " ₺";
}

// ==================== TAB DEĞİŞTİRME ====================
function switchTab(tabId) {
  document.querySelectorAll(".tab-pane").forEach(el => el.classList.add("hidden"));
  const target = document.getElementById("tab-" + tabId);
  if (target) target.classList.remove("hidden");

  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.remove("active", "text-amber-400"));
  const navBtn = document.getElementById("nav-btn-" + tabId);
  if (navBtn) {
    navBtn.classList.add("active");
  }

  // Radar grafiğini çiz
  if (tabId === "match" || tabId === "office") {
    renderRadarFromState();
  }

  lucide.createIcons();
}

function toggleStandingsSubTab(sub) {
  const table = document.getElementById("standings-table-view");
  const fixtures = document.getElementById("standings-fixtures-view");
  const btnTable = document.getElementById("subtab-btn-table");
  const btnFix = document.getElementById("subtab-btn-fixtures");

  if (sub === "table") {
    table.classList.remove("hidden");
    fixtures.classList.add("hidden");
    btnTable.className = "flex-1 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs text-center transition-all";
    btnFix.className = "flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold text-xs text-center hover:bg-slate-700 transition-all";
  } else {
    table.classList.add("hidden");
    fixtures.classList.remove("hidden");
    btnFix.className = "flex-1 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs text-center transition-all";
    btnTable.className = "flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold text-xs text-center hover:bg-slate-700 transition-all";
  }
}

// ==================== STATE YÖNETİMİ & RENDER ====================
async function fetchState() {
  try {
    const res = await fetch("/api/state");
    gameState = await res.json();
    renderUI();
  } catch (e) {
    console.error("State alınamadı", e);
  }
}

function renderUI() {
  if (!gameState) return;

  // Başlangıçta kulüp seçilmemişse seçim modalını zorunlu aç
  if (!gameState.is_started) {
    openTeamSelectModal();
  }

  // Header Kulüp Logosu ve Arma
  const logoEl = document.getElementById("header-club-logo");
  const badgeEl = document.getElementById("header-club-badge");
  if (gameState.logo) {
    logoEl.src = gameState.logo + "?v=3";
    logoEl.style.display = "block";
    badgeEl.style.display = "none";
  } else {
    logoEl.style.display = "none";
    badgeEl.style.display = "block";
  }
  badgeEl.innerText = gameState.club_short || "TS";

  // Header Barları
  document.getElementById("header-club-name").innerText = gameState.club_name;
  document.getElementById("header-pres-name").innerText = gameState.president_name;
  document.getElementById("header-season").innerText = gameState.season;
  document.getElementById("header-week").innerText = Math.min(gameState.week, gameState.max_weeks || 34);

  // Kasa & Metrikler
  document.getElementById("bar-budget-txt").innerText = formatMoney(gameState.budget);
  document.getElementById("bar-fan-txt").innerText = `%${gameState.fan_trust}`;
  document.getElementById("bar-board-txt").innerText = `%${gameState.board_trust}`;
  document.getElementById("bar-pol-txt").innerText = `%${gameState.political_power}`;
  const polCard = document.getElementById("pol-card-score");
  if (polCard) polCard.innerText = `%${gameState.political_power}`;

  // Haber Ticker
  if (gameState.news && gameState.news.length > 0) {
    document.getElementById("breaking-news-ticker").innerText = gameState.news[0];
  }

  // Sıradaki Karşılaşma (Fikstürden Bul)
  const curFix = (gameState.fixtures || []).find(f => f.week === gameState.week);
  if (curFix) {
    document.getElementById("office-my-name").innerText = gameState.club_name;
    document.getElementById("office-my-pwr").innerText = gameState.team_power;
    document.getElementById("office-opp-name").innerText = curFix.opponent;
    document.getElementById("office-opp-pwr").innerText = curFix.opponent_pwr;
    const locTag = curFix.is_home ? "EV SAHİBİ" : "DEPLASMAN";
    document.getElementById("office-match-loc").innerText = locTag;
    document.getElementById("match-loc-tag").innerText = curFix.is_home ? "EV MAÇI (Bilet Geliri Var)" : "DEPLASMAN (Zorlu Maç)";

    // Sıradaki Maç Logoları
    const myLogoEl = document.getElementById("office-my-logo");
    const oppLogoEl = document.getElementById("office-opp-logo");
    const oppObj = teamsList.find(t => t.name === curFix.opponent);

    if (myLogoEl) {
      myLogoEl.src = gameState.logo ? gameState.logo + "?v=3" : "";
      myLogoEl.style.display = gameState.logo ? "block" : "none";
    }
    if (oppLogoEl) {
      const oppLogo = oppObj ? oppObj.logo : "";
      oppLogoEl.src = oppLogo ? oppLogo + "?v=3" : "";
      oppLogoEl.style.display = oppLogo ? "block" : "none";
    }

    // Derbi Rozeti
    const derbyBadge = document.getElementById("office-derby-badge");
    const isDerby = curFix.opponent_is_big || (gameState.is_big && curFix.opponent_is_big);
    if (derbyBadge) {
      if (isDerby) derbyBadge.classList.remove("hidden");
      else derbyBadge.classList.add("hidden");
    }

    // Maç Ekranı İsimleri & Logoları
    if (!viewingFinishedMatch) {
      const homeLogoEl = document.getElementById("match-home-logo");
      const awayLogoEl = document.getElementById("match-away-logo");
      if (curFix.is_home) {
        document.getElementById("match-home-name").innerText = gameState.club_name;
        document.getElementById("match-home-tag").innerText = "EV SAHİBİ (BİZ)";
        document.getElementById("match-away-name").innerText = curFix.opponent;
        document.getElementById("match-away-tag").innerText = "DEPLASMAN (RAKİP)";
        if (homeLogoEl) { homeLogoEl.src = gameState.logo ? gameState.logo + "?v=3" : ""; homeLogoEl.style.display = gameState.logo ? "block" : "none"; }
        if (awayLogoEl) { awayLogoEl.src = (oppObj && oppObj.logo) ? oppObj.logo + "?v=3" : ""; awayLogoEl.style.display = (oppObj && oppObj.logo) ? "block" : "none"; }
      } else {
        document.getElementById("match-home-name").innerText = curFix.opponent;
        document.getElementById("match-home-tag").innerText = "EV SAHİBİ (RAKİP)";
        document.getElementById("match-away-name").innerText = gameState.club_name;
        document.getElementById("match-away-tag").innerText = "DEPLASMAN (BİZ)";
        if (homeLogoEl) { homeLogoEl.src = (oppObj && oppObj.logo) ? oppObj.logo + "?v=3" : ""; homeLogoEl.style.display = (oppObj && oppObj.logo) ? "block" : "none"; }
        if (awayLogoEl) { awayLogoEl.src = gameState.logo ? gameState.logo + "?v=3" : ""; awayLogoEl.style.display = gameState.logo ? "block" : "none"; }
      }
    }
  } else if (gameState.season_finished) {
    document.getElementById("office-match-loc").innerText = "SEZON BİTTİ";
  }

  // Hoca Özeti
  document.getElementById("office-coach-name").innerText = gameState.coach.name;
  document.getElementById("office-coach-style").innerText = gameState.coach.style;
  document.getElementById("squad-coach-name").innerText = gameState.coach.name;
  document.getElementById("squad-coach-style").innerText = gameState.coach.style;
  document.getElementById("squad-coach-salary").innerText = `${formatMoney(gameState.coach.salary)} / Sezon`;
  document.getElementById("coach-attr-attack").innerText = gameState.coach.attack || 70;
  document.getElementById("coach-attr-defense").innerText = gameState.coach.defense || 70;
  document.getElementById("coach-attr-youth").innerText = gameState.coach.youth || 50;
  document.getElementById("coach-attr-moral").innerText = `%${gameState.coach.moral}`;

  // Transfer Penceresi Gün Kontrolü
  const curDay = gameState.transfer_day || 1;
  const maxDays = gameState.transfer_max_days || 7;
  const winTitle = document.getElementById("transfer-window-title");
  const winDesc = document.getElementById("transfer-window-desc");
  const officeWin = document.getElementById("office-window-status");

  if (gameState.transfer_window_open !== false) {
    winTitle.innerText = `Transfer Penceresi: Gün ${curDay}/${maxDays}`;
    winDesc.innerText = `Pazarlıklar sürüyor. Gün bitiminde yeni teklifler gelebilir.`;
    officeWin.innerText = `Pencere AÇIK (${curDay}/${maxDays})`;
    officeWin.className = "text-xs font-bold text-emerald-400";
  } else {
    winTitle.innerText = "Transfer Penceresi: KAPALI";
    winDesc.innerText = "Pencereler kapandı. Ara transfere kadar lig maçlarına odaklanın.";
    officeWin.innerText = "Pencere KAPALI";
    officeWin.className = "text-xs font-bold text-slate-400";
  }

  // Gelen Teklifler Kutusu
  renderIncomingBids();

  // Kadro Listesini Doldur
  renderSquadList();

  // Puan Durumu ve Fikstürü Doldur
  renderStandings();
  renderFixtures();

  // Finans Tablosunu Doldur
  renderFinances();

  // Radar Grafiğini Çiz
  renderRadarFromState();

  // Arsa Dönüm Bilgisi
  const reLand = document.getElementById("re-land-acres");
  if (reLand && gameState.real_estate) {
    reLand.innerText = `${gameState.real_estate.land_acres} Dönüm`;
  }
}

// ==================== HEXAGONAL RADAR / SPIDER CHART ÇİZİMİ ====================
function renderRadarFromState() {
  if (!gameState) return;
  const myRadar = gameState.my_radar || { pac: 78, sho: 76, pas: 77, dri: 79, def: 75, phy: 78 };
  const oppRadar = gameState.opp_radar || { pac: 75, sho: 75, pas: 75, dri: 75, def: 75, phy: 75 };

  const curFix = (gameState.fixtures || []).find(f => f.week === gameState.week);
  const oppName = curFix ? curFix.opponent : "Rakip";

  document.getElementById("radar-my-label").innerText = gameState.club_short || gameState.club_name.substring(0, 10);
  document.getElementById("radar-opp-label").innerText = oppName.substring(0, 10);

  drawHexagonalRadar("radar-canvas", myRadar, oppRadar);

  // Rozetleri güncelle
  const updateBadge = (id, myVal, oppVal) => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = `<span class="text-cyan-400">${myVal}</span><span class="text-slate-500 text-[8px]">/</span><span class="text-rose-400">${oppVal}</span>`;
    }
  };
  updateBadge("stat-badge-pac", myRadar.pac, oppRadar.pac);
  updateBadge("stat-badge-sho", myRadar.sho, oppRadar.sho);
  updateBadge("stat-badge-pas", myRadar.pas, oppRadar.pas);
  updateBadge("stat-badge-dri", myRadar.dri, oppRadar.dri);
  updateBadge("stat-badge-def", myRadar.def, oppRadar.def);
  updateBadge("stat-badge-phy", myRadar.phy, oppRadar.phy);
}

function drawHexagonalRadar(canvasId, myStats, oppStats) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 34;

  ctx.clearRect(0, 0, width, height);

  // 6 Eksen: Hız, Şut, Pas, Dripling, Defans, Fizik
  const axes = [
    { key: "sho", label: "Şut" },
    { key: "phy", label: "Fizik" },
    { key: "pas", label: "Pas" },
    { key: "def", label: "Defans" },
    { key: "pac", label: "Hız" },
    { key: "dri", label: "Dripling" }
  ];
  const numAxes = axes.length;
  const angleStep = (Math.PI * 2) / numAxes;

  // 1. Eşmerkezli Kılavuz Çemberler (Concentric Rings)
  const levels = [0.25, 0.50, 0.75, 1.0];
  levels.forEach(lvl => {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * lvl, 0, Math.PI * 2);
    ctx.strokeStyle = lvl === 1.0 ? "rgba(148, 163, 184, 0.35)" : "rgba(71, 85, 105, 0.25)";
    ctx.lineWidth = lvl === 1.0 ? 1.5 : 1;
    ctx.stroke();
  });

  // 2. Merkezden Dışa Radyal Çizgiler & Etiketler
  axes.forEach((axis, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "rgba(71, 85, 105, 0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Etiket Metni
    const labelX = centerX + Math.cos(angle) * (radius + 20);
    const labelY = centerY + Math.sin(angle) * (radius + 20);
    ctx.font = "bold 10px Inter, sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(axis.label, labelX, labelY);
  });

  // Poligon Çizici Fonksiyon
  function drawPolygon(stats, strokeColor, fillColor, dotColor) {
    ctx.beginPath();
    axes.forEach((axis, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const rawVal = stats[axis.key] || 75;
      // 40 - 100 arası ölçeklendirme
      const normVal = Math.max(0.2, Math.min(1.0, (rawVal - 40) / 60));
      const x = centerX + Math.cos(angle) * (radius * normVal);
      const y = centerY + Math.sin(angle) * (radius * normVal);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Köşe Noktaları (Vertices)
    axes.forEach((axis, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const rawVal = stats[axis.key] || 75;
      const normVal = Math.max(0.2, Math.min(1.0, (rawVal - 40) / 60));
      const x = centerX + Math.cos(angle) * (radius * normVal);
      const y = centerY + Math.sin(angle) * (radius * normVal);

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });
  }

  // 3. Rakip Takım Poligonu (Pembe/Mercan)
  drawPolygon(oppStats, "#fb7185", "rgba(251, 113, 133, 0.28)", "#f43f5e");

  // 4. Bizim Takım Poligonu (Cyan/Cam Göbeği)
  drawPolygon(myStats, "#38bdf8", "rgba(56, 189, 248, 0.35)", "#0ea5e9");
}

// ==================== KADRO VE PUAN DURUMU RENDER ====================
function renderSquadList() {
  const container = document.getElementById("squad-players-list");
  if (!container || !gameState || !gameState.squad) return;
  container.innerHTML = "";

  document.getElementById("squad-player-count").innerText = gameState.squad.length;

  gameState.squad.forEach((p, idx) => {
    const isStarter = idx < 11;
    const card = document.createElement("div");
    card.className = `p-2 rounded-lg border flex items-center justify-between text-xs transition-all ${
      isStarter ? "bg-slate-900/90 border-slate-700/80" : "bg-slate-950/70 border-slate-800/60 opacity-80"
    }`;

    const sk = p.skills || {};
    const contractYears = p.contract_years !== undefined ? p.contract_years : 2;

    card.innerHTML = `
      <div class="flex items-center gap-2 truncate">
        <span class="text-[9px] font-black px-1.5 py-0.5 rounded ${
          p.pos === "KL" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-slate-800 text-slate-300"
        }">${p.pos}</span>
        <div class="truncate">
          <div class="font-bold text-white text-[11px] truncate flex items-center gap-1.5">
            <span>${p.name}</span>
            ${idx === 0 && !p.pos.includes("KL") ? '<span class="text-[8px] bg-amber-500 text-black px-1 rounded font-black">KAPTAN</span>' : ''}
          </div>
          <div class="text-[9px] text-slate-400">
            ${p.age} yaş • Sözleşme: <strong class="text-amber-300">${contractYears} Yıl</strong> • Maaş: ${formatMoney(p.wage)}
          </div>
        </div>
      </div>
      <div class="text-right flex items-center gap-2 flex-shrink-0">
        <div class="text-[9px] text-slate-400 hidden sm:block">
          Hız:${sk.pac || 75} Şut:${sk.sho || 75}
        </div>
        <span class="text-xs font-black text-amber-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
          ${p.overall}
        </span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderStandings() {
  const tbody = document.getElementById("standings-table-body");
  if (!tbody || !gameState || !gameState.standings) return;
  tbody.innerHTML = "";

  gameState.standings.forEach((s, idx) => {
    const isMe = s.name === gameState.club_name;
    const row = document.createElement("tr");
    row.className = isMe ? "bg-amber-500/15 font-bold text-amber-300" : "hover:bg-slate-900/40 text-slate-300";

    row.innerHTML = `
      <td class="py-1.5 px-2 text-center font-bold text-slate-400">${idx + 1}</td>
      <td class="py-1.5 px-1 font-bold truncate max-w-[120px] ${isMe ? 'text-amber-400' : 'text-white'}">${s.name}</td>
      <td class="py-1.5 px-1 text-center">${s.played}</td>
      <td class="py-1.5 px-1 text-center">${s.wins}</td>
      <td class="py-1.5 px-1 text-center">${s.draws}</td>
      <td class="py-1.5 px-1 text-center">${s.losses}</td>
      <td class="py-1.5 px-1 text-center font-mono">${s.gd > 0 ? '+' : ''}${s.gd}</td>
      <td class="py-1.5 px-2 text-right font-black text-white">${s.points}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderFixtures() {
  const container = document.getElementById("standings-fixtures-view");
  if (!container || !gameState || !gameState.fixtures) return;
  container.innerHTML = "";

  gameState.fixtures.forEach(f => {
    const isCur = f.week === gameState.week;
    const isPast = f.week < gameState.week;
    const card = document.createElement("div");
    card.className = `p-2 rounded-lg border text-xs flex items-center justify-between ${
      isCur ? "bg-amber-500/15 border-amber-500/50 text-white" : isPast ? "bg-slate-900/50 border-slate-800 text-slate-400" : "bg-slate-900 border-slate-800 text-slate-300"
    }`;

    const loc = f.is_home ? "(Ev)" : "(Dep)";
    const res = f.result_score ? `<strong class="font-mono text-amber-400">${f.result_score}</strong>` : `<span class="text-[10px] text-slate-400 font-mono">VS</span>`;

    card.innerHTML = `
      <span class="font-mono text-[10px] text-slate-400 w-8">H${f.week}</span>
      <span class="font-bold flex-1 truncate">${f.is_home ? gameState.club_name : f.opponent}</span>
      <span class="mx-2">${res}</span>
      <span class="font-bold flex-1 truncate text-right">${f.is_home ? f.opponent : gameState.club_name}</span>
    `;
    container.appendChild(card);
  });
}

function renderFinances() {
  if (!gameState || !gameState.finances) return;
  const fin = gameState.finances;
  document.getElementById("fin-ticket-val").innerText = formatMoney(fin.last_ticket_income);
  document.getElementById("fin-store-val").innerText = formatMoney(fin.last_store_income);
  document.getElementById("fin-tv-val").innerText = formatMoney(fin.last_tv_income);
  document.getElementById("fin-wage-val").innerText = formatMoney(fin.last_wage_expense);

  const curFix = (gameState.fixtures || []).find(f => f.week === gameState.week);
  const isAway = curFix && !curFix.is_home;
  document.getElementById("fin-travel-val").innerText = isAway ? "2M ₺" : "0 ₺";

  const net = (fin.last_ticket_income + fin.last_store_income + fin.last_tv_income) - fin.last_wage_expense - (isAway ? 2_000_000 : 0);
  const netEl = document.getElementById("fin-net-change");
  netEl.innerText = (net >= 0 ? "+" : "") + formatMoney(net);
  netEl.className = net >= 0 ? "text-xs font-bold text-emerald-400" : "text-xs font-bold text-rose-400";
}

// ==================== GOOOL KUTLAMASI & TARAFTAR SESİ ====================
let celebrationTimeout = null;
let fireworksAnimationId = null;

function playStadiumGoalSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;

    // 1. Derin Bas Patlaması
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(150, now);
    subOsc.frequency.exponentialRampToValueAtTime(32, now + 0.9);
    subGain.gain.setValueAtTime(0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.9);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.9);

    // 2. Stadyum Gol Kornası
    const hornNotes = [261.63, 329.63, 392.00, 523.25];
    hornNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1400, now + idx * 0.14);

      gain.gain.setValueAtTime(0, now + idx * 0.14);
      gain.gain.linearRampToValueAtTime(0.28, now + idx * 0.14 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.14 + 1.2);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 1.25);
    });

    // 3. Taraftar Uğultusu
    const bufferSize = Math.floor(ctx.sampleRate * 2.5);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.8;
    }

    const crowdSource = ctx.createBufferSource();
    crowdSource.buffer = noiseBuffer;
    const crowdFilter = ctx.createBiquadFilter();
    crowdFilter.type = "bandpass";
    crowdFilter.frequency.setValueAtTime(520, now);
    crowdFilter.frequency.linearRampToValueAtTime(950, now + 0.6);
    crowdFilter.frequency.exponentialRampToValueAtTime(420, now + 2.4);

    const crowdGain = ctx.createGain();
    crowdGain.gain.setValueAtTime(0.01, now);
    crowdGain.gain.linearRampToValueAtTime(0.7, now + 0.3);
    crowdGain.gain.exponentialRampToValueAtTime(0.01, now + 2.4);

    crowdSource.connect(crowdFilter);
    crowdFilter.connect(crowdGain);
    crowdGain.connect(ctx.destination);

    crowdSource.start(now);
    crowdSource.stop(now + 2.5);
  } catch (err) {
    console.warn("Ses motoru calismadi:", err);
  }
}

function startFireworks() {
  const canvas = document.getElementById("goal-fireworks-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ["#fbbf24", "#34d399", "#f87171", "#60a5fa", "#a78bfa", "#f472b6", "#ffffff", "#f59e0b"];

  function createFirework(x, y) {
    const count = 50;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.25);
      const speed = Math.random() * 7 + 2.5;
      particles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 3.5 + 2,
        decay: Math.random() * 0.02 + 0.015,
        shape: Math.random() > 0.4 ? "circle" : "rect"
      });
    }
  }

  createFirework(canvas.width * 0.3, canvas.height * 0.35);
  createFirework(canvas.width * 0.7, canvas.height * 0.35);
  setTimeout(() => createFirework(canvas.width * 0.5, canvas.height * 0.25), 350);

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.09;
      p.vx *= 0.98;
      p.alpha -= p.decay;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      if (p.shape === "rect") ctx.fillRect(p.x, p.y, p.size * 2, p.size);
      else ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (particles.length > 0) fireworksAnimationId = requestAnimationFrame(animate);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  if (fireworksAnimationId) cancelAnimationFrame(fireworksAnimationId);
  fireworksAnimationId = requestAnimationFrame(animate);
}

function triggerGoalCelebration(ev, match) {
  const overlay = document.getElementById("goal-celebration-overlay");
  const card = document.getElementById("goal-celebration-card");
  const scorerEl = document.getElementById("goal-scorer-name");
  const detailEl = document.getElementById("goal-scorer-detail");
  const scoreEl = document.getElementById("goal-celebration-score");

  if (!overlay || !card) return;

  let scorerName = ev.scorer || "Golcümüz";
  if (!ev.scorer && ev.text) {
    const m = ev.text.match(/GOOOOL!\s+([^(]+)/);
    if (m) scorerName = m[1].trim();
  }

  scorerEl.innerText = scorerName.toUpperCase();
  detailEl.innerText = `${ev.minute}' Dakika • ${gameState.club_name}`;
  scoreEl.innerText = (ev.home_score !== undefined && ev.away_score !== undefined) ? `${ev.home_score} - ${ev.away_score}` : "GOL!";

  overlay.classList.remove("hidden");
  setTimeout(() => {
    card.classList.remove("scale-50", "opacity-0");
    card.classList.add("scale-100", "opacity-100");
  }, 20);

  playStadiumGoalSound();
  startFireworks();

  if (celebrationTimeout) clearTimeout(celebrationTimeout);
  celebrationTimeout = setTimeout(() => dismissGoalCelebration(), 2200);
}

function dismissGoalCelebration() {
  const overlay = document.getElementById("goal-celebration-overlay");
  const card = document.getElementById("goal-celebration-card");
  if (!overlay || !card) return;

  if (celebrationTimeout) clearTimeout(celebrationTimeout);
  card.classList.remove("scale-100", "opacity-100");
  card.classList.add("scale-50", "opacity-0");

  setTimeout(() => {
    overlay.classList.add("hidden");
    const canvas = document.getElementById("goal-fireworks-canvas");
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, 250);
}

// ==================== İKİ DEVRELİ MAÇ SİMÜLASYONU (10s + 10s) ====================
let activeHalf1Data = null;

function selectPressStatement(opt) {
  if (isMatchSimulating) return;
  currentPressOption = opt;
  document.querySelectorAll(".press-opt-btn").forEach(b => b.classList.remove("selected", "border-amber-500"));
  const btn = document.getElementById("press-btn-" + opt);
  if (btn) btn.classList.add("selected", "border-amber-500");
}

async function startMatchSimulation() {
  if (isMatchSimulating) return;

  if (gameState.season_finished) {
    showToast("Sezon bitti! Kupa törenine geçin.");
    checkSeasonEndModal();
    return;
  }

  isMatchSimulating = true;
  viewingFinishedMatch = true;

  const startBtn = document.getElementById("start-match-btn");
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.classList.add("opacity-60", "cursor-not-allowed");
    startBtn.innerHTML = `<span class="animate-spin inline-block mr-1">⚽</span> <span>1. Devre Oynanıyor... (10s)</span>`;
  }

  document.querySelectorAll(".press-opt-btn").forEach(b => b.disabled = true);
  document.getElementById("post-match-action").classList.add("hidden");
  document.getElementById("match-ratings-box").classList.add("hidden");
  document.getElementById("coach-press-box").classList.add("hidden");

  // Sıfırla
  document.getElementById("match-clock").innerText = "00:00";
  document.getElementById("match-home-score").innerText = "0";
  document.getElementById("match-away-score").innerText = "0";
  document.getElementById("coach-mistake-count").innerText = "0";

  const feed = document.getElementById("match-live-feed");
  feed.innerHTML = `
    <div class="p-1.5 rounded-lg bg-emerald-950/70 border border-emerald-600/50 text-emerald-200 text-[11px] font-semibold flex items-center justify-between">
      <span>📢 Hakem düdüğü çaldı, 1. Devre başladı!</span>
      <span class="font-mono text-[9px] text-amber-400 bg-slate-900 px-1 py-0.2 rounded border border-slate-800 animate-pulse">1. YARI (10s)</span>
    </div>
  `;

  try {
    const res = await fetch("/api/match/half1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ press_boost: currentPressOption })
    });

    if (!res.ok) {
      const err = await res.json();
      showToast(err.detail || "Maç başlatılamadı!");
      resetSimButton();
      return;
    }

    const data = await res.json();
    activeHalf1Data = data;

    // 1. Devre Canlı Akışını Çalıştır (10 saniye: 00:00 -> 45:00)
    await runHalfAnimation(data, 1, 45, 10000);

    // 45. Dakikada Devre Arası Modalı Açılır
    document.getElementById("match-clock").innerText = "45:00 (DEVRE ARASI)";
    openHalftimeModal(data);

  } catch (err) {
    console.error(err);
    showToast("Sunucuya bağlanılamadı!");
    resetSimButton();
  }
}

function openHalftimeModal(h1Data) {
  const modal = document.getElementById("modal-halftime-speech");
  if (!modal) return;

  const scoreEl = document.getElementById("halftime-score-display");
  scoreEl.innerText = `${h1Data.home_score} - ${h1Data.away_score}`;

  const titleEl = document.getElementById("halftime-status-title");
  const descEl = document.getElementById("halftime-status-desc");
  titleEl.innerText = `${h1Data.home_name} ${h1Data.home_score} - ${h1Data.away_score} ${h1Data.away_name}`;

  modal.classList.remove("hidden");
}

async function submitHalftimeAction(action) {
  document.getElementById("modal-halftime-speech").classList.add("hidden");

  const startBtn = document.getElementById("start-match-btn");
  if (startBtn) {
    startBtn.innerHTML = `<span class="animate-spin inline-block mr-1">⚽</span> <span>2. Devre Oynanıyor... (10s)</span>`;
  }

  try {
    const res = await fetch("/api/match/half2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: action })
    });

    if (!res.ok) {
      const err = await res.json();
      showToast(err.detail || "2. Devre başlatılamadı!");
      resetSimButton();
      return;
    }

    const data = await res.json();
    const match = data.match;
    gameState = data.state;

    // 2. Devre Canlı Akışını Çalıştır (10 saniye: 45:00 -> 90:00)
    await runHalfAnimation(match, 46, 90, 10000);

    // Maç Bitti!
    finishMatch(match);

  } catch (e) {
    console.error(e);
    showToast("2. devre sırasında hata oluştu!");
    resetSimButton();
  }
}

function runHalfAnimation(matchData, startMin, endMin, durationMs) {
  return new Promise((resolve) => {
    const clockEl = document.getElementById("match-clock");
    const homeScoreEl = document.getElementById("match-home-score");
    const awayScoreEl = document.getElementById("match-away-score");
    const feed = document.getElementById("match-live-feed");
    const mistakeCountEl = document.getElementById("coach-mistake-count");

    const totalSteps = 20;
    const stepDuration = durationMs / totalSteps;
    let currentStep = 0;
    const emittedEvents = new Set();
    const sortedEvents = (matchData.events || []).filter(e => e.minute >= startMin && e.minute <= endMin).sort((a, b) => a.minute - b.minute);

    const intervalId = setInterval(() => {
      currentStep++;
      const progress = currentStep / totalSteps;
      const currentMinute = Math.min(endMin, Math.floor(startMin + progress * (endMin - startMin)));

      clockEl.innerText = `${currentMinute.toString().padStart(2, '0')}:00`;

      // Bu dakikaya kadar olan olayları bas
      sortedEvents.forEach((ev, idx) => {
        if (ev.minute <= currentMinute && !emittedEvents.has(idx)) {
          emittedEvents.add(idx);

          if (ev.home_score !== undefined && ev.away_score !== undefined) {
            homeScoreEl.innerText = ev.home_score;
            awayScoreEl.innerText = ev.away_score;
            homeScoreEl.classList.add("text-amber-300", "scale-110");
            awayScoreEl.classList.add("text-amber-300", "scale-110");
            setTimeout(() => {
              homeScoreEl.classList.remove("text-amber-300", "scale-110");
              awayScoreEl.classList.remove("text-amber-300", "scale-110");
            }, 600);
          }

          if (ev.type === "coach_mistake") {
            mistakeCountEl.innerText = (parseInt(mistakeCountEl.innerText || 0) + 1);
          }

          const isMyGoal = (ev.is_my_goal === true) || (ev.type === "goal_my");
          const isOppGoal = (ev.is_my_goal === false) || (ev.type === "goal_opp");

          const row = document.createElement("div");
          row.className = "p-1.5 rounded-lg text-[10px] font-medium border flex items-center gap-1.5 mb-1 transition-all duration-300";

          if (isMyGoal) {
            row.className += " bg-emerald-950/90 border-emerald-500/70 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.35)]";
            triggerGoalCelebration(ev, matchData);
          } else if (isOppGoal) {
            row.className += " bg-rose-950/90 border-rose-500/70 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.35)]";
          } else if (ev.type === "coach_action") {
            row.className += " bg-blue-950/80 border-blue-500/60 text-blue-200 font-bold";
          } else {
            row.className += " bg-slate-900 border-slate-800 text-slate-300";
          }

          row.innerHTML = `<span class="font-mono font-bold text-amber-400 bg-slate-900 px-1 py-0.2 rounded border border-slate-800">${ev.minute}'</span> <span>${ev.text}</span>`;
          feed.appendChild(row);
          feed.scrollTop = feed.scrollHeight;
        }
      });

      if (currentStep >= totalSteps) {
        clearInterval(intervalId);
        resolve();
      }
    }, stepDuration);
  });
}

function finishMatch(match) {
  const clockEl = document.getElementById("match-clock");
  clockEl.innerText = "90:00 (BİTTİ)";
  document.getElementById("match-home-score").innerText = match.home_score;
  document.getElementById("match-away-score").innerText = match.away_score;

  // Bitiş Düdüğü Mesajı
  const feed = document.getElementById("match-live-feed");
  const endRow = document.createElement("div");
  endRow.className = "p-2 rounded-lg text-[11px] font-bold bg-amber-500/10 border border-amber-500/40 text-amber-300 flex items-center justify-between mt-1";
  endRow.innerHTML = `<span>🏁 MAÇ SONA ERDİ: ${match.home_name} ${match.home_score} - ${match.away_score} ${match.away_name}</span> <span class="font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">${match.result}</span>`;
  feed.appendChild(endRow);
  feed.scrollTop = feed.scrollHeight;

  // Hoca Basın Açıklaması Kutusu
  const coachPressBox = document.getElementById("coach-press-box");
  const coachPressStatement = document.getElementById("coach-press-statement");
  if (coachPressBox && coachPressStatement && match.coach_press_statement) {
    coachPressBox.classList.remove("hidden");
    coachPressStatement.innerText = match.coach_press_statement;
  }

  // Oyuncu Reytingleri
  const ratingsBox = document.getElementById("match-ratings-box");
  const ratingsGrid = document.getElementById("match-ratings-grid");
  if (match.player_ratings && match.player_ratings.length > 0) {
    ratingsBox.classList.remove("hidden");
    ratingsGrid.innerHTML = "";
    match.player_ratings.forEach(p => {
      let rtgColor = "text-emerald-400 bg-emerald-950/80 border-emerald-700/60";
      if (p.rating < 6.4) rtgColor = "text-rose-400 bg-rose-950/80 border-rose-700/60";
      else if (p.rating < 7.3) rtgColor = "text-amber-400 bg-amber-950/80 border-amber-700/60";

      const item = document.createElement("div");
      item.className = "bg-slate-900/90 border border-slate-800 p-2 rounded-lg flex items-center justify-between";
      item.innerHTML = `
        <div class="flex items-center gap-1.5 truncate">
          <span class="text-[9px] font-bold px-1 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">${p.pos}</span>
          <span class="text-xs font-semibold text-white truncate max-w-[105px]">${p.name}</span>
          ${p.is_sub ? '<span class="text-[8px] text-blue-400 bg-blue-950 px-1 py-0.2 rounded border border-blue-800 font-semibold">YDK</span>' : ''}
          ${p.goals > 0 ? `<span class="text-[9px] font-black text-amber-400">⚽${p.goals > 1 ? p.goals : ''}</span>` : ''}
        </div>
        <span class="text-xs font-black font-mono px-1.5 py-0.5 rounded border ${rtgColor}">${p.rating.toFixed(1)}</span>
      `;
      ratingsGrid.appendChild(item);
    });
  }

  const matchIncome = (match.ticket_income || 0) + (match.store_income || 0);
  const incomeStr = matchIncome > 0 ? ` • Hasılat: +${formatMoney(matchIncome)}` : '';
  showToast(`🏁 Maç Bitti! Skor: ${match.home_score} - ${match.away_score} (${match.result})${incomeStr}`);

  document.getElementById("match-pre-panel").classList.add("hidden");
  document.getElementById("post-match-action").classList.remove("hidden");

  resetSimButton();
  renderUI();
}

function resetSimButton() {
  isMatchSimulating = false;
  const startBtn = document.getElementById("start-match-btn");
  if (startBtn) {
    startBtn.disabled = false;
    startBtn.classList.remove("opacity-60", "cursor-not-allowed");
    startBtn.innerHTML = `<i data-lucide="play" class="w-4 h-4 fill-white"></i> 1. DEVREYİ BAŞLAT (10s)`;
  }
  document.querySelectorAll(".press-opt-btn").forEach(b => b.disabled = false);
  lucide.createIcons();
}

function prepareNextMatch() {
  dismissGoalCelebration();
  if (gameState && gameState.season_finished) {
    showToast("🏆 Sezon tamamlandı! Kongre ve Kupa ekranına geçiliyor.");
    checkSeasonEndModal();
    return;
  }

  viewingFinishedMatch = false;

  document.getElementById("match-clock").innerText = "00:00";
  document.getElementById("match-home-score").innerText = "0";
  document.getElementById("match-away-score").innerText = "0";
  document.getElementById("coach-mistake-count").innerText = "0";
  document.getElementById("match-live-feed").innerHTML = '<div class="text-slate-500 italic text-center py-4">Maç başladığında önemli anlar burada listelenecek...</div>';
  document.getElementById("match-ratings-box").classList.add("hidden");
  document.getElementById("coach-press-box").classList.add("hidden");

  document.getElementById("post-match-action").classList.add("hidden");
  document.getElementById("match-pre-panel").classList.remove("hidden");

  renderUI();
  if (gameState) {
    showToast(`📅 ${gameState.week}. Hafta maçına odaklanıldı!`);
  }
}

// ==================== KAPTAN RAPORU & MAAŞ TALEP MODALI ====================
async function openCaptainReportModal() {
  try {
    const res = await fetch("/api/captain/report");
    const data = await res.json();

    document.getElementById("captain-name-title").innerText = `Kaptan: ${data.captain_name}`;
    document.getElementById("captain-harmony-badge").innerText = `Kadro Uyumu: %${data.squad_harmony}`;
    document.getElementById("captain-summary-text").innerText = `"${data.summary}"`;

    const list = document.getElementById("captain-wage-demands-list");
    list.innerHTML = "";

    if (!data.wage_demands || data.wage_demands.length === 0) {
      list.innerHTML = '<div class="text-slate-400 text-xs text-center py-3 italic">Şu anda maaş zammı talep eden oyuncu bulunmuyor.</div>';
    } else {
      data.wage_demands.forEach(p => {
        const item = document.createElement("div");
        item.className = "bg-slate-900 border border-slate-800 p-2.5 rounded-xl space-y-2";
        item.innerHTML = `
          <div class="flex justify-between items-center text-xs">
            <div>
              <span class="font-extrabold text-white">${p.name}</span>
              <span class="text-[9px] text-amber-400 font-bold ml-1">(${p.pos})</span>
              <div class="text-[10px] text-slate-400">Mevcut: ${formatMoney(p.current_wage)} • İstediği: <strong class="text-emerald-400">${formatMoney(p.demanded_wage)}</strong></div>
            </div>
            <span class="text-[9px] font-bold text-amber-300 bg-slate-800 px-1.5 py-0.5 rounded">${p.contract_years} Yıl Kaldı</span>
          </div>
          <div class="grid grid-cols-3 gap-1 pt-1">
            <button onclick="respondWageNegotiation('${p.name}', 'accept')" class="p-1 rounded bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 font-bold text-[9px]">
              Kabul Et (%30)
            </button>
            <button onclick="respondWageNegotiation('${p.name}', 'renew_2yr')" class="p-1 rounded bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-blue-300 font-bold text-[9px]">
              +2 Yıl Uzat (%15)
            </button>
            <button onclick="respondWageNegotiation('${p.name}', 'reject')" class="p-1 rounded bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-300 font-bold text-[9px]">
              Reddet
            </button>
          </div>
        `;
        list.appendChild(item);
      });
    }

    document.getElementById("modal-captain-report").classList.remove("hidden");
  } catch (e) {
    console.error(e);
    showToast("Kaptan raporu alınamadı!");
  }
}

function closeCaptainReportModal() {
  document.getElementById("modal-captain-report").classList.add("hidden");
}

async function respondWageNegotiation(playerName, decision) {
  try {
    const res = await fetch("/api/player/wage-negotiation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_name: playerName, decision: decision })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "İşlem başarısız!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
    openCaptainReportModal(); // Listeyi yenile
  } catch (e) {
    console.error(e);
  }
}

// ==================== HOCA VİZYONU MODALI ====================
function openCoachVisionModal() {
  document.getElementById("modal-coach-vision").classList.remove("hidden");
}

function closeCoachVisionModal() {
  document.getElementById("modal-coach-vision").classList.add("hidden");
}

async function submitCoachVision(focus) {
  try {
    const res = await fetch("/api/coach/future-vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vision_focus: focus })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "İşlem başarısız!");
      return;
    }
    closeCoachVisionModal();
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
  }
}

// ==================== TÜM LİG SQUAD BROWSER & KULÜPLER ARASI TRANSFER ====================
async function openLeagueScoutModal() {
  try {
    const res = await fetch("/api/teams/all-squads");
    allLeagueSquads = await res.json();

    const select = document.getElementById("scout-league-team-select");
    select.innerHTML = "";

    allLeagueSquads.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.innerText = `${t.name} (Güç: ${t.power}, Bütçe: ${formatMoney(t.budget)})`;
      select.appendChild(opt);
    });

    onScoutTeamChanged();
    document.getElementById("modal-league-scout").classList.remove("hidden");
  } catch (e) {
    console.error(e);
    showToast("Kulüp kadroları yüklenemedi!");
  }
}

function closeLeagueScoutModal() {
  document.getElementById("modal-league-scout").classList.add("hidden");
}

function onScoutTeamChanged() {
  const select = document.getElementById("scout-league-team-select");
  const selectedTeamId = select.value;
  const team = allLeagueSquads.find(t => t.id === selectedTeamId);
  const container = document.getElementById("league-scout-players-list");
  if (!container || !team) return;

  container.innerHTML = "";

  (team.squad || []).forEach(p => {
    const item = document.createElement("div");
    item.className = "bg-slate-900 border border-slate-800 p-2 rounded-xl flex items-center justify-between text-xs";
    const sk = p.skills || {};

    item.innerHTML = `
      <div class="truncate">
        <div class="font-extrabold text-white text-[11px] truncate flex items-center gap-1.5">
          <span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-amber-400">${p.pos}</span>
          <span>${p.name}</span>
          <span class="text-[9px] text-slate-400">(${p.age} yaş)</span>
        </div>
        <div class="text-[9px] text-slate-400 mt-0.5">
          Değer: <strong class="text-emerald-400">${formatMoney(p.val)}</strong> • Maaş: ${formatMoney(p.wage)} • Sözleşme: ${p.contract_years || 2} Yıl
        </div>
        <div class="text-[8px] text-slate-500 mt-0.5">
          Hız:${sk.pac || 75} Şut:${sk.sho || 75} Pas:${sk.pas || 75} Def:${sk.def || 75} Fiz:${sk.phy || 75}
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        <span class="text-xs font-black text-amber-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">${p.overall}</span>
        <button onclick="startClubNegotiation('${team.id}', '${p.name}', ${p.val}, '${p.pos}', ${p.overall})" class="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px]">
          Bonservis İste
        </button>
      </div>
    `;
    container.appendChild(item);
  });
}

function startClubNegotiation(teamId, playerName, playerVal, playerPos, playerOverall) {
  activeNegotiation = {
    teamId: teamId,
    playerName: playerName,
    playerVal: playerVal,
    bidFee: playerVal,
    playerWage: 15_000_000
  };

  document.getElementById("neg-player-name").innerText = playerName;
  document.getElementById("neg-player-details").innerText = `${playerPos} • ${playerOverall} Güç • Piyasa Değeri: ${formatMoney(playerVal)}`;
  document.getElementById("neg-club-bid-input").value = playerVal;

  document.getElementById("neg-step-club").classList.remove("hidden");
  document.getElementById("neg-step-player").classList.add("hidden");
  document.getElementById("modal-transfer-negotiate").classList.remove("hidden");
}

function closeNegotiationModal() {
  document.getElementById("modal-transfer-negotiate").classList.add("hidden");
}

async function submitClubNegotiation() {
  if (!activeNegotiation) return;
  const bidInput = document.getElementById("neg-club-bid-input");
  const bidFee = parseInt(bidInput.value) || activeNegotiation.playerVal;
  activeNegotiation.bidFee = bidFee;

  try {
    const res = await fetch("/api/transfer/negotiate-club", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_team_id: activeNegotiation.teamId,
        player_name: activeNegotiation.playerName,
        bid_fee: bidFee
      })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Kulüple anlaşılamadı!");
      return;
    }

    if (data.status === "club_accepted") {
      showToast("✅ Kulüp Başkanı bonservisi kabul etti!");
      document.getElementById("neg-step-club").classList.add("hidden");
      document.getElementById("neg-step-player").classList.remove("hidden");
      document.getElementById("neg-club-accepted-msg").innerText = data.message;
      document.getElementById("neg-player-wage-input").value = data.required_wage || 15_000_000;
      activeNegotiation.requiredWage = data.required_wage;
      activeNegotiation.signBonus = data.sign_bonus || 0;
    } else {
      showToast("❌ " + data.message);
      if (data.counter_fee) {
        document.getElementById("neg-club-bid-input").value = data.counter_fee;
      }
    }
  } catch (e) {
    console.error(e);
  }
}

async function submitPlayerSigning() {
  if (!activeNegotiation) return;
  const wageInput = document.getElementById("neg-player-wage-input");
  const offeredWage = parseInt(wageInput.value) || activeNegotiation.requiredWage;

  try {
    const res = await fetch("/api/transfer/sign-negotiated-player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_team_id: activeNegotiation.teamId,
        player_name: activeNegotiation.playerName,
        bid_fee: activeNegotiation.bidFee,
        offered_wage: offeredWage,
        sign_bonus: activeNegotiation.signBonus || 0
      })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Oyuncu sözleşmeyi imzalamadı!");
      return;
    }

    closeNegotiationModal();
    closeLeagueScoutModal();
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
  }
}

// ==================== TRANSFER GÜNÜ İLERLETME & GELEN TEKLİFLER ====================
async function advanceTransferDay() {
  try {
    const res = await fetch("/api/transfer/advance-day", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Gün ilerletilemedi!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
  }
}

function renderIncomingBids() {
  const box = document.getElementById("incoming-offers-box");
  const content = document.getElementById("incoming-offers-content");
  if (!box || !content || !gameState) return;

  const bids = gameState.incoming_bids || [];
  if (bids.length === 0) {
    box.classList.add("hidden");
    return;
  }

  box.classList.remove("hidden");
  content.innerHTML = "";

  bids.forEach(bid => {
    const item = document.createElement("div");
    item.className = "bg-slate-900 border border-slate-800 p-2.5 rounded-xl space-y-2";
    item.innerHTML = `
      <div class="flex justify-between items-center text-xs">
        <div>
          <span class="font-extrabold text-white">${bid.player_name}</span>
          <span class="text-[9px] text-amber-400 font-bold ml-1">(${bid.pos})</span>
          <div class="text-[10px] text-slate-300 mt-0.5">
            Talip: <strong class="text-amber-400">${bid.club}</strong> • Bonservis: <strong class="text-emerald-400">${formatMoney(bid.offer_val)}</strong>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-1.5 pt-1">
        <button onclick="respondIncomingBid('${bid.id}', 'accept')" class="py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]">
          Kabul Et (Sat)
        </button>
        <button onclick="respondIncomingBid('${bid.id}', 'counter')" class="py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px]">
          Pazarlık (+%25)
        </button>
        <button onclick="respondIncomingBid('${bid.id}', 'reject')" class="py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px]">
          Reddet
        </button>
      </div>
    `;
    content.appendChild(item);
  });
}

async function respondIncomingBid(bidId, action) {
  try {
    const res = await fetch("/api/transfer/respond-incoming-bid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bid_id: bidId, action: action })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "İşlem başarısız!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
  }
}

// ==================== TRANSFER PAZARI KATEGORİLERİ (DÜNYA YILDIZLARI & SERBESTLER) ====================
async function loadTransferMarket() {
  try {
    const res = await fetch("/api/transfer/market");
    marketData = await res.json();
    renderTransferMarket();
  } catch (e) {
    console.error(e);
  }
}

function switchTransferMarketCategory(cat) {
  currentTransferMarketCategory = cat;
  ["all", "stars", "free"].forEach(c => {
    const btn = document.getElementById("btn-tcat-" + c);
    if (btn) {
      btn.className = (c === cat)
        ? "flex-1 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-[10px] text-center"
        : "flex-1 py-1 rounded-lg bg-slate-800 text-slate-300 font-semibold text-[10px] text-center hover:bg-slate-700";
    }
  });
  renderTransferMarket();
}

function renderTransferMarket() {
  const container = document.getElementById("transfer-market-list");
  if (!container) return;
  container.innerHTML = "";

  let list = [];
  if (currentTransferMarketCategory === "all") {
    list = (marketData.scout_picks || []).map(p => ({ ...p, type: "scout" }));
  } else if (currentTransferMarketCategory === "stars") {
    list = (marketData.world_stars || []).map(p => ({ ...p, type: "superstar" }));
  } else {
    list = (marketData.free_agents || []).map(p => ({ ...p, type: "free" }));
  }

  list.forEach(p => {
    const item = document.createElement("div");
    item.className = "bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex flex-col gap-1.5 text-xs";
    const cost = (p.price || 0) + (p.salary || p.wage || 0);

    item.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <div class="font-bold text-white text-xs">${p.name} <span class="text-[10px] text-amber-400 font-semibold">(${p.pos}, ${p.age} yaş)</span></div>
          <div class="text-[9px] text-slate-400 mt-0.5">Bonservis: <strong>${formatMoney(p.price || 0)}</strong> • Maaş: ${formatMoney(p.salary || p.wage || 0)}</div>
        </div>
        <span class="text-[9px] font-bold text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">Güç/Pot: ${p.real_pot || p.overall || p.claimed_pot}</span>
      </div>
      ${p.desc ? `<p class="text-[9px] text-slate-300 italic">"${p.desc}"</p>` : ''}
      <button onclick="buyMarketPlayer('${p.name}', ${p.price || 0}, ${p.salary || p.wage || 10_000_000})" class="w-full py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px]">
        Transfer Et (${formatMoney(cost)})
      </button>
    `;
    container.appendChild(item);
  });
}

async function buyMarketPlayer(playerName, price, salary) {
  try {
    const res = await fetch("/api/transfer/sign-negotiated-player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        player_name: playerName,
        bid_fee: price,
        offered_wage: salary,
        sign_bonus: 0
      })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Transfer yapılamadı!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
  }
}

// ==================== SİYASET VE CUMHURBAŞKANLIĞI HİBE SİSTEMİ ====================
async function doPoliticsAction(actType) {
  try {
    const res = await fetch("/api/politics/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action_type: actType })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "İşlem yapılamadı!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
  }
}

async function requestPresidentialGrant() {
  if (!gameState) return;
  const pol = gameState.political_power || 50;

  if (pol < 50) {
    showToast("⚠️ Cumhurbaşkanlığı makamına başvuru için en az %50 Siyasi Nüfuz gereklidir!");
    return;
  }

  const confirmMsg = pol >= 90
    ? "🏛️ Siyasi gücünüz %90 üzerinde!\n\nCumhurbaşkanlığı makamından '35 DÖNÜM HAZİNE ARAZİSİ' hibe talebinde bulunmak istiyor musunuz? (%80 Kabul Şansı)"
    : "💰 Siyasi gücünüz %50-%89 arasında!\n\nCumhurbaşkanlığı Acil Kulüp Fonu'ndan '120.000.000 ₺ NAKİT HİBE' talebinde bulunmak istiyor musunuz? (%35 Kabul Şansı - Reddedilirse basına sızar!)";

  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch("/api/politics/presidential-grant", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Hibe talebi iletilemedi!");
      return;
    }

    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
  }
}

// ==================== SEZON SONU & HOCA ÖNERİLERİ ====================
function checkSeasonEndModal() {
  if (gameState.election_pending) {
    openElectionModal();
    return;
  }
  const modal = document.getElementById("modal-season-end");
  const title = document.getElementById("season-end-title");
  const desc = document.getElementById("season-end-desc");
  const reward = document.getElementById("season-end-reward");
  const recsContainer = document.getElementById("season-coach-recommendations");

  modal.classList.remove("hidden");

  if (gameState.season_result === "champion") {
    title.innerText = "🏆 SÜPER LİG ŞAMPİYONU!";
    desc.innerText = `${gameState.club_name} 34 haftalık maratonu ZİRVEDE bitirdi ve KUPA MÜZEMİZE GELDİ!`;
    reward.innerText = "Ödül: +100.000.000 ₺ Şampiyonluk Primi Kasaya Eklendi!";
  } else if (gameState.season_result === "europe") {
    title.innerText = "🌟 AVRUPA KUPALARI BİLETİ!";
    desc.innerText = `${gameState.club_name} ilk 4'te bitirerek Avrupa kupalarına katılmaya hak kazandı!`;
    reward.innerText = "Ödül: +45.000.000 ₺ Başarı Ödülü!";
  } else if (gameState.season_result === "relegated") {
    title.innerText = "⚠️ KÜME DÜŞME TEHLİKESİ!";
    desc.innerText = "Takım ligin dibinde bitirdi. Yönetim kurulu acil toplantı talep ediyor!";
    reward.innerText = "Kongre Güveni: %20'ye düştü!";
  } else {
    title.innerText = "SEZON TAMAMLANDI";
    desc.innerText = "34 haftalık lig maratonu sona erdi. Orta sıralarda tamamladınız.";
    reward.innerText = "Ödül: +15.000.000 ₺ Lig Katılım Payı";
  }

  // Hoca Sezon Sonu Transfer Önerilerini Render Et
  if (recsContainer) {
    recsContainer.innerHTML = "";
    const recs = gameState.coach_recommendations || [
      { name: "Mateo 'El Nino' Silva", pos: "FORVET", val: 50_000_000, overall: 88, reason: "Bitiricilik sorunumuzu çözecek dünya çapında forvet." },
      { name: "Lamine Diallo", pos: "STP", val: 38_000_000, overall: 85, reason: "Defanstaki hava topları zaafımızı kapatacak kule stoper." },
      { name: "Achraf Hakimi", pos: "SAĞ BEK", val: 125_000_000, overall: 88, reason: "Sağ kanadımızı Şampiyonlar Ligi seviyesine çıkaracak yıldız." }
    ];

    recs.forEach(r => {
      const card = document.createElement("div");
      card.className = "bg-slate-950 p-2 rounded-lg border border-slate-800 text-[10px]";
      card.innerHTML = `
        <div class="flex justify-between items-center">
          <span class="font-bold text-white">${r.name} <span class="text-amber-400 font-semibold">(${r.pos})</span></span>
          <span class="font-mono text-emerald-400 font-bold">${formatMoney(r.val)}</span>
        </div>
        <div class="text-[9px] text-slate-400 italic mt-0.5">"${r.reason}"</div>
      `;
      recsContainer.appendChild(card);
    });
  }
}

async function startNextSeason() {
  const modal = document.getElementById("modal-season-end");
  if (modal) modal.classList.add("hidden");

  try {
    const res = await fetch("/api/season/next", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      await fetchState();
      switchTab("office");
      showToast("Yeni sezon fikstürü çekildi!");
      return;
    }

    showToast("🎉 34 Haftalık Yeni Sezon Fikstürü Hazırlandı!");
    gameState = data;
    renderUI();
    switchTab("office");
  } catch (e) {
    console.error(e);
    await fetchState();
    switchTab("office");
  }
}

// ==================== KONGRE SEÇİMİ ====================
function openElectionModal() {
  const modal = document.getElementById("modal-election");
  const resultBox = document.getElementById("election-result-box");
  resultBox.classList.add("hidden");
  resultBox.innerHTML = "";
  modal.classList.remove("hidden");
}

function closeElectionModal() {
  document.getElementById("modal-election").classList.add("hidden");
}

async function runElection(promise) {
  try {
    const res = await fetch("/api/election/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promise: promise })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Seçim yapılamadı!");
      return;
    }

    gameState = data.state;
    const result = data.result;
    const box = document.getElementById("election-result-box");
    box.classList.remove("hidden");

    if (result.won) {
      box.innerHTML = `
        <div class="text-center space-y-2">
          <div class="text-sm font-black text-emerald-400">🎉 GÜVEN TAZELEDİNİZ!</div>
          <div class="text-xs text-slate-200">${result.msg}</div>
          <div class="flex items-center justify-center gap-4 text-xs font-bold py-1.5 bg-slate-800 rounded-lg">
            <span class="text-emerald-400">Siz: %${result.user_votes}</span>
            <span class="text-rose-400">Muhalefet: %${result.opp_votes}</span>
          </div>
          <button onclick="closeElectionModal(); checkSeasonEndModal();" class="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs mt-2">
            Kupa & Ödül Törenine Geç →
          </button>
        </div>
      `;
    } else {
      box.innerHTML = `
        <div class="text-center space-y-2">
          <div class="text-sm font-black text-rose-400">❌ SEÇİMİ KAYBETTİNİZ!</div>
          <div class="text-xs text-slate-200">${result.msg}</div>
          <button onclick="closeElectionModal(); openTeamSelectModal();" class="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs mt-2">
            Yeni Kulüp Seç
          </button>
        </div>
      `;
    }
    renderUI();
  } catch (e) {
    console.error(e);
  }
}

// ==================== TAKIM SEÇİMİ VE İSTİFA ====================
async function loadTeamsList() {
  try {
    const res = await fetch("/api/teams");
    teamsList = await res.json();
    renderTeamSelectList();
  } catch (e) {
    console.error(e);
  }
}

function openTeamSelectModal() {
  document.getElementById("modal-team-select").classList.remove("hidden");
  if (!teamsList || teamsList.length === 0) loadTeamsList();
}

function renderTeamSelectList() {
  const container = document.getElementById("team-select-list");
  if (!container) return;
  container.innerHTML = "";

  teamsList.forEach(t => {
    const card = document.createElement("div");
    card.className = "bg-slate-900 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between hover:border-amber-500 hover:bg-slate-800/60 cursor-pointer transition-all";
    card.onclick = () => selectTeamAndStart(t.id);
    card.innerHTML = `
      <div class="flex items-center gap-2.5">
        <div class="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 p-1 flex items-center justify-center flex-shrink-0">
          ${t.logo ? `<img src="${t.logo}?v=3" alt="${t.name}" class="w-full h-full object-contain" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />` : ''}
          <span class="font-black text-xs text-amber-400 ${t.logo ? 'hidden' : ''}">${t.short}</span>
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <span class="font-extrabold text-xs text-white">${t.name}</span>
            ${t.is_big ? '<span class="text-[8px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">BÜYÜK</span>' : ''}
          </div>
          <div class="text-[9px] text-slate-400 mt-0.5">
            TD: <span class="text-slate-200 font-semibold">${t.coach_name}</span> • Bütçe: <strong class="text-emerald-400">${formatMoney(t.budget)}</strong>
          </div>
        </div>
      </div>
      <div class="text-right flex-shrink-0">
        <span class="text-xs font-black text-amber-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">${t.power}</span>
        <div class="text-[8px] text-slate-400 mt-0.5 font-semibold">GÜÇ</div>
      </div>
    `;
    container.appendChild(card);
  });
}

async function selectTeamAndStart(teamId) {
  try {
    const res = await fetch("/api/start-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: teamId })
    });
    const data = await res.json();
    gameState = data;
    viewingFinishedMatch = false;
    document.getElementById("modal-team-select").classList.add("hidden");
    showToast(`🏆 ${data.club_name} kulübünün yeni başkanı oldunuz!`);
    renderUI();
    switchTab("office");
  } catch (e) {
    console.error(e);
  }
}

async function promptResign() {
  if (!gameState || !gameState.club_name) return;
  if (!confirm(`${gameState.club_name} kulübü başkanlığından istifa etmek istediğinize emin misiniz?`)) return;

  try {
    const res = await fetch("/api/resign", { method: "POST" });
    const data = await res.json();
    gameState = data.state;
    showToast("İstifanız kabul edildi. Yeni kulübünüzü seçebilirsiniz.");
    renderUI();
    openTeamSelectModal();
  } catch (e) {
    console.error(e);
  }
}

// ==================== HOCA DİYALOĞU & SCOUT KOVMA ====================
function openCoachModal() {
  document.getElementById("modal-coach-dialog").classList.remove("hidden");
}
function closeCoachModal() {
  document.getElementById("modal-coach-dialog").classList.add("hidden");
}
async function submitCoachDialog(action) {
  try {
    const res = await fetch("/api/coach/dialog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: action })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "İşlem başarısız!");
      return;
    }
    closeCoachModal();
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
  }
}

async function fireScout() {
  if (confirm("Scout ekibini 2M ₺ tazminat ödeyerek kovmak istiyor musunuz?")) {
    try {
      const res = await fetch("/api/scout/fire", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.detail || "İşlem başarısız!");
        return;
      }
      showToast(data.message);
      gameState = data.state;
      renderUI();
    } catch (e) {
      console.error(e);
    }
  }
}

async function loadScoutCandidates() {
  try {
    const res = await fetch("/api/scout/candidates");
    const candidates = await res.json();
    const container = document.getElementById("scout-candidates-list");
    if (!container) return;
    container.innerHTML = "";

    candidates.forEach(sc => {
      const item = document.createElement("div");
      item.className = "bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center justify-between text-xs";
      item.innerHTML = `
        <div>
          <div class="font-bold text-white text-[11px]">${sc.name} <span class="text-[9px] text-blue-400">(${sc.role})</span></div>
          <div class="text-[9px] text-slate-400">Uzmanlık: ${sc.region} • Maaş: ${formatMoney(sc.salary)}</div>
        </div>
        <button onclick="hireScout('${sc.id}')" class="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold">
          İşe Al (%${sc.rating})
        </button>
      `;
      container.appendChild(item);
    });
  } catch (e) {
    console.error(e);
  }
}

async function hireScout(scoutId) {
  try {
    const res = await fetch("/api/scout/hire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scout_id: scoutId })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "İşlem başarısız!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
  }
}

// ==================== SPONSORLUKLAR & YERALTI ====================
async function loadSponsors() {
  try {
    const res = await fetch("/api/sponsors/available");
    const sponsors = await res.json();
    const container = document.getElementById("available-sponsors-list");
    if (!container) return;
    container.innerHTML = "";

    sponsors.forEach(sp => {
      const card = document.createElement("div");
      card.className = "bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between text-xs";
      card.innerHTML = `
        <div>
          <div class="font-bold text-white text-xs">${sp.name}</div>
          <div class="text-[9px] text-slate-400">${sp.desc}</div>
        </div>
        <button onclick="signSponsor('${sp.id}')" class="px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px]">
          İmzala (+${formatMoney(sp.income_season)})
        </button>
      `;
      container.appendChild(card);
    });
  } catch (e) {
    console.error(e);
  }
}

async function signSponsor(spId) {
  try {
    const res = await fetch("/api/sponsors/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sponsor_id: spId })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Sponsor imzalanamadı!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
  }
}

async function makeUndergroundDeal(dealType) {
  try {
    const res = await fetch("/api/underground/deal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deal_type: dealType })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "İşlem başarısız!");
      return;
    }
    showToast("🕶️ " + data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
  }
}

async function startRealEstateProject(projType) {
  try {
    const res = await fetch("/api/realestate/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_type: projType })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Proje başlatılamadı!");
      return;
    }
    showToast("🏗️ Proje başlatıldı!");
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
  }
}
