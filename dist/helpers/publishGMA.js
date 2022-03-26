"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const glob_1 = require("glob");
const path_1 = __importDefault(require("path"));
const runCmd_1 = require("./runCmd");
function findFilePath(pattern) {
    const matches = glob_1.glob.sync(pattern, { nodir: true });
    if (matches.length === 0) {
        throw new Error(`Could not find file matching pattern: ${pattern}`);
    }
    return matches[0];
}
function publishGMA(accountName, accountPassword, workshopId, changes, accountSecret) {
    return __awaiter(this, void 0, void 0, function* () {
        // can't rely on static paths because github action environment are idiotic
        const gmaPath = path_1.default.resolve(findFilePath("**/addon.gma"));
        const steamcmdPath = path_1.default.resolve(__dirname, "..", "..", "bin", "steamcmd.exe");
        const steamGuardPath = path_1.default.resolve(__dirname, "..", "..", "bin", "steam_guard.exe");
        const passcodePath = path_1.default.resolve(__dirname, "..", "..", "bin", "passcode.txt");
        const gma = fs_1.default.readFileSync(gmaPath).toString();
        console.log(`Uploading GMA file: ${gmaPath} (${gma.length} bytes)`);
        fs_1.default.writeFileSync("workshop.vdf", `"workshopitem"
{
	"appid" "4000"
	"contentfolder" "${gmaPath}"
	"changenote" "${changes.replace("\"", "")}"
	"publishedfileid" "${workshopId}"
}`);
        const workshopVdfPath = path_1.default.resolve(findFilePath("**/workshop.vdf"));
        console.log("Worshop VDF file created at: " + workshopVdfPath);
        let err = null;
        let twoFactorCode = null;
        if (accountSecret) {
            console.log("Getting Steam 2FA code...");
            try {
                fs_1.default.chmodSync(steamGuardPath, "0755");
                yield (0, runCmd_1.runCmd)(`${steamGuardPath} ${accountSecret}`);
                twoFactorCode = fs_1.default.readFileSync(passcodePath, "utf-8").trim();
            }
            catch (e) {
                err = e;
            }
        }
        let steamCmdProc;
        try {
            fs_1.default.chmodSync(steamcmdPath, "0755");
            let steamCmd = `${steamcmdPath} +@ShutdownOnFailedCommand 1 +login ${accountName} ${accountPassword}`;
            if (twoFactorCode)
                steamCmd += ` ${twoFactorCode}`;
            steamCmd += ` +workshop_build_item "${workshopVdfPath}" +quit`;
            yield (0, runCmd_1.runCmd)(steamCmd, (child, data, _) => {
                if (data.startsWith("FAILED (Two-factor code mismatch")) {
                    child.kill(9);
                }
                else {
                    steamCmdProc = child;
                }
            });
        }
        catch (e) {
            err = e;
        }
        finally {
            fs_1.default.unlinkSync(gmaPath);
            fs_1.default.unlinkSync(passcodePath);
            fs_1.default.unlinkSync(workshopVdfPath);
            if (steamCmdProc)
                steamCmdProc.kill(9);
        }
        if (err !== null)
            throw new Error(err);
    });
}
exports.default = publishGMA;
