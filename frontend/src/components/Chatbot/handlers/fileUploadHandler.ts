import { PendingFile, Message } from "../types";

export interface FileUploadConfig {
	apiBaseUrl: string;
	maxFiles?: number;
}

/**
 * Uploads a single file to the backend
 */
export const uploadFile = async (
	file: File,
	apiBaseUrl: string
): Promise<string> => {
	const formData = new FormData();
	formData.append("file", file);

	const response = await fetch(`${apiBaseUrl}/upload-file`, {
		method: "POST",
		body: formData,
	});

	if (!response.ok) {
		throw new Error(`Upload failed: ${response.status}`);
	}

	const uploadResult = await response.json();
	return uploadResult.file_path;
};

/**
 * Uploads multiple files and returns their paths
 */
export const uploadMultipleFiles = async (
	pendingFiles: PendingFile[],
	apiBaseUrl: string,
	addMessage: (msg: Message) => void
): Promise<string[]> => {
	const uploadedFilePaths: string[] = [];

	if (pendingFiles.length === 0) {
		return uploadedFilePaths;
	}

	try {
		// Show file messages immediately for better UX
		for (const pendingFile of pendingFiles) {
			addMessage({
				sender: "user",
				attachment: {
					name: pendingFile.file.name,
					url: pendingFile.url,
					type: pendingFile.file.type,
				},
				timestamp: new Date().toISOString(),
			});
		}

		// Upload files to backend
		for (const pendingFile of pendingFiles) {
			const filePath = await uploadFile(pendingFile.file, apiBaseUrl);
			uploadedFilePaths.push(filePath);
		}

		return uploadedFilePaths;
	} catch (error) {
		console.error("Error uploading files:", error);
		addMessage({
			sender: "bot",
			text: "Sorry, I couldn't upload your files. Please try again.",
			timestamp: new Date().toISOString(),
		});
		throw error;
	}
};

/**
 * Handles file selection from input
 */
export const handleFileChange = (
	event: React.ChangeEvent<HTMLInputElement>,
	setPendingFiles: React.Dispatch<React.SetStateAction<PendingFile[]>>,
	maxFiles: number = 3,
	totalUploadedFiles: number = 0,
	maxTotalFiles: number = 5
): void => {
	const file = event.target.files?.[0];
	if (!file) return;

	// Check if adding this file would exceed the total limit
	if (totalUploadedFiles >= maxTotalFiles) {
		// Could show an error message here
		console.warn(
			`Maximum ${maxTotalFiles} files allowed for the entire conversation`
		);
		return;
	}

	// Only add to pending files, don't upload or create message yet
	const url = URL.createObjectURL(file);

	setPendingFiles((prev) => {
		// Check both pending files limit and total files limit
		const currentPendingCount = prev.length;
		const wouldExceedTotal =
			totalUploadedFiles + currentPendingCount + 1 > maxTotalFiles;

		if (currentPendingCount >= maxFiles || wouldExceedTotal) {
			URL.revokeObjectURL(url);
			return prev;
		}
		return [...prev, { file, url }];
	});

	// Reset input value to allow selecting the same file again
	event.target.value = "";
};

/**
 * Removes a pending file from the list
 */
export const removePendingFile = (
	index: number,
	setPendingFiles: React.Dispatch<React.SetStateAction<PendingFile[]>>
): void => {
	setPendingFiles((prev) => {
		const newFiles = prev.filter((_, i) => i !== index);
		// Clean up the object URL to prevent memory leaks
		URL.revokeObjectURL(prev[index].url);
		return newFiles;
	});
};

/**
 * Cleans up all pending file URLs
 */
export const cleanupPendingFiles = (pendingFiles: PendingFile[]): void => {
	pendingFiles.forEach((pendingFile) => {
		URL.revokeObjectURL(pendingFile.url);
	});
};

/**
 * Validates file before upload
 */
export const validateFile = (
	file: File,
	maxSizeMB: number = 10,
	allowedTypes?: string[]
): { valid: boolean; error?: string } => {
	// Check file size
	const maxSizeBytes = maxSizeMB * 1024 * 1024;
	if (file.size > maxSizeBytes) {
		return {
			valid: false,
			error: `File size exceeds ${maxSizeMB}MB limit`,
		};
	}

	// Check file type if specified
	if (allowedTypes && allowedTypes.length > 0) {
		const fileType = file.type;
		const fileExtension = file.name.split(".").pop()?.toLowerCase();

		const isTypeAllowed = allowedTypes.some((type) => {
			if (type.includes("*")) {
				// Handle wildcard types like "image/*"
				return fileType.startsWith(type.replace("*", ""));
			}
			return fileType === type || fileExtension === type.replace(".", "");
		});

		if (!isTypeAllowed) {
			return {
				valid: false,
				error: `File type not allowed. Allowed types: ${allowedTypes.join(
					", "
				)}`,
			};
		}
	}

	return { valid: true };
};
