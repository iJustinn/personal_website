/* ─────────────────────────────────────────────────────────────────────
   main.js - shared behavior (theme, header, hero, feed filters, GitHub data)
   ───────────────────────────────────────────────────────────────────── */

(function () {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  // ── Theme ──────────────────────────────────────────────────────────
  // The initial theme is set by the inline script in <head> to avoid a flash.
  const THEME_KEY = "site.theme";
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
  const storedTheme = () => {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  };
  const setTheme = (theme, persist) => {
    root.setAttribute("data-theme", theme);
    // Keep native UI and the browser bar in step with the chosen theme.
    const schemeMeta = document.querySelector('meta[name="color-scheme"]');
    if (schemeMeta) schemeMeta.content = theme;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      m.content = theme === "dark" ? "#0a0a0a" : "#ffffff";
    });
    if (!persist) return;
    // Toggling back to the system theme clears the override so the site follows the OS again.
    try {
      if (theme === (systemDark.matches ? "dark" : "light")) localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, theme);
    } catch (e) {}
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
    toggle.classList.add("is-toggled"); // the incoming icon swings in (main.css)
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

  // "On this page" list (About): the link of the section being read is marked current.
  const toc = document.querySelector("[data-toc]");
  const tocLinks = toc ? [...toc.querySelectorAll('a[href^="#"]')] : [];
  const tocSections = tocLinks.map((link) => document.getElementById(link.hash.slice(1)));
  let tocActive = -1;
  function updateToc() {
    let active = 0;
    // The last section that has crossed a line a third of the way down the viewport.
    const line = window.innerHeight * 0.35;
    tocSections.forEach((section, i) => {
      if (section && section.getBoundingClientRect().top <= line) active = i;
    });
    // At the very bottom the last sections can't reach the line, so pick the last one.
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) active = tocLinks.length - 1;
    if (active === tocActive) return;
    tocActive = active;
    tocLinks.forEach((link, i) => {
      if (i === active) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    toc.querySelector("ul").style.setProperty("--toc-y", `${tocLinks[active].offsetTop}px`);
  }

  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = window.scrollY;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (tocLinks.length) updateToc();
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
  const revealTargets = [...document.querySelectorAll("[data-reveal], .project")];
  const REVEAL_STEP_MS = 70;
  const REVEAL_MS = 900; // matches the .reveal transition in main.css
  // Elements that enter together come in one after another, top-left first.
  // Afterwards the classes and the delay are removed so hover transitions behave normally.
  function reveal(el, order) {
    if (!el.classList.contains("reveal") || el.classList.contains("in")) return;
    const delay = Math.min(order, 8) * REVEAL_STEP_MS;
    el.style.transitionDelay = `${delay}ms`;
    el.classList.add("in");
    setTimeout(() => {
      el.classList.remove("reveal", "in");
      el.style.transitionDelay = "";
    }, delay + REVEAL_MS);
  }
  if (!reduceMotion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      const batch = entries.filter((entry) => entry.isIntersecting);
      batch.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top
        || a.boundingClientRect.left - b.boundingClientRect.left);
      batch.forEach((entry, i) => {
        reveal(entry.target, i);
        io.unobserve(entry.target);
      });
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
      if (match) shown += 1;
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

    // Changing the filter runs inside a view transition where supported: the cards on
    // screen (before or after the change) get a name for its duration, so cards that
    // stay glide to their new position and the others fade. Off-screen cards are left
    // out because every named card costs a snapshot. `filterRun` guards against
    // cleanup from an interrupted run.
    let filterRun = 0;
    const nameVisibleItems = () => {
      filterItems.forEach((item, i) => {
        if (item.hidden || item.style.viewTransitionName) return;
        const rect = item.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight) item.style.viewTransitionName = `filter-item-${i}`;
      });
    };
    const changeFilter = (tag, scrollToFeed) => {
      const update = (instant) => {
        applyFilter(tag);
        // Cards revealed by the filter skip their scroll-in animation.
        filterItems.forEach((item) => { if (!item.hidden) item.classList.remove("reveal", "in"); });
        if (!scrollToFeed) return;
        const anchor = document.getElementById("work") || filterBar;
        anchor.scrollIntoView({ behavior: instant ? "instant" : "smooth", block: "start" });
      };
      if (!document.startViewTransition || reduceMotion) {
        update(reduceMotion);
        return;
      }
      const run = ++filterRun;
      nameVisibleItems();
      root.classList.add("filtering");
      document.startViewTransition(() => {
        update(true);
        nameVisibleItems();
      }).finished.finally(() => {
        if (run !== filterRun) return;
        root.classList.remove("filtering");
        filterItems.forEach((item) => { item.style.viewTransitionName = ""; });
      });
    };

    document.addEventListener("click", (e) => {
      const target = e.target.closest("[data-filters] .chip, .tag[data-tag]");
      if (!target) return;
      e.preventDefault();
      const tag = target.dataset.tag;
      changeFilter(tag === activeTag && tag !== "all" ? "all" : tag, target.classList.contains("tag"));
    });
  }

  // ── Cursor spotlight (cards) ──────────────────────────────────────
  // The hovered element gets the pointer position as --mx/--my; main.css draws the glow.
  if (finePointer) {
    let spotEvent = null;
    let spotFrame = 0;
    document.addEventListener("pointermove", (e) => {
      spotEvent = e;
      if (spotFrame) return;
      spotFrame = requestAnimationFrame(() => {
        spotFrame = 0;
        const el = spotEvent.target instanceof Element && spotEvent.target.closest(".card, .project");
        if (!el) return;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--mx", `${spotEvent.clientX - rect.left}px`);
        el.style.setProperty("--my", `${spotEvent.clientY - rect.top}px`);
      });
    }, { passive: true });
  }

  // ── Hero parallax ──────────────────────────────────────────────────
  // The phone collage drifts a little against the pointer; main.css turns --px/--py into offsets.
  const heroStage = heroVisual && heroVisual.querySelector(".hero-stage");
  if (heroStage && finePointer && !reduceMotion) {
    window.addEventListener("pointermove", (e) => {
      if (window.scrollY > hero.offsetHeight) return;
      heroStage.style.setProperty("--px", (e.clientX / window.innerWidth - 0.5).toFixed(3));
      heroStage.style.setProperty("--py", (e.clientY / window.innerHeight - 0.5).toFixed(3));
    }, { passive: true });
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
        if (!day.future) {
          cell.dataset.pos = `${w + 1}/${(day.weekday ?? 0) + 1}`;
          cell.dataset.tip = `<b>${count === 0 ? "No" : count.toLocaleString("en-US")} contribution${count === 1 ? "" : "s"}</b> · ${escapeHtml(shortDate(`${day.date}T12:00:00`))}`;
        }
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
    attachHeatTip(container, scroller, grid);
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

  // A tooltip names the day under the cursor. The magnet pushes cells away from the
  // pointer, so the day is found from the grid position, not from the hovered element.
  function attachHeatTip(container, area, grid) {
    if (!finePointer) return;
    const cells = new Map();
    for (const cell of grid.children) {
      if (cell.dataset.pos) cells.set(cell.dataset.pos, cell);
    }
    const tip = document.createElement("div");
    tip.className = "heat-tip";
    tip.setAttribute("aria-hidden", "true");
    container.appendChild(tip);
    const PITCH = 13; // 10px cell + 3px gap, as in main.css
    area.addEventListener("pointermove", (e) => {
      const rect = grid.getBoundingClientRect();
      const col = Math.floor((e.clientX - rect.left) / PITCH) + 1;
      const row = Math.floor((e.clientY - rect.top) / PITCH) + 1;
      const cell = cells.get(`${col}/${row}`);
      if (!cell) {
        tip.classList.remove("is-on");
        return;
      }
      tip.innerHTML = cell.dataset.tip;
      const box = container.getBoundingClientRect();
      const x = rect.left - box.left + (col - 0.5) * PITCH - tip.offsetWidth / 2;
      const y = rect.top - box.top + (row - 1) * PITCH - tip.offsetHeight - 14;
      tip.style.transform = `translate(${Math.max(0, Math.min(x, box.width - tip.offsetWidth))}px, ${y}px)`;
      tip.classList.add("is-on");
    });
    area.addEventListener("pointerleave", () => tip.classList.remove("is-on"));
  }

  // Cells near the cursor are pushed radially away from it, then spring back on leave.
  const MAGNET_RADIUS = 110;
  const MAGNET_PUSH = 16;
  // Cells the cursor touches flash bright, then fade back to their level color over 1s.
  const SHINE_RADIUS = 12;
  const SHINE_MS = 1000;
  function attachMagnet(area, grid) {
    if (reduceMotion || !finePointer) return;
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

  // ── Footer: copy email, New York time ──────────────────────────────
  if (navigator.clipboard) {
    document.querySelectorAll("[data-copy]").forEach((btn) => {
      const label = btn.querySelector("[data-copy-label]");
      const idle = label.textContent;
      let timer = 0;
      btn.hidden = false;
      btn.addEventListener("click", () => {
        navigator.clipboard.writeText(btn.dataset.copy).then(() => {
          label.textContent = "Copied";
          btn.setAttribute("data-copied", "");
          clearTimeout(timer);
          timer = setTimeout(() => {
            label.textContent = idle;
            btn.removeAttribute("data-copied");
          }, 1800);
        }).catch(() => {});
      });
    });
  }
  const clocks = [...document.querySelectorAll("[data-local-time]")];
  if (clocks.length) {
    const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
    const tickClock = () => clocks.forEach((el) => { el.textContent = timeFmt.format(new Date()); });
    tickClock();
    setInterval(tickClock, 30000);
  }

  // ── Year ───────────────────────────────────────────────────────────
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();
