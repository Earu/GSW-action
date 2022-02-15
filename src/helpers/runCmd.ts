import { exec } from "child_process";

export default async function runCmd(cmd: string, timeoutTime?: number, onLog?: any): Promise<any>
{
	if (!timeoutTime) timeoutTime = 1000 * 60 * 5; // 5 minutes

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
		});

		child.stderr.on('data', (data) => {
			timeout.refresh();
			console.error(data);

			if (onLog) {
				onLog(child, data, "stderr");
			}
		});
	});
}