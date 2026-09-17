/* =========================================================
   Indonesia Kompeten — Skrip Utama
   ---------------------------------------------------------
   Semua pengaturan penting ada di objek SITE di bawah ini.
   Cukup ubah nilai di SITE, tidak perlu menyentuh halaman HTML.
   ========================================================= */

const SITE = {
  // Nomor WhatsApp dengan kode negara, tanpa tanda "+" dan tanpa spasi.
  // GANTI dengan nomor resmi lembaga, contoh: "6281234567890"
  whatsapp: "6281234567890",

  // Email resmi lembaga
  email: "info@indonesiakompeten.web.id",

  // Nama lembaga (dipakai untuk pesan otomatis)
  nama: "Indonesia Kompeten",

  /**
   * Endpoint formulir kontak (opsional).
   * - Biarkan "" (kosong) => formulir otomatis dikirim lewat WhatsApp.
   * - Isi dengan URL layanan seperti Formspree/Getform untuk kirim via email,
   *   contoh: "https://formspree.io/f/xxxxxxxx"
   */
  formEndpoint: "",
};

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
      const href = (a.getAttribute("href") || "").split("/").pop().toLowerCase();
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
  function initForm() {
    const form = $("#contactForm");
    if (!form) return;

    const status = $("#formStatus", form);

    form.addEventListener("submit", (e) => {
      // Jika endpoint diisi, biarkan formulir terkirim normal.
      if (SITE.formEndpoint) return;

      e.preventDefault();

      const data = new FormData(form);
      const get = (k) => (data.get(k) || "").toString().trim();

      const pesan = [
        `Halo ${SITE.nama}, saya ingin mendaftar/bertanya tentang sertifikasi.`,
        "",
        `Nama       : ${get("nama")}`,
        `Email      : ${get("email")}`,
        `Telepon    : ${get("telepon")}`,
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
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
