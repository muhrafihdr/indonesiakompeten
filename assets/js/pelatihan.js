/* =========================================================
   Indonesia Kompeten — Data & Interaksi Pelatihan
   ---------------------------------------------------------
   Data program pelatihan dipakai bersama oleh halaman
   Daftar Pelatihan dan Materi Pelatihan.
   ========================================================= */

(function () {
  "use strict";

  const PROGRAMS = [
    {
      id: "kkni",
      badge: "Manajerial",
      tone: "blue",
      title: "Pelatihan Berbasis Kompetensi (PBK) Metodologi Pelatihan KKNI",
      subtitle: "Instruktur Level 3 s.d. 6",
      description:
        "Pelatihan bagi calon instruktur untuk merancang, menyampaikan, dan mengevaluasi program pelatihan berbasis kompetensi sesuai kerangka KKNI.",
      optionsLabel: "Pilih Level",
      options: [
        { value: "Level 3", label: "Level 3" },
        { value: "Level 4", label: "Level 4" },
        { value: "Level 5", label: "Level 5" },
        { value: "Level 6", label: "Level 6" },
      ],
      mode: "Online / Offline",
      icon: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>',
    },
    {
      id: "pariwisata",
      badge: "Pariwisata",
      tone: "green",
      title: "Pelatihan Berbasis Kompetensi (PBK) Bidang Pariwisata",
      subtitle: "Tour Guide, Tour Planner, Manajer Humas Destinasi",
      description:
        "Program pelatihan praktis untuk meningkatkan layanan dan pengelolaan destinasi pariwisata sesuai standar kompetensi nasional.",
      optionsLabel: "Pilih Sub-Program",
      options: [
        { value: "Tour Guide (National / Internasional)", label: "Tour Guide (National / Internasional)" },
        { value: "Tour Planner", label: "Tour Planner" },
        { value: "Manajer Humas Destinasi", label: "Manajer Humas Destinasi" },
      ],
      mode: "Online / Offline",
      icon: '<circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/>',
    },
    {
      id: "golf",
      badge: "Golf",
      tone: "gold",
      title: "Pelatihan Berbasis Kompetensi (PBK) Bidang Golf",
      subtitle: "Golfing Assistant Caddy, Porter, Starter & Marshall, Golf Operation Manager",
      description:
        "Pelatihan untuk tenaga operasional dan manajemen lapangan golf, mulai dari pelayanan caddy hingga pengelolaan operasional klub.",
      optionsLabel: "Pilih Sub-Program",
      options: [
        { value: "Golfing Assistant Caddy", label: "Golfing Assistant Caddy" },
        { value: "Porter", label: "Porter" },
        { value: "Starter and Marshall", label: "Starter and Marshall" },
        { value: "Golf Operation Manager", label: "Golf Operation Manager" },
      ],
      mode: "Online / Offline",
      icon: '<path d="M6 21V5l9 3-9 3"/><path d="M6 21h8"/><path d="M4 21h16"/><circle cx="6" cy="3.5" r="1.5"/>',
    },
    {
      id: "digital",
      badge: "Teknologi Digital",
      tone: "red",
      title: "Pelatihan Berbasis Kompetensi (PBK) Bidang Teknologi Digital",
      subtitle: "Digital Marketing dan Copywriting",
      description:
        "Pelatihan keterampilan digital yang langsung dapat dipakai untuk kampanye pemasaran, pembuatan konten, dan penulisan pesan pemasaran.",
      optionsLabel: "Pilih Sub-Program",
      options: [
        { value: "Digital Marketing", label: "Digital Marketing" },
        { value: "Copywriting", label: "Copywriting" },
      ],
      mode: "Online / Offline",
      icon: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    },
    {
      id: "karir",
      badge: "Pengembangan Karir",
      tone: "navy",
      title: "Pengembangan Karir — Communication Skills",
      subtitle: "Upgrade Your Skills",
      description:
        "Tingkatkan kemampuan komunikasi profesional untuk presentasi, negosiasi, pelayanan, dan kerja sama tim di tempat kerja.",
      optionsLabel: "Pilih Fokus",
      options: [
        { value: "Communication Skills", label: "Communication Skills" },
        { value: "Upgrade Your Skills", label: "Upgrade Your Skills" },
      ],
      mode: "Online / Offline",
      icon: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0 1 14 0"/><path d="M18.5 4.5 21 7l-3 3"/>',
    },
  ];

  const REG_STORAGE = "ik_pelatihan_registrations_v1";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getProgram(id) {
    return PROGRAMS.find((program) => program.id === id) || null;
  }

  function optionHtml(options, placeholder) {
    return (
      `<option value="">${esc(placeholder)}</option>` +
      options
        .map((option) => `<option value="${esc(option.value)}">${esc(option.label)}</option>`)
        .join("")
    );
  }

  function fillSelect(select, options, placeholder) {
    if (!select) return;
    select.innerHTML = optionHtml(options, placeholder);
  }

  function levelPlaceholder(program) {
    const label = String((program && program.optionsLabel) || "level").replace(/^pilih\s+/i, "");
    return `Pilih ${label.toLowerCase()}`;
  }

  function waNumber() {
    return (
      (window.IK && window.IK.SITE && String(window.IK.SITE.whatsapp || "")) ||
      "6287700558300"
    );
  }

  function waLink(text) {
    return `https://wa.me/${waNumber()}?text=${encodeURIComponent(text)}`;
  }

  function readRegistrations() {
    try {
      const raw = localStorage.getItem(REG_STORAGE);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (_) {
      return [];
    }
  }

  function saveRegistration(entry) {
    try {
      const list = readRegistrations();
      list.unshift(entry);
      localStorage.setItem(REG_STORAGE, JSON.stringify(list.slice(0, 200)));
    } catch (_) {
      /* Penyimpanan lokal tidak wajib; pendaftaran tetap dikirim via WhatsApp. */
    }
  }

  /* ---------- Halaman Daftar Pelatihan: kartu program ---------- */
  function renderProgramCards() {
    const grid = document.querySelector("[data-program-grid]");
    if (!grid) return;

    grid.innerHTML = PROGRAMS.map(
      (program) => `
        <article class="card program-card reveal" data-program-card="${esc(program.id)}">
          <div class="program-top">
            <span class="program-badge program-badge--${esc(program.tone)}">${esc(program.badge)}</span>
            <span class="tag">${esc(program.mode)}</span>
          </div>
          <div class="card-icon card-icon--${esc(program.tone)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${program.icon}</svg>
          </div>
          <h3>${esc(program.title)}</h3>
          <p class="program-subtitle">${esc(program.subtitle)}</p>
          <p>${esc(program.description)}</p>
          <div class="field program-choice-field">
            <label for="choice-${esc(program.id)}">${esc(program.optionsLabel)}</label>
            <select id="choice-${esc(program.id)}" class="program-choice" data-program="${esc(program.id)}">
              ${optionHtml(program.options, levelPlaceholder(program))}
            </select>
          </div>
          <button class="btn btn-primary btn-sm" type="button" data-choose-program="${esc(program.id)}">
            Daftar Pelatihan Ini
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        </article>`
    ).join("");

    grid.querySelectorAll("[data-choose-program]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.getAttribute("data-choose-program");
        const program = getProgram(id);
        const choice = grid.querySelector(`.program-choice[data-program="${id}"]`);
        const form = document.getElementById("pelatihanForm");
        if (!program || !form) return;

        const programSelect = document.getElementById("regProgram");
        const levelSelect = document.getElementById("regLevel");
        if (programSelect) programSelect.value = program.id;
        if (levelSelect) {
          fillSelect(levelSelect, program.options, levelPlaceholder(program));
          levelSelect.value = choice && choice.value ? choice.value : "";
        }

        const target = document.getElementById("formulir");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        window.setTimeout(() => {
          const name = document.getElementById("regNama");
          if (name) name.focus({ preventScroll: true });
        }, 450);
      });
    });

    // Animasi muncul untuk kartu yang baru dibuat.
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
      );
      grid.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    } else {
      grid.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
    }
  }

  /* ---------- Halaman Daftar Pelatihan: formulir ---------- */
  function initRegistrationForm() {
    const form = document.getElementById("pelatihanForm");
    if (!form) return;

    const programSelect = document.getElementById("regProgram");
    const levelSelect = document.getElementById("regLevel");
    const status = document.getElementById("pelatihanStatus");

    fillSelect(
      programSelect,
      PROGRAMS.map((program) => ({ value: program.id, label: program.title })),
      "Pilih program pelatihan"
    );

    function syncLevels() {
      const program = getProgram(programSelect ? programSelect.value : "");
      if (!levelSelect) return;
      if (!program) {
        levelSelect.innerHTML = '<option value="">Pilih program terlebih dahulu</option>';
        levelSelect.disabled = true;
        return;
      }
      levelSelect.disabled = false;
      fillSelect(levelSelect, program.options, levelPlaceholder(program));
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
      const program = getProgram(get("program"));
      const level = get("level");

      const entry = {
        id: `reg-${Date.now()}`,
        nama: get("nama"),
        alamat: get("alamat"),
        handphone: get("handphone"),
        email: get("email"),
        program: program ? program.title : get("program"),
        level: level || "-",
        metode: get("metode") || "-",
        catatan: get("catatan") || "-",
        createdAt: new Date().toISOString(),
      };

      saveRegistration(entry);

      const message = [
        "Halo Indonesia Kompeten, saya ingin mendaftar Pelatihan Berbasis Kompetensi.",
        "",
        `Nama            : ${entry.nama}`,
        `Alamat          : ${entry.alamat}`,
        `No. Handphone   : ${entry.handphone}`,
        `Email           : ${entry.email}`,
        `Program         : ${entry.program}`,
        `Level / Sub     : ${entry.level}`,
        `Metode          : ${entry.metode}`,
        `Catatan         : ${entry.catatan}`,
        "",
        "Mohon informasi jadwal dan persyaratan pelatihan. Terima kasih.",
      ].join("\n");

      window.open(waLink(message), "_blank", "noopener");

      if (status) {
        status.textContent =
          "Terima kasih! Data pendaftaran sudah disiapkan di WhatsApp untuk dikirim.";
      }
      form.reset();
      syncLevels();
    });
  }

  function init() {
    renderProgramCards();
    initRegistrationForm();
  }

  window.IK_PELATIHAN = {
    programs: PROGRAMS,
    getProgram,
    optionHtml,
    fillSelect,
    escapeHtml: esc,
    waLink,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();