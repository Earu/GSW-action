import { InputOptions } from "@actions/core";
import path from "path";
import fs from "fs";

export default function getDebugInput(input: string, options?: InputOptions): string {
	const debug = JSON.parse(fs.readFileSync(path.join(__dirname, "debug.json")).toString());
	if (debug[input]) return debug[input];

	return "";
}