import { IDENT, MAX_WORKSHOP_SIZE, VERSION } from "../constants";
import fs from "fs";

export default function createGMA(path: string, title: string, description: string,
    filePaths: Array<string>, addonPath: string) {
    const buf = Buffer.alloc(MAX_WORKSHOP_SIZE, 0);
    let offset = 0;

    // Header(5)
    offset += buf.write(IDENT, offset); // ident (4)
    offset += buf.write(VERSION, offset + 1); // Version (1)
    // SteamID(8) [unused]
    offset = buf.writeBigInt64LE(BigInt(0), offset);
    // Unix Timestamp (8)
    offset = buf.writeBigInt64LE(BigInt(Math.round(Date.now() / 1000)), offset);
    // Required content (a list of strings)
    offset += buf.write("\0", offset);
    // Addon name (n)
    offset += buf.write(title, offset + 1);
    // Addon description (n)
    offset += buf.write(description, offset +1);
    // Addon author (n) [unused]
    offset += buf.write("Author name", offset + 1);
    // Addon Version (4) [unused]
    offset += buf.writeInt32BE(1, offset + 1);

    //now time to build the file list.
    console.log("Building file list...");

    let fn = 0;
    for (const fp of filePaths) {
        let afp  = fp;
        if (addonPath.length > 0) afp = fp.slice(addonPath.length + 1);


        const fileStats  = fs.statSync(fp);
        if (fileStats.size <= 0) throw new Error(`${fp} is empty or we cannot get the size.`);

        fn++;


        offset = buf.writeUInt32LE(fn, fn === 1 ? offset + 2: offset); // File number (4)
        offset += buf.write(afp.toLowerCase(), offset); // File name (all lower case!) (n)
        offset = buf.writeBigInt64LE(BigInt(fileStats.size), offset +1); // file size (8)

        offset =buf.writeUInt32LE(0, offset);
    }

    // Zero to signify EOF
    fn = 0;
    offset = buf.writeUInt32LE(fn, offset);

    // Writing the files themselves
    console.log("Writing files...");

    for (const fp of filePaths) {
        const fb = fs.readFileSync(fp);

        if (fb.length === 0) throw new Error(`${fp} is empty or we cannot get its size!`);
        offset += fb.copy(buf, offset + 1);
    }

    offset = buf.writeUInt32LE(0, offset + 1);

    console.log("Writing GMA...");

    fs.writeFileSync(path, buf.slice(0, offset));
    console.log("Successfully written the GMA.");
}
