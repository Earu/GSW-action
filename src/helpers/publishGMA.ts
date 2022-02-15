import fs from "fs";
import path from "path";
import runCmd from "./runCmd";

export default async function publishGMA(accountName:string, accountPassword: string, workshopId: string,
	relativeGMAPath: string, changes: string, accountSecret: string) {
	const basePath = path.resolve("./");
	const gmaPath = path.resolve(basePath, relativeGMAPath);
	const steamcmdPath = path.resolve(basePath, "bin", "steamcmd.exe");
	const gmPublishPath = path.resolve(basePath, "bin", "gmpublish.exe");
	const steamGuardPath = path.resolve(basePath, "bin", "steam_guard.exe");
	const passcodePath = path.resolve(basePath, "passcode.txt");

	let err = null;
	let twoFactorCode = null;
	if (accountSecret) {
		console.log("Getting Steam 2FA code, please be patient...");

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

		let runSteamAgain = true;
		await runCmd(steamCmd, 5000, (child: NodeJS.Process, timeout: string) => {
			if (timeout.startsWith("FAILED (Two-factor code mismatch")) {
				child.kill(127);
				runSteamAgain = true;
			} else {
				steamCmdProc = child;
			}
		});

		if (runSteamAgain) await runCmd(steamCmd, 5000, (c: NodeJS.Process) => {steamCmdProc = c;});

		await runCmd(`${gmPublishPath} update -addon "${gmaPath}" -id "${workshopId}" -changes "${changes}"`);

	} catch (e) {
		err = e;
	} finally {
		fs.unlinkSync(gmaPath);
		fs.unlinkSync(passcodePath);

		if (steamCmdProc) steamCmdProc.kill(0);
	}

	if (err !== null) throw new Error(err);
}
