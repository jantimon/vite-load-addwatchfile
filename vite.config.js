import { readFileSync } from "node:fs";

const colorFile = import.meta.dirname + "/color.txt";
const css = (selector) => `${selector} { background: ${readFileSync(colorFile, "utf8").trim()}; }`;

// Two stylesheets made from color.txt. They differ only in the hook that calls addWatchFile.
export default {
  plugins: [
    {
      name: "color-css",
      enforce: "pre",
      resolveId(id) {
        if (id.startsWith("/load.css") || id.startsWith("/transform.css")) {
          return import.meta.dirname + id;
        }
      },
      load(id) {
        if (id.includes("/load.css")) {
          this.addWatchFile(colorFile);
          return css("#load");
        }
        if (id.includes("/transform.css")) return css("#transform");
      },
      transform(code, id) {
        if (id.includes("/transform.css")) this.addWatchFile(colorFile);
      },
    },
  ],
};
