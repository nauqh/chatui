import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import {
	FaTimes,
	FaPaperPlane,
	FaPaperclip,
	FaRegFileAlt,
	FaDownload,
	FaSync,
	FaEllipsisH,
} from "react-icons/fa";
import styles from "./Chatbot.module.css";
import remarkGfm from "remark-gfm";
import CodeBlock from "../CodeBlock";

interface Message {
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
}

// Add new interface for pending files
interface PendingFile {
	file: File;
	url: string;
}

// Types
type ChatRequestBody = {
	conversation_id: string;
	message: string;
	file_paths?: string[];
};

// Constants
// const DEFAULT_AVATAR = "/message.png";
const DEFAULT_AVATAR =
	"https://www.tierra.vn/wp-content/uploads/2025/06/logo-cong-ty-tierra-512x512-1.png";
const API_BASE_URL = "http://127.0.0.1:8000";
const TYPING_DELAY = 1200;
const CONV_ID_STORAGE_KEY = "chatbot_conversation_id";
const DEFAULT_THEME_COLOR = "#b48c72";

function generateConversationId(): string {
	return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ReactMarkdown components configuration
const markdownComponents: Components = {
	a: ({ children, ...props }) => (
		<a
			{...props}
			className="text-blue-600 hover:text-blue-800 underline"
			target="_blank"
			rel="noopener noreferrer"
		>
			{children}
		</a>
	),
	strong: ({ children }) => (
		<span className="font-bold text-primary">{children}</span>
	),
	blockquote: ({ children }) => (
		<blockquote className="border-l-4 border-primary/50 pl-4 italic my-2">
			{children}
		</blockquote>
	),
	code: ({ children, className }) => {
		const isInline = !className?.includes("language-");
		return isInline ? (
			<code className="bg-gray-200 px-1.5 py-0.5 rounded-sm font-mono text-sm">
				{children}
			</code>
		) : (
			<code className="block bg-gray-100 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre-wrap break-all max-w-full">
				{children}
			</code>
		);
	},
	pre: ({ children, ...props }) => {
		// Check if this is a code block with language
		const codeElement = React.Children.only(
			children
		) as React.ReactElement<any>;
		if (codeElement?.props?.className?.includes("language-")) {
			const language = codeElement.props.className.replace(
				"language-",
				""
			);
			const codeContent = String(codeElement.props.children).trim();
			return <CodeBlock language={language} codeContent={codeContent} />;
		}

		// Fallback for regular pre blocks
		return (
			<pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap break-all text-sm max-w-full">
				{children}
			</pre>
		);
	},
	img: ({ src, alt }) => <Image src={String(src)} alt={alt as string} />,
	em: ({ children }) => <em className="not-italic my-2">{children}</em>,
	ul: ({ children }) => (
		<ul className="list-disc pl-4 space-y-2 my-2">{children}</ul>
	),
	ol: ({ children, ...props }) => (
		<ol {...props} className="list-decimal list-inside space-y-1 my-2">
			{children}
		</ol>
	),
	li: ({ children, ...props }) => (
		<li {...props} className="text-sm">
			{children}
		</li>
	),
	p: ({ children, ...props }) => (
		<p {...props} className="mb-2 last:mb-0">
			{children}
		</p>
	),
};

// Streaming version
const sendMessageStreaming = async (
	requestBody: ChatRequestBody,
	addMessage: (msg: Message) => void,
	setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
	setIsBotTyping: React.Dispatch<React.SetStateAction<boolean>>
) => {
	const response = await fetch(`${API_BASE_URL}/chat/stream`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(requestBody),
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	let botMessageId: string | null = null;
	let accumulatedText = "";

	const reader = response.body?.getReader();
	const decoder = new TextDecoder();

	if (reader) {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value);
			const lines = chunk.split("\n");

			for (const line of lines) {
				if (line.startsWith("data: ")) {
					try {
						const data = JSON.parse(line.slice(6));

						if (data.type === "chunk" && data.content) {
							accumulatedText += data.content;

							if (!botMessageId) {
								botMessageId = Date.now().toString();
								addMessage({
									sender: "bot",
									text: accumulatedText,
									timestamp: new Date().toISOString(),
									id: botMessageId,
								});
								setIsBotTyping(false);
							} else {
								setMessages((prev) =>
									prev.map((msg) =>
										msg.id === botMessageId
											? { ...msg, text: accumulatedText }
											: msg
									)
								);
							}
						} else if (data.type === "error") {
							if (botMessageId) {
								setMessages((prev) =>
									prev.map((msg) =>
										msg.id === botMessageId
											? {
													...msg,
													text: "Sorry, I encountered an error. Please try again.",
											  }
											: msg
									)
								);
							}
							break;
						} else if (data.type === "end") {
							break;
						}
					} catch (e) {
						console.error("Error parsing streaming data:", e);
					}
				}
			}
		}
	}
};

