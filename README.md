# Vite: `addWatchFile` in `load` is lost on a module's first request

![Step by step: the load hook calls addWatchFile before the module node exists, so Vite drops color.txt. After color.txt changes, only the stylesheet that calls addWatchFile in transform updates. Expected both boxes lightblue, actual: the load box stays hotpink](hmr.gif)

`index.html` links two stylesheets. A plugin in `vite.config.js` makes both from `color.txt`, a file with one color, and calls `this.addWatchFile("color.txt")` for each. The only difference is the hook that makes the call. When `color.txt` changes, both boxes should take the new color.

## Step by step

The same steps as the GIF:

1. The browser requests `/load.css`. Its `load` hook calls `addWatchFile(color.txt)`. The module node for `/load.css` does not exist yet, so Vite drops the file.
2. Vite creates the node for `/load.css` after `load`. The node has no dependency.
3. The browser requests `/transform.css`. It calls `addWatchFile(color.txt)` in `transform`. Its node exists by then, so Vite records the dependency.
4. `color.txt` changes from hotpink to lightblue.
5. Vite updates the modules that depend on `color.txt`. Only `/transform.css` does, so only its box turns blue.

![Expected: both boxes lightblue. Actual: the load box stays hotpink, the transform box turns lightblue](result.png)

| box                     | expected  | actual    |
| ----------------------- | --------- | --------- |
| `addWatchFile` in `load`      | lightblue | hotpink ✗ |
| `addWatchFile` in `transform` | lightblue | lightblue ✓ |

## Try it

```sh
npm install
npm run dev
```

Open http://localhost:5173, change `color.txt` from `hotpink` to `lightblue` and save.

## Why

Vite keeps the files that `load` watches per module node, and drops them when the node does not exist yet ([pluginContainer.ts](https://github.com/vitejs/vite/blob/v8.3.5/packages/vite/src/node/server/pluginContainer.ts#L211-L219)):

```ts
const module = this.moduleGraph?.getModuleById(id)
if (module) {
  this._moduleNodeToLoadAddedImports.set(module, addedImports)
}
```

[`loadAndTransform`](https://github.com/vitejs/vite/blob/v8.3.5/packages/vite/src/node/server/transformRequest.ts#L269) calls `load` first and creates the node afterwards ([line 354](https://github.com/vitejs/vite/blob/v8.3.5/packages/vite/src/node/server/transformRequest.ts#L354)).

[@bluwy](https://github.com/bluwy) found the same cause in [vitejs/vite#18103](https://github.com/vitejs/vite/pull/18103), a PR with a failing test for this case:

> The `module` does not exist until the `load` hook finishes

He closed it with:

> Probably still an issue, but no one seems to have reported this so it's probably not important enough to fix this. Also, it's easier to track this in an issue.

A stylesheet that JS imports does not hit this: Vite creates its node while it analyzes the importer, before the browser requests the css. A stylesheet that only a `<link>` loads does, and SSR frameworks render such links in dev, Qwik for example.

Creating the node before `load` fixes the repro:

```diff
+ mod ??= await moduleGraph._ensureEntryFromUrl(url, undefined, resolved)
  const loadResult = await pluginContainer.load(id)
```
