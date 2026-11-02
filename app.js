/* Crowned by Ronnie — shared behaviour for every page.
   Plain JS, no libraries, so it stays light on mobile data. */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- splash: his crest, then out of the way ---------- */
  var splash = document.getElementById('splash');
  if (splash) {
    var dismiss = function () { splash.classList.add('gone'); };
    window.addEventListener('load', function () { setTimeout(dismiss, reduced ? 0 : 650); });
    /* belt and braces — never let a slow image trap someone behind the splash */
    setTimeout(dismiss, 2600);
  }

  /* ---------- smart sticky header ---------- */
  var hdr = document.getElementById('hdr');
  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }
  if (hdr) {
    var lastY = window.pageYOffset, ticking = false;
    var onScroll = function () {
      var y = Math.max(0, window.pageYOffset);
      hdr.classList.toggle('stuck', y > 12);
      if (!nav || !nav.classList.contains('open')) {
        /* hide on the way down, reappear the moment you scroll up — from anywhere */
        if (y > lastY + 6 && y > 140) hdr.classList.add('hide');
        else if (y < lastY - 6) hdr.classList.remove('hide');
      }
      lastY = y;
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
  }

  /* ---------- scroll reveal ---------- */
  var revealables = document.querySelectorAll('.rv');
  if (revealables.length) {
    if (reduced || !('IntersectionObserver' in window)) {
      revealables.forEach(function (el) { el.classList.add('in'); });
    } else {
      var ro = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('in'); ro.unobserve(en.target); }
        });
      }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
      revealables.forEach(function (el) { ro.observe(el); });
    }
  }

  /* ---------- reels: autoplay muted when in view, brand-styled sound toggle ---------- */
  var reels = document.querySelectorAll('.reel video');
  if (reels.length) {
    if ('IntersectionObserver' in window) {
      var vo = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          var v = en.target;
          if (en.isIntersecting) {
            if (!v.dataset.loaded) { v.load(); v.dataset.loaded = '1'; }
            var p = v.play();
            if (p && p.catch) p.catch(function () { /* autoplay blocked — poster stands in */ });
          } else {
            v.pause();
            if (!v.muted) { v.muted = true; syncSound(v); }
          }
        });
      }, { threshold: 0.5 });
      reels.forEach(function (v) { vo.observe(v); });
    }
    var syncSound = function (v) {
      var btn = v.closest('.reel').querySelector('.snd');
      if (!btn) return;
      btn.setAttribute('aria-label', v.muted ? 'Unmute video' : 'Mute video');
      btn.setAttribute('aria-pressed', v.muted ? 'false' : 'true');
      btn.querySelector('.on').style.display = v.muted ? 'none' : 'block';
      btn.querySelector('.off').style.display = v.muted ? 'block' : 'none';
    };
    document.querySelectorAll('.snd').forEach(function (btn) {
      var v = btn.closest('.reel').querySelector('video');
      syncSound(v);
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (v.muted) {
          /* only one reel talks at a time */
          document.querySelectorAll('.reel video').forEach(function (o) {
            if (o !== v) { o.muted = true; syncSound(o); }
          });
          v.muted = false;
          var p = v.play(); if (p && p.catch) p.catch(function () {});
        } else {
          v.muted = true;
        }
        syncSound(v);
      });
    });
  }

  /* ---------- fullscreen lightbox ---------- */
  var lb = document.getElementById('lb');
  if (lb) {
    var figures = Array.prototype.slice.call(document.querySelectorAll('.gal figure'));
    var lbImg = document.getElementById('lbImg');
    var lbCap = document.getElementById('lbCap');
    var lbTitle = document.getElementById('lbTitle');
    var lbCount = document.getElementById('lbCount');
    var idx = 0;

    var show = function (i) {
      idx = (i + figures.length) % figures.length;
      var fig = figures[idx];
      var img = fig.querySelector('img');
      lbImg.src = img.getAttribute('src');
      lbImg.alt = img.getAttribute('alt') || '';
      lbTitle.textContent = fig.dataset.title || '';
      lbCap.textContent = fig.dataset.detail || '';
      lbCount.textContent = (idx + 1) + ' / ' + figures.length;
      /* restart the fade so each step feels deliberate */
      lbImg.style.animation = 'none';
      void lbImg.offsetWidth;
      lbImg.style.animation = '';
    };
    var open = function (i) { show(i); lb.classList.add('on'); document.body.style.overflow = 'hidden'; };
    var close = function () { lb.classList.remove('on'); document.body.style.overflow = ''; };

    figures.forEach(function (fig, i) {
      fig.setAttribute('tabindex', '0');
      fig.setAttribute('role', 'button');
      fig.addEventListener('click', function () { open(i); });
      fig.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(i); }
      });
    });
    document.getElementById('lbClose').addEventListener('click', close);
    document.getElementById('lbPrev').addEventListener('click', function () { show(idx - 1); });
    document.getElementById('lbNext').addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('on')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
    /* swipe, since most of this traffic is on a phone */
    var x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 46) show(dx < 0 ? idx + 1 : idx - 1);
      x0 = null;
    }, { passive: true });
  }

  /* ---------- year in the footer ---------- */
  document.querySelectorAll('.yr').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
