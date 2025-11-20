import { TierraProduct } from "../ProductCard";

export interface Message {
	sender: "user" | "bot";
	text?: string;
	attachment?: {
		name: string;
		url: string;
		type: string;
	};
	filePaths?: string[];
	timestamp?: string;
	id?: string;
	product?: TierraProduct;
	products?: TierraProduct[]; // For multiple products in one message
	// New fields for triage flow
	action?: "triage" | "shortlist" | "detail" | "compare" | "refine";
	filters?: string[];
	showMoreButton?: boolean;
}

export interface PendingFile {
	file: File;
	url: string;
}

export interface CustomerInfo {
	name: string;
	phone: string;
}

export type ChatRequestBody = {
	conversation_id: string;
	message: string;
	file_paths?: string[];
};

export interface ProductHandlerConfig {
	apiBaseUrl: string;
}

export interface FileUploadConfig {
	apiBaseUrl: string;
	maxFiles?: number;
}
