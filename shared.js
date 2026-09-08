/**
 * Motion, added to every mockup from one file.
 *
 * WHY THIS EXISTS SEPARATELY
 *
 * The first five pages were entirely static. On a desktop that reads as restraint; in a
 * 14-second scroll video sent over WhatsApp it reads as a screenshot of a PDF, and the
 * whole pitch is that this is a real, live website.
 *
 * WHAT IT DOES NOT DO
 *
 * No parallax, no infinite loops, no scroll-jacking. Every one of those is worse on a
 * mid-range Android over Pakistani mobile data, which is exactly what these owners will
 * open the link on. This is one IntersectionObserver, one transform, one opacity - and it
 * degrades to "everything simply visible" if anything fails.
 */
(function () {
  'use strict';

  // Anyone who has asked their phone to stop animating things gets no animation. This is
  // not decoration, it is a real accessibility setting and cheap to honour.
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Sections, cards, rows and headings - whatever the page happens to use.
  var sel = 'section, header .wrap > *, .s, .t, .m, .p, .f, .sh, .card, .row, .proof div, .stats div, .band, .quote, .say';
  var els = [].slice.call(document.querySelectorAll(sel));

  if (calm || !('IntersectionObserver' in window) || !els.length) return;

  els.forEach(function (el, i) {
    el.classList.add('rv');
    // A small stagger within a group, capped so a long list never crawls.
    el.style.transitionDelay = Math.min(i % 6, 5) * 55 + 'ms';
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target); // reveal once; re-animating on scroll-back is nausea
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

  els.forEach(function (el) { io.observe(el); });

  // Anything already on screen at load reveals immediately rather than waiting for a
  // scroll that may never come on a short page.
  requestAnimationFrame(function () {
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92) el.classList.add('in');
    });
  });
})();
