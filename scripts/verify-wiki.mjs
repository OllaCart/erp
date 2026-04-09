/**
 * List wiki markdown pages (no minimum — repo does not ship seeded pages).
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
console.log(`wiki/pages: ${md.length} markdown file(s)`)
process.exit(0)
