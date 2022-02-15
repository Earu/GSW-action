"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
function getDebugInput(input, options) {
    const debug = JSON.parse(fs_1.default.readFileSync(path_1.default.join(__dirname, "..", "debug.json")).toString());
    if (debug[input])
        return debug[input];
    return "";
}
exports.default = getDebugInput;
