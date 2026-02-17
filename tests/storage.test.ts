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
            key: vi.fn(
                (index: number) => Object.keys(mockStorage)[index] || null,
            ),
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
            expect(window.localStorage.getItem).toHaveBeenCalledWith(
                "auth_token",
            );
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
            const storage = oto<{
                users: Array<{ id: number; name: string }>;
            }>();
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
            expect(window.localStorage.removeItem).toHaveBeenCalledWith(
                "toDelete",
            );
        });

        it("should delete a property with prefix", () => {
            const storage = oto<{ item: string }>({ prefix: "pre_" });
            storage.item = "test";
            delete storage.item;
            expect(window.localStorage.removeItem).toHaveBeenCalledWith(
                "pre_item",
            );
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

            const consoleErrorSpy = vi
                .spyOn(console, "error")
                .mockImplementation();

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

            const consoleErrorSpy = vi
                .spyOn(console, "error")
                .mockImplementation();

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

    describe("Nested Property Updates", () => {
        it("should update nested object properties", () => {
            const storage = oto<{ user: { name: string; age: number } }>();
            storage.user = { name: "Alice", age: 30 };

            // Update nested property
            storage.user.name = "Bob";

            expect(storage.user.name).toBe("Bob");
            expect(storage.user.age).toBe(30);
            expect(storage.user).toEqual({ name: "Bob", age: 30 });
        });

        it("should handle deeply nested property updates", () => {
            const storage = oto<{
                config: { theme: { colors: { primary: string } } };
            }>();
            storage.config = { theme: { colors: { primary: "#ff0000" } } };

            // Update deeply nested property
            storage.config.theme.colors.primary = "#00ff00";

            expect(storage.config.theme.colors.primary).toBe("#00ff00");
            expect(storage.config).toEqual({
                theme: { colors: { primary: "#00ff00" } },
            });
        });

        it("should create nested objects when setting deep properties", () => {
            const storage = oto<{ user: { profile?: { bio?: string } } }>();
            storage.user = { profile: {} };

            // Set deeply nested property that doesn't exist yet
            storage.user.profile!.bio = "Hello World";

            expect(storage.user.profile?.bio).toBe("Hello World");
        });

        it("should handle multiple nested property updates", () => {
            const storage = oto<{
                settings: { theme: string; lang: string };
            }>();
            storage.settings = { theme: "light", lang: "en" };

            storage.settings.theme = "dark";
            storage.settings.lang = "fr";

            expect(storage.settings).toEqual({ theme: "dark", lang: "fr" });
        });
    });

    describe("Default Values", () => {
        it("should return default values when key does not exist", () => {
            const storage = oto<{
                theme: "light" | "dark";
                count: number;
            }>({
                defaults: {
                    theme: "light",
                    count: 0,
                },
            });

            expect(storage.theme).toBe("light");
            expect(storage.count).toBe(0);
        });

        it("should override defaults with stored values", () => {
            const storage = oto<{ theme: "light" | "dark" }>({
                defaults: { theme: "light" },
            });

            storage.theme = "dark";
            expect(storage.theme).toBe("dark");
        });

        it("should deep merge nested defaults", () => {
            const storage = oto<{
                user: { name: string; role: string; active: boolean };
            }>({
                defaults: {
                    user: { name: "Anonymous", role: "guest", active: false },
                },
            });

            // Only set name, other defaults should remain
            storage.user = { name: "Alice" } as any;
            expect(storage.user.name).toBe("Alice");
            expect(storage.user.role).toBe("guest");
            expect(storage.user.active).toBe(false);
        });

        it("should apply defaults to nested property access", () => {
            const storage = oto<{
                config: { theme: string; lang: string };
            }>({
                defaults: {
                    config: { theme: "light", lang: "en" },
                },
            });

            // Access nested property without setting parent first
            expect(storage.config.theme).toBe("light");
            expect(storage.config.lang).toBe("en");
        });

        it("should return undefined for keys without defaults when not stored", () => {
            const storage = oto<{ existing: string; missing?: string }>({
                defaults: { existing: "default" },
            });

            expect(storage.existing).toBe("default");
            expect(storage.missing).toBeUndefined();
        });
    });

    describe("TTL / Expiration", () => {
        it("should store value with TTL wrapper when ttl is set", () => {
            const storage = oto<{ token: string }>({
                ttl: 3600000, // 1 hour
            });

            storage.token = "abc123";

            // Check that the stored value has TTL structure
            const stored = mockStorage["token"];
            expect(stored).toBeDefined();
            const parsed = JSON.parse(stored);
            expect(parsed).toHaveProperty("__oto_value");
            expect(parsed).toHaveProperty("__oto_expires");
            expect(parsed.__oto_value).toBe("abc123");
            expect(typeof parsed.__oto_expires).toBe("number");
        });

        it("should return value when not expired", () => {
            const storage = oto<{ token: string }>({
                ttl: 3600000,
            });

            storage.token = "abc123";
            expect(storage.token).toBe("abc123");
        });

        it("should auto-delete and return undefined when expired", () => {
            const storage = oto<{ token: string }>({
                ttl: 1000, // 1 second
            });

            storage.token = "abc123";
            expect(storage.token).toBe("abc123");

            // Simulate time passing by manually setting expired timestamp
            const stored = JSON.parse(mockStorage["token"]);
            stored.__oto_expires = Date.now() - 1000; // Expired 1 second ago
            mockStorage["token"] = JSON.stringify(stored);

            // Access should auto-delete and return undefined
            expect(storage.token).toBeUndefined();
            expect(mockStorage["token"]).toBeUndefined();
        });

        it("should work with defaults when value expires", () => {
            const storage = oto<{ theme: "light" | "dark" }>({
                ttl: 1000,
                defaults: { theme: "light" },
            });

            storage.theme = "dark";
            expect(storage.theme).toBe("dark");

            // Expire the value
            const stored = JSON.parse(mockStorage["theme"]);
            stored.__oto_expires = Date.now() - 1000;
            mockStorage["theme"] = JSON.stringify(stored);

            // Should return default after expiration
            expect(storage.theme).toBe("light");
        });

        it("should handle nested object updates with TTL", () => {
            const storage = oto<{
                user: { name: string; role: string };
            }>({
                ttl: 3600000,
            });

            storage.user = { name: "Alice", role: "admin" };
            expect(storage.user.name).toBe("Alice");

            // Update nested property
            storage.user.name = "Bob";
            expect(storage.user.name).toBe("Bob");
            expect(storage.user.role).toBe("admin");

            // Verify TTL wrapper is still applied
            const stored = JSON.parse(mockStorage["user"]);
            expect(stored).toHaveProperty("__oto_value");
            expect(stored.__oto_value.name).toBe("Bob");
        });
    });

    describe("Encryption", () => {
        const encryption = {
            encrypt: (plainText: string) => btoa(`key:${plainText}`),
            decrypt: (cipherText: string) => {
                const decoded = atob(cipherText);
                if (!decoded.startsWith("key:")) {
                    throw new Error("Invalid key");
                }
                return decoded.slice(4);
            },
        };

        it("should store encrypted envelope when encryption is enabled", () => {
            const storage = oto<{ token: string }>({ encryption });
            storage.token = "abc123";

            const rawStored = mockStorage["token"];
            const parsed = JSON.parse(rawStored);
            expect(parsed).toEqual({
                __oto_encrypted: true,
                __oto_payload: expect.any(String),
            });
            expect(rawStored.includes("abc123")).toBe(false);
        });

        it("should read encrypted values correctly", () => {
            const storage = oto<{ token: string }>({ encryption });
            storage.token = "abc123";
            expect(storage.token).toBe("abc123");
        });

        it("should handle nested updates with encryption enabled", () => {
            const storage = oto<{ user: { name: string; role: string } }>({
                encryption,
            });

            storage.user = { name: "Alice", role: "admin" };
            storage.user.name = "Bob";

            expect(storage.user.name).toBe("Bob");
            expect(storage.user.role).toBe("admin");

            const parsed = JSON.parse(mockStorage["user"]);
            expect(parsed.__oto_encrypted).toBe(true);
            expect(parsed.__oto_payload).toEqual(expect.any(String));
        });

        it("should apply TTL and encryption together", () => {
            const storage = oto<{ token: string }>({
                ttl: 1000,
                encryption,
            });

            storage.token = "abc123";
            expect(storage.token).toBe("abc123");

            const wrapped = JSON.parse(mockStorage["token"]);
            const ttlPayload = JSON.parse(encryption.decrypt(wrapped.__oto_payload));
            ttlPayload.__oto_expires = Date.now() - 1000;
            wrapped.__oto_payload = encryption.encrypt(JSON.stringify(ttlPayload));
            mockStorage["token"] = JSON.stringify(wrapped);

            expect(storage.token).toBeUndefined();
            expect(mockStorage["token"]).toBeUndefined();
        });

        it("should migrate plain JSON values when migrate is enabled", () => {
            mockStorage["profile"] = JSON.stringify({ name: "Alice" });

            const storage = oto<{ profile: { name: string } }>({
                encryption: { ...encryption, migrate: true },
            });

            expect(storage.profile.name).toBe("Alice");

            const migrated = JSON.parse(mockStorage["profile"]);
            expect(migrated.__oto_encrypted).toBe(true);
            expect(storage.profile.name).toBe("Alice");
        });

        it("should remove value when decryption fails", () => {
            const storage = oto<{ token?: string }>({
                encryption,
                defaults: { token: "fallback" },
            });

            mockStorage["token"] = JSON.stringify({
                __oto_encrypted: true,
                __oto_payload: "invalid-cipher",
            });

            expect(storage.token).toBe("fallback");
            expect(mockStorage["token"]).toBeUndefined();
        });
    });
});
