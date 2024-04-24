// place files you want to import through the `$lib` alias in this folder.

export function toHumanReadableSize(size: number) {
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	let i = 0;
	while (size > 1024) {
		size /= 1024;
		i++;
	}
	return `${size.toFixed(2)} ${units[i]}`;
}
