"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("../constants");
function validateMetadata(metadata) {
    for (const prop of constants_1.PROPS) {
        const val = metadata[prop];
        // some sanity checks
        if (!val || val.legnth === 0)
            throw new Error(`Missing or empty property '${prop}' in addon.json!`);
        if (!metadata.ignore)
            throw new Error("WARNING: could not find 'ignore' in addon.json.");
        if (!constants_1.TYPES.find(type => type === metadata.type.toLowerCase()))
            throw new Error(`Invalid type: ${metadata}`);
        for (const tag of metadata.tags) {
            if (!constants_1.TAGS.find(tag => tag === tag.toLowerCase()))
                throw new Error(`Invalid tag: ${tag}`);
        }
        if (!metadata.description)
            metadata.description = "";
    }
}
exports.default = validateMetadata;
//# sourceMappingURL=validateMetaData.js.map