---
layout: home

title: oto-storage
titleTemplate: Type-safe browser storage
hero:
  name: "oto-storage"
  text: "Type-safe browser storage without boilerplate"
  tagline: "Proxy-based localStorage/sessionStorage wrapper with defaults, TTL, and encryption hooks."
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/oto

features:
  - title: Type-safe by design
    details: Full TypeScript inference for storage keys and nested data.
  - title: Built-in TTL + defaults
    details: Expiration and deep-merged defaults with minimal setup.
  - title: Encryption hooks
    details: Plug in your own sync encrypt/decrypt implementation.
---

## Install

```bash
npm install oto-storage
```

## Quick example

```ts
import { oto } from "oto-storage";

interface AppStorage {
  token: string | null;
  user: { id: string; name: string } | null;
}

const storage = oto<AppStorage>({
  prefix: "app-",
  defaults: { token: null, user: null },
  ttl: 60 * 60 * 1000,
});

storage.token = "abc123";
console.log(storage.token);
```
