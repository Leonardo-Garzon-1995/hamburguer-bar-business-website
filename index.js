/* ====== Basic helpers ====== */
const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

/* ====== Mobile nav toggle ====== */
const navBtn = $('.nav-toggle');
const nav = $('#site-nav');
if (navBtn && nav) {
  navBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    navBtn.setAttribute('aria-expanded', String(open));
  });
  // close on link click (mobile)
  $$('#site-nav a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    navBtn.setAttribute('aria-expanded', 'false');
  }));
}

/* ====== Year in footer ====== */
const yearEl = $('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ====== Open hours & status pill ======
  Customize hours here (24h, local time):
  0=Sun ... 6=Sat
*/
const HOURS = {
  0: { open: "12:00", close: "23:00" }, // Sun
  1: { open: "12:00", close: "24:00" }, // Mon
  2: { open: "12:00", close: "24:00" }, // Tue
  3: { open: "12:00", close: "24:00" }, // Wed
  4: { open: "12:00", close: "24:00" }, // Thu
  5: { open: "12:00", close: "02:00+1" }, // Fri (closes 02:00 next day)
  6: { open: "12:00", close: "02:00+1" }  // Sat
};

function parseTime(str, refDate = new Date()) {
  // e.g. "02:00+1" means 02:00 next day
  const m = /^(\d{2}):(\d{2})(\+1)?$/.exec(str);
  if (!m) return null;
  const d = new Date(refDate);
  d.setHours(+m[1], +m[2], 0, 0);
  if (m[3]) d.setDate(d.getDate() + 1);
  return d;
}

function computeOpenStatus(now = new Date()) {
  const day = now.getDay();
  const { open, close } = HOURS[day];
  const openAt = parseTime(open, now);
  const closeAt = parseTime(close, now);
  const isOpen = now >= openAt && now < closeAt;
  return { isOpen, openAt, closeAt };
}

(function updateOpenStatus() {
  const pill = $('#openStatus');
  if (!pill) return;
  const { isOpen, openAt, closeAt } = computeOpenStatus();
  const hhmm = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  pill.textContent = isOpen
    ? `Open now · until ${hhmm(closeAt)}`
    : `Closed · opens ${hhmm(openAt)}`;
})();

/* ====== Filterable menus ====== */
function setupFilters(scopeSelector, gridId) {
  const scope = $(scopeSelector);
  if (!scope) return;
  const chips = $$('.chip', scope);
  const grid = gridId ? document.getElementById(gridId) : scope.nextElementSibling;

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('is-active'));
      chip.classList.add('is-active');

      const filter = chip.dataset.filter;
      const targetGrid = chip.dataset.target ? document.getElementById(chip.dataset.target) : grid;
      const items = $$('[data-category]', targetGrid);
      items.forEach(item => {
        const show = filter === 'all' || item.dataset.category.includes(filter);
        item.classList.toggle('hidden', !show);
      });
    });
  });
}
setupFilters('#menu .filters', 'foodGrid');
setupFilters('#drinks .filters', 'drinkGrid');

/* ====== Booking form (mailto + local confirmation) ====== */
const form = $('#bookingForm');
const modal = $('#confirmModal');
const confirmText = $('#confirmText');

if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const date = $('#date').value;
    const time = $('#time').value;
    const party = $('#party').value;
    const name = $('#name').value.trim();
    const email = $('#email').value.trim();
    const phone = $('#phone').value.trim();
    const notes = $('#notes').value.trim();

    // Basic validation
    if (!date || !time || !party || !name || !email || !phone) {
      alert('Please complete all required fields.');
      return;
    }

    const whenPretty = new Date(`${date}T${time}`);
    const fmt = whenPretty.toLocaleString([], { weekday:'short', year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });

    // Save locally (so staff could read from device if needed)
    const booking = { date, time, party, name, email, phone, notes, createdAt: new Date().toISOString() };
    const key = 'ember_bookings';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.push(booking);
    localStorage.setItem(key, JSON.stringify(existing));

    // Modal confirmation
    if (confirmText && modal) {
      confirmText.textContent = `Thanks, ${name}! We’ve saved your reservation for ${fmt} — party of ${party}. Check your email draft next.`;
      modal.showModal();
    }

    // Open a mailto draft to send the booking
    const subject = encodeURIComponent(`Table Reservation — ${name} — ${fmt} — ${party} ppl`);
    const body = encodeURIComponent(
`Name: ${name}
Email: ${email}
Phone: ${phone}
Date: ${date}
Time: ${time}
Party: ${party}
Notes: ${notes || '—'}

(Generated from ember.bar website)`
    );
    // Replace with your real inbox:
    window.location.href = `mailto:hello@ember.bar?subject=${subject}&body=${body}`;

    // Optionally, reset form
    form.reset();
  });
}

/* ====== Accessibility niceties ====== */
// Reduce focus trap: close modal on Escape supported by <dialog> element
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal?.open) modal.close();
});
