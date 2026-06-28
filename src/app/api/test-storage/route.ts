import { NextRequest, NextResponse } from "next/server";
import { StorageService } from "@/lib/storage-service";
import fs from "fs";
import path from "path";

/**
 * Diagnostic tool to verify VPS Local Storage configuration.
 * Replaces the old test-gcs API.
 */
export async function GET(request: NextRequest) {
	try {
        const UPLOADS_ROOT = process.env.NODE_ENV === "production" 
            ? "/www/wwwroot/uploads" 
            : path.join(process.cwd(), "uploads");

		const results = {
			environment: process.env.NODE_ENV,
			storage: {
				rootPath: UPLOADS_ROOT,
				rootExists: fs.existsSync(UPLOADS_ROOT),
				permissions: null as any,
			},
			tests: {} as any,
		};

		// Test 1: Check root directory permissions
		try {
            if (results.storage.rootExists) {
                const stats = fs.statSync(UPLOADS_ROOT);
                results.storage.permissions = {
                    uid: stats.uid,
                    gid: stats.gid,
                    mode: stats.mode.toString(8),
                };
            }
		} catch (error) {
			results.tests.permissionCheck = `Error: ${error}`;
		}

		// Test 2: Try to write and read a test file
		try {
			const testFileName = `test-vps-storage-${Date.now()}.txt`;
			const testContent = "This is a test of the VPS local storage system.";
            
            // Save
			const saveSuccess = await StorageService.saveFile(testFileName, testContent);
            results.tests.canWriteFile = saveSuccess;

			// Read back
			const readContent = await StorageService.readFile(testFileName);
			results.tests.canReadFile = readContent === testContent;

			// Delete
			const deleteSuccess = await StorageService.deleteFile(testFileName);
			results.tests.canDeleteFile = deleteSuccess;
            
		} catch (error) {
			results.tests.readWriteTest = `Error: ${error}`;
		}

		// Test 3: List files
		try {
			const files = await StorageService.listFiles("");
			results.tests.canListFiles = true;
			results.tests.fileCount = files.length;
			results.tests.sampleFiles = files.slice(0, 5);
		} catch (error) {
			results.tests.canListFiles = `Error: ${error}`;
		}

		return NextResponse.json(results, { status: 200 });
	} catch (error) {
		console.error("Storage test error:", error);
		return NextResponse.json(
			{
				error: "Failed to test VPS storage configuration",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 500 }
		);
	}
}
