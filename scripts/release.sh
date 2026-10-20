#!/usr/bin/env bash
# release.sh
# Bumps the app version, commits "chore: version bump to vX.Y.Z" and tags it.
# Pushing the tag triggers the CI/CD release (see docs/RELEASING.md).
#
# Usage: scripts/release.sh <version> [--push]
#   <version>  e.g. 1.2.10 or 1.3.0-rc1 (no leading "v")
#   --push     also push master and the tag to origin
#
# Set ALLOW_ANY_BRANCH=1 to release from a branch other than master.

set -euo pipefail

VERSION="${1:-}"
PUSH="${2:-}"
TAG="v${VERSION}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

fail() {
    echo "❌ $1" >&2
    exit 1
}

# Replaces the first match of an ERE pattern in a file (portable across GNU/BSD tools)
replace_in_file() {
    local file="$1" pattern="$2" replacement="$3"
    local tmp
    tmp="$(mktemp)"
    awk -v pat="$pattern" -v rep="$replacement" '
        !done && match($0, pat) { $0 = substr($0, 1, RSTART - 1) rep substr($0, RSTART + RLENGTH); done = 1 }
        { print }
    ' "$file" > "$tmp"
    cat "$tmp" > "$file"
    rm -f "$tmp"
    grep -qF "$replacement" "$file" || fail "Failed to update version in $file"
}

# ── Validation ────────────────────────────────────────────────────────────────

[[ -n "$VERSION" ]] || fail "Usage: scripts/release.sh <version> [--push]   (e.g. 1.2.10)"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.]+)?$ ]] ||
    fail "Invalid version '$VERSION'. Expected X.Y.Z or X.Y.Z-suffix, without a leading 'v'."
[[ -z "$PUSH" || "$PUSH" == "--push" ]] || fail "Unknown option '$PUSH'"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" != "master" && "${ALLOW_ANY_BRANCH:-}" != "1" ]]; then
    fail "Releases are cut from master (current: $BRANCH). Set ALLOW_ANY_BRANCH=1 to override."
fi

[[ -z "$(git status --porcelain)" ]] || fail "Working tree is not clean. Commit or stash your changes first."

echo "🔄 Fetching origin..."
git fetch --quiet --tags origin
if git rev-parse --verify --quiet "origin/$BRANCH" > /dev/null; then
    [[ "$(git rev-list --count "HEAD..origin/$BRANCH")" == "0" ]] ||
        fail "$BRANCH is behind origin/$BRANCH. Pull first."
fi

git rev-parse --verify --quiet "refs/tags/$TAG" > /dev/null && fail "Tag $TAG already exists."

CURRENT="$(sed -nE 's/^version = "([^"]+)"/\1/p' server/Cargo.toml | head -1)"
[[ "$CURRENT" != "$VERSION" ]] || fail "Version is already $VERSION."

# ── Bump ──────────────────────────────────────────────────────────────────────

echo "📝 Bumping version $CURRENT → $VERSION"
replace_in_file server/Cargo.toml '^version = "[^"]+"' "version = \"${VERSION}\""
replace_in_file web/package.json '"version": "[^"]+"' "\"version\": \"${VERSION}\""
replace_in_file server/src/openapi.rs 'version = "[^"]+", description' "version = \"${VERSION}\", description"

echo "🔒 Updating server/Cargo.lock..."
(cd server && cargo update --workspace --offline --quiet)
grep -A1 -F 'name = "funban-server"' server/Cargo.lock | grep -qF "version = \"${VERSION}\"" ||
    fail "Cargo.lock was not updated to $VERSION"

# ── Commit and tag ────────────────────────────────────────────────────────────

git add server/Cargo.toml server/Cargo.lock server/src/openapi.rs web/package.json
git commit --quiet -m "chore: version bump to ${TAG}"
git tag "$TAG"
echo "✅ Committed and tagged $TAG"

if [[ "$PUSH" == "--push" ]]; then
    echo "🚀 Pushing $BRANCH and $TAG..."
    git push origin "$BRANCH"
    git push origin "$TAG"
    echo "✅ Pushed. Follow the build: gh run watch \$(gh run list --workflow ci-cd.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
else
    echo ""
    echo "Next: push to start the release build:"
    echo "  git push origin $BRANCH && git push origin $TAG"
fi
