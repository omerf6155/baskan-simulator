// ==================== CİHAZ BAZLI BAĞIMSIZ SESSION & NETWORK ====================
function normalizeNameSlug(name) {
  if (!name) return "baskan";
  const trMap = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'c', 'Ğ': 'g', 'İ': 'i', 'Ö': 'o', 'Ş': 's', 'Ü': 'u'
  };
  let slug = name.split('').map(ch => trMap[ch] || ch).join('').toLowerCase();
  slug = slug.replace(/[^a-z0-9_-]/g, '');
  return slug.slice(0, 32) || "baskan";
}

function getSessionId() {
  // Kullanıcı adı varsa onu kullan, yoksa sabit "player1" — böylece
  // tarayıcı kapanıp açılsa da aynı kayıt dosyasına gidilir.
  const customUser = localStorage.getItem("baskan_username");
  if (customUser && customUser.trim()) {
    const slug = normalizeNameSlug(customUser.trim());
    const userSid = "user_" + slug;
    localStorage.setItem("baskan_session_id", userSid);
    return userSid;
  }
  // localStorage'da sabit bir SID varsa onu kullan
  let sid = localStorage.getItem("baskan_session_id");
  if (!sid) {
    // İlk kez: sabit "player1" SID ata (random değil!)
    sid = "player1";
    localStorage.setItem("baskan_session_id", sid);
  }
  return sid;
}

async function apiFetch(url, options = {}) {
  const sid = getSessionId();
  options = options || {};
  options.headers = options.headers || {};
  if (options.headers instanceof Headers) {
    options.headers.set("X-Session-Id", sid);
  } else {
    options.headers["X-Session-Id"] = sid;
  }
  const sep = url.includes("?") ? "&" : "?";
  const urlWithSession = `${url}${sep}session=${encodeURIComponent(sid)}`;
  return fetch(urlWithSession, options);
}

// ==================== SES & ARKA PLAN MÜZİK MOTORU (BGM & SFX) ====================
let audioCtx = null;
let masterBgmGain = null;
let masterSfxGain = null;
let isBgmPlaying = localStorage.getItem("baskan_bgm_playing") === "true";
let currentBgmTrack = localStorage.getItem("baskan_bgm_track") || "track1.mp3";
let bgmVolume = parseFloat(localStorage.getItem("baskan_bgm_vol") || "0.35");
let sfxVolume = parseFloat(localStorage.getItem("baskan_sfx_vol") || "0.75");
let sunoAudio = null;
let sunoAudioSource = null;

function initAudioSystem() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass();
    } catch (e) {
      console.warn("AudioContext oluşturulamadı:", e);
      return;
    }

    try {
      masterBgmGain = audioCtx.createGain();
      masterBgmGain.gain.setValueAtTime(bgmVolume, audioCtx.currentTime);
      masterBgmGain.connect(audioCtx.destination);
    } catch (e) {
      console.warn("masterBgmGain hatası:", e);
    }

    try {
      masterSfxGain = audioCtx.createGain();
      masterSfxGain.gain.setValueAtTime(sfxVolume, audioCtx.currentTime);
      masterSfxGain.connect(audioCtx.destination);
    } catch (e) {
      console.warn("masterSfxGain hatası:", e);
    }
  }

  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
}

function ensureSunoAudio() {
  initAudioSystem();
  if (!sunoAudio) {
    sunoAudio = new Audio();
    sunoAudio.loop = true;
    sunoAudio.preload = "auto";
  }
  if (audioCtx && masterBgmGain && !sunoAudioSource) {
    try {
      sunoAudioSource = audioCtx.createMediaElementSource(sunoAudio);
      sunoAudioSource.connect(masterBgmGain);
    } catch (e) {
      console.warn("MediaElementSource bağlantısı:", e);
    }
  }
  return sunoAudio;
}

function startBgm() {
  initAudioSystem();
  ensureSunoAudio();

  isBgmPlaying = true;
  localStorage.setItem("baskan_bgm_playing", "true");
  updateMusicUIButtons(true);

  applyBgmVolume(bgmVolume * 100);

  let trackFile = currentBgmTrack;
  if (!trackFile.endsWith(".mp3")) {
    trackFile = trackFile.replace("suno_", "") + ".mp3";
  }

  const musicUrl = `/static/music/${trackFile}`;
  const fallbackUrl = `/static/${trackFile}`;

  const curSrc = sunoAudio.getAttribute("src") || sunoAudio.src || "";
  if (!curSrc.includes(trackFile)) {
    sunoAudio.src = musicUrl;
  }

  const playPromise = sunoAudio.play();
  if (playPromise !== undefined) {
    playPromise.catch(err => {
      console.warn("Müzik yolu deneniyor (fallback):", err);
      sunoAudio.src = fallbackUrl;
      sunoAudio.play().catch(e => {
        console.warn("Müzik dosyası çalınamadı:", e);
        stopBgm();
      });
    });
  }
}

function stopBgm() {
  isBgmPlaying = false;
  localStorage.setItem("baskan_bgm_playing", "false");
  if (sunoAudio) {
    sunoAudio.pause();
  }
  updateMusicUIButtons(false);
}

function toggleMusicPlayback() {
  initAudioSystem();
  if (isBgmPlaying) {
    stopBgm();
    showToast("Arka plan müziği duraklatıldı 🔇");
  } else {
    startBgm();
    showToast("Arka plan müziği çalıyor 🎵");
  }
}

function updateMusicUIButtons(playing) {
  const hBtn = document.getElementById("header-music-btn");
  const hIcon = document.getElementById("header-music-icon");
  const hLbl = document.getElementById("header-music-label");
  const mBtn = document.getElementById("settings-music-toggle-btn");

  if (playing) {
    if (hBtn) hBtn.className = "text-[9px] text-amber-400 font-bold flex items-center gap-1 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/40 animate-pulse";
    if (hIcon) hIcon.innerText = "🎵";
    if (hLbl) hLbl.innerText = "Müzik Açık";
    if (mBtn) {
      mBtn.innerText = "Çalıyor 🎵";
      mBtn.className = "px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-[10px] shadow-sm";
    }
  } else {
    if (hBtn) hBtn.className = "text-[9px] text-slate-400 font-bold flex items-center gap-1 bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700";
    if (hIcon) hIcon.innerText = "🔇";
    if (hLbl) hLbl.innerText = "Müzik";
    if (mBtn) {
      mBtn.innerText = "Kapalı 🔇";
      mBtn.className = "px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-bold text-[10px] shadow-sm";
    }
  }
}

function applyBgmVolume(val) {
  const num = Math.max(0, Math.min(100, parseFloat(val) !== undefined ? parseFloat(val) : 35));
  bgmVolume = num / 100;
  localStorage.setItem("baskan_bgm_vol", bgmVolume.toString());

  const txt = document.getElementById("bgm-volume-txt");
  if (txt) txt.innerText = `${Math.round(num)}%`;
  const slider = document.getElementById("bgm-volume-slider");
  if (slider && parseFloat(slider.value) !== num) slider.value = num;

  initAudioSystem();

  if (masterBgmGain && audioCtx) {
    try {
      masterBgmGain.gain.setValueAtTime(bgmVolume, audioCtx.currentTime);
    } catch (e) {
      try { masterBgmGain.gain.value = bgmVolume; } catch (e2) {}
    }
  }

  if (sunoAudio) {
    try {
      if (bgmVolume === 0) {
        sunoAudio.volume = 0;
      } else if (sunoAudioSource) {
        // Web Audio GainNode ses kontrolünü üstlendiği için audio elementini 1.0 tutuyoruz (çift kısılmayı önler)
        sunoAudio.volume = 1.0;
      } else {
        sunoAudio.volume = bgmVolume;
      }
    } catch (e) {}
  }
}

function onBgmVolumeChange(val) {
  applyBgmVolume(val);
}

function onSfxVolumeChange(val) {
  const num = Math.max(0, Math.min(100, parseFloat(val) !== undefined ? parseFloat(val) : 75));
  sfxVolume = num / 100;
  localStorage.setItem("baskan_sfx_vol", sfxVolume.toString());
  const txt = document.getElementById("sfx-volume-txt");
  if (txt) txt.innerText = `${Math.round(num)}%`;
  const slider = document.getElementById("sfx-volume-slider");
  if (slider && parseFloat(slider.value) !== num) slider.value = num;

  initAudioSystem();

  if (masterSfxGain && audioCtx) {
    try {
      masterSfxGain.gain.setValueAtTime(sfxVolume, audioCtx.currentTime);
    } catch (e) {
      try { masterSfxGain.gain.value = sfxVolume; } catch (e2) {}
    }
  }
}

function onBgmTrackChange(val) {
  currentBgmTrack = val;
  localStorage.setItem("baskan_bgm_track", val);
  if (isBgmPlaying) {
    let trackFile = currentBgmTrack;
    if (!trackFile.endsWith(".mp3")) {
      trackFile = trackFile.replace("suno_", "") + ".mp3";
    }
    if (sunoAudio) {
      sunoAudio.src = `/static/music/${trackFile}`;
      sunoAudio.play().catch(e => {
        sunoAudio.src = `/static/${trackFile}`;
        sunoAudio.play().catch(() => stopBgm());
      });
    } else {
      startBgm();
    }
  }
}

function openSettingsModal() {
  const modal = document.getElementById("modal-settings");
  if (!modal) return;
  const bgmSlider = document.getElementById("bgm-volume-slider");
  const bgmTxt = document.getElementById("bgm-volume-txt");
  const sfxSlider = document.getElementById("sfx-volume-slider");
  const sfxTxt = document.getElementById("sfx-volume-txt");
  const trackSel = document.getElementById("bgm-track-select");

  if (bgmSlider) bgmSlider.value = Math.round(bgmVolume * 100);
  if (bgmTxt) bgmTxt.innerText = `${Math.round(bgmVolume * 100)}%`;
  if (sfxSlider) sfxSlider.value = Math.round(sfxVolume * 100);
  if (sfxTxt) sfxTxt.innerText = `${Math.round(sfxVolume * 100)}%`;
  if (trackSel) trackSel.value = currentBgmTrack;

  updateMusicUIButtons(isBgmPlaying);

  // Tema seçimi vurgularını yenile
  const currentTheme = localStorage.getItem("baskan_selected_theme") || "default";
  AVAILABLE_THEMES.forEach(t => {
    const btn = document.getElementById("theme-btn-" + t.id);
    if (btn) {
      if (t.id === currentTheme) {
        btn.classList.add("ring-2", "ring-amber-400", "scale-[1.02]");
      } else {
        btn.classList.remove("ring-2", "ring-amber-400", "scale-[1.02]");
      }
    }
  });

  modal.classList.remove("hidden");
}

function closeSettingsModal() {
  const modal = document.getElementById("modal-settings");
  if (modal) modal.classList.add("hidden");
}

async function resetCareerPrompt() {
  if (!confirm("⚠️ Mevcut kariyerinizi sıfırlamak ve tüm eski kayıtları silmek istediğinize emin misiniz? Yeni bir kulüp seçerek sıfırdan başlayacaksınız.")) {
    return;
  }
  closeSettingsModal();
  try {
    // Hem yerel cihaz hafızasını hem sunucudaki kayıtları tamamen temizle
    localStorage.removeItem("baskan_local_career_save");
    localStorage.removeItem("baskan_local_career_time");
    localStorage.removeItem("baskan_story_tutorial_seen");

    const res = await apiFetch("/api/save/reset-all", { method: "POST" });
    if (res.ok) {
      showToast("Tüm kayıtlar silindi! Yeni takımınızı seçin 🔄");
      await fetchState();
      openTeamSelectModal();
    } else {
      showToast("Kariyer sıfırlanamadı!");
    }
  } catch (err) {
    console.error(err);
    showToast("Sunucu hatası!");
  }
}

async function swapSquadPlayers(idx1, idx2) {
  try {
    const res = await apiFetch("/api/squad/swap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index1: idx1, index2: idx2 })
    });
    if (res.ok) {
      const data = await res.json();
      gameState = data.state;
      renderUI();
      showToast("Kadro güncellendi 🔄");
    } else {
      const err = await res.json();
      showToast(err.detail || "Kadro değişikliği uygulanamadı!");
    }
  } catch (e) {
    console.error(e);
    showToast("Sunucu bağlantı hatası!");
  }
}

// ==================== FIFA POZİSYON STANDARTLARI & YARDIMCILARI ====================
function isGoalkeeper(pos) {
  if (!pos) return false;
  const p = String(pos).toUpperCase().trim();
  return p === "GK" || p === "KL" || p.startsWith("KALE") || p.startsWith("GK");
}

function shortenPosition(pos) {
  if (!pos) return "CM";
  const p = String(pos).toUpperCase().trim();
  if (p.includes("KL") || p === "GK" || p.includes("KALE")) return "GK";
  if (p.includes("STP") || p === "CB" || p.includes("STOPER")) return "CB";
  if (p.includes("SOL BEK") || p.includes("SLB") || p === "LB") return "LB";
  if ((p.includes("SA") && p.includes("BEK")) || p.includes("SGB") || p === "RB" || p.includes("SB")) return "RB";
  if (p === "CDM" || p === "DMF" || p.includes("DOS") || (p.includes("N L") && p.includes("BERO"))) return "DMF";
  if (p === "CAM" || p === "AMF" || p.includes("OOS") || p.includes("FORVET ARK") || p.includes("ON NUMARA")) return "AMF";
  if (p.includes("MERKEZ") || p.includes("ORTA SAHA") || p === "CM" || p === "OS") return "CM";
  if ((p.includes("SA") && p.includes("KANAT")) || p.includes("SGK") || p === "RW" || p === "SK") return "RW";
  if ((p.includes("SOL") && p.includes("KANAT")) || p.includes("SLK") || p === "LW") return "LW";
  if (p.includes("SANTRAF") || p.includes("SANTRAT") || p === "ST" || p === "CF") return "ST";
  if (p.includes("FORVET") && !p.includes("ARK")) return "ST";
  if (p.includes("KANAT")) return "RW";
  return p.substring(0, 3);
}

function getPosCategory(pos) {
  const p = shortenPosition(pos);
  if (p === "GK") return "GK";
  if (["LB", "CB", "RB"].includes(p)) return "DEF";
  if (["DMF", "CM", "AMF"].includes(p)) return "MID";
  return "FWD";
}

function getFifaPosBadgeHtml(pos) {
  const p = shortenPosition(pos);
  let colorClass = "bg-slate-800 text-slate-300 border-slate-700";
  if (p === "GK") {
    colorClass = "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm";
  } else if (["LB", "CB", "RB"].includes(p)) {
    colorClass = "bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sm";
  } else if (["DMF", "CM", "AMF"].includes(p)) {
    colorClass = "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm";
  } else if (["LW", "RW", "ST"].includes(p)) {
    colorClass = "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm";
  }
  return `<span class="px-1.5 py-0.5 rounded font-black text-[9px] tracking-wide border ${colorClass}">${p}</span>`;
}

function playWhistleSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(3200, now + 0.07);
    osc.frequency.exponentialRampToValueAtTime(2600, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(3100, now + 0.22);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.28);
  } catch (e) {
    // AudioContext might require user gesture
  }
}

// ==================== OYUNCU DEĞİŞİKLİĞİ & İLK 11 YÖNETİMİ ====================
let activeSubSourceIdx = null;
let activeSubIsStarter = false;

function openSubstitutionModal(idx, isStarter) {
  if (!gameState || !gameState.squad || gameState.squad.length <= idx) return;
  activeSubSourceIdx = idx;
  activeSubIsStarter = isStarter;

  const player = gameState.squad[idx];
  const modal = document.getElementById("modal-player-substitution");
  const titleEl = document.getElementById("sub-modal-title");
  const sourceCardEl = document.getElementById("sub-source-player-card");
  const headingEl = document.getElementById("sub-candidates-heading");
  const listEl = document.getElementById("sub-candidates-list");

  if (!modal || !sourceCardEl || !listEl) return;

  const isGK = isGoalkeeper(player.pos);
  titleEl.innerText = isStarter ? "İLK 11'DEN YEDEĞE AL" : "YEDEKTEN İLK 11'E AL";

  // Kaynak oyuncu kartı
  sourceCardEl.innerHTML = `
    <div class="flex items-center gap-2.5 truncate">
      ${getFifaPosBadgeHtml(player.pos)}
      <div class="truncate">
        <div class="text-xs font-bold text-white flex items-center gap-1.5 truncate">
          <span>${player.name}</span>
          <span class="text-[9px] ${isStarter ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30' : 'text-slate-400 bg-slate-800'} px-1.5 py-0.2 rounded font-semibold">
            ${isStarter ? '⭐ İlk 11' : '🪑 Yedek'}
          </span>
        </div>
        <div class="text-[10px] text-slate-400 mt-0.5">
          ${player.age} yaş • Güç: <strong class="text-amber-300 font-bold">${player.overall}</strong> • Maaş: ${formatMoney(player.wage)}
        </div>
      </div>
    </div>
    <div class="text-right">
      <span class="text-[10px] text-rose-400 font-bold bg-rose-950/60 border border-rose-800/40 px-2 py-1 rounded">
        ${isStarter ? 'Kenara Geçecek' : 'Sahaya Girecek'}
      </span>
    </div>
  `;

  headingEl.innerText = isStarter
    ? `Yerine Sahaya Girecek ${isGK ? 'Yedek Kaleci' : 'Yedek Oyuncu'} Seçin:`
    : `İlk 11'de Kimin Yerine Oyuna Girecek?`;

  listEl.innerHTML = "";

  // Adayları belirle
  // Kural: İlk 11'de ASLA 2 Kaleci olamaz! Mutlaka tam 1 Kaleci olmalıdır!
  let candidates = [];
  if (isStarter) {
    // İlk 11'deki oyuncu kenara alınıyor, yerine YEDEKLERDEN biri girecek
    const benchPlayers = gameState.squad.slice(11).map((p, i) => ({ player: p, actualIdx: 11 + i }));
    if (isGK) {
      // Kaleci çıkıyorsa SADECE yedek kaleciler girebilir!
      candidates = benchPlayers.filter(c => isGoalkeeper(c.player.pos));
    } else {
      // Saha içi oyuncusu çıkıyorsa SADECE saha içi yedekler girebilir (Kaleci YASAK!)
      candidates = benchPlayers.filter(c => !isGoalkeeper(c.player.pos));
    }
  } else {
    // Yedek oyuncu ilk 11'e alınıyor, İLK 11'DEN birinin yerine geçecek
    const starterPlayers = gameState.squad.slice(0, 11).map((p, i) => ({ player: p, actualIdx: i }));
    if (isGK) {
      // Yedek kaleci ilk 11'e giriyorsa SADECE ilk 11'deki kalecinin yerine geçebilir!
      candidates = starterPlayers.filter(c => isGoalkeeper(c.player.pos));
    } else {
      // Saha içi yedek giriyorsa SADECE ilk 11'deki saha içi oyuncularının yerine geçebilir (Kaleci ÇIKARILAMAZ!)
      candidates = starterPlayers.filter(c => !isGoalkeeper(c.player.pos));
    }
  }

  if (candidates.length === 0) {
    listEl.innerHTML = `
      <div class="p-3 text-center bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400 text-xs">
        ${isGK ? '⚠️ Yedek kulübesinde başka kaleci bulunmuyor. İlk 11 kalecisiz kalamaz!' : 'Uygun mevkide oyuncu bulunamadı.'}
      </div>
    `;
  } else {
    candidates.forEach(c => {
      const p = c.player;
      const targetIdx = c.actualIdx;
      const cItem = document.createElement("div");
      cItem.className = "p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex items-center justify-between transition-all";
      cItem.innerHTML = `
        <div class="flex items-center gap-2 truncate">
          ${getFifaPosBadgeHtml(p.pos)}
          <div class="truncate">
            <div class="font-bold text-white text-[11px] truncate flex items-center gap-1">
              <span>${p.name}</span>
              ${p.is_foreign !== false ? '<span class="text-[8px] text-sky-400 font-bold">🌐 YBN</span>' : '<span class="text-[8px] text-rose-400 font-bold">🇹🇷 TR</span>'}
            </div>
            <div class="text-[9px] text-slate-400">
              ${p.age} yaş • Güç: <strong class="text-white font-bold">${p.overall}</strong> • Sözleşme: ${p.contract_years !== undefined ? p.contract_years : 2} Yıl
            </div>
          </div>
        </div>
        <button onclick="performSubstitution(${targetIdx})" class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 transition-all shadow-sm flex-shrink-0">
          <i data-lucide="check" class="w-3 h-3"></i>
          <span>${isStarter ? 'Sahaya Al' : 'Bununla Değiştir'}</span>
        </button>
      `;
      listEl.appendChild(cItem);
    });
  }

  if (window.lucide) window.lucide.createIcons();
  modal.classList.remove("hidden");
}

