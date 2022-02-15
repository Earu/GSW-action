export default function validateFiles (filePaths: Array<string>) {
	for (const filePath of filePaths) {
		if (filePath !== filePath.toLowerCase()) {
			throw new Error (`${filePath} is not lower case! Please rectify this.`);
		}
	}
}