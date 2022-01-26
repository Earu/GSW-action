import path from "path";
import glob from "glob";
import { WILDCARDS } from "../constants";

export default function getFilePaths(dirPath: string, exceptionWildCards: Array<string>) {
    let ret: Array<string> = [];

    WILDCARDS.forEach(wc => {
        const completeWildCard = path.join(dirPath, wc).replace(/\\/g, "/");
        const filePaths = glob.sync(completeWildCard, {
            ignore: exceptionWildCards,
            nodir: true
        });

        ret = ret.concat(filePaths);
    });

    return ret;
}