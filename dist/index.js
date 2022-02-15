"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const buildDescription_1 = __importDefault(require("./helpers/buildDescription"));
const github_1 = require("@actions/github");
const createGMA_1 = __importDefault(require("./helpers/createGMA"));
const fs_1 = __importDefault(require("fs"));
const getFilePaths_1 = __importDefault(require("./helpers/getFilePaths"));
const constants_1 = require("./constants");
const path_1 = __importDefault(require("path"));
const publishGMA_1 = __importDefault(require("./helpers/publishGMA"));
const validateFiles_1 = __importDefault(require("./helpers/validateFiles"));
const validateMetaData_1 = __importDefault(require("./helpers/validateMetaData"));
const core_1 = require("@actions/core");
const DEBUG = false;
const pgk = DEBUG ? './debug' : '@actions/core';
const getInput = require(pgk).getInput;
try {
    const accountName = getInput("account-name");
    const accountPassword = getInput("account-password");
    const workshopId = getInput("workshop-id");
    const accountSecret = getInput("account-secret");
    const addonPath = getInput("addon-path");
    const metadataPath = path_1.default.join(addonPath, "addon.json");
    if (!fs_1.default.existsSync(metadataPath)) {
        (0, core_1.setFailed)("Missing addon.json!");
        process.exit(1);
    }
    const metadata = JSON.parse(fs_1.default.readFileSync(metadataPath).toString());
    (0, validateMetaData_1.default)(metadata);
    const filePaths = (0, getFilePaths_1.default)(addonPath, metadata.ignore);
    (0, validateFiles_1.default)(filePaths);
    (0, createGMA_1.default)(constants_1.GMA_PATH, metadata.title, (0, buildDescription_1.default)(metadata), filePaths, addonPath);
    let changes = "";
    if (DEBUG) {
        changes = "DEBUG MESSAGE";
    }
    else if (github_1.context.payload.head_commit && github_1.context.payload.head_commit.message) {
        changes = github_1.context.payload.head_commit.message;
    }
    (0, publishGMA_1.default)(accountName, accountPassword, workshopId, constants_1.GMA_PATH, changes, accountSecret);
    (0, core_1.setOutput)("error-code", 0);
    process.exit(0);
}
catch (e) {
    console.error(e);
    (0, core_1.setFailed)(e);
    process.exit(1);
}
