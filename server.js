const { createServer } = require("http");
const { Server } = require("socket.io");
const next = require("next");
const Busboy = require("busboy");
const fs = require("fs");
const path = require("path");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";        // Next.js internal (HMR, SSR fetches)
const listenHost = "0.0.0.0";       // HTTP server bind (accepts all network interfaces)
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Store connected users
const connectedUsers = new Map();

// VPS Local Storage Configuration
const UPLOADS_ROOT = process.env.NODE_ENV === "production"
	? "/www/wwwroot/uploads"
	: path.join(process.cwd(), "uploads");

// Helper to ensure directory exists
function ensureDir(dirPath) {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
}

/**
 * Handle file uploads directly at the HTTP server level using busboy streaming.
 * This bypasses Next.js body size limits entirely — the file is streamed
 * from the client through busboy directly to the VPS Local Disk.
 */
function handleGCSUpload(req, res) {
	// Handle CORS preflight
	if (req.method === "OPTIONS") {
		res.writeHead(200, {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		});
		res.end();
		return;
	}

	if (req.method !== "POST") {
		res.writeHead(405, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "Method not allowed" }));
		return;
	}

	const corsHeaders = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Content-Type": "application/json",
	};

	let fileInfo = null;
	const fields = {};
	let uploadPromise = null;

	try {
		const busboy = Busboy({
			headers: req.headers,
			limits: {
				fileSize: 2100 * 1024 * 1024, // 2.1GB max
			},
		});

		let writeStream = null;

		busboy.on("field", (fieldname, val) => {
			fields[fieldname] = val;
		});

		busboy.on("file", (fieldname, fileStream, info) => {
			const { filename, mimeType } = info;
			const timestamp = Date.now();
			const sanitizedFileName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

			fileInfo = { filename, mimeType, sanitizedFileName, timestamp, size: 0 };

			// We'll create a temp path and move it on finish
			const tempFileName = `temp_${timestamp}_${sanitizedFileName}`;
			const tempPath = path.join(UPLOADS_ROOT, "temp", tempFileName);
			ensureDir(path.dirname(tempPath));

			writeStream = fs.createWriteStream(tempPath);
			fileStream.pipe(writeStream);

			fileStream.on("data", (chunk) => {
				fileInfo.size += chunk.length;
			});

			fileStream.on("limit", () => {
				fileInfo.limitReached = true;
			});

			uploadPromise = new Promise((resolve, reject) => {
				writeStream.on("finish", resolve);
				writeStream.on("error", reject);
			});
		});

		busboy.on("finish", async () => {
			try {
				if (uploadPromise) await uploadPromise;

				if (!fileInfo || !fileInfo.filename) {
					res.writeHead(400, corsHeaders);
					res.end(JSON.stringify({ error: "No file provided" }));
					return;
				}

				if (fileInfo.limitReached) {
					res.writeHead(413, corsHeaders);
					res.end(JSON.stringify({ error: "File too large (max 2.1GB)" }));
					return;
				}

				const eventId = fields.eventId || "";
				const artistId = fields.artistId || "";
				const fileType = fields.fileType || "";
				const folder = fields.folder || "";
				const useSimplePath = !!folder;

				if (!useSimplePath && (!eventId || !artistId || !fileType)) {
					res.writeHead(400, corsHeaders);
					res.end(JSON.stringify({ error: "Missing required parameters" }));
					return;
				}

				let filePath = useSimplePath
					? `${folder}/${fileInfo.timestamp}_${fileInfo.sanitizedFileName}`
					: `events/${eventId}/artists/${artistId}/${fileType}/${fileInfo.timestamp}_${fileInfo.sanitizedFileName}`;

				const absolutePath = path.join(UPLOADS_ROOT, filePath);
				ensureDir(path.dirname(absolutePath));

				// Move from temp to final destination
				const tempPath = path.join(UPLOADS_ROOT, "temp", `temp_${fileInfo.timestamp}_${fileInfo.sanitizedFileName}`);
				fs.renameSync(tempPath, absolutePath);

				const fileSizeMB = (fileInfo.size / 1024 / 1024).toFixed(2);
				console.log(`[Upload] Success: ${filePath} (${fileSizeMB}MB)`);

				res.writeHead(200, corsHeaders);
				res.end(JSON.stringify({
					success: true,
					data: { url: `/api/files/serve?file=${encodeURIComponent(filePath)}`, fileName: filePath },
					url: `/api/files/serve?file=${encodeURIComponent(filePath)}`,
					fileName: filePath,
					message: "File uploaded successfully to VPS",
				}));
			} catch (error) {
				console.error("[Upload] Error:", error);
				res.writeHead(500, corsHeaders);
				res.end(JSON.stringify({ error: `Failed to upload file: ${error.message}` }));
			}
		});

		busboy.on("error", (err) => {
			console.error("[Upload] Busboy error:", err);
			res.writeHead(500, corsHeaders);
			res.end(
				JSON.stringify({
					error: `Upload parsing error: ${err.message}`,
				}),
			);
		});

		req.pipe(busboy);
	} catch (error) {
		console.error("[Upload] Setup error:", error);
		res.writeHead(500, corsHeaders);
		res.end(
			JSON.stringify({ error: `Upload setup error: ${error.message}` }),
		);
	}
}

