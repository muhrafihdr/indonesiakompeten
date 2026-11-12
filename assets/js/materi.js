/* =========================================================
   Indonesia Kompeten — Materi Pelatihan & Google Drive
   ---------------------------------------------------------
   Materi disimpan di Google Drive. Halaman ini:
   1. Menampilkan isi folder Google Drive per program.
   2. Membuka folder Drive untuk mengunggah materi.
   3. Menampilkan daftar materi dari assets/data/materi.json
      dan tambahan tautan yang disimpan di peramban.

   PENGELOLA: isi folder Google Drive pada objek CONFIG di
   bawah ini (atau gunakan tombol "Atur Folder" di halaman).
   ========================================================= */

(function () {
  "use strict";

  const CONFIG = {
    // Tempelkan ID folder atau URL folder Google Drive untuk tiap program.
    // Contoh: "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp"
    folders: {
      kkni: "",
      pariwisata: "",
      golf: "",
      digital: "",
      karir: "",
    },
  };

  const FOLDER_STORAGE = "ik_drive_folders_v1";
  const MATERI_STORAGE = "ik_materi_v1";
  const MATERIALS_URL = new URL("../data/materi.json", document.currentScript.src).href;

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

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {
      /* Mode penyimpanan lokal bisa saja diblokir; UI tetap berjalan. */
    }
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
    const text = String(value || "").trim();
    return /^https:\/\/(drive|docs)\.google\.com\//i.test(text);
  }

  function folderOverrides() {
    const data = readJson(FOLDER_STORAGE, {});
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  }

  function siteFolderFor(programId) {
    const site = window.IK && window.IK.SITE;
    if (!site) return "";
    const key = "driveFolder" + programId.charAt(0).toUpperCase() + programId.slice(1);
    return String(site[key] || "").trim();
  }

  function folderFor(programId) {
    const overrides = folderOverrides();
    if (Object.prototype.hasOwnProperty.call(overrides, programId)) {
      return String(overrides[programId] || "").trim();
    }
    const configured = String(CONFIG.folders[programId] || "").trim();
    return configured || siteFolderFor(programId);
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
    const uploadLink = document.getElementById("driveUpload");
    const configToggle = document.getElementById("driveConfigToggle");
    const configBox = document.getElementById("driveConfig");
    const folderInput = document.getElementById("driveFolderInput");
    const saveButton = document.getElementById("driveConfigSave");
    const clearButton = document.getElementById("driveConfigClear");
    const configStatus = document.getElementById("driveConfigStatus");

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
            ? `<strong>Folder Google Drive untuk ${esc(program.badge)} belum diatur.</strong>
               <span>Klik <em>Atur Folder</em> lalu tempelkan tautan folder Google Drive program ini. Setelah itu daftar materi akan tampil di sini.</span>`
            : "<strong>Pilih program pelatihan</strong><span>Daftar materi Google Drive akan tampil setelah program dipilih.</span>";
        }
      }

      if (openLink) {
        openLink.href = url || "https://drive.google.com/drive/my-drive";
        openLink.target = "_blank";
        openLink.rel = "noopener";
      }

      if (uploadLink) {
        uploadLink.href = url || "https://drive.google.com/drive/my-drive";
        uploadLink.target = "_blank";
        uploadLink.rel = "noopener";
      }

      const title = program ? program.title : "Materi Pelatihan";
      if (frame) frame.title = `Daftar materi Google Drive — ${title}`;

      if (folderInput) {
        folderInput.value = programId ? folderFor(programId) : "";
        folderInput.disabled = !programId;
      }
      if (saveButton) saveButton.disabled = !programId;
      if (clearButton) clearButton.disabled = !programId;
      if (configStatus && !programId) configStatus.textContent = "";
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
        // Level juga menyaring daftar materi di bawah.
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

    if (configToggle && configBox) {
      configToggle.addEventListener("click", () => {
        const open = configBox.hidden;
        configBox.hidden = !open;
        configToggle.setAttribute("aria-expanded", String(open));
        if (open && folderInput) folderInput.focus();
      });
    }

    if (saveButton) {
      saveButton.addEventListener("click", () => {
        const program = currentProgram();
        if (!program) return;
        const raw = folderInput ? folderInput.value.trim() : "";
        const id = driveFolderId(raw);

        if (raw && !id) {
          if (configStatus) {
            configStatus.textContent =
              "Tautan folder tidak dikenali. Tempelkan URL folder Google Drive atau ID foldernya.";
            configStatus.style.color = "var(--red-600)";
          }
          return;
        }

        const overrides = folderOverrides();
        if (id) overrides[program.id] = raw;
        else delete overrides[program.id];
        writeJson(FOLDER_STORAGE, overrides);

        if (configStatus) {
          configStatus.textContent = id
            ? "Folder Google Drive berhasil disimpan untuk peramban ini."
            : "Folder Google Drive dihapus untuk peramban ini.";
          configStatus.style.color = "var(--green-600)";
        }
        updateViewer();
      });
    }

    if (clearButton) {
      clearButton.addEventListener("click", () => {
        const program = currentProgram();
        if (!program) return;
        const overrides = folderOverrides();
        delete overrides[program.id];
        writeJson(FOLDER_STORAGE, overrides);
        if (folderInput) folderInput.value = "";
        if (configStatus) {
          configStatus.textContent = "Folder Google Drive dihapus untuk peramban ini.";
          configStatus.style.color = "var(--green-600)";
        }
        updateViewer();
      });
    }

    // Perbarui folder bila pengaturan situs dari Panel Admin diterapkan.
    document.addEventListener("ik:site-settings", updateViewer);

    // Tampilkan folder default saat halaman dibuka.
    updateViewer();
  }

  /* ---------- Daftar materi ---------- */
  function normalizeMaterial(item) {
    if (!item || typeof item !== "object") return null;
    const title = String(item.title || "").trim();
    const url = String(item.url || "").trim();
    if (!title || !url || !isDriveLink(url)) return null;
    return {
      id: String(item.id || `mat-${url}`),
      title,
      program: String(item.program || ""),
      level: String(item.level || ""),
      url,
      description: String(item.description || "").trim(),
      createdAt: String(item.createdAt || ""),
      source: item.source === "local" ? "local" : "published",
    };
  }

  function readLocalMaterials() {
    const list = readJson(MATERI_STORAGE, []);
    if (!Array.isArray(list)) return [];
    return list.map(normalizeMaterial).filter(Boolean);
  }

  function saveLocalMaterials(list) {
    writeJson(MATERI_STORAGE, list);
  }

  async function fetchPublishedMaterials() {
    try {
      const response = await fetch(MATERIALS_URL, { cache: "no-store" });
      if (!response.ok) return [];
      const json = await response.json();
      const list = Array.isArray(json) ? json : json.materials;
      if (!Array.isArray(list)) return [];
      return list
        .map((item) => normalizeMaterial({ ...item, source: "published" }))
        .filter(Boolean);
    } catch (_) {
      return [];
    }
  }

  let publishedMaterials = [];
  let localMaterials = [];

  function allMaterials() {
    const seen = new Set();
    const result = [];
    [...localMaterials, ...publishedMaterials].forEach((item) => {
      const key = item.url.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      result.push(item);
    });
    return result;
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

    const items = allMaterials().filter((item) => {
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

  function setupMaterialForm() {
    const form = document.getElementById("materiForm");
    if (!form) return;

    const programSelect = document.getElementById("materiProgram");
    const levelSelect = document.getElementById("materiLevel");
    const status = document.getElementById("materiStatus");
    const exportButton = document.getElementById("materiExport");

    fillSelect(programSelect, programOptions(), "Pilih program pelatihan");

    function syncLevels() {
      const program = getProgram(programSelect ? programSelect.value : "");
      fillLevels(levelSelect, program, "Pilih level / sub-program");
    }

    if (programSelect) programSelect.addEventListener("change", syncLevels);
    syncLevels();

    form.addEventListener("submit", (event) => {
      event.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const data = new FormData(form);
      const get = (key) => String(data.get(key) || "").trim();
      const url = get("url");
      const program = getProgram(get("program"));

      if (!isDriveLink(url)) {
        if (status) {
          status.textContent =
            "Tautan harus berupa tautan Google Drive (drive.google.com atau docs.google.com).";
          status.style.color = "var(--red-600)";
        }
        return;
      }

      const material = normalizeMaterial({
        id: `mat-${Date.now()}`,
        title: get("title"),
        program: get("program"),
        level: get("level"),
        url,
        description: get("description"),
        createdAt: new Date().toISOString(),
        source: "local",
      });

      if (!material) {
        if (status) status.textContent = "Lengkapi judul dan tautan materi terlebih dahulu.";
        return;
      }

      localMaterials = [material, ...localMaterials];
      saveLocalMaterials(localMaterials);
      renderMaterials();

      if (status) {
        status.textContent =
          "Materi ditambahkan sebagai draf di peramban ini. Klik Ekspor materi.json untuk menerbitkannya.";
        status.style.color = "var(--green-600)";
      }

      form.reset();
      syncLevels();

      if (program) {
        const programFilter = document.getElementById("materiFilterProgram");
        const levelFilter = document.getElementById("materiFilterLevel");
        if (programFilter) programFilter.value = program.id;
        if (levelFilter) {
          fillLevels(levelFilter, program, "Semua level / sub-program");
          levelFilter.value = "";
          levelFilter.disabled = false;
        }
        renderMaterials();
      }
    });

    if (exportButton) {
      exportButton.addEventListener("click", () => {
        const payload = {
          version: 1,
          updatedAt: new Date().toISOString(),
          materials: allMaterials().map((item) => ({
            title: item.title,
            program: item.program,
            level: item.level,
            url: item.url,
            description: item.description,
            createdAt: item.createdAt,
          })),
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "materi.json";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);

        if (status) {
          status.textContent =
            "Berkas materi.json diunduh. Unggah berkas ini ke assets/data/materi.json di repositori agar tampil untuk semua pengunjung.";
          status.style.color = "var(--green-600)";
        }
      });
    }
  }

  async function init() {
    setupDriveUI();
    setupMaterialFilters();
    setupMaterialForm();

    localMaterials = readLocalMaterials();
    publishedMaterials = await fetchPublishedMaterials();
    renderMaterials();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();