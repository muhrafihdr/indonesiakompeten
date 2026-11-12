/* =========================================================
   Indonesia Kompeten — Skrip Utama
   ---------------------------------------------------------
   Semua pengaturan penting ada di objek SITE di bawah ini.
   Cukup ubah nilai di SITE, tidak perlu menyentuh halaman HTML.
   ========================================================= */

const SITE = {
  // Nomor WhatsApp dengan kode negara, tanpa tanda "+" dan tanpa spasi.
  // Nomor resmi: 0877-0055-8300
  whatsapp: "6287700558300",

  // Email resmi lembaga
  email: "info@indonesiakompeten.web.id",

  // Nama lembaga (dipakai untuk pesan otomatis)
  nama: "Indonesia Kompeten",

  // Folder Google Drive untuk halaman Materi Pelatihan.
  // Dapat diisi melalui Panel Admin > Pengaturan Website.
  driveFolderKkni: "",
  driveFolderPariwisata: "",
  driveFolderGolf: "",
  driveFolderDigital: "",
  driveFolderKarir: "",

  /**
   * Endpoint formulir kontak (opsional).
   * - Biarkan "" (kosong) => formulir otomatis dikirim lewat WhatsApp.
   * - Isi dengan URL layanan seperti Formspree/Getform untuk kirim via email,
   *   contoh: "https://formspree.io/f/xxxxxxxx"
   */
  formEndpoint: "",
};

// Simpan nilai bawaan agar Panel Admin dapat mengembalikan pengaturan awal.
const SITE_DEFAULTS = Object.freeze({ ...SITE });