// Non-streaming version
const sendMessageNonStreaming = async (
	requestBody: ChatRequestBody,
	addMessage: (msg: Message) => void,
	setIsBotTyping: React.Dispatch<React.SetStateAction<boolean>>
) => {
	const response = await fetch(`${API_BASE_URL}/chat`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(requestBody),
	});

	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	const responseData = await response.json();
	setIsBotTyping(false);

	if (responseData.response) {
		addMessage({
			sender: "bot",
			text: responseData.response,
			timestamp: new Date().toISOString(),
		});
	} else {
		addMessage({
			sender: "bot",
			text: "I apologize, but I couldn't generate a response at this time. Please try again.",
			timestamp: new Date().toISOString(),
		});
	}
};

export default function Chatbot({
	title = "Chat with Tierra",
	avatarUrl = DEFAULT_AVATAR,
	themeColor = DEFAULT_THEME_COLOR,
}: {
	title?: string;
	avatarUrl?: string;
	themeColor?: string;
}) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [visibleTimestampIdx, setVisibleTimestampIdx] = useState<
		number | null
	>(null);
	const [isBotTyping, setIsBotTyping] = useState(false);
	// Add new state for pending files
	const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
	const [conversationId, setConversationId] = useState<string>("");

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Scroll to bottom when messages change
	useEffect(() => {
		if (messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages]);

	// Auto-focus input when user types
	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			// Only focus if the key pressed is a printable character
			if (
				inputRef.current &&
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
	}, []);

	// Handle click outside menu
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				menuRef.current &&
				!menuRef.current.contains(event.target as Node)
			) {
				setMenuOpen(false);
			}
		};

		if (menuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
			return () =>
				document.removeEventListener("mousedown", handleClickOutside);
		}
	}, [menuOpen]);

	// Initialize a fresh conversation id on each page load (reset on refresh)
	useEffect(() => {
		if (typeof window === "undefined") return;
		const newId = generateConversationId();
		sessionStorage.setItem(CONV_ID_STORAGE_KEY, newId);
		setConversationId(newId);
	}, []);

	// Initialize welcome messages
	useEffect(() => {
		if (messages.length > 0) return;

		setIsBotTyping(true);
		const firstTimeout = setTimeout(() => {
			setMessages([
				{
					sender: "bot",
					text: "Chào bạn, mình là trợ lý AI của Tierra",
					timestamp: new Date().toISOString(),
				},
			]);
			setIsBotTyping(true);

			const secondTimeout = setTimeout(() => {
				setMessages((prev) => [
					...prev,
					{
						sender: "bot",
						text: "Mình rất sẵn lòng hỗ trợ bạn !",
						timestamp: new Date().toISOString(),
					},
				]);
				setIsBotTyping(false);
			}, TYPING_DELAY);

			return () => clearTimeout(secondTimeout);
		}, TYPING_DELAY);

		return () => clearTimeout(firstTimeout);
	}, [messages.length]);

	const addMessage = useCallback((message: Message) => {
		setMessages((prev) => [...prev, message]);
	}, []);

	const handleSend = async () => {
		if (!input.trim() && pendingFiles.length === 0) return;

		const userMessage = input.trim();

		// Upload pending files first and show them as messages
		const uploadedFilePaths: string[] = [];
		if (pendingFiles.length > 0) {
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
					const formData = new FormData();
					formData.append("file", pendingFile.file);

					const response = await fetch(
						`${API_BASE_URL}/upload-file`,
						{
							method: "POST",
							body: formData,
						}
					);

					if (!response.ok) {
						throw new Error(`Upload failed: ${response.status}`);
					}

					const uploadResult = await response.json();
					uploadedFilePaths.push(uploadResult.file_path);
				}
			} catch (error) {
				console.error("Error uploading files:", error);
				addMessage({
					sender: "bot",
					text: "Sorry, I couldn't upload your files. Please try again.",
					timestamp: new Date().toISOString(),
				});
				return;
			}
		}

		// Create message object for text (if any)
		if (userMessage) {
			const messageData: Message = {
				sender: "user",
				text: userMessage,
				timestamp: new Date().toISOString(),
			};
			addMessage(messageData);
		}

		// Clear input and pending files
		setInput("");
		setPendingFiles([]);

		// Keep the typing indicator
		setIsBotTyping(true);

		try {
			// Ensure we have a conversation id (race-safe if user sends immediately)
			let convId = conversationId;
			if (!convId) {
				convId = generateConversationId();
				setConversationId(convId);
				if (typeof window !== "undefined") {
					sessionStorage.setItem(CONV_ID_STORAGE_KEY, convId);
				}
			}

			const requestBody: ChatRequestBody = {
				conversation_id: convId,
				message: userMessage || "",
			};

			if (uploadedFilePaths.length > 0) {
				requestBody.file_paths = uploadedFilePaths;
			}

			// Choose which function to use:
			// await sendMessageStreaming(
			// 	requestBody,
			// 	addMessage,
			// 	setMessages,
			// 	setIsBotTyping
			// );
			await sendMessageNonStreaming(
				requestBody,
				addMessage,
				setIsBotTyping
			);
		} catch (error) {
			console.error("Error sending message to backend:", error);
			addMessage({
				sender: "bot",
				text: "Sorry, I'm having trouble connecting to my backend. Please try again later.",
				timestamp: new Date().toISOString(),
			});
		} finally {
			// Always hide typing indicator
			setIsBotTyping(false);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Only add to pending files, don't upload or create message yet
		const url = URL.createObjectURL(file);
		setPendingFiles((prev) => [...prev, { file, url }]);

		e.target.value = "";
	};

	const removePendingFile = (index: number) => {
		setPendingFiles((prev) => {
			const newFiles = prev.filter((_, i) => i !== index);
			// Clean up the object URL to prevent memory leaks
			URL.revokeObjectURL(prev[index].url);
			return newFiles;
		});
	};

	const toggleTimestamp = (idx: number) => {
		setVisibleTimestampIdx(visibleTimestampIdx === idx ? null : idx);
	};

	const getMessageClasses = (sender: "user" | "bot") => {
		const baseClasses =
			"px-4 py-2 rounded-xl text-sm shadow cursor-pointer relative z-20 break-words overflow-wrap-anywhere max-w-full";
		return sender === "user"
			? `${baseClasses} text-white`
			: `${baseClasses} bg-white text-gray-800 border border-gray-200`;
	};

	const getChatWindowClasses = () => {
		const baseClasses = "fixed z-50 bg-white flex flex-col";
		const positionClasses =
			"right-0 left-0 top-0 bottom-0 md:right-6 md:left-auto md:top-auto md:bottom-25 md:w-96 md:max-w-full md:rounded-2xl md:shadow-2xl md:min-h-[500px] md:h-[600px] md:transform md:origin-bottom-right";

		return `${baseClasses} opacity-100 scale-100 translate-y-0 visible pointer-events-auto ${positionClasses}`;
	};

	// Download transcript as a .txt file
	const handleDownloadTranscript = () => {
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

	// Refresh chat function
	const handleRefreshChat = () => {
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
			sessionStorage.setItem(CONV_ID_STORAGE_KEY, newId);
		}
		// Reset typing state
		setIsBotTyping(false);
		// Reset timestamp visibility
		setVisibleTimestampIdx(null);
	};

	// Menu items configuration
	const menuItems = [
		{
			icon: FaDownload,
			label: "Download transcript",
			action: handleDownloadTranscript,
		},
		{ icon: FaSync, label: "Refresh chat", action: handleRefreshChat },
		{ icon: FaRegFileAlt, label: "Privacy policy", action: () => {} },
	];

	return (
		<>
			{/* Chat Window */}
			<div className={getChatWindowClasses()}>
				{/* Header */}
				<div
					className="relative flex items-center justify-between p-4 border-b border-gray-100 md:rounded-t-2xl"
					style={{ backgroundColor: themeColor }}
				>
					<div className="w-10 h-10 rounded-full overflow-hidden relative flex-shrink-0">
						<Image
							src={avatarUrl}
							alt="Bot Avatar"
							sizes="100px"
							fill
							style={{
								objectFit: "cover",
								filter: "brightness(0) invert(1)",
							}}
						/>
					</div>
					<div className="flex-1 flex justify-center">
						<span className="text-white font-semibold text-lg text-center">
							{title}
						</span>
					</div>
					<div
						className="flex-shrink-0 relative flex items-center gap-2"
						ref={menuRef}
					>
						<button
							className="text-white px-2 cursor-pointer"
							aria-label="Open menu"
							onClick={() => setMenuOpen((v) => !v)}
						>
							<FaEllipsisH className="w-5 h-5" />
						</button>
						{menuOpen && (
							<div className="w-56 bg-white rounded-xl shadow-lg border z-50 absolute right-0 top-full mt-2">
								<ul>
									{menuItems.map(
										(
											{ icon: Icon, label, action },
											index
										) => (
											<li key={label}>
												<button
													className={`w-full flex items-center font-light gap-2 p-3 hover:bg-gray-100 cursor-pointer ${
														index === 0
															? "rounded-t-xl"
															: ""
													} ${
														index ===
														menuItems.length - 1
															? "rounded-b-xl"
															: ""
													}`}
													onClick={() => {
														setMenuOpen(false);
														action();
													}}
												>
													<Icon
														className="w-5 h-5 mr-2"
														style={{
															color: themeColor,
														}}
													/>
													{label}
												</button>
											</li>
										)
									)}
								</ul>
							</div>
						)}
					</div>
				</div>

				{/* Messages */}
				<div
					className={`flex-1 overflow-y-auto p-4 space-y-3 h-96 md:h-[400px] ${styles["scrollbar-hide"]}`}
				>
					{messages.map((msg, idx) => (
						<div
							key={msg.id || idx}
							className={`flex ${
								msg.sender === "user"
									? "justify-end"
									: "justify-start"
							}`}
						>
							{/* Bot Avatar - only show for bot messages */}
							{msg.sender === "bot" && (
								<div className="w-8 h-8 rounded-full overflow-hidden relative flex-shrink-0 mr-2 self-start mt-1">
									<Image
										src={avatarUrl}
										alt="Bot Avatar"
										sizes="100px"
										fill
										style={{ objectFit: "cover" }}
									/>
								</div>
							)}

							<div
								className={`flex flex-col max-w-[95%] sm:max-w-[90%] md:max-w-[85%] min-w-0 w-fit ${
									msg.sender === "user"
										? "items-end"
										: "items-center"
								}`}
							>
								<div className="relative group z-10">
									{msg.attachment ? (
										<div
											className={`${getMessageClasses(
												msg.sender
											)} flex items-center gap-2`}
											style={
												msg.sender === "user"
													? {
															backgroundColor:
																themeColor,
													  }
													: {}
											}
											onClick={() => toggleTimestamp(idx)}
											tabIndex={0}
											aria-label="Show message time"
										>
											<FaPaperclip className="inline mr-1" />
											<a
												href={msg.attachment.url}
												download={msg.attachment.name}
												target="_blank"
												rel="noopener noreferrer"
												className="underline break-all"
												onClick={(e) =>
													e.stopPropagation()
												}
											>
												{msg.attachment.name}
											</a>
										</div>
									) : (
										<div
											className={getMessageClasses(
												msg.sender
											)}
											style={
												msg.sender === "user"
													? {
															backgroundColor:
																themeColor,
													  }
													: {}
											}
											onClick={() => toggleTimestamp(idx)}
											tabIndex={0}
											aria-label="Show message time"
										>
											{msg.sender === "bot" ? (
												<div className="prose prose-sm max-w-none">
													<ReactMarkdown
														components={
															markdownComponents
														}
														remarkPlugins={[
															remarkGfm,
														]}
													>
														{msg.text || ""}
													</ReactMarkdown>
												</div>
											) : (
												msg.text
											)}
										</div>
									)}
								</div>
								{/* Timestamp */}
								<div
									className={`transition-all duration-300 ease-in-out flex flex-col items-center justify-center relative z-0 overflow-hidden w-full ${
										visibleTimestampIdx === idx
											? "opacity-100"
											: "opacity-0"
									}`}
									style={{
										height:
											visibleTimestampIdx === idx
												? "60px"
												: "0px",
									}}
								>
									{msg.timestamp && (
										<div className="relative flex flex-col items-center">
											<div
												className="w-0 h-0"
												style={{
													borderLeft:
														"12px solid transparent",
													borderRight:
														"12px solid transparent",
													borderBottom: `12px solid ${themeColor}`,
													marginBottom: "-2px",
												}}
											/>
											<span
												className="text-white text-xs font-semibold rounded-xl px-6 py-2 shadow-lg tracking-wide select-none"
												style={{
													backgroundColor: themeColor,
												}}
											>
												{new Date(
													msg.timestamp
												).toLocaleTimeString([], {
													hour: "numeric",
													minute: "2-digit",
												})}
											</span>
										</div>
									)}
								</div>
							</div>
						</div>
					))}
					{isBotTyping && (
						<div className="flex justify-start">
							{/* Bot Avatar for typing indicator */}
							<div className="w-8 h-8 rounded-full overflow-hidden relative flex-shrink-0 mr-2 self-end">
								<Image
									src={avatarUrl}
									alt="Bot Avatar"
									sizes="100px"
									fill
									style={{ objectFit: "cover" }}
								/>
							</div>
							<div className="flex flex-col items-center max-w-[95%] sm:max-w-[90%] md:max-w-[85%] min-w-0 w-fit">
								<div className="px-4 py-2 rounded-2xl text-sm shadow bg-white text-gray-800 border border-gray-200 rounded-bl-sm flex items-center gap-2">
									<span className={styles["dot-typing"]}>
										<span className={styles.dot}></span>
										<span className={styles.dot}></span>
										<span className={styles.dot}></span>
									</span>
								</div>
							</div>
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Pending files display */}
				{pendingFiles.length > 0 && (
					<div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
						<div className="flex items-center gap-2 mb-2">
							<div
								className="w-1 h-4 rounded-full"
								style={{ backgroundColor: themeColor }}
							></div>
							<span className="text-xs font-medium text-gray-600">
								{pendingFiles.length} file
								{pendingFiles.length > 1 ? "s" : ""} ready
							</span>
						</div>
						<div className="space-y-1">
							{pendingFiles.map((pendingFile, idx) => (
								<div
									key={idx}
									className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
								>
									<div className="flex-shrink-0 w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center">
										<FaRegFileAlt className="w-3 h-3 text-gray-500" />
									</div>
									<span className="flex-1 text-sm text-gray-700 truncate font-medium">
										{pendingFile.file.name}
									</span>
									<button
										onClick={() => removePendingFile(idx)}
										className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center transition-colors group"
										title="Remove file"
									>
										<FaTimes className="w-2.5 h-2.5 text-gray-400 group-hover:text-red-500" />
									</button>
								</div>
							))}
						</div>
					</div>
				)}

				{/* Input */}
				<div className="p-3 border-t border-gray-100 bg-white flex items-center gap-2 md:rounded-b-2xl">
					<div className="relative">
						<button
							className={`p-2 rounded-lg transition-all duration-200 ${
								pendingFiles.length >= 3
									? "opacity-40 cursor-not-allowed bg-gray-50"
									: "hover:bg-gray-50  cursor-pointer"
							}`}
							onClick={() =>
								pendingFiles.length < 3 &&
								fileInputRef.current?.click()
							}
							aria-label="Attach file"
							type="button"
							disabled={pendingFiles.length >= 3}
							title={
								pendingFiles.length >= 3
									? "Maximum 3 files allowed"
									: "Attach file (max 3)"
							}
						>
							<FaPaperclip
								className="w-5 h-5 transition-colors"
								style={{
									color:
										pendingFiles.length >= 3
											? "#9ca3af"
											: themeColor,
								}}
							/>
						</button>
						{pendingFiles.length >= 3 && (
							<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
								Max 3 files allowed
								<div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
							</div>
						)}
					</div>
					<input
						type="file"
						ref={fileInputRef}
						className="hidden"
						onChange={handleFileChange}
						aria-label="Upload attachment"
					/>
					<input
						type="text"
						ref={inputRef}
						className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none text-sm transition-all duration-200 placeholder:text-gray-400"
						placeholder="Type a message ..."
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSend()}
						aria-label="Type a message"
					/>
					<button
						className="text-white p-2.5 rounded-xl transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
						style={{ backgroundColor: themeColor }}
						onClick={handleSend}
						aria-label="Send message"
					>
						<FaPaperPlane className="w-4 h-4" />
					</button>
				</div>
			</div>
		</>
	);
}
