"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function buildDescription(metadata) {
    return JSON.stringify({
        description: metadata.description,
        type: metadata.type,
        tags: metadata.tags.map(t => t.toLowerCase())
    });
}
exports.default = buildDescription;
//# sourceMappingURL=buildDescription.js.map