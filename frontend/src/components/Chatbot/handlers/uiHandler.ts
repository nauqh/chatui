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

