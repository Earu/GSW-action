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
const constants_1 = require("../constants");
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
        const gmaPath = findFilePath("**/addon.gma");
        const steamcmdPath = path_1.default.resolve(__dirname, "..", "..", "bin", "steamcmd.exe");
        const gmPublishPath = path_1.default.resolve(__dirname, "..", "..", "bin", "gmpublish.exe");
        const steamGuardPath = path_1.default.resolve(__dirname, "..", "..", "bin", "steam_guard.exe");
        const passcodePath = path_1.default.resolve(__dirname, "..", "..", "bin", "passcode.txt");
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
            fs_1.default.chmodSync(gmPublishPath, "0755");
            let steamCmd = `${steamcmdPath} +login ${accountName} ${accountPassword}`;
            if (twoFactorCode)
                steamCmd += ` ${twoFactorCode}`;
            console.log(`Running steamcmd: ${steamCmd}`);
            let runSteamAgain = false;
            let proceed = 0;
            yield (0, runCmd_1.runCmd)(steamCmd, constants_1.MAX_TIMEOUT / 4, (child, data, _) => {
                if (data.startsWith("FAILED (Two-factor code mismatch")) {
                    child.kill(9);
                    runSteamAgain = true;
                }
                else {
                    steamCmdProc = child;
                }
            }, (data) => {
                if (data.endsWith("OK")) {
                    proceed++;
                }
                return proceed >= 4;
            });
            proceed = 0;
            if (runSteamAgain)
                yield (0, runCmd_1.runCmd)(steamCmd, constants_1.MAX_TIMEOUT, (child, _, __) => { steamCmdProc = child; }, (data) => {
                    if (data.endsWith("OK")) {
                        proceed++;
                    }
                    return proceed >= 4;
                });
            yield (0, runCmd_1.spawnProcess)(gmPublishPath, ["update", "-addon", gmaPath, "-id", workshopId, "-changes", changes], {
                detached: false,
                shell: false,
            });
        }
        catch (e) {
            err = e;
        }
        finally {
            fs_1.default.unlinkSync(gmaPath);
            fs_1.default.unlinkSync(passcodePath);
            if (steamCmdProc)
                steamCmdProc.kill(9);
        }
        if (err !== null)
            throw new Error(err);
    });
}
exports.default = publishGMA;
