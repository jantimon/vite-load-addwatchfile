# Vite: `addWatchFile` in `load` is lost on a module's first request

![color.txt changes from hotpink to lightblue to gold: only the box whose stylesheet calls addWatchFile in transform follows](hmr.gif)

`index.html` links two stylesheets. A plugin in `vite.config.js` makes both from `color.txt`, a file with one color, and calls `this.addWatchFile("color.txt")` for each. The only difference is the hook that makes the call:

| stylesheet       | `addWatchFile` called in | after editing `color.txt` |
| ---------------- | ------------------------ | ------------------------- |
| `/load.css`      | `load`                   | keeps the old color       |
| `/transform.css` | `transform`              | turns to the new color    |

Both should turn to the new color.

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

[`loadAndTransform`](https://github.com/vitejs/vite/blob/v8.3.5/packages/vite/src/node/server/transformRequest.ts#L269) calls `load` first and creates the node afterwards ([line 354](https://github.com/vitejs/vite/blob/v8.3.5/packages/vite/src/node/server/transformRequest.ts#L354)). So on a module's first request, the files are gone before the transform could record them as dependencies.

A stylesheet that JS imports does not hit this: Vite creates its node while it analyzes the importer, before the browser requests the css. A stylesheet that only a `<link>` loads does, and SSR frameworks render such links in dev, Qwik for example.

Creating the node before `load` fixes the repro:

```diff
+ mod ??= await moduleGraph._ensureEntryFromUrl(url, undefined, resolved)
  const loadResult = await pluginContainer.load(id)
```
