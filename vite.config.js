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

const buildBackgroundScript = {
  name: "build-background-script",
  async writeBundle() {
    await esbuild.build({
      entryPoints: ["src/background/background.js"],
      bundle: true,
      outfile: "dist/background.js",
      format: "iife",
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
      css: ["content.css"]
    }))
    
    fs.writeFileSync("dist/manifest.json", JSON.stringify(manifest, null, 2))
  }
}

export default defineConfig({
  base: "./",
  plugins: [react(), buildContentScript, buildBackgroundScript, copyManifest],
  publicDir: "public",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: "src/popup/popup.html"
      },
      output: {
        entryFileNames: "[name].js"
      }
    }
  }
})