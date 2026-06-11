/* ─────────────────────────────────────────────────────────────────────
   site.js — shared behavior
   ───────────────────────────────────────────────────────────────────── */

(function () {
  const root = document.documentElement;
  const body = document.body;

  // ── Theme ──────────────────────────────────────────────────────────
  const THEME_KEY = "site.theme";
  function applyTheme(t, persist = true) {
    root.setAttribute("data-theme", t);
    if (persist) localStorage.setItem(THEME_KEY, t);
  }
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "dark" || savedTheme === "light") applyTheme(savedTheme, false);
  else applyTheme("light", false);

  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-theme-toggle]");
    if (!t) return;
    applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  // ── Tweaks defaults (rewritten on disk by host) ────────────────────
  const TWEAKS = /*EDITMODE-BEGIN*/{
    "accent": "ink",
    "density": "cozy",
    "background": "dots",
    "cursor": true
  }/*EDITMODE-END*/;

  const ACCENTS = {
    warm:    { l: "oklch(0.64 0.19 35)",  d: "oklch(0.72 0.18 35)",  soft: "oklch(0.95 0.04 35)",  softDark: "oklch(0.28 0.06 35)" },
    indigo:  { l: "oklch(0.55 0.18 265)", d: "oklch(0.72 0.16 265)", soft: "oklch(0.95 0.04 265)", softDark: "oklch(0.28 0.06 265)" },
    moss:    { l: "oklch(0.55 0.14 145)", d: "oklch(0.70 0.13 145)", soft: "oklch(0.95 0.04 145)", softDark: "oklch(0.27 0.05 145)" },
    ink:     { l: "oklch(0.30 0.02 60)",  d: "oklch(0.85 0.01 60)",  soft: "oklch(0.94 0.005 60)", softDark: "oklch(0.26 0.01 60)" },
  };
  const DENSITY = { cozy: 0.75, comfy: 1.0, airy: 1.35 };

  function applyTweaks(t) {
    const a = ACCENTS[t.accent] || ACCENTS.warm;
    const isDark = () => root.getAttribute("data-theme") === "dark";
    const setAccents = () => {
      root.style.setProperty("--accent", isDark() ? a.d : a.l);
      root.style.setProperty("--accent-soft", isDark() ? a.softDark : a.soft);
    };
    setAccents();
    // re-apply on theme change
    new MutationObserver(setAccents).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

    root.style.setProperty("--density", DENSITY[t.density] || 1);
    body.setAttribute("data-bg", t.background);
    body.classList.toggle("no-cursor", !t.cursor);
  }
  applyTweaks(TWEAKS);

  // expose for tweaks panel
  window.__siteTweaks = TWEAKS;
  window.__applyTweaks = applyTweaks;

  // ── Custom cursor ──────────────────────────────────────────────────
  const ring = document.createElement("div");
  ring.className = "cursor-ring";
  document.body.appendChild(ring);
  const coords = document.createElement("div");
  coords.className = "cursor-coords";
  coords.textContent = "x: 0000 y: 0000";
  document.body.appendChild(coords);

  let tx = 0, ty = 0, rx = 0, ry = 0;
  let showing = false;
  document.addEventListener("mousemove", (e) => {
    tx = e.clientX; ty = e.clientY;
    if (!showing) {
      showing = true;
      ring.classList.add("visible");
      coords.classList.add("visible");
    }
    coords.style.left = e.clientX + "px";
    coords.style.top = e.clientY + "px";
    coords.textContent = `x: ${String(Math.round(e.pageX)).padStart(4, "0")}  y: ${String(Math.round(e.pageY)).padStart(4, "0")}`;
  });
  document.addEventListener("mouseleave", () => {
    showing = false;
    ring.classList.remove("visible");
    coords.classList.remove("visible");
  });
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest("a, button, [data-hoverable], .project, .timeline li, .skill .chip")) {
      ring.classList.add("hovering");
    } else {
      ring.classList.remove("hovering");
    }
  });

  function tick() {
    rx += (tx - rx) * 0.22;
    ry += (ty - ry) * 0.22;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(tick);
  }
  tick();

  // ── Scroll reveal ──────────────────────────────────────────────────
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });
  document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

  // ── Scroll progress (left-margin section nav) ──────────────────────
  const sections = [...document.querySelectorAll(".section[id]")];
  const progressEl = document.querySelector(".scroll-progress");
  if (progressEl && sections.length) {
    progressEl.innerHTML = sections.map((s, i) => {
      const label = s.dataset.shortLabel || s.querySelector(".sec-title")?.textContent || s.id;
      return `<a href="#${s.id}" data-i="${i}">${String(i + 1).padStart(2, "0")} ${label.toLowerCase()}</a>`;
    }).join("");
    const links = [...progressEl.querySelectorAll("a")];
    const spy = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const id = e.target.id;
          links.forEach((l) => l.classList.toggle("current", l.getAttribute("href") === "#" + id));
        }
      }
    }, { rootMargin: "-40% 0px -55% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  // ── ASCII rule auto-fill ───────────────────────────────────────────
  document.querySelectorAll("[data-ascii-rule]").forEach((el) => {
    const ch = el.dataset.asciiRule || "─";
    el.textContent = ch.repeat(120);
  });

  // ── Project metadata from GitHub Actions output ───────────────────
  const projectCards = [...document.querySelectorAll("[data-project-id][data-repo]")];
  const latestList = document.querySelector("[data-latest-projects]");
  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const escapeHtml = (value) => String(value || "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  }[ch]));
  const shortDate = (value) => {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.valueOf()) ? dateFmt.format(date) : "";
  };
  const LANG_LABEL = {
    Swift: "iOS",
    JavaScript: "Web",
    TypeScript: "Web",
    HTML: "Web",
    R: "Data",
  };
  const projectDisplayName = (project) => {
    const title = (project.title || "").split(" · ")[0].trim();
    return title || project.name || project.repo || "";
  };
  const PLATFORM_LABEL = /\b(iOS|iPadOS|macOS|watchOS|tvOS|visionOS|Android|Web)\b/;
  const projectLabel = (project) => {
    const platform = (project.title || "").match(PLATFORM_LABEL);
    if (platform) return platform[1];
    return LANG_LABEL[project.primaryLanguage] || project.primaryLanguage || "";
  };
  if (projectCards.length || latestList) {
    fetch("projects-data.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("projects-data missing");
        return response.json();
      })
      .then((data) => {
        const projects = data.projects || [];

        if (projectCards.length) {
          const byId = new Map(projects.map((project) => [project.id, project]));
          projectCards.forEach((card) => {
            const project = byId.get(card.dataset.projectId);
            const slot = card.querySelector("[data-project-meta]");
            if (!project || !slot || project.status === "unavailable") return;

            const updated = shortDate(project.pushedAt || project.updatedAt);

            slot.innerHTML = `
              <div class="row-k">GITHUB</div>
              <a class="repo-link" href="${escapeHtml(project.url)}" target="_blank" rel="noopener">${escapeHtml(project.repo)}</a>
              <div class="repo-fact">${updated ? `updated ${escapeHtml(updated)}` : "repo linked"}</div>
            `;

            const arrow = card.querySelector(".arrow");
            if (arrow && project.url) arrow.href = project.url;
          });
        }

        if (latestList) {
          const top = projects
            .filter((project) => project.status === "ok" && project.pushedAt)
            .sort((a, b) => new Date(b.pushedAt) - new Date(a.pushedAt))
            .slice(0, 3);
          if (top.length) {
            latestList.innerHTML = top.map((project) => {
              const name = escapeHtml(projectDisplayName(project));
              const tag = escapeHtml(projectLabel(project));
              return tag
                ? `<li>${name} <span class="accent">·</span> ${tag}</li>`
                : `<li>${name}</li>`;
            }).join("");
          }
        }

        const selectedList = document.querySelector("[data-selected-projects]");
        const selectedMeta = document.querySelector("[data-selected-meta]");
        if (selectedList || selectedMeta) {
          const selected = projects.filter((project) => project.status !== "unavailable");
          if (selected.length) {
            if (selectedList) {
              selectedList.textContent = selected.map(projectDisplayName).join(" · ");
            }
            if (selectedMeta) {
              const langs = [...new Set(selected
                .map((project) => project.primaryLanguage)
                .filter(Boolean)
                .map((lang) => lang.toLowerCase()))];
              selectedMeta.innerHTML = `<span class="k">${escapeHtml(langs.join(", "))}</span>`;
            }
          }
        }
      })
      .catch(() => {});
  }

  // ── GitHub contribution heatmap from GitHub Actions output ────────
  const heatmaps = [...document.querySelectorAll("[data-github-heatmap]")];
  function renderHeatmap(container, data) {
    const weeks = data.weeks || [];
    if (!weeks.length) return;

    container.textContent = "";
    container.style.setProperty("--heatmap-weeks", weeks.length);

    const months = document.createElement("div");
    months.className = "heatmap-months";
    for (const month of data.months || []) {
      const label = document.createElement("span");
      label.className = "heatmap-month";
      label.textContent = month.label;
      label.style.gridColumn = `${month.weekIndex + 1} / span 3`;
      months.appendChild(label);
    }

    const grid = document.createElement("div");
    grid.className = "heatmap-grid";
    for (let weekIndex = 0; weekIndex < weeks.length; weekIndex += 1) {
      const week = weeks[weekIndex];
      for (const day of week.days || []) {
        const cell = document.createElement("span");
        cell.className = `heatmap-cell level-${day.level ?? 0}`;
        cell.style.gridColumn = String(weekIndex + 1);
        cell.style.gridRow = String((day.weekday ?? 0) + 1);
        if (day.future) cell.classList.add("is-future");
        const count = day.count ?? 0;
        cell.title = `${day.date}: ${count} contribution${count === 1 ? "" : "s"}`;
        grid.appendChild(cell);
      }
    }

    const legend = document.createElement("div");
    legend.className = "heatmap-legend";
    legend.innerHTML = `
      <span>Less</span>
      <span class="heatmap-sample level-0" aria-hidden="true"></span>
      <span class="heatmap-sample level-1" aria-hidden="true"></span>
      <span class="heatmap-sample level-2" aria-hidden="true"></span>
      <span class="heatmap-sample level-3" aria-hidden="true"></span>
      <span class="heatmap-sample level-4" aria-hidden="true"></span>
      <span>More</span>
    `;

    container.append(months, grid, legend);
  }

  if (heatmaps.length) {
    fetch("github-activity.json", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("github-activity missing");
        return response.json();
      })
      .then((data) => heatmaps.forEach((container) => renderHeatmap(container, data)))
      .catch(() => {});
  }

  // ── Live clock in footer ───────────────────────────────────────────
  const clock = document.querySelector("[data-clock]");
  if (clock) {
    const fmt = () => {
      const d = new Date();
      const opts = { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/New_York" };
      return d.toLocaleTimeString("en-US", opts) + " ET";
    };
    clock.textContent = fmt();
    setInterval(() => { clock.textContent = fmt(); }, 30000);
  }

  // ── Year ───────────────────────────────────────────────────────────
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();
