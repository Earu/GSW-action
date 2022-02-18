import { ChildProcess } from "child_process";
import { MAX_TIMEOUT } from "../constants";
import fs from "fs";
import { glob } from "glob";
import path from "path";
import { runCmd, spawnProcess } from "./runCmd";

function findFilePath(pattern: string) {
	const matches = glob.sync(pattern, { nodir: true});
	if (matches.length === 0) {
		throw new Error(`Could not find file matching pattern: ${pattern}`);
	}

	return matches[0];
}

export default async function publishGMA(accountName: string, accountPassword: string, workshopId: string, changes: string, accountSecret: string) {
	// can't rely on static paths because github action environment are idiotic
	const gmaPath = findFilePath("**/addon.gma");
	const steamcmdPath = path.resolve(__dirname, "..", "..", "bin", "steamcmd.exe");
	const gmPublishPath = path.resolve(__dirname, "..", "..", "bin", "gmpublish.exe");
	const steamGuardPath = path.resolve(__dirname, "..", "..", "bin", "steam_guard.exe");
	const passcodePath = path.resolve(__dirname, "..", "..", "bin", "passcode.txt");

	let err = null;
	let twoFactorCode = null;
	if (accountSecret) {
		console.log("Getting Steam 2FA code...");

		try {
			fs.chmodSync(steamGuardPath, "0755");

			await runCmd(`${steamGuardPath} ${accountSecret}`);

			twoFactorCode = fs.readFileSync(passcodePath, "utf-8").trim();
		} catch (e) {
			err = e;
		}
	}

	let steamCmdProc: ChildProcess;
	try {
		fs.chmodSync(steamcmdPath, "0755");
		fs.chmodSync(gmPublishPath, "0755");

		let steamCmd = `${steamcmdPath} +login ${accountName} ${accountPassword}`;
		if (twoFactorCode) steamCmd += ` ${twoFactorCode}`;

		console.log(`Running steamcmd: ${steamCmd}`);

		let runSteamAgain = false;
		let proceed = 0;
		await runCmd(steamCmd, MAX_TIMEOUT / 4, (child: ChildProcess, data: string, _: string) => { // timeout / 4 because the max running time on github is 5 mins
			if (data.startsWith("FAILED (Two-factor code mismatch")) {
				child.kill(9);
				runSteamAgain = true;
			} else {
				steamCmdProc = child;
			}
		}, (data: string) => {
			if (data.endsWith("OK")) {
				proceed++;
			}

			return proceed >= 4;
		});

		proceed = 0;
		if (runSteamAgain) await runCmd(steamCmd, MAX_TIMEOUT, (child: ChildProcess, _: string, __: string) => { steamCmdProc = child; }, (data: string) => {
			if (data.endsWith("OK")) {
				proceed++;
			}

			return proceed >= 4;
		});

		await spawnProcess(gmPublishPath, ["update", "-addon", gmaPath, "-id", workshopId, "-changes", changes], {
			detached: false,
			shell: false,
		});
	} catch (e) {
		err = e;
	} finally {
		fs.unlinkSync(gmaPath);
		fs.unlinkSync(passcodePath);

		if (steamCmdProc) steamCmdProc.kill(9);
	}

	if (err !== null) throw new Error(err);
}
