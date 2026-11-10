/* ══════════════════════════════════════════════════════════
   Warung Go Digital — interactions
   ══════════════════════════════════════════════════════════ */

const WA_NUMBER = "6281563324546";
const WA_TEXT = "Halo Warung Go Digital, saya tertarik dengan layanan etalase digital untuk warung saya.";
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── Sticky header ─────────────────────────────────────── */
const topbar = document.getElementById("topbar");
const onScroll = () => topbar.classList.toggle("is-stuck", window.scrollY > 10);
onScroll();
window.addEventListener("scroll", onScroll, { passive: true });

/* ── Mobile menu ───────────────────────────────────────── */
const burger = document.getElementById("burger");
const panel = document.getElementById("menuPanel");
burger.addEventListener("click", () => {
  const open = panel.classList.toggle("open");
  burger.setAttribute("aria-expanded", String(open));
});
panel.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    panel.classList.remove("open");
    burger.setAttribute("aria-expanded", "false");
  }
});

/* ── Floating WhatsApp button ──────────────────────────── */
const fab = document.getElementById("fab");
const fabObserver = new IntersectionObserver(
  ([entry]) => fab.classList.toggle("show", !entry.isIntersecting),
  { threshold: 0 }
);
fabObserver.observe(document.querySelector(".hero"));

/* ── Reveal on scroll ──────────────────────────────────── */
const revealables = document.querySelectorAll(".sec .head, .tile, .price, .subs, .tablebox, .inno__card, .flow li, .target, .market, .contact");
revealables.forEach((el) => el.classList.add("reveal"));

if (reduce) {
  revealables.forEach((el) => el.classList.add("in"));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.style.transitionDelay = `${Math.min(i * 65, 260)}ms`;
        el.classList.add("in");
        io.unobserve(el);
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
  );
  revealables.forEach((el) => io.observe(el));
}

/* ── Animated counters ─────────────────────────────────── */
const counters = document.querySelectorAll("[data-count]");
const runCount = (el) => {
  const target = Number(el.dataset.count);
  const suffix = el.dataset.suffix || "";
  if (reduce) { el.textContent = target + suffix; return; }
  const duration = 1500;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
const counterObserver = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) { runCount(e.target); counterObserver.unobserve(e.target); }
  }),
  { threshold: 0.6 }
);
counters.forEach((el) => counterObserver.observe(el));

/* ── Decorative QR code ────────────────────────────────── */
/* QR-style illustration: real finder + alignment patterns,
   seeded pseudo-random data modules. Not a scannable payload. */
function drawQR(canvas, seed = 20260210) {
  const ctx = canvas.getContext("2d");
  const size = canvas.width;
  const modules = 25;
  const m = size / modules;

  let s = seed;
  const rng = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);

  const grid = Array.from({ length: modules }, () => Array(modules).fill(false));

  const finder = (ox, oy) => {
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) {
        const edge = x === 0 || x === 6 || y === 0 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        grid[oy + y][ox + x] = edge || core;
      }
  };
  finder(0, 0);
  finder(modules - 7, 0);
  finder(0, modules - 7);

  const a = modules - 9;
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 5; x++) {
      const edge = x === 0 || x === 4 || y === 0 || y === 4;
      const core = x === 2 && y === 2;
      grid[a + y][a + x] = edge || core;
    }

  const reserved = (x, y) =>
    (x < 8 && y < 8) ||
    (x >= modules - 8 && y < 8) ||
    (x < 8 && y >= modules - 8) ||
    (x >= a && x < a + 5 && y >= a && y < a + 5);

  for (let i = 8; i < modules - 8; i++) {
    grid[6][i] = i % 2 === 0;
    grid[i][6] = i % 2 === 0;
  }

  for (let y = 0; y < modules; y++)
    for (let x = 0; x < modules; x++)
      if (!reserved(x, y) && !grid[y][x]) grid[y][x] = rng() > 0.52;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#0d1a12";
  for (let y = 0; y < modules; y++)
    for (let x = 0; x < modules; x++)
      if (grid[y][x]) ctx.fillRect(Math.round(x * m), Math.round(y * m), Math.ceil(m), Math.ceil(m));
}

const qr = document.getElementById("qrCanvas");
if (qr) drawQR(qr);

/* ── Signup form → WhatsApp ────────────────────────────── */
const form = document.getElementById("signup");
const note = document.getElementById("formNote");
const baseNote = note.textContent;

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const usaha = (data.get("usaha") || "").toString().trim();
  const wa = (data.get("wa") || "").toString().trim();

  if (!usaha) return flag("Mohon isi nama warung atau usaha Anda.");
  if (wa.replace(/\D/g, "").length < 9) return flag("Nomor WhatsApp sepertinya belum lengkap.");

  const pesan =
    `Halo Warung Go Digital!\n\n` +
    `Saya ingin mendaftar jadi mitra.\n` +
    `Nama usaha: ${usaha}\n` +
    `WhatsApp saya: ${wa}\n` +
    `Jenis usaha: ${data.get("jenis")}\n` +
    `Paket yang diminati: ${data.get("paket")}`;

  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(pesan)}`, "_blank", "noopener");

  note.classList.add("ok");
  note.textContent = `Terima kasih, ${usaha}! WhatsApp terbuka untuk mengirim pendaftaran Anda.`;
  form.reset();
  setTimeout(() => { note.classList.remove("ok"); note.textContent = baseNote; }, 9000);
});

function flag(msg) {
  note.classList.remove("ok");
  note.textContent = msg;
  note.style.color = "#e06b3c";
  setTimeout(() => { note.style.color = ""; note.textContent = baseNote; }, 5000);
}

/* ── Year ──────────────────────────────────────────────── */
document.getElementById("year").textContent = new Date().getFullYear();
