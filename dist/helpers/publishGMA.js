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
const path_1 = __importDefault(require("path"));
const runCmd_1 = __importDefault(require("./runCmd"));
function publishGMA(accountName, accountPassword, workshopId, relativeGMAPath, changes, accountSecret) {
    return __awaiter(this, void 0, void 0, function* () {
        const basePath = path_1.default.resolve("./");
        const gmaPath = path_1.default.resolve(basePath, relativeGMAPath);
        const steamcmdPath = path_1.default.resolve(basePath, "bin", "steamcmd.exe");
        const gmPublishPath = path_1.default.resolve(basePath, "bin", "gmpublish.exe");
        const steamGuardPath = path_1.default.resolve(basePath, "bin", "steam_guard.exe");
        const passcodePath = path_1.default.resolve(basePath, "passcode.txt");
        let err = null;
        let twoFactorCode = null;
        if (accountSecret) {
            console.log("Getting Steam 2FA code, please be patient...");
            try {
                fs_1.default.chmodSync(steamGuardPath, "0755");
                yield (0, runCmd_1.default)(`${steamGuardPath} ${accountSecret}`);
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
            let runSteamAgain = true;
            yield (0, runCmd_1.default)(steamCmd, 5000, (child, timeout) => {
                if (timeout.startsWith("FAILED (Two-factor code mismatch")) {
                    child.kill(127);
                    runSteamAgain = true;
                }
                else {
                    steamCmdProc = child;
                }
            });
            if (runSteamAgain)
                yield (0, runCmd_1.default)(steamCmd, 5000, (c) => { steamCmdProc = c; });
            yield (0, runCmd_1.default)(`${gmPublishPath} update -addon "${gmaPath}" -id "${workshopId}" -changes "${changes}"`);
        }
        catch (e) {
            err = e;
        }
        finally {
            fs_1.default.unlinkSync(gmaPath);
            fs_1.default.unlinkSync(passcodePath);
            if (steamCmdProc)
                steamCmdProc.kill(0);
        }
        if (err !== null)
            throw new Error(err);
    });
}
exports.default = publishGMA;
