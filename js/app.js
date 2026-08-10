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
  var currentId = null;       // bài đang mở, null nếu đang ở trang chủ
  var currentEx = null;       // bộ bài tập đang mở, null nếu không ở trang bài tập

  /* Hai mốc màn hình dưới đây phải khớp với css/layout.css:
     900px = sidebar thành ngăn kéo, 700px = ô tìm kiếm thu về một nút. */
  var BP_DRAWER = 900;
  var BP_SEARCH = 700;
  function isDrawer() { return window.innerWidth <= BP_DRAWER; }

  var TA_DEBOUNCE = 700;      // ms gộp các phím gõ trong ô tự luận thành một lệnh ghi
  var taTimers = {};          // itemId -> id của setTimeout đang chờ
  var hadData = false;        // lần vẽ gần nhất đã có dữ liệu từ máy chủ chưa

  /* ══════════════════════════════════════════════════
     TIẾN ĐỘ
     Tiến độ nằm trên máy chủ, không nằm ở máy này (CLAUDE.md §14). Chưa tải
     xong thì KHÔNG được hiện 0% — đó là một con số sai, và người học sẽ
     thấy tiến độ của mình biến mất rồi hiện lại sau mỗi lần mở trang.
     ══════════════════════════════════════════════════ */
  function refreshProgress() {
    var total = Course.total();
    var ready = Store.ready();
    var done  = ready ? Course.flat.filter(function (l) { return Store.isDone(l.id); }).length : 0;
    var pct   = total ? Math.round(done / total * 100) : 0;

    elRing.style.strokeDashoffset = String(RING_C * (ready ? (1 - done / total) : 1));
    elPct.textContent = ready ? pct + '%' : '—';
    elPill.title = ready
      ? 'Đã hoàn thành ' + done + '/' + total + ' bài'
      : 'Chưa tải được tiến độ từ máy chủ';
    elPill.classList.toggle('is-wait', !ready);
  }

  /* Khoá/mở mọi thứ có thể ghi. CSS treo trên body.is-nodb làm phần nhìn,
     blocked() dưới đây chặn phần hành vi — cần cả hai, vì pointer-events
     không ngăn được người dùng bàn phím tab vào rồi bấm Enter. */
  function syncLock() {
    document.body.classList.toggle('is-nodb', !Store.ready());
  }

  function blocked() {
    if (Store.ready()) { return false; }
    Toast.show(Cloud.state() === 'connecting'
      ? 'Đang tải tiến độ từ máy chủ, chờ vài giây rồi thử lại.'
      : 'Chưa kết nối được máy chủ nên chưa có chỗ lưu. Bấm biểu tượng đồng bộ ' +
        'trên thanh trên để thử lại.');
    return true;
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
        var exId = Exercise.idFor(l.id);

        /* Chip bài tập là một <a> RIÊNG, nằm cạnh .les chứ không lồng trong
           nó: một thẻ <a> không được chứa thẻ <a> khác. */
        var chip = Exercise.has(exId)
          ? '<a class="les__bt" href="#/' + exId + '" data-bt="' + exId + '" ' +
              'title="Bài tập của bài ' + l.n + '" aria-label="Bài tập của bài ' + l.n + '">' +
              ICON('listChecks') + '</a>'
          : '';

        return '<div class="les-row">' +
                 '<a class="' + cls + '" href="' + href + '" data-les="' + l.id + '"' +
                   (ready ? '' : ' title="Bài này chưa được viết"') + '>' +
                   '<span class="les__tick">' + ICON('check') + '</span>' +
                   '<span class="les__txt"><span class="les__num">' + l.n + '.</span> ' +
                     Render.esc(l.title) + '</span>' +
                 '</a>' + chip +
               '</div>';
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
      if ((link || e.target.closest('.les__bt')) && isDrawer()) { closeSidebar(); }
    });
  }

  function refreshSidebar(activeId) {
    $$('.les', elSideNav).forEach(function (a) {
      var id = a.dataset.les;
      a.classList.toggle('is-done', Store.isDone(id));
      a.classList.toggle('is-active', id === activeId);
    });

    /* Chip bài tập sáng lên khi đã làm hết bộ. Nó KHÔNG ăn theo trạng thái
       "đã hoàn thành bài học": hai tiến độ tách rời nhau (CLAUDE.md §13.1). */
    $$('.les__bt', elSideNav).forEach(function (a) {
      var exId = a.dataset.bt;
      var s = Exercise.stats(exId);
      a.classList.toggle('is-active', exId === currentEx);
      a.classList.toggle('is-full', Store.ready() && s.total > 0 && s.done === s.total);
      a.title = 'Bài tập — đã làm ' + num(s.done) + '/' + s.total + ' câu';
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
    syncSidebarButton();
  }
  function closeSidebar() {
    elSidebar.classList.remove('is-open');
    elBackdrop.hidden = true;
    document.body.classList.remove('is-locked');
    syncSidebarButton();
  }

  /* Trên desktop (>900px), #btnSidebar không mở ngăn kéo mà thu/mở cả cột
     sidebar (xem .sidebar-collapsed ở layout.css) — người học lấy lại bề
     ngang cho nội dung mà không mất danh sách bài, chỉ cần bấm lại là hiện. */
  function setSidebarCollapsed(on) {
    document.body.classList.toggle('sidebar-collapsed', on);
    Store.setSidebarCollapsed(on);
    syncSidebarButton();
  }
  function syncSidebarButton() {
    var btn = $('#btnSidebar');
    var shown = isDrawer()
      ? elSidebar.classList.contains('is-open')
      : !document.body.classList.contains('sidebar-collapsed');
    btn.setAttribute('aria-expanded', String(shown));
    btn.setAttribute('aria-label', shown ? 'Ẩn danh sách bài học' : 'Mở danh sách bài học');
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
  /* Mọi con số ĐO TIẾN ĐỘ CỦA NGƯỜI HỌC đều phải đi qua đây. Chưa có dữ liệu
     từ máy chủ thì hiện dấu gạch: một số 0 lúc đang tải là một lời nói dối,
     và nó nói đúng cái điều người học sợ nhất — "mất hết rồi". */
  function num(v) { return Store.ready() ? String(v) : '—'; }

  function viewHome() {
    var total = Course.total();
    var ready = Course.readyCount();
    var got   = Store.ready();
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
          '<span class="bar' + (got ? '' : ' is-wait') + '"><span class="bar__f" style="width:' +
            (got && m.lessons.length ? Math.round(d / m.lessons.length * 100) : 0) + '%"></span></span>' +
        '</span>' +
        '<span class="map__c">' + num(d) + '/' + m.lessons.length +
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
              (got && done ? 'Học tiếp: Bài ' + nextUp.n : 'Bắt đầu Bài ' + nextUp.n) + '</a>'
            : '') +
          '<a class="btn" href="LO-TRINH.md" target="_blank" rel="noopener">' + ICON('map') + 'Xem lộ trình đầy đủ</a>' +
        '</div>' +
      '</section>' +

      '<div class="stats">' +
        '<div class="stat"><div class="stat__n">' + total + '</div><div class="stat__l">Bài học trong lộ trình</div></div>' +
        '<div class="stat"><div class="stat__n">' + COURSE.modules.length + '</div><div class="stat__l">Chặng</div></div>' +
        '<div class="stat"><div class="stat__n">' + ready + '</div><div class="stat__l">Bài đã viết nội dung</div></div>' +
        '<div class="stat"><div class="stat__n">' + num(done) + '</div><div class="stat__l">Bạn đã hoàn thành</div></div>' +
      '</div>' +

      '<h2 class="h2">Bản đồ khoá học</h2>' +
      '<div class="map">' + mods + '</div>';

    ICON.hydrate(elContent);
    buildToc([]);
    currentId = null;
    currentEx = null;
    refreshSidebar(null);
    document.title = 'Học Embedded Linux — Từ số 0 đến đi làm';
  }

  /* ══════════════════════════════════════════════════
     TRANG BÀI HỌC
     ══════════════════════════════════════════════════ */
  /* Vẽ lại thanh "đánh dấu hoàn thành" theo trạng thái hiện tại của Store.
     Tách riêng vì có ba nơi gọi: lúc dựng bài, lúc người học bấm nút, và
     lúc máy khác vừa tick bài này rồi đẩy về qua Firestore. */
  function paintDoneBar(id) {
    var btn = $('#btnDone', elContent);
    if (!btn) { return; }
    var ready = Store.ready();
    var on = ready && Store.isDone(id);

    btn.className = 'btn ' + (on ? 'btn--done' : 'btn--primary');
    btn.disabled = !ready;
    btn.innerHTML = ICON('check') +
      (!ready ? 'Đang chờ máy chủ…' : (on ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'));

    $('.done-bar__txt', elContent).textContent = !ready
      ? 'Tiến độ được lưu trên máy chủ chứ không lưu ở máy này, nên nút này mở khoá khi kết nối xong.'
      : (on ? 'Bạn đã đánh dấu hoàn thành bài này.'
            : 'Đã làm hết phần thực hành và trả lời xong phần tự kiểm tra?');
  }

  function viewLesson(id) {
    var meta = Course.find(id);
    var data = Lesson.get(id);

    if (!meta) { location.hash = '#/'; return; }

    currentId = id;
    currentEx = null;

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

    /* Dựng rỗng rồi để paintDoneBar() điền — chỉ một chỗ duy nhất quyết định
       chữ và trạng thái khoá của nút này, nên nó không thể lệch với chính nó. */
    var doneBar =
      '<div class="done-bar">' +
        '<div class="done-bar__txt"></div>' +
        '<button class="btn" id="btnDone" type="button"></button>' +
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

    elContent.innerHTML = built.html + exCta(id) + doneBar +
      '<div class="pager">' + pagerItem(prev, 'prev') + pagerItem(next, 'next') + '</div>';

    ICON.hydrate(elContent);
    buildToc(built.toc);
    refreshSidebar(id);
    paintDoneBar(id);
    updateQuizScore();

    document.title = 'Bài ' + meta.n + '. ' + Search.plain(data.title) + ' — Embedded Linux';

    /* Bấm là thấy ngay, rồi mới ghi. Máy chủ từ chối thì Store đã tự hoàn tác,
       nên chỉ cần vẽ lại theo sự thật hiện tại và nói ra vì sao nút bật ngược
       — nút tự đổi màu mà không giải thích là chuyện tệ nhất có thể làm ở đây. */
    $('#btnDone').addEventListener('click', function () {
      if (blocked()) { return; }
      var on = !Store.isDone(id);

      var writing = Store.setDone(id, on);
      paintDoneBar(id);
      refreshProgress();
      refreshSidebar(id);

      writing.then(function (ok) {
        if (ok) { return; }
        paintDoneBar(id);
        refreshProgress();
        refreshSidebar(id);
        Toast.writeFailed('trạng thái hoàn thành của bài này');
      });
    });
  }

  /* ══════════════════════════════════════════════════
     BÀI TẬP  (CLAUDE.md §13)
     ══════════════════════════════════════════════════ */

  /* Lời mời ở cuối bài học. Chỉ hiện khi bộ bài tập tương ứng đã được viết —
     không bao giờ trỏ tới một trang trống. */
  function exCta(lessonId) {
    var exId = Exercise.idFor(lessonId);
    if (!Exercise.has(exId)) { return ''; }
    var s = Exercise.stats(exId);
    return '<div class="excta">' +
      '<span class="excta__ico">' + ICON('listChecks') + '</span>' +
      '<span class="excta__b">' +
        '<b>Bài tập ' + Course.find(lessonId).n + ' — ' + s.total + ' câu, chia 2 lượt</b>' +
        '<span>' + (Store.ready() && s.done
          ? 'Bạn đã làm ' + s.done + '/' + s.total + ' câu. Làm tiếp từ chỗ đang dở.'
          : 'Đọc xong chưa chắc đã hiểu. Lượt 1 làm ngay bây giờ, lượt 2 sau 2–3 ngày.') +
        '</span>' +
      '</span>' +
      '<a class="btn btn--primary" href="#/' + exId + '">' +
        ICON('arrowRight') + (Store.ready() && s.done ? 'Làm tiếp' : 'Vào làm bài tập') +
      '</a>' +
    '</div>';
  }

  /* Vẽ lại thanh tiến độ riêng của bộ + chấm trạng thái của một câu.
     Không dựng lại cả trang: người học có thể đang gõ giữa một ô tự luận. */
  function paintExProgress() {
    if (!currentEx) { return; }
    var got = Store.ready();
    var s = Exercise.stats(currentEx);

    var fill = $('[data-exfill]', elContent);
    if (fill) {
      fill.style.width = (got ? s.pct : 0) + '%';
      if (fill.parentNode) { fill.parentNode.classList.toggle('is-wait', !got); }
    }
    var n = $('[data-exdone]', elContent);
    if (n) { n.textContent = num(s.done); }
    var p = $('[data-expct]', elContent);
    if (p) { p.textContent = got ? s.pct + '%' : '—'; }
    refreshSidebar(currentId);
  }

  function exItemOf(art) {
    var data = Exercise.get(currentEx);
    if (!data) { return null; }
    var id = art.dataset.item;
    var found = null;
    Exercise.items(data).forEach(function (e) {
      if (e.it.id === id) { found = e.it; }
    });
    return found;
  }

  function paintExDot(art) {
    var item = exItemOf(art);
    if (!item) { return; }
    var st = Store.getEx(currentEx)[item.id];
    var dot = $('[data-dot]', art);
    if (dot) { dot.classList.toggle('is-on', Exercise.isAnswered(item, st)); }
  }

  function showWhy(art, verdict) {
    var why = $('[data-why]', art);
    if (!why) { return; }
    why.hidden = false;
    var b = $('[data-verdict]', why);
    if (b) { b.textContent = verdict; }
  }

  /* Khoá "Tiêu chí"/"Lời giải" theo ô tự luận có chữ hay không. Đây là cơ chế
     chính của phần tự chấm, không phải sự phiền hà cần làm mượt — xem
     CLAUDE.md §13.5. Tách riêng vì cả lúc gõ lẫn lúc dựng lại câu đều cần. */
  function syncFreeLock(art) {
    var ta = $('[data-ta]', art);
    if (!ta) { return; }
    var has = !!ta.value.trim();

    $$('[data-act="crit"], [data-act="sol"]', art).forEach(function (b) { b.disabled = !has; });
    var lock = $('[data-lock]', art);
    if (lock) { lock.hidden = has; }
    if (!has) {
      $$('[data-panel="crit"], [data-panel="sol"]', art).forEach(function (p) { p.hidden = true; });
    }
  }

  /* Nhãn "đang lưu / đã lưu / chưa lưu được" cạnh ô tự luận. */
  function setSaveTag(art, txt, cls) {
    var el = $('[data-save]', art);
    if (!el) { return; }
    el.textContent = txt;
    el.className = 'exf__save' + (cls ? ' ' + cls : '');
  }

  /* Dựng lại ĐÚNG MỘT câu từ dữ liệu hiện có trong Store. Dùng khi máy chủ từ
     chối lệnh ghi: Store đã hoàn tác rồi, nên vẽ lại chắc chắn khớp với thứ
     thật sự được lưu.

     Ba thứ được giữ nguyên qua lần vẽ lại, vì mất chúng còn khó chịu hơn cả
     lỗi mạng: chữ đang gõ dở trong ô tự luận, chữ trong ô điền/số, và các
     bảng đang mở. Cái được hoàn tác là ĐIỂM và TRẠNG THÁI ĐÃ CHẤM — thứ máy
     chủ chưa nhận — chứ không phải công sức gõ của người học. */
  function repaintExItem(art) {
    var data = Exercise.get(currentEx);
    var itemId = art.dataset.item;
    var entry = data && Exercise.entryOf(currentEx, itemId);
    if (!entry) { return null; }

    var ta = $('[data-ta]', art);
    var input = $('[data-in]', art);
    var keepTa = ta ? ta.value : null;
    var keepIn = input ? input.value : null;
    var open = $$('[data-panel]', art)
      .filter(function (p) { return !p.hidden; })
      .map(function (p) { return p.dataset.panel; });

    art.outerHTML = RenderEx.item(entry, data, Store.getEx(currentEx));

    var fresh = $('.exi[data-item="' + itemId + '"]', elContent);
    if (!fresh) { return null; }
    ICON.hydrate(fresh);

    if (keepTa !== null) {
      var t2 = $('[data-ta]', fresh);
      if (t2) { t2.value = keepTa; }
    }
    if (keepIn !== null) {
      var i2 = $('[data-in]', fresh);
      if (i2) { i2.value = keepIn; }
    }
    syncFreeLock(fresh);
    open.forEach(function (name) {
      var p = $('[data-panel="' + name + '"]', fresh);
      if (p) { p.hidden = false; }
    });

    paintExDot(fresh);
    paintExProgress();
    return fresh;
  }

  /* Ghi một câu bài tập: vẽ trước, ghi sau, hỏng thì dựng lại câu đó. */
  function writeExItem(art, itemId, patch, what) {
    return Store.setExItem(currentEx, itemId, patch).then(function (ok) {
      if (ok) { return true; }
      repaintExItem(art);
      Toast.writeFailed(what);
      return false;
    });
  }

  function viewExercise(exId) {
    var data = Exercise.get(exId);
    var lessonId = Exercise.lessonOf(exId);
    var meta = Course.find(lessonId);

    if (!meta) { location.hash = '#/'; return; }

    currentId = lessonId;
    currentEx = data ? exId : null;

    if (!data) {
      elContent.innerHTML =
        '<div class="empty">' +
          ICON('listChecks') +
          '<h2>Bài tập ' + meta.n + ' chưa được viết</h2>' +
          '<p>Bộ bài tập của <strong>' + Render.esc(meta.title) + '</strong> sẽ được soạn ' +
            'cùng nhịp với bài học. Trong lúc chờ, phần tự kiểm tra ở cuối bài vẫn dùng được.</p>' +
          '<a class="btn btn--primary" href="#/' + lessonId + '">' + ICON('arrowLeft') +
            'Về Bài ' + meta.n + '</a>' +
        '</div>';
      ICON.hydrate(elContent);
      buildToc([]);
      refreshSidebar(lessonId);
      return;
    }

    var built = RenderEx.set(data);

    elContent.innerHTML = built.html +
      '<div class="done-bar">' +
        '<div class="done-bar__txt">Câu trả lời của bạn được lưu trên máy chủ dưới tên đang ' +
          'đồng bộ, nên mở đúng tên đó ở máy khác là có lại nguyên vẹn. Xoá đi nếu muốn làm ' +
          'lại bộ này từ đầu — tiến độ bài học không bị ảnh hưởng.</div>' +
        '<a class="btn" href="#/' + lessonId + '">' + ICON('arrowLeft') + 'Về bài học</a>' +
        '<button class="btn" id="btnExReset" type="button">' + ICON('scissors') + 'Xoá câu trả lời</button>' +
      '</div>';

    ICON.hydrate(elContent);
    buildToc(built.toc);
    refreshSidebar(lessonId);

    // Chấm trạng thái của từng câu, dựa trên dữ liệu đã lưu
    $$('.exi', elContent).forEach(paintExDot);
    $$('.exi', elContent).forEach(syncFreeLock);
    paintExProgress();

    document.title = 'Bài tập ' + meta.n + '. ' + Search.plain(meta.title) + ' — Embedded Linux';

    /* Xoá cả bộ thì dựng lại cả trang — không có gì đang gõ dở để mà giữ, vì
       vừa xoá xong. Hỏng thì cũng dựng lại: Store đã hoàn tác, trang phải nói
       đúng thứ máy chủ đang giữ. */
    $('#btnExReset').addEventListener('click', function () {
      if (blocked()) { return; }
      if (!confirm('Xoá toàn bộ câu trả lời của bộ bài tập này?')) { return; }
      Store.resetEx(exId).then(function (ok) {
        if (!ok) { Toast.writeFailed('lệnh xoá câu trả lời'); }
        viewExercise(exId);
        window.scrollTo({ top: 0, behavior: 'auto' });
      });
    });
  }

  /* Trang danh mục #/bai-tap. Dùng lại đúng bộ style .map của trang chủ:
     một danh sách "bộ nào có, làm tới đâu" không cần thêm ngôn ngữ hình ảnh mới. */
  function viewExIndex() {
    currentId = null;
    currentEx = null;

    var list = Exercise.ready();
    var t = Exercise.totals();

    var got = Store.ready();

    var rows = list.map(function (r) {
      var s = Exercise.stats(r.exId);
      return '<a class="map__row" href="#/' + r.exId + '">' +
        '<span class="map__n">' + r.lesson.n + '</span>' +
        '<span class="map__b">' +
          '<span class="map__t">' + Render.esc(r.lesson.title) + '</span>' +
          '<span class="map__d">Chặng ' + r.lesson.moduleNum + ' — ' +
            Render.esc(r.lesson.moduleName) + '</span>' +
          '<span class="bar' + (got ? '' : ' is-wait') + '">' +
            '<span class="bar__f" style="width:' + (got ? s.pct : 0) + '%"></span></span>' +
        '</span>' +
        '<span class="map__c">' + num(s.done) + '/' + s.total + '</span>' +
      '</a>';
    }).join('');

    elContent.innerHTML =
      '<div class="lead-crumb"><span>Khoá học</span>' + ICON('chevronRight') + '<span>Bài tập</span></div>' +
      '<h1 class="lead-title">Bài tập</h1>' +
      '<div class="lead-intro">Mỗi bài học có một bộ bài tập riêng. Bộ bài tập <b>không phải</b> ' +
        'phần tự kiểm tra thứ hai: nó bắt bạn <i>tạo ra</i> câu trả lời rồi <i>tự đối chiếu</i> ' +
        'với một tiêu chí kiểm được, thay vì chỉ nhớ lại bài vừa đọc.</div>' +

      (list.length
        ? '<div class="stats">' +
            '<div class="stat"><div class="stat__n">' + t.sets + '</div><div class="stat__l">Bộ đã có</div></div>' +
            '<div class="stat"><div class="stat__n">' + num(t.done) + '</div><div class="stat__l">Câu bạn đã làm</div></div>' +
            '<div class="stat"><div class="stat__n">' + t.total + '</div><div class="stat__l">Tổng số câu</div></div>' +
            '<div class="stat"><div class="stat__n">' + num(t.setsDone) + '</div><div class="stat__l">Bộ đã xong</div></div>' +
          '</div>' +
          '<div class="map">' + rows + '</div>'
        : '<div class="empty">' + ICON('listChecks') +
            '<h2>Chưa có bộ bài tập nào</h2>' +
            '<p>Bài tập được soạn cùng nhịp với bài học.</p>' +
            '<a class="btn btn--primary" href="#/">' + ICON('arrowLeft') + 'Về trang chủ</a>' +
          '</div>');

    ICON.hydrate(elContent);
    buildToc([]);
    refreshSidebar(null);
    document.title = 'Bài tập — Học Embedded Linux';
  }

  /* ---------- Tương tác trong một bộ bài tập ----------
     Uỷ quyền sự kiện, vì nội dung được dựng lại mỗi lần đổi trang. Trả về
     true nếu đã xử lý, để listener chung của #content dừng lại ở đó và không
     rơi vào nhánh quiz (quiz và bài tập dùng chung class .q__opt). */
  function handleExClick(e) {
    if (!currentEx) { return false; }
    var art = e.target.closest('.exi');
    if (!art) { return false; }

    var item = exItemOf(art);
    if (!item) { return false; }
    var kind = art.dataset.k;

    /* --- Chọn phương án --- */
    var opt = e.target.closest('.q__opt');
    if (opt && !opt.disabled) {
      if (blocked()) { return true; }
      var oi = parseInt(opt.dataset.opt, 10);

      if (kind === 'multi') {
        // Chọn nhiều: bật/tắt, chưa chấm gì cả cho tới khi bấm Kiểm tra
        opt.classList.toggle('is-sel');
        var sel = $$('.q__opt.is-sel', art).map(function (b) {
          return parseInt(b.dataset.opt, 10);
        });
        writeExItem(art, item.id, { sel: sel }, 'lựa chọn của câu này');
        return true;
      }

      // mcq và nửa đầu của tf: chấm ngay
      writeExItem(art, item.id, { p: oi }, 'đáp án của câu này');
      $$('.q__opt', art).forEach(function (b, idx) {
        b.disabled = true;
        if (idx === item.a)   { b.classList.add('is-right'); }
        else if (idx === oi)  { b.classList.add('is-wrong'); }
      });
      showWhy(art, oi === item.a ? 'Chính xác. ' : 'Chưa đúng. ');
      paintExDot(art);
      paintExProgress();
      return true;
    }

    /* --- Kiểm tra (multi / fill / num / match) --- */
    if (e.target.closest('[data-act="check"]')) {
      if (blocked()) { return true; }
      checkItem(art, item, kind);
      return true;
    }

    /* --- Mở/đóng gợi ý, tiêu chí, lời giải ---
       Cố tình KHÔNG lưu trạng thái mở: tải lại trang là đóng hết
       (CLAUDE.md §13.1). Chỉ câu trả lời và điểm tự chấm mới được giữ. */
    var act = e.target.closest('[data-act]');
    if (act) {
      var name = act.dataset.act;
      var panel = $('[data-panel="' + name + '"]', art);
      if (panel) { panel.hidden = !panel.hidden; }
      return true;
    }

    return false;
  }

  function checkItem(art, item, kind) {
    var ok, i;

    if (kind === 'multi') {
      var sel = $$('.q__opt.is-sel', art).map(function (b) { return parseInt(b.dataset.opt, 10); });
      if (!sel.length) { return; }
      ok = RenderEx.gradeMulti(item, sel);
      writeExItem(art, item.id, { sel: sel, ok: ok ? 1 : 0 }, 'kết quả câu này');
      $$('.q__opt', art).forEach(function (b, idx) {
        b.disabled = true;
        b.classList.remove('is-sel');
        if (item.a.indexOf(idx) >= 0)   { b.classList.add('is-right'); }
        else if (sel.indexOf(idx) >= 0) { b.classList.add('is-wrong'); }
      });
      showWhy(art, ok ? 'Chính xác. ' : 'Chưa đủ hoặc chưa đúng. ');

    } else if (kind === 'fill' || kind === 'num') {
      var input = $('[data-in]', art);
      var v = input.value;
      if (!String(v).trim()) { return; }
      ok = (kind === 'fill') ? RenderEx.gradeFill(item, v) : RenderEx.gradeNum(item, v);
      writeExItem(art, item.id, { v: v, ok: ok ? 1 : 0 }, 'kết quả câu này');
      var wrap = input.closest('.exin');
      wrap.classList.toggle('is-right', ok);
      wrap.classList.toggle('is-wrong', !ok);
      // Sai thì nói luôn đáp án đúng: ô này vẫn sửa được, người học gõ lại
      // rồi bấm Kiểm tra lần nữa — không có gì để giấu ở đây.
      showWhy(art, ok
        ? 'Chính xác. '
        : 'Chưa đúng — đáp án: ' + (kind === 'fill' ? item.a[0] : item.a) + '. ');

    } else if (kind === 'match') {
      var sels = $$('[data-sel]', art);
      var m = sels.map(function (s) { return s.value === '' ? null : parseInt(s.value, 10); });
      for (i = 0; i < m.length; i++) {
        if (m[i] === null) { return; }              // chưa chọn đủ thì chưa chấm
      }
      var marks = RenderEx.gradeMatch(item, m);
      ok = marks.every(Boolean);
      writeExItem(art, item.id, { m: m, ok: ok ? 1 : 0 }, 'kết quả câu này');
      $$('.exm__row', art).forEach(function (row, idx) {
        row.classList.toggle('is-right', marks[idx]);
        row.classList.toggle('is-wrong', !marks[idx]);
        $('[data-sel]', row).disabled = true;
        if (!marks[idx]) {
          var fix = document.createElement('span');
          fix.className = 'exm__fix';
          fix.innerHTML = 'đúng là <b>' + 'ABCDEFGH'.charAt(item.a[idx]) + '</b>';
          $('.exm__pick', row).appendChild(fix);
        }
      });
      showWhy(art, ok ? 'Chính xác cả ' + m.length + ' cặp. '
                      : 'Đúng ' + marks.filter(Boolean).length + '/' + m.length + ' cặp. ');
    } else {
      return;
    }

    paintExDot(art);
    paintExProgress();
  }

  /* Gõ vào ô tự luận. Đây là chỗ DUY NHẤT không hoàn tác khi ghi hỏng: xoá
     một đoạn người học vừa viết ra chỉ vì mạng chập là thiệt hại lớn hơn
     nhiều so với việc để họ tự bấm lại. Nên ở đây chỉ báo trạng thái, và cứ
     gõ tiếp là thử ghi lại.

     Gộp phím trong TA_DEBOUNCE ms, một hẹn giờ cho MỖI câu — dùng chung một
     hẹn giờ sẽ khiến chuyển sang ô khác giữa chừng làm mất lần ghi của ô cũ. */
  elContent.addEventListener('input', function (e) {
    if (!currentEx) { return; }
    var ta = e.target.closest('[data-ta]');
    if (!ta) { return; }
    var art = ta.closest('.exi');
    var item = exItemOf(art);
    if (!item) { return; }

    syncFreeLock(art);

    if (!Store.ready()) {
      setSaveTag(art, 'Chưa nối được máy chủ — chưa lưu', 'is-bad');
      return;
    }
    setSaveTag(art, 'Đang lưu…', 'is-wait');

    var id = item.id;
    var value = ta.value;
    clearTimeout(taTimers[id]);
    taTimers[id] = setTimeout(function () {
      Store.setExItem(currentEx, id, { txt: value }).then(function (ok) {
        setSaveTag(art, ok ? 'Đã lưu' : 'Chưa lưu được — gõ tiếp để thử lại',
                        ok ? 'is-ok' : 'is-bad');
        paintExDot(art);
        paintExProgress();
      });
    }, TA_DEBOUNCE);
  });

  /* Tick một ý trong bảng tiêu chí tự chấm. */
  elContent.addEventListener('change', function (e) {
    if (!currentEx) { return; }
    var box = e.target.closest('[data-ck]');
    if (!box) { return; }
    var art = box.closest('.exi');
    var item = exItemOf(art);
    if (!item) { return; }

    /* Chưa có chỗ ghi thì trả ô tick về ngay tại đây — nếu để nó tick rồi mới
       báo, người học sẽ tưởng điểm tự chấm đã được ghi nhận. */
    if (!Store.ready()) { box.checked = !box.checked; blocked(); return; }

    var ck = $$('[data-ck]', art)
      .filter(function (b) { return b.checked; })
      .map(function (b) { return parseInt(b.dataset.ck, 10); });
    writeExItem(art, item.id, { ck: ck }, 'phần tự chấm của câu này');

    $$('.exck', art).forEach(function (l) {
      l.classList.toggle('is-on', $('input', l).checked);
    });
    var score = $('[data-score]', art);
    if (score) { score.textContent = ck.length + '/' + (item.crit || []).length + ' ý'; }
  });

  /* Vẽ lại riêng khối tự kiểm tra. outerHTML chứ không innerHTML cả trang:
     người học có thể đang đọc ở đoạn 40, dựng lại cả bài sẽ ném họ về đầu. */
  function repaintQuiz() {
    var box = $('.quiz', elContent);
    var data = currentId && Lesson.get(currentId);
    if (!box || !data || !data.quiz) { return; }
    box.outerHTML = Render.quiz(data.quiz, data.id);
    ICON.hydrate(elContent);
    updateQuizScore();
  }

  /* ══════════════════════════════════════════════════
     DỮ LIỆU VỪA VỀ TỪ MÁY CHỦ
     Store đã bị ghi đè xong; ở đây chỉ đồng bộ lại những chỗ trên màn hình
     đang hiển thị dữ liệu cũ.
     ══════════════════════════════════════════════════ */
  function applyRemoteToUi() {
    syncLock();

    /* Vừa có dữ liệu (hoặc vừa mất) thì phải dựng lại cả trang, vì mọi con số
       đang hiển thị đều thuộc về trạng thái kia: trước khi có dữ liệu chúng là
       dấu gạch và số 0 giả, sau khi mất thì chúng là dữ liệu của người khác.
       Lúc này mọi nút ghi đang bị khoá nên chắc chắn không có gì gõ dở để mất. */
    var now = Store.ready();
    if (now !== hadData) {
      hadData = now;
      rerender();
      return;
    }

    refreshProgress();
    refreshSidebar(currentId);

    /* Trang bài tập: chỉ nhấp lại chấm trạng thái và thanh tiến độ. Nội dung
       bài tập nằm ở subcollection khác và không đi kèm ảnh chụp này. */
    if (currentEx) {
      $$('.exi', elContent).forEach(paintExDot);
      paintExProgress();
      return;
    }
    if (!currentId) { rerender(); return; }

    paintDoneBar(currentId);
    repaintQuiz();
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

    var saved = Store.getQuiz(lessonId, data.quiz.length);
    var answered = Object.keys(saved).length;
    var right = 0;
    data.quiz.forEach(function (q, i) {
      if (saved[String(i)] === q.a) { right++; }
    });

    var el = $('[data-score]', box);
    el.textContent = answered ? ('Đúng ' + right + '/' + data.quiz.length) : '';
  }

  elContent.addEventListener('click', function (e) {

    /* --- Bài tập: phải đứng trước nhánh quiz, vì hai bên dùng chung .q__opt --- */
    if (handleExClick(e)) { return; }

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
      if (blocked()) { return; }
      var qBox = opt.closest('.q');
      var quizBox = opt.closest('.quiz');
      var lessonId = quizBox.dataset.quiz;
      var qi = parseInt(qBox.dataset.qi, 10);
      var oi = parseInt(opt.dataset.o, 10);
      var data = Lesson.get(lessonId);
      var correct = data.quiz[qi].a;

      /* Hoàn tác ở đây là dựng lại cả khối tự kiểm tra chứ không riêng một
         câu: đáp án đã lưu của các câu khác nằm trong Store, nên dựng lại là
         khôi phục đúng, và số "Đúng n/m" phía trên cũng được tính lại. */
      Store.setQuizAnswer(lessonId, qi, oi, data.quiz.length).then(function (ok) {
        if (ok) { return; }
        repaintQuiz();
        Toast.writeFailed('đáp án câu ' + (qi + 1));
      });

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
  /* Hash có thể mang thêm một neo sau dấu # thứ hai: `#/bai-01#bon-manh-ghep`.
     Bảng tra ở phần F của bài tập cần đúng thứ đó — trỏ thẳng vào MỤC phải
     đọc lại, chứ không phải vào đầu bài rồi bảo người học tự tìm. */
  var VIEW_RE = /^(bai|bt)-\d+$/;

  function parseHash() {
    var raw = location.hash.replace(/^#\/?/, '').trim();
    var cut = raw.indexOf('#');
    return {
      h:      cut >= 0 ? raw.slice(0, cut) : raw,
      anchor: cut >= 0 ? raw.slice(cut + 1) : ''
    };
  }

  function renderView(h) {
    if (!h)                          { viewHome(); }
    else if (h === 'bai-tap')        { viewExIndex(); }
    else if (h.indexOf('bt-') === 0) { viewExercise(h); }
    else                             { viewLesson(h); }
    refreshProgress();
  }

  /* Dựng lại trang đang xem mà KHÔNG nhảy về đầu. Dùng khi dữ liệu từ máy chủ
     vừa về hoặc vừa mất — trang phải đổi số, nhưng người học không được bị
     kéo khỏi đoạn đang đọc. */
  function rerender() {
    var y = window.scrollY;
    renderView(parseHash().h);
    window.scrollTo({ top: y, behavior: 'auto' });
  }

  function route() {
    var p = parseHash();

    // Neo trong trang (#ten-muc) — để trình duyệt tự xử lý, không đổi view
    if (p.h && !VIEW_RE.test(p.h) && p.h !== 'bai-tap') {
      if (document.getElementById(p.h)) { return; }
    }

    elResults.hidden = true;
    renderView(p.h);

    var target = p.anchor ? document.getElementById(p.anchor) : null;
    if (target) { target.scrollIntoView({ block: 'start' }); }
    else        { window.scrollTo({ top: 0, behavior: 'auto' }); }
    $('#main').focus({ preventScroll: true });
  }

  /* ══════════════════════════════════════════════════
     KHỞI ĐỘNG
     ══════════════════════════════════════════════════ */
  function init() {
    Store.setTheme(Store.getTheme());
    ICON.hydrate(document);

    document.body.classList.toggle('sidebar-collapsed', Store.getSidebarCollapsed());
    syncSidebarButton();

    $('#btnTheme').addEventListener('click', function () { Store.toggleTheme(); });
    $('#btnSidebar').addEventListener('click', function () {
      if (isDrawer()) {
        elSidebar.classList.contains('is-open') ? closeSidebar() : openSidebar();
      } else {
        setSidebarCollapsed(!document.body.classList.contains('sidebar-collapsed'));
      }
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
      syncSidebarButton();
    });

    buildSidebar();
    Search.build();
    wireSearch();

    syncLock();
    window.addEventListener('hashchange', route);
    route();

    /* Đồng bộ được bật SAU khi trang đã vẽ xong: nếu Firebase chậm hay chết,
       người học vẫn ĐỌC được bài ngay lập tức. Chỉ các nút ghi là bị khoá cho
       tới khi có dữ liệu thật — không bao giờ hiện một con số đoán bừa
       (CLAUDE.md §14). */
    Cloud.onRemote(applyRemoteToUi);
    Cloud.onState(syncLock);
    Account.init();
    Cloud.init();

    if (!Store.persistent) {
      console.warn('[app] Trình duyệt chặn localStorage — giao diện sáng/tối và tên ' +
        'người dùng sẽ không được nhớ. Tiến độ không ảnh hưởng: nó nằm trên máy chủ.');
    }
    console.log('[app] Sẵn sàng. ' + Course.readyCount() + '/' + Course.total() + ' bài đã có nội dung.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
