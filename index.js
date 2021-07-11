const { getInput, setFailed, setOutput } = require("@actions/core");
const { context } = require("@actions/github");
const { exec } = require("child_process");

const unzip = require("unzip-stream");
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const https = require("follow-redirects").https;

const TIMEOUT = 300000;
const MAX_WORKSHOP_SIZE = 400000000;
const GMA_PATH = "addon.gma";
const IDENT = "GMAD";
const VERSION = "3";
const TYPES = [ "gamemode", "map", "weapon", "vehicle", "npc", "entity", "tool", "effects", "model", "servercontent" ];
const TAGS = [ "fun", "roleplay", "scenic", "movie", "realism", "cartoon", "water", "comic", "build" ];
const WILDCARDS = [
	"lua/**/*.lua",
	"scenes/**/*.vcd",
	"particles/**/*.pcf",
	"resource/fonts/*.ttf",
	"scripts/vehicles/*.txt",
	"resource/localization/*/*.properties",
	"maps/*.bsp",
	"maps/*.nav",
	"maps/*.ain",
	"maps/thumb/*.png",
	"sound/**/*.wav",
	"sound/**/*.mp3",
	"sound/**/*.ogg",
	"materials/**/*.vmt",
	"materials/**/*.vtf",
	"materials/**/*.png",
	"materials/**/*.jpg",
	"materials/**/*.jpeg",
	"models/**/*.mdl",
	"models/**/*.vtx",
	"models/**/*.phy",
	"models/**/*.ani",
	"models/**/*.vvd",
	"gamemodes/*/*.txt",
	"gamemodes/*/*.fgd",
	"gamemodes/*/logo.png",
	"gamemodes/*/icon24.png",
	"gamemodes/*/gamemode/**/*.lua",
	"gamemodes/*/entities/effects/**/*.lua",
	"gamemodes/*/entities/weapons/**/*.lua",
	"gamemodes/*/entities/entities/**/*.lua",
	"gamemodes/*/backgrounds/*.png",
	"gamemodes/*/backgrounds/*.jpg",
	"gamemodes/*/backgrounds/*.jpeg",
	"gamemodes/*/content/models/**/*.mdl",
	"gamemodes/*/content/models/**/*.vtx",
	"gamemodes/*/content/models/**/*.phy",
	"gamemodes/*/content/models/**/*.ani",
	"gamemodes/*/content/models/**/*.vvd",
	"gamemodes/*/content/materials/**/*.vmt",
	"gamemodes/*/content/materials/**/*.vtf",
	"gamemodes/*/content/materials/**/*.png",
	"gamemodes/*/content/materials/**/*.jpg",
	"gamemodes/*/content/materials/**/*.jpeg",
	"gamemodes/*/content/scenes/**/*.vcd",
	"gamemodes/*/content/particles/**/*.pcf",
	"gamemodes/*/content/resource/fonts/*.ttf",
	"gamemodes/*/content/scripts/vehicles/*.txt",
	"gamemodes/*/content/resource/localization/*/*.properties",
	"gamemodes/*/content/maps/*.bsp",
	"gamemodes/*/content/maps/*.nav",
	"gamemodes/*/content/maps/*.ain",
	"gamemodes/*/content/maps/thumb/*.png",
	"gamemodes/*/content/sound/**/*.wav",
	"gamemodes/*/content/sound/**/*.mp3",
	"gamemodes/*/content/sound/**/*.ogg",
];

function getFilePaths(dirPath, exceptionWildcards) {
	let ret = [];
	for (const wildcard of WILDCARDS) {
		const completeWildcard = path.join(dirPath, wildcard).replace(/\\/g,"/");
		const filePaths = glob.sync(completeWildcard, {
			ignore: exceptionWildcards,
			nodir: true,
		});

		ret = ret.concat(filePaths);
	}

	return ret;
}

function validateFiles(filePaths) {
	for (const filePath of filePaths) {
		if (filePath === filePath.toLowerCase()) continue;
		throw new Error(`${filePath} is not lower-cased!`);
	}
}

/*{
	"title"		:	"My Server Content",
	"type"		:	"ServerContent",
	"tags"		:	[ "roleplay", "realism" ], // needs at least 1 tag, so our check works regardless
	"ignore"	:
	[
		"*.psd",
		"*.vcproj",
		"*.svn*"
	]
}*/
const props = ["title", "type", "tags"];
function validateMetadata(metadata) {
	for (const prop of props) {
		const val = metadata[prop];
		if (!val || val.length === 0) {
			throw new Error(`missing or empty property \'${prop}\' in addon.json`);
		}
	}

	if (!metadata.ignore) {
		throw new Error("missing property 'ignore' in addon.json");
	}

	"awd".toLowerCase()
	if (!TYPES.find(t => t === metadata.type.toLowerCase())) {
		throw new Error(`invalid type: ${metadata.type}`);
	}

	for (const tag of metadata.tags) {
		if (!TAGS.find(t => t === tag.toLowerCase())) {
			throw new Error(`invalid tag: ${tag}`);
		}
	}

	if (!metadata.description) {
		metadata.description = "";
	}
}

function buildDescription(metadata) {
	return JSON.stringify({
		description: metadata.description,
		type: metadata.type.toLowerCase(),
		tags: metadata.tags.map(t => t.toLowerCase()),
	});
}

