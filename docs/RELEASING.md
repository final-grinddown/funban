# Releasing Funban

Releases are cut from `master` by pushing a `vX.Y.Z` tag. CI/CD tests, builds and publishes everything; deploying to the server is a manual step.

## TL;DR

```bash
git switch master && git pull
make precommit                   # optional, the same checks CI runs on the tag
make release VERSION=1.2.10      # bump version, commit, tag (local only)
git push origin master && git push origin v1.2.10
# wait for the "CI/CD" workflow to go green, then on the server:
docker compose -f docker-compose.prod.yaml pull
docker compose -f docker-compose.prod.yaml up -d
```

## 1. Prepare `master`

- All work is merged into `master` through PRs. There is no release branch; `develop` was only used up to the `v1.2.0-rc*` releases.
- Generated files must be up to date, or the tag build fails:
  - **SQLx offline data** (`server/.sqlx/`): CI builds with `SQLX_OFFLINE=true`. Run `make sqlx-prepare` after changing queries or migrations.
  - **TypeScript contracts** (`contracts/`): run `make contracts` after changing Rust types exported with `#[ts(export)]`.
  - `make scripts` runs formatting, contracts and SQLx prepare in one go.
- `make precommit` runs the same checks CI does: fmt, clippy `-D warnings`, server tests, `sqlx prepare --check`, web type check, lint, tests and build.

## 2. Bump the version and tag

```bash
make release VERSION=1.2.10           # or: scripts/release.sh 1.2.10
make release VERSION=1.2.10 PUSH=1    # also pushes master and the tag
```

The script (`scripts/release.sh`):

1. Validates the version (`X.Y.Z` or `X.Y.Z-suffix`, without a leading `v`).
2. Checks that you are on `master` with a clean tree, not behind `origin/master`, and that the tag doesn't exist yet. Set `ALLOW_ANY_BRANCH=1` to release from another branch.
3. Updates the version in all four places:
   - `server/Cargo.toml`
   - `server/Cargo.lock` (via `cargo update --workspace --offline`)
   - `server/src/openapi.rs` (the API docs version)
   - `web/package.json`
4. Commits `chore: version bump to vX.Y.Z` and creates the tag `vX.Y.Z`.

Without `PUSH=1`, nothing leaves your machine. To undo before pushing:

```bash
git tag -d v1.2.10 && git reset --hard HEAD~1
```

### Versioning

- **Patch** (`1.2.9 → 1.2.10`): bug fixes and dependency updates.
- **Minor** (`1.2.x → 1.3.0`): new features, e.g. a new page or a database migration.
- **Pre-release** (`1.3.0-rc1`): builds and publishes images but does **not** create a GitHub Release, so you can test an image before the final tag.

## 3. CI/CD (automatic)

Pushing the tag runs `.github/workflows/ci-cd.yml`:

| Job | What it does |
|---|---|
| Test Server | `cargo fmt --check`, `clippy -D warnings`, build both binaries, `cargo test` against MySQL 5.7 |
| Test Web | type check, lint, jest, `yarn build` |
| Build and Deploy Images | only if both test jobs pass: builds and pushes `ghcr.io/final-grinddown/funban/server` and `.../web` tagged `X.Y.Z`, `X.Y` and `latest`, signs them with cosign, and creates a GitHub Release with generated notes (not for pre-release tags) |

Follow the run with `gh run watch` or on the Actions tab.

### If the tag build fails

The tag is already pushed, so don't reuse it. Fix the problem on `master` and release the next patch version. This happened with v1.2.7, which was fixed and re-released as v1.2.8. Never move or re-push a tag that has already been published.

## 4. Deploy (manual)

On the production host:

```bash
docker compose -f docker-compose.prod.yaml pull
docker compose -f docker-compose.prod.yaml up -d
```

- `docker-compose.prod.yaml` lives on the server, not in this repo. Check that it references the image tag you want (`latest` or a pinned `X.Y.Z`).
- **Database migrations** in `server/migrations/` run automatically when the server starts. Releases with migrations can't simply be rolled back by redeploying the old image, so check the migration first.

## Related

- `prod-to-dev.sh` / `run-prod-to-dev.sh`: copy the production database into the dev database (dev is backed up first). Not part of a release, but useful for testing a release against real data.
- `server/fly.toml`: leftover from earlier Fly.io hosting; not used by the current release process.
