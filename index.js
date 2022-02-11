const DEBUG = true;

const { setFailed, setOutput } = require("@actions/core");
const { context } = require("@actions/github");
const { exec } = require("child_process");

const package = DEBUG ? './debug' : '@actions/core';
const getInput = require(package).getInput;

const fs = require("fs");
const path = require("path");
const glob = require("glob");

const MAX_WORKSHOP_SIZE = 400000001;
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
	offset = buffer.writeBigUInt64LE(BigInt(0), offset);
	// UNIX TimeStamp (8)
	offset = buffer.writeBigUInt64LE(BigInt(Math.round(Date.now() / 1000)), offset);
	// Required content (a list of strings)
	offset += buffer.write("\0", offset); // signifies nothing
	// Addon Name (n)
	offset += buffer.write(title, offset + 1);
	// Addon Description (n)
	offset += buffer.write(description, offset + 1);
	// Addon Author (n) [unused]
	offset += buffer.write("Author Name", offset + 1);
	// Addon Version (4) [unused]
	offset = buffer.writeInt32LE(1, offset + 1);

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
		offset = buffer.writeUInt32LE(fileNum, fileNum === 1 ? offset + 2 : offset); // File number (4)
		offset += buffer.write(addonFilePath.toLowerCase(), offset); // File name (all lower case!) (n)
		offset = buffer.writeBigInt64LE(BigInt(fileStats.size), offset + 1); // File size (8)

		offset = buffer.writeUInt32LE(0, offset);
	}

	// Zero to signify end of files
	fileNum = 0;
	offset = buffer.writeUInt32LE(fileNum, offset);

	console.log("Writing files...");

	for (const filePath of filePaths) {
		const fileBuffer = fs.readFileSync(filePath);
		if (fileBuffer.length === 0) {
			throw new Error(`${filePath} is empty or we could not get its size!`);
		}

		offset += fileBuffer.copy(buffer, offset);
	}

	offset = buffer.writeUInt32LE(0, offset + 1);

	console.log("Writing GMA...");

	fs.writeFileSync(path, buffer.slice(0, offset));
	console.log(`Successfully created GMA`);
}

async function runCmd(cmd, timeoutTime, onLog) {
	if (!timeoutTime) timeoutTime = 1000 * 60 * 5; // 5 minutes

	return new Promise((resolve, reject) => {
		const child = exec(cmd, (err, _, stderr) => {
			if (err) {
				console.log(stderr);
				reject(err.message);
				return;
			}

			resolve();
		});

		const timeout = setTimeout(resolve, timeoutTime);
		child.stdout.on('data', (data) => {
			timeout.refresh();
			console.log(data);

			if (onLog) {
				onLog(child, data, "stdout");
			}
		});

		child.stderr.on('data', (data) => {
			timeout.refresh();
			console.error(data);

			if (onLog) {
				onLog(child, data, "stderr");
			}
		});
	});
}

async function publishGMA(accountName, accountPassword, workshopId, relativeGmaPath, changes, accountSecret) {
	const basePath = path.resolve("./");
	const gmaPath = path.resolve(basePath, relativeGmaPath);
	const steamcmdPath = path.resolve(basePath, "steam", "steamcmd.exe");
	const gmpublishPath = path.resolve(basePath, "gmpublish.exe");
	const steamGuardPath = path.resolve(basePath, "steam_guard.exe");
	const passcodePath = path.resolve(basePath, "passcode.txt");

	let error = null;
	let twoFactorCode = null;
	if (accountSecret) {
		console.log("Getting Steam 2FA code...");

		try {
			fs.chmodSync(steamGuardPath, "0755");
			await runCmd(`${steamGuardPath} ${accountSecret}`);
			twoFactorCode = fs.readFileSync(passcodePath, "utf8").trim();
		} catch (err) {
			error = err;
		}
	}

	let steamCmdProc = null;
	try {
		fs.chmodSync(steamcmdPath, "0755");
		fs.chmodSync(gmpublishPath, "0755");

		let steamCmd = `${steamcmdPath} +login ${accountName} ${accountPassword}`
		if (twoFactorCode) {
			steamCmd += ` ${twoFactorCode}`;
		}

		let runSteamCmdAgain = false;
		await runCmd(steamCmd, 5000, (child, data) => {
			if (data.startsWith("FAILED (Two-factor code mismatch)")) {
				child.kill();
				runSteamCmdAgain = true;
			} else {
				steamCmdProc = child;
			}
		});

		if (runSteamCmdAgain) {
			await runCmd(steamCmd, 5000, (child) => { steamCmdProc = child; });
		}

		await runCmd(`${gmpublishPath} update -addon "${gmaPath}" -id "${workshopId}" -changes "${changes}"`);
	} catch (err) {
		error = err;
	} finally {
		fs.unlinkSync(gmaPath);
		fs.unlinkSync(passcodePath);

		if (steamCmdProc) {
			steamCmdProc.kill();
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
		const accountSecret = getInput("account-secret");

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
		if (DEBUG) {
			changes = "DEBUG MESSAGE";
		} else {
			if (context.payload.head_commit && context.payload.head_commit.message) {
				changes = context.payload.head_commit.message;
			}
		}

		await publishGMA(accountName, accountPassword, workshopId, GMA_PATH, changes, accountSecret);
		setOutput("error-code", 0);
		process.exit(0);
	} catch (error) {
		console.error(error);
		setFailed(error.message);
		process.exit(1);
	}
}

run();
