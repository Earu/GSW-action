export default function validateFiles (filePaths: Array<string>) {
    filePaths.forEach(f => {
        if (f !== f.toLowerCase()) throw new Error (`${f} is not lower case! Please rectify this.`);
        else return;
    });
}