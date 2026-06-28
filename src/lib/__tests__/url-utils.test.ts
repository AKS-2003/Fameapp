import { getBaseUrl, getClientBaseUrl } from "../url-utils";

describe("URL Utils", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		// Reset environment before each test
		jest.resetModules();
		process.env = { ...originalEnv };
		delete process.env.NEXT_PUBLIC_BASE_URL;
		delete process.env.PORT;
	});

	afterAll(() => {
		process.env = originalEnv;
	});

	describe("getBaseUrl", () => {
		it("should return NEXT_PUBLIC_BASE_URL if set and not localhost", () => {
			process.env.NEXT_PUBLIC_BASE_URL = "https://custom.domain.com";
			expect(getBaseUrl()).toBe("https://custom.domain.com");
		});

		it("should ignore localhost NEXT_PUBLIC_BASE_URL in production", () => {
			process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
			process.env.PORT = "8080";
			expect(getBaseUrl()).toBe("https://www.fameservices.org");
		});

		it("should return production URL when PORT is set", () => {
			process.env.PORT = "8080";
			expect(getBaseUrl()).toBe("https://www.fameservices.org");
		});

		it("should return localhost in development", () => {
			expect(getBaseUrl()).toBe("http://localhost:3000");
		});

		it("should prefer x-forwarded-host over host header", () => {
			const headers = new Headers();
			headers.set("host", "0.0.0.0:8080");
			headers.set("x-forwarded-host", "www.fameservices.org");
			headers.set("x-forwarded-proto", "https");
			expect(getBaseUrl(headers)).toBe("https://www.fameservices.org");
		});

		it("should use host header when x-forwarded-host is not set", () => {
			const headers = new Headers();
			headers.set("host", "example.com");
			headers.set("x-forwarded-proto", "https");
			expect(getBaseUrl(headers)).toBe("https://example.com");
		});

		it("should skip 0.0.0.0 host and fall back to production URL", () => {
			process.env.PORT = "8080";
			const headers = new Headers();
			headers.set("host", "0.0.0.0:8080");
			expect(getBaseUrl(headers)).toBe("https://www.fameservices.org");
		});

		it("should default to https when x-forwarded-proto is not set with headers", () => {
			const headers = new Headers();
			headers.set("x-forwarded-host", "example.com");
			expect(getBaseUrl(headers)).toBe("https://example.com");
		});
	});

	describe("getClientBaseUrl", () => {
		it("should return NEXT_PUBLIC_BASE_URL if set", () => {
			process.env.NEXT_PUBLIC_BASE_URL = "https://custom.domain.com";
			expect(getClientBaseUrl()).toBe("https://custom.domain.com");
		});

		it("should return localhost when NEXT_PUBLIC_BASE_URL is not set", () => {
			expect(getClientBaseUrl()).toBe("http://localhost:3000");
		});
	});
});
