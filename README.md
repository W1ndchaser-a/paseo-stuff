# Paseo Stuff

Independent community plugins for [Paseo](https://paseo.sh), maintained in one repository.
Each plugin has its own manifest, version, npm lockfile, tests and license. There is no
shared runtime or root-hoisted dependency tree.

## Plugins

| Plugin | Directory | Status / important limits |
| --- | --- | --- |
| Math Renderer | [plugins/math-renderer](plugins/math-renderer) | Paseo 0.13 or later; block and inline LaTeX after reply completion, with formula-free blocks in the host Markdown renderer. Use native-reply mode to search formula source with chat Find or, on Paseo 0.14 through 0.15.4, to fold formula replies under Collapse turns. Native mobile acceptance is not complete. |
| Readable Agent Activity | [plugins/agent-activity](plugins/agent-activity) | Paseo 0.13 or later. Tool cards need the Full chat display; before using Collapse tool calls, Collapse turns or Summary, choose "Activity: use native rows" in each client's Command Center. |
| DeepSeek Harness | [plugins/deepseek-harness](plugins/deepseek-harness) | Paseo 0.11 or later. Provider adapter; requires a separately installed, compatible official DSH executable and credentials. |

The current stable verification target is Paseo **0.16.0**. Activity **0.1.0-beta.14**
and Math Renderer **0.1.0-beta.8** require Paseo **0.13.0**. Their checks pass with
the pinned **0.13.2** SDK and the **0.16.0** SDK; host-pipeline tests use actual
0.16.0 sources in every chat display mode. Both packed plugins load on an isolated
macOS 0.15.3 daemon. Paseo 0.16.0 fixes formula-reply folding; Activity still
needs native rows for collapsed displays. The 0.16.0 checks cover SDKs and the
offline host pipeline. Live UI checks remain on 0.14.0; prerelease checks are
recorded separately.

DeepSeek Harness requires Paseo **0.11.0**. **Beta.19** restores original displayed
history after context compaction and pruning, including repeated prefix compaction,
and recognises DSH model/reasoning selection records. Its checks
pass with the pinned **0.11.4** and target **0.16.0** SDKs. With SDK 0.15.4, the production
provider initializes, lists sessions/models and reopens persistence with official
**DSH 0.2.2-rc.3** without model calls. **Beta.21** also preserves history across
Team-mode metadata and the official batch-append API. The beta.19 tarball loaded
on an isolated 0.15.3 daemon, with provider diagnostic Ready and catalog discovery
passing.
That CLI requires **Node.js >=24.9.0**.
Direct Git installs are pinned to the beta.21 release tag.

The latest live web-client checks remain on Paseo **0.14.0** with DSH
**0.2.1-rc.5**. Native mobile acceptance is not complete. Requirements are minimums;
each plugin's verification record lists the actual checks and remaining limits.
Use its pinned installation command before changing an installed version.

Read each plugin's README before installing. Plugins are trusted, unsandboxed code;
their permissions and operational requirements differ.

## Install a plugin from this repository

Review the plugin and enable plugins in Paseo first. On Paseo 0.11 or later, install
the reviewed [registry](https://paseo.sh/plugins) entry on the intended daemon, for
example Math Renderer:

```sh
paseo plugin add geoqiao/math-renderer --host <host:port>
```

### If a registry install fails with "npm artifact changed since review"

On Paseo 0.12.0 through 0.15.4, a registry mirror can cause this error because
those installers compare the tarball URL as well as package integrity. Paseo 0.16.0
includes [the fix](https://github.com/getpaseo/paseo/pull/8756): its tagged artifact
comparison accepts different mirror URLs with the same version and integrity,
and rejects changed integrity. This comparison was tested directly; a real mirror
installation on 0.16.0 has not been exercised.

For affected older hosts, run this command as the user that runs the daemon, then install again:

```sh
npm config set replace-registry-host never
```

npm then downloads pinned `registry.npmjs.org` tarballs from npmjs and keeps the mirror
for other packages. You can also install the npm package directly, for example
`paseo plugin add npm:paseo-deepseek-harness --host <host:port>`. Both fixes were
tested on a Paseo 0.13.0 daemon whose npm used `registry.npmmirror.com`.

Math Renderer, Readable Agent Activity and DeepSeek Harness are also published on npm
as `paseo-math-renderer`, `paseo-readable-agent-activity` and
`paseo-deepseek-harness`. To install a package directly:

```sh
paseo plugin add npm:paseo-math-renderer@0.1.0-beta.8 --host <host:port>
```

To install a pinned tag directly from this repository instead:

```sh
paseo plugin add git:geoqiao/paseo-stuff:plugins/math-renderer --ref math-renderer-v0.1.0-beta.8 --host <host:port>
```

The `:plugins/<directory>` suffix selects one plugin, not the whole repository.
Paseo 0.11 and later read a bare `owner/name` source as a registry ID, so the `git:`
prefix is required there. Paseo CLIs before 0.11 take the same Git source without the prefix.
Do not enable two installations of the same timeline renderer or provider.

This is the new development and release home for Readable Agent Activity and
DeepSeek Harness as well. Their old repositories and immutable release tags remain
available for existing installations. The existing Cafe entries keep their IDs;
the registry migration in PR #97 has merged and points to this repository.

Existing Git installations do **not** switch repositories automatically. See the
[migration notes](MIGRATION.md) before changing an installed source. Each plugin
README records its current immutable install tag and verification limits.

## Development

Use npm from the plugin directory, not the repository root:

```sh
cd plugins/math-renderer
npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund
npm run prepare:markdown --if-present
npm run prepare:wasm --if-present
npm run check
```

CI independently installs and checks the three plugins on Node.js 22 and 24.
Daily triage and upstream compatibility maintenance use one Paseo schedule; see
[maintenance](.github/maintenance/README.md).
Use the public Paseo SDK. Typecheck before reloading the exact installed ID on an
explicit host; do not restart the daemon or enable an intentionally disabled plugin.
See [AGENTS.md](AGENTS.md) for repository development rules.

## Versions, registry and Cafe

Each plugin maintains its own `package.json.version`. Git tags use
`<plugin-id>-v<version>` so releases remain independent in the monorepo.

Publishing a GitHub release for an npm-distributed plugin (DeepSeek Harness,
Math Renderer and Readable Agent Activity) runs [`publish-npm.yml`](.github/workflows/publish-npm.yml), which
checks the tag against `package.json`, runs the plugin checks and publishes
with [npm trusted publishing](https://docs.npmjs.com/trusted-publishers). No
npm token or OTP is involved, and npm attaches provenance. To publish an
existing tag again, run the workflow manually with that tag; versions already
on npm are skipped.

`npm trust` works only for a package that already exists, so a new package starts
differently. Add its tag prefix to the workflow's plugin list. The repository owner
then publishes the first version manually from a checked tarball and runs
`npm trust github <package> --file publish-npm.yml --repo geoqiao/paseo-stuff --allow-publish`
once. Later versions go through the workflow. The manually published version has no
npm provenance.

Each npm package removes the Git-only `build` steps from its packed manifest and
ships an `npm-shrinkwrap.json` for its production dependencies. Paseo installs those
dependencies and runs no package scripts. Math Renderer's package also includes its
generated Markdown parser and embedded WASM. CI packs each npm plugin, installs only
the production dependencies and loads the result in a Paseo daemon.

Paseo's [plugin registry](https://github.com/getpaseo/plugins) (browsable at
[paseo.sh/plugins](https://paseo.sh/plugins)) pins one reviewed artifact per plugin:

| Registry ID | Plugin directory | Pinned artifact |
| --- | --- | --- |
| `geoqiao/agent-activity` | `plugins/agent-activity` | npm `paseo-readable-agent-activity`; the version follows the registry's bump PRs |
| `geoqiao/deepseek-harness` | `plugins/deepseek-harness` | npm `paseo-deepseek-harness`; the version follows the registry's bump PRs |
| `geoqiao/math-renderer` | `plugins/math-renderer` | npm `paseo-math-renderer`; the version follows the registry's bump PRs |

The registry opens a bump PR by itself for a new npm version. A Git record changes
only after a new submission or a PR against that record. Readable Agent Activity
and Math Renderer moved to npm records in
[getpaseo/plugins#666](https://github.com/getpaseo/plugins/pull/666), starting at
0.1.0-beta.11 and 0.1.0-beta.6. Each maintained plugin keeps an
`OVERVIEW.md` and a Simplified Chinese `OVERVIEW.zh-CN.md` beside its manifest; the registry shows it on the listing page once a
record pins a commit or package that contains it, replacing the overview the
registry wrote during the import.

A [Paseo Cafe](https://github.com/paseo-cafe/paseo-cafe) entry can point to a subdirectory:

```json
{
  "repo": "geoqiao/paseo-stuff",
  "path": "plugins/math-renderer",
  "categories": ["productivity"],
  "submittedBy": "geoqiao"
}
```

The entry filename must match that plugin's `paseo-plugin.json.id`. Each listing is
submitted separately; a pull request is not a claim that Cafe has accepted the plugin.

The current Cafe scope includes these three plugins, all sourced from this repository:

| Catalog ID | Plugin directory | Cafe PR / status |
| --- | --- | --- |
| `readable-agent-activity` | `plugins/agent-activity` | [Merged migration #97](https://github.com/paseo-cafe/paseo-cafe/pull/97) |
| `deepseek-harness` | `plugins/deepseek-harness` | [Merged migration #97](https://github.com/paseo-cafe/paseo-cafe/pull/97) |
| `math-renderer` | `plugins/math-renderer` | [Merged entry #98](https://github.com/paseo-cafe/paseo-cafe/pull/98) |

All three entries have merged. Version/README updates appear after Cafe's next
scan and deployment; updated curator caveats require a separate Cafe review.

## Licenses and publication scope

Repository-authored material is MIT unless otherwise noted. Each plugin retains its
own LICENSE and dependency/upstream notices; bundled test fixtures retain upstream licenses.
Readable Agent Activity derives from Matt Cowger's MIT plugin; see its
[provenance](plugins/agent-activity/UPSTREAM.md).

Local experiments, internal workspace notes, generated bundles, dependency directories,
host configuration, credentials and personal conversation captures are not published.
Plugin tests and screenshots use synthetic content.
