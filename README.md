# OtoStorage

A lightweight, Proxy-based wrapper for `localStorage` and `sessionStorage` with full TypeScript type safety.

### ⚡ The Problem

Working with browser storage usually involves repetitive `JSON.parse` and `JSON.stringify` calls, manual key prefixing to avoid collisions, and a total lack of Type Safety.

```typescript
// The old, "clunky" way
const user = JSON.parse(localStorage.getItem("user_data") || "{}");
localStorage.setItem("user_data", JSON.stringify({ ...user, theme: "dark" }));
```

### ✨ The Solution

OtoStorage uses the JavaScript Proxy API to let you interact with browser storage as if it were a local object. It handles serialization, prefixing, and type-checking automatically.

**Key Features**

- Type-Safe: Full autocomplete and build-time error checking.

- Zero Boilerplate: No more manual JSON parsing.

- Driver Support: Switch between localStorage and sessionStorage with one flag.

- Collision Protection: Automatic key prefixing (namespacing).

### 🚀 Quick Start

1. Define your Schema

```typescript
interface AppStorage {
  theme: "light" | "dark";
  viewCount: number;
  user: { id: string; name: string } | null;
}
```

2. Initialize

```typescript
import { createStorage } from "./ultra-storage";

const storage = createStorage<AppStorage>({
  prefix: "myApp\_",
  driver: "local", // or 'session'
});
```

3. Use it like a regular object

```typescript
// SETTING: Automatically stringified and saved to 'myApp_theme'
storage.theme = "dark";

// GETTING: Automatically parsed and typed
if (storage.theme === "dark") {
  console.log("Dark mode active!");
}
```

### 🛠️ Architecture Decisions

Why Proxy?
I chose the Proxy API over a standard Class-based approach to improve Developer Experience (DX). By intercepting `get` and `set` traps, we eliminate the need for `.getItem()` or `.setItem()` methods, making the storage feel "native" to JavaScript.

Type Safety via Generics
The library uses TypeScript Generics to map the user-provided interface to the Proxy. This ensures that if a developer tries to assign a `string` to a `number` field, the IDE will catch the error before the code even runs.

The "Storage Driver" Strategy
By implementing a common interface for `localStorage` and `sessionStorage`, the library remains agnostic of the underlying engine. This makes it easy to extend with a "Mock Driver" for server-side rendering (SSR) or testing environments.
