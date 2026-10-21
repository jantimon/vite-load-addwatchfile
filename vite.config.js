import { readFileSync } from "node:fs";

const colorFile = import.meta.dirname + "/color.txt";

// Makes the stylesheet /color.css from color.txt and watches color.txt
export default {
  plugins: [
    {
      name: "color-css",
      enforce: "pre",
      resolveId(id) {
        if (id.startsWith("/color.css")) return import.meta.dirname + id;
      },
      load(id) {
        if (!id.includes("/color.css")) return;
        this.addWatchFile(colorFile);
        return `main { background: ${readFileSync(colorFile, "utf8").trim()}; }`;
      },
    },
  ],
};
