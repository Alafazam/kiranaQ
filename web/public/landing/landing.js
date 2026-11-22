// Guided demo tour for the KiranaQ landing page. No dependencies.
(function () {
  'use strict';

  // Hotspot x and y are percent of the screenshot, measured on the source images.
  var STEPS = [
    { img: 'img/home.jpg', x: 50, y: 86, title: 'Home',
      text: 'Tap “स्टॉक गिनें” (Stock ginen) to start a stock log.',
      alt: 'Home screen in Hindi. The Stock ginen button is above the tab bar, with the Bolo mic in the centre of the tab bar.' },
    { img: 'img/count-box.jpg', x: 72, y: 66, title: 'Photo and count box',
      text: 'Tap “फ़ोटो चुनें” and pick a shelf photo. Drag the count box over the part that faces the camera.',
      alt: 'Photo screen with a biscuit aisle photo and a count box over the front-facing packs.' },
    { img: 'img/check.jpg', x: 73.5, y: 94, title: 'Voice check',
      text: 'Tap “दबाकर बोलें” and say “Parle-G Biscuit 20 hai”. The count changes after you say yes.',
      alt: 'Check screen with the heard sheet: Parle-G Biscuit 80g, count 12 changes to 20, with No and Yes buttons.' },
    { img: 'img/result.jpg', x: 8, y: 32, title: 'Result per distributor',
      text: 'One card per distributor: what runs out before the next visit, and what to order.',
      alt: 'Result screen: Gupta Wholesale card with two items that run out first and order quantities.' },
    { img: 'img/distributors.jpg', x: 30, y: 95.4, title: 'Distributors',
      text: 'Tap the Distributors tab: who comes when, and what runs out before each visit.',
      alt: 'Distributors screen: three distributors with next visit dates and items that run out.' }
  ];
  var APP_WIDTH = 390;
  var APP_URL = '/app/';

  var tour = document.getElementById('tour');
  if (!tour) return;
  var phone = document.getElementById('tour-phone');
  var img = document.getElementById('tour-img');
  var hotspot = document.getElementById('tour-hotspot');
  var hotspotN = document.getElementById('tour-hotspot-n');
  var live = document.getElementById('tour-live');
  var count = document.getElementById('tour-count');
  var title = document.getElementById('tour-title');
  var text = document.getElementById('tour-text');
  var dots = document.getElementById('tour-dots');
  var back = document.getElementById('tour-back');
  var next = document.getElementById('tour-next');
  var nav = back.parentElement;
  var liveActions = document.getElementById('tour-live-actions');
  var restart = document.getElementById('tour-restart');

  var current = 0;
  var isLive = false;

  // Preload so steps swap without a blank frame.
  STEPS.forEach(function (s) { var i = new Image(); i.src = s.img; });

  STEPS.forEach(function (s, i) {
    var d = document.createElement('button');
    d.type = 'button';
    d.className = 'dot';
    d.setAttribute('role', 'tab');
    d.setAttribute('aria-label', 'Step ' + (i + 1) + ': ' + s.title);
    d.addEventListener('click', function () { show(i); });
    dots.appendChild(d);
  });

  function show(i) {
    if (isLive) leaveLive();
    current = Math.max(0, Math.min(STEPS.length - 1, i));
    var s = STEPS[current];
    img.src = s.img;
    img.alt = s.alt;
    hotspot.style.left = s.x + '%';
    hotspot.style.top = s.y + '%';
    hotspotN.textContent = String(current + 1);
    count.textContent = 'Step ' + (current + 1) + ' of ' + STEPS.length;
    title.textContent = s.title;
    text.textContent = s.text;
    back.disabled = current === 0;
    next.textContent = current === STEPS.length - 1 ? 'Try the live demo' : 'Next';
    Array.prototype.forEach.call(dots.children, function (d, k) {
      d.setAttribute('aria-selected', k === current ? 'true' : 'false');
      d.tabIndex = k === current ? 0 : -1;
    });
  }

  function fitLive() {
    var frame = live.querySelector('iframe');
    if (!frame) return;
    frame.style.transform = 'scale(' + (live.clientWidth / APP_WIDTH) + ')';
    frame.style.height = (live.clientHeight * APP_WIDTH / live.clientWidth) + 'px';
  }

  function enterLive() {
    isLive = true;
    img.hidden = true;
    hotspot.hidden = true;
    live.hidden = false;
    if (!live.querySelector('iframe')) {
      var frame = document.createElement('iframe');
      frame.src = APP_URL;
      frame.title = 'KiranaQ live app';
      live.appendChild(frame);
    }
    fitLive();
    count.textContent = 'Live demo';
    title.textContent = 'Try it yourself';
    text.textContent = 'This is the real app. Tap “Stock ginen”, choose a photo, then count.';
    nav.hidden = true;
    liveActions.hidden = false;
    Array.prototype.forEach.call(dots.children, function (d) { d.setAttribute('aria-selected', 'false'); });
  }

  function leaveLive() {
    isLive = false;
    img.hidden = false;
    hotspot.hidden = false;
    live.hidden = true;
    nav.hidden = false;
    liveActions.hidden = true;
  }

  function goNext() {
    if (current === STEPS.length - 1) enterLive();
    else show(current + 1);
  }

  next.addEventListener('click', goNext);
  hotspot.addEventListener('click', goNext);
  back.addEventListener('click', function () { show(current - 1); });
  restart.addEventListener('click', function () { show(0); next.focus(); });

  tour.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'IFRAME') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); if (!isLive) goNext(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(isLive ? STEPS.length - 1 : current - 1); }
  });

  if ('ResizeObserver' in window) new ResizeObserver(fitLive).observe(phone);
  else window.addEventListener('resize', fitLive);

  show(0);
})();

// Hero: play a short recorded explainer (English or Hindi).
(function () {
  var btn = document.getElementById('hear-btn');
  var audio = document.getElementById('hear-audio');
  var label = document.getElementById('hear-label');
  if (!btn || !audio) return;
  var lang = 'en';
  var SRC = { en: 'audio/kiranaq-en.mp3', hi: 'audio/kiranaq-hi.mp3' };
  var LABEL = { idle: 'Hear what KiranaQ is', playing: 'Pause' };

  function setPlaying(on) {
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    label.textContent = on ? LABEL.playing : LABEL.idle;
  }
  function play() {
    if (!audio.src || audio.dataset.lang !== lang) { audio.src = SRC[lang]; audio.dataset.lang = lang; }
    audio.play().then(function () { setPlaying(true); }).catch(function () { setPlaying(false); });
  }
  btn.addEventListener('click', function () { if (audio.paused) play(); else audio.pause(); });
  audio.addEventListener('pause', function () { setPlaying(false); });
  audio.addEventListener('ended', function () { setPlaying(false); audio.currentTime = 0; });

  document.querySelectorAll('.hear-lang-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      lang = b.getAttribute('data-lang');
      document.querySelectorAll('.hear-lang-btn').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      audio.pause(); audio.removeAttribute('src'); audio.dataset.lang = '';
      play();
    });
  });
})();
