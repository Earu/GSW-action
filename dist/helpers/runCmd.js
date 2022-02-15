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
const child_process_1 = __importDefault(require("child_process"));
function runCmd(cmd, timeoutTime, onLog) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!timeoutTime)
            timeoutTime = 1000 * 60 * 5;
        return new Promise((resolve, reject) => {
            const child = child_process_1.default.exec(cmd, (err, stdOut, stdErr) => {
                if (err) {
                    console.log(stdErr);
                    reject(err.message);
                    return;
                }
                resolve(stdOut);
                const timeout = setTimeout(resolve, timeoutTime);
                child.stdout.on("data", (data) => {
                    timeout.refresh();
                    console.log(data);
                    if (onLog)
                        onLog(child, data, "stdout");
                });
                child.stderr.on("data", (data) => {
                    timeout.refresh();
                    console.error(data);
                    if (onLog)
                        onLog(child, data, "stderr");
                });
            });
        });
    });
}
exports.default = runCmd;
//# sourceMappingURL=runCmd.js.map