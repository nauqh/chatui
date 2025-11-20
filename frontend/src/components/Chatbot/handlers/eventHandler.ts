export interface EventHandlerConfig {
	enableAutoFocus?: boolean;
	enableClickOutside?: boolean;
	enableScrollInteraction?: boolean;
}

/**
 * Handles auto-focus input when user types and chat is open
 */
export const setupAutoFocusHandler = (
	open: boolean,
	inputRef: React.RefObject<HTMLInputElement | null>
): (() => void) | undefined => {
	if (!open) return undefined;

	const handleKeyDown = (event: KeyboardEvent) => {
		// Only focus if chat is open and the key pressed is a printable character
		// And only on desktop devices (width >= 1024px)
		if (
			open &&
			inputRef.current &&
			window.innerWidth >= 1024 && // Add mobile check
			!event.ctrlKey &&
			!event.metaKey &&
			!event.altKey
		) {
			// Check if the key is a printable character (not special keys like Enter, Escape, etc.)
			if (
				event.key.length === 1 ||
				event.key === "Backspace" ||
				event.key === "Delete"
			) {
				// Don't focus if user is already typing in the input or another input field
				const activeElement = document.activeElement;
				if (
					activeElement !== inputRef.current &&
					activeElement?.tagName !== "INPUT" &&
					activeElement?.tagName !== "TEXTAREA"
				) {
					inputRef.current.focus();
				}
			}
		}
	};

	document.addEventListener("keydown", handleKeyDown);
	return () => document.removeEventListener("keydown", handleKeyDown);
};

/**
 * Handles click outside menu to close it
 */
export const setupClickOutsideHandler = (
	menuOpen: boolean,
	menuRef: React.RefObject<HTMLDivElement | null>,
	setMenuOpen: (open: boolean) => void
): (() => void) | undefined => {
	if (!menuOpen) return undefined;

	const handleClickOutside = (event: MouseEvent) => {
		if (
			menuRef.current &&
			!menuRef.current.contains(event.target as Node)
		) {
			setMenuOpen(false);
		}
	};

	document.addEventListener("mousedown", handleClickOutside);
	return () => document.removeEventListener("mousedown", handleClickOutside);
};

/**
 * Handles scroll interaction (click and drag)
 */
export const setupScrollInteractionHandler = (
	isScrolling: boolean,
	scrollStartY: number,
	scrollStartScrollTop: number,
	messagesContainerRef: React.RefObject<HTMLDivElement | null>,
	setIsScrolling: (scrolling: boolean) => void
): (() => void) | undefined => {
	if (!isScrolling) return undefined;

	const handleMouseMove = (e: MouseEvent) => {
		if (!messagesContainerRef.current) return;

		const deltaY = e.clientY - scrollStartY;
		const newScrollTop = scrollStartScrollTop - deltaY;

		messagesContainerRef.current.scrollTop = newScrollTop;
	};

	const handleMouseUp = () => {
		setIsScrolling(false);
	};

	document.addEventListener("mousemove", handleMouseMove);
	document.addEventListener("mouseup", handleMouseUp);
	document.body.style.userSelect = "none";

	return () => {
		document.removeEventListener("mousemove", handleMouseMove);
		document.removeEventListener("mouseup", handleMouseUp);
		document.body.style.userSelect = "";
	};
};

/**
 * Handles keyboard events for input
 */
export const handleInputKeyDown = (
	e: React.KeyboardEvent,
	onEnter: () => void
): void => {
	if (e.key === "Enter") {
		onEnter();
	}
};

/**
 * Handles form submission
 */
export const handleFormSubmit = (
	e: React.FormEvent,
	onSubmit: () => void
): void => {
	e.preventDefault();
	onSubmit();
};