/**
 * Handle chunked file uploads directly at the HTTP server level.
 * Allows chunking large files (especially videos) on client side, uploading sequentially,
 * and joining them upon completion. Resolves timeout/interruption issues on mobile.
 */
function handleChunkUpload(req, res) {
	// Handle CORS preflight
	if (req.method === "OPTIONS") {
		res.writeHead(200, {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		});
		res.end();
		return;
	}

	if (req.method !== "POST") {
		res.writeHead(405, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ error: "Method not allowed" }));
		return;
	}

	const corsHeaders = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Content-Type": "application/json",
	};

	let fileInfo = null;
	const fields = {};
	let uploadPromise = null;

	try {
		const busboy = Busboy({
			headers: req.headers,
		});

		let writeStream = null;
		let tempChunkPath = null;

		busboy.on("field", (fieldname, val) => {
			fields[fieldname] = val;
		});

		busboy.on("file", (fieldname, fileStream, info) => {
			const { filename, mimeType } = info;
			
			// We write the chunk to a generic temp file name
			const tempChunkName = `chunk_${Date.now()}_${Math.random().toString(36).substring(7)}`;
			tempChunkPath = path.join(UPLOADS_ROOT, "temp", tempChunkName);
			ensureDir(path.dirname(tempChunkPath));

			writeStream = fs.createWriteStream(tempChunkPath);
			fileStream.pipe(writeStream);

			fileInfo = { filename, mimeType };

			uploadPromise = new Promise((resolve, reject) => {
				writeStream.on("finish", resolve);
				writeStream.on("error", reject);
			});
		});

		busboy.on("finish", async () => {
			try {
				if (uploadPromise) await uploadPromise;

				const chunkIndex = parseInt(fields.chunkIndex, 10);
				const totalChunks = parseInt(fields.totalChunks, 10);
				const uploadId = fields.uploadId;
				const originalFileName = fields.fileName || (fileInfo ? fileInfo.filename : "file");
				const eventId = fields.eventId || "";
				const artistId = fields.artistId || "";
				const fileType = fields.fileType || "";
				const folder = fields.folder || "";

				if (isNaN(chunkIndex) || isNaN(totalChunks) || !uploadId) {
					if (tempChunkPath && fs.existsSync(tempChunkPath)) {
						try { fs.unlinkSync(tempChunkPath); } catch (e) {}
					}
					res.writeHead(400, corsHeaders);
					res.end(JSON.stringify({ error: "Missing chunk index, total chunks, or uploadId" }));
					return;
				}

				// Move to UPLOADS_ROOT/temp/{uploadId}_chunk_{chunkIndex}
				const finalChunkPath = path.join(UPLOADS_ROOT, "temp", `${uploadId}_chunk_${chunkIndex}`);
				ensureDir(path.dirname(finalChunkPath));
				fs.renameSync(tempChunkPath, finalChunkPath);

				// Check if all chunks are uploaded
				let allChunksPresent = true;
				const chunkPaths = [];
				for (let i = 0; i < totalChunks; i++) {
					const p = path.join(UPLOADS_ROOT, "temp", `${uploadId}_chunk_${i}`);
					if (!fs.existsSync(p)) {
						allChunksPresent = false;
						break;
					}
					chunkPaths.push(p);
				}

				if (allChunksPresent) {
					// Combine chunks into final file
					const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9.-]/g, "_");
					const timestamp = Date.now();
					const useSimplePath = !!folder;

					let filePath = useSimplePath
						? `${folder}/${timestamp}_${sanitizedFileName}`
						: `events/${eventId}/artists/${artistId}/${fileType}/${timestamp}_${sanitizedFileName}`;

					const absolutePath = path.join(UPLOADS_ROOT, filePath);
					ensureDir(path.dirname(absolutePath));

					const finalWriteStream = fs.createWriteStream(absolutePath);

					// Combine chunks sequentially
					for (const p of chunkPaths) {
						const chunkBuffer = fs.readFileSync(p);
						finalWriteStream.write(chunkBuffer);
					}
					finalWriteStream.end();

					await new Promise((resolve, reject) => {
						finalWriteStream.on("finish", resolve);
						finalWriteStream.on("error", reject);
					});

					// Clean up chunk files
					for (const p of chunkPaths) {
						try { fs.unlinkSync(p); } catch (e) {}
					}

					const stats = fs.statSync(absolutePath);
					const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
					console.log(`[Upload-Chunk] Assembly Success: ${filePath} (${fileSizeMB}MB)`);

					res.writeHead(200, corsHeaders);
					res.end(JSON.stringify({
						success: true,
						data: { url: `/api/files/serve?file=${encodeURIComponent(filePath)}`, fileName: filePath },
						url: `/api/files/serve?file=${encodeURIComponent(filePath)}`,
						fileName: filePath,
						message: "File assembled successfully from chunks",
					}));
				} else {
					res.writeHead(200, corsHeaders);
					res.end(JSON.stringify({
						success: true,
						chunkIndex,
						message: `Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`,
					}));
				}
			} catch (error) {
				console.error("[Upload-Chunk] Error:", error);
				if (tempChunkPath && fs.existsSync(tempChunkPath)) {
					try { fs.unlinkSync(tempChunkPath); } catch (e) {}
				}
				res.writeHead(500, corsHeaders);
				res.end(JSON.stringify({ error: `Failed to upload chunk: ${error.message}` }));
			}
		});

		busboy.on("error", (err) => {
			console.error("[Upload-Chunk] Busboy error:", err);
			res.writeHead(500, corsHeaders);
			res.end(JSON.stringify({ error: `Upload chunk parsing error: ${err.message}` }));
		});

		req.pipe(busboy);
	} catch (error) {
		console.error("[Upload-Chunk] Setup error:", error);
		res.writeHead(500, corsHeaders);
		res.end(JSON.stringify({ error: `Upload chunk setup error: ${error.message}` }));
	}
}

