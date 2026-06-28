import fs from "fs/promises";
import path from "path";

const LOCAL_DATA_DIR = path.join(process.cwd(), "local-data");

// Ensure local data directory exists
async function ensureDataDir() {
	try {
		await fs.access(LOCAL_DATA_DIR);
	} catch {
		await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
	}
}

export async function readLocalJsonFile<T>(
	filePath: string
): Promise<T | null> {
	try {
		await ensureDataDir();
		const fullPath = path.join(LOCAL_DATA_DIR, filePath);
		const data = await fs.readFile(fullPath, "utf-8");
		return JSON.parse(data);
	} catch (error) {
		console.log(`Local file ${filePath} does not exist or cannot be read`);
		return null;
	}
}

export async function writeLocalJsonFile<T>(
	filePath: string,
	data: T
): Promise<void> {
	try {
		await ensureDataDir();
		const fullPath = path.join(LOCAL_DATA_DIR, filePath);

		// Ensure directory exists
		const dir = path.dirname(fullPath);
		await fs.mkdir(dir, { recursive: true });

		await fs.writeFile(fullPath, JSON.stringify(data, null, 2), "utf-8");
		console.log(`Local file ${filePath} saved successfully`);
	} catch (error) {
		console.error(`Error writing local file ${filePath}:`, error);
		throw error;
	}
}
