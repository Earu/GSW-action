"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
const debug_1 = __importDefault(require("./debug"));
const DEBUG = false;
let getParameter = DEBUG ? debug_1.default : core_1.getInput;
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const accountName = getParameter("account-name");
            const accountPassword = getParameter("account-password");
            const workshopId = getParameter("workshop-id");
            const accountSecret = getParameter("account-secret");
            const addonPath = getParameter("addon-path");
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
            yield (0, publishGMA_1.default)(accountName, accountPassword, workshopId, constants_1.GMA_PATH, changes, accountSecret);
            (0, core_1.setOutput)("error-code", 0);
            process.exit(0);
        }
        catch (e) {
            console.error(e);
            (0, core_1.setFailed)(e);
            process.exit(1);
        }
    });
}
run();
