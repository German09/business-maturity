// Общий расчёт карты (index.html) и дорожной карты (roadmap.html): связи практик, роли, ответы в браузере, этап и шаги пути
(function () {
  var LEVELS = BM.LEVELS, QS = BM.QS, LS = BM.LS, TOOLS = BM.TOOLS, USE = BM.USE;
  var MAXL = LEVELS.length - 1;
  var P = BM.plan = {};

  var UNLOCK = 0.5;
  var BYID = {};
  QS.forEach(function (q) { BYID[q.id] = q; q.needed = []; });
  // Зависимость: обычный пункт — выполнен хотя бы на 50%, пошаговый — дошёл до шага at
  // Вехи: значения ползунка, после которых пункт открывает другие практики
  // У шага пошагового пункта могут быть свои требования (req): шаг недоступен, пока они не выполнены
  QS.forEach(function (q) { q.unl = []; q.miles = []; });
  function normDep(d, q, step) {
    var o = typeof d === "string" ? { id: d } : { id: d.id, at: d.at }, src = BYID[o.id];
    o.min = src.steps ? o.at / (src.steps.length - 1) : UNLOCK;
    if (src.needed.indexOf(q.id) < 0) src.needed.push(q.id);
    src.unl.push({ id: q.id, min: o.min, at: o.at, step: step });
    if (src.miles.indexOf(o.min) < 0) src.miles.push(o.min);
    return o;
  }
  QS.forEach(function (q) {
    q.deps = q.deps.map(function (d) { return normDep(d, q); });
    (q.steps || []).forEach(function (st, k) {
      st.req = (st.req || []).map(function (d) { return normDep(d, q, k); });
    });
  });
  QS.forEach(function (q) { q.miles.sort(function (a, b) { return a - b; }); });

  // Инструменты практики — её собственные и все инструменты шагов; cov — какие практики закрывает инструмент
  var TIDS = Object.keys(TOOLS);
  TIDS.forEach(function (k) { TOOLS[k].cov = []; });
  QS.forEach(function (q) {
    var u = USE[q.id] || [], own = Array.isArray(u) ? u : (u.q || []);
    q.tools = own.slice();
    (q.steps || []).forEach(function (st, k) {
      st.tools = Array.isArray(u) ? [] : (u[k] || []);
      st.tools.forEach(function (t) { if (q.tools.indexOf(t) < 0) q.tools.push(t); });
    });
    q.tools.forEach(function (t) { TOOLS[t].cov.push(q.id); });
  });

  // Номер пункта: этап.порядковый номер внутри этапа
  for (var lvN = 1; lvN <= MAXL; lvN++) {
    QS.filter(function (q) { return q.lv === lvN; }).forEach(function (q, i) { q.idx = i + 1; q.num = lvN + "." + (i + 1); });
  }

  var SAMPLE = {
    answers: { trk: 1, kb: 0.6, repo: 1, repotask: 0.6, accept: 0.25, devdb: 0.5, testdb: 1, cfgdev: 1, rel: 0.7,
               edt: 0.2, build: 0.25, lint: 0, deliver: 0, rollout: 0.25, protect: 0.25,
               review: 0.4, sonar: 0, tests: 0, errpipe: 0, erruser: 0.25, aiint: 0.17, aisec: 0.2, aiproc: 0, spec: 0, effect: 0.25, aisupport: 0, archctl: 0, aikb: 0.34, aiassist: 0.34, aitests: 0, users: 0, mcpbiz: 0, reqfilter: 0 },
    roles: { lead: "sep", analyst: "lead", tester: "analyst", devops: "lead", support: "sep", rm: "lead" },
    hours: 1200, target: 7, sample: true
  };
  // Роль либо закрыта отдельным человеком, либо её совмещает другая роль. Кто кого может заменить — by:
  // разработчик может взять на себя работу аналитика, а аналитик разработчика — нет. Значение в by —
  // насколько замена слабая: 0 — обычная, 1 — слабая (больше надбавка к сроку). step — надбавка к шагам
  // дорожной карты [обычная замена, слабая]. Разработчик в команде есть всегда, поэтому сам в списке не выбирается
  var ROLES = [
    { id: "lead", l: "Ведущий разработчик, архитектор", sh: "ведущий", h: "проектирует решения, ведёт переход и ИИ-разработку",
      by: { dev: 1 }, step: { 4: [0.15, 0.3], 5: [0.1, 0.2] } },
    { id: "analyst", l: "Аналитик", sh: "аналитик", h: "постановки и критерии приёмки",
      by: { lead: 0, rm: 0, dev: 1 }, step: { 1: [0.1, 0.2], 3: [0.1, 0.2] } },
    { id: "tester", l: "Тестировщик", sh: "тестировщик", h: "тестирование, автотесты, приёмка",
      by: { analyst: 0, support: 0, lead: 1, dev: 1 }, step: { 3: [0.2, 0.35] } },
    { id: "devops", l: "Инженер сборки и выкладки", sh: "инженер сборки", h: "конвейер, стенды, выкладка релизов",
      by: { lead: 0, dev: 1 }, step: { 2: [0.15, 0.3] } },
    { id: "support", l: "Поддержка пользователей", sh: "поддержка", h: "обращения и разбор ошибок",
      by: { analyst: 0, tester: 0, dev: 1 }, step: { 5: [0.1, 0.15] } },
    { id: "rm", l: "Руководитель или релиз-менеджер", sh: "руководитель", h: "приоритеты, релизы, согласование выкладки",
      by: { lead: 0, analyst: 0 }, step: { 2: [0.05, 0.15], 3: [0.05, 0.1] } }
  ];
  var ROLE_BY_ID = { dev: { id: "dev", sh: "разработчик" } };
  ROLES.forEach(function (r) { ROLE_BY_ID[r.id] = r; });
  var PERSON = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5" r="3" fill="currentColor"/><path d="M2 15c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5z" fill="currentColor"/></svg>';
  function roleOf(id) { var v = (P.state.roles || {})[id]; return v && (v === "sep" || ROLE_BY_ID[v]) ? v : "sep"; }
  // Кто в итоге выполняет роль: идём по цепочке совмещений до отдельного человека или разработчика
  function roleFinal(id) {
    var seen = {}, cur = id;
    while (cur !== "dev" && roleOf(cur) !== "sep") {
      if (seen[cur]) return "dev";
      seen[cur] = 1;
      cur = roleOf(cur);
    }
    return cur;
  }
  function roleText(id) {
    var v = roleOf(id);
    return v === "sep" ? "отдельный человек" : "совмещает " + ROLE_BY_ID[v].sh;
  }
  // Объём команды в часах в месяц: от него зависит, сколько длится раскатка практик на всех
  function volumeFactor(h) { return !h ? 1 : h <= 500 ? 0.8 : h <= 1500 ? 1 : h <= 4000 ? 1.3 : 1.6; }
  var THRESHOLD = 0.75;
  // Баланс: какая часть возможного эффекта от ИИ уже задействована и насколько команда это контролирует.
  // Рычаги — откуда берётся эффект: каждая практика ИИ работает на один из них
  var LEVERS = [
    { key: "dev", n: "быстрее разработка", ids: ["aikb", "aiassist", "aitests", "aiint"] },
    { key: "sup", n: "дешевле поддержка", ids: ["aisupport"] },
    { key: "req", n: "меньше лишних доработок", ids: ["users", "mcpbiz", "reqfilter"] }
  ];
  var APPLY = LEVERS.reduce(function (a, l) { return a.concat(l.ids); }, []);
  var CONTROL = ["repo", "repotask", "rel", "lint", "protect", "review", "sonar", "tests", "aisec", "aiproc", "spec", "archctl"];
  var BALANCE_GAP = 15;
  function share(ids, eff) {
    var w = 0, v = 0;
    ids.forEach(function (id) { var q = BYID[id]; w += q.w; v += q.w * (eff[id] || 0); });
    return Math.round(v / w * 100);
  }
  // Вклад рычагов в эффект от ИИ, в пунктах шкалы: v — точно, для ширины сегмента, n — целое для подписи.
  // Подписи в сумме дают share(APPLY, eff): расхождение от округления уходит в самый большой вклад
  function leverShares(eff) {
    var w = 0;
    APPLY.forEach(function (id) { w += BYID[id].w; });
    var out = LEVERS.map(function (l) {
      var v = 0;
      l.ids.forEach(function (id) { v += BYID[id].w * (eff[id] || 0); });
      v = v / w * 100;
      return { key: l.key, name: l.n, v: v, n: Math.round(v) };
    });
    var rest = share(APPLY, eff) - out.reduce(function (s, l) { return s + l.n; }, 0);
    if (rest) out.reduce(function (a, b) { return b.v > a.v ? b : a; }).n += rest;
    return out;
  }
  var KEY = "maturity-1c-v26", OLD_KEY = "maturity-1c-v25";
  // Версия модели в файле анкеты. 2 — статический анализ ушёл из 4.2 в отдельную практику 5.2 «Анализ качества кода»:
  // прежний шаг 4.2.3 становится последним шагом 5.2. Автотесты стали пошаговыми, ползунок округляется до шага
  var MODEL_VERSION = 2;
  function migrate(answers, from) {
    if (from < 2 && answers.lint) {
      var k = Math.round(answers.lint * 3);
      answers.lint = Math.min(k, 2) / 2;
      if (k === 3 && !answers.sonar) answers.sonar = 1;
    }
    return answers;
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  // Ответы общие для страниц: читаем при открытии и когда их поменяли на другой странице
  function load() {
    var s = clone(SAMPLE);
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!saved) {
        saved = JSON.parse(localStorage.getItem(OLD_KEY) || "null");
        if (saved && saved.answers) migrate(saved.answers, 1);
      }
      if (saved && saved.answers) s = saved;
    } catch (e) {}
    P.state = s;
  }
  load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P.state)); } catch (e) {} }
  // cb — перерисовать страницу: ответы поменяли в другой вкладке или на другой странице, а браузер вернул эту из кэша кнопкой «Назад»
  function onOutsideChange(cb) {
    var again = function () { load(); cb(); };
    window.addEventListener("storage", function (e) { if (e.key === KEY) again(); });
    window.addEventListener("pageshow", function (e) { if (e.persisted) again(); });
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pct(v) { return Math.round(v * 100) + "%"; }
  // Ссылка на пункт: номер + краткое имя. Ведёт на анкету; на самой карте клик перехватывается и прокручивает к пункту
  function ref(id, step, short) {
    var q = BYID[id];
    var label = short ? "" : " " + esc(q.s);
    return '<a class="ref" href="index.html#q-' + id + '" data-ref="' + id + '"><b>' + q.num + (step !== undefined ? " · шаг " + step : "") + '</b>' + label + '</a>';
  }
  function names(ids) { return ids.map(function (id) { return ref(id); }).join(", "); }
  function toolA(t) {
    return '<a class="tool" href="' + (t.site || t.u || LS + t.ls) + '" target="_blank" rel="noopener">' + esc(t.n) + '</a>';
  }
  function toolLinks(ids) { return ids.map(function (id) { return toolA(TOOLS[id]); }).join(", "); }
  function stepIndex(q, v) { return Math.round(v * (q.steps.length - 1)); }
  function unmet(list, eff) { return list.filter(function (d) { return !(eff[d.id] >= d.min - 1e-9); }); }

  // ── Расчёт ──
  function compute() {
    // Текущее состояние засчитывается так, как отмечено: процессы в проектах гибче модели.
    // Требования не блокируют ответ, а только подсвечиваются (miss, stepMiss) и попадают в дорожную карту
    var eff = {}, miss = {}, stepMiss = {};
    QS.forEach(function (q) {
      var raw = P.state.answers[q.id] || 0;
      eff[q.id] = q.steps ? stepIndex(q, raw) / (q.steps.length - 1) : raw;
    });
    // Требование шага может ссылаться на пункт ниже по списку, поэтому проверяем после расчёта всех ответов
    QS.forEach(function (q) {
      miss[q.id] = eff[q.id] > 0 ? unmet(q.deps, eff) : [];
      if (!q.steps) return;
      stepMiss[q.id] = {};
      for (var k = 1; k <= stepIndex(q, eff[q.id]); k++) {
        var m = unmet(q.steps[k].req, eff);
        if (m.length) stepMiss[q.id][k] = m;
      }
    });

    // Баллы взвешены: вес практики — её доля в общей зрелости (сумма весов 100)
    var score = {}, pts = {}, lw = {}, index = 0, sub = { a: [], b: [] };
    for (var l = 1; l <= MAXL; l++) {
      pts[l] = 0; lw[l] = 0;
      QS.filter(function (q) { return q.lv === l; }).forEach(function (q) {
        pts[l] += q.w * eff[q.id]; lw[l] += q.w;
        if (q.part) sub[q.part].push({ w: q.w, a: eff[q.id] });
      });
      score[l] = pts[l] / lw[l];
      index += pts[l];
    }
    function avg(a) {
      var sw = 0, s = 0;
      a.forEach(function (x) { sw += x.w; s += x.w * x.a; });
      return s / sw;
    }
    var current = 0;
    for (var k = 1; k <= MAXL; k++) { if (score[k] >= THRESHOLD && current === k - 1) current = k; }
    var target = Number(P.state.target);
    var m = volumeFactor(Number(P.state.hours) || 0);
    var roles = P.state.roles || {};
    // Надбавка к шагу из-за ролей и пояснение к ней
    var roleAdd = function (n) {
      var add = 0, why = [];
      ROLES.forEach(function (r) {
        if (roleOf(r.id) === "sep" || !r.step[n]) return;
        var fin = roleFinal(r.id), k = r.by[fin] === 0 ? 0 : 1;
        add += r.step[n][k];
        why.push(r.sh + " — " + roleText(r.id));
      });
      return { f: 1 + add, why: why };
    };
    var g = function (s) { return 0.4 + 0.6 * (1 - s); };

    // Пошаговый пункт даёт по задаче на каждый невыполненный шаг
    var gaps = function (pred) {
      var out = [];
      QS.filter(pred).filter(function (q) { return eff[q.id] < 1; }).forEach(function (q) {
        if (q.steps) {
          for (var i = stepIndex(q, eff[q.id]) + 1; i < q.steps.length; i++) out.push({ text: q.steps[i].t, lv: q.lv, id: q.id, step: i });
        } else {
          out.push({ text: q.t, done: eff[q.id], lv: q.lv, id: q.id });
        }
      });
      return out;
    };

    var steps = [];
    if (target > current) {
      var tails = gaps(function (q) { return q.lv <= current; });
      steps.push({
        n: 1, title: "Аудит и целевая модель", min: 2, max: 4, firm: true,
        ai: "разбирает конфигурацию, историю задач и коммитов и готовит черновик карты",
        about: "Изучаем команду, процесс, среды и инструменты, фиксируем текущий этап и правила работы с данными. На выходе целевая модель и приоритизированная дорожная карта.",
        tasks: [{ text: "Оценить структуру команды, роли, жизненный цикл разработки и инструменты" },
                { text: "Определить, какие данные и каким моделям компания готова доверить" },
                { text: "Согласовать целевую модель и план вложений по этапам" }]
          .concat(tails.map(function (t) { return { text: "Закрыть хвосты: " + lowerFirst(t.text), tail: true, done: t.done, lv: t.lv, id: t.id, step: t.step }; }))
      });

      var prepLv = [];
      for (var p = current + 1; p <= Math.min(4, target); p++) prepLv.push(p);
      if (prepLv.length) {
        var base = { 1: [1, 2], 2: [1, 2], 3: [2, 3], 4: [2, 4] }, pmin = 0, pmax = 0;
        prepLv.forEach(function (p) { pmin += base[p][0] * g(score[p]); pmax += base[p][1] * g(score[p]); });
        steps.push({
          n: 2, title: "Подготовка базы", min: pmin, max: pmax, firm: false,
          ai: "пишет черновики постановок и статей базы знаний, скрипты сборки и проверки, помогает переносить код из данных и расширений в конфигурацию",
          about: "Заводим базовые инструменты и вводим правила: базы разработчиков создаются из шаблонной, общая тестовая база подключена к тестовому контуру. Переводим первых разработчиков в 1С:EDT и Git, настраиваем первый конвейер. Строим на инструментах, которые уже есть у команды.",
          tasks: gaps(function (q) { return prepLv.indexOf(q.lv) >= 0; })
            .concat(roleOf("devops") === "sep" ? [] : [{ text: "Назначить ответственного за конвейер сборки и выкладки" }])
        });
      }

      if (target >= 5 && current < 5) {
        steps.push({
          n: 3, title: "Проверка на реальных задачах", min: 4 * g(score[5]) * m, max: 8 * g(score[5]) * m,
          ai: "пишет черновики автотестов по критериям приёмки и делает предварительное ревью изменений",
          about: "Запускаем новый процесс на текущих задачах, например на очередном релизе. Каждое изменение проходит ревью, анализ кода, автотесты и приёмку заказчиком до выпуска.",
          tasks: gaps(function (q) { return q.lv === 5; })
            .concat(roleOf("tester") === "sep" ? [] : [{ text: "Определить, кто отвечает за тестирование и приёмку, и заложить это в его загрузку" }])
        });
      } else if (prepLv.length) {
        steps.push({
          n: 3, title: "Проверка на реальных задачах", min: 2, max: 4,
          about: "Проводим через новый процесс один релизный цикл, чтобы команда освоила практики на своей работе.",
          tasks: [{ text: "Выпустить очередной релиз по новым правилам и через конвейер" }]
        });
      }

      if (target >= 6 && current < 6) {
        var ga = g(avg(sub.a)), gb = g(avg(sub.b));
        var ai = gaps(function (q) { return q.part === "a"; });
        steps.push({
          n: 4, title: "Подключение ИИ", min: 3 * ga, max: 6 * ga,
          about: "Готовим контур для ИИ: выбираем модель, настраиваем обезличивание и правила доступа к данным. Ведущие разработчики решают реальные задачи с ИИ, фиксируем сроки и качество.",
          tasks: ai
        });
        steps.push({
          n: 5, title: "Масштабирование", min: 4 * gb * m, max: 8 * gb * m,
          about: "Распространяем ИИ-разработку на всю команду, автоматизируем проверку качества кода, подключаем поддержку и показываем снижение затрат на разработку и поддержку.",
          tasks: gaps(function (q) { return q.part === "b"; })
        });
      }

      if (target === 7) {
        steps.push({
          n: 6, title: "ИИ у пользователей", min: 4 * g(score[7]), max: 8 * g(score[7]),
          about: "Даём ИИ руководителям подразделений: отдельный MCP с их правами и проверенными инструментами, пилот в одном подразделении, затем остальные. Запросы на отчёты и обработки сначала проверяем на решаемость через ИИ.",
          tasks: gaps(function (q) { return q.lv === 7; })
        });
      }

      steps.forEach(function (s) {
        var ra = roleAdd(s.n);
        s.roleWhy = ra.why;
        s.min = Math.max(1, Math.round(s.min * ra.f));
        s.max = Math.max(s.min, Math.round(s.max * ra.f));
      });
    }

    // Агент, который правит конфигурацию (6.1, шаг 3 и дальше), без конвейера и ревью — рано
    var aheadAI = current < 4 && eff.aiint >= 0.5 - 1e-9;
    var ahead = [];
    for (var h = current + 2; h <= MAXL; h++) if (score[h] > 0) ahead.push(h);

    var tMin = 0, tMax = 0;
    steps.forEach(function (s) { tMin += s.min; tMax += s.max; });

    return { eff: eff, miss: miss, stepMiss: stepMiss, score: score, pts: pts, lw: lw, index: Math.round(index),
             current: current, target: target, steps: steps, tMin: tMin, tMax: tMax, aheadAI: aheadAI, ahead: ahead };
  }

  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }
  function weeks(a, b) { return a === b ? a + " нед" : a + "–" + b + " нед"; }
  function months(a, b) {
    var r = function (x) { return Math.max(0.5, Math.round(x / 4.35 * 2) / 2); };
    var f = function (x) { return String(x).replace(".", ","); };
    var ma = r(a), mb = r(b);
    return ma === mb ? "≈ " + f(ma) + " мес" : "≈ " + f(ma) + "–" + f(mb) + " мес";
  }

  // Схема этапов: по клику на этап выбирается цель, обработчик у каждой страницы свой
  function stationsHtml(R) {
    var done = R.target <= R.current;
    return LEVELS.map(function (L) {
      var cls = ["st"];
      if (L.n < R.current) cls.push("passed");
      if (L.n === R.current) cls.push("here");
      if (L.n >= R.current && L.n < R.target) cls.push("planned");
      if (L.n === R.target && !done) cls.push("goal");
      var p = L.n === 0 ? null : Math.round(R.score[L.n] * 100);
      var chips = "";
      if (L.n === R.current) chips += '<span class="chip here">Вы здесь</span>';
      if (L.n === R.target && !done) chips += '<span class="chip goal">Цель</span>';
      return '<li class="' + cls.join(" ") + '"><button type="button" data-lv="' + L.n + '" aria-pressed="' + (L.n === R.target) + '">' +
        '<span class="dot" aria-hidden="true"></span>' +
        '<span class="chips">' + chips + '</span>' +
        '<span class="code">Этап ' + L.n + '</span>' +
        '<span class="name">' + L.name + '</span>' +
        (p === null ? '' : '<span class="meter" aria-hidden="true"><i style="width:' + p + '%"></i></span><span class="pct">выполнено ' + p + '%</span>') +
        '<span class="desc">' + L.desc + '</span>' +
        '</button></li>';
    }).join("");
  }

  P.BYID = BYID; P.TIDS = TIDS; P.SAMPLE = SAMPLE; P.ROLES = ROLES; P.ROLE_BY_ID = ROLE_BY_ID; P.PERSON = PERSON;
  P.leverShares = leverShares; P.APPLY = APPLY; P.CONTROL = CONTROL; P.BALANCE_GAP = BALANCE_GAP; P.MODEL_VERSION = MODEL_VERSION;
  P.roleOf = roleOf; P.roleText = roleText; P.share = share; P.migrate = migrate; P.clone = clone; P.save = save; P.onOutsideChange = onOutsideChange;
  P.esc = esc; P.pct = pct; P.ref = ref; P.names = names; P.toolA = toolA; P.toolLinks = toolLinks;
  P.stepIndex = stepIndex; P.unmet = unmet; P.compute = compute; P.lowerFirst = lowerFirst; P.weeks = weeks; P.months = months; P.stationsHtml = stationsHtml;
})();
