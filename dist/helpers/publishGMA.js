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
        const gmaPath = findFilePath("**/addon.gma");
        const basePath = path_1.default.resolve("./", "..");
        const steamcmdPath = path_1.default.resolve(basePath, "bin", "steamcmd.exe");
        const gmPublishPath = path_1.default.resolve(basePath, "bin", "gmpublish.exe");
        const steamGuardPath = path_1.default.resolve(basePath, "bin", "steam_guard.exe");
        let err = null;
        let twoFactorCode = null;
        if (accountSecret) {
            console.log("Getting Steam 2FA code...");
            try {
                fs_1.default.chmodSync(steamGuardPath, "0755");
                yield (0, runCmd_1.runCmd)(`${steamGuardPath} ${accountSecret}`);
                const passcodePath = findFilePath("**/passcode.txt");
                twoFactorCode = fs_1.default.readFileSync(passcodePath, "utf-8").trim();
                fs_1.default.unlinkSync(passcodePath);
            }
            catch (e) {
                err = e;
            }
        }
        let steamCmdProc;
        try {
            fs_1.default.chmodSync(steamcmdPath, "0755");
            fs_1.default.chmodSync(gmPublishPath, "0755");
            let steamCmd = `${steamcmdPath} +login ${accountName} ${accountPassword}`;
            if (twoFactorCode)
                steamCmd += ` ${twoFactorCode}`;
            let runSteamAgain = false;
            yield (0, runCmd_1.runCmd)(steamCmd, 20000, (child, data) => {
                if (data.startsWith("FAILED (Two-factor code mismatch")) {
                    child.kill(9);
                    runSteamAgain = true;
                }
                else {
                    steamCmdProc = child;
                }
            });
            if (runSteamAgain)
                yield (0, runCmd_1.runCmd)(steamCmd, 20000, (child) => { steamCmdProc = child; });
            yield (0, runCmd_1.spawnProcess)(gmPublishPath, ["update", "-addon", gmaPath, "-id", workshopId, "-changes", changes], {
                detached: false,
                shell: false,
                cwd: basePath,
            });
        }
        catch (e) {
            err = e;
        }
        finally {
            fs_1.default.unlinkSync(gmaPath);
            if (steamCmdProc)
                steamCmdProc.kill(9);
        }
        if (err !== null)
            throw new Error(err);
    });
}
exports.default = publishGMA;
