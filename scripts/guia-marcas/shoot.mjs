// Captura cada pantalla del curso de ejemplo servido en http://localhost:8765/
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'
const ids = JSON.parse(process.argv[2])
const only = process.argv[3] ? process.argv[3].split(',') : null
mkdirSync('shots', { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1180, height: 900 }, deviceScaleFactor: 2 })
await page.goto('http://localhost:8765/index.html')
await page.waitForSelector('#me-content *')
await page.waitForTimeout(800)
const sleep = (ms) => page.waitForTimeout(ms)
const actions = {
  acordeon: async () => { await page.locator('#me-content details summary, #me-content .me-accordion button').first().click() },
  combinado: async () => { await page.locator('#me-content details summary, #me-content .me-accordion button').first().click() },
  volteables: async () => { await page.locator('#me-content .me-flip-inner, #me-content .me-flip button').first().click() },
  linea: async () => { const s = page.locator('#me-content details summary, #me-content .me-timeline button'); if (await s.count()) await s.nth(1).click() },
  opcion: async () => { await page.locator('#me-content label', { hasText: 'CO2' }).first().click() },
  conversacion: async () => {
    await sleep(600)
    await page.locator('#me-content .me-dt-choice', { hasText: 'Entiendo' }).first().click(); await sleep(1600)
  },
  pasos: async () => { await page.locator('#me-content button, #me-content label', { hasText: 'Preguntarle con calma' }).first().click(); await sleep(500) },
  reto: async () => { await page.locator('#me-content input').first().fill('1050') },
}
for (let i = 0; i < ids.length; i++) {
  const id = ids[i]
  if (!only || only.includes(id)) {
    await sleep(900)
    if (actions[id]) { try { await actions[id]() } catch (e) { console.log('acción fallida', id, e.message.split('\n')[0]) } await sleep(700) }
    const el = page.locator('#me-content')
    // Quitar el límite de altura para capturar la pantalla entera
    await page.evaluate(() => { const m = document.querySelector('#me-content'); m.style.overflow = 'visible'; m.style.height = 'auto'; m.style.maxHeight = 'none' })
    await el.screenshot({ path: `shots/${id}.png` })
    console.log('ok', id)
  }
  if (i < ids.length - 1) { await page.click('#me-next'); }
}
await browser.close()
