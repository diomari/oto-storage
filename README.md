![Oto mascot](https://private-user-images.githubusercontent.com/1720539/549868330-cf61ef7d-956e-4c5f-af5e-a8439bd95e3b.jpg?jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmF3LmdpdGh1YnVzZXJjb250ZW50LmNvbSIsImtleSI6ImtleTUiLCJleHAiOjE3NzEwNjIxMDUsIm5iZiI6MTc3MTA2MTgwNSwicGF0aCI6Ii8xNzIwNTM5LzU0OTg2ODMzMC1jZjYxZWY3ZC05NTZlLTRjNWYtYWY1ZS1hODQzOWJkOTVlM2IuanBnP1gtQW16LUFsZ29yaXRobT1BV1M0LUhNQUMtU0hBMjU2JlgtQW16LUNyZWRlbnRpYWw9QUtJQVZDT0RZTFNBNTNQUUs0WkElMkYyMDI2MDIxNCUyRnVzLWVhc3QtMSUyRnMzJTJGYXdzNF9yZXF1ZXN0JlgtQW16LURhdGU9MjAyNjAyMTRUMDkzNjQ1WiZYLUFtei1FeHBpcmVzPTMwMCZYLUFtei1TaWduYXR1cmU9NmVjYWY4NTczYzEyMTJjOTIwZjdkNjA0MGViNTVjMmI5ZTY1NGM0M2E5NjdlMjkyYWViOTdlODFlZWJkMGQzNyZYLUFtei1TaWduZWRIZWFkZXJzPWhvc3QifQ.FWuaQKYm55J5PO0tg4E-mrTE2ZcaqWhNueyhCCZPsyk)

# Oto Storage

A lightweight, Proxy-based wrapper for `localStorage` and `sessionStorage` with full TypeScript type safety.

### ⚡ The Problem

Working with browser storage usually involves repetitive `JSON.parse` and `JSON.stringify` calls, manual key prefixing to avoid collisions, and a total lack of Type Safety.

```typescript
// The old, "clunky" way
const user = JSON.parse(localStorage.getItem("user_data") || "{}");
localStorage.setItem("user_data", JSON.stringify({ ...user, theme: "dark" }));
```

### ✨ The Solution

Oto storage uses the JavaScript Proxy API to let you interact with browser storage as if it were a local object. It handles serialization, prefixing, and type-checking automatically.

**Key Features**

- Type-Safe: Full autocomplete and build-time error checking.

- Zero Boilerplate: No more manual JSON parsing.

- Driver Support: Switch between localStorage and sessionStorage with one flag.

- Collision Protection: Automatic key prefixing (namespacing).

### 🚀 Quick Start

**_1. Define your Schema_**

```typescript
interface AppStorage {
  theme: "light" | "dark";
  viewCount: number;
  user: { id: string; name: string } | null;
}
```

**_2. Initialize_**

```typescript
import { oto } from "oto-storage";

const storage = oto<AppStorage>({
  prefix: "myApp-",
  driver: "local", // or 'session'
});
```

**_3. Use it like a regular object_**

```typescript
// SETTING: Automatically stringified and saved to 'myApp_theme'
storage.theme = "dark";

// GETTING: Automatically parsed and typed
if (storage.theme === "dark") {
  console.log("Dark mode active!");
}

// DELETE: Delete the key-value pair from storage
delete storage.theme;

// CLEAR: Clear entire record
storage.clearAll();
```

### 🛠️ Architecture Decisions

**_Why Proxy?_**
Choosing Proxy API over standard Class-based approach improves Developer Experience (DX). By intercepting `get` and `set` traps, we eliminate the need for `.getItem()` or `.setItem()` methods, making the storage feel "native" to JavaScript.

**_Type Safety via Generics_**
The library uses TypeScript Generics to map the user-provided interface to the Proxy. This ensures that if a developer tries to assign a `string` to a `number` field, the IDE will catch the error before the code even runs.
