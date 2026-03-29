import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import fs from "fs"
import esbuild from "esbuild"

// Bug fix #1 & #2: Bundle content script as self-contained IIFE (no ES imports)
// so Chrome can execute it as a classic content script.
// esbuild also extracts panel.css → dist/content.css automatically.
const buildContentScript = {
  name: "build-content-script",
  async writeBundle() {
    await esbuild.build({
      entryPoints: ["src/content/content.jsx"],
      bundle: true,
      outfile: "dist/content.js",
      format: "iife",
      jsx: "automatic",
      define: { "process.env.NODE_ENV": '"production"' },
      minify: true,
    })
  }
}

const copyManifest = {
  name: "copy-manifest",
  writeBundle() {
    const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf-8"))
    manifest.content_scripts = manifest.content_scripts.map(cs => ({
      ...cs,
      js: cs.js.map(f => f.replace("src/content/content.jsx", "content.js")),
      css: ["content.css"]  // Bug fix #2: inject panel styles into pages
    }))
    
    // Vite bundles JS entry points to the root
    if (manifest.background && manifest.background.service_worker === "src/background/index.js") {
      manifest.background.service_worker = "background.js"
    }
    
    // Vite preserves HTML folder structure
    fs.writeFileSync("dist/manifest.json", JSON.stringify(manifest, null, 2))
  }
}

export default defineConfig({
  plugins: [react(), buildContentScript, copyManifest],
  publicDir: "public",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: "src/popup/popup.html",  // popup stays as ES module — works fine in extension popup
        offscreen: "src/offscreen/offscreen.html",
        background: "src/background/index.js"
      },
      output: {
        entryFileNames: "[name].js"
      }
    }
  }
})