import fs from "fs";
import { glob } from "glob";
import path from "path";
import { runCmd, spawnProcess } from "./runCmd";

function findFilePath(pattern: string) {
	pattern = path.join(path.resolve(__dirname, "..", ".."), pattern);

	const matches = glob.sync(pattern, { nodir: true});
	if (matches.length === 0) {
		throw new Error(`Could not find file matching pattern: ${pattern}`);
	}

	return matches[0];
}

export default async function publishGMA(accountName: string, accountPassword: string, workshopId: string, changes: string, accountSecret: string) {
	// can't rely on static paths because github action environment are fucking idiotic
	const gmaPath = findFilePath("**/addon.gma");
	const steamcmdPath = findFilePath("**/steamcmd.exe");
	const gmPublishPath = findFilePath("**/gmpublish.exe");
	const steamGuardPath = findFilePath("**/steam_guard.exe");

	let err = null;
	let twoFactorCode = null;
	if (accountSecret) {
		console.log("Getting Steam 2FA code...");

		try {
			fs.chmodSync(steamGuardPath, "0755");

			await runCmd(`${steamGuardPath} ${accountSecret}`);

			const passcodePath = findFilePath("**/passcode.txt");
			twoFactorCode = fs.readFileSync(passcodePath, "utf-8").trim();
			fs.unlinkSync(passcodePath);
		} catch (e) {
			err = e;
		}
	}

	let steamCmdProc: NodeJS.Process;
	try {
		fs.chmodSync(steamcmdPath, "0755");
		fs.chmodSync(gmPublishPath, "0755");

		let steamCmd = `${steamcmdPath} +login ${accountName} ${accountPassword}`;
		if (twoFactorCode) steamCmd += ` ${twoFactorCode}`;

		let runSteamAgain = false;
		await runCmd(steamCmd, 20000, (child: NodeJS.Process, data: string) => {
			if (data.startsWith("FAILED (Two-factor code mismatch")) {
				child.kill(9);
				runSteamAgain = true;
			} else {
				steamCmdProc = child;
			}
		});

		if (runSteamAgain) await runCmd(steamCmd, 20000, (child: NodeJS.Process) => { steamCmdProc = child; });

		await spawnProcess(gmPublishPath, ["update", "-addon", gmaPath, "-id", workshopId, "-changes", changes], {
			detached: false,
			shell: false,
		});
	} catch (e) {
		err = e;
	} finally {
		fs.unlinkSync(gmaPath);
		if (steamCmdProc) steamCmdProc.kill(9);
	}

	if (err !== null) throw new Error(err);
}