// Baca pengaturan situs yang tersimpan dari Panel Admin (jika ada).
// Ini memastikan formulir & tautan WhatsApp/email memakai nilai terbaru
// bahkan sebelum berkas admin.js selesai dimuat.
try {
  const raw = localStorage.getItem("ik_cms_content_v1");
  if (raw) {
    const saved = JSON.parse(raw);
    if (saved && saved.site && typeof saved.site === "object") {
      ["whatsapp", "email", "nama", "formEndpoint", "driveFolderKkni", "driveFolderPariwisata", "driveFolderGolf", "driveFolderDigital", "driveFolderKarir"].forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(saved.site, key)) {
          SITE[key] = String(saved.site[key] ?? "");
        }
      });
    }
  }
} catch (_) {
  /* Abaikan data lokal yang rusak. */
}

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- 1. Menu navigasi (mobile) ---------- */
  function initNav() {
    const toggle = $(".nav-toggle");
    const nav = $("#siteNav");
    if (!toggle || !nav) return;

    const close = () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    };

    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    // Tutup menu saat tautan diklik
    $$("a", nav).forEach((a) => a.addEventListener("click", close));

    // Tutup saat klik di luar area menu
    document.addEventListener("click", (e) => {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      close();
    });

    // Tutup saat tombol Escape ditekan
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    // Kembalikan tampilan saat layar diperbesar
    window.addEventListener("resize", () => {
      if (window.innerWidth > 860) close();
    });
  }

  /* ---------- 2. Sorot menu halaman aktif ---------- */
  function initActiveNav() {
    const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    $$("#siteNav a").forEach((a) => {
      if (a.closest(".nav-sub")) return;
      const href = (a.getAttribute("href") || "")
        .split("#")[0]
        .split("?")[0]
        .split("/")
        .pop()
        .toLowerCase();
      if (href === file) {
        a.setAttribute("aria-current", "page");
      }
    });
  }

  /* ---------- 3. Bayangan header saat halaman digulir ---------- */
  function initHeaderScroll() {
    const header = $(".site-header");
    if (!header) return;
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- 4. Animasi muncul saat digulir ---------- */
  function initReveal() {
    const items = $$(".reveal");
    if (!items.length) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach((el) => el.classList.add("is-visible"));
      return;
    }

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

    items.forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i % 4, 3) * 70}ms`;
      io.observe(el);
    });
  }

  /* ---------- 5. Tombol kembali ke atas ---------- */
  function initToTop() {
    const btn = $(".to-top");
    if (!btn) return;

    const onScroll = () => btn.classList.toggle("is-visible", window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    btn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- 6. Tautan WhatsApp & email otomatis ---------- */
  function waLink(text) {
    const base = `https://wa.me/${SITE.whatsapp}`;
    return text ? `${base}?text=${encodeURIComponent(text)}` : base;
  }

  function initLinks() {
    $$("[data-wa]").forEach((el) => {
      const text =
        el.getAttribute("data-wa") ||
        `Halo ${SITE.nama}, saya ingin bertanya mengenai sertifikasi kompetensi.`;
      el.setAttribute("href", waLink(text));
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener");
    });

    $$("[data-mailto]").forEach((el) => {
      const subject = el.getAttribute("data-mailto") || `Pertanyaan Sertifikasi`;
      el.setAttribute("href", `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}`);
    });

    // Tampilkan juga nomor pada elemen teks (opsional)
    $$("[data-phone-text]").forEach((el) => {
      el.textContent = "+" + SITE.whatsapp;
    });
    $$("[data-email-text]").forEach((el) => {
      el.textContent = SITE.email;
    });
  }

  /* ---------- 7. Formulir kontak ---------- */
  function applyFormEndpoint() {
    const form = $("#contactForm");
    if (!form) return;
    const endpoint = String(SITE.formEndpoint || "").trim();
    if (/^https?:\/\//i.test(endpoint)) {
      form.setAttribute("action", endpoint);
      form.setAttribute("method", "post");
    } else {
      form.setAttribute("action", "#");
      form.setAttribute("method", "post");
    }
  }

  function initForm() {
    const form = $("#contactForm");
    if (!form) return;

    applyFormEndpoint();
    const status = $("#formStatus", form);

    form.addEventListener("submit", (e) => {
      // Jika endpoint valid diisi, biarkan formulir terkirim normal.
      if (/^https?:\/\//i.test(String(SITE.formEndpoint || "").trim())) return;

      e.preventDefault();

      const data = new FormData(form);
      const get = (k) => (data.get(k) || "").toString().trim();

      const pesan = [
        `Halo ${SITE.nama}, saya ingin mendaftar/bertanya tentang sertifikasi.`,
        "",
        `Nama       : ${get("nama")}`,
        `Email      : ${get("email")}`,
        `Telepon    : ${get("telepon")}`,
        `Jenis      : ${get("jenis") || "-"}`,
        `Skema      : ${get("skema") || "-"}`,
        `Kebutuhan  : ${get("pesan") || "-"}`,
      ].join("\n");

      window.open(waLink(pesan), "_blank", "noopener");

      if (status) {
        status.textContent =
          "Terima kasih! Permintaan Anda sedang dibuka di WhatsApp untuk dikirim.";
      }
      form.reset();
    });
  }

  /* ---------- 8. Penyaring daftar skema ---------- */
  function initFilter() {
    const buttons = $$(".filter-btn");
    const cards = $$(".scheme-card");
    const empty = $("#filterEmpty");
    if (!buttons.length || !cards.length) return;

    const apply = (value) => {
      let shown = 0;
      cards.forEach((card) => {
        const match = value === "all" || card.dataset.cat === value;
        card.hidden = !match;
        if (match) shown += 1;
      });
      if (empty) empty.classList.toggle("is-shown", shown === 0);
    };

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        apply(btn.dataset.filter || "all");
      });
    });
  }

  /* ---------- 9. Tahun otomatis di footer ---------- */
  function initYear() {
    $$("[data-year]").forEach((el) => {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ---------- 10. Slide show partner ---------- */
  function initPartnerSlider() {
    const slider = $("[data-partner-slider]");
    if (!slider) return;

    const track = $(".partner-slides", slider);
    const slides = $$(".partner-slide", slider);
    const dots = $$("[data-partner-dot]", slider);
    const prev = $("[data-partner-prev]", slider);
    const next = $("[data-partner-next]", slider);
    const pause = $("[data-partner-pause]", slider);
    if (!track || slides.length < 2) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let index = 0;
    let timer = null;
    let userPaused = false;
    let hoverPaused = false;

    const shouldPause = () => userPaused || hoverPaused;

    const render = () => {
      track.style.transform = `translateX(-${index * 100}%)`;
      slides.forEach((slide, i) => {
        const active = i === index;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", String(!active));
        if ("inert" in slide) slide.inert = !active;
      });
      dots.forEach((dot, i) => {
        const active = i === index;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-selected", String(active));
      });
    };

    const go = (value) => {
      index = (value + slides.length) % slides.length;
      render();
    };

    const stop = () => {
      if (timer) window.clearInterval(timer);
      timer = null;
    };

    const start = () => {
      stop();
      if (reduce || shouldPause()) return;
      timer = window.setInterval(() => {
        if (!shouldPause() && !document.hidden) go(index + 1);
      }, 6500);
    };

    if (prev) prev.addEventListener("click", () => { go(index - 1); start(); });
    if (next) next.addEventListener("click", () => { go(index + 1); start(); });

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        go(Number(dot.getAttribute("data-partner-dot")) || 0);
        start();
      });
    });

    if (pause) {
      pause.addEventListener("click", () => {
        userPaused = !userPaused;
        pause.setAttribute("aria-pressed", String(userPaused));
        pause.setAttribute(
          "aria-label",
          userPaused ? "Lanjutkan slide otomatis" : "Jeda slide otomatis"
        );
        pause.classList.toggle("is-paused", userPaused);
        start();
      });
    }

    slider.addEventListener("mouseenter", () => { hoverPaused = true; stop(); });
    slider.addEventListener("mouseleave", () => { hoverPaused = false; start(); });
    slider.addEventListener("focusin", () => { hoverPaused = true; stop(); });
    slider.addEventListener("focusout", (event) => {
      if (slider.contains(event.relatedTarget)) return;
      hoverPaused = false;
      start();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) start();
    });

    render();
    start();
  }

  /* ---------- Jalankan ---------- */
  function init() {
    initNav();
    initActiveNav();
    initHeaderScroll();
    initReveal();
    initToTop();
    initLinks();
    initForm();
    initFilter();
    initYear();
    initPartnerSlider();
  }

  // API kecil untuk Panel Admin (SSO) agar perubahan pengaturan situs
  // langsung dipakai oleh formulir, tautan WhatsApp, dan tautan email.
  window.IK = window.IK || {};
  window.IK.SITE = SITE;
  window.IK.defaults = SITE_DEFAULTS;
  window.IK.applySiteSettings = function (settings) {
    const merged = { ...SITE_DEFAULTS, ...(settings && typeof settings === "object" ? settings : {}) };
    ["whatsapp", "email", "nama", "formEndpoint", "driveFolderKkni", "driveFolderPariwisata", "driveFolderGolf", "driveFolderDigital", "driveFolderKarir"].forEach((key) => {
      SITE[key] = String(merged[key] ?? "");
    });
    initLinks();
    applyFormEndpoint();
    document.dispatchEvent(new CustomEvent("ik:site-settings", { detail: { ...SITE } }));
  };
  window.IK.refreshLinks = initLinks;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
