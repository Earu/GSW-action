import { ChildProcess, exec } from "child_process";

export async function runCmd(cmd: string, onLog?: (child: ChildProcess, data: string, type: string) => void): Promise<any>
{
	return new Promise<void>((resolve, reject) => {
		const child = exec(cmd, (err, _, stderr) => {
			if (err) {
				console.log(stderr);
				reject(err.message);
				return;
			}

			resolve();
		});

		child.stdout.on('data', (data) => {
			console.log(data);

			if (onLog) {
				onLog(child, data, "stdout");
			}
		});

		child.stderr.on('data', (data) => {
			console.error(data);

			if (onLog) {
				onLog(child, data, "stderr");
			}
		});
	});
}