"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function validateFiles(filePaths) {
    filePaths.forEach(f => {
        if (f !== f.toLowerCase())
            throw new Error(`${f} is not lower case! Please rectify this.`);
        else
            return;
    });
}
exports.default = validateFiles;
//# sourceMappingURL=validateFiles.js.map