# paseo.cafe catalog

[paseo.cafe](https://paseo.cafe) is an independent community directory, not a
Paseo compatibility certification.

The original [PR #86](https://github.com/paseo-cafe/paseo-cafe/pull/86) was merged.
The monorepo migration [PR #97](https://github.com/paseo-cafe/paseo-cafe/pull/97)
was merged on 2026-09-12 and the live entry points here:

- Registry file and plugin ID: `readable-agent-activity`.
- Repository: `geoqiao/paseo-stuff`.
- Subdirectory: `plugins/agent-activity`.
- Prepared pointer: [catalog-entry.json](catalog-entry.json).

Do not delete/re-add the entry or create another ID. The existing
`colorful-agent-activity` entry belongs to the upstream author and is not changed.
New versions do not need a new admission PR. Cafe derives the version from this
directory's `package.json` on the repository's default branch, together with the
README and screenshots. Existing Git installations still follow their stored ref.

Cafe's deployment workflow currently scans every six hours (`17 */6 * * *`), after
successful main-branch CI, or when a maintainer starts it manually. A GitHub release
does not immediately update the static live page. Registry caveat changes require
a small update PR; merging or submitting that PR is not proof of deployment.

The entry discloses the beta limitation that cards need the Full chat display.
That caveat remains valid on 0.16.0: upstream #8875 is open. The separate
plugin-reply fix #8811 ships in 0.16.0 and leaves transformed-work grouping unchanged. `platforms` is omitted
because the implementation is not OS-restricted; the caveat distinguishes a
tested macOS host from untested native mobile clients.

Registry validation checks the public repository and subpath, the manifest, and
the match between manifest ID and registry filename. The scanner derives package
metadata, README, license and images from the plugin subdirectory. See the
[directory instructions](https://github.com/paseo-cafe/paseo-cafe#submitting-a-plugin).

A catalog pointer update does not modify previously installed Git sources.
See the [migration notes](https://github.com/geoqiao/paseo-stuff/blob/main/MIGRATION.md).