function createGMA(path, title, description, filePaths, addonPath) {
	let buffer = Buffer.alloc(MAX_WORKSHOP_SIZE, 0);
	let offset = 0;

	// Header (5)
	offset += buffer.write(IDENT, offset); // Ident (4)
	offset += buffer.write(VERSION, offset + 1); // Version (1)
	// SteamID (8) [unused]
	offset = buffer.writeBigUInt64BE(BigInt(0), offset);
	// UNIX TimeStamp (8)
	offset = buffer.writeBigUInt64BE(BigInt(Math.round(Date.now() / 1000)), offset);
	// Required content (a list of strings)
	offset += buffer.write("\0", offset); // signifies nothing
	// Addon Name (n)
	offset += buffer.write(title, offset + 1);
	// Addon Description (n)
	offset += buffer.write(description, offset + 1);
	// Addon Author (n) [unused]
	offset += buffer.write("Author Name", offset + 1);
	// Addon Version (4) [unused]
	offset = buffer.writeInt32BE(1, offset + 1);

	console.log("Writing file list...");

	let fileNum = 0;
	for (const filePath of filePaths) {
		let addonFilePath = filePath;
		if (addonPath.length > 0) {
			addonFilePath = filePath.slice(addonPath.length + 1);
		}

		const fileStats = fs.statSync(filePath);
		if (fileStats.size <= 0) {
			throw new Error(`${filePath} is empty or we could not get its size!`);
		}

		fileNum++;
		offset = buffer.writeUInt32BE(fileNum, fileNum === 1 ? offset + 1 : offset); // File number (4)
		offset += buffer.write(addonFilePath.toLowerCase(), offset); // File name (all lower case!) (n)
		offset = buffer.writeBigInt64BE(BigInt(fileStats.size), offset + 1); // File size (8)

		offset = buffer.writeUInt32BE(0, offset);
	}

	// Zero to signify end of files
	fileNum = 0;
	offset = buffer.writeUInt32BE(fileNum, offset);

	console.log("Writing files...");

	for (const filePath of filePaths) {
		const fileBuffer = fs.readFileSync(filePath);
		if (fileBuffer.length === 0) {
			throw new Error(`${filePath} is empty or we could not get its size!`);
		}

		offset += buffer.write(fileBuffer.toString(), offset);
	}

	offset = buffer.writeUInt32BE(0, offset + 1);

	console.log("Writing GMA...");

	fs.writeFileSync(path, buffer.slice(0, offset));
	console.log(`Successfully created GMA`);
}

async function publishGMA(accountName, accountPassword, workshopId, relativeGmaPath, changes) {
	const extractedFilePaths = [];
	const basePath = path.resolve("./");
	const gmaPath = path.resolve(basePath, relativeGmaPath);
	const zipPath = path.resolve(basePath, "gmodws.zip");

	let binPath = path.resolve(basePath, "gmodws");
	if (process.platform === "win32") {
		binPath += ".exe";
	}

	if (!fs.existsSync(binPath)) {
		console.log("Getting gmodws...");
		await new Promise((resolve, reject) => {
			setTimeout(() => reject("Could not get gmodws"), TIMEOUT);
			https.get("https://github.com/Meachamp/gmodws/releases/latest/download/gmodws.zip", (res) => {
				const stream = fs.createWriteStream(zipPath);
				res.pipe(stream);

				stream.on("finish",() => {
					stream.close();
					resolve();
				});
			})
		});

		console.log("Extracting gmodws...");
		await new Promise(resolve => {
			const stream = fs.createReadStream(zipPath)
				.pipe(unzip.Parse())
				.on("entry", (entry) => {
					const filePath = path.resolve(basePath, entry.path);
					extractedFilePaths.push(filePath);
					entry.pipe(fs.createWriteStream(filePath));
				});
			stream.on("close", () => resolve())
		});
		fs.unlinkSync(zipPath);
	}

	console.log("Launching gmodws...");
	let error = null;
	try {
		fs.chmodSync(binPath, "0755");

		process.env["STEAM_PASSWORD"] = accountPassword;
		process.env["GMODWS_DEBUG"] = true;
		await new Promise((resolve, reject) => {
			exec(`${binPath} ${accountName} ${workshopId} ${gmaPath} "${changes}"`, (err, stdout, stderr) => {
				if (err) {
					reject(err.message);
					return;
				}

				console.log(stderr);
				console.log(stdout);
				resolve();
			});
		});
	} catch (err) {
		error = err;
	} finally {
		fs.unlinkSync(gmaPath);
		for (const filePath of extractedFilePaths) {
			fs.unlinkSync(filePath);
		}
	}

	if (error != null) {
		throw error;
	}
}

async function run() {
	try {
		const accountName = getInput("account-name");
		const accountPassword = getInput("account-password");
		const workshopId = getInput("workshop-id");
		const addonPath = getInput("addon-path");

		const metadataPath = path.join(addonPath, "addon.json");
		if (!fs.existsSync(metadataPath)) {
			setFailed("missing addon.json!");
			return;
		}

		const metadata = JSON.parse(fs.readFileSync(metadataPath));
		validateMetadata(metadata);

		const filePaths = getFilePaths(addonPath, metadata.ignore);
		validateFiles(filePaths);

		createGMA(GMA_PATH, metadata.title, buildDescription(metadata), filePaths, addonPath);

		let changes = "";
		if (context.payload.head_commit && context.payload.head_commit.message) {
			changes = context.payload.head_commit.message;
		}

		await publishGMA(accountName, accountPassword, workshopId, GMA_PATH, changes);
		setOutput("error-code", 0);
	} catch (error) {
		console.error(error);
		setFailed(error.message);
	}
}

run();
