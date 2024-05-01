export type ServerAsset = {
	_id: string;
	length: number;
	chunkSize: number;
	uploadDate: string;
	filename: string;
	contentType: string;
};

export type Asset = {
	id: string;
	size: string;
	name: string;
	filename: string;
	uploadDate: string;
	ext: string;
};

export type UploadTask = {
	name: string;
	size: number;
	upload: number;
	cancel: () => void;
};
