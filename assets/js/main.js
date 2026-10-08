/* =========================================================
   SHOVON — main.js  (jQuery + GSAP/ScrollTrigger + Lenis)
   ========================================================= */
(function ($) {
  'use strict';

  var SITE = window.SITE || {};
  var $win = $(window), $doc = $(document), $html = $('html'), $body = $('body');
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MOTION = !REDUCED && !!window.gsap;
  var lenis = null;
  var introTimelines = [];

  /* ---------------------------------------------------------
     Helpers
     --------------------------------------------------------- */
  function lockScroll(lock) {
    if (lenis) { lock ? lenis.stop() : lenis.start(); }
    $body.css('overflow', lock ? 'hidden' : '');
  }
  function formatNum(n) { return Math.round(n).toLocaleString('en-US'); }
  function onSwipe($el, cb) {
    var x = 0, y = 0;
    $el.on('touchstart', function (e) { var t = e.originalEvent.touches[0]; x = t.clientX; y = t.clientY; })
       .on('touchend', function (e) {
         var t = e.originalEvent.changedTouches[0], dx = t.clientX - x, dy = t.clientY - y;
         if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { cb(dx < 0 ? 1 : -1); }
       });
  }
  function isPdf(file) { return /\.pdf([?#]|$)/i.test(file); }

  /* ---------------------------------------------------------
     1. Site settings -> page
     --------------------------------------------------------- */
  function initSettings() {
    var scheme = {
      tel:    function (v) { return 'tel:' + v.replace(/[^\d+]/g, ''); },
      mailto: function (v) { return 'mailto:' + v; },
      wa:     function (v) { return 'https://wa.me/' + v.replace(/\D/g, ''); }
    };
    $('[data-site]').each(function () {
      var v = SITE[$(this).data('site')];
      if (v) { $(this).text(v); }
    });
    $('[data-href]').each(function () {
      var $el = $(this), v = SITE[$el.data('href')], s = scheme[$el.data('scheme')];
      if (v) { $el.attr('href', s ? s(v) : v); }
      else if ($el.is('[data-hide-empty]')) { $el.closest('li, .mi').hide(); }
    });
    $('[data-year]').text(new Date().getFullYear());
  }

  /* ---------------------------------------------------------
     2. Image fallback (placeholder if a file is missing)
     --------------------------------------------------------- */
  function initImages() {
    $('.media img').each(function () {
      var img = this;
      function fail() {
        var name = (img.getAttribute('src') || '').split('/').pop();
        $(img).closest('.media').append(
          $('<div class="ph" role="img">').attr('aria-label', img.alt || name).append($('<span>').text(name))
        );
        $(img).remove();
      }
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) { fail(); }
      else { $(img).one('error', fail); }
    });
  }

  /* ---------------------------------------------------------
     3. Smooth scroll (Lenis)
     --------------------------------------------------------- */
  function initSmooth() {
    if (!MOTION) { return; }
    gsap.registerPlugin(ScrollTrigger);
    if (window.Lenis) {
      lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ---------------------------------------------------------
     4. Header + mobile menu
     --------------------------------------------------------- */
  function initHeader() {
    var $hdr = $('.hdr'), $menu = $('#mnav'), $burger = $('.burger');

    function onScroll() { $hdr.toggleClass('is-scrolled', window.scrollY > 40); }
    onScroll();
    $win.on('scroll', onScroll);

    function toggleMenu(open) {
      $menu.toggleClass('open', open).attr('aria-hidden', !open);
      $burger.attr('aria-expanded', open);
      lockScroll(open);
      if (open) { $menu.find('.mnav-body').scrollTop(0); }
      (open ? $menu.find('.mnav-close') : $burger).trigger('focus');
    }
    $burger.on('click', function () { toggleMenu(true); });
    $menu.find('.mnav-close').on('click', function () { toggleMenu(false); });
    $menu.find('a').on('click', function () { if ($menu.hasClass('open')) { lockScroll(false); } });
    $doc.on('keydown', function (e) { if (e.key === 'Escape' && $menu.hasClass('open')) { toggleMenu(false); } });
  }

  /* ---------------------------------------------------------
     5. Scroll to top (ring fills as you scroll)
     --------------------------------------------------------- */
  function initToTop() {
    var $btn = $('.totop'), $bar = $btn.find('.tt-bar'), len = 144.51;
    function update() {
      var max = $doc.height() - $win.height();
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      $bar.css('stroke-dashoffset', len * (1 - p));
      $btn.toggleClass('show', window.scrollY > 320);
    }
    update();
    $win.on('scroll resize', update);
    $btn.on('click', function () {
      if (lenis) { lenis.scrollTo(0, { duration: 1.4 }); }
      else { $('html, body').animate({ scrollTop: 0 }, 700); }
    });
  }

  /* ---------------------------------------------------------
     6. Preloader + page transition
     --------------------------------------------------------- */
  var readyDone = false;
  function pageReady() {
    if (readyDone) { return; }
    readyDone = true;
    try { sessionStorage.setItem('shv-visited', '1'); } catch (e) {}
    $html.removeClass('is-loading is-return');
    lockScroll(false);
    $.each(introTimelines, function (_, tl) { tl.play(); });
    if (MOTION) { ScrollTrigger.refresh(); }
  }

  function initPreloader() {
    var $pl = $('.preloader');

    /* returning visit in this session: diamond wipe reveal */
    if ($html.hasClass('is-return')) {
      var $rt = $('.rt i');
      if (!MOTION) { $rt.css('transform', 'scale(0)'); pageReady(); return; }
      gsap.set($rt.get(), { scale: 1, rotate: 0 });
      gsap.to($rt.get().reverse(), { scale: 0, rotate: 45, duration: .8, ease: 'expo.out', stagger: .06, delay: .05,
        onStart: pageReady });
      return;
    }
    if (!$html.hasClass('is-loading') || !$pl.length) { pageReady(); return; }
    if (REDUCED || !window.gsap) { $win.on('load', function () { $pl.fadeOut(300); pageReady(); }); return; }

    var $bar = $pl.find('.pl-bar i'), $pct = $pl.find('.pl-pct span');
    var loaded = false, shown = 0, start = performance.now(), MIN = 1300, done = false;
    $win.on('load', function () { loaded = true; });
    setTimeout(function () { loaded = true; }, 6000); /* never hang */

    (function tick(now) {
      var target = loaded && (now - start) > MIN ? 100 : 88;
      shown += (target - shown) * 0.07;
      if (target === 100 && shown > 99.4) { shown = 100; }
      $bar.css('transform', 'scaleX(' + shown / 100 + ')');
      $pct.text(Math.round(shown));
      if (shown < 100) { requestAnimationFrame(tick); return; }
      if (done) { return; } done = true;
      gsap.timeline()
        .to($pl.children().get(), { y: -24, autoAlpha: 0, duration: .5, ease: 'power3.in', stagger: .05 }, .15)
        .to($pl[0], { clipPath: 'polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)', duration: .95, ease: 'expo.inOut',
          onStart: pageReady }, .55)
        .set($pl[0], { display: 'none' });
    })(start);
  }

  /* leaving: diamond wipe covers the page, then navigate */
  function initLinks() {
    if (!MOTION) { return; }
    $doc.on('click', 'a[href]', function (e) {
      var a = this, href = a.getAttribute('href');
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.which > 1) { return; }
      if (a.target === '_blank' || a.hasAttribute('download')) { return; }
      if (!/^[\w-]+\.html(#.*)?$/.test(href) && href !== './') { return; }
      if (a.pathname === location.pathname && a.hash) { return; }
      e.preventDefault();
      var $rt = $('.rt i');
      gsap.timeline()
        .set($rt.get(), { scale: 0, rotate: 0 })
        .to($rt[0], { scale: 1, duration: .5, ease: 'expo.in' })
        .to($rt[1], { scale: 1, duration: .45, ease: 'expo.in' }, .08)
        .add(function () { location.href = a.href; });
    });
    /* back/forward cache: clear the cover */
    $win.on('pageshow', function (e) {
      if (e.originalEvent && e.originalEvent.persisted) { gsap.set('.rt i', { scale: 0 }); lockScroll(false); }
    });
  }

  /* ---------------------------------------------------------
     7. Motion: intro, reveals, wipes, counters, lines
     --------------------------------------------------------- */
  function initHeroIntro() {
    var $hero = $('.hero');
    if (!$hero.length || !MOTION) { return; }
    var tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    tl.from('.hero .tag', { autoAlpha: 0, y: 12, duration: .7 })
      .from('.hero .line > span', { yPercent: 110, duration: 1.2, stagger: .1 }, '-=.4')
      .from('.hero-dia', { clipPath: 'polygon(50% 50%,50% 50%,50% 50%,50% 50%)', duration: 1.6, ease: 'expo.inOut' }, .15)
      .from('.hero-dia img, .hero-dia .ph', { scale: 1.4, duration: 2 }, .3)
      .from('.hero-sq', { rotate: 0, scale: .6, autoAlpha: 0, duration: 1.6 }, .4)
      .from('.hero .lead, .hero .btn-row', { autoAlpha: 0, y: 20, duration: .9, stagger: .1 }, '-=1.2')
      .from('.hero-badge', { autoAlpha: 0, x: -30, duration: 1 }, '-=.9');
    introTimelines.push(tl);
    gsap.to('.hero-sq', { rotate: 135, ease: 'none',
      scrollTrigger: { trigger: $hero[0], start: 'top top', end: 'bottom top', scrub: true } });
  }

  function initBannerIntro() {
    var $b = $('.banner');
    if (!$b.length || !MOTION) { return; }
    var tl = gsap.timeline({ paused: true });
    tl.from('.banner .line > span', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: .08 }, .05)
      .from('.banner-dia', { rotate: 0, scale: .4, autoAlpha: 0, duration: 1.4, ease: 'expo.out' }, 0)
      .from('.crumb, .banner-foot', { autoAlpha: 0, y: 16, duration: .8, ease: 'power3.out', stagger: .1 }, .35);
    introTimelines.push(tl);
  }

  function initScrollMotion() {
    if (!MOTION) { return; }

    var rev = gsap.utils.toArray('[data-reveal]');
    gsap.set(rev, { autoAlpha: 0, y: 28 });
    ScrollTrigger.batch(rev, { start: 'top 88%', once: true, batchMax: 4,
      onEnter: function (b) { gsap.to(b, { autoAlpha: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .09, overwrite: true, clearProps: 'transform' }); } });

    $('[data-wipe]').each(function () {
      var el = this, dir = el.getAttribute('data-wipe') || 'up';
      var from = { up: 'inset(100% 0 0 0)', left: 'inset(0 100% 0 0)', right: 'inset(0 0 0 100%)', center: 'inset(50% 50% 50% 50%)' }[dir];
      gsap.fromTo(el, { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.25, ease: 'expo.inOut',
        scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
      var img = el.querySelector('img, .ph');
      if (img) {
        gsap.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.6, ease: 'expo.out', clearProps: 'transform',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
      }
    });

    $('[data-count]').each(function () {
      var el = this, end = parseFloat(el.getAttribute('data-count')), o = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: function () {
        gsap.to(o, { v: end, duration: 2, ease: 'power2.out', onUpdate: function () { el.textContent = formatNum(o.v); } });
      } });
    });

    $('[data-draw]').each(function () {
      gsap.fromTo(this, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 1.1, ease: 'power3.inOut',
        scrollTrigger: { trigger: this, start: 'top 90%', once: true } });
    });
  }

  /* pinned horizontal process (desktop) / swipe (mobile) */
  function initProcess() {
    var $s = $('.proc');
    if (!$s.length) { return; }
    var $track = $s.find('.proc-track'), $steps = $s.find('.proc-steps'), $bar = $s.find('.proc-progress i'), $hint = $s.find('.proc-hint');
    function mode(m) {
      $s.toggleClass('is-pinned', m === 'pin').toggleClass('is-swipe', m === 'swipe');
      $hint.text(m === 'pin' ? 'Scroll' : 'Swipe');
    }
    $steps.on('scroll', function () {
      if (!$s.hasClass('is-swipe')) { return; }
      var max = this.scrollWidth - this.clientWidth;
      $bar.css('transform', 'scaleX(' + Math.max(0.06, max > 0 ? this.scrollLeft / max : 0) + ')');
    });
    if (!MOTION) { mode('swipe'); $bar.css('transform', 'scaleX(.06)'); return; }
    var mm = gsap.matchMedia();
    mm.add('(min-width: 981px)', function () {
      mode('pin');
      var t = $track[0];
      var dist = function () { return Math.max(0, t.scrollWidth - window.innerWidth); };
      var tw = gsap.to(t, { x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: $s[0], start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 1,
          invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (st) { $bar.css('transform', 'scaleX(' + st.progress + ')'); } } });
      return function () { if (tw.scrollTrigger) { tw.scrollTrigger.kill(); } tw.kill(); gsap.set(t, { clearProps: 'transform' }); };
    });
    mm.add('(max-width: 980px)', function () { mode('swipe'); $bar.css('transform', 'scaleX(.06)'); });
  }

  /* ---------------------------------------------------------
     8. Certificates: preview popup + download
     --------------------------------------------------------- */
  function initCerts() {
    var $cards = $('.cert');
    if (!$cards.length) { return; }
    var $m = $('.cmodal'), $stage = $m.find('.cm-stage'), $title = $m.find('#cm-title'),
        $count = $m.find('.cm-count'), $dl = $m.find('.cm-dl'), $x = $m.find('.cm-x'),
        n = $cards.length, idx = 0, $last = null;

    function render(i) {
      idx = (i + n) % n;
      var $c = $cards.eq(idx), file = $c.data('file'), title = $c.data('title');
      $title.text(title);
      $count.text((idx + 1) + ' / ' + n);
      $stage.empty().append(isPdf(file)
        ? $('<iframe>', { src: file + '#toolbar=0&navpanes=0', title: title })
        : $('<img>', { src: file, alt: title }));
      $dl.attr({ href: file, download: file.split('/').pop() });
    }
    function open(i, $from) {
      $last = $from;
      render(i);
      $m.prop('hidden', false);
      requestAnimationFrame(function () { $m.addClass('open'); });
      lockScroll(true);
      $x.trigger('focus');
    }
    function close() {
      $m.removeClass('open');
      setTimeout(function () { $m.prop('hidden', true); $stage.empty(); }, 300);
      lockScroll(false);
      if ($last) { $last.trigger('focus'); }
    }

    $cards.on('click', function () { open($cards.index(this), $(this)); });
    $m.on('click', function (e) { if (e.target === this) { close(); } });
    $x.on('click', close);
    $m.find('.cm-prev').on('click', function () { render(idx - 1); });
    $m.find('.cm-next').on('click', function () { render(idx + 1); });
    onSwipe($m.find('.cmodal-view'), function (d) { render(idx + d); });
    $doc.on('keydown', function (e) {
      if ($m.prop('hidden')) { return; }
      if (e.key === 'Escape') { close(); }
      else if (e.key === 'ArrowRight') { render(idx + 1); }
      else if (e.key === 'ArrowLeft') { render(idx - 1); }
      else if (e.key === 'Tab') {
        var f = $m.find('button, a[href]').filter(':visible'), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* certificate list: slider controls on mobile */
  function initCertSlider() {
    var $list = $('.cert-list'), $pos = $('.cert-pos');
    if (!$list.length) { return; }
    var n = $list.children().length;
    function step() { var li = $list.children()[0]; return li.offsetWidth + 16; }
    function update() { $pos.text((Math.min(n - 1, Math.round($list[0].scrollLeft / step())) + 1) + ' / ' + n); }
    $('.cert-ctrl .prev').on('click', function () { $list[0].scrollBy({ left: -step(), behavior: 'smooth' }); });
    $('.cert-ctrl .next').on('click', function () { $list[0].scrollBy({ left: step(), behavior: 'smooth' }); });
    $list.on('scroll', update); update();
  }

  /* ---------------------------------------------------------
     9. Products filter
     --------------------------------------------------------- */
  function initProducts() {
    var $grid = $('.tags-grid[data-filterable]');
    if (!$grid.length) { return; }
    var $items = $grid.children(), $pills = $('.pill[data-filter]'), $count = $('.shown-count');
    $pills.on('click', function () {
      var f = $(this).data('filter'), k = 0;
      $pills.attr('aria-pressed', 'false'); $(this).attr('aria-pressed', 'true');
      $items.each(function () {
        var $it = $(this), show = f === 'All' || $it.data('cat') === f;
        $it.prop('hidden', !show).removeClass('fade-in');
        if (show) {
          this.offsetWidth; /* restart animation */
          $it.css('animation-delay', (k++ * 0.05) + 's').addClass('fade-in');
        }
      });
      $count.text(k + ' shown');
    });
  }

  /* ---------------------------------------------------------
     10. Gallery: filter + lightbox
     --------------------------------------------------------- */
  function initGallery() {
    var $grid = $('.ggrid');
    if (!$grid.length) { return; }
    var $items = $grid.children(), $pills = $('.pill[data-filter]'), $lb = $('.lb'),
        $fig = $lb.find('.lb-media'), $cap = $lb.find('.lb-cap'), $num = $lb.find('.lb-num'),
        $x = $lb.find('.lb-x'), idx = 0, $last = null;

    function pattern(i) { var m = i % 9; return m === 0 ? 'wide tall' : m === 5 ? 'wide' : m === 7 ? 'tall' : ''; }
    function visible() { return $items.filter(':not([hidden])'); }
    function layout() {
      var k = 0;
      $items.each(function () { $(this).removeClass('wide tall fade-in'); });
      visible().each(function () {
        this.offsetWidth;
        $(this).addClass(pattern(k)).css('animation-delay', (k * 0.04) + 's').addClass('fade-in'); k++;
      });
    }
    layout();

    $pills.on('click', function () {
      var f = $(this).data('filter');
      $pills.attr('aria-pressed', 'false'); $(this).attr('aria-pressed', 'true');
      $items.each(function () { $(this).prop('hidden', !(f === 'All' || $(this).data('cat') === f)); });
      layout();
    });

    function show(i) {
      var $v = visible(), n = $v.length;
      idx = (i + n) % n;
      var $it = $v.eq(idx);
      $fig.empty().append($('<img>', { src: $it.data('src'), alt: $it.data('label') }));
      $cap.text($it.data('label'));
      $num.text((idx + 1) + ' / ' + n);
      $lb.find('.lb-nav').toggle(n > 1);
    }
    function open($it) {
      $last = $it; show(visible().index($it));
      $lb.prop('hidden', false); lockScroll(true); $x.trigger('focus');
    }
    function close() { $lb.prop('hidden', true); $fig.empty(); lockScroll(false); if ($last) { $last.trigger('focus'); } }

    $items.on('click', function () { open($(this)); });
    onSwipe($lb, function (d) { show(idx + d); });
    $lb.on('click', close);
    $lb.find('.lb-fig').on('click', function (e) { e.stopPropagation(); });
    $x.on('click', function (e) { e.stopPropagation(); close(); });
    $lb.find('.lb-nav.p').on('click', function (e) { e.stopPropagation(); show(idx - 1); });
    $lb.find('.lb-nav.n').on('click', function (e) { e.stopPropagation(); show(idx + 1); });
    $doc.on('keydown', function (e) {
      if ($lb.prop('hidden')) { return; }
      if (e.key === 'Escape') { close(); }
      else if (e.key === 'ArrowRight') { show(idx + 1); }
      else if (e.key === 'ArrowLeft') { show(idx - 1); }
      else if (e.key === 'Tab') { e.preventDefault(); $x.trigger('focus'); }
    });
  }

  /* ---------------------------------------------------------
     11. Business tabs
     --------------------------------------------------------- */
  function initTabs() {
    var $tabs = $('[role="tab"]');
    if (!$tabs.length) { return; }
    var $panels = $('.panel[role="tabpanel"]'), $unit = $('.unit-count');
    function select(i, focus) {
      $tabs.each(function (k) {
        var on = k === i;
        $(this).attr({ 'aria-selected': on, tabindex: on ? 0 : -1 });
        $panels.eq(k).prop('hidden', !on).removeClass('fade-in');
        if (on) { $panels.eq(k)[0].offsetWidth; $panels.eq(k).addClass('fade-in'); }
      });
      $unit.text('Unit 0' + (i + 1) + ' / 0' + $tabs.length);
      if (focus) { $tabs.eq(i).trigger('focus'); }
    }
    $tabs.on('click', function () { select($tabs.index(this)); });
    $tabs.on('keydown', function (e) {
      var i = $tabs.index(this);
      if (e.key === 'ArrowRight') { e.preventDefault(); select((i + 1) % $tabs.length, true); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); select((i - 1 + $tabs.length) % $tabs.length, true); }
    });
  }

  /* ---------------------------------------------------------
     12. Contact form
     --------------------------------------------------------- */
  function initForm() {
    var $form = $('#inquiry-form');
    if (!$form.length) { return; }
    var $wrap = $('.form'), $err = $('.form-error'), $btn = $form.find('button[type="submit"]'),
        label = $btn.find('span').text();

    function setError($f, msg) {
      var $field = $f.closest('.field');
      $field.toggleClass('err', !!msg).find('.msg').remove();
      $f.attr('aria-invalid', !!msg);
      if (msg) { $field.append($('<div class="msg" role="alert">').text(msg)); }
    }
    function validate() {
      var ok = true, first = null;
      var $n = $('#f-name'), $e = $('#f-email'), $m = $('#f-message');
      var name = $n.val().trim(), email = $e.val().trim();
      setError($n, name ? '' : 'Please enter your full name.');
      setError($e, !email ? 'Please enter your email.' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? 'That email does not look right.' : '');
      setError($m, $m.val().length > 2000 ? 'Please keep the message under 2000 characters.' : '');
      $form.find('.field.err :input').each(function () { if (!first) { first = this; } ok = false; });
      if (first) { first.focus(); }
      return ok;
    }
    $form.on('input change', ':input', function () { if ($(this).closest('.field').hasClass('err')) { setError($(this), ''); } });

    $form.on('submit', function (e) {
      e.preventDefault();
      $err.prop('hidden', true);
      if (!validate()) { return; }
      var data = {};
      $.each($form.serializeArray(), function (_, f) { data[f.name] = f.value; });

      $btn.prop('disabled', true).find('span').text('Sending…');
      var endpoint = SITE.formEndpoint || '';
      var req = endpoint.indexOf('YOUR_FORM_ID') > -1
        ? $.Deferred(function (d) { setTimeout(d.resolve, 700); }).promise()   /* demo mode until endpoint is set */
        : $.ajax({ url: endpoint, method: 'POST', dataType: 'json', contentType: 'application/json', headers: { Accept: 'application/json' }, data: JSON.stringify(data) });

      req.done(function () {
        $form.prop('hidden', true);
        $wrap.find('.success-name').text((data.name.trim().split(' ')[0]) || 'there');
        $wrap.find('.success-email').text(data.email);
        $wrap.find('.success').prop('hidden', false);
      }).fail(function () {
        $err.prop('hidden', false);
      }).always(function () {
        $btn.prop('disabled', false).find('span').text(label);
      });
    });
    $wrap.find('.again').on('click', function () {
      $form[0].reset(); $wrap.find('.success').prop('hidden', true); $form.prop('hidden', false); $('#f-name').trigger('focus');
    });
  }

  /* ---------------------------------------------------------
     13. Testimonials slider (auto-play, pauses on interaction)
     --------------------------------------------------------- */
  function initTesti() {
    var $t = $('.testi-track');
    if (!$t.length) { return; }
    var t = $t[0], $bar = $('.testi-prog i'), $count = $('.testi-count'), n = $t.children().length, paused = false;
    function step() {
      return $t.children()[0].offsetWidth + (parseFloat(getComputedStyle(t).columnGap) || 0);
    }
    function go(dir) {
      var max = t.scrollWidth - t.clientWidth;
      if (dir > 0 && t.scrollLeft >= max - 4) { t.scrollTo({ left: 0, behavior: 'smooth' }); }
      else if (dir < 0 && t.scrollLeft <= 4) { t.scrollTo({ left: max, behavior: 'smooth' }); }
      else { t.scrollBy({ left: dir * step(), behavior: 'smooth' }); }
    }
    function update() {
      var max = t.scrollWidth - t.clientWidth;
      $bar.css('transform', 'scaleX(' + Math.max(0.08, max > 0 ? t.scrollLeft / max : 1) + ')');
      $count.text((Math.min(n - 1, Math.round(t.scrollLeft / step())) + 1) + ' / ' + n);
    }
    $('.testi-ctrl .prev').on('click', function () { go(-1); });
    $('.testi-ctrl .next').on('click', function () { go(1); });
    $t.on('scroll', update); $win.on('resize', update); update();
    $('.testi').on('mouseenter focusin touchstart', function () { paused = true; })
               .on('mouseleave focusout touchend', function () { paused = false; });
    if (!REDUCED) {
      var visible = true;
      if (window.IntersectionObserver) {
        new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0.4 }).observe(t);
      }
      setInterval(function () { if (visible && !paused && !document.hidden) { go(1); } }, 6500);
    }
  }

  /* ---------------------------------------------------------
     14. Decorative shapes: scroll-linked movement
     --------------------------------------------------------- */
  function initDecor() {
    if (!MOTION) { return; }
    function scrub(el, trigger, from, to) {
      gsap.fromTo(el, from, $.extend({ ease: 'none',
        scrollTrigger: { trigger: trigger, start: 'top bottom', end: 'bottom top', scrub: true } }, to));
    }
    $('[data-par]').each(function () {
      scrub(this, $(this).parent()[0], { y: 0 }, { y: parseFloat(this.getAttribute('data-par')) });
    });
    $('[data-rot]').each(function () {
      scrub(this, $(this).parent()[0], { rotation: 0 }, { rotation: parseFloat(this.getAttribute('data-rot')) });
    });
    $('[data-spin]').each(function () {
      scrub(this, $(this).closest('section')[0] || this, { '--spin': 0 }, { '--spin': parseFloat(this.getAttribute('data-spin')) });
    });
    $('.timeline').each(function () {
      gsap.fromTo(this, { '--draw': 0 }, { '--draw': 1, ease: 'none',
        scrollTrigger: { trigger: this, start: 'top 75%', end: 'bottom 70%', scrub: true } });
    });
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */
  $(function () {
    initSettings();
    initImages();
    initSmooth();
    initHeader();
    initToTop();
    initHeroIntro();
    initBannerIntro();
    initScrollMotion();
    initProcess();
    initCerts();
    initCertSlider();
    initTesti();
    initDecor();
    initProducts();
    initGallery();
    initTabs();
    initForm();
    initLinks();
    initPreloader();
  });
  $win.on('load', function () { if (MOTION) { ScrollTrigger.refresh(); } });

}(jQuery));
