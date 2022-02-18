import fs from "fs";
import { glob } from "glob";
import path from "path";
import { runCmd, spawnProcess } from "./runCmd";

export default async function publishGMA(accountName: string, accountPassword: string, workshopId: string, changes: string, accountSecret: string) {
	const basePath = path.resolve("./", "..");
	const gmaPath = glob.sync("**/addon.gma", {
		nodir: true
	})[0];

	if (!gmaPath) throw new Error("Could not find addon.gma file!");
	console.log("Found addon.gma file at: " + gmaPath);

	const steamcmdPath = path.resolve(basePath, "bin", "steamcmd.exe");
	const gmPublishPath = path.resolve(basePath, "bin", "gmpublish.exe");
	const steamGuardPath = path.resolve(basePath, "bin", "steam_guard.exe");
	const passcodePath = path.resolve(basePath, "bin", "passcode.txt");

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
			cwd: basePath,
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
