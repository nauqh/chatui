import { Message, PendingFile, CustomerInfo } from "../types";
import { generateConversationId } from "./messageHandler";
import { resetCustomerRegistration } from "./customerHandler";

export interface ChatHandlerConfig {
	conversationIdStorageKey?: string;
}

const DEFAULT_CONVERSATION_ID_STORAGE_KEY = "chatbot_conversation_id";

/**
 * Downloads chat transcript as a text file
 */
export const handleDownloadTranscript = (messages: Message[]): void => {
	const lines: string[] = [];

	lines.push("Transcript");
	lines.push(new Date().toUTCString());
	lines.push("");

	messages.forEach((msg, idx) => {
		const time = msg.timestamp
			? new Date(msg.timestamp).toLocaleString()
			: "";
		const sender = msg.sender === "user" ? "You" : "Assistant";

		if (msg.text && msg.text.trim()) {
			lines.push(`[${time}] ${sender}: ${msg.text}`);
		} else if (msg.attachment) {
			lines.push(`[${time}] ${sender}: Attachment`);
			lines.push(
				`[${time}] ${sender}: ${msg.attachment.name} (${msg.attachment.type})`
			);
		}

		if (idx < messages.length - 1) lines.push("");
	});

	const transcript = lines.join("\n");
	const blob = new Blob([transcript], {
		type: "text/plain;charset=utf-8",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");

	a.href = url;
	a.download = "transcript.txt";
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
};

/**
 * Refreshes the chat by clearing all state and resetting
 */
export const handleRefreshChat = (
	setMessages: (messages: Message[]) => void,
	setInput: (input: string) => void,
	setPendingFiles: (files: PendingFile[]) => void,
	setConversationId: (id: string) => void,
	setIsBotTyping: (typing: boolean) => void,
	setVisibleTimestampIdx: (idx: number | null) => void,
	setCustomerRegistered: (registered: boolean) => void,
	setCustomerInfo: (info: CustomerInfo) => void,
	setOpen: (open: boolean) => void,
	setShowCustomerModal: (show: boolean) => void,
	conversationIdStorageKey: string = DEFAULT_CONVERSATION_ID_STORAGE_KEY
): void => {
	// Clear all messages
	setMessages([]);
	// Clear input
	setInput("");
	// Clear pending files
	setPendingFiles([]);
	// Generate new conversation ID
	const newId = generateConversationId();
	setConversationId(newId);
	if (typeof window !== "undefined") {
		sessionStorage.setItem(conversationIdStorageKey, newId);
	}
	// Reset typing state
	setIsBotTyping(false);
	// Reset timestamp visibility
	setVisibleTimestampIdx(null);
	// Reset customer registration
	resetCustomerRegistration(setCustomerRegistered, setCustomerInfo);
	// Close chat and show modal for new registration
	setOpen(false);
	setShowCustomerModal(true);
};

/**
 * Initializes conversation ID from session storage or creates new one
 */
export const initializeConversationId = (
	setConversationId: (id: string) => void,
	conversationIdStorageKey: string = DEFAULT_CONVERSATION_ID_STORAGE_KEY
): void => {
	if (typeof window === "undefined") return;

	const newId = generateConversationId();
	sessionStorage.setItem(conversationIdStorageKey, newId);
	setConversationId(newId);
};

/**
 * Gets conversation ID from session storage or generates new one
 */
export const getOrCreateConversationId = (
	conversationId: string,
	setConversationId: (id: string) => void,
	conversationIdStorageKey: string = DEFAULT_CONVERSATION_ID_STORAGE_KEY
): string => {
	if (conversationId) return conversationId;

	const newId = generateConversationId();
	setConversationId(newId);
	if (typeof window !== "undefined") {
		sessionStorage.setItem(conversationIdStorageKey, newId);
	}
	return newId;
};
