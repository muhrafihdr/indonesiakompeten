/* =========================================================
   Indonesia Kompeten — SSO Panel Admin
   ---------------------------------------------------------
   Panel admin tersembunyi untuk mengedit seluruh konten situs.

   Cara masuk (mode tersembunyi):
   - Ctrl + Shift + A  (atau Alt + Shift + A)
   - Klik 5x cepat pada teks copyright di footer
   - Klik ikon kunci samar di footer (muncul saat footer disentuh)
   - Buka alamat dengan #sso-admin

   Catatan keamanan:
   Panel ini adalah gerbang sisi klien pada situs statis. Kredensial
   disimpan sebagai hash SHA-256, bukan teks biasa. Untuk keamanan
   tingkat produksi, gunakan autentikasi server/OAuth sesungguhnya.
   ========================================================= */

(function () {
  "use strict";

  /* ---------- Konstanta ---------- */
  const STORAGE_KEY = "ik_cms_content_v1";
  const SESSION_KEY = "ik_sso_session_v1";
  const EDIT_KEY = "ik_sso_editmode_v1";
  const GH_CFG_KEY = "ik_sso_github_cfg_v1";
  const GH_TOKEN_KEY = "ik_sso_gh_token";
  const FAIL_KEY = "ik_sso_fails";
  const LOCK_KEY = "ik_sso_lock_until";
  const ADMIN_ATTR = "data-cms-ignore";
  const SSO_SALT = "ik-sso-v1|";
  // Hash gabungan kredensial SSO (SHA-256 + salt internal).
  const SSO_HASH = "033f5a78cbb3e4df168ad347d13739f23b11229f0a02cf1142db53ac1774b4e6";
  const SESSION_TTL = 8 * 60 * 60 * 1000;
  const IDLE_TTL = 30 * 60 * 1000;
  const SCRIPT_URL = document.currentScript ? document.currentScript.src : location.href;
  const DATA_URL = new URL("../data/content.json", SCRIPT_URL).href;

  const DEFAULT_GH = {
    repo: "muhrafihdr/indonesiakompeten",
    branch: "main",
    path: "assets/data/content.json",
  };

  const PAGE_NAMES = {
    "index.html": "Beranda",
    "tentang.html": "Tentang Kami",
    "layanan.html": "Skema & Layanan",
    "alur.html": "Alur Sertifikasi",
    "faq.html": "FAQ",
    "kontak.html": "Kontak",
    "404.html": "Halaman 404",
  };
  const PAGE_LINKS = [
    "index.html",
    "tentang.html",
    "layanan.html",
    "alur.html",
    "faq.html",
    "kontak.html",
  ];

  const TEXT_SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "PATH", "TITLE",
    "IFRAME", "CANVAS", "VIDEO", "AUDIO", "OBJECT", "EMBED", "MATH",
  ]);
  const TEXT_NO_WRAP_TAGS = new Set(["OPTION", "OPTGROUP", "TEXTAREA", "SELECT"]);

  const THEME_VARS = {
    blue600: { css: "--blue-600", label: "Warna utama" },
    blue500: { css: "--blue-500", label: "Warna utama terang" },
    navy950: { css: "--navy-950", label: "Warna footer" },
    navy900: { css: "--navy-900", label: "Warna judul" },
    red600: { css: "--red-600", label: "Warna aksen" },
    gold500: { css: "--gold-500", label: "Warna sorotan" },
    green600: { css: "--green-600", label: "Warna sukses" },
  };

  const META_FIELDS = [
    { key: "title", label: "Judul tab (title)", type: "text" },
    { key: "description", label: "Meta description", type: "textarea", selector: 'meta[name="description"]', attr: "content" },
    { key: "keywords", label: "Meta keywords", type: "textarea", selector: 'meta[name="keywords"]', attr: "content" },
    { key: "robots", label: "Meta robots", type: "text", selector: 'meta[name="robots"]', attr: "content" },
    { key: "ogTitle", label: "Judul Open Graph", type: "text", selector: 'meta[property="og:title"]', attr: "content" },
    { key: "ogDescription", label: "Deskripsi Open Graph", type: "textarea", selector: 'meta[property="og:description"]', attr: "content" },
    { key: "ogUrl", label: "URL Open Graph", type: "text", selector: 'meta[property="og:url"]', attr: "content" },
    { key: "canonical", label: "URL kanonik", type: "text", selector: 'link[rel="canonical"]', attr: "href" },
    { key: "themeColor", label: "Warna tema browser", type: "text", selector: 'meta[name="theme-color"]', attr: "content" },
  ];

  const SITE_FIELDS = [
    { key: "nama", label: "Nama lembaga", type: "text", hint: "Dipakai pada pesan WhatsApp otomatis." },
    { key: "whatsapp", label: "Nomor WhatsApp", type: "text", hint: "Format 62… tanpa + dan tanpa spasi." },
    { key: "email", label: "Email resmi", type: "email", hint: "Dipakai pada tautan email." },
    { key: "formEndpoint", label: "Endpoint formulir (opsional)", type: "url", hint: "Kosongkan untuk mode WhatsApp. Isi URL Formspree/Getform bila memakai email." },
  ];

  const ATTR_RULES = [
    { selector: "a[href]", type: "link", label: "Tautan", fields: ["href", "title", "target", "rel"] },
    { selector: "img[src]", type: "image", label: "Gambar", fields: ["src", "alt", "title"] },
    { selector: "iframe[src]", type: "iframe", label: "Iframe", fields: ["src", "title"] },
    { selector: "input[placeholder]", type: "input", label: "Placeholder", fields: ["placeholder"] },
    { selector: "textarea[placeholder]", type: "input", label: "Placeholder", fields: ["placeholder"] },
    { selector: "source[srcset]", type: "media", label: "Sumber media", fields: ["srcset"] },
    { selector: "video[poster]", type: "media", label: "Poster video", fields: ["poster"] },
  ];

  const ATTR_LABELS = {
    href: "URL tujuan",
    src: "Sumber",
    alt: "Teks alternatif",
    title: "Tooltip / judul",
    target: "Target",
    rel: "Relasi",
    placeholder: "Placeholder",
    srcset: "Srcset",
    poster: "Poster",
  };

  /* ---------- State ---------- */
  let state = emptyState();
  let remoteState = null;
  let remoteSource = "";
  let hasLocal = false;
  let originalTexts = new Map();
  let originalAttrs = new Map();
  let originalMeta = null;
  let originalTheme = null;
  let originalSite = null;
  let editing = false;
  let editingSpans = new Map();
  let panelOpen = false;
  let activeTab = "content";
  let saveTimer = null;
  let isDirty = false;
  let lastActivity = Date.now();
  let loginLockTimer = null;
  let textSearch = "";
  let submittingLogin = false;
  let panelHideTimer = null;
  let mediaTarget = null;
  let linkTarget = null;

  const ui = {};

  /* ---------- Util ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function emptyState() {
    return { version: 1, updatedAt: null, site: {}, theme: {}, pages: {} };
  }

  function safeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  function rotr(x, n) {
    return ((x >>> n) | (x << (32 - n))) >>> 0;
  }

  function utf8Bytes(str) {
    const out = [];
    for (let i = 0; i < str.length; i += 1) {
      let c = str.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        const c2 = str.charCodeAt(++i);
        const cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        out.push(
          0xf0 | (cp >> 18),
          0x80 | ((cp >> 12) & 63),
          0x80 | ((cp >> 6) & 63),
          0x80 | (cp & 63)
        );
      } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }

  function sha256Fallback(message) {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    const H = new Uint32Array([
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);
    const bytes = utf8Bytes(message);
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    const hi = Math.floor(bitLen / 0x100000000);
    const lo = bitLen >>> 0;
    for (let i = 3; i >= 0; i -= 1) bytes.push((hi >>> (i * 8)) & 255);
    for (let i = 3; i >= 0; i -= 1) bytes.push((lo >>> (i * 8)) & 255);

    const w = new Uint32Array(64);
    for (let offset = 0; offset < bytes.length; offset += 64) {
      for (let i = 0; i < 16; i += 1) {
        const p = offset + i * 4;
        w[i] = ((bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3]) >>> 0;
      }
      for (let i = 16; i < 64; i += 1) {
        const s0 = (rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3)) >>> 0;
        const s1 = (rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10)) >>> 0;
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i += 1) {
        const S1 = (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) >>> 0;
        const ch = ((e & f) ^ (~e & g)) >>> 0;
        const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) >>> 0;
        const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
        const temp2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + temp1) >>> 0;
        d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return Array.from(H).map((x) => x.toString(16).padStart(8, "0")).join("");
  }

  async function sha256Hex(text) {
    if (window.crypto && window.crypto.subtle) {
      const buffer = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    return sha256Fallback(text);
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    try {
      return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
    } catch (_) {
      return date.toLocaleString();
    }
  }

  function getPageId() {
    if (document.title.includes("Halaman Tidak Ditemukan") || location.pathname.endsWith("/404.html")) {
      return "404.html";
    }
    const file = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    return PAGE_NAMES[file] ? file : "index.html";
  }

  function getPageLabel() {
    return PAGE_NAMES[getPageId()] || "Halaman";
  }

  function pageHref(page) {
    const base = getPageId() === "404.html" ? "/" : "";
    if (page === "index.html") return base || "./";
    return base + page;
  }

  function pageState(create = true) {
    const id = getPageId();
    if (!state.pages[id] && create) state.pages[id] = { meta: {}, text: {}, attrs: {} };
    const p = state.pages[id];
    if (!p) return { meta: {}, text: {}, attrs: {} };
    p.meta = p.meta || {};
    p.text = p.text || {};
    p.attrs = p.attrs || {};
    return p;
  }

  function elKey(el) {
    if (!el || el.nodeType !== 1) return "";
    if (el === document.body) return "body";
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      if (node.id) {
        parts.unshift("#" + node.id);
        break;
      }
      const tag = node.tagName.toLowerCase();
      let index = 1;
      let sibling = node;
      while ((sibling = sibling.previousElementSibling)) {
        if (sibling.tagName === node.tagName) index += 1;
      }
      parts.unshift(tag + ":" + index);
      node = node.parentElement;
    }
    return "body" + (parts.length ? "/" + parts.join("/") : "");
  }

  function textKey(parent, node) {
    const index = Array.prototype.indexOf.call(parent.childNodes, node);
    return elKey(parent) + "/t" + index;
  }

  function isIgnored(el) {
    return !!(el && el.closest && el.closest("[" + ADMIN_ATTR + "]"));
  }

  function isSafeUrl(value, allowDataImage) {
    const text = String(value || "").trim();
    if (!text) return true;
    if (/^(https?:|mailto:|tel:|#|\/|\.\/|\.\.\/|\?)/i.test(text)) return true;
    if (allowDataImage && /^data:image\//i.test(text)) return true;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(text)) return true;
    return false;
  }

  function sanitizeAttr(attr, value, el) {
    const text = String(value ?? "");
    if (attr === "href") return isSafeUrl(text, false) ? text : null;
    if (attr === "src") {
      const allowData = !el || el.tagName === "IMG" || el.tagName === "SOURCE";
      return isSafeUrl(text, allowData) ? text : null;
    }
    if (attr === "poster") return isSafeUrl(text, true) ? text : null;
    if (attr === "srcset") {
      const ok = text.split(",").every((part) => {
        const url = part.trim().split(/\s+/)[0];
        return !url || isSafeUrl(url, true);
      });
      return ok ? text : null;
    }
    if (attr === "target") return /^(_blank|_self|_parent|_top)?$/i.test(text) ? text : null;
    if (attr === "rel") return /^[a-z0-9\s-]*$/i.test(text) ? text : null;
    return text;
  }

  function isColor(value) {
    if (!value || typeof value !== "string") return false;
    if (window.CSS && CSS.supports) return CSS.supports("color", value);
    return /^#[0-9a-f]{3,8}$/i.test(value);
  }

  function colorInputValue(value) {
    if (/^#[0-9a-f]{6}$/i.test(value)) return value;
    if (/^#[0-9a-f]{3}$/i.test(value)) {
      return "#" + value.slice(1).split("").map((c) => c + c).join("");
    }
    return "#000000";
  }

  function countChanges() {
    let total = Object.keys(state.site || {}).length + Object.keys(state.theme || {}).length;
    Object.values(state.pages || {}).forEach((page) => {
      total += Object.keys(page.meta || {}).length;
      total += Object.keys(page.text || {}).length;
      Object.values(page.attrs || {}).forEach((attrs) => {
        total += Object.keys(attrs || {}).length;
      });
    });
    return total;
  }

  /* ---------- Normalisasi & penyimpanan konten ---------- */
  function normalizeState(input) {
    const out = emptyState();
    if (!input || typeof input !== "object") return out;
    if (typeof input.version === "number") out.version = input.version;
    if (typeof input.updatedAt === "string") out.updatedAt = input.updatedAt;

    if (input.site && typeof input.site === "object") {
      SITE_FIELDS.forEach((field) => {
        const value = input.site[field.key];
        if (typeof value === "string") out.site[field.key] = value.slice(0, 4000);
      });
    }

    if (input.theme && typeof input.theme === "object") {
      Object.keys(THEME_VARS).forEach((key) => {
        const value = input.theme[key];
        if (typeof value === "string" && isColor(value)) out.theme[key] = value.slice(0, 80);
      });
    }

    if (input.pages && typeof input.pages === "object") {
      Object.keys(input.pages).forEach((pageId) => {
        if (!/^[a-z0-9._-]+\.html?$/i.test(pageId)) return;
        const source = input.pages[pageId];
        if (!source || typeof source !== "object") return;
        const page = { meta: {}, text: {}, attrs: {} };

        if (source.meta && typeof source.meta === "object") {
          META_FIELDS.forEach((field) => {
            const value = source.meta[field.key];
            if (typeof value === "string") page.meta[field.key] = value.slice(0, 40000);
          });
        }

        if (source.text && typeof source.text === "object") {
          Object.keys(source.text).forEach((key) => {
            const value = source.text[key];
            if (typeof value === "string" && key.length < 800) page.text[key] = value;
          });
        }

        if (source.attrs && typeof source.attrs === "object") {
          Object.keys(source.attrs).forEach((key) => {
            const attrs = source.attrs[key];
            if (!attrs || typeof attrs !== "object" || key.length > 1200) return;
            const cleaned = {};
            Object.keys(attrs).forEach((attr) => {
              if (!(attr in ATTR_LABELS)) return;
              const value = attrs[attr];
              if (typeof value !== "string") return;
              const safe = sanitizeAttr(attr, value, null);
              if (safe !== null) cleaned[attr] = safe;
            });
            if (Object.keys(cleaned).length) page.attrs[key] = cleaned;
          });
        }

        out.pages[pageId] = page;
      });
    }
    return out;
  }

  function mergeState(published, local) {
    const base = normalizeState(published || emptyState());
    if (!local) return base;
    const incoming = normalizeState(local);
    const out = deepClone(base);
    out.version = incoming.version || out.version || 1;
    out.updatedAt = incoming.updatedAt || out.updatedAt || null;
    out.site = Object.assign({}, out.site, incoming.site);
    out.theme = Object.assign({}, out.theme, incoming.theme);
    out.pages = Object.assign({}, out.pages);
    Object.keys(incoming.pages).forEach((pageId) => {
      const a = out.pages[pageId] || { meta: {}, text: {}, attrs: {} };
      const b = incoming.pages[pageId];
      out.pages[pageId] = {
        meta: Object.assign({}, a.meta, b.meta),
        text: Object.assign({}, a.text, b.text),
        attrs: Object.assign({}, a.attrs, b.attrs),
      };
    });
    return out;
  }

  function readLocalState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = normalizeState(JSON.parse(raw));
      return hasContent(parsed) ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function persistState() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      hasLocal = true;
      isDirty = false;
      setSaveStatus("Tersimpan otomatis", true);
    } catch (error) {
      setSaveStatus("Gagal menyimpan lokal", false);
      toast("Penyimpanan lokal penuh. Hapus gambar besar atau unduh cadangan.", "error");
    }
  }

  function markDirty() {
    state.updatedAt = new Date().toISOString();
    isDirty = true;
    setSaveStatus("Menyimpan…", true);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistState, 220);
  }

  function flushSave() {
    if (isDirty) persistState();
  }

  /* ---------- Kumpulkan konten yang bisa diedit ---------- */
  function collectTextFields(options = {}) {
    const includeWhitespace = options.includeWhitespace === true;
    const fields = [];
    if (!document.body) return fields;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!includeWhitespace && (!node.nodeValue || !node.nodeValue.trim())) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent || isIgnored(parent)) return NodeFilter.FILTER_REJECT;
        if (parent.closest(".cms-text")) return NodeFilter.FILTER_REJECT;
        if (parent.closest("svg")) return NodeFilter.FILTER_REJECT;
        if (TEXT_SKIP_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!parent) continue;
      fields.push({
        key: textKey(parent, node),
        node,
        parent,
        value: node.nodeValue,
        wrappable: !TEXT_NO_WRAP_TAGS.has(parent.tagName),
      });
    }
    return fields;
  }

  function getSectionInfo(el) {
    const section = el.closest("section");
    if (section) {
      const heading = section.querySelector("h1,h2,h3,h4");
      const label = heading
        ? heading.textContent.trim().replace(/\s+/g, " ")
        : section.id
          ? section.id.replace(/[-_]+/g, " ")
          : "Bagian";
      return { id: section.id || "section", label: label || "Bagian" };
    }
    if (el.closest("header")) return { id: "header", label: "Header / Navigasi" };
    if (el.closest("footer")) return { id: "footer", label: "Footer" };
    if (el.closest("main")) return { id: "main", label: "Konten Utama" };
    return { id: "other", label: "Lainnya" };
  }

  function collectAttrFields() {
    const map = new Map();
    const root = document.body;
    if (!root) return [];
    ATTR_RULES.forEach((rule) => {
      $$(rule.selector, root).forEach((el) => {
        if (isIgnored(el) || el.closest(".cms-root")) return;
        const key = elKey(el);
        if (!key || map.has(key)) return;
        const fields = {};
        rule.fields.forEach((attr) => {
          if (el.hasAttribute(attr)) fields[attr] = el.getAttribute(attr) || "";
        });
        if (!Object.keys(fields).length) return;
        map.set(key, {
          key,
          el,
          type: rule.type,
          label: rule.label,
          fields,
        });
      });
    });
    return Array.from(map.values());
  }

  function captureOriginals() {
    originalTexts = new Map(collectTextFields().map((field) => [field.key, field.value]));
    originalAttrs = new Map(collectAttrFields().map((field) => [field.key, { ...field.fields }]));
    originalMeta = readMeta();
    originalTheme = readTheme();
    originalSite = window.IK && window.IK.defaults ? { ...window.IK.defaults } : null;
  }

  function readMeta() {
    const meta = {};
    META_FIELDS.forEach((field) => {
      if (field.key === "title") {
        meta.title = document.title;
        return;
      }
      const el = $(field.selector);
      meta[field.key] = el ? el.getAttribute(field.attr) : null;
    });
    return meta;
  }

  function readTheme() {
    const theme = {};
    const computed = getComputedStyle(document.documentElement);
    Object.keys(THEME_VARS).forEach((key) => {
      theme[key] = computed.getPropertyValue(THEME_VARS[key].css).trim();
    });
    return theme;
  }

  /* ---------- Terapkan konten ke halaman ---------- */
  function applyAll(options = {}) {
    const rerender = options.rerender !== false;
    const wasEditing = editing;
    if (wasEditing) exitEditMode({ silent: true });

    applySite();
    applyTheme();
    applyMeta();
    applyTexts();
    applyAttrs();

    if (wasEditing) enterEditMode({ silent: true });
    if (rerender && panelOpen && (activeTab === "content" || activeTab === "settings")) renderActiveTab();
    updateBar();
  }

  function applySite() {
    if (!window.IK || typeof window.IK.applySiteSettings !== "function") return;
    const defaults = window.IK.defaults || {};
    window.IK.applySiteSettings(Object.assign({}, defaults, state.site || {}));
  }

  function applyTheme() {
    Object.keys(THEME_VARS).forEach((key) => {
      const cssVar = THEME_VARS[key].css;
      document.documentElement.style.removeProperty(cssVar);
      const value = state.theme && state.theme[key];
      if (value && isColor(value)) document.documentElement.style.setProperty(cssVar, value);
    });
  }

  function ensureMetaElement(selector, field) {
    let el = $(selector);
    if (el) return el;
    if (field.key === "canonical") {
      el = document.createElement("link");
      el.setAttribute("rel", "canonical");
    } else {
      el = document.createElement("meta");
      if (field.key.startsWith("og")) el.setAttribute("property", selector.match(/"([^"]+)"/)[1]);
      else el.setAttribute("name", selector.match(/"([^"]+)"/)[1]);
    }
    document.head.appendChild(el);
    return el;
  }

  function applyMeta() {
    const page = pageState(false);
    const meta = page.meta || {};
    META_FIELDS.forEach((field) => {
      const hasOverride = Object.prototype.hasOwnProperty.call(meta, field.key);
      const value = hasOverride ? meta[field.key] : originalMeta ? originalMeta[field.key] : null;

      if (field.key === "title") {
        document.title = value === null || value === undefined ? "" : String(value);
        return;
      }

      const el = $(field.selector);
      if (value === null || value === undefined) {
        if (el && originalMeta && originalMeta[field.key] === null) el.remove();
        return;
      }

      const target = el || ensureMetaElement(field.selector, field);
      const safe = field.key === "canonical" || field.key === "ogUrl"
        ? (isSafeUrl(value, false) ? value : "")
        : String(value);
      target.setAttribute(field.attr, safe);
    });
  }

  function applyTexts() {
    const current = new Map(collectTextFields({ includeWhitespace: true }).map((field) => [field.key, field]));

    originalTexts.forEach((value, key) => {
      const field = current.get(key);
      if (field && field.node.nodeValue !== value) field.node.nodeValue = value;
    });

    const overrides = pageState(false).text || {};
    Object.keys(overrides).forEach((key) => {
      const value = overrides[key];
      if (typeof value !== "string") return;
      const field = current.get(key);
      if (field && field.node.nodeValue !== value) field.node.nodeValue = value;
    });
  }

  function applyAttrs() {
    const current = new Map(collectAttrFields().map((field) => [field.key, field]));

    originalAttrs.forEach((attrs, key) => {
      const field = current.get(key);
      if (!field) return;
      Object.keys(attrs).forEach((attr) => {
        // Biarkan main.js menghasilkan ulang tautan WhatsApp/email dari
        // pengaturan situs terbaru; override per-tautan tetap diterapkan
        // pada blok di bawahnya.
        if (attr === "href" && (field.el.hasAttribute("data-wa") || field.el.hasAttribute("data-mailto"))) return;
        if (field.el.getAttribute(attr) !== attrs[attr]) field.el.setAttribute(attr, attrs[attr]);
      });
    });

    const overrides = pageState(false).attrs || {};
    Object.keys(overrides).forEach((key) => {
      const field = current.get(key);
      if (!field) return;
      const attrs = overrides[key] || {};
      Object.keys(attrs).forEach((attr) => {
        if (!(attr in ATTR_LABELS)) return;
        const safe = sanitizeAttr(attr, attrs[attr], field.el);
        if (safe !== null && field.el.getAttribute(attr) !== safe) field.el.setAttribute(attr, safe);
      });
    });
  }

  function updateTextDom(key, value) {
    if (editing) {
      const span = editingSpans.get(key);
      if (span) {
        if (span.textContent !== value) span.textContent = value;
        return;
      }
    }
    const field = collectTextFields({ includeWhitespace: true }).find((item) => item.key === key);
    if (field && field.node.nodeValue !== value) field.node.nodeValue = value;
  }

  function updateAttrDom(key, attr, value) {
    const field = collectAttrFields().find((item) => item.key === key);
    if (!field) return;
    const safe = sanitizeAttr(attr, value, field.el);
    if (safe === null) {
      toast("Nilai tersebut tidak diizinkan untuk alamat URL.", "error");
      return;
    }
    field.el.setAttribute(attr, safe);
  }

  /* ---------- Ubah state ---------- */
  function setTextOverride(key, value) {
    const page = pageState();
    if (value === originalTexts.get(key)) delete page.text[key];
    else page.text[key] = value;
    markDirty();
  }

  function setAttrOverride(key, attr, value) {
    const page = pageState();
    const original = originalAttrs.get(key) || {};
    const current = page.attrs[key] || {};
    const safe = sanitizeAttr(attr, value, null);
    if (safe === null) {
      toast("Nilai URL tidak diizinkan.", "error");
      return;
    }
    if (original[attr] === safe || (!(attr in original) && safe === "")) delete current[attr];
    else current[attr] = safe;
    if (Object.keys(current).length) page.attrs[key] = current;
    else delete page.attrs[key];
    markDirty();
  }

  function setSiteValue(key, value) {
    const original = originalSite ? originalSite[key] : "";
    if (String(original ?? "") === value) delete state.site[key];
    else state.site[key] = value;
    applySite();
    applyAttrs();
    markDirty();
  }

  function setMetaValue(key, value) {
    const page = pageState();
    const original = originalMeta ? originalMeta[key] : null;
    if (String(original ?? "") === value) delete page.meta[key];
    else page.meta[key] = value;
    applyMeta();
    markDirty();
  }

  function setThemeValue(key, value) {
    const original = originalTheme ? originalTheme[key] : "";
    if (String(original ?? "") === value) delete state.theme[key];
    else state.theme[key] = value;
    applyTheme();
    markDirty();
  }

  function hasTextOverride(key) {
    return Object.prototype.hasOwnProperty.call(pageState(false).text || {}, key);
  }

  function hasAttrOverride(key, attr) {
    const attrs = (pageState(false).attrs || {})[key] || {};
    return Object.prototype.hasOwnProperty.call(attrs, attr);
  }

  /* ---------- Sumber konten live ---------- */
  function readGhConfig() {
    const config = { ...DEFAULT_GH };
    try {
      const raw = localStorage.getItem(GH_CFG_KEY);
      if (raw) Object.assign(config, JSON.parse(raw));
    } catch (_) { /* abaikan */ }
    return config;
  }

  function liveContentUrl() {
    const cfg = readGhConfig();
    const path = String(cfg.path || DEFAULT_GH.path).split("/").map(encodeURIComponent).join("/");
    return "https://raw.githubusercontent.com/" + cfg.repo + "/" + encodeURIComponent(cfg.branch) + "/" + path;
  }

  async function fetchContent(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    try {
      const separator = url.includes("?") ? "&" : "?";
      const response = await fetch(url + separator + "v=" + Date.now(), {
        cache: "no-store",
        credentials: "omit",
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const json = await response.json();
      return normalizeState(json);
    } catch (_) {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  function hasContent(content) {
    if (!content) return false;
    return !!(
      content.updatedAt ||
      Object.keys(content.site || {}).length ||
      Object.keys(content.theme || {}).length ||
      Object.keys(content.pages || {}).length
    );
  }

  async function loadRemoteContents() {
    const liveUrl = liveContentUrl();
    const [sameOrigin, live] = await Promise.all([
      fetchContent(DATA_URL),
      fetchContent(liveUrl),
    ]);
    const candidates = [];
    if (hasContent(sameOrigin)) candidates.push({ content: sameOrigin, source: "Server" });
    if (hasContent(live)) candidates.push({ content: live, source: "GitHub live" });
    if (!candidates.length) {
      remoteSource = "";
      return null;
    }
    candidates.sort((a, b) => {
      const ta = Date.parse(a.content.updatedAt || 0) || 0;
      const tb = Date.parse(b.content.updatedAt || 0) || 0;
      return tb - ta;
    });
    remoteSource = candidates[0].source;
    return candidates[0].content;
  }

  async function syncRemote() {
    if (hasLocal || document.hidden || editing) return;
    const remote = await loadRemoteContents();
    if (!remote) return;
    remoteState = remote;
    const oldTime = Date.parse(state.updatedAt || 0) || 0;
    const newTime = Date.parse(remote.updatedAt || 0) || 0;
    if (newTime > oldTime) {
      state = mergeState(remote, null);
      applyAll();
      toast("Konten terbaru dari server telah dimuat.", "success");
    }
  }


  /* ---------- Sesi SSO ---------- */
  function readSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.expires || data.expires <= Date.now()) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return data;
    } catch (_) {
      return null;
    }
  }

  function setSession() {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      created: Date.now(),
      expires: Date.now() + SESSION_TTL,
    }));
    lastActivity = Date.now();
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function getLockRemaining() {
    try {
      const until = Number(localStorage.getItem(LOCK_KEY) || 0);
      return Math.max(0, until - Date.now());
    } catch (_) {
      return 0;
    }
  }

  function startLockCountdown() {
    clearInterval(loginLockTimer);
    loginLockTimer = null;
    if (!ui.loginError) return;

    const tick = () => {
      const remaining = getLockRemaining();
      if (remaining > 0) {
        ui.loginError.textContent = "Terlalu banyak percobaan. Coba lagi dalam " + Math.ceil(remaining / 1000) + " detik.";
        if (ui.loginSubmit) ui.loginSubmit.disabled = true;
      } else {
        clearInterval(loginLockTimer);
        loginLockTimer = null;
        ui.loginError.textContent = "";
        if (ui.loginSubmit) ui.loginSubmit.disabled = false;
      }
    };

    if (getLockRemaining() > 0) {
      tick();
      loginLockTimer = setInterval(tick, 1000);
    } else {
      ui.loginError.textContent = "";
      if (ui.loginSubmit) ui.loginSubmit.disabled = false;
    }
  }

  function registerFailedLogin() {
    try {
      let fails = Number(localStorage.getItem(FAIL_KEY) || 0) + 1;
      if (fails >= 5) {
        localStorage.setItem(LOCK_KEY, String(Date.now() + 30000));
        localStorage.setItem(FAIL_KEY, "0");
        startLockCountdown();
      } else {
        localStorage.setItem(FAIL_KEY, String(fails));
      }
    } catch (_) { /* abaikan */ }
  }

  function clearFailedLogin() {
    clearInterval(loginLockTimer);
    loginLockTimer = null;
    try {
      localStorage.removeItem(FAIL_KEY);
      localStorage.removeItem(LOCK_KEY);
    } catch (_) { /* abaikan */ }
  }

  function touchActivity() {
    lastActivity = Date.now();
  }

  function openLoginOrPanel() {
    if (readSession()) openPanel();
    else openLogin();
  }

  function openLogin() {
    if (!ui.loginModal) return;
    if (readSession()) {
      openPanel();
      return;
    }
    clearTimeout(panelHideTimer);
    ui.loginModal.hidden = false;
    void ui.loginModal.offsetWidth;
    ui.loginModal.classList.add("is-visible");
    if (ui.loginError) ui.loginError.textContent = "";
    if (ui.loginUser) setTimeout(() => ui.loginUser.focus(), 60);
    startLockCountdown();
  }

  function closeLogin() {
    if (!ui.loginModal) return;
    ui.loginModal.classList.remove("is-visible");
    setTimeout(() => { if (ui.loginModal) ui.loginModal.hidden = true; }, 180);
  }

  async function handleLogin(event) {
    event.preventDefault();
    if (submittingLogin) return;
    if (getLockRemaining() > 0) {
      startLockCountdown();
      return;
    }
    const username = (ui.loginUser.value || "").trim();
    const password = ui.loginPass.value || "";
    if (!username || !password) {
      ui.loginError.textContent = "Username dan password wajib diisi.";
      return;
    }

    submittingLogin = true;
    ui.loginSubmit.disabled = true;
    ui.loginSubmit.textContent = "Memverifikasi…";
    try {
      const hash = await sha256Hex(SSO_SALT + username + "|" + password);
      if (safeEqual(hash, SSO_HASH)) {
        clearFailedLogin();
        setSession();
        localStorage.setItem(EDIT_KEY, "1");
        ui.loginPass.value = "";
        ui.loginError.textContent = "";
        closeLogin();
        showAdminUI();
        openPanel("content");
        enterEditMode();
        toast("Login berhasil. Mode edit langsung aktif.", "success");
      } else {
        registerFailedLogin();
        ui.loginError.textContent = getLockRemaining() > 0
          ? "Terlalu banyak percobaan. Tunggu sebentar."
          : "Username atau password salah.";
      }
    } catch (_) {
      ui.loginError.textContent = "Verifikasi gagal. Muat ulang halaman lalu coba lagi.";
    } finally {
      submittingLogin = false;
      ui.loginSubmit.disabled = getLockRemaining() > 0;
      ui.loginSubmit.textContent = "Masuk ke Panel";
    }
  }

  function showAdminUI() {
    if (!readSession()) {
      if (ui.adminbar) ui.adminbar.hidden = true;
      document.body.classList.remove("cms-admin-active");
      return;
    }
    if (ui.adminbar) ui.adminbar.hidden = false;
    document.body.classList.add("cms-admin-active");
    updateBar();
    updateEditButton();
  }

  function hideAdminUI() {
    if (ui.adminbar) ui.adminbar.hidden = true;
    document.body.classList.remove("cms-admin-active");
    document.body.classList.remove("cms-panel-open");
    if (ui.panel) ui.panel.classList.remove("is-open");
    panelOpen = false;
    if (ui.panel) ui.panel.hidden = true;
  }

  function logout(manual = true) {
    flushSave();
    clearSession();
    localStorage.removeItem(EDIT_KEY);
    sessionStorage.removeItem(GH_TOKEN_KEY);
    closePanel();
    exitEditMode({ silent: true });
    hideAdminUI();
    if (manual) toast("Anda telah keluar dari Panel Admin.", "info");
  }

  function updateBar() {
    if (!ui.barPage) return;
    ui.barPage.textContent = getPageLabel();
    if (ui.panelPage) ui.panelPage.textContent = getPageLabel();
    const status = ui.saveStatus;
    if (status && !isDirty) {
      status.textContent = hasLocal ? "Perubahan lokal aktif" : "Konten live";
      status.dataset.state = "ok";
    }
  }

  function setSaveStatus(text, ok) {
    if (!ui.saveStatus) return;
    ui.saveStatus.textContent = text;
    ui.saveStatus.dataset.state = ok ? "ok" : "error";
  }

  function updateEditButton() {
    if (!ui.editToggle) return;
    ui.editToggle.textContent = editing ? "Mode Edit: Aktif" : "Mode Edit: Nonaktif";
    ui.editToggle.setAttribute("aria-pressed", String(editing));
    ui.editToggle.classList.toggle("is-active", editing);
  }

  function openPanel(tab) {
    if (!readSession()) {
      openLogin();
      return;
    }
    if (!ui.panel) return;
    if (panelOpen && !ui.panel.hidden) {
      if (tab && tab !== activeTab) setTab(tab);
      return;
    }
    clearTimeout(panelHideTimer);
    if (tab) activeTab = tab;
    ui.panel.hidden = false;
    panelOpen = true;
    document.body.classList.add("cms-panel-open");
    void ui.panel.offsetWidth;
    ui.panel.classList.add("is-open");
    renderActiveTab();
    updateBar();
    setTimeout(() => {
      if (ui.panelClose) ui.panelClose.focus();
    }, 80);
  }

  function closePanel() {
    if (!ui.panel) return;
    panelOpen = false;
    document.body.classList.remove("cms-panel-open");
    ui.panel.classList.remove("is-open");
    clearTimeout(panelHideTimer);
    panelHideTimer = setTimeout(() => { if (ui.panel) ui.panel.hidden = true; }, 240);
  }

  function setTab(tab) {
    activeTab = tab;
    $$("[data-cms-tab-button]", ui.panel).forEach((button) => {
      const active = button.dataset.cmsTabButton === tab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    $$("[data-cms-tab]", ui.panel).forEach((section) => {
      section.hidden = section.dataset.cmsTab !== tab;
    });
    renderActiveTab();
  }

  function renderActiveTab() {
    if (!panelOpen) return;
    if (activeTab === "content") renderContentTab();
    else if (activeTab === "settings") renderSettingsTab();
    else if (activeTab === "publish") renderPublishTab();
    else if (activeTab === "help") renderHelpTab();
  }

  function toast(message, type = "info") {
    if (!ui.toasts) return;
    const item = document.createElement("div");
    item.className = "cms-toast cms-toast--" + type;
    item.textContent = message;
    ui.toasts.appendChild(item);
    void item.offsetWidth;
    item.classList.add("is-visible");
    setTimeout(() => {
      item.classList.remove("is-visible");
      setTimeout(() => item.remove(), 220);
    }, 3600);
  }


  /* ---------- Bangun antarmuka panel ---------- */
  function buildUI() {
    if (document.querySelector(".cms-root")) return;
    const root = document.createElement("div");
    root.className = "cms-root";
    root.setAttribute(ADMIN_ATTR, "");
    root.innerHTML = `
      <div class="cms-adminbar" id="cmsAdminbar" hidden>
        <div class="cms-bar-brand">
          <span class="cms-bar-lock" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
          </span>
          <span>SSO Admin</span>
        </div>
        <span class="cms-bar-page" id="cmsBarPage">Halaman</span>
        <span class="cms-bar-status" id="cmsSaveStatus" data-state="ok">Siap</span>
        <span class="cms-bar-spacer"></span>
        <button type="button" class="cms-bar-btn" id="cmsEditToggle" data-cms-action="toggle-edit" aria-pressed="false">Mode Edit: Nonaktif</button>
        <button type="button" class="cms-bar-btn cms-bar-btn--primary" data-cms-action="open-panel">Panel</button>
        <button type="button" class="cms-bar-btn cms-bar-btn--ghost" data-cms-action="logout">Keluar</button>
      </div>

      <aside class="cms-panel" id="cmsPanel" aria-label="SSO Panel Admin" hidden>
        <header class="cms-panel-head">
          <div>
            <p class="cms-panel-eyebrow">Akses Terbatas</p>
            <h2>Panel Admin</h2>
            <p class="cms-panel-page" id="cmsPanelPage">Halaman</p>
          </div>
          <button type="button" class="cms-icon-btn" id="cmsPanelClose" aria-label="Tutup panel">×</button>
        </header>
        <nav class="cms-tabs" role="tablist" aria-label="Menu Panel Admin">
          <button type="button" role="tab" class="cms-tab is-active" data-cms-tab-button="content" aria-selected="true">Konten</button>
          <button type="button" role="tab" class="cms-tab" data-cms-tab-button="settings" aria-selected="false">Pengaturan</button>
          <button type="button" role="tab" class="cms-tab" data-cms-tab-button="publish" aria-selected="false">Publikasi</button>
          <button type="button" role="tab" class="cms-tab" data-cms-tab-button="help" aria-selected="false">Bantuan</button>
        </nav>
        <div class="cms-panel-body" id="cmsPanelBody">
          <section data-cms-tab="content"></section>
          <section data-cms-tab="settings" hidden></section>
          <section data-cms-tab="publish" hidden></section>
          <section data-cms-tab="help" hidden></section>
        </div>
      </aside>

      <div class="cms-modal" id="cmsLoginModal" hidden>
        <div class="cms-modal-card cms-login-card" role="dialog" aria-modal="true" aria-labelledby="cmsLoginTitle">
          <button type="button" class="cms-icon-btn cms-modal-close" data-cms-close="login" aria-label="Tutup">×</button>
          <div class="cms-login-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none"/></svg>
          </div>
          <p class="cms-eyebrow">Single Sign-On</p>
          <h2 id="cmsLoginTitle">SSO Panel Login Admin</h2>
          <p class="cms-login-sub">Masuk untuk mengelola seluruh teks, gambar, tautan, dan pengaturan website.</p>
          <form id="cmsLoginForm" autocomplete="on">
            <label class="cms-label">
              <span>Username</span>
              <input type="text" id="cmsLoginUser" autocomplete="username" spellcheck="false" placeholder="Masukkan username">
            </label>
            <label class="cms-label">
              <span>Password</span>
              <span class="cms-pass-wrap">
                <input type="password" id="cmsLoginPass" autocomplete="current-password" placeholder="Masukkan password">
                <button type="button" class="cms-pass-toggle" data-cms-action="toggle-password" aria-label="Tampilkan password">Lihat</button>
              </span>
            </label>
            <p class="cms-error" id="cmsLoginError" role="alert"></p>
            <button type="submit" class="cms-btn cms-btn--primary cms-btn--block" id="cmsLoginSubmit">Masuk ke Panel</button>
          </form>
          <p class="cms-login-foot">Akses tersembunyi • Sesi berakhir otomatis setelah 30 menit tidak aktif</p>
        </div>
      </div>

      <div class="cms-modal" id="cmsMediaModal" hidden>
        <div class="cms-modal-card" role="dialog" aria-modal="true" aria-labelledby="cmsMediaTitle">
          <button type="button" class="cms-icon-btn cms-modal-close" data-cms-close="media" aria-label="Tutup">×</button>
          <p class="cms-eyebrow">Media</p>
          <h2 id="cmsMediaTitle">Edit Gambar</h2>
          <form id="cmsMediaForm">
            <label class="cms-label"><span>URL gambar</span><input type="text" id="cmsMediaSrc" placeholder="assets/img/hero.svg atau https://…"></label>
            <label class="cms-label"><span>Teks alternatif (alt)</span><input type="text" id="cmsMediaAlt" placeholder="Deskripsi gambar untuk aksesibilitas"></label>
            <label class="cms-label"><span>Tooltip / judul</span><input type="text" id="cmsMediaTitleAttr" placeholder="Opsional"></label>
            <label class="cms-label"><span>Atau unggah gambar (maks. 1,5 MB)</span><input type="file" id="cmsMediaFile" accept="image/*"></label>
            <p class="cms-hint" id="cmsMediaHint">Gambar unggahan disimpan sebagai data URL di content.json. Untuk situs produksi, sebaiknya gunakan URL gambar.</p>
            <div class="cms-media-preview"><img id="cmsMediaPreview" alt="Pratinjau gambar"></div>
            <div class="cms-btn-row">
              <button type="submit" class="cms-btn cms-btn--primary">Simpan Gambar</button>
              <button type="button" class="cms-btn cms-btn--ghost" data-cms-close="media">Batal</button>
            </div>
          </form>
        </div>
      </div>

      <div class="cms-modal" id="cmsLinkModal" hidden>
        <div class="cms-modal-card" role="dialog" aria-modal="true" aria-labelledby="cmsLinkTitle">
          <button type="button" class="cms-icon-btn cms-modal-close" data-cms-close="link" aria-label="Tutup">×</button>
          <p class="cms-eyebrow">Tautan</p>
          <h2 id="cmsLinkTitle">Edit Tautan</h2>
          <form id="cmsLinkForm">
            <label class="cms-label"><span>URL tujuan</span><input type="text" id="cmsLinkHref" placeholder="kontak.html atau https://…"></label>
            <label class="cms-label"><span>Tooltip / judul</span><input type="text" id="cmsLinkTitleAttr" placeholder="Opsional"></label>
            <label class="cms-label"><span>Target</span>
              <select id="cmsLinkTarget">
                <option value="">Default</option>
                <option value="_self">Tab yang sama</option>
                <option value="_blank">Tab baru</option>
              </select>
            </label>
            <div class="cms-btn-row">
              <button type="submit" class="cms-btn cms-btn--primary">Simpan Tautan</button>
              <button type="button" class="cms-btn cms-btn--ghost" data-cms-close="link">Batal</button>
            </div>
          </form>
        </div>
      </div>

      <div class="cms-toasts" id="cmsToasts" aria-live="polite" aria-atomic="false"></div>
    `;
    document.body.appendChild(root);

    ui.root = root;
    ui.adminbar = $("#cmsAdminbar", root);
    ui.barPage = $("#cmsBarPage", root);
    ui.saveStatus = $("#cmsSaveStatus", root);
    ui.editToggle = $("#cmsEditToggle", root);
    ui.panel = $("#cmsPanel", root);
    ui.panelPage = $("#cmsPanelPage", root);
    ui.panelClose = $("#cmsPanelClose", root);
    ui.panelBody = $("#cmsPanelBody", root);
    ui.loginModal = $("#cmsLoginModal", root);
    ui.loginForm = $("#cmsLoginForm", root);
    ui.loginUser = $("#cmsLoginUser", root);
    ui.loginPass = $("#cmsLoginPass", root);
    ui.loginError = $("#cmsLoginError", root);
    ui.loginSubmit = $("#cmsLoginSubmit", root);
    ui.mediaModal = $("#cmsMediaModal", root);
    ui.mediaForm = $("#cmsMediaForm", root);
    ui.mediaSrc = $("#cmsMediaSrc", root);
    ui.mediaAlt = $("#cmsMediaAlt", root);
    ui.mediaTitle = $("#cmsMediaTitleAttr", root);
    ui.mediaFile = $("#cmsMediaFile", root);
    ui.mediaPreview = $("#cmsMediaPreview", root);
    ui.mediaHint = $("#cmsMediaHint", root);
    ui.linkModal = $("#cmsLinkModal", root);
    ui.linkForm = $("#cmsLinkForm", root);
    ui.linkHref = $("#cmsLinkHref", root);
    ui.linkTitle = $("#cmsLinkTitleAttr", root);
    ui.linkTarget = $("#cmsLinkTarget", root);
    ui.toasts = $("#cmsToasts", root);

    bindUIEvents();
    bindEditEvents();
    bindGlobalEvents();
  }

  /* ---------- Render: tab Konten ---------- */
  function fieldHost(parent) {
    return parent.closest("h1,h2,h3,h4,h5,h6,p,li,a,button,label,td,th,dt,dd,small,strong,em,b,i,blockquote,figcaption,summary,option,span") || parent;
  }

  function getTextFieldsForPanel() {
    if (!editing) {
      return collectTextFields({ includeWhitespace: true }).filter((field) => field.value.trim() || hasTextOverride(field.key));
    }
    const fields = [];
    editingSpans.forEach((span, key) => {
      const parent = span.parentElement;
      if (!parent) return;
      fields.push({ key, node: span, parent, value: span.textContent, wrappable: true });
    });
    collectTextFields({ includeWhitespace: true }).forEach((field) => {
      if (editingSpans.has(field.key)) return;
      if (!field.value.trim() && !hasTextOverride(field.key)) return;
      fields.push(field);
    });
    return fields;
  }

  function textFieldHtml(field) {
    const host = fieldHost(field.parent);
    const section = getSectionInfo(host);
    const tag = host.tagName.toLowerCase();
    const value = field.value || "";
    const preview = value.trim().replace(/\s+/g, " ").slice(0, 90) || "(kosong)";
    const search = (section.label + " " + tag + " " + value).toLowerCase();
    const reset = hasTextOverride(field.key)
      ? `<button type="button" class="cms-mini-btn" data-cms-action="reset-text" data-key="${esc(field.key)}">Kembalikan</button>`
      : "";
    return `
      <div class="cms-field" data-cms-field data-search="${esc(search)}">
        <div class="cms-field-head">
          <div class="cms-field-title">
            <span class="cms-tag">${esc(tag)}</span>
            <span class="cms-field-preview">${esc(preview)}</span>
          </div>
          <div class="cms-field-actions">
            <button type="button" class="cms-mini-btn" data-cms-action="focus-field" data-key="${esc(field.key)}">Fokus</button>
            ${reset}
          </div>
        </div>
        <textarea class="cms-input cms-textarea" data-cms-text-input data-key="${esc(field.key)}" rows="${value.length > 120 ? 3 : 2}" spellcheck="false">${esc(value)}</textarea>
      </div>`;
  }

  function attrFieldHtml(field) {
    const section = getSectionInfo(field.el);
    const typeLabel = field.label;
    const text = (field.el.textContent || "").trim().replace(/\s+/g, " ");
    const label = typeLabel + (text ? " — " + text.slice(0, 60) : "");
    const search = (section.label + " " + typeLabel + " " + label + " " + JSON.stringify(field.fields)).toLowerCase();
    const inputs = Object.keys(field.fields).map((attr) => {
      const value = field.fields[attr] || "";
      const over = hasAttrOverride(field.key, attr);
      const reset = over
        ? `<button type="button" class="cms-mini-btn" data-cms-action="reset-attr" data-key="${esc(field.key)}" data-attr="${esc(attr)}">Kembalikan</button>`
        : "";
      return `
        <div class="cms-attr-row">
          <label class="cms-attr-label">
            <span>${esc(ATTR_LABELS[attr] || attr)}</span>
            <input class="cms-input" type="text" data-cms-attr-input data-key="${esc(field.key)}" data-attr="${esc(attr)}" value="${esc(value)}" spellcheck="false">
          </label>
          ${reset}
        </div>`;
    }).join("");
    const preview = field.type === "image" && field.fields.src
      ? `<div class="cms-thumb"><img src="${esc(field.fields.src)}" alt=""></div>`
      : "";
    return `
      <div class="cms-field" data-cms-field data-search="${esc(search)}">
        <div class="cms-field-head">
          <div class="cms-field-title">
            <span class="cms-tag cms-tag--media">${esc(typeLabel)}</span>
            <span class="cms-field-preview">${esc(label)}</span>
          </div>
        </div>
        ${preview}
        ${inputs}
      </div>`;
  }

  function groupsHtml(groups) {
    return groups.map((group) => {
      if (!group.items.length) return "";
      return `
        <details class="cms-group" data-cms-group open>
          <summary><span>${esc(group.label)}</span><span class="cms-count">${group.items.length}</span></summary>
          <div class="cms-group-body">${group.items.join("")}</div>
        </details>`;
    }).join("");
  }

  function pageLinksHtml() {
    const current = getPageId();
    return `<div class="cms-page-links">` + PAGE_LINKS.map((page) => {
      const active = page === current ? " is-current" : "";
      return `<a class="cms-page-link${active}" href="${esc(pageHref(page))}?cms=panel" data-cms-page-link>${esc(PAGE_NAMES[page])}</a>`;
    }).join("") + `</div>`;
  }

  function renderContentTab() {
    const section = $('[data-cms-tab="content"]', ui.panelBody);
    if (!section) return;
    const textFields = getTextFieldsForPanel();
    const attrFields = collectAttrFields();
    const textGroupsMap = new Map();
    const attrGroupsMap = new Map();

    textFields.forEach((field) => {
      const info = getSectionInfo(fieldHost(field.parent));
      const key = info.label;
      if (!textGroupsMap.has(key)) textGroupsMap.set(key, []);
      textGroupsMap.get(key).push(textFieldHtml(field));
    });

    attrFields.forEach((field) => {
      const info = getSectionInfo(field.el);
      const key = info.label + " — Tautan & Media";
      if (!attrGroupsMap.has(key)) attrGroupsMap.set(key, []);
      attrGroupsMap.get(key).push(attrFieldHtml(field));
    });

    const groups = [
      ...Array.from(textGroupsMap, ([label, items]) => ({ label, items })),
      ...Array.from(attrGroupsMap, ([label, items]) => ({ label, items })),
    ];

    section.innerHTML = `
      <div class="cms-toolbar">
        <button type="button" class="cms-btn cms-btn--primary cms-btn--sm" data-cms-action="toggle-edit" id="cmsContentEditToggle">${editing ? "Selesai Edit Langsung" : "Mulai Edit Langsung"}</button>
        <button type="button" class="cms-btn cms-btn--ghost cms-btn--sm" data-cms-action="refresh-fields">Segarkan Daftar</button>
        <button type="button" class="cms-btn cms-btn--danger-ghost cms-btn--sm" data-cms-action="reset-page">Reset Halaman Ini</button>
      </div>
      ${pageLinksHtml()}
      <div class="cms-content-info">
        <span><strong>${textFields.length}</strong> teks</span>
        <span><strong>${attrFields.length}</strong> tautan/media</span>
        <span><strong>${countChanges()}</strong> perubahan</span>
      </div>
      <div class="cms-search-wrap">
        <input type="search" class="cms-input" id="cmsFieldSearch" placeholder="Cari teks, tautan, atau bagian…" value="${esc(textSearch)}" autocomplete="off">
      </div>
      <p class="cms-hint">Klik <strong>Fokus</strong> untuk langsung menyorot elemen di halaman. Anda juga dapat mengklik teks secara langsung saat Mode Edit aktif.</p>
      <div class="cms-field-list" id="cmsFieldList">
        ${groups.length ? groupsHtml(groups) : '<p class="cms-empty">Tidak ada konten yang dapat diedit di halaman ini.</p>'}
      </div>
    `;

    applyContentSearch();
  }

  function applyContentSearch() {
    if (!ui.panel) return;
    const query = textSearch.trim().toLowerCase();
    $$("[data-cms-group]", ui.panel).forEach((group) => {
      let visible = 0;
      $$("[data-cms-field]", group).forEach((field) => {
        const match = !query || (field.dataset.search || "").includes(query);
        field.hidden = !match;
        if (match) visible += 1;
      });
      group.hidden = visible === 0;
      if (query) group.open = true;
    });
  }

  /* ---------- Render: tab Pengaturan ---------- */
  function siteValue(key) {
    if (Object.prototype.hasOwnProperty.call(state.site || {}, key)) return state.site[key];
    const defaults = originalSite || (window.IK && window.IK.defaults) || {};
    return defaults[key] ?? "";
  }

  function metaValue(key) {
    const page = pageState(false);
    if (Object.prototype.hasOwnProperty.call(page.meta || {}, key)) return page.meta[key];
    return originalMeta ? originalMeta[key] ?? "" : "";
  }

  function themeValue(key) {
    if (Object.prototype.hasOwnProperty.call(state.theme || {}, key)) return state.theme[key];
    return originalTheme ? originalTheme[key] ?? "" : "";
  }

  function settingsFieldHtml(kind, field, value) {
    const overrideKey = kind === "site" ? "site" : kind === "meta" ? "meta" : "theme";
    const overridden = kind === "site"
      ? Object.prototype.hasOwnProperty.call(state.site || {}, field.key)
      : kind === "meta"
        ? Object.prototype.hasOwnProperty.call(pageState(false).meta || {}, field.key)
        : Object.prototype.hasOwnProperty.call(state.theme || {}, field.key);
    const reset = overridden
      ? `<button type="button" class="cms-mini-btn" data-cms-action="reset-${overrideKey}" data-key="${esc(field.key)}">Kembalikan</button>`
      : "";
    const attrs = kind === "site" ? `data-cms-site-input data-key="${esc(field.key)}"` : `data-cms-meta-input data-key="${esc(field.key)}"`;
    const input = field.type === "textarea"
      ? `<textarea class="cms-input cms-textarea" ${attrs} rows="3" spellcheck="false">${esc(value)}</textarea>`
      : `<input class="cms-input" type="${esc(field.type || "text")}" ${attrs} value="${esc(value)}" spellcheck="false">`;
    return `
      <div class="cms-setting">
        <div class="cms-setting-head">
          <label>${esc(field.label)}</label>
          ${reset}
        </div>
        ${input}
        ${field.hint ? `<p class="cms-hint">${esc(field.hint)}</p>` : ""}
      </div>`;
  }

  function renderSettingsTab() {
    const section = $('[data-cms-tab="settings"]', ui.panelBody);
    if (!section) return;
    const siteHtml = SITE_FIELDS.map((field) => settingsFieldHtml("site", field, siteValue(field.key))).join("");
    const metaHtml = META_FIELDS.map((field) => settingsFieldHtml("meta", field, metaValue(field.key))).join("");
    const themeHtml = Object.keys(THEME_VARS).map((key) => {
      const value = themeValue(key);
      const overridden = Object.prototype.hasOwnProperty.call(state.theme || {}, key);
      const reset = overridden
        ? `<button type="button" class="cms-mini-btn" data-cms-action="reset-theme" data-key="${esc(key)}">Kembalikan</button>`
        : "";
      return `
        <div class="cms-setting">
          <div class="cms-setting-head">
            <label>${esc(THEME_VARS[key].label)} <span class="cms-css-var">${esc(THEME_VARS[key].css)}</span></label>
            ${reset}
          </div>
          <div class="cms-color-row">
            <input class="cms-color" type="color" data-cms-theme-input data-key="${esc(key)}" value="${esc(colorInputValue(value))}" aria-label="${esc(THEME_VARS[key].label)}">
            <input class="cms-input" type="text" data-cms-theme-input data-key="${esc(key)}" value="${esc(value)}" spellcheck="false">
          </div>
        </div>`;
    }).join("");

    section.innerHTML = `
      <div class="cms-card">
        <h3>Identitas & Kontak</h3>
        <p class="cms-hint">Perubahan langsung dipakai oleh tautan WhatsApp, email, dan formulir.</p>
        ${siteHtml}
      </div>
      <div class="cms-card">
        <h3>SEO & Meta Halaman</h3>
        <p class="cms-hint">Pengaturan ini hanya untuk halaman <strong>${esc(getPageLabel())}</strong>.</p>
        ${metaHtml}
      </div>
      <div class="cms-card">
        <h3>Tampilan & Warna</h3>
        <p class="cms-hint">Ubah variabel warna utama situs. Perubahan langsung terlihat.</p>
        ${themeHtml}
      </div>
    `;
  }

  /* ---------- Render: tab Publikasi ---------- */
  function renderPublishTab() {
    const section = $('[data-cms-tab="publish"]', ui.panelBody);
    if (!section) return;
    const cfg = readGhConfig();
    const rememberedToken = sessionStorage.getItem(GH_TOKEN_KEY) || "";
    const source = hasLocal
      ? (remoteSource ? remoteSource + " + draft lokal" : "Penyimpanan lokal")
      : (remoteSource || "Belum ada");
    section.innerHTML = `
      <div class="cms-card">
        <h3>Status Konten</h3>
        <dl class="cms-status-list">
          <div><dt>Halaman aktif</dt><dd>${esc(getPageLabel())}</dd></div>
          <div><dt>Perubahan</dt><dd>${countChanges()} item</dd></div>
          <div><dt>Diperbarui</dt><dd>${esc(formatDate(state.updatedAt))}</dd></div>
          <div><dt>Konten server</dt><dd>${esc(formatDate(remoteState && remoteState.updatedAt))}</dd></div>
          <div><dt>Sumber live</dt><dd>${esc(source)}</dd></div>
        </dl>
        <p class="cms-hint">Setiap perubahan langsung tampil di browser ini dan disimpan otomatis. Untuk mengubah situs bagi semua pengunjung, publikasikan ke GitHub.</p>
      </div>

      <div class="cms-card">
        <h3>Publikasikan ke GitHub</h3>
        <p class="cms-hint">Masukkan Personal Access Token (fine-grained) dengan izin <strong>Contents: Read and write</strong> pada repository. Token tidak disimpan permanen.</p>
        <form id="cmsGithubForm" autocomplete="off">
          <label class="cms-label"><span>Personal Access Token</span><input type="password" class="cms-input" id="cmsGhToken" value="${esc(rememberedToken)}" placeholder="github_pat_…" spellcheck="false"></label>
          <label class="cms-check"><input type="checkbox" id="cmsGhRemember" ${rememberedToken ? "checked" : ""}> Simpan token di tab ini</label>
          <div class="cms-grid-2">
            <label class="cms-label"><span>Repository</span><input type="text" class="cms-input" id="cmsGhRepo" value="${esc(cfg.repo)}" spellcheck="false"></label>
            <label class="cms-label"><span>Branch</span><input type="text" class="cms-input" id="cmsGhBranch" value="${esc(cfg.branch)}" spellcheck="false"></label>
          </div>
          <label class="cms-label"><span>Path berkas konten</span><input type="text" class="cms-input" id="cmsGhPath" value="${esc(cfg.path)}" spellcheck="false"></label>
          <label class="cms-label"><span>Pesan commit</span><input type="text" class="cms-input" id="cmsGhMessage" value="CMS: perbarui konten website" spellcheck="false"></label>
          <button type="button" class="cms-btn cms-btn--primary cms-btn--block" data-cms-action="publish-github" id="cmsPublishButton">Publikasikan Sekarang</button>
          <p class="cms-status" id="cmsPublishStatus" role="status"></p>
        </form>
        <p class="cms-hint">GitHub Pages biasanya memperbarui situs dalam 1–2 menit. Konten live juga diambil langsung dari repository agar perubahan lebih cepat terlihat.</p>
      </div>

      <div class="cms-card">
        <h3>Cadangan & Pemulihan</h3>
        <div class="cms-btn-row">
          <button type="button" class="cms-btn cms-btn--ghost cms-btn--sm" data-cms-action="download-json">Unduh content.json</button>
          <button type="button" class="cms-btn cms-btn--ghost cms-btn--sm" data-cms-action="reload-server">Muat Ulang dari Server</button>
        </div>
        <label class="cms-file-btn">
          <span>Impor content.json</span>
          <input type="file" id="cmsImportFile" accept="application/json,.json">
        </label>
        <p class="cms-hint">Impor akan mengganti seluruh konten lokal dengan isi berkas. Unduh cadangan terlebih dahulu.</p>
      </div>

      <div class="cms-card cms-danger-card">
        <h3>Hapus Perubahan Lokal</h3>
        <p class="cms-hint">Menghapus draft di browser ini. Konten yang sudah dipublikasikan ke server tidak terhapus.</p>
        <button type="button" class="cms-btn cms-btn--danger cms-btn--sm" data-cms-action="reset-local">Hapus Semua Perubahan Lokal</button>
      </div>
    `;
  }

  /* ---------- Render: tab Bantuan ---------- */
  function renderHelpTab() {
    const section = $('[data-cms-tab="help"]', ui.panelBody);
    if (!section) return;
    section.innerHTML = `
      <div class="cms-card">
        <h3>Cara Mengedit</h3>
        <ol class="cms-list">
          <li>Klik <strong>Mode Edit Langsung</strong> pada bilah admin atau tab Konten.</li>
          <li>Klik teks mana pun di halaman, lalu ketik penggantinya. Perubahan langsung tampil.</li>
          <li>Klik gambar untuk mengganti URL/alt atau mengunggah gambar baru.</li>
          <li><kbd>Alt</kbd> + klik tautan untuk mengedit URL tujuan.</li>
          <li>Gunakan tab <strong>Pengaturan</strong> untuk WhatsApp, email, SEO, dan warna.</li>
          <li>Buka <strong>Publikasi</strong> untuk mengirim perubahan ke seluruh pengunjung.</li>
        </ol>
      </div>
      <div class="cms-card">
        <h3>Akses Tersembunyi</h3>
        <p>Panel tidak ditampilkan di menu publik. Gunakan salah satu cara berikut:</p>
        <ul class="cms-list">
          <li><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> (Windows/Linux) atau <kbd>⌘</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> (Mac)</li>
          <li><kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd></li>
          <li>Klik 5 kali cepat pada teks copyright di footer</li>
          <li>Klik ikon kunci samar di footer (muncul saat area footer disentuh)</li>
          <li>Buka <code>#sso-admin</code> pada alamat situs</li>
        </ul>
      </div>
      <div class="cms-card">
        <h3>Catatan Keamanan</h3>
        <p class="cms-hint">Panel ini berjalan sepenuhnya di browser (situs statis). Kredensial disimpan sebagai hash SHA-256 dan sesi dibatasi 8 jam, tetapi gerbang sisi klien bukan pengganti autentikasi server. Untuk keamanan produksi, gunakan OAuth/SSO server dan lindungi proses publikasi dengan token berizin minimum.</p>
      </div>
      <div class="cms-card">
        <h3>Penyimpanan</h3>
        <p class="cms-hint">Draft disimpan di <code>localStorage</code> browser ini. Konten untuk semua pengunjung disimpan di <code>assets/data/content.json</code> melalui publikasi GitHub. Cadangkan berkas secara berkala melalui tab Publikasi.</p>
      </div>
    `;
  }

  /* ---------- Mode edit langsung ---------- */
  function enterEditMode(options = {}) {
    if (editing) {
      updateEditButton();
      return;
    }
    editing = true;
    editingSpans.clear();
    const fields = collectTextFields({ includeWhitespace: true }).filter((field) => field.value.trim() || hasTextOverride(field.key));
    fields.forEach((field) => {
      if (!field.wrappable) return;
      if (!field.node.parentNode) return;
      const span = document.createElement("span");
      span.className = "cms-text";
      span.dataset.cmsKey = field.key;
      span.setAttribute("contenteditable", "plaintext-only");
      span.setAttribute("spellcheck", "false");
      span.setAttribute("role", "textbox");
      span.setAttribute("aria-label", "Edit teks");
      field.parent.replaceChild(span, field.node);
      span.appendChild(field.node);
      editingSpans.set(field.key, span);
    });
    document.body.classList.add("cms-edit-mode");
    updateEditButton();
    if (panelOpen) renderContentTab();
    if (!options.silent) toast("Mode edit aktif. Klik teks untuk mengubahnya.", "info");
  }

  function exitEditMode(options = {}) {
    if (!editing) return;
    editingSpans.forEach((span) => {
      if (!span.parentNode) return;
      const textNode = document.createTextNode(span.textContent);
      span.parentNode.replaceChild(textNode, span);
    });
    editingSpans.clear();
    editing = false;
    document.body.classList.remove("cms-edit-mode");
    updateEditButton();
    if (panelOpen) renderContentTab();
    if (!options.silent) toast("Mode edit nonaktif.", "info");
  }

  function toggleEditMode() {
    if (editing) {
      localStorage.setItem(EDIT_KEY, "0");
      exitEditMode();
    } else {
      localStorage.setItem(EDIT_KEY, "1");
      enterEditMode();
    }
  }

  function caretToEnd(el) {
    try {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (_) { /* abaikan */ }
  }

  function focusField(key) {
    if (!editing) enterEditMode({ silent: true });
    const span = editingSpans.get(key);
    if (span) {
      span.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        span.focus();
        caretToEnd(span);
        span.classList.add("cms-flash");
        setTimeout(() => span.classList.remove("cms-flash"), 1200);
      }, 260);
      return;
    }
    const field = collectTextFields({ includeWhitespace: true }).find((item) => item.key === key);
    if (field) {
      field.parent.scrollIntoView({ behavior: "smooth", block: "center" });
      field.parent.classList.add("cms-flash");
      setTimeout(() => field.parent.classList.remove("cms-flash"), 1200);
    }
  }

  function resetTextField(key) {
    const page = pageState();
    delete page.text[key];
    const original = originalTexts.has(key) ? originalTexts.get(key) : "";
    updateTextDom(key, original);
    markDirty();
    renderContentTab();
  }

  function resetAttrField(key, attr) {
    const page = pageState();
    const attrs = page.attrs[key] || {};
    delete attrs[attr];
    if (Object.keys(attrs).length) page.attrs[key] = attrs;
    else delete page.attrs[key];
    const field = collectAttrFields().find((item) => item.key === key);
    const original = originalAttrs.get(key) || {};
    if (field) {
      if (Object.prototype.hasOwnProperty.call(original, attr)) field.el.setAttribute(attr, original[attr]);
      else field.el.removeAttribute(attr);
      if (attr === "href" && (field.el.hasAttribute("data-wa") || field.el.hasAttribute("data-mailto")) && window.IK && window.IK.refreshLinks) {
        window.IK.refreshLinks();
      }
    }
    markDirty();
    renderContentTab();
  }

  function resetPage() {
    if (!window.confirm("Kembalikan seluruh konten halaman ini ke kondisi awal? Perubahan pada halaman ini akan dihapus.")) return;
    delete state.pages[getPageId()];
    applyAll();
    markDirty();
    renderContentTab();
    toast("Halaman ini dikembalikan ke konten awal.", "info");
  }

  function resetSiteField(key) {
    delete state.site[key];
    applySite();
    markDirty();
    renderSettingsTab();
  }

  function resetMetaField(key) {
    const page = pageState();
    delete page.meta[key];
    applyMeta();
    markDirty();
    renderSettingsTab();
  }

  function resetThemeField(key) {
    delete state.theme[key];
    applyTheme();
    markDirty();
    renderSettingsTab();
  }

  /* ---------- Modal media & tautan ---------- */
  function showModal(modal) {
    if (!modal) return;
    modal.hidden = false;
    void modal.offsetWidth;
    modal.classList.add("is-visible");
  }

  function hideModal(modal) {
    if (!modal) return;
    modal.classList.remove("is-visible");
    setTimeout(() => { if (modal) modal.hidden = true; }, 180);
  }

  function openMediaEditor(img) {
    if (!img) return;
    mediaTarget = img;
    ui.mediaSrc.value = img.getAttribute("src") || "";
    ui.mediaAlt.value = img.getAttribute("alt") || "";
    ui.mediaTitle.value = img.getAttribute("title") || "";
    ui.mediaPreview.src = img.getAttribute("src") || "";
    ui.mediaFile.value = "";
    ui.mediaHint.textContent = "Gambar unggahan disimpan sebagai data URL di content.json. Untuk situs produksi, sebaiknya gunakan URL gambar.";
    showModal(ui.mediaModal);
    setTimeout(() => ui.mediaSrc.focus(), 80);
  }

  function openLinkEditor(link) {
    if (!link) return;
    linkTarget = link;
    ui.linkHref.value = link.getAttribute("href") || "";
    ui.linkTitle.value = link.getAttribute("title") || "";
    const target = link.getAttribute("target") || "";
    ui.linkTarget.value = target === "_blank" ? "_blank" : target === "_self" ? "_self" : "";
    showModal(ui.linkModal);
    setTimeout(() => ui.linkHref.focus(), 80);
  }

  function handleMediaFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Berkas harus berupa gambar.", "error");
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      toast("Ukuran gambar maksimal 1,5 MB.", "error");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      ui.mediaSrc.value = String(reader.result || "");
      ui.mediaPreview.src = String(reader.result || "");
      ui.mediaHint.textContent = "Gambar siap dipakai. Data gambar akan disimpan di content.json.";
    };
    reader.readAsDataURL(file);
  }

  function handleMediaSubmit(event) {
    event.preventDefault();
    if (!mediaTarget) return;
    const key = elKey(mediaTarget);
    const page = pageState();
    const original = originalAttrs.get(key) || {};
    const current = page.attrs[key] || {};
    const values = {
      src: ui.mediaSrc.value.trim(),
      alt: ui.mediaAlt.value.trim(),
      title: ui.mediaTitle.value.trim(),
    };

    for (const attr of Object.keys(values)) {
      const safe = sanitizeAttr(attr, values[attr], mediaTarget);
      if (safe === null) {
        toast("URL gambar tidak diizinkan.", "error");
        return;
      }
    }

    Object.keys(values).forEach((attr) => {
      if (original[attr] === values[attr]) delete current[attr];
      else current[attr] = values[attr];
      mediaTarget.setAttribute(attr, values[attr]);
    });

    if (Object.keys(current).length) page.attrs[key] = current;
    else delete page.attrs[key];
    markDirty();
    hideModal(ui.mediaModal);
    if (panelOpen) renderContentTab();
    toast("Gambar diperbarui.", "success");
  }

  function handleLinkSubmit(event) {
    event.preventDefault();
    if (!linkTarget) return;
    const key = elKey(linkTarget);
    const page = pageState();
    const original = originalAttrs.get(key) || {};
    const current = page.attrs[key] || {};
    const values = {
      href: ui.linkHref.value.trim(),
      title: ui.linkTitle.value.trim(),
      target: ui.linkTarget.value,
    };

    const hrefSafe = sanitizeAttr("href", values.href, linkTarget);
    if (hrefSafe === null) {
      toast("URL tautan tidak diizinkan.", "error");
      return;
    }
    values.href = hrefSafe;

    Object.keys(values).forEach((attr) => {
      const safe = sanitizeAttr(attr, values[attr], linkTarget);
      if (safe === null) return;
      if (original[attr] === safe) delete current[attr];
      else current[attr] = safe;
      linkTarget.setAttribute(attr, safe);
    });

    if (Object.keys(current).length) page.attrs[key] = current;
    else delete page.attrs[key];
    markDirty();
    hideModal(ui.linkModal);
    if (panelOpen) renderContentTab();
    toast("Tautan diperbarui.", "success");
  }

  function togglePasswordVisibility() {
    if (!ui.loginPass) return;
    const show = ui.loginPass.type === "password";
    ui.loginPass.type = show ? "text" : "password";
    const button = $('[data-cms-action="toggle-password"]', ui.loginModal);
    if (button) {
      button.textContent = show ? "Sembunyikan" : "Lihat";
      button.setAttribute("aria-label", show ? "Sembunyikan password" : "Tampilkan password");
    }
  }

  /* ---------- Tombol reset dinamis ---------- */
  function makeResetButton(action, key, attr) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cms-mini-btn";
    button.dataset.cmsAction = action;
    button.dataset.key = key;
    if (attr) button.dataset.attr = attr;
    button.textContent = "Kembalikan";
    return button;
  }

  function updateTextResetButton(input) {
    const field = input.closest(".cms-field");
    if (!field) return;
    const actions = field.querySelector(".cms-field-actions");
    if (!actions) return;
    const key = input.dataset.key;
    const existing = actions.querySelector('[data-cms-action="reset-text"]');
    if (hasTextOverride(key)) {
      if (!existing) actions.appendChild(makeResetButton("reset-text", key));
    } else if (existing) {
      existing.remove();
    }
  }

  function updateAttrResetButton(input) {
    const row = input.closest(".cms-attr-row");
    if (!row) return;
    const key = input.dataset.key;
    const attr = input.dataset.attr;
    const existing = row.querySelector('[data-cms-action="reset-attr"][data-attr="' + cssEscape(attr) + '"]');
    if (hasAttrOverride(key, attr)) {
      if (!existing) row.appendChild(makeResetButton("reset-attr", key, attr));
    } else if (existing) {
      existing.remove();
    }
  }

  function updateSettingResetButton(input, kind) {
    const setting = input.closest(".cms-setting");
    if (!setting) return;
    const head = setting.querySelector(".cms-setting-head");
    if (!head) return;
    const key = input.dataset.key;
    const action = kind === "site" ? "reset-site" : kind === "meta" ? "reset-meta" : "reset-theme";
    const overridden = kind === "site"
      ? Object.prototype.hasOwnProperty.call(state.site || {}, key)
      : kind === "meta"
        ? Object.prototype.hasOwnProperty.call(pageState(false).meta || {}, key)
        : Object.prototype.hasOwnProperty.call(state.theme || {}, key);
    const existing = head.querySelector('[data-cms-action="' + action + '"]');
    if (overridden) {
      if (!existing) head.appendChild(makeResetButton(action, key));
    } else if (existing) {
      existing.remove();
    }
  }

  /* ---------- Event UI ---------- */
  function bindUIEvents() {
    ui.loginForm.addEventListener("submit", handleLogin);
    ui.loginUser.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        ui.loginForm.requestSubmit();
      }
    });

    ui.mediaForm.addEventListener("submit", handleMediaSubmit);
    ui.mediaFile.addEventListener("change", handleMediaFile);
    ui.mediaSrc.addEventListener("input", () => {
      ui.mediaPreview.src = ui.mediaSrc.value;
    });

    ui.linkForm.addEventListener("submit", handleLinkSubmit);
    ui.panelClose.addEventListener("click", closePanel);

    $$("[data-cms-tab-button]", ui.panel).forEach((button) => {
      button.addEventListener("click", () => setTab(button.dataset.cmsTabButton));
    });

    ui.adminbar.addEventListener("click", (event) => {
      const button = event.target.closest("[data-cms-action]");
      if (!button) return;
      const action = button.dataset.cmsAction;
      if (action === "toggle-edit") toggleEditMode();
      else if (action === "open-panel") openPanel();
      else if (action === "logout") logout();
    });

    ui.panel.addEventListener("click", (event) => {
      const button = event.target.closest("[data-cms-action]");
      if (button) {
        const action = button.dataset.cmsAction;
        const key = button.dataset.key || "";
        if (action === "toggle-edit") toggleEditMode();
        else if (action === "refresh-fields") renderContentTab();
        else if (action === "reset-page") resetPage();
        else if (action === "focus-field") focusField(key);
        else if (action === "reset-text") resetTextField(key);
        else if (action === "reset-attr") resetAttrField(key, button.dataset.attr || "");
        else if (action === "reset-site") resetSiteField(key);
        else if (action === "reset-meta") resetMetaField(key);
        else if (action === "reset-theme") resetThemeField(key);
        else if (action === "download-json") downloadJson();
        else if (action === "reload-server") reloadServer();
        else if (action === "reset-local") resetLocal();
        else if (action === "publish-github") publishToGithub();
        return;
      }
      const pageLink = event.target.closest("[data-cms-page-link]");
      if (pageLink) localStorage.setItem(EDIT_KEY, editing ? "1" : "0");
    });

    ui.panel.addEventListener("input", (event) => {
      const target = event.target;
      if (target.id === "cmsFieldSearch") {
        textSearch = target.value || "";
        applyContentSearch();
        return;
      }
      if (target.matches("[data-cms-text-input]")) {
        const key = target.dataset.key;
        setTextOverride(key, target.value);
        updateTextDom(key, target.value);
        updateTextResetButton(target);
        return;
      }
      if (target.matches("[data-cms-attr-input]")) {
        const key = target.dataset.key;
        const attr = target.dataset.attr;
        setAttrOverride(key, attr, target.value);
        updateAttrDom(key, attr, target.value);
        updateAttrResetButton(target);
        return;
      }
      if (target.matches("[data-cms-site-input]")) {
        setSiteValue(target.dataset.key, target.value);
        updateSettingResetButton(target, "site");
        return;
      }
      if (target.matches("[data-cms-meta-input]")) {
        setMetaValue(target.dataset.key, target.value);
        updateSettingResetButton(target, "meta");
        return;
      }
      if (target.matches("[data-cms-theme-input]")) {
        const key = target.dataset.key;
        const value = target.value;
        setThemeValue(key, value);
        $$('[data-cms-theme-input][data-key="' + cssEscape(key) + '"]', ui.panel).forEach((input) => {
          if (input !== target) input.value = value;
        });
        updateSettingResetButton(target, "theme");
      }
    });

    ui.panel.addEventListener("change", (event) => {
      if (event.target.id === "cmsImportFile") importJsonFile(event.target.files && event.target.files[0]);
    });

    ui.root.addEventListener("click", (event) => {
      const closeButton = event.target.closest("[data-cms-close]");
      if (closeButton) {
        const which = closeButton.dataset.cmsClose;
        if (which === "login") closeLogin();
        else if (which === "media") hideModal(ui.mediaModal);
        else if (which === "link") hideModal(ui.linkModal);
        return;
      }
      if (event.target === ui.loginModal) closeLogin();
      if (event.target === ui.mediaModal) hideModal(ui.mediaModal);
      if (event.target === ui.linkModal) hideModal(ui.linkModal);
      const passwordButton = event.target.closest('[data-cms-action="toggle-password"]');
      if (passwordButton) togglePasswordVisibility();
    });
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/["\\]/g, "\\$&");
  }

  /* ---------- Event editing langsung ---------- */
  function bindEditEvents() {
    document.addEventListener("click", (event) => {
      if (!editing) return;
      if (event.target.closest("[" + ADMIN_ATTR + "]")) return;

      const img = event.target.closest("img");
      if (img) {
        event.preventDefault();
        event.stopPropagation();
        openMediaEditor(img);
        return;
      }

      const link = event.target.closest("a");
      if (link && event.altKey) {
        event.preventDefault();
        event.stopPropagation();
        openLinkEditor(link);
        return;
      }

      const text = event.target.closest(".cms-text");
      if (text) {
        event.preventDefault();
        event.stopPropagation();
        setTimeout(() => {
          text.focus();
          caretToEnd(text);
        }, 0);
        return;
      }

      const blocker = event.target.closest("a, button, label, summary, select, input, textarea");
      if (blocker) event.preventDefault();
    }, true);

    document.addEventListener("input", (event) => {
      if (!editing) return;
      const span = event.target.closest && event.target.closest(".cms-text");
      if (!span) return;
      const key = span.dataset.cmsKey;
      setTextOverride(key, span.textContent);
      syncPanelText(key, span.textContent);
    });

    document.addEventListener("keydown", (event) => {
      if (!editing) return;
      if (event.target.closest && event.target.closest("[" + ADMIN_ATTR + "]")) return;
      if (event.key === "Enter" && !event.shiftKey) {
        const span = event.target.closest && event.target.closest(".cms-text");
        if (span) {
          event.preventDefault();
          span.blur();
        }
      }
    });

    document.addEventListener("paste", (event) => {
      if (!editing) return;
      const span = event.target.closest && event.target.closest(".cms-text");
      if (!span) return;
      event.preventDefault();
      const text = (event.clipboardData || window.clipboardData).getData("text/plain");
      document.execCommand("insertText", false, text);
    });
  }

  function syncPanelText(key, value) {
    if (!panelOpen) return;
    const input = $$("[data-cms-text-input]", ui.panel).find((item) => item.dataset.key === key);
    if (input) {
      if (input.value !== value) input.value = value;
      updateTextResetButton(input);
    }
  }

  /* ---------- Event global & akses tersembunyi ---------- */
  function bindGlobalEvents() {
    document.addEventListener("keydown", (event) => {
      const key = String(event.key || "").toLowerCase();
      if (key === "a" && event.shiftKey && (event.ctrlKey || event.metaKey || event.altKey)) {
        event.preventDefault();
        openLoginOrPanel();
        return;
      }
      if (event.key !== "Escape") return;
      if (ui.loginModal && !ui.loginModal.hidden) {
        closeLogin();
        return;
      }
      if (ui.mediaModal && !ui.mediaModal.hidden) {
        hideModal(ui.mediaModal);
        return;
      }
      if (ui.linkModal && !ui.linkModal.hidden) {
        hideModal(ui.linkModal);
        return;
      }
      if (panelOpen) {
        closePanel();
        return;
      }
      if (editing) exitEditMode();
    });

    ["pointerdown", "keydown", "touchstart", "scroll"].forEach((name) => {
      document.addEventListener(name, touchActivity, { passive: true });
    });

    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY) return;
      if (!event.newValue) {
        hasLocal = false;
        state = remoteState ? mergeState(remoteState, null) : emptyState();
        applyAll();
        toast("Draft lokal dihapus dari tab lain.", "info");
        return;
      }
      try {
        const parsed = normalizeState(JSON.parse(event.newValue));
        hasLocal = true;
        state = mergeState(remoteState, parsed);
        applyAll();
        toast("Konten diperbarui dari tab lain.", "info");
      } catch (_) { /* abaikan */ }
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) flushSave();
      else if (!hasLocal) syncRemote();
    });
    window.addEventListener("beforeunload", flushSave);

    setInterval(() => {
      const session = readSession();
      if (session && Date.now() - lastActivity > IDLE_TTL) {
        logout(false);
        toast("Sesi berakhir karena tidak ada aktivitas. Silakan login kembali.", "warn");
      } else if (!session && ui.adminbar && !ui.adminbar.hidden) {
        logout(false);
        toast("Sesi berakhir. Silakan login kembali.", "warn");
      }
    }, 30000);

    setInterval(() => {
      if (!document.hidden && !hasLocal && !editing) syncRemote();
    }, 90000);
  }

  function injectFooterTrigger() {
    const bottom = document.querySelector(".footer-bottom");
    if (!bottom || bottom.querySelector("[data-sso-trigger]")) return;
    const copyright = bottom.querySelector("p");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cms-sso-trigger";
    button.setAttribute("data-sso-trigger", "");
    button.setAttribute(ADMIN_ATTR, "");
    button.setAttribute("aria-label", "SSO Panel Login Admin");
    button.title = "SSO Panel Login Admin";
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
    (copyright || bottom).appendChild(button);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      openLoginOrPanel();
    });

    if (copyright) {
      let taps = 0;
      let timer = null;
      copyright.addEventListener("click", (event) => {
        if (event.target.closest("[data-sso-trigger]")) return;
        taps += 1;
        clearTimeout(timer);
        timer = setTimeout(() => { taps = 0; }, 2600);
        if (taps >= 5) {
          taps = 0;
          event.preventDefault();
          openLoginOrPanel();
        }
      });
    }
  }

  /* ---------- Publikasi, cadangan, pemulihan ---------- */
  function setPublishStatus(message, type = "info", url = "") {
    const element = ui.panel ? $("#cmsPublishStatus", ui.panel) : null;
    if (!element) return;
    element.className = "cms-status cms-status--" + type;
    element.textContent = "";
    if (message) element.appendChild(document.createTextNode(message));
    if (url && /^https:\/\/github\.com\//i.test(url)) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = " Lihat commit";
      element.appendChild(link);
    }
  }

  function b64EncodeUnicode(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  async function publishToGithub() {
    if (!ui.panel) return;
    const token = (($("#cmsGhToken", ui.panel) || {}).value || "").trim();
    const repo = (($("#cmsGhRepo", ui.panel) || {}).value || "").trim();
    const branch = (($("#cmsGhBranch", ui.panel) || {}).value || "").trim();
    const path = (($("#cmsGhPath", ui.panel) || {}).value || "").trim();
    const message = (($("#cmsGhMessage", ui.panel) || {}).value || "").trim();
    const remember = !!($("#cmsGhRemember", ui.panel) || {}).checked;
    const button = $("#cmsPublishButton", ui.panel);

    if (!token) {
      setPublishStatus("Token GitHub wajib diisi.", "error");
      return;
    }
    if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) {
      setPublishStatus("Format repository harus owner/nama-repo.", "error");
      return;
    }
    if (!branch) {
      setPublishStatus("Branch wajib diisi.", "error");
      return;
    }
    if (!path || path.includes("..")) {
      setPublishStatus("Path berkas tidak valid.", "error");
      return;
    }

    if (remember) sessionStorage.setItem(GH_TOKEN_KEY, token);
    else sessionStorage.removeItem(GH_TOKEN_KEY);

    localStorage.setItem(GH_CFG_KEY, JSON.stringify({ repo, branch, path }));

    if (button) {
      button.disabled = true;
      button.textContent = "Mengirim ke GitHub…";
    }
    setPublishStatus("Menyiapkan konten…", "info");

    try {
      state.updatedAt = new Date().toISOString();
      persistState();
      const payload = deepClone(state);

      const apiUrl = "https://api.github.com/repos/" + repo + "/contents/" +
        path.split("/").map(encodeURIComponent).join("/");
      const headers = {
        Accept: "application/vnd.github+json",
        Authorization: "Bearer " + token,
        "X-GitHub-Api-Version": "2022-11-28",
      };

      setPublishStatus("Memeriksa berkas konten di repository…", "info");
      const getResponse = await fetch(apiUrl + "?ref=" + encodeURIComponent(branch), { headers });
      let sha = null;
      if (getResponse.ok) {
        const info = await getResponse.json();
        sha = info.sha;
      } else if (getResponse.status !== 404) {
        let detail = "";
        try {
          const problem = await getResponse.json();
          detail = problem.message ? " " + problem.message : "";
        } catch (_) { /* abaikan */ }
        throw new Error("Tidak dapat membaca repository (HTTP " + getResponse.status + ")." + detail);
      }

      const body = {
        message: message || "CMS: perbarui konten website",
        content: b64EncodeUnicode(JSON.stringify(payload, null, 2)),
        branch,
      };
      if (sha) body.sha = sha;

      setPublishStatus("Mengirim perubahan…", "info");
      const putResponse = await fetch(apiUrl, {
        method: "PUT",
        headers: Object.assign({ "Content-Type": "application/json" }, headers),
        body: JSON.stringify(body),
      });

      if (!putResponse.ok) {
        let detail = "";
        try {
          const problem = await putResponse.json();
          detail = problem.message ? " " + problem.message : "";
        } catch (_) { /* abaikan */ }
        throw new Error("Publikasi gagal (HTTP " + putResponse.status + ")." + detail);
      }

      const result = await putResponse.json();
      const commitUrl = result && result.commit ? result.commit.html_url : "";
      setPublishStatus("Berhasil dipublikasikan.", "ok", commitUrl || "");
      toast("Konten berhasil dipublikasikan ke GitHub.", "success");
      remoteSource = "GitHub live";
      remoteState = payload;
    } catch (error) {
      setPublishStatus(error.message || "Publikasi gagal. Periksa token dan koneksi.", "error");
      toast("Publikasi gagal. Periksa token/akses repository.", "error");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Publikasikan Sekarang";
      }
    }
  }

  function downloadJson() {
    const text = JSON.stringify(state, null, 2);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    link.href = url;
    link.download = "content-" + stamp + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    toast("Cadangan content.json diunduh.", "success");
  }

  async function importJsonFile(file) {
    if (!file) return;
    if (!window.confirm("Impor berkas ini akan mengganti seluruh konten lokal. Lanjutkan?")) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const normalized = normalizeState(parsed);
      const total = Object.keys(normalized.pages || {}).length;
      if (!total && !Object.keys(normalized.site || {}).length) {
        toast("Berkas tidak berisi data konten yang dikenali.", "error");
        return;
      }
      state = normalized;
      hasLocal = true;
      persistState();
      applyAll();
      renderActiveTab();
      toast("Konten berhasil diimpor.", "success");
    } catch (error) {
      toast("Berkas JSON tidak valid.", "error");
    }
  }

  async function reloadServer() {
    if (!window.confirm("Muat ulang konten dari server? Draft lokal akan diganti.")) return;
    const remote = await loadRemoteContents();
    if (!remote) {
      toast("Konten server belum tersedia.", "warn");
      return;
    }
    remoteState = remote;
    hasLocal = false;
    localStorage.removeItem(STORAGE_KEY);
    state = mergeState(remote, null);
    applyAll();
    renderActiveTab();
    toast("Konten server dimuat.", "success");
  }

  function resetLocal() {
    if (!window.confirm("Hapus semua perubahan lokal di browser ini? Tindakan ini tidak menghapus konten yang sudah dipublikasikan.")) return;
    localStorage.removeItem(STORAGE_KEY);
    hasLocal = false;
    state = remoteState ? mergeState(remoteState, null) : emptyState();
    applyAll();
    renderActiveTab();
    toast("Perubahan lokal dihapus.", "info");
  }

  /* ---------- Boot ---------- */
  let booted = false;

  function restoreSessionUI() {
    if (!readSession()) return;
    showAdminUI();
    if (localStorage.getItem(EDIT_KEY) === "1") enterEditMode({ silent: true });
  }

  async function boot() {
    if (booted || !document.body) return;
    booted = true;

    injectFooterTrigger();
    buildUI();
    captureOriginals();

    const local = readLocalState();
    if (local) {
      hasLocal = true;
      state = mergeState(emptyState(), local);
      applyAll({ rerender: false });
    }

    restoreSessionUI();

    const params = new URLSearchParams(location.search);
    const wantsPanel = params.get("cms") === "panel" || location.hash === "#cms-panel";
    const wantsLogin = params.get("sso") === "1" || location.hash === "#sso-admin";
    const hasSession = !!readSession();

    if (hasSession && wantsPanel) openPanel();
    if (wantsLogin) setTimeout(openLoginOrPanel, 300);

    try {
      const remote = await loadRemoteContents();
      if (remote) {
        remoteState = remote;
        if (!hasLocal) {
          state = mergeState(remote, null);
          applyAll();
        }
      }
    } catch (_) { /* situs tetap memakai konten HTML awal */ }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
