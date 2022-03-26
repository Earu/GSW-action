import { ChildProcess } from "child_process";
import fs from "fs";
import { glob } from "glob";
import path from "path";
import { runCmd } from "./runCmd";

function findFilePath(pattern: string) {
	const matches = glob.sync(pattern, { nodir: true});
	if (matches.length === 0) {
		throw new Error(`Could not find file matching pattern: ${pattern}`);
	}

	return matches[0];
}

export default async function publishGMA(accountName: string, accountPassword: string, workshopId: string, changes: string, accountSecret: string) {
	// can't rely on static paths because github action environment are idiotic
	const gmaPath = path.resolve(findFilePath("**/addon.gma"));
	const steamcmdPath = path.resolve(__dirname, "..", "..", "bin", "steamcmd.exe");
	const steamGuardPath = path.resolve(__dirname, "..", "..", "bin", "steam_guard.exe");
	const passcodePath = path.resolve(__dirname, "..", "..", "bin", "passcode.txt");

	const gma = fs.readFileSync(gmaPath).toString();
	console.log(`Uploading GMA file: ${gmaPath} (${gma.length} bytes)`);

	fs.writeFileSync("workshop.vdf", `"workshopitem"
{
	"appid" "4000"
	"contentfolder" "${gmaPath}"
	"changenote" "${changes.replace("\"", "")}"
	"publishedfileid" "${workshopId}"
}`);

	const workshopVdfPath = path.resolve(findFilePath("**/workshop.vdf"));
	console.log("Worshop VDF file created at: " + workshopVdfPath);

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

		let steamCmd = `${steamcmdPath} +@ShutdownOnFailedCommand 1 +login ${accountName} ${accountPassword}`;
		if (twoFactorCode) steamCmd += ` ${twoFactorCode}`;

		steamCmd += ` +workshop_build_item "${workshopVdfPath}" +quit`;

		await runCmd(steamCmd, (child: ChildProcess, data: string, _: string) => { // timeout / 4 because the max running time on github is 5 mins
			if (data.startsWith("FAILED (Two-factor code mismatch")) {
				child.kill(9);
			} else {
				steamCmdProc = child;
			}
		});
	} catch (e) {
		err = e;
	} finally {
		fs.unlinkSync(gmaPath);
		fs.unlinkSync(passcodePath);
		fs.unlinkSync(workshopVdfPath);

		if (steamCmdProc) steamCmdProc.kill(9);
	}

	if (err !== null) throw new Error(err);
}
