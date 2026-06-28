/** @type {import('next').NextConfig} */
const nextConfig = {
	// Allow any device on the local network to access dev resources (fonts, HMR, etc.)
	allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.16.*.*"],
	typescript: {
		// Skip type checking during build
		ignoreBuildErrors: true,
	},
	// Increase body size limit for large file uploads (500MB for videos)
	experimental: {
		serverActions: {
			bodySizeLimit: "500mb",
		},
		// Enable large page data for file uploads
		largePageDataBytes: 500 * 1024 * 1024, // 500MB
	},
	serverExternalPackages: ["@react-pdf/renderer"],
	turbopack: {},
	// Set environment variables for production
	env: {
		// Increase HTTP timeout
		HTTP_TIMEOUT: "900000",
	},
	// Optimize webpack cache to prevent disk space issues
	webpack: (config, { isServer }) => {
		// Disable filesystem cache in development to save disk space
		if (!isServer) {
			config.cache = false;
		}
		return config;
	},
	// Add headers for better media file support across all devices
	async headers() {
		return [
			{
				// Apply these headers to all media API routes
				source: "/api/media/:path*",
				headers: [
					{
						key: "Access-Control-Allow-Origin",
						value: "*",
					},
					{
						key: "Access-Control-Allow-Methods",
						value: "GET, HEAD, OPTIONS",
					},
					{
						key: "Access-Control-Allow-Headers",
						value: "Content-Type, Range",
					},
					{
						key: "Accept-Ranges",
						value: "bytes",
					},
					{
						key: "Cache-Control",
						value: "public, max-age=3600",
					},
				],
			},
			{
				// Apply these headers to download API routes
				source: "/api/download/:path*",
				headers: [
					{
						key: "Access-Control-Allow-Origin",
						value: "*",
					},
					{
						key: "Access-Control-Allow-Methods",
						value: "GET, HEAD, OPTIONS",
					},
					{
						key: "Access-Control-Allow-Headers",
						value: "Content-Type, Range",
					},
					{
						key: "Accept-Ranges",
						value: "bytes",
					},
				],
			},
			{
				// Apply these headers to GCS upload API routes
				source: "/api/gcs/:path*",
				headers: [
					{
						key: "Access-Control-Allow-Origin",
						value: "*",
					},
					{
						key: "Access-Control-Allow-Methods",
						value: "GET, POST, PUT, OPTIONS",
					},
					{
						key: "Access-Control-Allow-Headers",
						value: "Content-Type, x-goog-resumable",
					},
				],
			},
		];
	},
};

module.exports = nextConfig;