function closeSubstitutionModal() {
  const modal = document.getElementById("modal-player-substitution");
  if (modal) modal.classList.add("hidden");
  activeSubSourceIdx = null;
}

async function performSubstitution(targetIdx) {
  if (activeSubSourceIdx === null || targetIdx === null) return;
  const sIdx = activeSubSourceIdx;
  closeSubstitutionModal();
  await swapSquadPlayers(sIdx, targetIdx);
}

// Oyuncuyu İlk 11'den tek tıkla doğrudan yedeğe çekme modalını açar
function benchStarterPlayer(idx) {
  openSubstitutionModal(idx, true);
}

// Yedek oyuncuyu İlk 11'e alma modalını açar
function promoteBenchPlayer(idx) {
  openSubstitutionModal(idx, false);
}

// Teknik Direktörün İdeal İlk 11'i ve Yabancı Kuralını Otomatik Belirlemesi
async function autoPickSquadByCoach() {
  try {
    playWhistleSound();
    const res = await apiFetch("/api/squad/auto-pick", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Kadro otomatik belirlenemedi!");
      return;
    }
    gameState = data.state;
    renderUI();
    showToast("👔 Teknik Direktör ideal 11'i belirledi! (Yabancı kuralı gözetildi)");
  } catch (e) {
    console.error(e);
    showToast("Hoca kadroyu belirleyemedi!");
  }
}

// Scout Adayları Sürgülü Paneli Aç/Kapa
function toggleScoutCandidatesDrawer() {
  const drawer = document.getElementById("scout-candidates-drawer");
  const chevron = document.getElementById("scout-drawer-chevron");
  if (!drawer) return;
  const isHidden = drawer.classList.contains("hidden");
  if (isHidden) {
    drawer.classList.remove("hidden");
    if (chevron) chevron.innerText = "▴";
    loadScoutCandidates();
  } else {
    drawer.classList.add("hidden");
    if (chevron) chevron.innerText = "▾";
  }
}

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

// ==================== GÖRSEL TEMA YÖNETİMİ (IMPECCABLE BESPOKE) ====================
function initAppTheme() {
  // Eski tema kalıntılarını temizle ve tek kusursuz yönetici temasını etkin kıl
  document.body.classList.remove("theme-cyberpunk", "theme-gold", "theme-emerald", "theme-arcade");
  localStorage.setItem("baskan_selected_theme", "default");
}

function setAppTheme(themeId = "default", notify = false) {
  document.body.classList.remove("theme-cyberpunk", "theme-gold", "theme-emerald", "theme-arcade");
  localStorage.setItem("baskan_selected_theme", "default");
  if (notify) {
    showToast("✨ Büyük Başkan Özel Arayüzü Aktif");
  }
}

function cycleAppTheme() {
  // Çoklu tema kaldırıldı, tek kusursuz modern tasarım korundu
  setAppTheme("default", false);
}

