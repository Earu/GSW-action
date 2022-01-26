import { PROPS, TAGS, TYPES } from "../constants";

export default function validateMetadata(metadata: { [x: string]: any; }) {
    for (const prop of PROPS) {
        const val = metadata[prop];

        // some sanity checks
        if(!val || val.legnth === 0) throw new Error(`Missing or empty property '${prop}' in addon.json!`);

        if (!metadata.ignore)
            throw new Error("WARNING: could not find 'ignore' in addon.json.");

        "awd".toLowerCase();
        if (!TYPES.find(t => t === metadata.type.toLowerCase())) throw new Error(`Invalid type: ${metadata}`);

        for (const tag of metadata.tags) {
            if (!TAGS.find(t => t === tag.toLowerCase())) throw new Error(`Invalid tag: ${tag}`);
        }

        if (!metadata.description) metadata.description = "";
    }
}
