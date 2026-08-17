# dsh-app-template

English | [中文](README.zh.md)

Official starter for a [DSH Webpage App](https://github.com/dshapps/dsh-webpage): a window that owns `/apps/<id>/*`. Package `@acme/hello-app`. App ID `acme.hello`, `surface: 'panel'`.

**This is a template.** Use it as a GitHub template, or clone it and run the rename script. The `@acme` scope and `acme.hello` ID are placeholders — change them before you publish.

## What you get

- A conformant publishable skeleton: manifest, patch row, tsdown Loader preset, invariant companion, `@dshapps/app-check` wiring
- Client half: dual registration in one `ctx.effect` with reverse-order cleanup, `React.lazy` body, child slot, zh/en locales, `@dshapps/webpage/ui`
- Host half: one allowlisted loopback GET route (`/api/acme-hello/status`) with inject-wait plus soft-`get` fallback — never throws from `apply()`
- Unit tests for composition, the App body, and Host registration paths

## Rename before shipping

Replace these five placeholders everywhere (or run `node scripts/rename.mjs --scope myorg --app myfeature`):

| Placeholder | Example |
| --- | --- |
| Package name | `@acme/hello-app` → `@myorg/myfeature-app` |
| App ID | `acme.hello` |
| Child slot key | `acme.hello.actions` |
| Locale namespace | `hello` |
| Route prefix | `/api/acme-hello/` |

Also update `cordis.patch.yml` (`id` + `name`) and the invariant plugin name.

## Develop against an unpublished kernel

`@dshapps/webpage` is not on npm yet. This repo peers on `0.2.0` and resolves it through `pnpm-workspace.yaml`:

```yaml
overrides:
  "@dshapps/webpage": "file:../dsh-webpage/packages/webpage"
```

Clone `dsh-webpage` as a sibling, then install here. `@dshapps/app-check` resolves the same way via `file:../dsh-app-check`.

## Verify

```powershell
corepack pnpm@11.7.0 install
corepack pnpm@11.7.0 run typecheck
corepack pnpm@11.7.0 run test:unit
node scripts/check.mjs --lint
node scripts/check.mjs --pack
corepack pnpm@11.7.0 exec tsdown
```

Plain `pnpm` on some machines resolves `11.0.9`; always go through Corepack or `node scripts/check.mjs`.

## Pack

Build first, then pack from the repo root:

```powershell
corepack pnpm@11.7.0 run build
corepack pnpm@11.7.0 pack
```

The tarball inserts **only** this plugin row. Install `@dshapps/webpage` into the profile before adding your App pack.

## Contract

The authoring guide in [dsh-webpage](https://github.com/dshapps/dsh-webpage/blob/main/docs/guides/app-authoring.md) is the operational contract. Conformance checks live in [`@dshapps/app-check`](https://github.com/dshapps/dsh-app-check). When the guide and this README disagree, the guide wins.

Licensed under the [MIT License](LICENSE).
