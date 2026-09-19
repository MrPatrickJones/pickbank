/**
 * Startskript für cPanel / Passenger. Startet den Next.js-Produktionsserver.
 * In cPanel als „Application startup file" eintragen.
 */
const { createServer } = require("http")
const next = require("next")

const port = Number(process.env.PORT) || 3000
const app = next({ dev: false })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((request, response) => {
    handle(request, response)
  }).listen(port, () => {
    console.log(`Pick The Bank Portal läuft auf Port ${port}`)
  })
})
