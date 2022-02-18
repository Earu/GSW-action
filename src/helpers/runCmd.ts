import { ChildProcess, exec, SpawnOptionsWithoutStdio, spawnSync } from "child_process";
import { MAX_TIMEOUT } from "../constants";

export async function runCmd(cmd: string, timeoutTime?: number, onLog?: (child: ChildProcess, data: string, type: string) => void, shouldComplete?: (data: string) => boolean): Promise<any>
{
	if (!timeoutTime) timeoutTime = MAX_TIMEOUT; // 5 minutes

	return new Promise<void>((resolve, reject) => {
		const child = exec(cmd, (err, _, stderr) => {
			if (err) {
				console.log(stderr);
				reject(err.message);
				return;
			}

			resolve();
		});

		const timeout = setTimeout(resolve, timeoutTime);
		child.stdout.on('data', (data) => {
			timeout.refresh();
			console.log(data);

			if (onLog) {
				onLog(child, data, "stdout");
			}

			if (shouldComplete && shouldComplete(data)) {
				clearTimeout(timeout);
				resolve();
			}
		});

		child.stderr.on('data', (data) => {
			timeout.refresh();
			console.error(data);

			if (onLog) {
				onLog(child, data, "stderr");
			}

			if (shouldComplete && shouldComplete(data)) {
				clearTimeout(timeout);
				resolve();
			}
		});
	});
}

export async function spawnProcess(fileName: string, args: Array<string>, options?: SpawnOptionsWithoutStdio): Promise<any>
{
	let res = spawnSync(fileName, args, options);
	console.log(res.stdout.toString());
	console.error(res.stderr.toString());
	console.log(res.status);
}