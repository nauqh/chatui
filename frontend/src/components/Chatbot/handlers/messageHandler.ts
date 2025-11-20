import { Message, ChatRequestBody } from "../types";

export interface MessageHandlerConfig {
	apiBaseUrl: string;
	typingDelay: number;
}

/**
 * Generates a unique conversation ID
 */
export const generateConversationId = (): string => {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Sends a message to the backend API
 */
export const sendMessage = async (
	requestBody: ChatRequestBody,
	addMessage: (msg: Message) => void,
	setIsBotTyping: (value: boolean) => void,
	apiBaseUrl: string,
	handleProductsInResponse: (
		products: string[],
		apiBaseUrl: string,
		addMessage: (msg: Message) => void,
		delay: number,
		originalMessage?: Message
	) => Promise<void>
) => {
	const response = await fetch(`${apiBaseUrl}/chat`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(requestBody),
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const responseData = await response.json();
	setIsBotTyping(false);

	const botMessage: Message = {
		sender: "bot",
		text:
			responseData.response ||
			"I apologize, but I couldn't generate a response at this time. Please try again.",
		timestamp: new Date().toISOString(),
		action: responseData.action,
		filters: responseData.filters,
	};

	addMessage(botMessage);

	// Handle products from API response using the product handler
	if (responseData.products && responseData.products.length > 0) {
		console.log("Processing products:", responseData.products);
		await handleProductsInResponse(
			responseData.products,
			apiBaseUrl,
			addMessage,
			1000,
			botMessage
		);
	} else {
		console.log("No products found in response or products array is empty");
	}
};

/**
 * Creates a user message object
 */
export const createUserMessage = (text: string): Message => {
	return {
		sender: "user",
		text,
		timestamp: new Date().toISOString(),
	};
};

/**
 * Creates a bot message object
 */
export const createBotMessage = (text: string): Message => {
	return {
		sender: "bot",
		text,
		timestamp: new Date().toISOString(),
	};
};

/**
 * Creates an error message for the bot
 */
export const createErrorMessage = (error?: string): Message => {
	return {
		sender: "bot",
		text:
			error ||
			"Sorry, I'm having trouble connecting to my backend. Please try again later.",
		timestamp: new Date().toISOString(),
	};
};
