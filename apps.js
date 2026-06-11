/* Device preview interactions - apps page mockups.
   One IIFE, vanilla JS, no deps. Every querySelector null-guarded so it
   no-ops on pages without the mockups. Hooks via data-dv-* attributes. */
(function () {
  "use strict";

  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Run cb once when `el` scrolls into view (or immediately if no IO support).
  function onReveal(el, cb) {
    if (!("IntersectionObserver" in window)) { cb(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { io.disconnect(); cb(); }
      });
    }, { threshold: 0.4 });
    io.observe(el);
  }

  function money(n) {
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }

  // Animate a number from `from` to `to` over `dur` ms, ease-out.
  function countTo(from, to, dur, onStep) {
    if (reduce) { onStep(to); return; }
    var start = null;
    function frame(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      onStep(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ── 1 · Task for iOS - checkbox toggle, reorder, live counts ── */
  function initTaskIOS() {
    var root = document.querySelector('[data-dv="task-ios"]');
    if (!root) return;

    $$(".dv-col", root).forEach(function (col) {
      var stack = col.querySelector("[data-dv-stack]");
      var countEl = col.querySelector("[data-dv-count]");
      if (!stack || !countEl) return;

      // extra = cards the real board has beyond the ones mocked here
      var extra = parseInt(countEl.getAttribute("data-dv-extra") || "0", 10);
      function recount() {
        countEl.textContent = extra + $$(".dv-card", stack).filter(function (c) {
          return !c.classList.contains("dv-done");
        }).length;
      }

      $$(".dv-check", stack).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var card = btn.closest(".dv-card");
          if (!card) return;
          var done = card.classList.toggle("dv-done");
          if (done) stack.appendChild(card);
          else stack.insertBefore(card, stack.firstChild);
          recount();
        });
      });
    });
  }

  /* ── 3 · Coin - count-up total, add-expense button ── */
  function initCoin() {
    var root = document.querySelector('[data-dv="coin"]');
    if (!root) return;
    var totalEl = root.querySelector("[data-dv-total]");
    var feed = root.querySelector("[data-dv-feed]");
    var fill = root.querySelector("[data-dv-pace-fill]");
    var pct = root.querySelector("[data-dv-pace-pct]");
    var label = root.querySelector("[data-dv-pace-label]");
    var addBtn = root.querySelector("[data-dv-add]");
    if (!totalEl || !feed || !fill || !pct || !label || !addBtn) return;

    var IDEAL = 1183.08;
    var total = 1042.23;

    function setPace() {
      var p = total / IDEAL * 100;
      fill.style.width = Math.min(p, 100) + "%";
      pct.textContent = p.toFixed(2) + "%";
      if (p > 100) { label.textContent = "Over Ideal"; label.classList.add("dv-over"); }
      else { label.textContent = "On Pace"; label.classList.remove("dv-over"); }
    }

    onReveal(root, function () {
      countTo(0, total, 900, function (v) { totalEl.textContent = money(v); });
    });

    var pool = [
      ["▾", "Coffee", "Just now", 4.50],
      ["▸", "Transit", "Just now", 2.90],
      ["▦", "Lunch", "Just now", 12.80],
      ["▣", "Books", "Just now", 19.99],
      ["◇", "Movie night", "Just now", 15.00]
    ];
    var idx = 0;

    addBtn.addEventListener("click", function () {
      var item = pool[idx % pool.length];
      idx++;

      var row = document.createElement("div");
      row.className = "dv-exp dv-enter";
      row.innerHTML =
        '<span class="dv-exp-icon">' + item[0] + "</span>" +
        '<span class="dv-exp-mid"><span class="dv-exp-name">' + item[1] + "</span>" +
        '<span class="dv-exp-sub">▦ ' + item[2] + "</span></span>" +
        '<span class="dv-exp-right"><span class="dv-exp-amt">' + money(item[3]) + "</span></span>";
      feed.insertBefore(row, feed.firstChild);
      while (feed.children.length > 4) feed.removeChild(feed.lastChild);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { row.classList.remove("dv-enter"); });
      });

      var from = total;
      total += item[3];
      countTo(from, total, 450, function (v) { totalEl.textContent = money(v); });
      setPace();
    });
  }

  /* ── 4 · Body - animated Activity Rings, refresh randomizes ── */
  function initBody() {
    var root = document.querySelector('[data-dv="body"]');
    if (!root) return;
    var refresh = root.querySelector("[data-dv-refresh]");

    var rings = {};
    $$(".dv-ring", root).forEach(function (c) { rings[c.getAttribute("data-dv-ring")] = c; });
    function circ(c) { return parseFloat(c.getAttribute("stroke-dasharray")) || 0; }
    // pct 0..1 → dashoffset (capped 100%)
    function setRing(c, pct, delay) {
      var C = circ(c);
      var off = C * (1 - Math.min(pct, 1));
      c.style.transitionDelay = (reduce ? 0 : delay) + "ms";
      c.style.strokeDashoffset = off;
    }
    function resetRing(c) {
      c.style.transition = "none";
      c.style.strokeDashoffset = circ(c);
      void c.getBoundingClientRect();
      c.style.transition = "";
    }

    function v(name) { return root.querySelector('[data-dv-v="' + name + '"]'); }
    function met(name) { return root.querySelector('[data-dv-met="' + name + '"]'); }

    function animate(move, ex, stand) {
      if (rings.move) setRing(rings.move, move / 500, 0);
      if (rings.exercise) setRing(rings.exercise, ex / 40, 120);
      if (rings.stand) setRing(rings.stand, stand / 10, 240);
      if (v("move")) v("move").textContent = move + "/500";
      if (v("exercise")) v("exercise").textContent = ex + "/40";
      if (v("stand")) v("stand").textContent = stand + "/10";
    }

    onReveal(root, function () { animate(679, 82, 6); });

    if (!refresh) return;
    refresh.addEventListener("click", function () {
      Object.keys(rings).forEach(function (k) { resetRing(rings[k]); });

      var move = randInt(380, 680), ex = randInt(28, 82), stand = randInt(4, 10);
      requestAnimationFrame(function () { animate(move, ex, stand); });

      var h = randInt(6, 8), m = randInt(0, 59);
      var set = {
        sleep: randInt(80, 95),
        sleepDur: h + "h " + m + "m",
        hr: randInt(62, 88),
        hrv: rand(20, 45).toFixed(1),
        load: rand(0.40, 1.20).toFixed(2),
        readiness: randInt(68, 95),
        energy: randInt(380, 700),
        resting: randInt(1250, 1650).toLocaleString("en-US")
      };
      Object.keys(set).forEach(function (k) {
        var el = met(k);
        if (el) el.textContent = set[k];
      });

      refresh.classList.remove("dv-spin");
      void refresh.getBoundingClientRect();
      refresh.classList.add("dv-spin");
    });
  }

  /* ── X-ray lens - hover cuts through the mockup to the real UI ── */
  function initXray() {
    if (!(window.matchMedia && window.matchMedia("(hover: hover)").matches)) return;
    $$(".dv-xray").forEach(function (sc) {
      sc.addEventListener("mousemove", function (e) {
        var r = sc.getBoundingClientRect();
        sc.style.setProperty("--dv-mx", (e.clientX - r.left) + "px");
        sc.style.setProperty("--dv-my", (e.clientY - r.top) + "px");
      });
      sc.addEventListener("mouseenter", function () { sc.classList.add("dv-lensing"); });
      sc.addEventListener("mouseleave", function () { sc.classList.remove("dv-lensing"); });
    });
  }

  /* ── Tap reveal - touch devices: the line under a phone melts the mockup
     away to the real UI; a second tap melts it back ── */
  function initTapReveal() {
    if (window.matchMedia && window.matchMedia("(hover: hover)").matches) return;
    $$("[data-dv-reveal]").forEach(function (btn) {
      var slot = btn.closest(".device-slot");
      var sc = slot ? slot.querySelector(".dv-xray") : null;
      if (!sc) return;
      btn.addEventListener("click", function () {
        var on = !sc.classList.contains("dv-revealed");
        if (on) {
          // melt origin: bottom center of the screen, nearest the tapped line
          sc.style.setProperty("--dv-mx", sc.clientWidth / 2 + "px");
          sc.style.setProperty("--dv-my", sc.clientHeight + "px");
          sc.classList.add("dv-melt");
        }
        sc.classList.toggle("dv-revealed", on);
        slot.classList.toggle("dv-shown", on);
      });
    });
  }

  initTaskIOS();
  initCoin();
  initBody();
  initXray();
  initTapReveal();
})();
