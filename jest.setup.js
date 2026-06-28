import "@testing-library/jest-dom";

// Mock Next.js server components
global.Request = class Request {
	constructor(input, init) {
		this.url = input;
		this.method = init?.method || "GET";
		this.headers = new Map(Object.entries(init?.headers || {}));
		this.body = init?.body;
	}
};

global.Response = class Response {
	constructor(body, init) {
		this.body = body;
		this.status = init?.status || 200;
		this.headers = new Map(Object.entries(init?.headers || {}));
	}

	json() {
		return Promise.resolve(JSON.parse(this.body));
	}
};

// Mock NextRequest and NextResponse
jest.mock("next/server", () => ({
	NextRequest: class NextRequest {
		constructor(input, init) {
			this.url = input;
			this.method = init?.method || "GET";
			this.headers = new Map(Object.entries(init?.headers || {}));
			this.cookies = new Map();
			this.nextUrl = new URL(input);
		}
	},
	NextResponse: {
		json: (data, init) => ({
			status: init?.status || 200,
			headers: new Map(Object.entries(init?.headers || {})),
			json: () => Promise.resolve(data),
		}),
		redirect: (url) => ({
			status: 307,
			headers: new Map([["location", url]]),
		}),
		next: () => ({
			status: 200,
		}),
	},
}));
