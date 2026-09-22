import { readFile } from "node:fs/promises"

const indexHtml = new URL("./dist/index.html", import.meta.url)

export default {
  async fetch() {
    return new Response(await readFile(indexHtml), {
      headers: { "content-type": "text/html; charset=utf-8" },
    })
  },
}
