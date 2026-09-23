/* ─────────────────────────────────────────────────────────────────────
   main.js - shared behavior (theme, header, hero, feed filters, GitHub data)
   ───────────────────────────────────────────────────────────────────── */

(function () {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Theme ──────────────────────────────────────────────────────────
  // The initial theme is set by the inline script in <head> to avoid a flash.
  const THEME_KEY = "site.theme";
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  const storedTheme = () => {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  };
  const setTheme = (theme, persist) => {
    root.setAttribute("data-theme", theme);
    if (!persist) return;
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  };
  if (!root.hasAttribute("data-theme")) {
    const saved = storedTheme();
    setTheme(saved === "dark" || saved === "light" ? saved : (systemDark.matches ? "dark" : "light"), false);
  }
  systemDark.addEventListener("change", (e) => {
    const saved = storedTheme();
    if (saved !== "dark" && saved !== "light") setTheme(e.matches ? "dark" : "light", false);
  });
  document.addEventListener("click", (e) => {
    const toggle = e.target.closest("[data-theme-toggle]");
    if (!toggle) return;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    if (!document.startViewTransition || reduceMotion) {
      setTheme(next, true);
      return;
    }
    // Reveal the new theme as a circle growing from the button until it covers the viewport.
    const rect = toggle.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    root.style.setProperty("--reveal-x", `${x}px`);
    root.style.setProperty("--reveal-y", `${y}px`);
    root.style.setProperty("--reveal-r", `${radius}px`);
    root.classList.add("theme-switching");
    const transition = document.startViewTransition(() => setTheme(next, true));
    transition.finished.finally(() => root.classList.remove("theme-switching"));
  });

  // ── Header state + hero fade ───────────────────────────────────────
  const header = document.querySelector(".site-header");
  const hero = document.querySelector(".hero");
  const heroCopy = hero && hero.querySelector(".hero-copy");
  const heroVisual = hero && hero.querySelector(".hero-visual");

  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (hero && !reduceMotion && getComputedStyle(hero).position === "sticky") {
      const h = hero.offsetHeight || 1;
      const p = Math.min(Math.max(y / (h * 0.75), 0), 1);
      if (heroCopy) {
        heroCopy.style.opacity = String(1 - p);
        heroCopy.style.transform = `translateY(${p * -24}px)`;
      }
      if (heroVisual) heroVisual.style.opacity = String(1 - p * 0.85);
    } else if (heroCopy) {
      heroCopy.style.opacity = "";
      heroCopy.style.transform = "";
      if (heroVisual) heroVisual.style.opacity = "";
    }
  }
  window.addEventListener("scroll", () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScroll);
    }
  }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  // ── Reveal on scroll ───────────────────────────────────────────────
  const revealTargets = [...document.querySelectorAll("[data-reveal]")];
  if (!reduceMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -5% 0px", threshold: 0.01 });
    revealTargets.forEach((el) => {
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  // ── Tag filters (home feed + projects page) ────────────────────────
  const filterBar = document.querySelector("[data-filters]");
  const filterItems = [...document.querySelectorAll("[data-tags]")];
  const emptyNote = document.querySelector("[data-filter-empty]");
  let activeTag = "all";

  function applyFilter(tag) {
    activeTag = tag;
    let shown = 0;
    for (const item of filterItems) {
      const tags = item.dataset.tags.split(/\s+/);
      const match = tag === "all" || tags.includes(tag);
      item.hidden = !match;
      if (match) {
        shown += 1;
        item.classList.add("in");
      }
    }
    if (emptyNote) emptyNote.hidden = shown > 0;
    if (filterBar) {
      filterBar.querySelectorAll(".chip").forEach((chip) => {
        chip.setAttribute("aria-pressed", String(chip.dataset.tag === tag));
      });
    }
  }

  if (filterBar && filterItems.length) {
    const counts = new Map();
    for (const item of filterItems) {
      for (const tag of item.dataset.tags.split(/\s+/).filter(Boolean)) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const chip = (tag, label, count) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.dataset.tag = tag;
      btn.setAttribute("aria-pressed", "false");
      btn.textContent = label;
      if (count != null) {
        const c = document.createElement("span");
        c.className = "count";
        c.textContent = count;
        btn.appendChild(c);
      }
      return btn;
    };
    filterBar.appendChild(chip("all", "All"));
    for (const [tag, count] of sorted) filterBar.appendChild(chip(tag, `#${tag}`, count));
    applyFilter("all");

    document.addEventListener("click", (e) => {
      const target = e.target.closest("[data-filters] .chip, .tag[data-tag]");
      if (!target) return;
      e.preventDefault();
      const tag = target.dataset.tag;
      applyFilter(tag === activeTag && tag !== "all" ? "all" : tag);
      if (target.classList.contains("tag")) {
        const anchor = document.getElementById("work") || filterBar;
        anchor.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      }
    });
  }

  // ── Project metadata from GitHub Actions output ────────────────────
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  }[ch]));
  const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  const shortDate = (value) => {
    const d = value ? new Date(value) : null;
    return d && !Number.isNaN(d.valueOf()) ? dateFmt.format(d) : "";
  };

  const metaSlots = [...document.querySelectorAll("[data-project-id]")];
  if (metaSlots.length) {
    fetch("projects-data.json", { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error("projects-data missing"); return r.json(); })
      .then((data) => {
        const byId = new Map((data.projects || []).map((p) => [p.id, p]));
        for (const el of metaSlots) {
          const project = byId.get(el.dataset.projectId);
          if (!project || project.status === "unavailable") continue;
          const updated = shortDate(project.pushedAt || project.updatedAt);
          if (!updated) continue;
          el.querySelectorAll("[data-updated]").forEach((slot) => {
            slot.textContent = `Updated ${updated}`;
          });
        }
      })
      .catch(() => {});
  }

  // ── GitHub contribution heatmap ────────────────────────────────────
  const heatmaps = [...document.querySelectorAll("[data-github-heatmap]")];
  function renderHeatmap(container, data) {
    const weeks = data.weeks || [];
    if (!weeks.length) return;
    const grid = document.createElement("div");
    grid.className = "heatmap-grid";
    grid.setAttribute("role", "img");

    let total = 0;
    for (let w = 0; w < weeks.length; w += 1) {
      for (const day of weeks[w].days || []) {
        const count = day.count ?? 0;
        if (!day.future) total += count;
        const cell = document.createElement("span");
        cell.className = `heat level-${day.level ?? 0}`;
        if (day.future) cell.classList.add("is-future");
        cell.style.gridColumn = String(w + 1);
        cell.style.gridRow = String((day.weekday ?? 0) + 1);
        cell.style.setProperty("--i", String(w + (day.weekday ?? 0)));
        cell.title = `${day.date}: ${count} contribution${count === 1 ? "" : "s"}`;
        grid.appendChild(cell);
      }
    }
    const span = data.range?.weeks || weeks.length;
    const period = span >= 52 ? "the last year" : `the last ${span} weeks`;
    const user = data.user || "iJustinn";
    grid.setAttribute("aria-label", `${total} GitHub contributions in ${period}`);

    const scroller = document.createElement("div");
    scroller.className = "heatmap-scroll";
    scroller.appendChild(grid);

    const caption = document.createElement("p");
    caption.className = "heatmap-caption";
    caption.innerHTML = `<b>${total.toLocaleString("en-US")}</b> contributions in ${period} · <a href="https://github.com/${escapeHtml(user)}" target="_blank" rel="noopener">@${escapeHtml(user)} on GitHub</a>`;

    container.replaceChildren(scroller, caption);
    attachMagnet(scroller, grid);
    revealHeatmap(grid, caption.querySelector("b"), total);
  }

  // Once in view: cells pop in along a diagonal and the total counts up from 0.
  function revealHeatmap(grid, counter, total) {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    grid.classList.add("will-reveal");
    counter.textContent = "0";
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      io.disconnect();
      grid.classList.add("is-in");
      const duration = 1400;
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        counter.textContent = Math.round(total * eased).toLocaleString("en-US");
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    io.observe(grid);
  }

  // Cells near the cursor are pushed radially away from it, then spring back on leave.
  const MAGNET_RADIUS = 110;
  const MAGNET_PUSH = 16;
  // Cells the cursor touches flash bright, then fade back to their level color over 1s.
  const SHINE_RADIUS = 12;
  const SHINE_MS = 1000;
  function attachMagnet(area, grid) {
    if (reduceMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const cells = [...grid.children];
    let centers = null;
    let pointer = null;
    let frame = 0;
    let settleTimer = 0;
    let shine = null;
    let lastPoint = null;
    const lit = new Map();

    const readShine = () => {
      const styles = getComputedStyle(document.documentElement);
      shine = [styles.getPropertyValue("--heat-shine").trim(), styles.getPropertyValue("--heat-glow").trim()];
    };
    const flash = (i) => {
      const now = performance.now();
      if (now - (lit.get(i) ?? -Infinity) < 120) return;
      lit.set(i, now);
      cells[i].animate(
        [{ backgroundColor: shine[0], boxShadow: `0 0 8px 1px ${shine[1]}` }, {}],
        { duration: SHINE_MS, easing: "cubic-bezier(0.25, 0.1, 0.25, 1)" },
      );
    };
    const measure = () => {
      centers = cells.map((cell) => [cell.offsetLeft + cell.offsetWidth / 2, cell.offsetTop + cell.offsetHeight / 2]);
    };
    const update = () => {
      frame = 0;
      if (!pointer) return;
      const rect = grid.getBoundingClientRect();
      const px = pointer[0] - rect.left;
      const py = pointer[1] - rect.top;
      // Shine every cell along the path since the last frame, so fast moves don't skip cells.
      const [ax, ay] = lastPoint ?? [px, py];
      const sx = px - ax;
      const sy = py - ay;
      const segLen2 = sx * sx + sy * sy;
      lastPoint = [px, py];
      for (let i = 0; i < cells.length; i += 1) {
        const dx = centers[i][0] - px;
        const dy = centers[i][1] - py;
        const d = Math.hypot(dx, dy);
        const t = segLen2 ? Math.max(0, Math.min(1, ((centers[i][0] - ax) * sx + (centers[i][1] - ay) * sy) / segLen2)) : 0;
        if (Math.hypot(centers[i][0] - (ax + sx * t), centers[i][1] - (ay + sy * t)) < SHINE_RADIUS) flash(i);
        if (d >= MAGNET_RADIUS || d < 0.5) {
          cells[i].style.transform = "";
          continue;
        }
        const push = MAGNET_PUSH * (1 - d / MAGNET_RADIUS);
        cells[i].style.transform = `translate(${(dx / d) * push}px, ${(dy / d) * push}px)`;
      }
    };

    area.addEventListener("pointerenter", () => {
      clearTimeout(settleTimer);
      grid.classList.remove("is-settling");
      measure();
      readShine();
    });
    area.addEventListener("pointermove", (e) => {
      if (!centers) measure();
      if (!shine) readShine();
      pointer = [e.clientX, e.clientY];
      if (!frame) frame = requestAnimationFrame(update);
    });
    area.addEventListener("pointerleave", () => {
      pointer = null;
      lastPoint = null;
      cancelAnimationFrame(frame);
      frame = 0;
      grid.classList.add("is-settling");
      cells.forEach((cell) => { cell.style.transform = ""; });
      settleTimer = setTimeout(() => grid.classList.remove("is-settling"), 600);
    });
    window.addEventListener("resize", () => { centers = null; });
  }
  if (heatmaps.length) {
    fetch("github-activity.json", { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error("github-activity missing"); return r.json(); })
      .then((data) => heatmaps.forEach((el) => renderHeatmap(el, data)))
      .catch(() => {});
  }

  // ── Year ───────────────────────────────────────────────────────────
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();
