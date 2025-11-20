import { Message } from "../types";

export interface UIHandlerConfig {
	typingDelay?: number;
}

const DEFAULT_TYPING_DELAY = 1200;

/**
 * Toggles timestamp visibility for a message
 */
export const toggleTimestamp = (
	idx: number,
	visibleTimestampIdx: number | null,
	setVisibleTimestampIdx: (idx: number | null) => void
): void => {
	setVisibleTimestampIdx(visibleTimestampIdx === idx ? null : idx);
};

/**
 * Gets CSS classes for message styling
 */
export const getMessageClasses = (sender: "user" | "bot"): string => {
	const baseClasses =
		"px-4 py-2 rounded-xl text-sm shadow cursor-pointer relative z-20 break-words overflow-wrap-anywhere max-w-full";
	return sender === "user"
		? `${baseClasses} text-white`
		: `${baseClasses} bg-white text-gray-800 border border-gray-200`;
};

/**
 * Gets CSS classes for chat window styling
 */
export const getChatWindowClasses = (open: boolean): string => {
	const baseClasses =
		"fixed z-50 bg-white flex flex-col transition-all duration-300 ease-in-out";
	const positionClasses =
		"right-0 left-0 top-0 bottom-0 md:right-6 md:left-auto md:top-auto md:bottom-25 md:w-96 md:max-w-full md:rounded-2xl md:shadow-2xl md:h-[550px] md:transform md:origin-bottom-right";

	return open
		? `${baseClasses} opacity-100 scale-100 translate-y-0 visible pointer-events-auto ${positionClasses}`
		: `${baseClasses} opacity-0 scale-95 translate-y-4 invisible pointer-events-none ${positionClasses}`;
};

/**
 * Creates initial welcome messages
 */
export const createWelcomeMessages = (
	customerName: string,
	typingDelay: number = DEFAULT_TYPING_DELAY
): { messages: Message[]; timeouts: NodeJS.Timeout[] } => {
	const messages: Message[] = [];
	const timeouts: NodeJS.Timeout[] = [];

	// First message
	const firstMessage: Message = {
		sender: "bot",
		text: `Chào ${customerName}, mình là trợ lý AI của Tierra`,
		timestamp: new Date().toISOString(),
	};

	// Second message
	const secondMessage: Message = {
		sender: "bot",
		text: "Mình rất sẵn lòng hỗ trợ bạn !",
		timestamp: new Date().toISOString(),
	};

	// Schedule first message
	const firstTimeout = setTimeout(() => {
		messages.push(firstMessage);
	}, typingDelay);
	timeouts.push(firstTimeout);

	// Schedule second message
	const secondTimeout = setTimeout(() => {
		messages.push(secondMessage);
	}, typingDelay * 2);
	timeouts.push(secondTimeout);

	return { messages, timeouts };
};

/**
 * Handles scroll interaction start
 */
export const handleScrollStart = (
	e: React.MouseEvent,
	setIsScrolling: (scrolling: boolean) => void,
	setScrollStartY: (y: number) => void,
	setScrollStartScrollTop: (scrollTop: number) => void,
	messagesContainerRef: React.RefObject<HTMLDivElement | null>
): void => {
	if (!messagesContainerRef.current) return;

	setIsScrolling(true);
	setScrollStartY(e.clientY);
	setScrollStartScrollTop(messagesContainerRef.current.scrollTop);
};

/**
 * Handles scroll interaction during mouse move
 */
export const handleScrollMove = (
	e: MouseEvent,
	isScrolling: boolean,
	scrollStartY: number,
	scrollStartScrollTop: number,
	messagesContainerRef: React.RefObject<HTMLDivElement | null>
): void => {
	if (!isScrolling || !messagesContainerRef.current) return;

	const deltaY = e.clientY - scrollStartY;
	const newScrollTop = scrollStartScrollTop - deltaY;

	messagesContainerRef.current.scrollTop = newScrollTop;
};

/**
 * Handles scroll interaction end
 */
export const handleScrollEnd = (
	setIsScrolling: (scrolling: boolean) => void
): void => {
	setIsScrolling(false);
};

