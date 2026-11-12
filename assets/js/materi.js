/* =========================================================
   Indonesia Kompeten — Materi Pelatihan (halaman peserta)
   ---------------------------------------------------------
   Halaman ini hanya untuk MENCARI dan MENGAKSES materi.
   Pengelolaan folder dan tautan materi dilakukan di Panel Admin.

   Sumber materi:
   1. content.json (dikelola dari Panel Admin)
   2. materi.json (data lama, tetap didukung)
   ========================================================= */

(function () {
  "use strict";

  const CONFIG = {
    // Folder default bila belum diisi melalui Panel Admin.
    folders: {
      kkni: "",
      pariwisata: "",
      golf: "",
      digital: "",
      karir: "",
    },
  };

  const CONTENT_URL = new URL("../data/content.json", document.currentScript.src).href;
  const LEGACY_MATERIALS_URL = new URL("../data/materi.json", document.currentScript.src).href;

  let cmsMaterials = [];
  let liveMaterialsReceived = false;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function programs() {
    return (window.IK_PELATIHAN && window.IK_PELATIHAN.programs) || [];
  }

  function getProgram(id) {
    return programs().find((program) => program.id === id) || null;
  }

  function programOptions() {
    return programs().map((program) => ({ value: program.id, label: program.title }));
  }

  function fillSelect(select, options, placeholder) {
    if (!select) return;
    select.innerHTML =
      `<option value="">${esc(placeholder)}</option>` +
      options
        .map((option) => `<option value="${esc(option.value)}">${esc(option.label)}</option>`)
        .join("");
  }

  function levelPlaceholder(program) {
    const label = String((program && program.optionsLabel) || "level").replace(/^pilih\s+/i, "");
    return `Pilih ${label.toLowerCase()}`;
  }

  function fillLevels(select, program, placeholder) {
    if (!select) return;
    if (!program || !program.options.length) {
      const text = placeholder || "Semua level / sub-program";
      select.innerHTML = `<option value="">${esc(text)}</option>`;
      select.disabled = true;
      return;
    }
    select.disabled = false;
    fillSelect(select, program.options, placeholder || levelPlaceholder(program));
  }

  /* ---------- Google Drive ---------- */
  function driveFolderId(value) {
    const text = String(value || "").trim();
    if (!text) return "";

    let match = text.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    match = text.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match) return match[1];

    if (/^[a-zA-Z0-9_-]{15,}$/.test(text)) return text;
    return "";
  }

  function driveFolderUrl(id) {
    return id ? `https://drive.google.com/drive/folders/${encodeURIComponent(id)}` : "";
  }

  function isDriveLink(value) {
    return /^https:\/\/(drive|docs)\.google\.com\//i.test(String(value || "").trim());
  }

  function siteFolderFor(programId) {
    const site = window.IK && window.IK.SITE;
    if (!site) return "";
    const key = "driveFolder" + programId.charAt(0).toUpperCase() + programId.slice(1);
    return String(site[key] || "").trim();
  }

  function folderFor(programId) {
    return String(CONFIG.folders[programId] || "").trim() || siteFolderFor(programId);
  }

  function folderIdFor(programId) {
    return driveFolderId(folderFor(programId));
  }

  function setupDriveUI() {
    const programSelect = document.getElementById("driveProgram");
    if (!programSelect) return;

    const levelSelect = document.getElementById("driveLevel");
    const frame = document.getElementById("driveFrame");
    const placeholder = document.getElementById("drivePlaceholder");
    const openLink = document.getElementById("driveOpen");

    fillSelect(programSelect, programOptions(), "Pilih program pelatihan");

    function currentProgram() {
      return getProgram(programSelect.value);
    }

    function updateViewer() {
      const program = currentProgram();
      const programId = program ? program.id : "";
      const id = programId ? folderIdFor(programId) : "";
      const url = driveFolderUrl(id);

      if (frame) {
        if (id) {
          const embed = `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(id)}#list`;
          if (frame.getAttribute("src") !== embed) frame.setAttribute("src", embed);
          frame.hidden = false;
        } else {
          frame.removeAttribute("src");
          frame.hidden = true;
        }
      }

      if (placeholder) {
        placeholder.hidden = Boolean(id);
        if (!id) {
          placeholder.innerHTML = program
            ? `<strong>Materi ${esc(program.badge)} belum tersedia.</strong>
               <span>Materi pelatihan untuk program ini belum ditautkan oleh pengelola. Silakan hubungi admin atau cek kembali nanti.</span>`
            : "<strong>Pilih program pelatihan</strong><span>Daftar materi Google Drive akan tampil setelah program dipilih.</span>";
        }
      }

      if (openLink) {
        openLink.hidden = !id;
        openLink.href = url || "#";
        openLink.target = "_blank";
        openLink.rel = "noopener";
      }

      const title = program ? program.title : "Materi Pelatihan";
      if (frame) frame.title = `Daftar materi Google Drive — ${title}`;
    }

    programSelect.addEventListener("change", () => {
      const program = currentProgram();
      fillLevels(levelSelect, program, "Semua level / sub-program");
      if (levelSelect) {
        levelSelect.value = "";
        levelSelect.disabled = false;
      }
      updateViewer();
    });

    if (levelSelect) {
      levelSelect.addEventListener("change", () => {
        const programFilter = document.getElementById("materiFilterProgram");
        const levelFilter = document.getElementById("materiFilterLevel");
        const program = currentProgram();
        if (programFilter && program) programFilter.value = program.id;
        if (levelFilter) {
          fillLevels(levelFilter, program, "Semua level / sub-program");
          levelFilter.disabled = false;
          levelFilter.value = levelSelect.value;
        }
        renderMaterials();
      });
    }

    document.addEventListener("ik:site-settings", updateViewer);
    updateViewer();
  }

  /* ---------- Daftar materi ---------- */
  function normalizeMaterial(item, index) {
    if (!item || typeof item !== "object") return null;
    const title = String(item.title || "").trim();
    const url = String(item.url || "").trim();
    if (!title || !isDriveLink(url)) return null;
    return {
      id: String(item.id || `mat-${index + 1}`),
      title,
      program: String(item.program || ""),
      level: String(item.level || ""),
      url,
      description: String(item.description || "").trim(),
      createdAt: String(item.createdAt || ""),
    };
  }

  function normalizeList(list) {
    if (!Array.isArray(list)) return [];
    return list.map(normalizeMaterial).filter(Boolean);
  }

  function uniqueMaterials(list) {
    const seen = new Set();
    const result = [];
    list.forEach((item) => {
      const key = item.url.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      result.push(item);
    });
    return result;
  }

  async function fetchJson(url) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return null;
      return await response.json();
    } catch (_) {
      return null;
    }
  }

  async function loadPublishedMaterials() {
    const [content, legacy] = await Promise.all([
      fetchJson(CONTENT_URL),
      fetchJson(LEGACY_MATERIALS_URL),
    ]);

    const fromContent = content && Array.isArray(content.materials) ? content.materials : [];
    const fromLegacy = legacy && (Array.isArray(legacy) ? legacy : legacy.materials);
    return uniqueMaterials([
      ...normalizeList(fromContent),
      ...normalizeList(fromLegacy),
    ]);
  }

  function renderMaterials() {
    const list = document.getElementById("materiList");
    if (!list) return;

    const programFilter = document.getElementById("materiFilterProgram");
    const levelFilter = document.getElementById("materiFilterLevel");
    const searchInput = document.getElementById("materiSearch");
    const empty = document.getElementById("materiEmpty");
    const count = document.getElementById("materiCount");

    const programValue = programFilter ? programFilter.value : "";
    const levelValue = levelFilter ? levelFilter.value : "";
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

    const items = cmsMaterials.filter((item) => {
      if (programValue && item.program !== programValue) return false;
      if (levelValue && item.level !== levelValue) return false;
      if (query) {
        const haystack = `${item.title} ${item.description} ${item.level} ${item.program}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    if (count) {
      count.textContent = `${items.length} materi`;
    }

    list.innerHTML = items
      .map((item) => {
        const program = getProgram(item.program);
        const programLabel = program ? program.badge : "Materi";
        return `
          <article class="card materi-card">
            <div class="materi-card-top">
              <span class="program-badge program-badge--${esc(program ? program.tone : "blue")}">${esc(programLabel)}</span>
              ${item.createdAt ? `<span class="materi-date">${esc(formatDate(item.createdAt))}</span>` : ""}
            </div>
            <h3>${esc(item.title)}</h3>
            ${item.level ? `<p class="materi-level">${esc(item.level)}</p>` : ""}
            ${item.description ? `<p>${esc(item.description)}</p>` : ""}
            <a class="btn btn-ghost btn-sm" href="${esc(item.url)}" target="_blank" rel="noopener">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3h7v7"/><path d="M21 3 10 14"/><path d="M21 14v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h6"/></svg>
              Buka Materi di Google Drive
            </a>
          </article>`;
      })
      .join("");

    if (empty) empty.hidden = items.length !== 0;
  }

  function setupMaterialFilters() {
    const programFilter = document.getElementById("materiFilterProgram");
    if (!programFilter) return;

    const levelFilter = document.getElementById("materiFilterLevel");
    const searchInput = document.getElementById("materiSearch");

    fillSelect(programFilter, programOptions(), "Semua program");
    fillLevels(levelFilter, null, "Semua level / sub-program");
    if (levelFilter) levelFilter.disabled = false;

    renderMaterials();

    programFilter.addEventListener("change", () => {
      const program = getProgram(programFilter.value);
      fillLevels(levelFilter, program, "Semua level / sub-program");
      if (levelFilter) {
        levelFilter.value = "";
        levelFilter.disabled = false;
      }
      renderMaterials();
    });

    if (levelFilter) levelFilter.addEventListener("change", renderMaterials);
    if (searchInput) searchInput.addEventListener("input", renderMaterials);
  }

  function formatDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    } catch (_) {
      return "";
    }
  }

  function applyLiveMaterials(list) {
    cmsMaterials = uniqueMaterials(normalizeList(list));
    liveMaterialsReceived = true;
    renderMaterials();
  }

  async function init() {
    setupDriveUI();
    setupMaterialFilters();

    // Tampilkan materi dari draft lokal Panel Admin lebih dulu (jika ada).
    const seed = (window.IK && Array.isArray(window.IK.MATERIALS) && window.IK.MATERIALS)
      || (Array.isArray(window.IK_MATERIALS_SEED) ? window.IK_MATERIALS_SEED : []);
    cmsMaterials = uniqueMaterials(normalizeList(seed));
    renderMaterials();

    document.addEventListener("ik:materials", (event) => {
      const detail = event.detail || {};
      const list = detail.materials;
      // Abaikan event kosong dari draft lama yang belum pernah mengelola materi,
      // agar materi hasil publikasi tetap dapat dimuat dari content.json.
      if (detail.managed === true || (Array.isArray(list) && list.length)) {
        applyLiveMaterials(list);
      }
    });

    const published = await loadPublishedMaterials();
    if (!liveMaterialsReceived && published.length) {
      cmsMaterials = published;
      renderMaterials();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();