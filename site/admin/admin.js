/* Lughati admin panel (web). Talks only to the `ai-gateway` Edge Function with `{ admin: <action> }`;
   the server checks app_metadata.role === 'admin' on every call. Everything shown from the server is
   written with textContent (never innerHTML), and the token lives in sessionStorage (cleared with the tab). */
(function () {
  'use strict';

  var CFG = window.LUGHATI_ADMIN || {};
  var URL_BASE = String(CFG.url || '').replace(/\/+$/, '');
  var TASKS = ['tutor', 'speaking', 'writing', 'quiz', 'pronunciation', 'planner'];
  var TABS = [
    ['overview', 'نظرة عامة'],
    ['models', 'النماذج والتوجيه'],
    ['users', 'المستخدمون'],
    ['usage', 'سجل الاستخدام'],
  ];
  var LIMITS = [10, 40, 100];
  var KEY_STORE = 'lughati-admin-anon-key';
  var SESSION_STORE = 'lughati-admin-session';

  var root = document.getElementById('app');
  var state = { tab: 'overview', session: null, notice: '', info: '', page: 1 };

  // ---------- helpers ----------
  function el(tag, props) {
    var node = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k.indexOf('on') === 0) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v === true ? '' : String(v));
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined || c === false) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }
  function ltr(text) {
    return el('bdi', { dir: 'ltr', text: text });
  }
  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }
  function anonKey() {
    var fromConfig = String(CFG.anonKey || '');
    if (fromConfig) return fromConfig;
    try {
      return localStorage.getItem(KEY_STORE) || '';
    } catch (e) {
      return '';
    }
  }
  function saveSession(s) {
    state.session = s;
    try {
      if (s) sessionStorage.setItem(SESSION_STORE, JSON.stringify(s));
      else sessionStorage.removeItem(SESSION_STORE);
    } catch (e) {
      /* session kept in memory only */
    }
  }
  function loadSession() {
    try {
      var raw = sessionStorage.getItem(SESSION_STORE);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  // ---------- network ----------
  function api(path, options) {
    options = options || {};
    var headers = { apikey: anonKey(), 'Content-Type': 'application/json' };
    if (options.token) headers.Authorization = 'Bearer ' + options.token;
    return fetch(URL_BASE + path, { method: options.method || 'POST', headers: headers, body: options.body ? JSON.stringify(options.body) : undefined }).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch (e) {
          data = null;
        }
        if (!res.ok) {
          var err = new Error('http_' + res.status);
          err.status = res.status;
          err.code = data && (data.error || data.error_code || data.msg) ? String(data.error || data.error_code || data.msg) : '';
          throw err;
        }
        return data;
      });
    });
  }
  function signIn(email, password) {
    return api('/auth/v1/token?grant_type=password', { body: { email: email, password: password } }).then(keepTokens);
  }
  function refresh() {
    if (!state.session || !state.session.refresh_token) return Promise.reject(new Error('no_session'));
    return api('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: state.session.refresh_token } }).then(keepTokens);
  }
  function keepTokens(data) {
    saveSession({ access_token: data.access_token, refresh_token: data.refresh_token });
    return data;
  }
  function admin(body) {
    function send() {
      return api('/functions/v1/ai-gateway', { token: state.session && state.session.access_token, body: body });
    }
    return send().catch(function (err) {
      if (err.status !== 401) throw err;
      return refresh().then(send);
    });
  }
  function explain(err) {
    var code = err && err.code;
    if (code === 'cannot_enable_unverified') return 'غير مسموح: يلزم سعر معروف وتوثيق قبل تفعيل النموذج.';
    if (code === 'cannot_ban_self') return 'لا يمكنك حظر حسابك أنت.';
    if (err && (err.status === 401 || err.status === 403)) return 'هذا الحساب ليس مشرفاً أو انتهت الجلسة.';
    if (err && err.status === 400) return 'رفض الخادم هذا التغيير.';
    if (err && err.status === 503) return 'مزوّد الذكاء الاصطناعي غير مُهيّأ على الخادم.';
    if (err && err.name === 'TypeError') return 'لا يوجد اتصال بالخادم.';
    return 'فشل الطلب. حاول مرة أخرى.';
  }
  function act(change) {
    state.notice = '';
    return change().then(
      function () {
        render();
      },
      function (err) {
        state.notice = explain(err);
        render();
      },
    );
  }

  // ---------- widgets ----------
  function button(label, onClick, kind) {
    return el('button', { type: 'button', class: 'btn ' + (kind || ''), onclick: onClick, text: label });
  }
  function chip(label, selected, onClick) {
    return el('button', { type: 'button', class: 'chip' + (selected ? ' on' : ''), 'aria-pressed': selected ? 'true' : 'false', onclick: onClick, text: label });
  }
  function card() {
    var c = el('section', { class: 'card' });
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) c.appendChild(arguments[i]);
    return c;
  }
  function note(text, kind) {
    return text ? el('p', { class: 'note ' + (kind || ''), role: kind === 'err' ? 'alert' : 'status', text: text }) : null;
  }
  function kv(entries) {
    var box = el('div', { class: 'kv' });
    entries.forEach(function (e) {
      box.appendChild(el('div', { class: 'k', text: e[0] }));
      box.appendChild(el('div', { class: 'v' }, typeof e[1] === 'string' ? ltr(e[1]) : String(e[1])));
    });
    return box;
  }
  function append(parent, child) {
    if (child) parent.appendChild(child);
  }
  function loading(host) {
    clear(host);
    host.appendChild(el('p', { class: 'muted', text: 'جارٍ التحميل…' }));
  }
  function failed(host, err, retry) {
    clear(host);
    append(host, note(explain(err), 'err'));
    host.appendChild(button('إعادة المحاولة', retry));
  }

  // ---------- tabs ----------
  function overviewTab(host) {
    loading(host);
    admin({ admin: 'overview' }).then(
      function (o) {
        clear(host);
        host.appendChild(
          card(
            kv([
              ['الحسابات', o.totalUsers],
              ['النشطون (7 أيام)', o.activeUsers7d],
              ['طلبات الذكاء الاصطناعي (24 ساعة)', o.requests24h],
              ['طلبات الذكاء الاصطناعي (7 أيام)', o.requests7d],
            ]),
          ),
        );
        if (o.truncated) append(host, note('حجم كبير: الأرقام تشمل آخر 10000 سجل فقط.'));
        var byFeature = Object.keys(o.byFeature7d || {}).map(function (k) {
          return [k, String(o.byFeature7d[k])];
        });
        var byModel = Object.keys(o.byModel7d || {}).map(function (k) {
          var m = o.byModel7d[k];
          return [k, m.requests + ' (' + m.inputTokens + ' in / ' + m.outputTokens + ' out)'];
        });
        var byStatus = Object.keys(o.byStatus24h || {}).map(function (k) {
          return [k, String(o.byStatus24h[k])];
        });
        [['حسب الميزة (7 أيام)', byFeature], ['حسب النموذج (7 أيام)', byModel], ['النتائج (24 ساعة)', byStatus]].forEach(function (g) {
          if (g[1].length) host.appendChild(card(el('h3', { text: g[0] }), kv(g[1])));
        });
        host.appendChild(button('تحديث', function () { render(); }));
      },
      function (err) {
        failed(host, err, function () { overviewTab(host); });
      },
    );
  }

  function modelsTab(host) {
    loading(host);
    admin({ admin: 'models.list' }).then(
      function (data) {
        clear(host);
        append(host, note(state.notice, 'err'));
        append(host, note(state.info));
        host.appendChild(
          button('فحص التوفّر', function () {
            act(function () {
              return admin({ admin: 'models.refresh' }).then(function (r) {
                state.info = 'المزوّد يعرض ' + (r.listed || []).length + ' نموذجاً. حُدّثت الإتاحة؛ الأسعار والتوثيق لم تتغيّر.';
              });
            });
          }),
        );
        var models = data.models || [];
        var usable = models.filter(function (m) { return m.enabled && m.verifiedAt; });
        var tier = { free: 'مجاني', paid: 'مدفوع', unknown: 'السعر غير معروف' };
        var health = { ok: 'سليم', degraded: 'متدهور', down: 'متوقف', unknown: 'لم يُفحص' };
        models.forEach(function (m) {
          var ready = m.pricingTier !== 'unknown' && !!m.verifiedAt;
          var actions = el('div', { class: 'row' });
          if (!ready) {
            actions.appendChild(
              button('تعليم كمجاني وموثَّق', function () {
                var ok = window.confirm('هل تحققتَ من صفحة المزوّد الرسمية أن «' + m.id + '» موجود حرفياً ومجاني الآن؟');
                if (!ok) return;
                act(function () { return admin({ admin: 'models.upsert', model: { id: m.id, pricingTier: 'free', verified: true } }); });
              }),
            );
          }
          var toggle = button(m.enabled ? 'تعطيل' : 'تفعيل', function () {
            act(function () { return admin({ admin: 'models.upsert', model: { id: m.id, enabled: !m.enabled } }); });
          }, m.enabled ? 'danger' : 'primary');
          if (!m.enabled && !ready) toggle.disabled = true;
          actions.appendChild(toggle);
          host.appendChild(
            card(
              el('h3', {}, ltr(m.id)),
              el('p', { class: 'muted', text: [tier[m.pricingTier], m.verifiedAt ? 'موثَّق' : 'غير موثَّق', health[m.healthStatus], m.enabled ? 'مفعَّل' : 'معطَّل'].join(' · ') }),
              actions,
            ),
          );
        });
        host.appendChild(el('h2', { text: 'التوجيه' }));
        TASKS.forEach(function (task) {
          var route = (data.routing || []).filter(function (r) { return r.task === task; })[0] || {};
          var c = card(el('h3', { text: task }));
          [['primaryModel', 'الأساسي'], ['fallbackModel', 'الاحتياطي']].forEach(function (f) {
            c.appendChild(el('p', { class: 'muted', text: f[1] }));
            var row = el('div', { class: 'row' });
            row.appendChild(chip('بلا', !route[f[0]], function () {
              var route2 = { task: task }; route2[f[0]] = null;
              act(function () { return admin({ admin: 'routing.set', route: route2 }); });
            }));
            usable.forEach(function (m) {
              row.appendChild(chip(m.id, route[f[0]] === m.id, function () {
                var route2 = { task: task }; route2[f[0]] = m.id;
                act(function () { return admin({ admin: 'routing.set', route: route2 }); });
              }));
            });
            c.appendChild(row);
          });
          c.appendChild(chip(route.allowPaid ? 'المدفوع مسموح' : 'المجاني فقط', route.allowPaid === true, function () {
            act(function () { return admin({ admin: 'routing.set', route: { task: task, allowPaid: !route.allowPaid } }); });
          }));
          host.appendChild(c);
        });
      },
      function (err) {
        failed(host, err, function () { modelsTab(host); });
      },
    );
  }

  function usersTab(host) {
    loading(host);
    admin({ admin: 'users.list', page: state.page }).then(
      function (data) {
        clear(host);
        append(host, note(state.notice, 'err'));
        var users = data.users || [];
        if (!users.length) host.appendChild(el('p', { class: 'muted', text: 'لا حسابات.' }));
        users.forEach(function (u) {
          var last = u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString('ar') : 'لم يدخل';
          var limits = el('div', { class: 'row' });
          limits.appendChild(chip('الافتراضي', u.dailyLimit === null, function () {
            act(function () { return admin({ admin: 'users.setLimit', userId: u.id, dailyRequests: null }); });
          }));
          LIMITS.forEach(function (n) {
            limits.appendChild(chip(String(n), u.dailyLimit === n, function () {
              act(function () { return admin({ admin: 'users.setLimit', userId: u.id, dailyRequests: n }); });
            }));
          });
          var c = card(
            el('h3', {}, ltr(u.email || u.id)),
            el('p', { class: 'muted', text: 'آخر دخول: ' + last + ' · الطلبات (24 ساعة): ' + u.requests24h + ' · الحد اليومي: ' + (u.dailyLimit === null ? 'الافتراضي' : u.dailyLimit) }),
            u.isAdmin || u.banned ? el('p', { class: 'badge', text: [u.isAdmin ? 'مشرف' : '', u.banned ? 'محظور' : ''].filter(Boolean).join(' · ') }) : null,
            el('p', { class: 'muted', text: 'الحد اليومي' }),
            limits,
          );
          if (!u.isAdmin) {
            c.appendChild(button(u.banned ? 'إلغاء الحظر' : 'حظر', function () {
              if (!u.banned && !window.confirm('حظر هذا الحساب؟ لن يستطيع صاحبه تسجيل الدخول حتى تلغي الحظر. بياناته تبقى محفوظة.')) return;
              act(function () { return admin({ admin: 'users.setBanned', userId: u.id, banned: !u.banned }); });
            }, u.banned ? '' : 'danger'));
          }
          host.appendChild(c);
        });
        var nav = el('div', { class: 'row' });
        var prev = button('الصفحة السابقة', function () { state.page = Math.max(1, state.page - 1); render(); });
        var next = button('الصفحة التالية', function () { state.page += 1; render(); });
        prev.disabled = state.page <= 1;
        next.disabled = users.length < (data.perPage || 50);
        nav.appendChild(prev);
        nav.appendChild(next);
        host.appendChild(nav);
      },
      function (err) {
        failed(host, err, function () { usersTab(host); });
      },
    );
  }

  function usageTab(host) {
    loading(host);
    admin({ admin: 'usage.recent', limit: 100 }).then(
      function (data) {
        clear(host);
        host.appendChild(button('تحديث', function () { render(); }));
        var rows = data.rows || [];
        if (!rows.length) host.appendChild(el('p', { class: 'muted', text: 'لا طلبات بعد.' }));
        var table = el('table', {}, el('thead', {}, el('tr', {}, el('th', { text: 'الوقت' }), el('th', { text: 'الميزة' }), el('th', { text: 'الحالة' }), el('th', { text: 'النموذج' }), el('th', { text: 'الرموز' }))));
        var body = el('tbody');
        rows.forEach(function (r) {
          body.appendChild(el('tr', {}, el('td', { text: new Date(r.createdAt).toLocaleString('ar') }), el('td', { text: r.feature }), el('td', { text: r.status + (r.errorCode ? ' (' + r.errorCode + ')' : '') }), el('td', {}, ltr(r.modelId || '-')), el('td', { text: r.inputTokens + '/' + r.outputTokens })));
        });
        table.appendChild(body);
        host.appendChild(el('div', { class: 'scroll' }, table));
      },
      function (err) {
        failed(host, err, function () { usageTab(host); });
      },
    );
  }

  // ---------- screens ----------
  function loginScreen() {
    clear(root);
    var email = el('input', { type: 'email', autocomplete: 'username', required: true, id: 'email' });
    var password = el('input', { type: 'password', autocomplete: 'current-password', required: true, id: 'password' });
    var keyInput = anonKey() ? null : el('input', { type: 'text', id: 'key', autocomplete: 'off', placeholder: 'sb_publishable_… أو eyJ…' });
    var errorBox = el('div');
    var form = el(
      'form',
      {
        class: 'card login',
        onsubmit: function (e) {
          e.preventDefault();
          if (keyInput) {
            try { localStorage.setItem(KEY_STORE, keyInput.value.trim()); } catch (err) { /* not persisted */ }
            CFG.anonKey = keyInput.value.trim();
          }
          clear(errorBox);
          signIn(email.value.trim(), password.value).then(
            function () {
              password.value = '';
              checkAdmin();
            },
            function (err) {
              errorBox.appendChild(note(err.status === 400 ? 'البريد أو كلمة المرور غير صحيحة.' : explain(err), 'err'));
            },
          );
        },
      },
      el('h1', { text: 'لوحة تحكم لغتي' }),
      el('label', { for: 'email', text: 'البريد الإلكتروني' }),
      email,
      el('label', { for: 'password', text: 'كلمة المرور' }),
      password,
      keyInput ? el('label', { for: 'key', text: 'المفتاح العام (anon / publishable) للمشروع. هو مفتاح عام وليس سراً.' }) : null,
      keyInput,
      errorBox,
      el('button', { type: 'submit', class: 'btn primary', text: 'دخول' }),
    );
    root.appendChild(form);
  }

  function checkAdmin() {
    admin({ admin: 'whoami' }).then(
      function () { render(); },
      function (err) {
        saveSession(null);
        loginScreen();
        if (err.status === 401 || err.status === 403) append(root.querySelector("form"), note('هذا الحساب ليس مشرفاً.', 'err'));
      },
    );
  }

  function render() {
    if (!state.session) return loginScreen();
    clear(root);
    var nav = el('nav', { class: 'row tabs', 'aria-label': 'الأقسام' });
    TABS.forEach(function (t) {
      nav.appendChild(chip(t[1], state.tab === t[0], function () { state.tab = t[0]; state.notice = ''; state.info = ''; render(); }));
    });
    var host = el('main', { class: 'host' });
    root.appendChild(el('header', { class: 'top' }, el('h1', { text: 'لوحة تحكم لغتي' }), button('خروج', function () { saveSession(null); render(); })));
    root.appendChild(nav);
    root.appendChild(host);
    ({ overview: overviewTab, models: modelsTab, users: usersTab, usage: usageTab })[state.tab](host);
  }

  state.session = loadSession();
  if (!URL_BASE) {
    root.appendChild(note('لم يُضبط عنوان المشروع في config.js.', 'err'));
  } else if (state.session) {
    checkAdmin();
  } else {
    render();
  }
})();
