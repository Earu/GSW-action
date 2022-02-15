"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function validateFiles(filePaths) {
    for (const filePath of filePaths) {
        if (filePath !== filePath.toLowerCase()) {
            throw new Error(`${filePath} is not lower case! Please rectify this.`);
        }
    }
}
exports.default = validateFiles;
