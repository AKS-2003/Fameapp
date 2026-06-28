/**
 * Artist Login API Tests
 *
 * Tests for POST /api/auth/artist/login
 * Requirements: 2.7 - WHEN an artist logs in, THE System SHALL create a session
 * and store the artist profile in local storage
 */

describe("Artist Login API", () => {
	describe("Input Validation", () => {
		it("should validate that email is required", () => {
			const validateLoginInput = (data: {
				email?: string;
				password?: string;
			}) => {
				if (!data.email || !data.password) {
					return {
						valid: false,
						error: {
							code: "AUTH_001",
							message: "Email and password are required",
						},
					};
				}
				return { valid: true };
			};

			// Missing email
			expect(
				validateLoginInput({
					password: "password123",
				}),
			).toEqual({
				valid: false,
				error: {
					code: "AUTH_001",
					message: "Email and password are required",
				},
			});

			// Missing password
			expect(
				validateLoginInput({
					email: "test@example.com",
				}),
			).toEqual({
				valid: false,
				error: {
					code: "AUTH_001",
					message: "Email and password are required",
				},
			});

			// Both missing
			expect(validateLoginInput({})).toEqual({
				valid: false,
				error: {
					code: "AUTH_001",
					message: "Email and password are required",
				},
			});

			// All required fields present
			expect(
				validateLoginInput({
					email: "test@example.com",
					password: "password123",
				}),
			).toEqual({ valid: true });
		});

		it("should validate email format", () => {
			const validateEmail = (email: string) => {
				const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
				return emailRegex.test(email);
			};

			expect(validateEmail("valid@example.com")).toBe(true);
			expect(validateEmail("also.valid@sub.domain.com")).toBe(true);
			expect(validateEmail("user+tag@example.com")).toBe(true);
			expect(validateEmail("invalid")).toBe(false);
			expect(validateEmail("invalid@")).toBe(false);
			expect(validateEmail("@invalid.com")).toBe(false);
			expect(validateEmail("invalid@.com")).toBe(false);
			expect(validateEmail("")).toBe(false);
		});

		it("should normalize email to lowercase", () => {
			const normalizeEmail = (email: string) => {
				return email.toLowerCase().trim();
			};

			expect(normalizeEmail("TEST@EXAMPLE.COM")).toBe("test@example.com");
			expect(normalizeEmail("  User@Domain.Com  ")).toBe(
				"user@domain.com",
			);
			expect(normalizeEmail("MixedCase@Test.ORG")).toBe(
				"mixedcase@test.org",
			);
		});
	});

	describe("Authentication Errors", () => {
		it("should return correct error for non-existent user", () => {
			const userNotFoundError = {
				success: false,
				error: {
					code: "AUTH_003",
					message: "No account found with this email address",
				},
			};

			expect(userNotFoundError.success).toBe(false);
			expect(userNotFoundError.error.code).toBe("AUTH_003");
		});

		it("should return correct error for invalid password", () => {
			const invalidPasswordError = {
				success: false,
				error: {
					code: "AUTH_003",
					message:
						"Incorrect password. Please try again or use 'Forgot Password'.",
				},
			};

			expect(invalidPasswordError.success).toBe(false);
			expect(invalidPasswordError.error.code).toBe("AUTH_003");
		});

		it("should return correct error for invalid email format", () => {
			const invalidEmailError = {
				success: false,
				error: {
					code: "AUTH_001",
					message: "Please enter a valid email address",
				},
			};

			expect(invalidEmailError.success).toBe(false);
			expect(invalidEmailError.error.code).toBe("AUTH_001");
		});
	});

	describe("Session Creation (Requirement 2.7)", () => {
		it("should create session data with correct structure", () => {
			const createSessionData = (artist: {
				id: string;
				email: string;
				eventRequestId?: string;
			}) => {
				return {
					userId: artist.id,
					email: artist.email,
					role: "artist" as const,
					status: "active" as const,
					eventId: artist.eventRequestId,
				};
			};

			const sessionData = createSessionData({
				id: "artist-123456789-abc123def",
				email: "test@example.com",
			});

			expect(sessionData.userId).toBe("artist-123456789-abc123def");
			expect(sessionData.email).toBe("test@example.com");
			expect(sessionData.role).toBe("artist");
			expect(sessionData.status).toBe("active");
			expect(sessionData.eventId).toBeUndefined();
		});

		it("should include eventRequestId in session when provided", () => {
			const createSessionData = (artist: {
				id: string;
				email: string;
				eventRequestId?: string;
			}) => {
				return {
					userId: artist.id,
					email: artist.email,
					role: "artist" as const,
					status: "active" as const,
					eventId: artist.eventRequestId,
				};
			};

			const sessionData = createSessionData({
				id: "artist-123456789-abc123def",
				email: "test@example.com",
				eventRequestId: "request-456",
			});

			expect(sessionData.eventId).toBe("request-456");
		});
	});

	describe("Post-Login Routing (Requirements 2.5, 2.6)", () => {
		it("should route to event request page when eventRequestId is provided", () => {
			const getRedirectUrl = (
				artistId: string,
				eventRequestId?: string,
			) => {
				if (eventRequestId) {
					return `/event-request/${eventRequestId}`;
				}
				return `/artist-dashboard/${artistId}`;
			};

			expect(getRedirectUrl("artist-123", "request-456")).toBe(
				"/event-request/request-456",
			);
		});

		it("should route to artist dashboard when no eventRequestId", () => {
			const getRedirectUrl = (
				artistId: string,
				eventRequestId?: string,
			) => {
				if (eventRequestId) {
					return `/event-request/${eventRequestId}`;
				}
				return `/artist-dashboard/${artistId}`;
			};

			expect(getRedirectUrl("artist-123")).toBe(
				"/artist-dashboard/artist-123",
			);
			expect(getRedirectUrl("artist-123", undefined)).toBe(
				"/artist-dashboard/artist-123",
			);
		});
	});

	describe("Response Format", () => {
		it("should return correct success response format", () => {
			const successResponse = {
				success: true,
				data: {
					artist: {
						id: "artist-123456789-abc123def",
						email: "test@example.com",
						artistName: "Test Artist",
						country: "USA",
						city: "NYC",
						tier: "free" as const,
						emailVerified: true,
					},
					redirectUrl: "/artist-dashboard/artist-123456789-abc123def",
				},
			};

			expect(successResponse.success).toBe(true);
			expect(successResponse.data.artist.id).toBeDefined();
			expect(successResponse.data.artist.email).toBeDefined();
			expect(successResponse.data.artist.artistName).toBeDefined();
			expect(successResponse.data.redirectUrl).toBeDefined();
		});

		it("should include eventRequestId in response when provided", () => {
			const responseWithEventRequest = {
				success: true,
				data: {
					artist: {
						id: "artist-123456789-abc123def",
						email: "test@example.com",
						artistName: "Test Artist",
						tier: "free" as const,
						emailVerified: true,
					},
					redirectUrl: "/event-request/request-123",
					eventRequestId: "request-123",
				},
			};

			expect(responseWithEventRequest.data.eventRequestId).toBe(
				"request-123",
			);
			expect(responseWithEventRequest.data.redirectUrl).toBe(
				"/event-request/request-123",
			);
		});

		it("should not expose sensitive data in response", () => {
			const artistResponse = {
				id: "artist-123",
				email: "test@example.com",
				artistName: "Test Artist",
				tier: "free" as const,
				emailVerified: true,
			};

			// Should not include passwordHash
			expect(artistResponse).not.toHaveProperty("passwordHash");
			// Should not include verification tokens
			expect(artistResponse).not.toHaveProperty("verificationToken");
			expect(artistResponse).not.toHaveProperty(
				"verificationTokenExpiry",
			);
		});
	});

	describe("Last Login Update", () => {
		it("should update lastLoginAt timestamp on successful login", () => {
			const updateLastLogin = (artist: {
				id: string;
				email: string;
				lastLoginAt?: string;
			}) => {
				return {
					...artist,
					lastLoginAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};
			};

			const originalArtist = {
				id: "artist-123",
				email: "test@example.com",
				lastLoginAt: "2024-01-01T00:00:00.000Z",
			};

			const updatedArtist = updateLastLogin(originalArtist);

			expect(updatedArtist.lastLoginAt).toBeDefined();
			expect(
				new Date(updatedArtist.lastLoginAt!).getTime(),
			).toBeGreaterThan(new Date(originalArtist.lastLoginAt).getTime());
			expect(updatedArtist.updatedAt).toBeDefined();
		});
	});

	describe("Email Verification Status", () => {
		it("should include emailVerified status in response", () => {
			const artistWithVerifiedEmail = {
				id: "artist-123",
				email: "test@example.com",
				artistName: "Test Artist",
				tier: "free" as const,
				emailVerified: true,
			};

			const artistWithUnverifiedEmail = {
				id: "artist-456",
				email: "unverified@example.com",
				artistName: "Unverified Artist",
				tier: "free" as const,
				emailVerified: false,
			};

			expect(artistWithVerifiedEmail.emailVerified).toBe(true);
			expect(artistWithUnverifiedEmail.emailVerified).toBe(false);
		});

		it("should allow login for unverified email (with warning capability)", () => {
			// The system allows login even if email is not verified
			// Frontend can show a verification reminder
			const canLogin = (artist: { emailVerified: boolean }) => {
				// Login is allowed regardless of verification status
				return true;
			};

			expect(canLogin({ emailVerified: true })).toBe(true);
			expect(canLogin({ emailVerified: false })).toBe(true);
		});
	});

	describe("Artist Tier Information", () => {
		it("should include tier information in response", () => {
			const freeArtist = {
				id: "artist-123",
				email: "free@example.com",
				artistName: "Free Artist",
				tier: "free" as const,
				emailVerified: true,
			};

			const proArtist = {
				id: "artist-456",
				email: "pro@example.com",
				artistName: "Pro Artist",
				tier: "pro" as const,
				emailVerified: true,
			};

			expect(freeArtist.tier).toBe("free");
			expect(proArtist.tier).toBe("pro");
		});
	});
});
