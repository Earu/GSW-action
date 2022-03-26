
import buildDescription from "./helpers/buildDescription";
import { context } from "@actions/github";
import createGMA from "./helpers/createGMA";
import fs from "fs";
import getFilePaths from "./helpers/getFilePaths";
import path from "path";
import publishGMA from "./helpers/publishGMA";
import validateFiles from "./helpers/validateFiles";
import validateMetadata from "./helpers/validateMetaData";
import { setFailed, setOutput, getInput, InputOptions } from "@actions/core";
import getDebugInput from "./debug";

const DEBUG = true;
let getParameter: (input: string, opts?: InputOptions) => string = DEBUG ? getDebugInput : getInput;

async function run() {
	try {
		const accountName = getParameter("account-name");
		const accountPassword = getParameter("account-password");
		const workshopId = getParameter("workshop-id");
		const accountSecret = getParameter("account-secret");
		const addonPath = getParameter("addon-path");

		const metadataPath = path.join(addonPath, "addon.json");
		if (!fs.existsSync(metadataPath)) {
			setFailed("Missing addon.json!");
			process.exit(1);
		}

		const metadata = JSON.parse(fs.readFileSync(metadataPath).toString());
		validateMetadata(metadata);

		const filePaths = getFilePaths(addonPath, metadata.ignore);
		validateFiles(filePaths);

		createGMA(metadata.title, buildDescription(metadata), filePaths, addonPath);

		let changes = "";
		if (DEBUG) {
			changes = "DEBUG MESSAGE";
		} else if (context.payload.head_commit && context.payload.head_commit.message) {
			changes = context.payload.head_commit.message;
		}

		await publishGMA(accountName, accountPassword, workshopId, changes, accountSecret);
		setOutput("error-code", 0);
		process.exit(0);
	} catch (e) {
		console.error(e);
		setFailed(e);

		process.exit(1);
	}
}

run();