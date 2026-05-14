# Lessons Learned

Persistent project-specific troubleshooting notes for future Codex runs.

## Entries

### 2026-05-14 - GitHub API commands need network approval
- Context: Seeding project-card metadata from the user's GitHub repositories.
- Symptom: `rtk gh repo list iJustinn --limit 100 --json ...` failed with `error connecting to api.github.com` inside the sandbox.
- Cause: The workspace sandbox blocks outbound network calls unless the command is escalated.
- Fix: Rerun the same `rtk gh repo list` command with network approval.
- Reuse: When a future site task needs live GitHub repo, PR, or Actions data, expect the first networked `rtk gh ...` call to need escalation.

### 2026-05-14 - Mobile grid tracks need explicit shrink bounds
- Context: Adding GitHub metadata to `projects.html` and verifying the page at a 390px mobile viewport.
- Symptom: The screenshot appeared to clip long project titles and repository names even though desktop looked fine.
- Cause: Single-column CSS Grid tracks and grid children can keep min-content widths unless the track uses `minmax(0, 1fr)` and children set `min-width: 0`.
- Fix: Use `grid-template-columns: minmax(0, 1fr)` for the mobile shell, `minmax(0, 1fr)` for mobile project bodies, and `min-width: 0` on grid children that contain long text.
- Reuse: When new content on this static site looks clipped on mobile, check grid track min sizing before changing font sizes.

### 2026-05-14 - Sidebar education rows need laptop-width checks
- Context: Keeping the sidebar education entries on one line after changing the undergraduate badge to `B.Sc.`.
- Symptom: Mobile rendered correctly, but laptop-width desktop browsers could still wrap the final `T` in `U of T` onto a new line.
- Cause: The sidebar text was close to the available desktop sidebar width, especially with browser zoom or font rendering differences.
- Fix: Verify the sidebar at laptop widths as well as mobile, compact the education row font to 10px, and use a fixed badge column plus `max-content` text column.
- Reuse: For sidebar copy changes, measure both 390px mobile and laptop widths such as 1280px, including zoom-sensitive text.
