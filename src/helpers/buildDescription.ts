import IAddonSchema from "../schemas/addon.schema";

export default function buildDescription(metadata: IAddonSchema) {
    return JSON.stringify({
        description: metadata.description,
        type: metadata.type,
        tags: metadata.tags.map(t => t.toLowerCase())
    });
}