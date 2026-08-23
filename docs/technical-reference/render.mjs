/**
 * Render the technical reference to PDF.
 *
 *   npx playwright install chromium
 *   node docs/technical-reference/render.mjs
 *
 * The source of truth is `index.html` beside this file; the PDF is a build
 * artifact that happens to be committed so the repository can link to one.
 *
 * The font check below is not ceremony. `document.fonts.check()` returns a
 * false negative for variable fonts with an `opsz` axis, so an earlier version
 * of this script reported Newsreader as missing while it was rendering
 * perfectly — and the opposite failure is the one that matters: a webfont that
 * silently falls back produces a PDF that looks fine to the machine that built
 * it and wrong to everyone else. So it measures, and it throws.
 */

import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const src = process.argv[2] ?? path.join(here, "index.html");
const out =
  process.argv[3] ??
  path.join(here, "..", "liquid-interfaces-technical-reference.pdf");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(src).href, { waitUntil: "networkidle" });

// Google Fonts must have actually arrived, or the PDF quietly ships in Times.
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);

// document.fonts.check() gives a false negative for variable fonts with an
// opsz axis, so measure instead: if the face differs in width from its
// fallback, it is genuinely rendering.
const loaded = await page.evaluate(() => {
  const width = (stack) => {
    const s = document.createElement("span");
    s.textContent = "Handgloves 12345";
    s.style.cssText =
      "position:absolute;visibility:hidden;font-size:48px;white-space:nowrap;font-family:" + stack;
    document.body.appendChild(s);
    const w = s.getBoundingClientRect().width;
    s.remove();
    return w;
  };
  return [
    ["Newsreader", "Newsreader, Georgia, serif", "Georgia, serif"],
    ["IBM Plex Sans", '"IBM Plex Sans", Arial, sans-serif', "Arial, sans-serif"],
    ["IBM Plex Mono", '"IBM Plex Mono", monospace', "monospace"],
  ].map(([name, real, fb]) => `${name}=${width(real) !== width(fb)}`);
});
console.log("fonts →", loaded.join("  "));
if (loaded.some((l) => l.endsWith("false"))) {
  throw new Error("a webfont silently fell back: " + loaded.join(", "));
}

const furniture = (left, right) =>
  `<div style="width:100%;font-size:7pt;font-family:'IBM Plex Mono',monospace;` +
  `color:#8A90A0;padding:0 18mm;display:flex;justify-content:space-between;">` +
  `<span>${left}</span><span>${right}</span></div>`;

await page.pdf({
  path: out,
  format: "A4",
  printBackground: true,
  displayHeaderFooter: true,
  margin: { top: "18mm", bottom: "16mm", left: "18mm", right: "18mm" },
  headerTemplate: furniture("LIQUID INTERFACES · TECHNICAL REFERENCE", "LIP 0.2.0"),
  footerTemplate: furniture(
    "draiven-io/liquid-interfaces",
    '<span class="pageNumber"></span> / <span class="totalPages"></span>',
  ),
});

await browser.close();
console.log("wrote", path.basename(out));
