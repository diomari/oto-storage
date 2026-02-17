import { defineConfig } from "vitepress";

export default defineConfig({
  title: "oto-storage",
  description: "Type-safe localStorage/sessionStorage wrapper with TTL, defaults, and encryption hooks.",
  head: [["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }]],
  lastUpdated: true,
  cleanUrls: true,
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "API", link: "/api/oto" },
      { text: "Examples", link: "/examples/common-patterns" },
      { text: "FAQ", link: "/faq" },
      { text: "GitHub", link: "https://github.com/diomari/oto-storage" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "TTL", link: "/guide/ttl" },
          { text: "Encryption", link: "/guide/encryption" },
          { text: "Defaults", link: "/guide/defaults" },
          { text: "Migration", link: "/guide/migration" },
        ],
      },
      {
        text: "API",
        items: [
          { text: "oto", link: "/api/oto" },
          { text: "Options", link: "/api/options" },
        ],
      },
      {
        text: "Examples",
        items: [{ text: "Common Patterns", link: "/examples/common-patterns" }],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/diomari/oto-storage" }],
    editLink: {
      pattern: "https://github.com/diomari/oto-storage/edit/main/docs/:path",
    },
    search: {
      provider: "local",
    },
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2026 Diomari Madulara",
    },
  },
});
