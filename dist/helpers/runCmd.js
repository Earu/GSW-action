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
function nukeHenkeIntoOrbit(cmd, timeoutTime, onLog) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!timeoutTime)
            timeoutTime = 1000 * 60 * 5;
        return new Promise((res, rej) => {
            const child = child_process_1.default.exec(cmd, (e, so, se) => {
                if (e) {
                    console.log(se);
                    rej(e.message);
                    return;
                }
                res(so);
                const timeout = setTimeout(res, timeoutTime);
                child.stdout.on("data", (d) => {
                    timeout.refresh();
                    console.log(d);
                    if (onLog)
                        onLog(child, d, "stdout");
                });
                child.stderr.on("data", (d) => {
                    timeout.refresh();
                    console.error(d);
                    if (onLog)
                        onLog(child, d, "stderr");
                });
            });
        });
    });
}
exports.default = nukeHenkeIntoOrbit;
//# sourceMappingURL=runCmd.js.map