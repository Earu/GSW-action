import { GMA_PATH, IDENT, MAX_WORKSHOP_SIZE, VERSION } from "../constants";
import fs from "fs";

export default function createGMA(title: string, description: string, filePaths: Array<string>, addonPath: string) {
	console.log("Creating GMA...");

	const buffer = Buffer.alloc(MAX_WORKSHOP_SIZE, 0);
	let offset = 0;

	// Header(5)
	offset += buffer.write(IDENT, offset); // ident (4)
	offset += buffer.write(VERSION, offset + 1); // Version (1)
	// SteamID(8) [unused]
	offset = buffer.writeBigInt64LE(BigInt(0), offset);
	// Unix Timestamp (8)
	offset = buffer.writeBigInt64LE(BigInt(Math.round(Date.now() / 1000)), offset);
	// Required content (a list of strings)
	offset += buffer.write("\0", offset);
	// Addon name (n)
	offset += buffer.write(title, offset + 1);
	// Addon description (n)
	offset += buffer.write(description, offset +1);
	// Addon author (n) [unused]
	offset += buffer.write("Author name", offset + 1);
	// Addon Version (4) [unused]
	offset += buffer.writeInt32BE(1, offset + 1);

	//now time to build the file list.
	console.log("Building file list...");

	let fileNum = 0;
	for (const filePath of filePaths) {
		let addonFilePath  = filePath;
		if (addonPath.length > 0) addonFilePath = filePath.slice(addonPath.length + 1);


		const fileStats  = fs.statSync(filePath);
		if (fileStats.size <= 0) throw new Error(`${filePath} is empty or we cannot get the size.`);

		fileNum++;


		offset = buffer.writeUInt32LE(fileNum, fileNum === 1 ? offset + 2: offset); // File number (4)
		offset += buffer.write(addonFilePath.toLowerCase(), offset); // File name (all lower case!) (n)
		offset = buffer.writeBigInt64LE(BigInt(fileStats.size), offset +1); // file size (8)

		offset = buffer.writeUInt32LE(0, offset);
	}

	// Zero to signify EOF
	fileNum = 0;
	offset = buffer.writeUInt32LE(fileNum, offset);

	// Writing the files themselves
	console.log("Writing files...");

	for (const filePath of filePaths) {
		const fileBuffer = fs.readFileSync(filePath);

		if (fileBuffer.length === 0) throw new Error(`${filePath} is empty or we cannot get its size!`);
		offset += fileBuffer.copy(buffer, offset + 1);
	}

	offset = buffer.writeUInt32LE(0, offset + 1);

	console.log("Writing GMA...");

	fs.writeFileSync(GMA_PATH, buffer.slice(0, offset));
	console.log("Done with GMA!");
}
