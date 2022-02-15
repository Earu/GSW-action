import child_process from "child_process";

export default async function runCmd(cmd: string, timeoutTime?: number, onLog?: any): Promise<any> {

	if (!timeoutTime) timeoutTime = 1000 * 60 * 5;

	return new Promise((resolve, reject) => {
		const child = child_process.exec(cmd, (err, stdOut, stdErr) => {
			if (err) {
				console.log(stdErr);
				reject(err.message);
				return;
			}

			resolve(stdOut);

			const timeout = setTimeout(resolve, timeoutTime);

			child.stdout.on("data", (data) => {
				timeout.refresh();

				console.log(data);
				if (onLog) onLog(child, data, "stdout");
			});

			child.stderr.on("data", (data) => {
				timeout.refresh();

				console.error(data);
				if (onLog) onLog(child, data, "stderr");
			});
		});
	});
}