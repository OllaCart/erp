/**
 * Sanity-check that seeded wiki pages exist (exit 1 if count too low).
 * Run: node scripts/verify-wiki.mjs
 */
import { readdir } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, "..")
const pagesDir = path.join(root, "wiki", "pages")

const names = await readdir(pagesDir).catch(() => [])
const md = names.filter((n) => n.endsWith(".md"))
const expectedMin = 12

console.log(`wiki/pages: ${md.length} markdown file(s)`)
if (md.length < expectedMin) {
  console.error(`Expected at least ${expectedMin} seeded pages.`)
  process.exit(1)
}
process.exit(0)
