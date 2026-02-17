import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const distDir = process.argv[2] || "docs/.vitepress/dist";
const gaId =
  process.env.GA_MEASUREMENT_ID ||
  process.env.VITE_GA_MEASUREMENT_ID ||
  process.env.GA_TAG_ID ||
  "";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...walk(full));
    } else if (full.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

function stripExistingGa(html) {
  return html
    .replace(/\s*<script[^>]*src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]+"[^>]*><\/script>/gi, "")
    .replace(/\s*<script\b[^>]*>[\s\S]*?window\.dataLayer[\s\S]*?gtag\([\s\S]*?config[\s\S]*?<\/script>/gi, "");
}

function injectGa(html, id) {
  const snippet = `\n    <script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>\n    <script>\n      window.dataLayer = window.dataLayer || [];\n      function gtag(){dataLayer.push(arguments);}\n      gtag('js', new Date());\n      gtag('config', '${id}');\n    </script>`;

  if (html.includes('<link rel="icon"')) {
    return html.replace(/(<link rel="icon"[^>]*>)/, `$1${snippet}`);
  }

  return html.replace("</head>", `${snippet}\n  </head>`);
}

const htmlFiles = walk(distDir);
let updated = 0;

for (const file of htmlFiles) {
  const original = readFileSync(file, "utf8");
  let next = stripExistingGa(original);

  if (gaId) {
    next = injectGa(next, gaId);
  }

  if (next !== original) {
    writeFileSync(file, next);
    updated += 1;
  }
}

if (gaId) {
  console.log(`Injected Google Analytics (${gaId}) into ${updated} HTML file(s).`);
} else {
  console.log(`GA_MEASUREMENT_ID not set. Removed existing GA snippets from ${updated} HTML file(s).`);
}
