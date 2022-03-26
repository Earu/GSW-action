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
Object.defineProperty(exports, "__esModule", { value: true });
exports.runCmd = void 0;
const child_process_1 = require("child_process");
function runCmd(cmd, onLog) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            const child = (0, child_process_1.exec)(cmd, (err, _, stderr) => {
                if (err) {
                    console.log(stderr);
                    reject(err.message);
                    return;
                }
                resolve();
            });
            child.stdout.on('data', (data) => {
                console.log(data);
                if (onLog) {
                    onLog(child, data, "stdout");
                }
            });
            child.stderr.on('data', (data) => {
                console.error(data);
                if (onLog) {
                    onLog(child, data, "stderr");
                }
            });
        });
    });
}
exports.runCmd = runCmd;