app.prepare()
	.then(() => {
		const httpServer = createServer(
			{
				// Increase body size limit for large file uploads (500MB)
				maxHeaderSize: 1024 * 1024, // 1MB headers
			},
			(req, res) => {
				// Intercept upload routes to bypass Next.js body size limits
				if (
					req.url === "/api/gcs/upload" ||
					req.url?.startsWith("/api/gcs/upload?") ||
					req.url === "/api/storage/upload" ||
					req.url?.startsWith("/api/storage/upload?")
				) {
					handleGCSUpload(req, res);
					return;
				}
				if (
					req.url === "/api/storage/upload-chunk" ||
					req.url?.startsWith("/api/storage/upload-chunk?")
				) {
					handleChunkUpload(req, res);
					return;
				}
				// All other requests go to Next.js
				handler(req, res);
			},
		);

		// Configure server for large uploads
		httpServer.maxRequestsPerSocket = 0; // Disable keep-alive limits
		httpServer.timeout = 1800000; // 30 minutes timeout
		httpServer.headersTimeout = 1800000;
		httpServer.requestTimeout = 1800000;

		const io = new Server(httpServer, {
			cors: {
				origin: "*",
				methods: ["GET", "POST"],
			},
			// Allow both polling and websocket for maximum compatibility behind VPS/Nginx proxies.
			transports: ["polling", "websocket"],
			allowUpgrades: true,
			// Increase max HTTP buffer size for large uploads
			maxHttpBufferSize: 2100 * 1024 * 1024, // 2.1GB
		});

		global.io = io;

		io.on("connection", (socket) => {
			console.log("User connected:", socket.id);

			// Handle user authentication
			socket.on("authenticate", (data) => {
				const { userId, role, eventId } = data;
				connectedUsers.set(socket.id, {
					userId,
					role,
					eventId,
					socketId: socket.id,
				});
				socket.join(`user_${userId}`);
				socket.join(`role_${role}`);

				// Leave existing event-specific rooms before joining new ones to prevent cross-event leaks
				for (const room of socket.rooms) {
					if (room.startsWith("event_")) {
						socket.leave(room);
					}
				}

				// Join event-specific rooms for real-time updates
				if (eventId) {
					socket.join(`event_${eventId}`);
					socket.join(`event_${eventId}_${role}`);
				}

				// Special handling for super admins
				if (role === "super_admin") {
					console.log(
						`Super Admin ${userId} connected - will receive real-time notifications`,
					);
				}

				console.log(
					`User ${userId} (${role}) authenticated and joined rooms for event ${eventId}`,
				);
			});

			// Handle joining additional event rooms (e.g., artist with multiple events)
			socket.on("join_event_room", (data) => {
				const { eventId } = data;
				if (eventId) {
					socket.join(`event_${eventId}`);
					console.log(
						`Socket ${socket.id} joined event room: event_${eventId}`,
					);
				}
			});

			// Handle status updates for stage managers
			socket.on("status_update", (data) => {
				const { userId, status, message } = data;

				// Send notification to specific user
				io.to(`user_${userId}`).emit("account_status_changed", {
					status,
					message,
					timestamp: new Date().toISOString(),
				});

				console.log(`Status update sent to user ${userId}: ${status}`);
			});

			// Handle admin actions
			socket.on("admin_action", (data) => {
				const { targetUserId, action, message } = data;

				// Send notification to target user
				io.to(`user_${targetUserId}`).emit("admin_notification", {
					action,
					message,
					timestamp: new Date().toISOString(),
				});

				console.log(
					`Admin action sent to user ${targetUserId}: ${action}`,
				);
			});

			// Handle artist calling events directly from WebSocket clients
			socket.on("artist_called", (data) => {
				const { eventId, artistId, artistName, callType } = data;
				console.log(`Artist ${artistId} called for ${callType} in event ${eventId}`);
				io.to(`event_${eventId}`).emit("artist_called", {
					eventId,
					artistId,
					artistName: artistName || "Artist",
					callType,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle emergency broadcasts
			socket.on("emergency-alert", (data) => {
				const { eventId, message, emergency_code } = data;
				console.log(
					`Emergency alert for event ${eventId}: ${emergency_code} - ${message}`,
				);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("emergency-alert", {
					message,
					emergency_code,
					timestamp: new Date().toISOString(),
				});
			});

			socket.on("emergency-clear", (data) => {
				const { eventId, broadcastId } = data;
				console.log(
					`Emergency cleared for event ${eventId}: ${broadcastId}`,
				);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("emergency-clear", {
					broadcastId,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle artist status changes
			socket.on("artist_status_changed", (data) => {
				const { eventId, artistId, status, artist_name } = data;
				console.log(
					`Artist status changed for event ${eventId}: ${artist_name} -> ${status}`,
				);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("artist_status_changed", {
					eventId,
					artistId,
					status,
					artist_name,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle live board updates
			socket.on("live-board-update", (data) => {
				const { eventId, itemId, status, itemType } = data;
				console.log(
					`Live board update for event ${eventId}: ${itemType} ${itemId} -> ${status}`,
				);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("live-board-update", {
					eventId,
					itemId,
					status,
					itemType,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle performance order updates
			socket.on("performance-order-update", (data) => {
				const { eventId, type, action } = data;
				console.log(
					`Performance order update for event ${eventId}: ${type} ${action}`,
				);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("performance-order-update", {
					eventId,
					type,
					action,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle show order batch updates (drag & drop, up/down arrows, draft/confirm)
			socket.on("show-order-updated", (data) => {
				const {
					eventId,
					performanceDate,
					newOrder,
					timestamp,
					clientRequestId,
					isDraft,
					isConfirmed,
					action,
				} = data;
				console.log(
					`Show order updated for event ${eventId} on ${performanceDate}: ${action || "reorder"}${newOrder ? ` (${newOrder.length} items)` : ""}`,
				);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("show-order-updated", {
					eventId,
					performanceDate,
					newOrder,
					timestamp,
					clientRequestId,
					isDraft,
					isConfirmed,
					action,
				});
			});

			// Handle custom cue updates
			socket.on("cue_updated", (data) => {
				const { eventId, cueId, action, cue } = data;
				console.log(
					`Cue update for event ${eventId}: ${action} cue ${cueId}`,
				);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("cue_updated", {
					eventId,
					cueId,
					action,
					cue,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle artist cue notes updates (between performance order and rehearsal pages)
			socket.on("artist_cue_updated", (data) => {
				const { eventId, artistId, cue_notes } = data;
				console.log(
					`Artist cue updated for event ${eventId}: artist ${artistId}`,
				);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("artist_cue_updated", {
					...data,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle rehearsal updates
			socket.on("rehearsal_updated", (data) => {
				const { eventId, action } = data;
				console.log(`Rehearsal update for event ${eventId}: ${action}`);

				// Broadcast ALL rehearsal fields to all users connected to this event
				io.to(`event_${eventId}`).emit("rehearsal_updated", {
					...data,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle artist completion toggle (checkmark on show order)
			socket.on("artist_completion_toggled", (data) => {
				const { eventId } = data;
				console.log(`Artist completion toggled for event ${eventId}`);
				io.to(`event_${eventId}`).emit("artist_completion_toggled", {
					...data,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle cue completion toggle (checkmark on show order)
			socket.on("cue_completion_toggled", (data) => {
				const { eventId } = data;
				console.log(`Cue completion toggled for event ${eventId}`);
				io.to(`event_${eventId}`).emit("cue_completion_toggled", {
					...data,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle artist info updates (force logout)
			socket.on("artist_info_updated", (data) => {
				const { eventId, artistId, artist_name, action } = data;
				console.log(
					`Artist info updated for event ${eventId}: ${artist_name} (${artistId}) - action: ${action}`,
				);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("artist_info_updated", {
					eventId,
					artistId,
					artist_name,
					action,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle artist assignment events
			socket.on("artist_assigned", (data) => {
				const { eventId, artistId, artist_name, performance_date } =
					data;
				console.log(
					`Artist assigned for event ${eventId}: ${artist_name} (${artistId}) to ${performance_date}`,
				);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("artist_assigned", {
					eventId,
					artistId,
					artist_name,
					performance_date,
					timestamp: new Date().toISOString(),
				});

				// Also emit directly to the specific artist
				io.to(`user_artist_${artistId}`).emit("artist_assigned", {
					eventId,
					artistId,
					artist_name,
					performance_date,
					timestamp: new Date().toISOString(),
				});
			});

			socket.on("artist_unassigned", (data) => {
				const { eventId, artistId, artist_name } = data;
				console.log(
					`Artist unassigned for event ${eventId}: ${artist_name} (${artistId})`,
				);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("artist_unassigned", {
					eventId,
					artistId,
					artist_name,
					timestamp: new Date().toISOString(),
				});

				// Also emit directly to the specific artist
				io.to(`user_artist_${artistId}`).emit("artist_unassigned", {
					eventId,
					artistId,
					artist_name,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle password reset events
			socket.on("password_reset_completed", (data) => {
				const { email, userId } = data;
				console.log(
					`Password reset completed for user ${userId}: ${email}`,
				);

				// Broadcast to the specific user waiting for password reset
				io.to(`user_password_reset_${email}`).emit(
					"password_reset_completed",
					{
						email,
						userId,
						timestamp: new Date().toISOString(),
					},
				);
			});

			socket.on("password_reset_message", (data) => {
				const { email, message } = data;
				console.log(`Password reset message for ${email}: ${message}`);

				// Broadcast to the specific user waiting for password reset
				io.to(`user_password_reset_${email}`).emit(
					"password_reset_message",
					{
						email,
						message,
						timestamp: new Date().toISOString(),
					},
				);
			});

			// Handle stage manager account updates (for force logout)
			socket.on("stage_manager_account_updated", (data) => {
				const { userId, action, message } = data;
				console.log(
					`Stage manager account updated: ${userId} - ${action}`,
				);

				// Broadcast to the specific stage manager
				io.to(`user_${userId}`).emit("stage_manager_account_updated", {
					userId,
					action,
					message,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle show date info updates (for artist notifications)
			socket.on("show_date_info_updated", (data) => {
				const { eventId, showDate, showDateInfo, isNew } = data;
				console.log(
					`📋 [SERVER] Show date info updated for event ${eventId}: ${showDate} (isNew: ${isNew})`,
				);

				// Log connected users in this event room
				const room = io.sockets.adapter.rooms.get(`event_${eventId}`);
				console.log(
					`📋 [SERVER] Users in room event_${eventId}:`,
					room ? room.size : 0,
				);

				console.log(
					`📋 [SERVER] Broadcasting to room: event_${eventId}`,
				);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("show_date_info_updated", {
					eventId,
					showDate,
					showDateInfo,
					isNew,
					timestamp: new Date().toISOString(),
				});
				console.log(
					`📋 [SERVER] Broadcast complete for show_date_info_updated`,
				);
			});

			// Handle new notification events
			socket.on("new_notification", (data) => {
				const {
					eventId,
					title,
					message,
					type,
					showDate,
					targetAudience,
				} = data;
				console.log(`New notification for event ${eventId}: ${title}`);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("new_notification", {
					eventId,
					title,
					message,
					type,
					showDate,
					targetAudience,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle new chat message events
			socket.on("new_chat_message", (data) => {
				const { eventId, showDate, message, artistIds } = data;
				console.log(
					`New chat message for event ${eventId} on ${showDate}`,
				);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("new_chat_message", {
					eventId,
					showDate,
					message,
					artistIds,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle new personal message events
			socket.on("new_personal_message", (data) => {
				const { eventId, artistId, artistName, message } = data;
				console.log(
					`New personal message for artist ${artistId} in event ${eventId}`,
				);

				// Broadcast to all users connected to this event
				// The client-side will filter to show only to the target artist
				io.to(`event_${eventId}`).emit("new_personal_message", {
					eventId,
					artistId,
					artistName,
					message,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle new stage discussion message events (contract terms chat)
			socket.on("new_stage_discussion_message", (data) => {
				const { eventId, artistId, sender, message, status } = data;
				console.log(
					`New stage discussion message for artist ${artistId} in event ${eventId}`
				);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("new_stage_discussion_message", {
					eventId,
					artistId,
					sender,
					message,
					status,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle artist profile update notifications (artist saves profile from edit page)
			socket.on("artist_profile_updated", (data) => {
				const {
					eventId,
					artistId,
					artistName,
					changedFields,
					summary,
					notification,
				} = data;
				console.log(
					`Artist profile updated for event ${eventId}: ${artistName} changed [${(changedFields || []).join(", ")}]`,
				);

				// Broadcast to all users connected to this event (stage managers)
				io.to(`event_${eventId}`).emit("artist_profile_updated", {
					eventId,
					artistId,
					artistName,
					changedFields,
					summary,
					notification,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle FameLink show submission (artist submits show via join-event link)
			socket.on("famelink_show_submitted", (data) => {
				const { eventId, artistId, artistName, eventShowId, showName } =
					data;
				console.log(
					`FameLink show submitted for event ${eventId}: ${artistName} submitted "${showName}"`,
				);

				// Broadcast to all users connected to this event (stage managers)
				io.to(`event_${eventId}`).emit("famelink_show_submitted", {
					eventId,
					artistId,
					artistName,
					eventShowId,
					showName,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle event request created (stage manager invites artist)
			socket.on("event_request_created", (data) => {
				const {
					requestId,
					eventId,
					eventName,
					artistId,
					artistEmail,
					stageManagerName,
					message,
				} = data;
				console.log(
					`Event request created for event ${eventId}: ${eventName} -> artist ${artistEmail}`,
				);

				// Notify the specific artist if they're connected
				if (artistId) {
					io.to(`user_${artistId}`).emit("event_request_created", {
						requestId,
						eventId,
						eventName,
						stageManagerName,
						message,
						timestamp: new Date().toISOString(),
					});
				}

				// Also broadcast to event room so stage manager sees confirmation
				io.to(`event_${eventId}`).emit("event_request_created", {
					requestId,
					eventId,
					eventName,
					artistEmail,
					stageManagerName,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle event request responded (artist accepts/declines)
			socket.on("event_request_responded", (data) => {
				const {
					requestId,
					eventId,
					artistId,
					artistName,
					action,
					showCount,
				} = data;
				console.log(
					`Event request responded for event ${eventId}: ${artistName} -> ${action}`,
				);

				// Notify all users in the event room (stage manager)
				io.to(`event_${eventId}`).emit("event_request_responded", {
					requestId,
					eventId,
					artistId,
					artistName,
					action,
					showCount,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle timing settings updates (from performance order page)
			socket.on("timing-settings-updated", (data) => {
				const { eventId } = data;
				console.log(
					`Timing settings updated for event ${eventId}:`,
					JSON.stringify(data),
				);

				// Broadcast ALL timing fields to all users connected to this event
				io.to(`event_${eventId}`).emit("timing-settings-updated", {
					...data,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle artist backstage color updates
			socket.on("artist_color_updated", (data) => {
				const { eventId, artistId, backstage_color } = data;
				console.log(
					`Artist color updated for event ${eventId}: artist ${artistId} -> ${backstage_color}`,
				);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("artist_color_updated", {
					eventId,
					artistId,
					backstage_color,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle event setting changes (artist_edit_enabled, registration_link_enabled)
			socket.on("event_setting_changed", (data) => {
				const { eventId, field, value } = data;
				console.log(
					`Event setting changed for event ${eventId}: ${field} = ${value}`,
				);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("event_setting_changed", {
					eventId,
					field,
					value,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle artist check-in events
			socket.on("artist_checked_in", (data) => {
				const { eventId, artistId, type } = data;
				console.log(
					`Artist checked in for event ${eventId}: ${artistId} (${type})`,
				);
				io.to(`event_${eventId}`).emit("artist_checked_in", {
					...data,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle artist call events (stage manager calls specific artist)
			socket.on("artist_called", (data) => {
				const { eventId, artistId, artistName, callType } = data;
				console.log(
					`Artist called for event ${eventId}: ${artistName} (${artistId}) - ${callType}`,
				);
				io.to(`event_${eventId}`).emit("artist_called", {
					...data,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle artist call dismissed (artist closes the call dialog)
			socket.on("artist_call_dismissed", (data) => {
				const { eventId, artistId } = data;
				console.log(
					`Artist call dismissed for event ${eventId}: ${artistId}`,
				);
				io.to(`event_${eventId}`).emit("artist_call_dismissed", {
					...data,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle checklist updates (real-time sync across browsers)
			socket.on("checklist_updated", (data) => {
				const { eventId, action } = data;
				console.log(
					`Checklist updated for event ${eventId}: ${action}`,
				);

				// Broadcast to all users connected to this event
				io.to(`event_${eventId}`).emit("checklist_updated", {
					...data,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle subscription updates (real-time sync for premium system)
			socket.on("subscription_updated", (data) => {
				const { userId, email, subscription } = data;
				console.log(
					`Subscription updated for user ${userId || email}: ${subscription?.plan_type}`,
				);

				// Notify the specific user
				if (userId) {
					io.to(`user_${userId}`).emit("subscription_updated", {
						...data,
						timestamp: new Date().toISOString(),
					});
				}

				// Notify super admins
				io.to("role_super_admin").emit("subscription_updated", {
					...data,
					timestamp: new Date().toISOString(),
				});
			});

			// ===================== ARTIST CONTRACTS MODULE =====================

			// Handle contract artist updates (create, update, delete)
			socket.on("contract_artist_updated", (data) => {
				const { eventId, action, artistId, artist } = data;
				console.log(
					`Contract artist ${action} for event ${eventId}: ${artist?.stageName || artistId}`,
				);
				io.to(`event_${eventId}`).emit("contract_artist_updated", {
					...data,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle contract invitation created
			socket.on("contract_invitation_created", (data) => {
				const { eventId, invitation, bulk } = data;
				console.log(
					`Contract invitation created for event ${eventId}: ${bulk ? "bulk" : invitation?.artistName}`,
				);
				io.to(`event_${eventId}`).emit("contract_invitation_created", {
					...data,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle contract conversation message
			socket.on("contract_message_new", (data) => {
				const { eventId, message } = data;
				console.log(
					`Contract message for event ${eventId}: ${message?.senderName} -> ${message?.artistId}`,
				);
				io.to(`event_${eventId}`).emit("contract_message_new", {
					...data,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle contract payment updated
			socket.on("contract_payment_updated", (data) => {
				const { eventId, artistId, category } = data;
				console.log(
					`Contract payment updated for event ${eventId}: artist ${artistId}, category ${category}`,
				);
				io.to(`event_${eventId}`).emit("contract_payment_updated", {
					...data,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle contract status changed
			socket.on("contract_status_changed", (data) => {
				const { eventId, artistId, artistName, oldStatus, newStatus } =
					data;
				console.log(
					`Contract status changed for event ${eventId}: ${artistName} ${oldStatus} -> ${newStatus}`,
				);
				io.to(`event_${eventId}`).emit("contract_status_changed", {
					...data,
					timestamp: new Date().toISOString(),
				});
				// Also notify the specific artist if they have a famelinkArtistId
				if (data.famelinkArtistId) {
					io.to(`user_${data.famelinkArtistId}`).emit(
						"contract_invite_update",
						{
							...data,
							timestamp: new Date().toISOString(),
						},
					);
				}
			});

			// Handle contract action from artist (approve, sign, message, etc.)
			socket.on("contract_action", (data) => {
				const { eventId, artistId, action, artistName } = data;
				console.log(
					`Contract action from artist for event ${eventId}: ${artistName} -> ${action}`,
				);
				// Broadcast to the event room so organizer's useContractData picks it up
				// Emit as contract_artist_updated so the existing hooks handle it
				io.to(`event_${eventId}`).emit("contract_artist_updated", {
					eventId,
					action: "update",
					artistId,
					artistName,
					artistAction: action,
					timestamp: new Date().toISOString(),
				});
				// Also emit the specific action event for toast notifications
				io.to(`event_${eventId}`).emit("contract_action", {
					...data,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle contract invite notification to artist
			socket.on("contract_invite_sent", (data) => {
				const { famelinkArtistId, eventName, eventId } = data;
				console.log(
					`Contract invite sent to FameLink artist ${famelinkArtistId} for ${eventName}`,
				);
				// Notify the specific artist user room
				if (famelinkArtistId) {
					io.to(`user_${famelinkArtistId}`).emit(
						"contract_invite_sent",
						{
							...data,
							type: "new_invite",
							timestamp: new Date().toISOString(),
						},
					);
				}
				// Also broadcast to the event room so any connected artist picks it up
				if (eventId) {
					io.to(`event_${eventId}`).emit(
						"contract_invitation_created",
						{
							...data,
							timestamp: new Date().toISOString(),
						},
					);
				}
			});

			// Handle contract message to artist
			socket.on("contract_message_to_artist", (data) => {
				const { famelinkArtistId, eventId } = data;
				if (famelinkArtistId) {
					io.to(`user_${famelinkArtistId}`).emit(
						"contract_message_new",
						{
							...data,
							type: "new_message",
							timestamp: new Date().toISOString(),
						},
					);
				}
				// Also broadcast to event room
				if (eventId) {
					io.to(`event_${eventId}`).emit("contract_message_new", {
						...data,
						timestamp: new Date().toISOString(),
					});
				}
			});

			// Handle logistics update (flights, hotel, transport, etc.)
			socket.on("logistics_updated", (data) => {
				const { eventId, artistId, artistName, updateType } = data;
				console.log(
					`Logistics updated for event ${eventId}: ${artistName} -> ${updateType}`,
				);
				io.to(`event_${eventId}`).emit("contract_artist_updated", {
					...data,
					action: "update",
					timestamp: new Date().toISOString(),
				});
			});

			// Handle logistics registries update (hotels, drivers, venues, catering)
			socket.on("logistics_registries_updated", (data) => {
				const { eventId, registryType } = data;
				console.log(
					`Logistics registries updated for event ${eventId}: ${registryType}`,
				);
				io.to(`event_${eventId}`).emit("logistics_registries_updated", {
					...data,
					timestamp: new Date().toISOString(),
				});
			});

			// Handle workshop schedule updates (real-time sync across browsers)
			socket.on("workshop_schedule_updated", (data) => {
				const { eventId } = data;
				console.log(`Workshop schedule updated for event ${eventId}`);
				io.to(`event_${eventId}`).emit("workshop_schedule_updated", {
					...data,
					timestamp: new Date().toISOString(),
				});
			});

			// ===================== BOOKING WORKFLOW MODULE =====================

			// Handle booking stage updated (status change, data update)
			socket.on("booking_stage_updated", (data) => {
				const { eventId, bookingId, stageName, artistName } = data;
				console.log(
					`Booking stage updated for event ${eventId}: ${artistName} -> ${stageName}`,
				);
				io.to(`event_${eventId}`).emit("booking_stage_updated", {
					...data,
					timestamp: new Date().toISOString(),
				});
				// Also notify the artist if they have a famelinkArtistId
				if (data.famelinkArtistId) {
					io.to(`user_${data.famelinkArtistId}`).emit(
						"booking_stage_updated",
						{
							...data,
							timestamp: new Date().toISOString(),
						},
					);
				}
			});

			// Handle booking negotiation message added
			socket.on("booking_negotiation_added", (data) => {
				const { eventId, bookingId, stageName } = data;
				console.log(
					`Booking negotiation added for event ${eventId}: booking ${bookingId}, stage ${stageName}`,
				);
				io.to(`event_${eventId}`).emit("booking_negotiation_added", {
					...data,
					timestamp: new Date().toISOString(),
				});
				if (data.famelinkArtistId) {
					io.to(`user_${data.famelinkArtistId}`).emit(
						"booking_negotiation_added",
						{
							...data,
							timestamp: new Date().toISOString(),
						},
					);
				}
			});

			// Handle booking signature submitted
			socket.on("booking_signature_submitted", (data) => {
				const { eventId, bookingId, stageName, signerRole } = data;
				console.log(
					`Booking signature submitted for event ${eventId}: ${signerRole} signed ${stageName}`,
				);
				io.to(`event_${eventId}`).emit("booking_signature_submitted", {
					...data,
					timestamp: new Date().toISOString(),
				});
				if (data.famelinkArtistId) {
					io.to(`user_${data.famelinkArtistId}`).emit(
						"booking_signature_submitted",
						{
							...data,
							timestamp: new Date().toISOString(),
						},
					);
				}
			});

			// Handle booking created
			socket.on("booking_created", (data) => {
				const { eventId, bookingId, artistName } = data;
				console.log(
					`Booking created for event ${eventId}: ${artistName}`,
				);
				io.to(`event_${eventId}`).emit("booking_created", {
					...data,
					timestamp: new Date().toISOString(),
				});
				if (data.famelinkArtistId) {
					io.to(`user_${data.famelinkArtistId}`).emit(
						"booking_created",
						{
							...data,
							timestamp: new Date().toISOString(),
						},
					);
				}
			});

			// Handle user disconnect
			socket.on("disconnect", () => {
				const user = connectedUsers.get(socket.id);
				if (user) {
					console.log(`User ${user.userId} disconnected`);
					connectedUsers.delete(socket.id);
				}
			});
		});

		// Export io for use in API routes
		global.io = io;

		httpServer
			.once("error", (err) => {
				console.error("Server error:", err);
				process.exit(1);
			})
			.listen(port, listenHost, () => {
				console.log(`> Ready on http://localhost:${port}`);
				console.log(`> Network: http://${listenHost}:${port}`);
				console.log("> WebSocket server is running");
				console.log(`> Environment: ${process.env.NODE_ENV}`);
			});
	})
	.catch((err) => {
		console.error("Failed to prepare Next.js app:", err);
		process.exit(1);
	});