// ==================== BAŞLANGIÇTA ÇALIŞ ====================
document.addEventListener("DOMContentLoaded", () => {
  initAppTheme();
  fetchState();
  loadTeamsList();
  loadScoutCandidates();
  loadSponsors();
  loadTransferMarket();
  lucide.createIcons();

  const unlockAudio = () => {
    initAudioSystem();
    if (localStorage.getItem("baskan_bgm_playing") === "true" && !isBgmPlaying) {
      startBgm();
    }
    document.removeEventListener("click", unlockAudio);
    document.removeEventListener("touchstart", unlockAudio);
  };
  document.addEventListener("click", unlockAudio);
  document.addEventListener("touchstart", unlockAudio);
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

  if (tabId === "finances") {
    loadSponsors();
    loadSponsorOffers();
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
let _tutorialShownThisSession = false;

function persistLocalCareerState(state) {
  if (!state || !state.is_started) return;
  try {
    localStorage.setItem("baskan_local_career_save", JSON.stringify(state));
    localStorage.setItem("baskan_local_career_time", Date.now().toString());
  } catch (e) {
    console.warn("Yerel kayıt saklanamadı:", e);
  }
}

async function fetchState() {
  try {
    const res = await apiFetch("/api/state");
    gameState = await res.json();

    // RENDER VEYA SUNUCU YENİDEN BAŞLAMA KORUMASI:
    // Eğer sunucuda kayıt bulunamadıysa/başlamadıysa ama tarayıcının yerel hafızasında kayıtlı aktif kariyer varsa:
    const localSaved = localStorage.getItem("baskan_local_career_save");
    if ((!gameState || !gameState.is_started) && localSaved) {
      try {
        const parsedLocal = JSON.parse(localSaved);
        if (parsedLocal && parsedLocal.is_started && parsedLocal.team_id) {
          console.log("Sunucu sıfırlanmış, yerel kayıt sunucuya aktarılıyor...");
          const syncRes = await apiFetch("/api/save/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ state: parsedLocal })
          });
          if (syncRes.ok) {
            gameState = await syncRes.json();
            showToast(`💾 Kayıtlı kariyeriniz otomatik yüklendi! (${gameState.club_name} • ${gameState.season}. Sezon ${gameState.week}. Hafta)`);
          }
        }
      } catch (err) {
        console.warn("Otomatik senkronizasyon hatası:", err);
      }
    }

    if (gameState && gameState.is_started) {
      persistLocalCareerState(gameState);
    }

    renderUI();
    // Tutorial: Sadece kullanıcı daha önce görmediyse aç
    const tutorialSeen = localStorage.getItem("baskan_story_tutorial_seen");
    if (!tutorialSeen && !_tutorialShownThisSession && gameState && gameState.is_started) {
      _tutorialShownThisSession = true;
      setTimeout(() => openStoryTutorial(), 800);
    }

    // Günlük Giriş Ödülü Bildirimi
    checkDailyRewardClaim();
  } catch (e) {
    console.error("State alinamadi", e);
  }
}

function renderUI() {
  if (!gameState) return;

  if (gameState.is_started) {
    persistLocalCareerState(gameState);
  }

  // Başlangıçta kulüp seçilmemişse seçim modalını zorunlu aç
  if (!gameState.is_started) {
    openTeamSelectModal();
  }
  // NOT: Tutorial renderUI'dan değil, sayfa ilk yüklendiğinde fetchState tamamlanınca açılır

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
  const userSettingSpan = document.getElementById("settings-current-username");
  if (userSettingSpan) {
    userSettingSpan.innerText = gameState.president_name || localStorage.getItem("baskan_username") || "Ömer Başkan";
  }
  document.getElementById("header-season").innerText = gameState.season;
  document.getElementById("header-week").innerText = Math.min(gameState.week, gameState.max_weeks || 34);

  // Kasa & Metrikler
  document.getElementById("bar-budget-txt").innerText = formatMoney(gameState.budget);
  document.getElementById("bar-fan-txt").innerText = `%${gameState.fan_trust}`;
  document.getElementById("bar-board-txt").innerText = `%${gameState.board_trust}`;
  document.getElementById("bar-pol-txt").innerText = `%${gameState.political_power}`;
  const polCard = document.getElementById("pol-card-score");
  if (polCard) polCard.innerText = `%${gameState.political_power}`;

  // Bankalar Birliği Borç Paneli UI
  const bankDebtEl = document.getElementById("bank-debt-display");
  const bankIntEl = document.getElementById("bank-weekly-interest");
  const bankStatusEl = document.getElementById("bank-sanction-status");
  if (bankDebtEl) {
    const curDebt = gameState.debt || 0;
    bankDebtEl.innerText = formatMoney(curDebt) + " Borç";
    if (bankIntEl) bankIntEl.innerText = formatMoney(Math.floor(curDebt * 0.003)) + " / Hafta";
    if (bankStatusEl) {
      const bc = gameState.bank_consortium || {};
      const sLevel = bc.sanction_level || 0;
      if (sLevel === 0) {
        bankStatusEl.className = "font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded text-[9px]";
        bankStatusEl.innerText = "Normal (Temiz)";
      } else if (sLevel === 1) {
        bankStatusEl.className = "font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.2 rounded text-[9px]";
        bankStatusEl.innerText = "İHTAR: Transfer Yasağı!";
      } else if (sLevel === 2) {
        bankStatusEl.className = "font-bold text-orange-400 bg-orange-950/60 border border-orange-800/40 px-1.5 py-0.2 rounded text-[9px]";
        bankStatusEl.innerText = "AĞIR: %40 Gelir Blokesi!";
      } else {
        bankStatusEl.className = "font-bold text-rose-400 bg-rose-950/60 border border-rose-800/40 px-1.5 py-0.2 rounded text-[9px]";
        bankStatusEl.innerText = "KRİTİK: TFF -3 Puan Cezası!";
      }
    }
  }

  // Rakip Kulüpten Şike / Teşvik Teklifi Kutusu UI
  const bribeBox = document.getElementById("incoming-bribe-box");
  if (bribeBox) {
    if (gameState.incoming_bribe_offer) {
      bribeBox.classList.remove("hidden");
      const bo = gameState.incoming_bribe_offer;
      const bTitle = document.getElementById("bribe-offer-title");
      const bDesc = document.getElementById("bribe-offer-desc");
      if (bTitle) bTitle.innerText = bo.title || "Karanlık Çanta Teklifi";
      if (bDesc) bDesc.innerText = bo.desc || "";
    } else {
      bribeBox.classList.add("hidden");
    }
  }

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

  // Hoca Özeti & Fotoğrafları
  const isCoachVacant = !gameState.coach || gameState.coach_vacant;
  const coachPhoto = (!isCoachVacant && gameState.coach.photo) ? gameState.coach.photo : "/static/coach_senol_gunes.png";
  const officeCoachPhotoEl = document.getElementById("office-coach-photo");
  if (officeCoachPhotoEl) officeCoachPhotoEl.src = coachPhoto;
  const squadCoachPhotoEl = document.getElementById("squad-coach-photo");
  if (squadCoachPhotoEl) squadCoachPhotoEl.src = coachPhoto;
  const briefingCoachPhotoEl = document.getElementById("briefing-coach-photo");
  if (briefingCoachPhotoEl) briefingCoachPhotoEl.src = coachPhoto;
  const dialogCoachPhotoEl = document.getElementById("dialog-coach-photo");
  if (dialogCoachPhotoEl) dialogCoachPhotoEl.src = coachPhoto;
  const visionCoachPhotoEl = document.getElementById("vision-coach-photo");
  if (visionCoachPhotoEl) visionCoachPhotoEl.src = coachPhoto;

  const coachName = isCoachVacant ? "Koltuk Boş (TD Aranıyor)" : gameState.coach.name;
  const coachStyle = isCoachVacant ? "Kulübün başında bir teknik direktör bulunmuyor" : gameState.coach.style;
  const coachSalary = isCoachVacant ? "0 ₺ / Sezon" : `${formatMoney(gameState.coach.salary)} / Sezon`;

  const briefingNameEl = document.getElementById("briefing-coach-name");
  if (briefingNameEl) briefingNameEl.innerText = coachName;
  const dialogNameEl = document.getElementById("dialog-coach-name");
  if (dialogNameEl) dialogNameEl.innerText = coachName;
  const visionNameEl = document.getElementById("vision-coach-name");
  if (visionNameEl) visionNameEl.innerText = coachName;

  document.getElementById("office-coach-name").innerText = coachName;
  document.getElementById("office-coach-style").innerText = coachStyle;
  document.getElementById("squad-coach-name").innerText = coachName;
  document.getElementById("squad-coach-style").innerText = coachStyle;
  document.getElementById("squad-coach-salary").innerText = coachSalary;
  document.getElementById("coach-attr-attack").innerText = isCoachVacant ? 60 : (gameState.coach.attack || 70);
  document.getElementById("coach-attr-defense").innerText = isCoachVacant ? 60 : (gameState.coach.defense || 70);
  document.getElementById("coach-attr-youth").innerText = isCoachVacant ? 50 : (gameState.coach.youth || 50);
  document.getElementById("coach-attr-moral").innerText = isCoachVacant ? "%50" : `%${gameState.coach.moral}`;

  // Ofis ve Kadro Hoca Kartı Aksiyon Butonları
  const officeBtnContainer = document.getElementById("office-coach-btn-container");
  if (officeBtnContainer) {
    if (isCoachVacant) {
      officeBtnContainer.innerHTML = `
        <button onclick="openSelectCoachModal()" class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-lg animate-pulse">
          👔 Yeni TD Seç
        </button>
      `;
    } else {
      officeBtnContainer.innerHTML = `
        <button onclick="openCoachModal()" class="px-2.5 py-1.5 rounded bg-emerald-600/30 text-[11px] font-bold text-emerald-300 border border-emerald-500/50 hover:bg-emerald-600/50">
          Görüş
        </button>
      `;
    }
  }

  const squadActionsGrid = document.getElementById("squad-coach-actions-grid");
  if (squadActionsGrid) {
    if (isCoachVacant) {
      squadActionsGrid.innerHTML = `
        <button onclick="openSelectCoachModal()" class="col-span-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg animate-pulse">
          👔 Yeni Teknik Direktör İmzala (Aday Listesi)
        </button>
      `;
    } else {
      squadActionsGrid.innerHTML = `
        <button onclick="openCoachModal()" id="btn-squad-coach-talk" class="py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-200 font-bold text-[10px] flex items-center justify-center gap-1">
          <i data-lucide="message-square" class="w-3 h-3 text-emerald-400"></i> Hoca ile Konuş
        </button>
        <button onclick="openCoachVisionModal()" id="btn-squad-coach-vision" class="py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-blue-200 font-bold text-[10px] flex items-center justify-center gap-1">
          <i data-lucide="sparkles" class="w-3 h-3 text-blue-400"></i> Hoca Vizyonu
        </button>
        <button onclick="openCaptainReportModal()" id="btn-squad-coach-captain" class="py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[10px] flex items-center justify-center gap-1">
          <i data-lucide="shield" class="w-3 h-3 text-amber-400"></i> Kaptan & Zam
        </button>
      `;
    }
  }

  // Hoca Karakteristik Özellikleri (Traits)
  const traits = (!isCoachVacant && gameState.coach && gameState.coach.traits) ? gameState.coach.traits : [];
  const renderTraitsHtml = (list) => {
    if (isCoachVacant) return '<span class="text-[9px] text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">⚠️ Teknik Direktör Aranıyor</span>';
    if (!list || list.length === 0) return '<span class="text-[9px] text-slate-500 italic">Genel Taktisyen</span>';
    return list.map(t => `
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30" title="${t.desc}">
        <span>${t.icon || '⭐'}</span>
        <span>${t.name}</span>
      </span>
    `).join('');
  };
  const officeTraitsEl = document.getElementById("office-coach-traits");
  if (officeTraitsEl) officeTraitsEl.innerHTML = renderTraitsHtml(traits);
  const squadTraitsEl = document.getElementById("squad-coach-traits");
  if (squadTraitsEl) squadTraitsEl.innerHTML = renderTraitsHtml(traits);

  // Transfer Penceresi Gün Kontrolü
  const curDay = gameState.transfer_day || 1;
  const maxDays = gameState.transfer_max_days || 7;
  const winTitle = document.getElementById("transfer-window-title");
  const winDesc = document.getElementById("transfer-window-desc");
  const officeWin = document.getElementById("office-window-status");

  if (gameState.transfer_window_open !== false) {
    winTitle.innerText = `Transfer Penceresi: Açık (Gün ${curDay}/${maxDays})`;
    winDesc.innerText = `Kulüpler arası bonservis ve serbest oyuncu pazarlıkları aktif.`;
    officeWin.innerText = `Pencere AÇIK (${curDay}/${maxDays})`;
    officeWin.className = "text-xs font-bold text-emerald-400";
  } else {
    const nextWindowMsg = (gameState.week < 18)
      ? `Süper Lig maçları oynanıyor (Hafta ${gameState.week}/34). Kış/Ara Transfer Penceresi 18. Hafta açılacaktır.`
      : (gameState.week < 22)
      ? `Ara transfer dönemi kapandı. Sezon sonuna kadar transfer kapalıdır.`
      : `Pencereler kapandı. Sezon sonuna kadar kadrolar donduruldu.`;
    winTitle.innerText = "🛑 Transfer Penceresi: KAPALI (Lig Maçları)";
    winDesc.innerText = nextWindowMsg;
    officeWin.innerText = `KAPALI (Hf: ${gameState.week}/34)`;
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

  // Gayrimenkul & Arsa UI
  renderRealEstateUI();

  // Taktik Skill Ağacı TP Rozeti
  const tpBadge = document.getElementById("badge-mastery-pts");
  if (tpBadge && gameState.tactical_skills) {
    tpBadge.innerText = `${gameState.tactical_skills.mastery_points || 0} TP`;
  }

  // Kulüp Scout Şefi Bilgisi
  const scoutNameEl = document.getElementById("scout-current-name");
  const scoutRatingEl = document.getElementById("scout-current-rating");
  const currentScout = gameState.scout || gameState.club_scout;
  if (currentScout) {
    if (scoutNameEl) scoutNameEl.innerText = currentScout.name || "Cemil Kaya";
    if (scoutRatingEl) scoutRatingEl.innerText = `%${currentScout.rating || 75}`;
  }
  renderUndergroundBetState();
  loadUndergroundOdds();
  loadFanSocialFeed();
  loadCoachRecommendations();
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
function renderPosLineHeader(title, count, icon, colorClass = "text-slate-400 border-slate-800") {
  const div = document.createElement("div");
  div.className = `flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${colorClass} bg-slate-900/40 border-b border-t border-slate-800/60 my-1 rounded`;
  div.innerHTML = `
    <span class="flex items-center gap-1.5"><span>${icon}</span> <span>${title}</span></span>
    <span class="text-[9px] opacity-75 font-semibold">${count} Oyuncu</span>
  `;
  return div;
}

function renderSquadPlayerCard(p, idx, isStarter) {
  const card = document.createElement("div");
  card.className = `p-2 rounded-lg border flex items-center justify-between text-xs transition-all ${
    isStarter ? "bg-slate-900/90 border-slate-700/80" : "bg-slate-950/70 border-slate-800/60 opacity-85"
  }`;

  const sk = p.skills || {};
  const contractYears = p.contract_years !== undefined ? p.contract_years : 2;
  const isInjured = (p.injured_weeks || 0) > 0;
  const isSuspended = (p.suspended_weeks || 0) > 0;
  const isForeign = p.is_foreign !== false;

  const actionBtn = isStarter
    ? `<button onclick="benchStarterPlayer(${idx})" title="Yedek kulübesine çek" class="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-[9px] font-bold flex items-center gap-1 transition-all">
         <span>🪑</span> <span class="hidden xs:inline">Yedeğe Al</span>
       </button>`
    : `<button onclick="promoteBenchPlayer(${idx})" title="İlk 11 maç kadrosuna al" class="px-2 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 text-[9px] font-bold flex items-center gap-1 transition-all">
         <span>⭐</span> <span class="hidden xs:inline">11'e Al</span>
       </button>`;

  const potVal = p.potential || Math.min(94, p.overall + Math.max(3, (27 - (p.age || 24)) * 2));
  const isYouth = (p.age || 24) < 26;

  const stamVal = p.stamina !== undefined ? p.stamina : 100;
  let stamColor = "text-emerald-400 bg-emerald-950/70 border-emerald-700/50";
  if (stamVal < 60) stamColor = "text-rose-400 bg-rose-950/70 border-rose-700/50 animate-pulse";
  else if (stamVal < 80) stamColor = "text-amber-400 bg-amber-950/70 border-amber-700/50";

  const mins = p.minutes_played || 0;
  const matches = p.matches_played || 0;
  const avgRtg = (p.avg_rating && p.avg_rating > 0) ? p.avg_rating.toFixed(1) : "-";
  const safeName = p.name.replace(/'/g, "\\'");

  card.innerHTML = `
    <div class="flex items-center gap-2 truncate">
      ${getFifaPosBadgeHtml(p.pos)}
      <div class="truncate">
        <div class="font-bold text-white text-[11px] truncate flex items-center gap-1.5">
          <span>${p.name}</span>
          ${idx === 0 && !isGoalkeeper(p.pos) ? '<span class="text-[8px] bg-amber-500 text-black px-1 rounded font-black">KAPTAN</span>' : ''}
          ${isForeign 
            ? '<span class="text-[8px] bg-sky-950 text-sky-300 border border-sky-600/40 px-1 py-0.2 rounded font-bold" title="Yabancı Oyuncu">🌐 YBN</span>' 
            : '<span class="text-[8px] bg-rose-950 text-rose-300 border border-rose-600/40 px-1 py-0.2 rounded font-bold" title="Yerli Oyuncu">🇹🇷 TR</span>'}
          ${isYouth ? `<span class="text-[8px] bg-cyan-950 text-cyan-300 border border-cyan-500/50 px-1 py-0.2 rounded font-bold" title="Genç Yetenek Potansiyeli">⚡ POT: ${potVal}</span>` : ''}
          <span class="text-[8px] px-1 py-0.2 rounded border font-black ${stamColor}" title="Kondisyon / Dayanıklılık">⚡ %${stamVal}</span>
          ${isInjured ? `<span class="text-[8px] bg-red-950 text-red-300 border border-red-500/60 px-1 py-0.2 rounded font-black animate-pulse">🩹 Sakat (${p.injured_weeks} Hf)</span>` : ''}
          ${isSuspended ? `<span class="text-[8px] bg-amber-950 text-amber-300 border border-amber-500/60 px-1 py-0.2 rounded font-black animate-pulse">🔴 Cezalı (${p.suspended_weeks} Hf)</span>` : ''}
          ${(p.yellow_cards || 0) > 0 ? `<span class="text-[8px] bg-yellow-950 text-yellow-300 border border-yellow-600/40 px-1 py-0.2 rounded font-bold">${p.yellow_cards}🟨</span>` : ''}
        </div>
        <div class="text-[9px] text-slate-400">
          ${p.age} yaş • Sözleşme: <strong class="text-amber-300">${contractYears} Yıl</strong> • Maaş: ${formatMoney(p.wage)}
        </div>
        <div class="text-[9px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
          <span>⏱️ <strong class="text-white font-mono">${mins}</strong> dk (${matches} maç)</span>
          <span>⭐ Ort: <strong class="${(p.avg_rating || 0) >= 7.0 ? 'text-emerald-400' : 'text-amber-400'} font-mono">${avgRtg}</strong></span>
          ${!isStarter ? `
            <button onclick="terminatePlayerContract('${safeName}')" class="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800/60 text-[8px] font-bold hover:bg-rose-900 transition-all flex items-center gap-0.5" title="Sözleşmeyi tazminat ödeyerek feshet">
              <span>❌</span> <span>Feshet</span>
            </button>
          ` : ''}
          ${!isStarter && p.overall >= 78 && mins < 90 && (gameState.week || 1) >= 2 ? `
            <button onclick="confrontCoachAboutPlayer('${safeName}')" class="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-700/60 text-[8px] font-black hover:bg-amber-900 transition-all flex items-center gap-0.5" title="Teknik Direktöre bu oyuncunun neden oynamadığını sor!">
              <span>🗣️</span> <span>Hesap Sor</span>
            </button>
          ` : ''}
        </div>
      </div>
    </div>
    <div class="text-right flex items-center gap-2 flex-shrink-0">
      ${actionBtn}
      <div class="text-[9px] text-slate-400 hidden sm:block">
        Hız:${sk.pac || 75} Şut:${sk.sho || 75}
      </div>
      <span class="text-xs font-black ${isStarter ? 'text-amber-400 bg-slate-800 border-slate-700' : 'text-slate-400 bg-slate-900 border-slate-800'} px-2 py-0.5 rounded border">
        ${p.overall}
      </span>
    </div>
  `;
  return card;
}

function renderSquadList() {
  const container = document.getElementById("squad-players-list");
  if (!container || !gameState || !gameState.squad) return;
  container.innerHTML = "";

  document.getElementById("squad-player-count").innerText = gameState.squad.length;

  const starters = gameState.squad.slice(0, 11).map((p, i) => ({ player: p, actualIdx: i }));
  const bench = gameState.squad.slice(11).map((p, i) => ({ player: p, actualIdx: 11 + i }));
  const foreignCount = starters.filter(item => item.player.is_foreign !== false).length;

  // Yabancı Kuralı Bilgi / Uyarı Başlığı (Süper Lig: İlk 11'de en fazla 8 yabancı)
  const banner = document.createElement("div");
  banner.className = `p-2 mb-2 rounded-xl border flex items-center justify-between text-[11px] ${
    foreignCount > 8
      ? "bg-red-950/70 border-red-600/70 text-red-200"
      : "bg-slate-900/80 border-slate-800 text-slate-300"
  }`;
  banner.innerHTML = `
    <div class="flex items-center gap-1.5">
      <span class="text-xs">🌐</span>
      <span>İlk 11 Yabancı Kuralı: <strong class="${foreignCount > 8 ? 'text-red-400 font-black' : 'text-emerald-400 font-bold'}">${foreignCount}/8 Yabancı</strong></span>
    </div>
    ${
      foreignCount > 8
        ? '<span class="text-[9px] bg-red-700 text-white font-black px-2 py-0.5 rounded animate-pulse">4M ₺ CEZA TEHLİKESİ!</span>'
        : '<span class="text-[9px] text-emerald-400 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">Kurala Uygun ✓</span>'
    }
  `;
  container.appendChild(banner);

  // 1. Grup: ⭐ İLK 11 (MAÇ KADROSU)
  const startersHeader = document.createElement("div");
  startersHeader.className = "flex items-center justify-between px-2.5 py-2 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-2 shadow-sm";
  startersHeader.innerHTML = `
    <span class="flex items-center gap-1.5"><span>⭐</span> <span>MAÇ KADROSU (İLK 11)</span></span>
    <span class="text-[9px] text-amber-300/80 font-bold bg-amber-500/20 px-2 py-0.5 rounded-full">11 Oyuncu</span>
  `;
  container.appendChild(startersHeader);

  // İlk 11 Hatları: Kaleci -> Defans -> Orta Saha -> Forvet
  const sGk = starters.filter(item => isGoalkeeper(item.player.pos));
  const sDef = starters.filter(item => !isGoalkeeper(item.player.pos) && ["LB", "CB", "RB"].includes(shortenPosition(item.player.pos)));
  const sMid = starters.filter(item => !isGoalkeeper(item.player.pos) && ["DMF", "CM", "AMF"].includes(shortenPosition(item.player.pos)));
  const sFwd = starters.filter(item => !isGoalkeeper(item.player.pos) && ["LW", "RW", "ST"].includes(shortenPosition(item.player.pos)));
  const sOther = starters.filter(item => !sGk.includes(item) && !sDef.includes(item) && !sMid.includes(item) && !sFwd.includes(item));

  if (sGk.length > 0) {
    container.appendChild(renderPosLineHeader("Kaleci", sGk.length, "🧤", "text-amber-400"));
    sGk.forEach(item => container.appendChild(renderSquadPlayerCard(item.player, item.actualIdx, true)));
  }
  if (sDef.length > 0) {
    container.appendChild(renderPosLineHeader("Defans Hattı", sDef.length, "🛡️", "text-sky-400"));
    sDef.forEach(item => container.appendChild(renderSquadPlayerCard(item.player, item.actualIdx, true)));
  }
  if (sMid.length > 0) {
    container.appendChild(renderPosLineHeader("Orta Saha Hattı", sMid.length, "⚙️", "text-emerald-400"));
    sMid.forEach(item => container.appendChild(renderSquadPlayerCard(item.player, item.actualIdx, true)));
  }
  if (sFwd.length > 0) {
    container.appendChild(renderPosLineHeader("Forvet & Hücum Hattı", sFwd.length, "🎯", "text-rose-400"));
    sFwd.forEach(item => container.appendChild(renderSquadPlayerCard(item.player, item.actualIdx, true)));
  }
  if (sOther.length > 0) {
    sOther.forEach(item => container.appendChild(renderSquadPlayerCard(item.player, item.actualIdx, true)));
  }

  // 2. Grup: 🪑 YEDEKLER & REZERVLER
  if (bench.length > 0) {
    const benchHeader = document.createElement("div");
    benchHeader.className = "flex items-center justify-between px-2.5 py-2 text-[11px] font-bold text-slate-300 bg-slate-800/80 border border-slate-700/80 rounded-xl mt-4 mb-2 shadow-sm";
    benchHeader.innerHTML = `
      <span class="flex items-center gap-1.5"><span>🪑</span> <span>YEDEKLER & REZERV KADRO</span></span>
      <span class="text-[9px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded-full">${bench.length} Oyuncu</span>
    `;
    container.appendChild(benchHeader);

    const bGk = bench.filter(item => isGoalkeeper(item.player.pos));
    const bDef = bench.filter(item => !isGoalkeeper(item.player.pos) && ["LB", "CB", "RB"].includes(shortenPosition(item.player.pos)));
    const bMid = bench.filter(item => !isGoalkeeper(item.player.pos) && ["DMF", "CM", "AMF"].includes(shortenPosition(item.player.pos)));
    const bFwd = bench.filter(item => !isGoalkeeper(item.player.pos) && ["LW", "RW", "ST"].includes(shortenPosition(item.player.pos)));
    const bOther = bench.filter(item => !bGk.includes(item) && !bDef.includes(item) && !bMid.includes(item) && !bFwd.includes(item));

    if (bGk.length > 0) {
      container.appendChild(renderPosLineHeader("Yedek Kaleci", bGk.length, "🧤", "text-amber-400"));
      bGk.forEach(item => container.appendChild(renderSquadPlayerCard(item.player, item.actualIdx, false)));
    }
    if (bDef.length > 0) {
      container.appendChild(renderPosLineHeader("Yedek Defans", bDef.length, "🛡️", "text-sky-400"));
      bDef.forEach(item => container.appendChild(renderSquadPlayerCard(item.player, item.actualIdx, false)));
    }
    if (bMid.length > 0) {
      container.appendChild(renderPosLineHeader("Yedek Orta Saha", bMid.length, "⚙️", "text-emerald-400"));
      bMid.forEach(item => container.appendChild(renderSquadPlayerCard(item.player, item.actualIdx, false)));
    }
    if (bFwd.length > 0) {
      container.appendChild(renderPosLineHeader("Yedek Forvet", bFwd.length, "🎯", "text-rose-400"));
      bFwd.forEach(item => container.appendChild(renderSquadPlayerCard(item.player, item.actualIdx, false)));
    }
    if (bOther.length > 0) {
      bOther.forEach(item => container.appendChild(renderSquadPlayerCard(item.player, item.actualIdx, false)));
    }
  }
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
  const ticketEl = document.getElementById("fin-ticket-val");
  const storeEl = document.getElementById("fin-store-val");
  const tvEl = document.getElementById("fin-tv-val");
  const sponsorEl = document.getElementById("fin-sponsor-val");
  const wageEl = document.getElementById("fin-wage-val");
  const facilityEl = document.getElementById("fin-facility-val");
  const staffEl = document.getElementById("fin-staff-val");
  const debtEl = document.getElementById("fin-debt-val");
  const travelEl = document.getElementById("fin-travel-val");
  const netEl = document.getElementById("fin-net-change");

  if (ticketEl) ticketEl.innerText = formatMoney(fin.last_ticket_income || 0);
  if (storeEl) storeEl.innerText = formatMoney(fin.last_store_income || 0);
  if (tvEl) tvEl.innerText = formatMoney(fin.last_tv_income || 2_500_000);
  if (sponsorEl) sponsorEl.innerText = formatMoney(fin.last_sponsor_income || 0);
  if (wageEl) wageEl.innerText = formatMoney(fin.last_wage_expense || 0);
  if (facilityEl) facilityEl.innerText = formatMoney(fin.last_facility_expense || 2_500_000);
  if (staffEl) staffEl.innerText = formatMoney(fin.last_staff_expense || 1_800_000);
  if (debtEl) debtEl.innerText = formatMoney(fin.last_debt_interest || 600_000);

  const curFix = (gameState.fixtures || []).find(f => f.week === gameState.week);
  const isAway = curFix && !curFix.is_home;
  if (travelEl) travelEl.innerText = isAway ? "1.4M ₺" : "0 ₺";

  const net = (fin.last_net_income !== undefined) 
    ? fin.last_net_income 
    : ((fin.last_ticket_income || 0) + (fin.last_store_income || 0) + (fin.last_tv_income || 2_500_000) + (fin.last_sponsor_income || 0)) - (fin.last_wage_expense || 0) - 2_500_000 - 1_800_000 - 600_000 - (isAway ? 1_400_000 : 0);

  if (netEl) {
    netEl.innerText = (net >= 0 ? "+" : "") + formatMoney(net);
    netEl.className = net >= 0 ? "text-xs font-bold text-emerald-400" : "text-xs font-bold text-rose-400";
  }
}

// ==================== GOOOL KUTLAMASI & TARAFTAR SESİ ====================
let celebrationTimeout = null;
let fireworksAnimationId = null;

function playStadiumGoalSound() {
  try {
    initAudioSystem();
    if (!audioCtx) return;
    if (audioCtx.state === "suspended") audioCtx.resume();
    const ctx = audioCtx;

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
    subGain.connect(masterSfxGain || ctx.destination);
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
      gain.connect(masterSfxGain || ctx.destination);

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
    crowdGain.connect(masterSfxGain || ctx.destination);

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
  const banner = document.getElementById("goal-floating-banner");
  const scorerEl = document.getElementById("mini-goal-scorer");
  const detailEl = document.getElementById("mini-goal-detail");
  const scoreEl = document.getElementById("mini-goal-score");

  if (!banner) return;

  let scorerName = ev.scorer || "Golcümüz";
  if (!ev.scorer && ev.text) {
    const m = ev.text.match(/GOOOOL!\s+([^(]+)/);
    if (m) scorerName = m[1].trim();
  }

  if (scorerEl) scorerEl.innerText = scorerName;
  if (detailEl) detailEl.innerText = `${ev.minute}' • ${gameState ? gameState.club_name : 'Gol'}`;
  if (scoreEl) scoreEl.innerText = (ev.home_score !== undefined && ev.away_score !== undefined) ? `${ev.home_score} - ${ev.away_score}` : "GOL!";

  banner.classList.remove("hidden");
  setTimeout(() => {
    banner.classList.remove("-translate-y-12", "opacity-0");
    banner.classList.add("translate-y-0", "opacity-100");
  }, 20);

  playStadiumGoalSound();

  if (celebrationTimeout) clearTimeout(celebrationTimeout);
  celebrationTimeout = setTimeout(() => dismissGoalCelebration(), 2000);
}

function dismissGoalCelebration() {
  const banner = document.getElementById("goal-floating-banner");
  if (!banner) return;
  if (celebrationTimeout) clearTimeout(celebrationTimeout);

  banner.classList.remove("translate-y-0", "opacity-100");
  banner.classList.add("-translate-y-12", "opacity-0");

  setTimeout(() => {
    banner.classList.add("hidden");
  }, 300);
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
  resetMatchStatsDisplay();

  const feed = document.getElementById("match-live-feed");
  feed.innerHTML = `
    <div class="p-1.5 rounded-lg bg-emerald-950/70 border border-emerald-600/50 text-emerald-200 text-[11px] font-semibold flex items-center justify-between">
      <span>📢 Hakem düdüğü çaldı, 1. Devre başladı!</span>
      <span class="font-mono text-[9px] text-amber-400 bg-slate-900 px-1 py-0.2 rounded border border-slate-800 animate-pulse">1. YARI (10s)</span>
    </div>
  `;

  try {
    const res = await apiFetch("/api/match/half1", {
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
    const res = await apiFetch("/api/match/half2", {
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

function resetMatchStatsDisplay() {
  const posHomeEl = document.getElementById("stat-pos-home");
  const posAwayEl = document.getElementById("stat-pos-away");
  const posBarEl = document.getElementById("stat-pos-bar");
  const shotsHomeEl = document.getElementById("stat-shots-home");
  const shotsOppEl = document.getElementById("stat-shots-opp");
  const xgHomeEl = document.getElementById("stat-xg-home");
  const xgAwayEl = document.getElementById("stat-xg-away");

  if (posHomeEl) posHomeEl.innerText = "50%";
  if (posAwayEl) posAwayEl.innerText = "50%";
  if (posBarEl) posBarEl.style.width = "50%";
  if (shotsHomeEl) shotsHomeEl.innerText = "0";
  if (shotsOppEl) shotsOppEl.innerText = "0";
  if (xgHomeEl) xgHomeEl.innerText = "0.00";
  if (xgAwayEl) xgAwayEl.innerText = "0.00";
}

function updateLiveMatchStats(matchData, progressRatio = 1.0) {
  if (!matchData) return;
  const stats = matchData.stats || {};
  const isHome = matchData.is_home !== undefined 
    ? matchData.is_home 
    : (matchData.home_name === (gameState ? gameState.club_name : ""));

  const targetPossession = stats.possession || 50;
  const targetShotsMy = stats.shots_my || Math.max(3, (matchData.home_score || 0) + (matchData.away_score || 0) + 5);
  const targetShotsOpp = stats.shots_opp || Math.max(2, (matchData.home_score || 0) + (matchData.away_score || 0) + 4);
  const targetXgMy = stats.xg_my !== undefined ? stats.xg_my : (targetShotsMy * 0.12).toFixed(2);
  const targetXgOpp = stats.xg_opp !== undefined ? stats.xg_opp : (targetShotsOpp * 0.11).toFixed(2);

  const curPosMy = targetPossession;
  const curPosOpp = 100 - curPosMy;

  const curShotsMy = Math.max(0, Math.round(targetShotsMy * progressRatio));
  const curShotsOpp = Math.max(0, Math.round(targetShotsOpp * progressRatio));
  const curXgMy = (parseFloat(targetXgMy) * progressRatio).toFixed(2);
  const curXgOpp = (parseFloat(targetXgOpp) * progressRatio).toFixed(2);

  const posHome = isHome ? curPosMy : curPosOpp;
  const posAway = isHome ? curPosOpp : curPosMy;
  const shotsHome = isHome ? curShotsMy : curShotsOpp;
  const shotsAway = isHome ? curShotsOpp : curShotsMy;
  const xgHome = isHome ? curXgMy : curXgOpp;
  const xgAway = isHome ? curXgOpp : curXgMy;

  const posHomeEl = document.getElementById("stat-pos-home");
  const posAwayEl = document.getElementById("stat-pos-away");
  const posBarEl = document.getElementById("stat-pos-bar");
  const shotsHomeEl = document.getElementById("stat-shots-home");
  const shotsOppEl = document.getElementById("stat-shots-opp");
  const xgHomeEl = document.getElementById("stat-xg-home");
  const xgAwayEl = document.getElementById("stat-xg-away");

  if (posHomeEl) posHomeEl.innerText = `${posHome}%`;
  if (posAwayEl) posAwayEl.innerText = `${posAway}%`;
  if (posBarEl) posBarEl.style.width = `${posHome}%`;
  if (shotsHomeEl) shotsHomeEl.innerText = shotsHome;
  if (shotsOppEl) shotsOppEl.innerText = shotsAway;
  if (xgHomeEl) xgHomeEl.innerText = xgHome;
  if (xgAwayEl) xgAwayEl.innerText = xgAway;
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

      // Canlı Maç İstatistiklerini Güncelle (Topla oynama, şutlar, xG)
      const halfWeight = (startMin === 1) ? (progress * 0.5) : (0.5 + progress * 0.5);
      updateLiveMatchStats(matchData, halfWeight);

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
  updateLiveMatchStats(match, 1.0);

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
        <div class="flex items-center gap-1.5 min-w-0 flex-1 mr-1">
          <span class="text-[8px] font-black px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700 flex-shrink-0">${shortenPosition(p.pos)}</span>
          <span class="text-xs font-semibold text-white truncate" title="${p.name}">${p.name}</span>
          ${p.is_sub ? '<span class="text-[8px] text-blue-300 bg-blue-950 px-1 py-0.2 rounded border border-blue-800 flex-shrink-0 font-bold">YDK</span>' : ''}
          ${p.goals > 0 ? `<span class="text-[9px] font-black text-amber-400 flex-shrink-0">⚽${p.goals > 1 ? p.goals : ''}</span>` : ''}
        </div>
        <span class="text-xs font-black font-mono px-1.5 py-0.5 rounded border flex-shrink-0 ${rtgColor}">${p.rating.toFixed(1)}</span>
      `;
      ratingsGrid.appendChild(item);
    });

    // Hoca Maç Sonu Oyuncu Değerlendirmesi & Brifing Kutusu
    renderPostMatchCoachBriefing(match);
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

function renderPostMatchCoachBriefing(match) {
  const box = document.getElementById("coach-post-match-briefing");
  if (!box || !gameState || !match.player_ratings || match.player_ratings.length === 0) return;

  const coachNameEl = document.getElementById("briefing-coach-name");
  const tagEl = document.getElementById("briefing-player-tag");
  const textEl = document.getElementById("briefing-text");
  const actionsEl = document.getElementById("briefing-actions");

  if (coachNameEl) coachNameEl.innerText = gameState.coach ? gameState.coach.name : "Teknik Direktör";

  // En iyi ve en kötü oyuncuyu tespit et
  const sorted = [...match.player_ratings].sort((a, b) => b.rating - a.rating);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  let selectedPlayer = null;
  let briefingMode = "best";

  if (best && best.rating >= 7.6) {
    selectedPlayer = best;
    briefingMode = "best";
  } else if (worst && worst.rating <= 6.3) {
    selectedPlayer = worst;
    briefingMode = "worst";
  } else {
    selectedPlayer = best || { name: "Takım", rating: 7.0 };
    briefingMode = "neutral";
  }

  if (briefingMode === "best") {
    if (tagEl) {
      tagEl.innerText = "⭐ Maçın Yıldızı";
      tagEl.className = "text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-bold";
    }
    if (textEl) {
      textEl.innerText = `Hoca ${gameState.coach.name}: "Başkanım, ${selectedPlayer.name} bugün sahada resital sundu (${selectedPlayer.rating.toFixed(1)} Puan). Bu formu korumak için oyuncuyu onore edelim mi?"`;
    }
    if (actionsEl) {
      actionsEl.innerHTML = `
        <button onclick="submitCoachPostMatchTalk('bonus', '${selectedPlayer.name}')" class="p-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 font-bold text-[10px] text-center transition-all">
          💰 1M ₺ Prim Ver
        </button>
        <button onclick="submitCoachPostMatchTalk('praise', '${selectedPlayer.name}')" class="p-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-blue-300 font-bold text-[10px] text-center transition-all">
          👏 Tebrik Et
        </button>
        <button onclick="submitCoachPostMatchTalk('praise', '${selectedPlayer.name}')" class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-[10px] text-center transition-all">
          📋 "Rehavet Yok"
        </button>
      `;
    }
  } else if (briefingMode === "worst") {
    if (tagEl) {
      tagEl.innerText = "⚠️ Düşük Performans";
      tagEl.className = "text-[9px] bg-rose-500/20 text-rose-300 border border-rose-500/40 px-1.5 py-0.5 rounded font-bold";
    }
    if (textEl) {
      textEl.innerText = `Hoca ${gameState.coach.name}: "Başkanım, ${selectedPlayer.name} bugün sahada çok isteksizdi ve beklentinin çok altında kaldı (${selectedPlayer.rating.toFixed(1)} Puan). Bir tedbir alalım mı?"`;
    }
    if (actionsEl) {
      actionsEl.innerHTML = `
        <button onclick="submitCoachPostMatchTalk('warn', '${selectedPlayer.name}')" class="p-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/50 text-rose-300 font-bold text-[10px] text-center transition-all">
          ⚠️ Uyar & Yedeğe Al
        </button>
        <button onclick="submitCoachPostMatchTalk('praise', '${selectedPlayer.name}')" class="p-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-blue-300 font-bold text-[10px] text-center transition-all">
          🤝 "Destek Ol Hocam"
        </button>
        <button onclick="submitCoachPostMatchTalk('fine', '${selectedPlayer.name}')" class="p-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-amber-300 font-bold text-[10px] text-center transition-all">
          💸 500K ₺ Ceza Kes
        </button>
      `;
    }
  } else {
    if (tagEl) {
      tagEl.innerText = "📋 Genel Değerlendirme";
      tagEl.className = "text-[9px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded font-bold";
    }
    if (textEl) {
      textEl.innerText = `Hoca ${gameState.coach.name}: "Takım bugün dengeli bir oyun ortaya koydu. Gelecek haftanın taktik hazırlığına başladık."`;
    }
    if (actionsEl) {
      actionsEl.innerHTML = `
        <button onclick="submitCoachPostMatchTalk('praise', '')" class="col-span-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-[10px] text-center transition-all">
          👍 "Eline sağlık hocam, devam edelim"
        </button>
      `;
    }
  }

  box.classList.remove("hidden");
}

async function submitCoachPostMatchTalk(action, playerName) {
  try {
    const res = await apiFetch("/api/coach/post-match-talk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: action, player_name: playerName })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "İşlem başarısız!");
      return;
    }
    showToast(data.message);
    const box = document.getElementById("coach-post-match-briefing");
    if (box) box.classList.add("hidden");
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
  }
}

function prepareNextMatch() {
  dismissGoalCelebration();
  const briefingBox = document.getElementById("coach-post-match-briefing");
  if (briefingBox) briefingBox.classList.add("hidden");

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
    const res = await apiFetch("/api/captain/report");
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
        item.id = "wage-demand-card-" + p.name;
        const potBadge = (p.age < 26) ? `<span class="text-[8px] bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-1 py-0.2 rounded font-bold">⚡ POT: ${p.potential}</span>` : '';
        item.innerHTML = `
          <div class="flex justify-between items-center text-xs">
            <div>
              <div class="flex items-center gap-1.5">
                <span class="font-extrabold text-white">${p.name}</span>
                <span class="text-[9px] text-amber-400 font-bold">(${shortenPosition(p.pos)})</span>
                <span class="text-[9px] text-slate-400 font-semibold">${p.age} Yaş</span>
                ${potBadge}
              </div>
              <div class="text-[10px] text-slate-400">Mevcut: ${formatMoney(p.current_wage)} • İstediği: <strong class="text-emerald-400">${formatMoney(p.demanded_wage)}</strong></div>
            </div>
            <span class="text-[9px] font-bold text-amber-300 bg-slate-800 px-1.5 py-0.5 rounded">${p.contract_years} Yıl Kaldı</span>
          </div>
          <div class="text-[9px] text-amber-300/90 font-medium italic bg-slate-950/60 px-2 py-1 rounded border border-slate-800">
            💬 "${p.reason || 'Sözleşmesinde iyileştirme bekliyor.'}"
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
    const res = await apiFetch("/api/player/wage-negotiation", {
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

    // Kartı anında arayüzden kaldır (üst üste zam olmasın, tek seferde silinsin)
    const card = document.getElementById("wage-demand-card-" + playerName);
    if (card) {
      card.style.transition = "all 0.3s ease";
      card.style.opacity = "0";
      card.style.transform = "scale(0.95)";
      setTimeout(() => {
        card.remove();
        const list = document.getElementById("captain-wage-demands-list");
        if (list && list.children.length === 0) {
          list.innerHTML = '<div class="text-slate-400 text-xs text-center py-3 italic">Tüm zam talepleri sonuçlandırıldı. Aktif talep kalmadı ✓</div>';
        }
      }, 300);
    } else {
      openCaptainReportModal();
    }
  } catch (e) {
    console.error(e);
  }
}

// ==================== BANKALAR BİRLİĞİ BORÇ ÖDEME ====================
async function payClubDebt(amount) {
  if (!gameState) return;
  if (gameState.budget < amount && amount < 999999999) {
    showToast("Kasada bu kadar nakit yok!");
    return;
  }
  try {
    const res = await apiFetch("/api/finances/pay-debt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amount })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Borç ödemesi başarısız!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
    showToast("Sunucu hatası!");
  }
}

async function takeClubLoan(amount) {
  if (!gameState) return;
  try {
    const res = await apiFetch("/api/finances/take-loan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amount })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Kredi başvurusu onaylanmadı!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
    showToast("Sunucu hatası!");
  }
}

// ==================== ŞİKE / TEŞVİK TEKLİFİ YANITI ====================
async function respondBribeOffer(decision) {
  try {
    const res = await apiFetch("/api/underground/bribe-response", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision: decision })
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
    showToast("Sunucu hatası!");
  }
}

// ==================== HOCA VİZYONU MODALI ====================
function openCoachVisionModal() {
  if (gameState) {
    const badge = document.getElementById("coach-vision-status-badge");
    if (badge) {
      if (gameState.coach_vision_used_half) {
        badge.className = "px-2 py-0.5 rounded font-bold bg-amber-950 text-amber-300 border border-amber-700/50";
        badge.innerText = "Bu Yarı Sezonda Kullanıldı (Kilitli)";
      } else {
        badge.className = "px-2 py-0.5 rounded font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/50";
        badge.innerText = "Müsait ✓";
      }
    }
  }
  document.getElementById("modal-coach-vision").classList.remove("hidden");
}

function closeCoachVisionModal() {
  document.getElementById("modal-coach-vision").classList.add("hidden");
}

async function submitCoachVision(focus) {
  try {
    const res = await apiFetch("/api/coach/future-vision", {
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
    const res = await apiFetch("/api/teams/all-squads");
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
          <span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-amber-400">${shortenPosition(p.pos)}</span>
          <span>${p.name}</span>
          <span class="text-[9px] text-slate-400">(${p.age} yaş)</span>
          ${(p.age < 26) ? `<span class="text-[8px] bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-1 py-0.2 rounded font-bold">⚡ POT: ${p.potential || Math.min(94, p.overall + Math.max(3, (27 - p.age) * 2))}</span>` : ''}
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
    const res = await apiFetch("/api/transfer/negotiate-club", {
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
    const res = await apiFetch("/api/transfer/sign-negotiated-player", {
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
    const res = await apiFetch("/api/transfer/advance-day", { method: "POST" });
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
          <span class="text-[9px] text-amber-400 font-bold ml-1">(${shortenPosition(bid.pos)})</span>
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
    const res = await apiFetch("/api/transfer/respond-incoming-bid", {
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

// ==================== TRANSFER PAZARI KATEGORİLERİ (AVRUPA, DÜNYA YILDIZLARI & SERBESTLER) ====================
let europeanMarketData = {};

async function loadTransferMarket() {
  try {
    const res = await apiFetch("/api/transfer/market");
    marketData = await res.json();
    const resEur = await apiFetch("/api/transfer/european-market");
    if (resEur.ok) {
      europeanMarketData = await resEur.json();
    }
    renderTransferMarket();
  } catch (e) {
    console.error(e);
  }
}

function switchTransferMarketCategory(cat) {
  currentTransferMarketCategory = cat;
  ["all", "turkish", "europe", "stars", "free"].forEach(c => {
    const btn = document.getElementById("btn-tcat-" + c);
    if (btn) {
      btn.className = (c === cat)
        ? "py-1 rounded-lg bg-amber-500 text-slate-950 font-bold text-[10px] text-center"
        : "py-1 rounded-lg bg-slate-800 text-slate-300 font-semibold text-[10px] text-center hover:bg-slate-700";
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
  } else if (currentTransferMarketCategory === "turkish") {
    list = (marketData.turkish_stars || []).map(p => ({ ...p, club: p.current_club, type: "turkish" }));
  } else if (currentTransferMarketCategory === "europe") {
    list = [];
    Object.keys(europeanMarketData || {}).forEach(club => {
      (europeanMarketData[club] || []).forEach(p => {
        list.push({ ...p, club, price: p.val, type: "europe" });
      });
    });
  } else if (currentTransferMarketCategory === "stars") {
    list = (marketData.world_stars || []).map(p => ({ ...p, type: "superstar" }));
  } else {
    list = (marketData.free_agents || []).map(p => ({ ...p, type: "free" }));
  }

  list.forEach(p => {
    const item = document.createElement("div");
    item.className = "bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex flex-col gap-1.5 text-xs";
    const cost = (p.price || 0) + (p.salary || p.wage || 0);
    const clubBadge = p.club ? `<span class="bg-indigo-950 text-indigo-300 border border-indigo-700/60 px-1.5 py-0.2 rounded font-black text-[9px] mr-1">${p.club}</span>` : '';
    const posBadge = getFifaPosBadgeHtml(p.pos);
    const natBadge = (p.is_foreign === false) ? '<span class="bg-red-950 text-red-300 border border-red-700/60 px-1 py-0.2 rounded font-black text-[9px] mr-1">🇹🇷 TR</span>' : '';

    item.innerHTML = `
      <div class="flex justify-between items-start">
        <div>
          <div class="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
            ${natBadge}${clubBadge}${posBadge}<span class="text-white font-bold">${p.name}</span>
            <span class="text-[10px] text-slate-400 font-medium">(${p.age} yaş)</span>
          </div>
          <div class="text-[9px] text-slate-400 mt-0.5">Bonservis: <strong>${formatMoney(p.price || 0)}</strong> • Maaş: ${formatMoney(p.salary || p.wage || 0)}</div>
        </div>
        <span class="text-[9px] font-bold text-blue-400 bg-blue-950 px-1.5 py-0.5 rounded border border-blue-800">Güç/Pot: ${p.real_pot || p.overall || p.claimed_pot}</span>
      </div>
      ${p.desc ? `<p class="text-[9px] text-slate-300 italic">"${p.desc}"</p>` : ''}
      <button onclick="${p.type === 'europe' ? `buyEuropeanPlayer('${p.club}', '${p.name}', this)` : `buyMarketPlayer('${p.name}', ${p.price || 0}, ${p.salary || p.wage || 10_000_000}, this)`}" class="w-full py-1.5 rounded ${p.type === 'europe' ? 'bg-indigo-600 hover:bg-indigo-500' : p.type === 'turkish' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'} text-white font-bold text-[10px]">
        ${p.type === 'europe' ? `Avrupa Transferini Bitir (${formatMoney(cost)})` : p.type === 'turkish' ? `🇹🇷 Yerli Yıldızı Bitir (${formatMoney(cost)})` : `Transfer Et (${formatMoney(cost)})`}
      </button>
    `;
    container.appendChild(item);
  });
}

async function buyEuropeanPlayer(clubName, playerName, btnEl) {
  if (!confirm(`${clubName} kulübünden ${playerName} transfer edilsin mi?`)) return;
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerText = "İşleniyor...";
  }
  try {
    const res = await apiFetch("/api/transfer/sign-european-player", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ club_name: clubName, player_name: playerName })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Transfer yapılamadı!");
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerText = "Transfer Et";
      }
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerText = "Transfer Et";
    }
    showToast("Bağlantı hatası!");
  }
}

async function buyMarketPlayer(playerName, price, salary, btnEl) {
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerText = "İşleniyor...";
  }
  try {
    const res = await apiFetch("/api/transfer/sign-negotiated-player", {
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
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerText = "Transfer Et";
      }
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerText = "Transfer Et";
    }
    showToast("Bağlantı hatası!");
  }
}

// ==================== SİYASET VE CUMHURBAŞKANLIĞI HİBE SİSTEMİ ====================
async function doPoliticsAction(actType) {
  try {
    const res = await apiFetch("/api/politics/action", {
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
    const res = await apiFetch("/api/politics/presidential-grant", { method: "POST" });
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
    const res = await apiFetch("/api/season/next", { method: "POST" });
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
    const res = await apiFetch("/api/election/run", {
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

// ==================== TAKIM SEÇİMİ, BAŞKAN HESABI VE İSTİFA ====================
let nameCheckTimeout = null;
let verifiedExistingAccount = null;

async function loadTeamsList() {
  try {
    const res = await apiFetch("/api/teams");
    teamsList = await res.json();
    renderTeamSelectList();
  } catch (e) {
    console.error(e);
  }
}

function openTeamSelectModal() {
  const modal = document.getElementById("modal-team-select");
  if (!modal) return;
  modal.classList.remove("hidden");

  // Kapat butonu sadece oyun zaten başlamışsa görünsün
  const closeBtn = document.getElementById("btn-close-team-select");
  if (closeBtn) {
    if (gameState && gameState.is_started) closeBtn.classList.remove("hidden");
    else closeBtn.classList.add("hidden");
  }

  // Başkan adını pre-fill yap
  const inputPres = document.getElementById("input-president-name");
  if (inputPres) {
    if (!inputPres.value) {
      inputPres.value = localStorage.getItem("baskan_username") || (gameState && gameState.president_name ? gameState.president_name : "");
    }
  }

  if (!teamsList || teamsList.length === 0) loadTeamsList();
  else renderTeamSelectList();

  checkAccountStatus();
}

function closeTeamSelectModalIfStarted() {
  if (gameState && gameState.is_started) {
    document.getElementById("modal-team-select").classList.add("hidden");
  } else {
    showToast("Lütfen bir başkan adı girip kulübünüzü seçin!");
  }
}

function onPresidentNameInput(val) {
  if (nameCheckTimeout) clearTimeout(nameCheckTimeout);
  nameCheckTimeout = setTimeout(() => {
    checkAccountStatus();
  }, 450);
}

async function checkAccountStatus() {
  const nameInput = document.getElementById("input-president-name");
  if (!nameInput) return;
  const username = nameInput.value.trim();
  const careerBox = document.getElementById("existing-career-box");
  const teamWrapper = document.getElementById("team-selection-wrapper");

  if (!username) {
    if (careerBox) careerBox.classList.add("hidden");
    if (teamWrapper) teamWrapper.classList.remove("hidden");
    verifiedExistingAccount = null;
    return;
  }

  try {
    const res = await apiFetch(`/api/account/check?username=${encodeURIComponent(username)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.exists) {
        verifiedExistingAccount = data;
        if (careerBox) {
          careerBox.classList.remove("hidden");
          const logoEl = document.getElementById("existing-career-logo");
          if (logoEl) logoEl.src = data.logo ? data.logo + "?v=3" : "";
          const clubEl = document.getElementById("existing-career-club");
          if (clubEl) clubEl.innerText = data.club_name;
          const detEl = document.getElementById("existing-career-details");
          if (detEl) detEl.innerText = `Başkan ${data.president_name || username} • ${data.season || 1}. Sezon • Hafta ${data.week || 1} • Kasa: ${formatMoney(data.budget || 0)}`;
        }
      } else {
        // Sunucuda yoksa bile yerel cihazda bu kullanıcıya ait aktif kayıt var mı kontrol et
        const localSaved = localStorage.getItem("baskan_local_career_save");
        let foundLocal = false;
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved);
            if (parsed && parsed.is_started && (parsed.president_name === username || normalizeNameSlug(parsed.president_name) === normalizeNameSlug(username))) {
              foundLocal = true;
              verifiedExistingAccount = {
                exists: true,
                username: username,
                president_name: parsed.president_name,
                club_name: parsed.club_name,
                season: parsed.season || 1,
                week: parsed.week || 1,
                budget: parsed.budget || 0,
                logo: parsed.logo || ""
              };
              if (careerBox) {
                careerBox.classList.remove("hidden");
                const logoEl = document.getElementById("existing-career-logo");
                if (logoEl) logoEl.src = parsed.logo ? parsed.logo + "?v=3" : "";
                const clubEl = document.getElementById("existing-career-club");
                if (clubEl) clubEl.innerText = parsed.club_name;
                const detEl = document.getElementById("existing-career-details");
                if (detEl) detEl.innerText = `Başkan ${parsed.president_name || username} • ${parsed.season || 1}. Sezon • Hafta ${parsed.week || 1} • Kasa: ${formatMoney(parsed.budget || 0)}`;
              }
            }
          } catch(e) {}
        }

        if (!foundLocal) {
          verifiedExistingAccount = null;
          if (careerBox) careerBox.classList.add("hidden");
          if (teamWrapper) teamWrapper.classList.remove("hidden");
        }
      }
    }
  } catch (err) {
    console.warn("Account check error:", err);
  }
}

function showTeamListForNewCareer() {
  const careerBox = document.getElementById("existing-career-box");
  if (careerBox) careerBox.classList.add("hidden");
  const teamWrapper = document.getElementById("team-selection-wrapper");
  if (teamWrapper) teamWrapper.classList.remove("hidden");
  showToast("Aşağıdan yeni bir kulüp seçerek sıfırdan başlayabilirsiniz.");
}

async function continueExistingCareer() {
  if (!verifiedExistingAccount) return;
  const username = verifiedExistingAccount.username;
  localStorage.setItem("baskan_username", username);
  const sid = "user_" + normalizeNameSlug(username);
  localStorage.setItem("baskan_session_id", sid);

  // Eğer sunucu sıfırlanmışsa ve yerel yedek varsa, hemen senkronize et
  const localSaved = localStorage.getItem("baskan_local_career_save");
  if (localSaved) {
    try {
      const parsedLocal = JSON.parse(localSaved);
      if (parsedLocal && parsedLocal.is_started) {
        await apiFetch("/api/save/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: parsedLocal })
        });
      }
    } catch(e) {}
  }

  document.getElementById("modal-team-select").classList.add("hidden");
  showToast(`Hoş geldiniz ${username}! ${verifiedExistingAccount.club_name} kariyeriniz yüklendi 🏆`);
  await fetchState();
  switchTab("office");
}

function promptSwitchAccount() {
  closeSettingsModal();
  openTeamSelectModal();
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
          <div class="text-[9px] text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
            ${t.coach_photo ? `<img src="${t.coach_photo}" alt="${t.coach_name}" class="w-4 h-4 rounded-full object-cover border border-amber-500/50 inline-block flex-shrink-0" />` : ''}
            <span>TD: <span class="text-slate-200 font-semibold">${t.coach_name}</span></span>
            <span>• Bütçe: <strong class="text-emerald-400">${formatMoney(t.budget)}</strong></span>
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
  const nameInput = document.getElementById("input-president-name");
  let username = nameInput ? nameInput.value.trim() : "";
  if (!username) {
    username = prompt("Lütfen Büyük Başkan Adınızı girin:", "Büyük Başkan") || "Büyük Başkan";
  }
  username = username.trim() || "Büyük Başkan";

  // Kullanıcı adını hem session hem username olarak kaydet
  localStorage.setItem("baskan_username", username);
  const sid = "user_" + normalizeNameSlug(username);
  localStorage.setItem("baskan_session_id", sid);

  // Yeni oyun başlatılıyor: tutorial'ı sıfırla
  try { localStorage.removeItem("baskan_story_tutorial_seen"); } catch(e) {}

  try {
    const res = await apiFetch("/api/start-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: teamId, president_name: username })
    });
    const data = await res.json();
    gameState = data;
    viewingFinishedMatch = false;
    document.getElementById("modal-team-select").classList.add("hidden");
    showToast(`👑 Büyük Başkan ${username}, ${data.club_name} kulübünün yeni başkanı oldunuz!`);
    renderUI();
    switchTab("office");
    setTimeout(() => {
      openStoryTutorial(true);
    }, 500);
  } catch (e) {
    console.error(e);
    showToast("Kulüp seçimi başlatılamadı!");
  }
}

async function promptResign() {
  if (!gameState || !gameState.club_name) return;
  if (!confirm(`${gameState.club_name} kulübü başkanlığından istifa etmek istediğinize emin misiniz?`)) return;

  try {
    localStorage.removeItem("baskan_local_career_save");
    localStorage.removeItem("baskan_local_career_time");
    const res = await apiFetch("/api/resign", { method: "POST" });
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
    const res = await apiFetch("/api/coach/dialog", {
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

    if (action === "fire" || data.coach_vacant) {
      openSelectCoachModal(data.coaches);
    }
  } catch (e) {
    console.error(e);
  }
}

async function sendCoachInstruction(instruction) {
  try {
    const res = await apiFetch("/api/coach/instruction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instruction: instruction })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Talimat iletilemedi!");
      return;
    }
    closeCoachModal();
    gameState = data.state;
    renderUI();
    showToast(data.coach_reply || data.message);
  } catch (e) {
    console.error(e);
    showToast("Bağlantı hatası!");
  }
}

async function openSelectCoachModal(cachedList) {
  const modal = document.getElementById("modal-select-coach");
  const listEl = document.getElementById("select-coach-list");
  if (!modal || !listEl) return;

  modal.classList.remove("hidden");

  let coaches = cachedList;
  if (!coaches) {
    listEl.innerHTML = '<div class="text-slate-400 text-xs text-center py-4">Teknik direktör adayları listeleniyor...</div>';
    try {
      const res = await apiFetch("/api/coach/market");
      const data = await res.json();
      coaches = data.coaches || [];
    } catch (e) {
      console.error(e);
      listEl.innerHTML = '<div class="text-rose-400 text-xs text-center py-4">Adaylar yüklenemedi.</div>';
      return;
    }
  }

  listEl.innerHTML = "";
  if (!coaches || coaches.length === 0) {
    listEl.innerHTML = '<div class="text-slate-400 text-xs text-center py-4">Şu an serbestte hoca adayı bulunamadı.</div>';
    return;
  }

  coaches.forEach(c => {
    const card = document.createElement("div");
    card.className = "p-3 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-amber-500/60 transition-all flex items-center justify-between gap-3 shadow-md";
    card.innerHTML = `
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-12 h-12 rounded-xl bg-slate-950 border-2 border-amber-500/60 overflow-hidden flex-shrink-0 shadow">
          <img src="${c.photo}" alt="${c.name}" class="w-full h-full object-cover" onerror="this.src='/static/coach_terim.png'" />
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="font-extrabold text-white text-xs truncate">${c.name}</span>
            <span class="text-[9px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded font-mono">${c.rating} OVR</span>
          </div>
          <div class="text-[10px] text-amber-300/90 font-medium truncate">${c.style}</div>
          <div class="text-[9px] text-slate-400 mt-0.5">
            Maaş: <strong class="text-emerald-400">${formatMoney(c.salary)} / Yıl</strong>
          </div>
          <div class="flex flex-wrap gap-1 mt-1">
            ${(c.traits || []).slice(0, 2).map(t => `<span class="text-[8px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700">${t}</span>`).join('')}
          </div>
        </div>
      </div>
      <button onclick="hireCoach('${c.id}', this)" class="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black text-xs shadow-lg transition-all flex-shrink-0 whitespace-nowrap">
        Göreve Getir
      </button>
    `;
    listEl.appendChild(card);
  });
}

function closeSelectCoachModal() {
  const modal = document.getElementById("modal-select-coach");
  if (modal) modal.classList.add("hidden");
}

async function hireCoach(coachId, btnEl) {
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerText = "İmzalanıyor...";
  }
  try {
    const res = await apiFetch("/api/coach/hire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coach_id: coachId })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Hoca ile anlaşılamadı!");
      if (btnEl) {
        btnEl.disabled = false;
        btnEl.innerText = "Göreve Getir";
      }
      return;
    }
    closeSelectCoachModal();
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerText = "Göreve Getir";
    }
    showToast("Bağlantı hatası!");
  }
}

async function terminatePlayerContract(playerName) {
  if (!confirm(`'${playerName}' ile sözleşmeyi karşılıklı feshetmek istiyor musunuz?\n(Yıllık maaşının %25'i kadar fesih tazminatı ödenecektir)`)) {
    return;
  }
  try {
    const res = await apiFetch("/api/squad/terminate-contract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_name: playerName })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Fesih işlemi başarısız!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
    showToast("Bağlantı hatası!");
  }
}

async function confrontCoachAboutPlayer(playerName) {
  try {
    const res = await apiFetch("/api/coach/confront-playing-time", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_name: playerName })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Görüşme yapılamadı!");
      return;
    }
    openCoachConfrontModal(data);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
    showToast("Bağlantı hatası oluştu!");
  }
}

function openCoachConfrontModal(data) {
  const modal = document.getElementById("modal-coach-confront");
  if (!modal) {
    showToast(data.message);
    return;
  }
  const photoEl = document.getElementById("confront-coach-photo");
  const nameEl = document.getElementById("confront-coach-name");
  const speechEl = document.getElementById("confront-president-speech");
  const respEl = document.getElementById("confront-coach-response");

  if (photoEl) {
    photoEl.src = data.coach_photo || (gameState && gameState.coach && gameState.coach.photo ? gameState.coach.photo : "/static/coach_senol_gunes.png");
  }
  if (nameEl) nameEl.innerText = data.coach_name || "Teknik Direktör";
  if (speechEl) {
    speechEl.innerText = `"Sayın Hocam, ${data.player_name} (${data.overall} Reyting) bu sezon yalnızca ${data.minutes_played} dakika (${data.matches_played} maç) süre alabildi! Neden bu oyuncuyu kenarda çürütüyorsun?"`;
  }
  if (respEl) respEl.innerText = data.message;

  modal.classList.remove("hidden");
}

function closeCoachConfrontModal() {
  const modal = document.getElementById("modal-coach-confront");
  if (modal) modal.classList.add("hidden");
}

function showBenchAccountabilityTab() {
  switchTab("squad");
  showToast("👉 Kulübedeki oyuncuların yanındaki '🗣️ Hesap Sor' butonuna tıklayarak hocayla yüzleşebilirsiniz!");
}

async function fireScout() {
  if (confirm("Scout ekibini 2M ₺ tazminat ödeyerek kovmak istiyor musunuz?")) {
    try {
      const res = await apiFetch("/api/scout/fire", { method: "POST" });
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
    const res = await apiFetch("/api/scout/candidates");
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
    const res = await apiFetch("/api/scout/hire", {
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
    const res = await apiFetch("/api/sponsors/available");
    const sponsors = await res.json();
    const container = document.getElementById("available-sponsors-list");
    if (!container) return;
    container.innerHTML = "";

    sponsors.forEach(sp => {
      const card = document.createElement("div");
      card.className = "bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between text-xs";
      const isSigned = sp.is_signed === true;
      const canSign = sp.can_sign !== false;

      let actionBtn = "";
      if (isSigned) {
        actionBtn = `<span class="px-2.5 py-1.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 text-[10px] font-bold">✓ Aktif (${sp.remaining_weeks ? sp.remaining_weeks + ' Hf' : 'Sezonluk'})</span>`;
      } else if (!canSign) {
        actionBtn = `<button disabled title="${sp.reason_unmet || 'Kriter karşılanamadı'}" class="px-2.5 py-1.5 rounded bg-slate-800/80 text-slate-500 border border-slate-700/60 font-bold text-[10px] cursor-not-allowed opacity-60">
             Kriter Karşılanmadı
           </button>`;
      } else {
        actionBtn = `<button onclick="signSponsor('${sp.id}')" class="px-2.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-all shadow-sm">
             İmzala (+${formatMoney(sp.income_season)})
           </button>`;
      }

      const slotLabel = sp.type_label || (
        sp.type === 'chest' ? 'Göğüs Sponsoru' :
        sp.type === 'stadium' ? 'Stadyum İsim Hakkı' :
        sp.type === 'back' ? 'Forma Sırt & Numara' :
        sp.type === 'arm' ? 'Forma Kol & Şort' : 'Resmi Sağlık Sponsoru'
      );

      card.innerHTML = `
        <div class="mr-2">
          <div class="font-bold text-white text-xs flex items-center gap-1.5 flex-wrap">
            <span>${sp.name}</span>
            <span class="text-[9px] text-amber-400 font-semibold px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700/80">(${slotLabel})</span>
          </div>
          <div class="text-[9px] text-slate-400 mt-0.5">${sp.desc}</div>
          <div class="mt-1 text-[9px] flex items-center gap-1.5 flex-wrap">
            <span class="px-1.5 py-0.2 rounded font-bold ${canSign ? 'bg-blue-950/80 text-blue-300 border border-blue-800/60' : 'bg-red-950/80 text-red-300 border border-red-800/60'}">
              Gerekçe / Şart: ${sp.req_text || 'Tüm Kulüplere Açık'}
            </span>
            ${!canSign && sp.reason_unmet ? `<span class="text-rose-400 font-medium">(${sp.reason_unmet})</span>` : ''}
          </div>
        </div>
        <div class="flex-shrink-0">
          ${actionBtn}
        </div>
      `;
      container.appendChild(card);
    });
  } catch (e) {
    console.error(e);
  }
}

async function signSponsor(spId) {
  try {
    const res = await apiFetch("/api/sponsors/sign", {
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
    const res = await apiFetch("/api/underground/deal", {
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
    const res = await apiFetch("/api/realestate/start", {
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

function renderRealEstateUI() {
  if (!gameState) return;
  const re = gameState.real_estate || { land_acres: 250, active_project: null, completed: [] };
  const reLand = document.getElementById("re-land-acres");
  if (reLand) reLand.innerText = `${re.land_acres || 250} Dönüm`;

  const activeCard = document.getElementById("re-active-project-card");
  const compBox = document.getElementById("re-completed-box");
  const compList = document.getElementById("re-completed-list");

  if (compBox && compList) {
    if (re.completed && re.completed.length > 0) {
      compBox.classList.remove("hidden");
      compList.innerText = re.completed.join(" • ");
    } else {
      compBox.classList.add("hidden");
    }
  }

  const activeProj = re.active_project;
  const btnMall = document.getElementById("btn-re-mall");
  const btnAcademy = document.getElementById("btn-re-academy");
  const btnStadium = document.getElementById("btn-re-stadium");

  if (activeProj && activeProj.weeks_left > 0) {
    if (activeCard) {
      activeCard.classList.remove("hidden");
      const titleEl = document.getElementById("re-active-title");
      if (titleEl) titleEl.innerText = `${activeProj.name || 'Proje'} İnşaatı Sürüyor`;
      const wEl = document.getElementById("re-active-weeks-left");
      if (wEl) wEl.innerText = `Kalan: ${activeProj.weeks_left} Hafta`;
      const totalW = activeProj.total_weeks || 4;
      const doneW = Math.max(0, totalW - activeProj.weeks_left);
      const pct = Math.min(100, Math.max(10, Math.round((doneW / totalW) * 100)));
      const pBar = document.getElementById("re-active-progress-bar");
      if (pBar) pBar.style.width = `${pct}%`;
      const rDesc = document.getElementById("re-active-desc");
      if (rDesc) rDesc.innerText = `Her lig maçı oynandığında inşaat 1 hafta ilerler.`;
      const rRew = document.getElementById("re-active-reward");
      if (rRew) rRew.innerText = `Ödül: ${activeProj.reward || 'Tamamlanma Bonusu'}`;
    }

    [btnMall, btnAcademy, btnStadium].forEach(b => {
      if (b) {
        b.disabled = true;
        b.innerText = "İnşaat Sürüyor...";
        b.className = "px-3 py-1.5 rounded-lg bg-slate-800 text-slate-500 font-bold text-[10px] cursor-not-allowed border border-slate-700/60";
      }
    });
  } else {
    if (activeCard) activeCard.classList.add("hidden");

    if (btnMall) {
      const isMallDone = (re.completed || []).includes("Kulüp Rezidans & AVM");
      btnMall.disabled = isMallDone;
      btnMall.innerText = isMallDone ? "✓ Tamamlandı" : "Başlat (+150M ₺)";
      btnMall.className = isMallDone
        ? "px-3 py-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 font-bold text-[10px] border border-emerald-800/60 cursor-default"
        : "px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-all shadow-sm";
    }

    if (btnAcademy) {
      const isAcadDone = (re.completed || []).includes("Futbol Altyapı Kampüsü");
      btnAcademy.disabled = isAcadDone;
      btnAcademy.innerText = isAcadDone ? "✓ Tamamlandı" : "Başlat (+5 Güç)";
      btnAcademy.className = isAcadDone
        ? "px-3 py-1.5 rounded-lg bg-blue-950/60 text-blue-400 font-bold text-[10px] border border-blue-800/60 cursor-default"
        : "px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold transition-all shadow-sm";
    }

    if (btnStadium) {
      const isStadDone = (re.completed || []).includes("Mega Arena Genişletme");
      btnStadium.disabled = isStadDone;
      btnStadium.innerText = isStadDone ? "✓ Tamamlandı" : "İnşa Et (+15K Stat)";
      btnStadium.className = isStadDone
        ? "px-3 py-1.5 rounded-lg bg-purple-950/60 text-purple-400 font-bold text-[10px] border border-purple-800/60 cursor-default"
        : "px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold transition-all shadow-sm";
    }
  }
}

// ==================== YASADIŞI MERDİVENALTI BAHİS SİSTEMİ ====================
let selectedBetType = "win";
let selectedBetOdds = 1.85;
let selectedBetRisk = 12;
let selectedBetTitle = "Kendi Takımına Temiz Galibiyet";
let selectedBetAmount = 10_000_000;

function selectBetOption(type, odds, risk, title) {
  selectedBetType = type;
  selectedBetOdds = odds;
  selectedBetRisk = risk;
  selectedBetTitle = title;

  document.querySelectorAll(".bet-opt-btn").forEach(btn => {
    if (btn.dataset.type === type) {
      btn.className = "bet-opt-btn selected-bet p-2 rounded-lg bg-slate-900 border border-amber-400 text-left transition-all";
    } else {
      btn.className = "bet-opt-btn p-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-amber-400 text-left transition-all";
    }
  });

  updateBetSummaryUI();
}

function selectBetAmount(amt) {
  selectedBetAmount = amt;
  document.querySelectorAll(".bet-amt-btn").forEach(btn => {
    if (parseInt(btn.dataset.amt) === amt) {
      btn.className = "bet-amt-btn selected-amt flex-1 py-1 rounded bg-amber-500 text-slate-950 font-black text-[10px] text-center";
    } else {
      btn.className = "bet-amt-btn flex-1 py-1 rounded bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold hover:bg-slate-700 text-center";
    }
  });
  updateBetSummaryUI();
}

function updateBetSummaryUI() {
  const calcEl = document.getElementById("bet-summary-calc");
  if (!calcEl) return;
  const payout = Math.floor(selectedBetAmount * selectedBetOdds);
  calcEl.innerText = `${formatMoney(selectedBetAmount)} Bas → ${formatMoney(payout)} Kazan (${selectedBetOdds}x)`;
}

function renderUndergroundBetState() {
  if (!gameState) return;
  const ug = gameState.underground || {};
  const activeBetBox = document.getElementById("active-bet-box");
  const placeBetBox = document.getElementById("place-bet-box");
  if (!activeBetBox || !placeBetBox) return;

  if (ug.active_bet) {
    activeBetBox.classList.remove("hidden");
    placeBetBox.classList.add("hidden");
    const bet = ug.active_bet;
    document.getElementById("active-bet-title").innerText = `Kupon: ${bet.title || bet.bet_type} (${bet.odds}x)`;
    document.getElementById("active-bet-amt").innerText = formatMoney(bet.amount);
    document.getElementById("active-bet-payout").innerText = formatMoney(bet.potential_payout);
  } else {
    activeBetBox.classList.add("hidden");
    placeBetBox.classList.remove("hidden");
    updateBetSummaryUI();
  }
}

async function submitUndergroundBet() {
  if (!gameState) return;
  if (gameState.budget < selectedBetAmount) {
    showToast("Yetersiz bütçe! Kasada bu kadar nakit yok.");
    return;
  }

  try {
    const res = await apiFetch("/api/underground/bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bet_type: selectedBetType, amount: selectedBetAmount })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Bahis yatırılamadı!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
    showToast("Bağlantı hatası!");
  }
}

async function cancelUndergroundBet() {
  try {
    const res = await apiFetch("/api/underground/bet", { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "İptal edilemedi!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
    showToast("Bağlantı hatası!");
  }
}

// ==================== DİNAMİK YASADIŞI BAHİS ORANLARI ====================
let currentUndergroundOdds = null;

async function loadUndergroundOdds() {
  try {
    const res = await apiFetch("/api/underground/odds");
    currentUndergroundOdds = await res.json();
    renderUndergroundBetMarkets();
  } catch (e) {
    console.error(e);
  }
}

function renderUndergroundBetMarkets() {
  if (!currentUndergroundOdds || !currentUndergroundOdds.markets) return;
  const grid = document.getElementById("underground-bet-markets-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const markets = currentUndergroundOdds.markets;
  markets.forEach(m => {
    const isSelected = (selectedBetType === m.type);
    const btn = document.createElement("button");
    btn.dataset.type = m.type;
    btn.className = `bet-opt-btn ${isSelected ? 'selected-bet border-amber-400 bg-amber-950/40' : 'border-slate-800 bg-black/60 hover:border-slate-600'} p-2 rounded-lg border text-left transition-all`;
    btn.onclick = () => selectBetOption(m.type, m.odds, m.risk_pct, m.title);

    const isOppWin = (m.type === "opponent_win");
    const titleColor = isOppWin ? "text-rose-400" : "text-white";
    const oddsColor = isOppWin ? "text-rose-400" : "text-amber-400";

    btn.innerHTML = `
      <div class="flex justify-between items-center">
        <span class="text-[10px] font-bold ${titleColor} truncate max-w-[120px]">${m.title}</span>
        <span class="text-[10px] font-black ${oddsColor} font-mono">${m.odds}x</span>
      </div>
      <div class="text-[8px] text-slate-400 mt-0.5 truncate">Risk: %${m.risk_pct} • ${m.desc}</div>
    `;
    grid.appendChild(btn);

    if (isSelected) {
      selectedBetOdds = m.odds;
      selectedBetRisk = m.risk_pct;
      selectedBetTitle = m.title;
    }
  });

  updateBetSummaryUI();
}

// ==================== TARAFTAR SOSYAL MEDYA & TRİBÜN SESİ ====================
async function loadFanSocialFeed() {
  try {
    const res = await apiFetch("/api/fans/social-feed");
    const data = await res.json();
    const container = document.getElementById("fan-social-feed-container");
    const demandsContainer = document.getElementById("fan-demands-list");
    if (!container) return;

    if (demandsContainer && data.demands) {
      demandsContainer.innerHTML = data.demands.map(d => `<span class="bg-slate-800 px-1.5 py-0.5 rounded text-[9px] border border-slate-700">${d}</span>`).join("");
    }

    container.innerHTML = "";
    (data.feed || []).forEach(post => {
      const card = document.createElement("div");
      card.className = "bg-slate-900/90 border border-slate-800/80 p-2 rounded-lg text-xs space-y-1 hover:border-slate-700 transition-colors";
      const sentimentBadge = post.sentiment === "positive" 
        ? `<span class="text-[8px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-1 py-0.2 rounded font-bold">Pozitif</span>`
        : post.sentiment === "negative"
        ? `<span class="text-[8px] bg-rose-950 text-rose-300 border border-rose-800/60 px-1 py-0.2 rounded font-bold">Tepkili</span>`
        : `<span class="text-[8px] bg-slate-800 text-slate-300 border border-slate-700 px-1 py-0.2 rounded font-bold">Nötr</span>`;

      card.innerHTML = `
        <div class="flex justify-between items-center text-[10px]">
          <div class="flex items-center gap-1.5">
            <span class="font-bold text-white text-[11px]">${post.name}</span>
            <span class="text-slate-400 text-[9px]">${post.author}</span>
          </div>
          <div class="flex items-center gap-1">
            ${sentimentBadge}
            <span class="text-slate-500 text-[9px]">${post.time}</span>
          </div>
        </div>
        <p class="text-[10px] text-slate-200 leading-snug">${post.text}</p>
        <div class="flex items-center gap-3 text-[9px] text-slate-400 pt-0.5">
          <span class="flex items-center gap-1 text-rose-400/80">❤️ ${post.likes}</span>
          <span class="flex items-center gap-1 text-sky-400/80">🔁 ${post.retweets || Math.floor(post.likes * 0.15)}</span>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (e) {
    console.error(e);
  }
}

// ==================== TEKNİK DİREKTÖR TRANSFER ÖNERİSİ ====================
async function loadCoachRecommendations() {
  try {
    const res = await apiFetch("/api/coach/transfer-recommendation");
    const data = await res.json();
    const posBadge = document.getElementById("coach-rec-target-pos");
    const reasonEl = document.getElementById("coach-rec-reason");
    const candidatesEl = document.getElementById("coach-rec-candidates");
    if (!posBadge || !reasonEl || !candidatesEl) return;

    posBadge.innerText = `${data.target_pos} GEREKLİ`;
    reasonEl.innerText = `${data.coach_name}: "${data.reason}"`;

    candidatesEl.innerHTML = "";
    (data.candidates || []).forEach(c => {
      const item = document.createElement("div");
      item.className = "bg-slate-900 border border-slate-800 p-2 rounded-lg flex flex-col justify-between text-[10px]";
      item.innerHTML = `
        <div>
          <div class="font-bold text-white text-[11px] truncate">${c.name}</div>
          <div class="text-[9px] text-amber-400 font-semibold">${c.pos} • ${c.club}</div>
          <div class="text-[9px] text-slate-400">Güç: ${c.overall} • ${formatMoney(c.val)}</div>
        </div>
        <button onclick="buyEuropeanPlayer('${c.club}', '${c.name}')" class="w-full mt-1.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[9px]">
          Girişim Başlat
        </button>
      `;
      candidatesEl.appendChild(item);
    });
  } catch (e) {
    console.error(e);
  }
}

// ==================== 4 METRİK (HUD) TIKLANABİLİR BİLGİ MODALI ====================
const HUD_INFO_DATA = {
  budget: {
    title: "Kulüp Kasası (Bütçe)",
    subtitle: "Mali Güç, Nakit Akışı & Likidite",
    icon: "wallet",
    colorClass: "text-emerald-400 bg-emerald-950/80 border-emerald-500/40",
    desc: "Kulübün anlık kullanabileceği serbest nakit rezervini gösterir. Transfer bonservisleri, oyuncu ve teknik heyet maaşları, tesis bakım ve seyahat giderleri doğrudan kasadan karşılanır.",
    howIncrease: [
      "İç saha maçlarında yüksek bilet hasılatı ve forma/mağaza satışları elde ederek.",
      "Lig maçlarını kazanıp TV yayın primlerinden düzenli sıcak para sağlayarak.",
      "Göğüs ve stadyum isim hakkı gibi sezonluk sponsorluk anlaşmaları imzalayarak.",
      "Futbolcuları Avrupa kulüplerine yüksek bonservis bedelleriyle satarak.",
      "Siyasi nüfuzu artırıp Cumhurbaşkanlığı Acil Kulüp Hibesi talep ederek."
    ],
    risks: [
      "Kasa eksiye düşerse kulüp mali darboğaza girer ve borç faizleri katlanır.",
      "Bütçe -30M ₺ altına inerse TFF kulübe TRANSFER TAHTASI KISITI uygular ve yeni oyuncu alamazsınız.",
      "Maaşlar ödenemezse takım içi huzur çöker, oyuncu moralleri dip yapar ve isyan çıkar."
    ],
    benefits: [
      "Dünya yıldızlarını ve Avrupa'nın en potansiyelli wonderkidlerini kadroya katabilirsiniz.",
      "Stadyum genişletme ve Mega Rezidans/AVM projeleri başlatarak kulübü gayrimenkul zengini yapabilirsiniz.",
      "Finansal krizdeki rakiplerinize karşı büyük transfer üstünlüğü kurarsınız."
    ]
  },
  fan: {
    title: "Taraftar Güveni & Tribün Desteği",
    subtitle: "Sokağın Nabzı, Tribün Doluluğu & Bilet Talebi",
    icon: "flame",
    colorClass: "text-amber-400 bg-amber-950/80 border-amber-500/40",
    desc: "Büyük taraftar kitlelerinin yönetiminize, hocanıza ve takımın futboluna olan inanç endeksidir. Stadyumun doluluk oranını, bilet hasılatını ve mağaza cirosunu doğrudan belirler.",
    howIncrease: [
      "Ligde derbileri ve kritik maçları kazanıp takımı üst sıralara taşıyarak.",
      "Hücum futbolu oynatıp taraftarı heyecanlandıracak yıldız transferleri yaparak.",
      "Altyapı akademisinden yerli genç yetenekleri A takıma kazandırıp parlatarak.",
      "Devlet projeleri ve sosyal sorumluluk hamleleriyle kulüp prestijini yükselterek."
    ],
    risks: [
      "Güven %50 altına indiğinde tribünler boşalır, bilet ve mağaza gelirleri bıçak gibi kesilir.",
      "Güven %35 altına düşerse stadyumda 'Yönetim İstifa' tezahüratları başlar ve kongre üyeleri olağanüstü seçim için imza toplar.",
      "Düşük güvende elit sponsorlar marka imajları zedeleneceği için sözleşmelerini feshedebilir."
    ],
    benefits: [
      "Her iç saha maçında kapalı gişe oynar, maksimum stadyum ve mağaza hasılatı toplarsınız.",
      "Yüksek moral ve tribün baskısıyla oyuncular sahada ekstra direnç ve hırsla oynar.",
      "Olağanüstü kongre ve seçimlerde taraftar arkasında duran başkanı kolay kolay yıkamaz."
    ]
  },
  board: {
    title: "Kongre & Divan Kurulu Güveni",
    subtitle: "Başkanlık Koltuğunun Meşruiyeti & İktidar",
    icon: "users",
    colorClass: "text-blue-400 bg-blue-950/80 border-blue-500/40",
    desc: "Kulüp genel kurulu, divan üyeleri ve delegelerin başkan olarak size olan sadakatini temsil eder. Sezon sonu başkanlık seçimlerinde sandıktan zaferle çıkmanızı sağlayan en kritik ölçüttür.",
    howIncrease: [
      "Mali disiplini koruyup kulübün borçlarını kontrol altında tutarak.",
      "Takım içi huzuru ve soyunma odası dengesini (Kaptan Raporu) yüksek tutarak.",
      "Kongreye verilen vaatleri (stadyum yatırımı, altyapı, şampiyonluk) yerine getirerek.",
      "Siyasi ilişkileri doğru yönetip kulübe devlet teşvikleri ve hazine arazisi kazandırarak."
    ],
    risks: [
      "Kongre güveni %40 altına düşerse divan kurulu olağanüstü seçim çağrısı yapar.",
      "Sezon sonu başkanlık seçiminde muhalefet blok oluşturur ve koltuğu kaybedip oyundan elenirsiniz (Game Over!).",
      "Karanlık işler veya şike baskını durumunda kongre üyeleri güvenoyu vermeyi reddeder."
    ],
    benefits: [
      "Kongre seçimlerinde %80+ oy oranlarıyla güven tazeleyip göreve rahatça devam edersiniz.",
      "Büyük gayrimenkul ve stadyum genişletme projelerine kongre engelsiz onay verir.",
      "Kriz dönemlerinde divan heyeti başkanı koruyucu basın açıklamaları yayınlar."
    ]
  },
  politics: {
    title: "Siyasi Nüfuz & Ankara Gücü",
    subtitle: "Bürokrasi, TFF Dengeleri & Devlet Fonları",
    icon: "landmark",
    colorClass: "text-purple-400 bg-purple-950/80 border-purple-500/40",
    desc: "Kulübün Ankara bürokrasisi, Spor Bakanlığı ve karar verici siyasi merciler nezdindeki lobi gücüdür. Devlet destekli projeler, hazine arazisi tahsisleri ve Cumhurbaşkanlığı hibeleri için hayatidir.",
    howIncrease: [
      "Ankara Ziyareti gerçekleştirerek Spor Bakanlığı ve üst düzey bürokratlarla görüşerek (+10 Siyaset).",
      "Devlet Destekli Gençlik ve Tesis Sosyal Projelerine imza atarak (+16 Siyaset).",
      "Kritik gündemlerde federasyon ve spor kamuoyu lehine yapıcı basın açıklamaları yaparak (+8 Siyaset)."
    ],
    risks: [
      "Siyasi nüfuz düşükse (%65 altı) Cumhurbaşkanlığı makamına erişim kapalıdır, başvuru yapamazsınız.",
      "Yetersiz siyasi güçle Ankara'dan talep edilen projeler geri çevrilir (-15 Kongre).",
      "TFF ve kurullarda lobi gücünüz zayıflarsa hakem hataları ve cezalarda kulüp yalnız kalır."
    ],
    benefits: [
      "%65 üstü siyasi güçle sezonluk 35M ₺ Cumhurbaşkanlığı Acil Kulüp Hibesi talep edebilirsiniz.",
      "%85 üstü süper güçle kulübün geleceğini kurtaracak 15 Dönüm Hazine Arazisi ve 30M ₺ altyapı fonu tahsis ettirebilirsiniz.",
      "Kulübün yeraltı ve MASAK soruşturmalarında siyasi koruma ve kalkan etkisi oluşturur."
    ]
  }
};

function openHudInfoModal(type) {
  const data = HUD_INFO_DATA[type];
  if (!data) return;

  const modal = document.getElementById("modal-hud-info");
  if (!modal) return;

  document.getElementById("hud-info-title").innerText = data.title;
  document.getElementById("hud-info-subtitle").innerText = data.subtitle;
  document.getElementById("hud-info-desc").innerText = data.desc;

  const iconBox = document.getElementById("hud-info-icon-box");
  if (iconBox) {
    iconBox.className = `w-8 h-8 rounded-lg flex items-center justify-center border ${data.colorClass}`;
    iconBox.innerHTML = `<i data-lucide="${data.icon}" class="w-4 h-4"></i>`;
  }

  const ulIncrease = document.getElementById("hud-info-how-increase");
  if (ulIncrease) {
    ulIncrease.innerHTML = data.howIncrease.map(item => `<li>${item}</li>`).join("");
  }

  const ulRisks = document.getElementById("hud-info-risks");
  if (ulRisks) {
    ulRisks.innerHTML = data.risks.map(item => `<li>${item}</li>`).join("");
  }

  const ulBenefits = document.getElementById("hud-info-benefits");
  if (ulBenefits) {
    ulBenefits.innerHTML = data.benefits.map(item => `<li>${item}</li>`).join("");
  }

  if (window.lucide) lucide.createIcons();
  modal.classList.remove("hidden");
}

function closeHudInfoModal() {
  const modal = document.getElementById("modal-hud-info");
  if (modal) modal.classList.add("hidden");
}

// ==================== HİKAYELİ EĞİTİM & BAŞLANGIÇ REHBERİ (TUTORIAL) ====================
let currentTutorialStep = 0;
const TUTORIAL_STEPS = [
  {
    title: "💥 Adım 1: Ağır Miras (500M ₺ Borç!)",
    coachQuote: "Sayın Başkanım kulübe hoş geldiniz ama durumumuz felaket! Bizden önceki yönetim kulübe tam 500.000.000 ₺ borç takıp kayıplara karıştı! Bankalar ve TFF kapıda. Her hafta düzenli kredi faizi ve futbolcu maaşları kasamızdan çekilecek.",
    detail: "Kulübü kayyuma ve mali iflasa sürüklenmekten kurtarmak için bütçe disiplinini sağlamalı, lüzumsuz yüksek maaşlı isimleri satmalı ve gelir getiren anlaşmalara odaklanmalısınız.",
    tip: "💡 İpucu: Kasa (Bütçe) sekmesinden haftalık net nakit akışını takip edin; eksiye düşmemek birincil önceliğinizdir!",
    icon: "💰"
  },
  {
    title: "⚽ Adım 2: Global FIFA Kadro & Taktik Düzeni",
    coachQuote: "Takım kadromuz uluslararası FIFA mevkilerine (GK, CB, LB, RB, DMF, CM, AMF, RW, LW, ST) göre düzenlenmiştir. İlk 11'de her zaman tam 1 Kaleci olmak zorundadır ve Süper Lig kuralı gereği en fazla 8 Yabancı sahada yer alabilir.",
    detail: "Kadro listesinde oyuncular mevkilerine göre (Kaleci ➔ Defans ➔ Orta Saha ➔ Forvet) düzenli sıralanır. Kafanız karıştığında tek tıkla 'Hoca 11'i Belirlesin' butonuna basabilirsiniz; ben sizin için en ideal kadroyu anında sahaya sürerim!",
    tip: "💡 İpucu: Kadro sekmesinden oyuncuları tek tıkla yedeğe çekebilir veya yedekten 11'e alabilirsiniz.",
    icon: "📋"
  },
  {
    title: "💼 Adım 3: Sponsorluklar & Nakit Akışı",
    coachQuote: "500 Milyon ₺ borcu eritmenin en temiz yolu sponsorluklardır. Göğüs, Sırt ve Stadyum İsim sponsorlukları sayesinde her hafta kasaya sıcak para akar ve peşin imza parası alırsınız.",
    detail: "Ancak unutmayın; dev holdingler şart koşar! Ligde üst sıralarda olmak, yüksek taraftar güveni ve stadyum doluluğu büyük sponsorların ana kriterleridir.",
    tip: "💡 İpucu: Sponsorluk sekmesine giderek şartlarını karşıladığınız firmalarla hemen sözleşme imzalayın!",
    icon: "🤝"
  },
  {
    title: "🏛️ Adım 4: Siyaset, Lobi & Cumhurbaşkanlığı Hibesi",
    coachQuote: "Büyük kulüp yönetmek yalnızca yeşil sahada değil, Ankara koridorlarında da güçlü olmayı gerektirir. Ankara ziyaretleri ve sosyal projelerle Siyasi Nüfuzunuzu %65'in üzerine çıkarabilirsiniz.",
    detail: "Zor günlerde Cumhurbaşkanlığı Makamından yılda 1 defa devasa can suyu hibesi talep etme hakkınız vardır. Bu hibe iflasın eşiğindeki kulübümüz için hayat kurtarıcıdır.",
    tip: "💡 İpucu: Siyasi lobi hamleleri muhalif taraftarları kızdırabilir; taraftar ve siyaset dengesini iyi gözetin.",
    icon: "🏛️"
  },
  {
    title: "🎲 Adım 5: Yeraltı Dünyası, Bahis & Sandık Zaferi",
    coachQuote: "Mali darboğazda karanlık güçler kapınızı çalabilir. Yeraltı bahis baronları maç manipülasyonu karşılığı milyonlar teklif eder. Kolay paradır ama TFF veya savcılık yakalarsa puan silme ve kayyumla kulüp batar!",
    detail: "Sezon sonunda 34. hafta bittiğinde kulüp üyelerinin karşısına sandığa çıkacaksınız. Kulübü borçtan kurtarıp şampiyon yaparsanız efsane başkan olarak tarihe geçersiniz!",
    tip: "💡 İpucu: Artık her şeyi biliyorsunuz! Koltuğunuza oturun ve büyük maceraya başlayın!",
    icon: "🏆"
  }
];

function openStoryTutorial(force = false) {
  const modal = document.getElementById("modal-story-tutorial");
  if (!modal) return;
  currentTutorialStep = 0;
  renderStoryTutorialStep();
  modal.classList.remove("hidden");
}

function closeStoryTutorial() {
  const modal = document.getElementById("modal-story-tutorial");
  if (modal) modal.classList.add("hidden");
  try {
    localStorage.setItem("baskan_story_tutorial_seen", "true");
  } catch (e) {}
}

function skipStoryTutorial() {
  closeStoryTutorial();
  showToast("⏩ Eğitim atlandı. İstediğiniz an Ayarlar menüsünden tekrar izleyebilirsiniz!");
}

function renderStoryTutorialStep() {
  const step = TUTORIAL_STEPS[currentTutorialStep];
  if (!step) return;

  const titleEl = document.getElementById("tutorial-step-title");
  const contentEl = document.getElementById("tutorial-step-content");
  const tipEl = document.getElementById("tutorial-step-tip");
  const coachImg = document.getElementById("tutorial-coach-photo");
  const coachNameEl = document.getElementById("tutorial-coach-name");
  const dotsContainer = document.getElementById("tutorial-step-dots");
  const prevBtn = document.getElementById("tutorial-prev-btn");
  const nextBtn = document.getElementById("tutorial-next-btn");

  if (gameState && gameState.coach) {
    if (coachImg) coachImg.src = gameState.coach.photo || "/static/coach_thomas_reis.png";
    if (coachNameEl) coachNameEl.innerText = gameState.coach.name || "Teknik Direktör";
  }

  if (titleEl) titleEl.innerHTML = `<span>${step.icon}</span> <span>${step.title}</span>`;
  if (contentEl) {
    contentEl.innerHTML = `
      <p class="italic text-amber-200/90 font-medium">"${step.coachQuote}"</p>
      <p class="text-slate-300 mt-2">${step.detail}</p>
    `;
  }
  if (tipEl) {
    tipEl.innerHTML = `<span class="text-amber-400 text-xs">⚡</span> <span>${step.tip}</span>`;
  }

  // Step dots
  if (dotsContainer) {
    dotsContainer.innerHTML = TUTORIAL_STEPS.map((s, idx) => `
      <div class="h-2 rounded-full transition-all ${
        idx === currentTutorialStep ? 'w-6 bg-amber-400' : 'w-2 bg-slate-700'
      }"></div>
    `).join("");
  }

  // Prev / Next button state
  if (prevBtn) {
    prevBtn.style.display = currentTutorialStep === 0 ? "none" : "block";
  }
  if (nextBtn) {
    if (currentTutorialStep === TUTORIAL_STEPS.length - 1) {
      nextBtn.innerHTML = `<span>Başkanlık Koltuğuna Otur! 🏆</span>`;
      nextBtn.className = "px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1";
    } else {
      nextBtn.innerHTML = `<span>İleri</span> <span>➔</span>`;
      nextBtn.className = "px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all flex items-center gap-1";
    }
  }
}

function nextStoryTutorialStep() {
  if (currentTutorialStep < TUTORIAL_STEPS.length - 1) {
    currentTutorialStep++;
    renderStoryTutorialStep();
  } else {
    closeStoryTutorial();
    showToast("🎉 Büyük Başkan göreve başladı! Bol şanslar!");
  }
}

function prevStoryTutorialStep() {
  if (currentTutorialStep > 0) {
    currentTutorialStep--;
    renderStoryTutorialStep();
  }
}

function checkAutoTutorial() {
  try {
    const seen = localStorage.getItem("baskan_story_tutorial_seen");
    if (!seen) {
      setTimeout(() => {
        openStoryTutorial();
      }, 700);
    }
  } catch (e) {}
}

// ==================== GÜNLÜK GİRİŞ ÖDÜLÜ SİSTEMİ ====================
async function checkDailyRewardClaim() {
  if (!gameState || !gameState.is_started) return;
  const nowTs = Math.floor(Date.now() / 1000);
  const lastClaim = gameState.last_daily_claim || 0;
  // 24 saat = 86400 saniye
  if (nowTs - lastClaim >= 86400) {
    promptDailyRewardClaim();
  } else {
    const inlineContainer = document.getElementById("daily-reward-inline-container");
    if (inlineContainer) {
      inlineContainer.classList.add("hidden");
      inlineContainer.innerHTML = "";
    }
  }
}

function promptDailyRewardClaim() {
  const inlineContainer = document.getElementById("daily-reward-inline-container");
  if (!inlineContainer) return;

  inlineContainer.classList.remove("hidden");
  inlineContainer.innerHTML = `
    <div id="daily-reward-card" class="w-full bg-gradient-to-r from-amber-950 via-amber-900 to-amber-800 border-2 border-amber-400 p-2.5 sm:p-3 rounded-2xl shadow-xl flex flex-row items-center justify-between gap-2 transition-all">
      <div class="flex items-center gap-2 min-w-0 flex-1">
        <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-lg sm:text-xl flex-shrink-0">
          🎁
        </div>
        <div class="min-w-0 flex-1">
          <div class="font-black text-[11px] sm:text-xs text-white uppercase tracking-wide truncate">GÜNLÜK ÖDÜL!</div>
          <div class="text-[9px] sm:text-[10px] text-amber-200 font-semibold truncate">+5.000.000 ₺ Kasa Desteği</div>
        </div>
      </div>
      <button id="btn-claim-daily" onclick="claimDailyReward(this)" class="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black text-[11px] sm:text-xs shadow-md transition-all flex items-center gap-1 flex-shrink-0 whitespace-nowrap">
        <span>Hemen Al</span> <span>➔</span>
      </button>
    </div>
  `;
}

async function claimDailyReward(btnEl) {
  const btn = btnEl || document.getElementById("btn-claim-daily");
  if (btn) {
    btn.disabled = true;
    btn.innerText = "Alınıyor...";
  }
  const inlineContainer = document.getElementById("daily-reward-inline-container");

  try {
    const res = await apiFetch("/api/daily-reward/claim", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Ödül alınamadı!");
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Hemen Al ➔";
      }
      return;
    }
    if (inlineContainer) {
      inlineContainer.classList.add("hidden");
      inlineContainer.innerHTML = "";
    }
    gameState = data.state;
    renderUI();
    showToast(data.message || "🎉 5.000.000 ₺ Günlük Giriş Ödülü Kasaya Eklendi!");
  } catch (e) {
    console.error(e);
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Hemen Al ➔";
    }
  }
}

// ==================== KULÜP GELİŞTİRME & PASİF GELİR SKILL AĞACI ====================
async function openClubUpgradesModal() {
  const modal = document.getElementById("modal-club-upgrades");
  const listEl = document.getElementById("club-upgrades-list");
  if (!modal || !listEl) return;

  listEl.innerHTML = '<div class="text-slate-400 text-xs text-center py-4">Tesis verileri yükleniyor...</div>';
  modal.classList.remove("hidden");

  try {
    const res = await apiFetch("/api/club/upgrades");
    const data = await res.json();
    const upgrades = data.upgrades;

    listEl.innerHTML = "";
    Object.keys(upgrades).forEach(branch => {
      const u = upgrades[branch];
      const isMax = u.level >= u.max_level;
      const canAfford = u.can_upgrade;

      let icon = "🏢";
      if (branch === "stadium") icon = "🏟️";
      else if (branch === "transit") icon = "🚇";
      else if (branch === "merch") icon = "👕";
      else if (branch === "academy") icon = "🌱";
      else if (branch === "broadcast") icon = "📡";

      // Seviye çubuğu noktaları (5 seviye)
      const levelDots = Array.from({ length: 5 }, (_, i) => `
        <span class="w-3 h-3 rounded-full inline-block ${i < u.level ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-slate-700'}"></span>
      `).join("");

      const item = document.createElement("div");
      item.className = "bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-2";
      item.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-lg">${icon}</span>
            <div>
              <div class="text-xs font-bold text-white">${u.title}</div>
              <div class="text-[10px] text-slate-400">${u.desc}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-emerald-400 font-black">Seviye ${u.level} / ${u.max_level}</div>
            <div class="flex items-center gap-1 mt-1 justify-end">${levelDots}</div>
          </div>
        </div>
        <div class="flex items-center justify-between pt-1 border-t border-slate-800/60">
          <div class="text-[10px] text-slate-300">
            ${isMax ? '<span class="text-emerald-400 font-bold">✓ MAKSİMUM SEVİYEYE ULAŞILDI</span>' : `Yükseltme Bedeli: <strong class="text-amber-400 font-bold">${formatMoney(u.next_cost)}</strong>`}
          </div>
          ${!isMax ? `
            <button onclick="upgradeClubBranch('${branch}')" ${!canAfford ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              canAfford ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md' : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }">
              ${canAfford ? 'Seviye Yükselt ⬆' : 'Yetersiz Bütçe'}
            </button>
          ` : ''}
        </div>
      `;
      listEl.appendChild(item);
    });
  } catch (e) {
    console.error(e);
  }
}

function closeClubUpgradesModal() {
  const modal = document.getElementById("modal-club-upgrades");
  if (modal) modal.classList.add("hidden");
}

async function upgradeClubBranch(branch) {
  try {
    const res = await apiFetch("/api/club/upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch: branch })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Geliştirme başarısız!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
    openClubUpgradesModal(); // Arayüzü yenile
  } catch (e) {
    console.error(e);
  }
}

// ==================== MAÇ ÖNCESİ ETKİNLİK & KONSER DÜZENLEME ====================
function openPreMatchEventModal() {
  const modal = document.getElementById("modal-pre-match-event");
  if (modal) modal.classList.remove("hidden");
}

function closePreMatchEventModal() {
  const modal = document.getElementById("modal-pre-match-event");
  if (modal) modal.classList.add("hidden");
}

async function organizePreMatchEvent(eventType) {
  closePreMatchEventModal();
  try {
    const res = await apiFetch("/api/events/organize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_type: eventType })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Etkinlik düzenlenemedi!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
  }
}

// ==================== MAÇ SONRASI BASIN TOPLANTISI ====================
function togglePostMatchPressBox() {
  const box = document.getElementById("post-match-press-box");
  if (!box) return;
  box.classList.toggle("hidden");
  if (!box.classList.contains("hidden")) {
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

async function submitPressStatement(stmtType) {
  const box = document.getElementById("post-match-press-box");
  if (box) box.classList.add("hidden");

  try {
    const res = await apiFetch("/api/match/press-statement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statement_type: stmtType })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Açıklama yapılamadı!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
  } catch (e) {
    console.error(e);
  }
}

// ==================== DİNAMİK SPONSORLUK TEKLİFLERİ ====================
async function loadSponsorOffers() {
  const container = document.getElementById("incoming-sponsors-list");
  if (!container) return;
  try {
    const res = await apiFetch("/api/sponsors/offers");
    const offers = await res.json();
    container.innerHTML = "";
    if (!offers || offers.length === 0) {
      container.innerHTML = '<div class="text-[10px] text-slate-500 italic p-2 bg-slate-900/50 rounded-lg text-center">Şu an masada bekleyen yeni sponsorluk teklifi yok. Her hafta yeni teklifler ulaşabilir.</div>';
      return;
    }

    offers.forEach(o => {
      const card = document.createElement("div");
      card.className = "bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 border border-slate-800 hover:border-amber-500/40 p-3 rounded-xl space-y-2 transition-all shadow-sm";
      const slotName = o.slot === 'chest' ? 'Göğüs Sponsoru' :
                       o.slot === 'stadium' ? 'Stadyum İsim Hakkı' :
                       o.slot === 'arm' ? 'Forma Kol / Şort' : 'Sırt / Forma Arkası';
      card.innerHTML = `
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-extrabold text-white text-xs">${o.brand}</span>
              <span class="text-[9px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.2 rounded border border-amber-500/30">${slotName}</span>
              ${o.is_bargained ? '<span class="text-[8px] bg-blue-900/40 text-blue-300 font-black px-1 rounded border border-blue-700/40">PAZARLIK YAPILDI</span>' : ''}
            </div>
            <div class="text-[10px] text-slate-400 mt-0.5">${o.desc || 'Prestijli kurumsal ortaklık'}</div>
          </div>
          <div class="text-right">
            <div class="text-xs font-black text-emerald-400 font-mono">${formatMoney(o.amount)}</div>
            <div class="text-[9px] text-slate-400 font-medium">+${formatMoney(o.upfront_cash)} Peşin</div>
          </div>
        </div>
        <div class="text-[9px] text-amber-300/90 bg-amber-950/30 p-1.5 rounded border border-amber-800/30">
          <strong>Özel Madde:</strong> ${o.bonus_clause || 'Lig şampiyonluğunda ek prim'}
        </div>
        <div class="flex items-center gap-1.5 pt-1 border-t border-slate-800/60 justify-end">
          <button onclick="respondSponsorOffer('${o.id}', 'reject')" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-400 font-bold text-[10px] border border-slate-700/60 transition-all">
            Reddet
          </button>
          ${!o.is_bargained ? `
            <button onclick="respondSponsorOffer('${o.id}', 'bargain')" class="px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 font-bold text-[10px] border border-blue-500/50 transition-all">
              Pazarlık Et (+%15)
            </button>
          ` : ''}
          <button onclick="respondSponsorOffer('${o.id}', 'accept')" class="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] shadow-sm transition-all">
            Kabul Et & İmzala
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  } catch (e) {
    console.error("loadSponsorOffers error:", e);
  }
}

async function respondSponsorOffer(offerId, action) {
  try {
    const res = await apiFetch("/api/sponsors/respond", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer_id: offerId, action: action })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "İşlem başarısız!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
    loadSponsors();
    loadSponsorOffers();
  } catch (e) {
    console.error(e);
    showToast("Sunucu hatası!");
  }
}

// ==================== TAKTİK & KÜLTÜR SKILL AĞACI ====================
let _tacticalSkillsData = null;

async function openTacticalSkillsModal() {
  const modal = document.getElementById("modal-tactical-skills");
  if (!modal) return;
  modal.classList.remove("hidden");
  await renderTacticalSkillsTree();
}

function closeTacticalSkillsModal() {
  const modal = document.getElementById("modal-tactical-skills");
  if (modal) modal.classList.add("hidden");
}

async function renderTacticalSkillsTree() {
  const listEl = document.getElementById("tactical-skills-tree-list");
  const tpBadge = document.getElementById("tactical-tp-badge");
  if (!listEl) return;
  listEl.innerHTML = '<div class="text-slate-400 text-xs text-center py-4">Taktik yetenekler yükleniyor...</div>';

  try {
    const res = await apiFetch("/api/skills/tree");
    const data = await res.json();
    _tacticalSkillsData = data;

    if (tpBadge) tpBadge.innerText = `${data.mastery_points || 0} TP`;
    const offBadge = document.getElementById("badge-mastery-pts");
    if (offBadge) offBadge.innerText = `${data.mastery_points || 0} TP`;

    listEl.innerHTML = "";

    const tiers = [1, 2, 3, 4];
    const tierTitles = {
      1: "Tier 1: Tribün & Temel Kültür Yetenekleri",
      2: "Tier 2: Sahaiçi Taktik & Blok Organizasyonları",
      3: "Tier 3: Liderlik & Kondisyon Zirvesi",
      4: "Tier 4: Efsanevi Derbi Zirve Becerisi (Son Dk Canavarı)"
    };

    tiers.forEach(tier => {
      const skillsInTier = (data.skills || []).filter(s => s.tier === tier);
      if (skillsInTier.length === 0) return;

      const groupHeader = document.createElement("div");
      groupHeader.className = "text-[10px] uppercase font-black text-amber-400/90 tracking-wider pt-2 border-t border-slate-800/80 flex items-center justify-between";
      groupHeader.innerHTML = `<span>${tierTitles[tier]}</span> <span class="text-[9px] text-slate-500 font-bold">${skillsInTier.length} Yetenek</span>`;
      listEl.appendChild(groupHeader);

      skillsInTier.forEach(sk => {
        const isUnlocked = sk.is_unlocked;
        const canUnlock = sk.can_unlock;
        const card = document.createElement("div");
        card.className = `p-3 rounded-xl border transition-all ${
          isUnlocked
            ? "bg-amber-950/20 border-amber-500/60 shadow-sm"
            : canUnlock
            ? "bg-slate-900/90 border-slate-700 hover:border-amber-400/60"
            : "bg-slate-950/60 border-slate-800/60 opacity-60"
        } space-y-2`;

        let actionBtn = "";
        if (isUnlocked) {
          actionBtn = `<span class="px-3 py-1 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-600/40 text-[10px] font-black">✓ AKTİF (AÇILDI)</span>`;
        } else if (canUnlock) {
          actionBtn = `<button onclick="unlockTacticalSkill('${sk.id}')" class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-[10px] shadow-sm transition-all">
            Yeteneği Aç (${sk.cost} TP)
          </button>`;
        } else {
          actionBtn = `<button disabled class="px-3 py-1 rounded-lg bg-slate-800 text-slate-500 border border-slate-700 font-bold text-[10px] cursor-not-allowed">
            ${sk.reason_locked || 'Kilitli'}
          </button>`;
        }

        card.innerHTML = `
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl p-1.5 rounded-lg bg-slate-950 border border-slate-800">${sk.icon || '⚡'}</span>
              <div>
                <div class="text-xs font-black text-white flex items-center gap-2">
                  <span>${sk.name}</span>
                  <span class="text-[9px] px-1.5 py-0.2 rounded font-bold font-mono ${isUnlocked ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'}">${sk.cost} TP</span>
                </div>
                <div class="text-[10px] text-amber-200/90 font-medium mt-0.5">${sk.effect}</div>
              </div>
            </div>
            <div class="flex-shrink-0">
              ${actionBtn}
            </div>
          </div>
          <div class="text-[10px] text-slate-400 pt-1 border-t border-slate-800/40">
            ${sk.desc}
          </div>
        `;
        listEl.appendChild(card);
      });
    });
    lucide.createIcons();
  } catch (e) {
    console.error("renderTacticalSkillsTree error:", e);
  }
}

async function unlockTacticalSkill(skillId) {
  try {
    const res = await apiFetch("/api/skills/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skill_id: skillId })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Yetenek açılamadı!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
    await renderTacticalSkillsTree();
  } catch (e) {
    console.error(e);
    showToast("Sunucu hatası!");
  }
}

// ==================== OYUNCU KİRALAMA SİSTEMİ ====================
let _loanSubTab = "eligible";
let _loanListData = null;

async function openPlayerLoanModal() {
  const modal = document.getElementById("modal-player-loan");
  if (!modal) return;
  modal.classList.remove("hidden");
  await loadPlayerLoans();
}

function closePlayerLoanModal() {
  const modal = document.getElementById("modal-player-loan");
  if (modal) modal.classList.add("hidden");
}

function switchLoanSubTab(tab) {
  _loanSubTab = tab;
  const btnEligible = document.getElementById("btn-loan-subtab-eligible");
  const btnActive = document.getElementById("btn-loan-subtab-active");
  const viewEligible = document.getElementById("loan-eligible-view");
  const viewActive = document.getElementById("loan-active-view");

  if (tab === "eligible") {
    btnEligible.className = "flex-1 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs text-center transition-all";
    btnActive.className = "flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold text-xs text-center hover:bg-slate-700 transition-all";
    viewEligible.classList.remove("hidden");
    viewActive.classList.add("hidden");
  } else {
    btnActive.className = "flex-1 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs text-center transition-all";
    btnEligible.className = "flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold text-xs text-center hover:bg-slate-700 transition-all";
    viewActive.classList.remove("hidden");
    viewEligible.classList.add("hidden");
  }
}

async function loadPlayerLoans() {
  const eligibleView = document.getElementById("loan-eligible-view");
  const activeView = document.getElementById("loan-active-view");
  const eligibleCountEl = document.getElementById("loan-eligible-count");
  const activeCountEl = document.getElementById("loan-active-count");

  try {
    const res = await apiFetch("/api/players/loan-list");
    const data = await res.json();
    _loanListData = data;

    const eligible = data.eligible || [];
    const activeLoans = data.active_loans || [];
    const potClubs = data.potential_clubs || ["Gençlerbirliği", "Sakaryaspor", "Amedspor", "Kocaelispor"];

    if (eligibleCountEl) eligibleCountEl.innerText = eligible.length;
    if (activeCountEl) activeCountEl.innerText = activeLoans.length;

    // Render Eligible
    if (eligibleView) {
      eligibleView.innerHTML = "";
      if (eligible.length === 0) {
        eligibleView.innerHTML = '<div class="text-[11px] text-slate-500 italic p-4 text-center">Şu an kiralığa gönderilebilecek genç oyuncu bulunmuyor (İlk 11 as oyuncuları kiralanamaz, 23 yaş ve altı yedekler kiralığa uygundur).</div>';
      } else {
        eligible.forEach(p => {
          const card = document.createElement("div");
          card.className = "bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3 text-xs";
          const clubOptions = potClubs.map(c => `<option value="${c}">${c}</option>`).join("");
          card.innerHTML = `
            <div class="min-w-0 flex-1">
              <div class="font-bold text-white flex items-center gap-2">
                <span>${p.name}</span>
                <span class="text-[10px] bg-blue-950/80 text-blue-300 px-1.5 py-0.2 rounded font-bold">${p.position}</span>
                <span class="text-[10px] bg-slate-800 text-amber-400 px-1.5 py-0.2 rounded font-black">${p.overall} OVR</span>
              </div>
              <div class="text-[10px] text-slate-400 mt-1">
                Yaş: <strong class="text-slate-200">${p.age}</strong> • Maaş: <strong class="text-slate-200">${formatMoney(p.salary)}/Hf</strong> • Potansiyel: <strong class="text-emerald-400">+1-3 OVR Gelişim</strong>
              </div>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <select id="select-loan-club-${p.id}" class="bg-slate-950 border border-slate-700 text-slate-200 text-[10px] rounded px-2 py-1 font-medium focus:outline-none">
                ${clubOptions}
              </select>
              <button onclick="loanOutPlayer(${p.id})" class="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] transition-all shadow-sm">
                Kirala →
              </button>
            </div>
          `;
          eligibleView.appendChild(card);
        });
      }
    }

    // Render Active Loans
    if (activeView) {
      activeView.innerHTML = "";
      if (activeLoans.length === 0) {
        activeView.innerHTML = '<div class="text-[11px] text-slate-500 italic p-4 text-center">Şu an başka bir kulüpte kiralıkta olan oyuncumuz yok.</div>';
      } else {
        activeLoans.forEach(p => {
          const card = document.createElement("div");
          card.className = "bg-slate-900 border border-blue-900/60 p-3 rounded-xl flex items-center justify-between gap-3 text-xs";
          const ovrDiff = (p.overall || 70) - (p.original_ovr || p.overall || 70);
          const diffText = ovrDiff > 0 ? `<span class="text-emerald-400 font-bold">(+${ovrDiff} OVR)</span>` : '';
          card.innerHTML = `
            <div class="min-w-0 flex-1">
              <div class="font-bold text-white flex items-center gap-2">
                <span>${p.name}</span>
                <span class="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-bold">${p.position}</span>
                <span class="text-[10px] bg-emerald-950 text-emerald-400 px-1.5 py-0.2 rounded font-black">${p.overall} OVR ${diffText}</span>
              </div>
              <div class="text-[10px] text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                <span>Kulüp: <strong class="text-amber-300">${p.loan_club}</strong></span>
                <span>• Maç: <strong class="text-white">${p.loan_matches_played || 0}</strong> (${p.loan_minutes_played || 0} Dk)</span>
                <span>• Kalan: <strong class="text-blue-300">${p.loan_weeks_left || 0} Hafta</strong></span>
              </div>
            </div>
            <div class="flex-shrink-0">
              <button onclick="recallLoanPlayer(${p.id})" class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-[10px] border border-amber-500/40 transition-all">
                Geri Çağır ↩
              </button>
            </div>
          `;
          activeView.appendChild(card);
        });
      }
    }
  } catch (e) {
    console.error("loadPlayerLoans error:", e);
  }
}

async function loanOutPlayer(playerId) {
  const sel = document.getElementById(`select-loan-club-${playerId}`);
  const clubName = sel ? sel.value : "Sakaryaspor";
  try {
    const res = await apiFetch("/api/players/loan-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId, club: clubName, duration_weeks: 15 })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Oyuncu kiralanamadı!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
    await loadPlayerLoans();
  } catch (e) {
    console.error(e);
    showToast("Sunucu hatası!");
  }
}

async function recallLoanPlayer(playerId) {
  try {
    const res = await apiFetch("/api/players/recall-loan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.detail || "Oyuncu geri çağrılamadı!");
      return;
    }
    showToast(data.message);
    gameState = data.state;
    renderUI();
    await loadPlayerLoans();
  } catch (e) {
    console.error(e);
    showToast("Sunucu hatası!");
  }
}
