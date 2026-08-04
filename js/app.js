/* ============================================================
   APP — khởi động, định tuyến, sidebar, mục lục, quiz, tiến độ.
   Chạy sau cùng, khi mọi bài học đã đăng ký xong.
   ============================================================ */
(function () {
  'use strict';

  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var elTopbar    = $('.topbar');
  var elContent   = $('#content');
  var elSidebar   = $('#sidebar');
  var elSideNav   = $('#sidebarNav');
  var elBackdrop  = $('#sidebarBackdrop');
  var elTocNav    = $('#tocNav');
  var elToc       = $('#toc');
  var elSearch    = $('#searchInput');
  var elResults   = $('#searchResults');
  var elRing      = $('#progressRing');
  var elPct       = $('#progressText');
  var elPill      = $('#progressPill');

  var RING_C = 97.4;          // chu vi vòng tiến độ, khớp với CSS
  var spy = null;             // IntersectionObserver của mục lục

  /* Hai mốc màn hình dưới đây phải khớp với css/layout.css:
     900px = sidebar thành ngăn kéo, 700px = ô tìm kiếm thu về một nút. */
  var BP_DRAWER = 900;
  var BP_SEARCH = 700;
  function isDrawer() { return window.innerWidth <= BP_DRAWER; }

  /* ══════════════════════════════════════════════════
     TIẾN ĐỘ
     ══════════════════════════════════════════════════ */
  function refreshProgress() {
    var total = Course.total();
    var done  = Course.flat.filter(function (l) { return Store.isDone(l.id); }).length;
    var pct   = total ? Math.round(done / total * 100) : 0;

    elRing.style.strokeDashoffset = String(RING_C * (1 - done / total));
    elPct.textContent = pct + '%';
    elPill.title = 'Đã hoàn thành ' + done + '/' + total + ' bài';
  }

  /* ══════════════════════════════════════════════════
     SIDEBAR
     ══════════════════════════════════════════════════ */
  function buildSidebar() {
    var html = COURSE.modules.map(function (m) {
      var open = Store.isModuleOpen(m.id, m.id === 'm0');

      var lessons = m.lessons.map(function (l) {
        var ready = Lesson.has(l.id);
        var cls = 'les' + (ready ? '' : ' is-locked');
        var href = ready ? '#/' + l.id : '#/';
        return '<a class="' + cls + '" href="' + href + '" data-les="' + l.id + '"' +
                 (ready ? '' : ' title="Bài này chưa được viết"') + '>' +
                 '<span class="les__tick">' + ICON('check') + '</span>' +
                 '<span class="les__txt"><span class="les__num">' + l.n + '.</span> ' +
                   Render.esc(l.title) + '</span>' +
               '</a>';
      }).join('');

      return '<div class="mod' + (open ? ' is-open' : '') + '" data-mod="' + m.id + '">' +
        '<button class="mod__head" type="button" data-modtoggle>' +
          '<span class="mod__chev">' + ICON('chevronRight') + '</span>' +
          '<span class="mod__num">' + m.num + '</span>' +
          '<span class="mod__name">' + Render.esc(m.name) + '</span>' +
          '<span class="mod__count">' + m.lessons.length + '</span>' +
        '</button>' +
        '<div class="mod__list">' + lessons + '</div>' +
      '</div>';
    }).join('');

    elSideNav.innerHTML = html;

    elSideNav.addEventListener('click', function (e) {
      var t = e.target.closest('[data-modtoggle]');
      if (t) {
        var mod = t.closest('.mod');
        var on = !mod.classList.contains('is-open');
        mod.classList.toggle('is-open', on);
        Store.setModuleOpen(mod.dataset.mod, on);
        return;
      }
      var link = e.target.closest('.les');
      if (link && link.classList.contains('is-locked')) {
        e.preventDefault();
        return;
      }
      if (link && isDrawer()) { closeSidebar(); }
    });
  }

  function refreshSidebar(activeId) {
    $$('.les', elSideNav).forEach(function (a) {
      var id = a.dataset.les;
      a.classList.toggle('is-done', Store.isDone(id));
      a.classList.toggle('is-active', id === activeId);
    });

    // Tự mở chặng chứa bài đang xem
    if (activeId) {
      var m = Course.moduleOf(activeId);
      if (m) {
        var node = $('[data-mod="' + m.id + '"]', elSideNav);
        if (node && !node.classList.contains('is-open')) {
          node.classList.add('is-open');
          Store.setModuleOpen(m.id, true);
        }
      }
    }
  }

  /* Khi ngăn kéo mở, khoá cuộn trang nền (class .is-locked ở layout.css) —
     nếu không, vuốt trong danh sách bài sẽ kéo luôn nội dung phía sau. */
  function openSidebar() {
    elSidebar.classList.add('is-open');
    elBackdrop.hidden = false;
    document.body.classList.add('is-locked');
    $('#btnSidebar').setAttribute('aria-expanded', 'true');
  }
  function closeSidebar() {
    elSidebar.classList.remove('is-open');
    elBackdrop.hidden = true;
    document.body.classList.remove('is-locked');
    $('#btnSidebar').setAttribute('aria-expanded', 'false');
  }

  /* ══════════════════════════════════════════════════
     Ô TÌM KIẾM TRÊN MÀN HÌNH HẸP
     Dưới 700px ô nhập bị ẩn, chỉ còn nút kính lúp. Bấm nút thì ô bung ra
     phủ kín thanh trên — rộng bằng cả màn hình thay vì bị ép còn hơn
     trăm pixel giữa logo và vòng tiến độ.
     ══════════════════════════════════════════════════ */
  function openSearch() {
    elTopbar.classList.add('is-searching');
    $('#btnSearch').setAttribute('aria-expanded', 'true');
    elSearch.focus();
    elSearch.select();
  }
  function closeSearch() {
    elTopbar.classList.remove('is-searching');
    $('#btnSearch').setAttribute('aria-expanded', 'false');
    elResults.hidden = true;
    elSearch.value = '';
    elSearch.blur();
  }

  /* ══════════════════════════════════════════════════
     MỤC LỤC TRONG BÀI
     ══════════════════════════════════════════════════ */
  function buildToc(toc) {
    if (spy) { spy.disconnect(); spy = null; }

    if (!toc || toc.length < 2) {
      elToc.style.visibility = 'hidden';
      elTocNav.innerHTML = '';
      return;
    }
    elToc.style.visibility = 'visible';

    elTocNav.innerHTML = toc.map(function (t) {
      return '<a class="toc__item toc__item--h' + t.level + '" href="#' + t.id + '" data-toc="' + t.id + '">' +
               Render.esc(Search.plain(t.text)) +
             '</a>';
    }).join('');

    // Đánh dấu mục đang đọc
    var links = {};
    $$('[data-toc]', elTocNav).forEach(function (a) { links[a.dataset.toc] = a; });

    spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) { return; }
        $$('.toc__item.is-active', elTocNav).forEach(function (a) { a.classList.remove('is-active'); });
        var a = links[en.target.id];
        if (a) { a.classList.add('is-active'); }
      });
    }, { rootMargin: '-70px 0px -72% 0px', threshold: 0 });

    toc.forEach(function (t) {
      var el = document.getElementById(t.id);
      if (el) { spy.observe(el); }
    });
  }

  /* ══════════════════════════════════════════════════
     TRANG CHỦ
     ══════════════════════════════════════════════════ */
  function viewHome() {
    var total = Course.total();
    var ready = Course.readyCount();
    var done  = Course.flat.filter(function (l) { return Store.isDone(l.id); }).length;

    // Bài tiếp theo nên học
    var nextUp = null;
    for (var i = 0; i < Course.flat.length; i++) {
      var l = Course.flat[i];
      if (Lesson.has(l.id) && !Store.isDone(l.id)) { nextUp = l; break; }
    }
    if (!nextUp) {
      for (var j = 0; j < Course.flat.length; j++) {
        if (Lesson.has(Course.flat[j].id)) { nextUp = Course.flat[j]; break; }
      }
    }

    var mods = COURSE.modules.map(function (m) {
      var d = m.lessons.filter(function (l) { return Store.isDone(l.id); }).length;
      var r = m.lessons.filter(function (l) { return Lesson.has(l.id); }).length;
      var first = m.lessons.filter(function (l) { return Lesson.has(l.id); })[0];
      var href = first ? '#/' + first.id : '#/';

      return '<a class="map__row" href="' + href + '">' +
        '<span class="map__n">' + m.num + '</span>' +
        '<span class="map__b">' +
          '<span class="map__t">' + Render.esc(m.name) + '</span>' +
          '<span class="map__d">' + Render.esc(m.desc) + '</span>' +
          '<span class="bar"><span class="bar__f" style="width:' +
            (m.lessons.length ? Math.round(d / m.lessons.length * 100) : 0) + '%"></span></span>' +
        '</span>' +
        '<span class="map__c">' + d + '/' + m.lessons.length +
          (r < m.lessons.length ? '<br>' + r + ' bài sẵn' : '') + '</span>' +
      '</a>';
    }).join('');

    elContent.innerHTML =
      '<section class="hero">' +
        '<span class="hero__tag">' + ICON('sparkles') + 'Học bằng WSL2 + QEMU — không cần mua phần cứng</span>' +
        '<h1>Embedded Linux từ số 0 đến đi làm</h1>' +
        '<p class="hero__sub">Khoá học tiếng Việt dành cho người chưa biết gì về Linux. ' +
          'Mỗi câu lệnh đều được mổ xẻ từng thành phần, mỗi khái niệm đều đi kèm bài thực hành ' +
          'chạy được ngay trên máy bạn.</p>' +
        '<div class="hero__cta">' +
          (nextUp
            ? '<a class="btn btn--primary" href="#/' + nextUp.id + '">' + ICON('arrowRight') +
              (done ? 'Học tiếp: Bài ' + nextUp.n : 'Bắt đầu Bài ' + nextUp.n) + '</a>'
            : '') +
          '<a class="btn" href="LO-TRINH.md" target="_blank" rel="noopener">' + ICON('map') + 'Xem lộ trình đầy đủ</a>' +
        '</div>' +
      '</section>' +

      '<div class="stats">' +
        '<div class="stat"><div class="stat__n">' + total + '</div><div class="stat__l">Bài học trong lộ trình</div></div>' +
        '<div class="stat"><div class="stat__n">' + COURSE.modules.length + '</div><div class="stat__l">Chặng</div></div>' +
        '<div class="stat"><div class="stat__n">' + ready + '</div><div class="stat__l">Bài đã viết nội dung</div></div>' +
        '<div class="stat"><div class="stat__n">' + done + '</div><div class="stat__l">Bạn đã hoàn thành</div></div>' +
      '</div>' +

      '<h2 class="h2">Bản đồ khoá học</h2>' +
      '<div class="map">' + mods + '</div>';

    ICON.hydrate(elContent);
    buildToc([]);
    refreshSidebar(null);
    document.title = 'Học Embedded Linux — Từ số 0 đến đi làm';
  }

  /* ══════════════════════════════════════════════════
     TRANG BÀI HỌC
     ══════════════════════════════════════════════════ */
  function viewLesson(id) {
    var meta = Course.find(id);
    var data = Lesson.get(id);

    if (!meta) { location.hash = '#/'; return; }

    if (!data) {
      elContent.innerHTML =
        '<div class="empty">' +
          ICON('bookmark') +
          '<h2>Bài ' + meta.n + ' chưa được viết</h2>' +
          '<p><strong>' + Render.esc(meta.title) + '</strong> nằm trong lộ trình nhưng nội dung ' +
            'chưa được soạn. Các bài được viết dần theo tiến độ học của bạn.</p>' +
          '<a class="btn btn--primary" href="#/">' + ICON('arrowLeft') + 'Về trang chủ</a>' +
        '</div>';
      ICON.hydrate(elContent);
      buildToc([]);
      refreshSidebar(id);
      return;
    }

    var built = Render.lesson(data);
    var prev = Course.prev(id);
    var next = Course.next(id);
    var isDone = Store.isDone(id);

    var doneBar =
      '<div class="done-bar">' +
        '<div class="done-bar__txt">' +
          (isDone ? 'Bạn đã đánh dấu hoàn thành bài này.'
                  : 'Đã làm hết phần thực hành và trả lời xong phần tự kiểm tra?') +
        '</div>' +
        '<button class="btn ' + (isDone ? 'btn--done' : 'btn--primary') + '" id="btnDone" type="button">' +
          ICON('check') + (isDone ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành') +
        '</button>' +
      '</div>';

    function pagerItem(l, dir) {
      if (!l) {
        return '<span class="pager__i is-off pager__i--' + dir + '"></span>';
      }
      var ready = Lesson.has(l.id);
      var cls = 'pager__i pager__i--' + dir + (ready ? '' : ' is-off');
      var inner =
        '<span><span class="pager__lbl">' + (dir === 'prev' ? 'Bài trước' : 'Bài tiếp theo') + '</span>' +
        '<span class="pager__ttl">' + l.n + '. ' + Render.esc(l.title) + '</span></span>';
      return '<a class="' + cls + '" href="#/' + l.id + '">' +
               (dir === 'prev' ? ICON('arrowLeft') + inner : inner + ICON('arrowRight')) +
             '</a>';
    }

    elContent.innerHTML = built.html + doneBar +
      '<div class="pager">' + pagerItem(prev, 'prev') + pagerItem(next, 'next') + '</div>';

    ICON.hydrate(elContent);
    buildToc(built.toc);
    refreshSidebar(id);
    updateQuizScore();

    document.title = 'Bài ' + meta.n + '. ' + Search.plain(data.title) + ' — Embedded Linux';

    $('#btnDone').addEventListener('click', function () {
      var on = Store.toggleDone(id);
      this.className = 'btn ' + (on ? 'btn--done' : 'btn--primary');
      this.innerHTML = ICON('check') + (on ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành');
      $('.done-bar__txt').textContent = on
        ? 'Bạn đã đánh dấu hoàn thành bài này.'
        : 'Đã làm hết phần thực hành và trả lời xong phần tự kiểm tra?';
      refreshProgress();
      refreshSidebar(id);
    });
  }

  /* ══════════════════════════════════════════════════
     QUIZ — xử lý bằng uỷ quyền sự kiện
     ══════════════════════════════════════════════════ */
  function updateQuizScore() {
    var box = $('.quiz', elContent);
    if (!box) { return; }
    var lessonId = box.dataset.quiz;
    var data = Lesson.get(lessonId);
    if (!data || !data.quiz) { return; }

    var saved = Store.getQuiz(lessonId);
    var answered = Object.keys(saved).length;
    var right = 0;
    data.quiz.forEach(function (q, i) {
      if (saved[String(i)] === q.a) { right++; }
    });

    var el = $('[data-score]', box);
    el.textContent = answered ? ('Đúng ' + right + '/' + data.quiz.length) : '';
  }

  elContent.addEventListener('click', function (e) {

    /* --- Sao chép khối lệnh --- */
    var copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) {
      var pre = copyBtn.closest('.code').querySelector('.code__body');
      var text = pre.innerText.replace(/ /g, ' ');

      var ok = function () {
        copyBtn.classList.add('is-ok');
        copyBtn.innerHTML = ICON('check') + 'Đã chép';
        setTimeout(function () {
          copyBtn.classList.remove('is-ok');
          copyBtn.innerHTML = ICON('copy') + 'Sao chép';
        }, 1600);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, function () { legacyCopy(text, ok); });
      } else {
        legacyCopy(text, ok);
      }
      return;
    }

    /* --- Chọn đáp án quiz --- */
    var opt = e.target.closest('.q__opt');
    if (opt && !opt.disabled) {
      var qBox = opt.closest('.q');
      var quizBox = opt.closest('.quiz');
      var lessonId = quizBox.dataset.quiz;
      var qi = parseInt(qBox.dataset.qi, 10);
      var oi = parseInt(opt.dataset.o, 10);
      var data = Lesson.get(lessonId);
      var correct = data.quiz[qi].a;

      Store.setQuizAnswer(lessonId, qi, oi);

      Array.prototype.forEach.call(qBox.querySelectorAll('.q__opt'), function (b, idx) {
        b.disabled = true;
        if (idx === correct)   { b.classList.add('is-right'); }
        else if (idx === oi)   { b.classList.add('is-wrong'); }
      });

      var why = qBox.querySelector('.q__why');
      why.hidden = false;
      why.querySelector('b').textContent = (oi === correct) ? 'Chính xác. ' : 'Chưa đúng. ';
      updateQuizScore();
      return;
    }
  });

  function legacyCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (err) { /* trình duyệt chặn */ }
    document.body.removeChild(ta);
  }

  /* ══════════════════════════════════════════════════
     TÌM KIẾM
     ══════════════════════════════════════════════════ */
  function renderResults(term) {
    var hits = Search.query(term);

    if (!term || term.trim().length < 2) {
      elResults.hidden = true;
      return;
    }

    if (!hits.length) {
      elResults.innerHTML = '<div class="sr-empty">Không tìm thấy “' +
        Render.esc(term) + '”.<br>Có thể bài chứa nội dung này chưa được viết.</div>';
      elResults.hidden = false;
      return;
    }

    elResults.innerHTML = hits.map(function (h, i) {
      return '<a class="sr-item' + (i === 0 ? ' is-active' : '') + '" href="#/' + h.entry.id + '">' +
        '<div class="sr-item__top">' +
          '<span class="sr-item__badge">Bài ' + h.entry.n + '</span>' +
          '<span class="sr-item__title">' + Render.esc(h.entry.title) + '</span>' +
        '</div>' +
        '<div class="sr-item__snip">' + h.snip + '</div>' +
      '</a>';
    }).join('');
    elResults.hidden = false;
  }

  function wireSearch() {
    var timer = null;

    elSearch.addEventListener('input', function () {
      clearTimeout(timer);
      var v = this.value;
      timer = setTimeout(function () { renderResults(v); }, 120);
    });

    elSearch.addEventListener('keydown', function (e) {
      var items = $$('.sr-item', elResults);
      var idx = items.findIndex(function (a) { return a.classList.contains('is-active'); });

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!items.length) { return; }
        e.preventDefault();
        if (idx >= 0) { items[idx].classList.remove('is-active'); }
        var nx = e.key === 'ArrowDown'
          ? (idx + 1) % items.length
          : (idx - 1 + items.length) % items.length;
        items[nx].classList.add('is-active');
        items[nx].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        if (idx >= 0) { e.preventDefault(); items[idx].click(); }
      } else if (e.key === 'Escape') {
        closeSearch();
      }
    });

    elResults.addEventListener('click', closeSearch);

    $('#btnSearch').addEventListener('click', function () {
      elTopbar.classList.contains('is-searching') ? closeSearch() : openSearch();
    });
    $('#btnSearchClose').addEventListener('click', closeSearch);

    document.addEventListener('click', function (e) {
      if (e.target.closest('.search') || e.target.closest('#btnSearch')) { return; }
      // Bấm ra ngoài: trên desktop chỉ cần giấu danh sách kết quả,
      // trên điện thoại thì thu luôn ô nhập lại thành nút.
      if (elTopbar.classList.contains('is-searching')) { closeSearch(); }
      else { elResults.hidden = true; }
    });

    // Phím "/" để nhảy vào ô tìm kiếm — dưới 700px phải bung ô ra trước,
    // vì lúc đó ô nhập đang display:none nên không nhận được focus.
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        if (window.innerWidth <= BP_SEARCH) { openSearch(); }
        else { elSearch.focus(); elSearch.select(); }
      }
    });
  }

  /* ══════════════════════════════════════════════════
     ĐỊNH TUYẾN
     ══════════════════════════════════════════════════ */
  function route() {
    var h = location.hash.replace(/^#\/?/, '').trim();

    // Neo trong trang (#ten-muc) — để trình duyệt tự xử lý, không đổi view
    if (h && !/^bai-\d+$/.test(h) && h !== '') {
      if (document.getElementById(h)) { return; }
    }

    elResults.hidden = true;

    if (!h) { viewHome(); }
    else    { viewLesson(h); }

    refreshProgress();
    window.scrollTo({ top: 0, behavior: 'auto' });
    $('#main').focus({ preventScroll: true });
  }

  /* ══════════════════════════════════════════════════
     KHỞI ĐỘNG
     ══════════════════════════════════════════════════ */
  function init() {
    Store.setTheme(Store.getTheme());
    ICON.hydrate(document);

    $('#btnTheme').addEventListener('click', function () { Store.toggleTheme(); });
    $('#btnSidebar').addEventListener('click', function () {
      elSidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
    });
    elBackdrop.addEventListener('click', closeSidebar);

    // Mục lục: cuộn mượt tới tiêu đề, không đụng vào hash của router
    elTocNav.addEventListener('click', function (e) {
      var a = e.target.closest('[data-toc]');
      if (!a) { return; }
      e.preventDefault();
      var target = document.getElementById(a.dataset.toc);
      if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });

    $('#btnCollapseAll').addEventListener('click', function () {
      var anyOpen = $$('.mod.is-open', elSideNav).length > 0;
      $$('.mod', elSideNav).forEach(function (m) {
        m.classList.toggle('is-open', !anyOpen);
        Store.setModuleOpen(m.dataset.mod, !anyOpen);
      });
      this.textContent = anyOpen ? 'Mở rộng' : 'Thu gọn';
    });

    // Esc: đóng ngăn kéo bài học (ô tìm kiếm đã tự lo phím Esc của nó)
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && elSidebar.classList.contains('is-open')) {
        closeSidebar();
        $('#btnSidebar').focus();
      }
    });

    // Xoay ngang máy / phóng to cửa sổ: trả giao diện về trạng thái desktop,
    // nếu không thì trang nền vẫn bị khoá cuộn hoặc ô tìm kiếm vẫn phủ ngang.
    window.addEventListener('resize', function () {
      if (!isDrawer() && elSidebar.classList.contains('is-open')) { closeSidebar(); }
      if (window.innerWidth > BP_SEARCH && elTopbar.classList.contains('is-searching')) {
        elTopbar.classList.remove('is-searching');
        $('#btnSearch').setAttribute('aria-expanded', 'false');
      }
    });

    buildSidebar();
    Search.build();
    wireSearch();

    window.addEventListener('hashchange', route);
    route();

    if (!Store.persistent) {
      console.warn('[app] Trình duyệt chặn localStorage — tiến độ sẽ mất khi đóng tab.');
    }
    console.log('[app] Sẵn sàng. ' + Course.readyCount() + '/' + Course.total() + ' bài đã có nội dung.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
