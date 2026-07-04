# robbysailing.com

Robby Meek's LA2028 Olympic Sailing Campaign website.

Built with React + Vite.

## Setup

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

## Build & Deploy

```bash
npm run build
```

Output goes to `dist/`. Deployment is automatic: every push to `main` builds and publishes to robbysailing.com via GitHub Pages (`.github/workflows/deploy.yml`).

## Development workflow

`main` is production — it deploys on every push, so nothing lands there directly.

1. Branch off `main` per piece of work: `feat/<name>`, `fix/<name>`, or `chore/<name>`.
2. Open a PR: `gh pr create --fill`. CI builds the branch (`.github/workflows/ci.yml`); the merge is blocked until it passes.
3. Merge: `gh pr merge --squash --auto` — squash-merges the moment CI goes green and auto-deletes the branch. One PR = one commit on `main`.

Big site-wide features are still feature branches: slice them into independently mergeable PRs where possible; when a branch genuinely can't ship in pieces, rebase it onto `main` every day or two (`git fetch && git rebase origin/main`) and keep unrelated fixes on their own branches.

## Project Structure

```
src/
  components/   Nav, Footer, exit cards, orb (shared)
  data/         Campaign stops, tour chapters
  hooks/        useCountdown, usePageEntrance, useTextSpray
  lib/          Text spray effect
  bake/         Mobile orb bake pipeline (see BAKE.md)
  pages/        MainView (home), Biography, ComingSoon, Path, Support, Contact, EventCalendar
  App.jsx       Router
  main.jsx      Entry point
  index.css     Global styles
```
