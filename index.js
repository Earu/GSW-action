const { getInput, setFailed, setOutput } = require("@actions/core");
const { context } = require("@actions/github");
//const greenworks = require("greenworks");
const fs = require("fs");
const path = require("path");
const glob = require("glob");

const GMA_PATH = "addon.gma";
const IDENT = "GMAD";
const VERSION = "3";
const TYPES = [ "gamemode", "map", "weapon", "vehicle", "npc", "entity", "tool", "effects", "model", "servercontent" ];
const TAGS = [ "fun", "roleplay", "scenic", "movie", "realism", "cartoon", "water", "comic", "build" ];
const WILDCARDS = [
	"lua/*.lua",
	"scenes/*.vcd",
	"particles/*.pcf",
	"resource/fonts/*.ttf",
	"scripts/vehicles/*.txt",
	"resource/localization/*/*.properties",
	"maps/*.bsp",
	"maps/*.nav",
	"maps/*.ain",
	"maps/thumb/*.png",
	"sound/*.wav",
	"sound/*.mp3",
	"sound/*.ogg",
	"materials/*.vmt",
	"materials/*.vtf",
	"materials/*.png",
	"materials/*.jpg",
	"materials/*.jpeg",
	"models/*.mdl",
	"models/*.vtx",
	"models/*.phy",
	"models/*.ani",
	"models/*.vvd",
	"gamemodes/*/*.txt",
	"gamemodes/*/*.fgd",
	"gamemodes/*/logo.png",
	"gamemodes/*/icon24.png",
	"gamemodes/*/gamemode/*.lua",
	"gamemodes/*/entities/effects/*.lua",
	"gamemodes/*/entities/weapons/*.lua",
	"gamemodes/*/entities/entities/*.lua",
	"gamemodes/*/backgrounds/*.png",
	"gamemodes/*/backgrounds/*.jpg",
	"gamemodes/*/backgrounds/*.jpeg",
	"gamemodes/*/content/models/*.mdl",
	"gamemodes/*/content/models/*.vtx",
	"gamemodes/*/content/models/*.phy",
	"gamemodes/*/content/models/*.ani",
	"gamemodes/*/content/models/*.vvd",
	"gamemodes/*/content/materials/*.vmt",
	"gamemodes/*/content/materials/*.vtf",
	"gamemodes/*/content/materials/*.png",
	"gamemodes/*/content/materials/*.jpg",
	"gamemodes/*/content/materials/*.jpeg",
	"gamemodes/*/content/scenes/*.vcd",
	"gamemodes/*/content/particles/*.pcf",
	"gamemodes/*/content/resource/fonts/*.ttf",
	"gamemodes/*/content/scripts/vehicles/*.txt",
	"gamemodes/*/content/resource/localization/*/*.properties",
	"gamemodes/*/content/maps/*.bsp",
	"gamemodes/*/content/maps/*.nav",
	"gamemodes/*/content/maps/*.ain",
	"gamemodes/*/content/maps/thumb/*.png",
	"gamemodes/*/content/sound/*.wav",
	"gamemodes/*/content/sound/*.mp3",
	"gamemodes/*/content/sound/*.ogg",
];

function getFilePaths(dirPath, exceptionWildcards) {
	let ret = [];
	for (const wildcard of WILDCARDS) {
		const filePaths = glob.sync(path.join(dirPath, wildcard));
		ret = ret.concat(filePaths);
	}

	let exceptions = [];
	for (const wildcard of exceptionWildcards) {
		const filePaths = glob.sync(path.join(dirPath, wildcard));
		exceptions = exceptions.concat(filePaths);
	}

	return ret.filter((val) => exceptions.indexOf(val) === -1);
}

function validateFiles(filePaths) {
	for (const filePath of filePaths) {
		if (filePath === filePath.toLower()) continue;
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

	if (!TYPES.find(t => t === metadata.type.toLower())) {
		throw new Error(`invalid type: ${metadata.type}`);
	}

	for (const tag of metadata.tags) {
		if (!TAGS.find(t => t === tag.toLower())) {
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
		type: metadata.type.toLower(),
		tags: metadata.tags.map(t => t.toLower()),
	});
}

function createGMA(path, title, description, filePaths) {
	let buffer = new Buffer();

	// Header (5)
	buffer.write(IDENT); // Ident (4)
	buffer.write(VERSION); // Version (1)
	// SteamID (8) [unused]
	buffer.writeBigUInt64BE(0);
	// UNIX TimeStamp (8)
	buffer.writeBigUInt64BE(Date.now() / 1000);
	// Required content (a list of strings)
	buffer.write("\0"); // signifies nothing
	// Addon Name (n)
	buffer.write(title);
	// Addon Description (n)
	buffer.write(description);
	// Addon Author (n) [unused]
	buffer.write("Author Name");
	// Addon Version (4) [unused]
	buffer.writeInt32BE(1);

	console.log("Writing file list...");

	let fileNum = 0;
	for (const filePath of filePaths) {
		const fileStats = fs.statSync(filePath);
		if (fileStats.size <= 0) {
			throw new Error(`${filePath} is empty or we could not get its size!`);
		}

		fileNum++;
		buffer.writeUInt32BE(fileNum); // File number (4)
		buffer.write(filePath.toLower()); // File name (all lower case!) (n)
		buffer.writeBigInt64BE(fileStats.size); // File size (8)

		buffer.writeUInt32BE(0);
	}

	// Zero to signify end of files
	fileNum  = 0;
	buffer.writeUInt32BE(fileNum);

	console.log("Writing files...");

	for (const filePath of filePaths) {
		const fileBuffer = fs.readFileSync(filePath);
		if (fileBuffer.byteLength === 0) {
			throw new Error(`${filePath} is empty or we could not get its size!`);
		}

		const before = fileBuffer.byteLength;
		buffer = Buffer.concat([buffer, fileBuffer]);
		const diff = buffer.byteLength - before;
		if (diff < 1) {
			throw new Error(`Failed ton write ${filePath}!`);
		}
	}

	buffer.writeUInt32BE(0);

	console.log("Writing GMA...");
	fs.writeFileSync(path, buffer);
}

try {
	const token = getInput("steam-token");
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

	console.log(context);
	console.log(metadata);
	console.log(filePaths);

	createGMA(GMA_PATH, metadata.title, buildDescription(metadata), filePaths);

	greenworks.init();
	greenworks.updatePublishedWorkshopFile({ tags: metadata.tags }, workshopId, GMA_PATH, "", metadata.title,
		metadata.description, () => setOutput("error-code", 0), (err) => setFailed(err.message));
} catch (error) {
	setFailed(error.message);
}