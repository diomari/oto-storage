import { describe, it, expect, beforeEach, vi } from "vitest";
import { oto, version } from "../src/index";

describe("oto - Storage Proxy Library", () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    // Reset mock storage before each test
    mockStorage = {};

    // Mock localStorage
    const localStorageMock = {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        mockStorage = {};
      }),
      key: vi.fn((index: number) => Object.keys(mockStorage)[index] || null),
      get length() {
        return Object.keys(mockStorage).length;
      },
    };

    // Mock sessionStorage (same implementation)
    const sessionStorageMock = { ...localStorageMock };

    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    Object.defineProperty(window, "sessionStorage", {
      value: sessionStorageMock,
      writable: true,
    });
  });

  describe("Basic Operations", () => {
    it("should set and get a string value", () => {
      const storage = oto<{ name: string }>();
      storage.name = "John";
      expect(storage.name).toBe("John");
    });

    it("should set and get a number value", () => {
      const storage = oto<{ age: number }>();
      storage.age = 25;
      expect(storage.age).toBe(25);
    });

    it("should set and get a boolean value", () => {
      const storage = oto<{ isActive: boolean }>();
      storage.isActive = true;
      expect(storage.isActive).toBe(true);
    });

    it("should set and get an object", () => {
      const storage = oto<{ user: { name: string; age: number } }>();
      const user = { name: "Alice", age: 30 };
      storage.user = user;
      expect(storage.user).toEqual(user);
    });

    it("should set and get an array", () => {
      const storage = oto<{ items: string[] }>();
      const items = ["apple", "banana", "orange"];
      storage.items = items;
      expect(storage.items).toEqual(items);
    });

    it("should set and get null", () => {
      const storage = oto<{ value: null }>();
      storage.value = null;
      expect(storage.value).toBe(null);
    });

    it("should return undefined for non-existent keys", () => {
      const storage = oto<{ missing?: string }>();
      expect(storage.missing).toBeUndefined();
    });
  });

  describe("Storage Type Selection", () => {
    it("should use localStorage by default", () => {
      const storage = oto<{ test: string }>();
      storage.test = "value";
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "test",
        '"value"',
      );
    });

    it("should use localStorage when type is 'local'", () => {
      const storage = oto<{ test: string }>({ type: "local" });
      storage.test = "value";
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "test",
        '"value"',
      );
    });

    it("should use sessionStorage when type is 'session'", () => {
      const storage = oto<{ test: string }>({ type: "session" });
      storage.test = "value";
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        "test",
        '"value"',
      );
    });
  });

  describe("Prefix Functionality", () => {
    it("should apply prefix to storage keys", () => {
      const storage = oto<{ name: string }>({ prefix: "app_" });
      storage.name = "John";
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "app_name",
        '"John"',
      );
    });

    it("should retrieve values with prefix", () => {
      const storage = oto<{ token: string }>({ prefix: "auth_" });
      storage.token = "abc123";
      expect(storage.token).toBe("abc123");
      expect(window.localStorage.getItem).toHaveBeenCalledWith("auth_token");
    });

    it("should handle empty prefix", () => {
      const storage = oto<{ key: string }>({ prefix: "" });
      storage.key = "value";
      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "key",
        '"value"',
      );
    });
  });

  describe("Complex Data Types", () => {
    it("should handle nested objects", () => {
      const storage = oto<{
        config: { theme: { colors: { primary: string } } };
      }>();
      const config = { theme: { colors: { primary: "#ff0000" } } };
      storage.config = config;
      expect(storage.config).toEqual(config);
    });

    it("should handle arrays of objects", () => {
      const storage = oto<{ users: Array<{ id: number; name: string }> }>();
      const users = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ];
      storage.users = users;
      expect(storage.users).toEqual(users);
    });

    it("should handle mixed type arrays", () => {
      const storage = oto<{ mixed: Array<string | number | boolean> }>();
      const mixed = ["hello", 42, true, "world", 0, false];
      storage.mixed = mixed;
      expect(storage.mixed).toEqual(mixed);
    });

    it("should handle Date objects", () => {
      const storage = oto<{ timestamp: Date }>();
      const date = new Date("2024-01-01");
      storage.timestamp = date;
      // Note: Dates are serialized as strings
      expect(storage.timestamp).toBe(date.toISOString());
    });
  });

  describe("Property Existence Check", () => {
    it("should return true for existing properties", () => {
      const storage = oto<{ exists: string }>();
      storage.exists = "yes";
      expect("exists" in storage).toBe(true);
    });

    it("should return false for non-existing properties", () => {
      const storage = oto<{ missing?: string }>();
      expect("missing" in storage).toBe(false);
    });

    it("should work with prefix", () => {
      const storage = oto<{ key: string }>({ prefix: "test_" });
      storage.key = "value";
      expect("key" in storage).toBe(true);
    });
  });

  describe("Delete Property", () => {
    it("should delete a property", () => {
      const storage = oto<{ toDelete: string }>();
      storage.toDelete = "value";
      expect(storage.toDelete).toBe("value");

      delete storage.toDelete;
      expect(storage.toDelete).toBeUndefined();
      expect(window.localStorage.removeItem).toHaveBeenCalledWith("toDelete");
    });

    it("should delete a property with prefix", () => {
      const storage = oto<{ item: string }>({ prefix: "pre_" });
      storage.item = "test";
      delete storage.item;
      expect(window.localStorage.removeItem).toHaveBeenCalledWith("pre_item");
    });

    it("should handle deleting non-existent properties", () => {
      const storage = oto<{ missing?: string }>();
      expect(() => delete storage.missing).not.toThrow();
    });
  });

  describe("clearAll Method", () => {
    it("should clear all items without prefix", () => {
      const storage = oto<{ a: string; b: string; c: string }>();
      storage.a = "1";
      storage.b = "2";
      storage.c = "3";

      mockStorage = { a: '"1"', b: '"2"', c: '"3"' };

      (storage as any).clearAll();

      expect(mockStorage).toEqual({});
    });

    it("should clear only items with matching prefix", () => {
      const storage = oto<{ x: string; y: string }>({ prefix: "app_" });

      // Simulate storage with mixed prefixes
      mockStorage = {
        app_x: '"1"',
        app_y: '"2"',
        other_z: '"3"',
      };

      (storage as any).clearAll();

      expect(mockStorage).toEqual({ other_z: '"3"' });
    });

    it("should not affect other prefixes", () => {
      const storage1 = oto<{ key: string }>({ prefix: "user_" });
      const storage2 = oto<{ key: string }>({ prefix: "admin_" });

      mockStorage = {
        user_key: '"user-value"',
        admin_key: '"admin-value"',
      };

      (storage1 as any).clearAll();

      expect(mockStorage).toEqual({ admin_key: '"admin-value"' });
    });
  });

  describe("Error Handling", () => {
    it("should handle circular reference in setItem", () => {
      const storage = oto<{ circular: any }>();
      const circular: any = { name: "test" };
      circular.self = circular;

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

      storage.circular = circular;

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls[0][0]).toContain(
        "Failed to save circular",
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle storage quota exceeded", () => {
      const storage = oto<{ large: string }>();

      vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation();

      storage.large = "x".repeat(10000000);

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should handle invalid JSON in getItem", () => {
      const storage = oto<{ invalid: any }>();

      mockStorage["invalid"] = "not-valid-json{";

      // Should return the raw string if JSON parsing fails
      expect(storage.invalid).toBe("not-valid-json{");
    });

    it("should handle plain string values without JSON wrapping", () => {
      const storage = oto<{ plain: string }>();

      // Simulate a plain string stored directly (not JSON)
      mockStorage["plain"] = "raw-string-value";

      expect(storage.plain).toBe("raw-string-value");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string values", () => {
      const storage = oto<{ empty: string }>();
      storage.empty = "";
      expect(storage.empty).toBe("");
    });

    it("should handle zero value", () => {
      const storage = oto<{ zero: number }>();
      storage.zero = 0;
      expect(storage.zero).toBe(0);
    });

    it("should handle false value", () => {
      const storage = oto<{ flag: boolean }>();
      storage.flag = false;
      expect(storage.flag).toBe(false);
    });

    it("should handle special characters in keys", () => {
      const storage = oto<{ "special-key": string }>();
      storage["special-key"] = "value";
      expect(storage["special-key"]).toBe("value");
    });

    it("should handle unicode characters", () => {
      const storage = oto<{ emoji: string }>();
      storage.emoji = "🎉🎊✨";
      expect(storage.emoji).toBe("🎉🎊✨");
    });

    it("should handle very long strings", () => {
      const storage = oto<{ long: string }>();
      const longString = "a".repeat(10000);
      storage.long = longString;
      expect(storage.long).toBe(longString);
    });
  });

  describe("Type Safety", () => {
    it("should work with typed interfaces", () => {
      interface UserStorage {
        userId: number;
        username: string;
        preferences: {
          theme: "light" | "dark";
          notifications: boolean;
        };
      }

      const storage = oto<UserStorage>();

      storage.userId = 123;
      storage.username = "alice";
      storage.preferences = {
        theme: "dark",
        notifications: true,
      };

      expect(storage.userId).toBe(123);
      expect(storage.username).toBe("alice");
      expect(storage.preferences).toEqual({
        theme: "dark",
        notifications: true,
      });
    });
  });

  describe("Version Export", () => {
    it("should export version", () => {
      expect(version).toBe("1.0.0");
    });
  });

  describe("Non-Browser Environment", () => {
    it("should handle missing window object gracefully", () => {
      const originalWindow = global.window;

      // @ts-ignore
      delete global.window;

      expect(() => {
        const storage = oto<{ test: string }>();
        storage.test = "value";
      }).not.toThrow();

      global.window = originalWindow;
    });
  });

  describe("Multiple Instances", () => {
    it("should work with multiple independent storage instances", () => {
      const storage1 = oto<{ key: string }>({ prefix: "s1_" });
      const storage2 = oto<{ key: string }>({ prefix: "s2_" });

      storage1.key = "value1";
      storage2.key = "value2";

      expect(storage1.key).toBe("value1");
      expect(storage2.key).toBe("value2");
    });

    it("should isolate local and session storage", () => {
      const local = oto<{ data: string }>({ type: "local" });
      const session = oto<{ data: string }>({ type: "session" });

      local.data = "local-value";
      session.data = "session-value";

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "data",
        '"local-value"',
      );
      expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
        "data",
        '"session-value"',
      );
    });
  });
});
