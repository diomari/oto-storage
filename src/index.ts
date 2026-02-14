interface StorageOptions {
  prefix?: string;
  type?: "local" | "session";
}

export function oto<T extends object>(options: StorageOptions = {}): T {
  const { prefix = "", type = "local" } = options;
  const storage =
    typeof window !== "undefined"
      ? type === "session"
        ? window.sessionStorage
        : window.localStorage
      : ({} as Storage);

  return new Proxy({} as T, {
    get(target, prop: string) {
      if (prop === "clearAll") {
        return () => {
          Object.keys(storage).forEach((key) => {
            if (key.startsWith(prefix)) storage.removeItem(key);
          });
        };
      }
      const value = storage.getItem(`${prefix}${prop}`);
      if (value === null) return undefined;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    },
    set(target, prop: string, value: any) {
      try {
        const stringValue = JSON.stringify(value);
        storage.setItem(`${prefix}${prop}`, stringValue);
        return true;
      } catch (error) {
        console.error(`TypedProxy: Failed to save ${prop}`, error);
        return false;
      }
    },
    has(target, prop: string) {
      return storage.getItem(`${prefix}${prop}`) !== null;
    },
    deleteProperty(target, prop: string) {
      const key = `${prefix}${String(prop)}`;
      storage.removeItem(key);
      if (prop in target) {
        delete (target as any)[prop];
      }
      return true;
    },
  });
}

export const version = "1.0.0";
export type { StorageOptions };
