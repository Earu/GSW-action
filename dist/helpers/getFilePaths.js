"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const glob_1 = __importDefault(require("glob"));
const constants_1 = require("../constants");
function getFilePaths(dirPath, exceptionWildCards) {
    let ret = [];
    constants_1.WILDCARDS.forEach(wc => {
        const completeWildCard = path_1.default.join(dirPath, wc).replace(/\\/g, "/");
        const filePaths = glob_1.default.sync(completeWildCard, {
            ignore: exceptionWildCards,
            nodir: true
        });
        ret = ret.concat(filePaths);
    });
    return ret;
}
exports.default = getFilePaths;
