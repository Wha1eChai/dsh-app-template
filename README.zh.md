# dsh-app-template

[English](README.md) | 中文

[DSH Webpage App](https://github.com/dshapps/dsh-webpage) 的官方起步模板：一扇拥有 `/apps/<id>/*` 的窗。包名 `@acme/hello-app`。App ID `acme.hello`，`surface: 'panel'`。

**这是模板。** 当 GitHub template 用，或克隆后跑重命名脚本。`@acme` 和 `acme.hello` 都是占位——发布前改掉。

## 你会得到什么

- 一份能过合同、能打包的骨架：manifest、patch 行、tsdown Loader preset、invariant 伴生、`@dshapps/app-check` 接线
- Client 半边：同一个 `ctx.effect` 里双重注册、倒序清理、`React.lazy` 主体、子槽、中英 locale、`@dshapps/webpage/ui`
- Host 半边：一条允许列表里的 loopback GET（`/api/acme-hello/status`），inject-wait 加上软 `get` 回退——`apply()` 里永不抛
- 组合、App 主体、Host 注册路径的单元测试

## 发布前先改名

把下面五个占位全部换掉（或跑 `node scripts/rename.mjs --scope myorg --app myfeature`）：

| 占位 | 例子 |
| --- | --- |
| 包名 | `@acme/hello-app` → `@myorg/myfeature-app` |
| App ID | `acme.hello` |
| 子槽 key | `acme.hello.actions` |
| Locale 命名空间 | `hello` |
| 路由前缀 | `/api/acme-hello/` |

同时改 `cordis.patch.yml`（`id` + `name`）和 invariant 插件名。

## 对着还没上 npm 的内核开发

`@dshapps/webpage` 还没上 npm。这个仓库 peer 在 `0.2.0`，通过 `pnpm-workspace.yaml` 解析：

```yaml
overrides:
  "@dshapps/webpage": "file:../dsh-webpage/packages/webpage"
```

把 `dsh-webpage` 克隆成兄弟目录，再在这里安装。`@dshapps/app-check` 同样走 `file:../dsh-app-check`。

## 校验

```powershell
corepack pnpm@11.7.0 install
corepack pnpm@11.7.0 run typecheck
corepack pnpm@11.7.0 run test:unit
node scripts/check.mjs --lint
node scripts/check.mjs --pack
corepack pnpm@11.7.0 exec tsdown
```

有些机器上直接打 `pnpm` 会解析到 `11.0.9`；请走 Corepack，或直接 `node scripts/check.mjs`。

## 打包

先构建，再从仓库根打包：

```powershell
corepack pnpm@11.7.0 run build
corepack pnpm@11.7.0 pack
```

tarball 只插入**这一行**插件。把 App pack 加进 profile 之前，先装 `@dshapps/webpage`。

## 合同

[dsh-webpage](https://github.com/dshapps/dsh-webpage/blob/main/docs/guides/app-authoring.md) 里的写作指南是操作合同。符合性检查在 [`@dshapps/app-check`](https://github.com/dshapps/dsh-app-check)。指南和本 README 不一致时，以指南为准。

使用 [MIT License](LICENSE)。
