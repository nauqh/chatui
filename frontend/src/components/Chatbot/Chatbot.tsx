"use client";
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
import { FiArrowUpRight } from "react-icons/fi";
import styles from "./Chatbot.module.css";
import remarkGfm from "remark-gfm";
import CodeBlock from "../CodeBlock";
import ProductCard from "../ProductCard";
import {
	handleProductsInResponse,
	handleFileChange as handleFileChangeHandler,
	removePendingFile as removePendingFileHandler,
	uploadMultipleFiles,
	sendMessage as sendMessageHandler,
	createUserMessage,
	createErrorMessage,
	getCustomerInfo,
	handleCustomerSubmit as handleCustomerSubmitHandler,
	handleDownloadTranscript as handleDownloadTranscriptHandler,
	handleRefreshChat as handleRefreshChatHandler,
	initializeConversationId,
	getOrCreateConversationId,
	toggleTimestamp as toggleTimestampHandler,
	getMessageClasses,
	handleScrollStart as handleScrollStartHandler,
	setupAutoFocusHandler,
	setupClickOutsideHandler,
	setupScrollInteractionHandler,
	handleInputKeyDown,
	handleFormSubmit,
} from "./handlers";
import { Message, PendingFile, CustomerInfo, ChatRequestBody } from "./types";

// Constants
const DEFAULT_AVATAR =
	"https://i.pinimg.com/originals/7d/9b/1d/7d9b1d662b28cd365b33a01a3d0288e1.gif";
const API_BASE_URL = process.env.API_BASE_URL as string;
const TYPING_DELAY = 1200;
const CONV_ID_STORAGE_KEY = "chatbot_conversation_id";
const DEFAULT_THEME_COLOR = "#b48c72";

const MAX_TOTAL_FILES = 5;

// Function to preprocess text for better markdown rendering
const preprocessText = (text: string): string => {
	// Replace \n- with proper markdown list format
	return text
		.replace(/\\n-/g, "\n- ")
		.replace(/\\n/g, "\n")
		.replace(/\\t/g, "\t");
};

// ReactMarkdown components configuration
const markdownComponents: Components = {
	a: ({ children, ...props }) => (
		<a
			{...props}
			className="text-blue-600 hover:underline inline-flex items-center"
			target="_blank"
			rel="noopener noreferrer"
		>
			{children}
			<FiArrowUpRight className="w-4" />
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
	pre: ({ children }) => {
		// Check if this is a code block with language
		const codeElement = React.Children.only(
			children
		) as React.ReactElement<{
			className?: string;
			children: React.ReactNode;
		}>;
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
		<p {...props} className="mb-2 last:mb-0 whitespace-pre-wrap">
			{children}
		</p>
	),
};

// sendMessage is now imported from handlers

export default function Chatbot({
	title = "Chat with Tierra",
	avatarUrl = DEFAULT_AVATAR,
	themeColor = DEFAULT_THEME_COLOR,
}: {
	title?: string;
	avatarUrl?: string;
	themeColor?: string;
}) {
	const [open, setOpen] = useState(false);
	const [menuOpen, setMenuOpen] = useState(false);
	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [visibleTimestampIdx, setVisibleTimestampIdx] = useState<
		number | null
	>(null);
	const [isBotTyping, setIsBotTyping] = useState(false);
	const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
	const [conversationId, setConversationId] = useState<string>("");
	const [uploadedFilesCount, setUploadedFilesCount] = useState(0);
	const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([]);
	const [isScrolling, setIsScrolling] = useState(false);
	const [scrollStartY, setScrollStartY] = useState(0);
	const [scrollStartScrollTop, setScrollStartScrollTop] = useState(0);
	const [showCustomerModal, setShowCustomerModal] = useState(true);
	const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
		name: "",
		phone: "",
	});
	const [customerRegistered, setCustomerRegistered] = useState(false);
	const [showFileDropdown, setShowFileDropdown] = useState(false);

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const menuRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const fileDropdownRef = useRef<HTMLDivElement>(null);

	// Scroll to bottom when messages change
	useEffect(() => {
		if (open && messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages, open]);

	// Auto-focus input when user types and chat is open
	useEffect(() => {
		return setupAutoFocusHandler(open, inputRef);
	}, [open]);

	// Handle click outside menu
	useEffect(() => {
		return setupClickOutsideHandler(menuOpen, menuRef, setMenuOpen);
	}, [menuOpen]);

	// Handle scroll interaction (click and drag)
	useEffect(() => {
		return setupScrollInteractionHandler(
			isScrolling,
			scrollStartY,
			scrollStartScrollTop,
			messagesContainerRef,
			setIsScrolling
		);
	}, [isScrolling, scrollStartY, scrollStartScrollTop]);

	useEffect(() => {
		return setupClickOutsideHandler(
			showFileDropdown,
			fileDropdownRef,
			setShowFileDropdown
		);
	}, [showFileDropdown]);

	// Initialize a fresh conversation id on each page load (reset on refresh)
	useEffect(() => {
		initializeConversationId(setConversationId, CONV_ID_STORAGE_KEY);

		// Always show customer modal on page load/refresh
		setShowCustomerModal(true);

		// Check if customer info is stored in session storage (pre-fill form if exists)
		const storedCustomerInfo = getCustomerInfo();
		if (storedCustomerInfo) {
			setCustomerInfo(storedCustomerInfo);
			setCustomerRegistered(true);
		}
	}, []);

	// Initialize welcome messages
	useEffect(() => {
		if (!open || messages.length > 0) return;

		setIsBotTyping(true);
		const firstTimeout = setTimeout(() => {
			setMessages([
				{
					sender: "bot",
					text: `Chào ${customerInfo.name}, mình là trợ lý AI của Tierra`,
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
	}, [open, messages.length, customerInfo.name]);

	const addMessage = useCallback((message: Message) => {
		setMessages((prev) => [...prev, message]);
	}, []);

	// Handle customer form submission
	const handleCustomerSubmit = (e: React.FormEvent) => {
		handleCustomerSubmitHandler(
			e,
			customerInfo,
			setCustomerRegistered,
			setShowCustomerModal,
			setOpen
		);
	};

	const handleSend = async () => {
		// Require at least some text input - don't allow sending files without a message
		if (!input.trim()) return;

		const userMessage = input.trim();

		// Clear pending files immediately when starting to send
		const filesToUpload = [...pendingFiles];
		setPendingFiles([]);

		// Upload pending files first using the file upload handler
		let uploadedFilePaths: string[] = [];
		if (filesToUpload.length > 0) {
			try {
				uploadedFilePaths = await uploadMultipleFiles(
					filesToUpload,
					API_BASE_URL,
					addMessage
				);
				// Update uploaded files count
				setUploadedFilesCount((prev) => prev + filesToUpload.length);
				// Update uploaded file names
				setUploadedFileNames((prev) => [
					...prev,
					...filesToUpload.map((file) => file.file.name),
				]);
			} catch {
				// Error already handled in uploadMultipleFiles
				return;
			}
		}

		// Create message object for text (if any)
		if (userMessage) {
			const messageData = createUserMessage(userMessage);
			addMessage(messageData);
		}

		// Clear input
		setInput("");

		// Keep the typing indicator
		setIsBotTyping(true);

		try {
			// Ensure we have a conversation id (race-safe if user sends immediately)
			const convId = getOrCreateConversationId(
				conversationId,
				setConversationId,
				CONV_ID_STORAGE_KEY
			);

			const requestBody: ChatRequestBody = {
				conversation_id: convId,
				message: userMessage || "",
			};

			if (uploadedFilePaths.length > 0) {
				requestBody.file_paths = uploadedFilePaths;
			}

			await sendMessageHandler(
				requestBody,
				addMessage,
				setIsBotTyping,
				API_BASE_URL,
				handleProductsInResponse
			);
		} catch (error) {
			console.error("Error sending message to backend:", error);
			addMessage(createErrorMessage());
		} finally {
			// Always hide typing indicator
			setIsBotTyping(false);
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		handleFileChangeHandler(
			e,
			setPendingFiles,
			3,
			uploadedFilesCount,
			MAX_TOTAL_FILES
		);

		// Ensure focus returns to text input after file selection
		setTimeout(() => {
			if (inputRef.current) {
				inputRef.current.focus();
			}
		}, 100);
	};

	const removePendingFile = (index: number) => {
		removePendingFileHandler(index, setPendingFiles);
	};

	// Handle scroll interaction start
	const handleScrollStart = (e: React.MouseEvent) => {
		handleScrollStartHandler(
			e,
			setIsScrolling,
			setScrollStartY,
			setScrollStartScrollTop,
			messagesContainerRef
		);
	};

	const toggleTimestamp = (idx: number) => {
		toggleTimestampHandler(
			idx,
			visibleTimestampIdx,
			setVisibleTimestampIdx
		);
	};

	// Download transcript as a .txt file
	const handleDownloadTranscript = () => {
		handleDownloadTranscriptHandler(messages);
	};

	// Refresh chat function
	const handleRefreshChat = () => {
		handleRefreshChatHandler(
			setMessages,
			setInput,
			setPendingFiles,
			setConversationId,
			setIsBotTyping,
			setVisibleTimestampIdx,
			setCustomerRegistered,
			setCustomerInfo,
			setOpen,
			setShowCustomerModal,
			CONV_ID_STORAGE_KEY
		);
		// Reset uploaded files count
		setUploadedFilesCount(0);
		// Reset uploaded file names
		setUploadedFileNames([]);
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

	// Determine if container should be visible
	const isContainerVisible = showCustomerModal || open;

	return (
		<>
			{/* Unified Container for Customer Modal and Chat UI */}
			{isContainerVisible && (
				<div className="fixed z-50 flex flex-col transition-all duration-300 ease-in-out right-0 left-0 top-0 bottom-0 md:right-6 md:left-auto md:top-auto md:bottom-25 md:w-96 md:max-w-full md:h-[550px] md:transform md:origin-bottom-right opacity-100 scale-100 translate-y-0 visible pointer-events-auto">
					{/* Customer Registration Modal */}
					{showCustomerModal ? (
						<div className="flex-1 flex items-center justify-center p-4">
							<div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 border border-gray-200">
								<div className="flex items-center mb-6">
									<div className="flex items-center gap-3">
										<div
											className="w-10 h-10 rounded-full overflow-hidden relative flex-shrink-0"
											style={{
												backgroundColor: themeColor,
											}}
										>
											<Image
												src="https://www.tierra.vn/wp-content/uploads/2025/06/logo-cong-ty-tierra-512x512-1.png"
												alt="Bot Avatar"
												sizes="100px"
												fill
												style={{
													objectFit: "cover",
													filter: "brightness(0) invert(1)",
												}}
											/>
										</div>
										<h3 className="text-xl font-semibold text-gray-800">
											{title}
										</h3>
									</div>
								</div>

								<p className="text-gray-600 mb-6">
									Để bắt đầu trò chuyện, vui lòng cung cấp
									thông tin của bạn:
								</p>

								<form
									onSubmit={(e) =>
										handleFormSubmit(e, () =>
											handleCustomerSubmit(e)
										)
									}
									className="space-y-4"
								>
									<div>
										<label
											htmlFor="customerName"
											className="block text-sm font-medium text-gray-700 mb-2"
										>
											Tên của bạn *
										</label>
										<input
											type="text"
											id="customerName"
											value={customerInfo.name}
											onChange={(e) =>
												setCustomerInfo((prev) => ({
													...prev,
													name: e.target.value,
												}))
											}
											className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none transition-all duration-200"
											style={{
												borderColor:
													customerInfo.name.trim()
														? themeColor
														: "#e5e7eb",
											}}
											placeholder="Nhập tên của bạn"
											required
										/>
									</div>

									<div>
										<label
											htmlFor="customerPhone"
											className="block text-sm font-medium text-gray-700 mb-2"
										>
											Số điện thoại *
										</label>
										<input
											type="tel"
											id="customerPhone"
											value={customerInfo.phone}
											onChange={(e) =>
												setCustomerInfo((prev) => ({
													...prev,
													phone: e.target.value,
												}))
											}
											className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none transition-all duration-200"
											style={{
												borderColor:
													customerInfo.phone.trim()
														? themeColor
														: "#e5e7eb",
											}}
											placeholder="Nhập số điện thoại"
											required
										/>
									</div>

									<div className="pt-4">
										<button
											type="submit"
											disabled={
												!customerInfo.name.trim() ||
												!customerInfo.phone.trim()
											}
											className="w-full px-4 py-3 text-white rounded-xl transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 hover:cursor-pointer"
											style={{
												backgroundColor: themeColor,
											}}
										>
											Bắt đầu chat
										</button>
									</div>
								</form>
							</div>
						</div>
					) : (
						/* Chat Window */
						<div className="bg-white flex flex-col flex-1 min-h-0 rounded-2xl">
							{/* Header */}
							<div
								className="relative flex items-center justify-between p-4 border-b border-gray-100 md:rounded-t-2xl"
								style={{ backgroundColor: themeColor }}
							>
								<div className="w-10 h-10 rounded-full overflow-hidden relative flex-shrink-0">
									<Image
										src="https://www.tierra.vn/wp-content/uploads/2025/06/logo-cong-ty-tierra-512x512-1.png"
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
								{/* Add uploaded files count display */}
								{uploadedFilesCount > 0 && (
									<div
										className="flex-shrink-0 text-right relative"
										ref={fileDropdownRef}
									>
										<button
											onClick={() =>
												setShowFileDropdown(
													!showFileDropdown
												)
											}
											className="relative inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 cursor-pointer group"
											aria-label="View uploaded files"
										>
											<FaRegFileAlt className="w-4 h-4 text-white" />
											{/* Badge */}
											<span className="absolute -top-1 -right-1 bg-white text-gray-800 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
												{uploadedFilesCount}
											</span>
										</button>

										{/* Dropdown */}
										{showFileDropdown && (
											<div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
												<div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
													<h3 className="text-sm font-semibold text-gray-800">
														Uploaded Files
													</h3>
												</div>
												<div className="max-h-48 overflow-y-auto">
													{uploadedFileNames.map(
														(fileName, index) => (
															<div
																key={index}
																className="px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
															>
																<div className="flex items-center gap-3">
																	<div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
																		<FaRegFileAlt className="w-4 h-4 text-gray-500" />
																	</div>
																	<span className="text-sm text-gray-700 truncate font-medium">
																		{
																			fileName
																		}
																	</span>
																</div>
															</div>
														)
													)}
												</div>
											</div>
										)}
									</div>
								)}
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
														{
															icon: Icon,
															label,
															action,
														},
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
																	menuItems.length -
																		1
																		? "rounded-b-xl"
																		: ""
																}`}
																onClick={() => {
																	setMenuOpen(
																		false
																	);
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
								ref={messagesContainerRef}
								className={`flex-1 overflow-y-auto py-4 px-2 space-y-3 h-96 md:h-[400px] ${styles["scrollbar-hide"]}`}
								onMouseDown={handleScrollStart}
								style={{
									userSelect: isScrolling ? "none" : "auto",
								}}
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
										{/* Bot Avatar - REMOVED */}
										{msg.sender === "bot" && (
											<div className="w-8 h-8 rounded-full overflow-hidden relative flex-shrink-0 mr-2 self-start mt-1">
												<Image
													src={avatarUrl}
													alt="Bot Avatar"
													sizes="100px"
													fill
													unoptimized
													style={{
														objectFit: "cover",
													}}
												/>
											</div>
										)}

										<div
											className={`flex flex-col max-w-full min-w-0 w-full ${
												msg.sender === "user"
													? "items-end"
													: "items-start"
											}`}
										>
											<div className="relative group z-10">
												{/* Filter chips for refine action */}
												{msg.sender === "bot" &&
													msg.action === "refine" &&
													msg.filters &&
													msg.filters.length > 0 && (
														<div className="mb-3 flex flex-wrap gap-2">
															{msg.filters.map(
																(
																	filter,
																	idx
																) => (
																	<button
																		key={
																			idx
																		}
																		onClick={() => {
																			setInput(
																				`Filter: ${filter}`
																			);
																			if (
																				typeof window !==
																					"undefined" &&
																				window.innerWidth >=
																					1024
																			) {
																				inputRef.current?.focus();
																			}
																		}}
																		className="px-3 py-1.5 text-xs font-medium rounded-full border transition-all duration-200 hover:scale-105 cursor-pointer"
																		style={{
																			backgroundColor: `${themeColor}15`,
																			borderColor:
																				themeColor,
																			color: themeColor,
																		}}
																	>
																		{filter}
																	</button>
																)
															)}
														</div>
													)}

												{msg.product ? (
													<div>
														{/* Render single product card */}
														<ProductCard
															product={
																msg.product
															}
															themeColor={
																themeColor
															}
														/>
														{/* "Xem thêm" button inside the product card message */}
														{msg.showMoreButton && (
															<div className="mt-3 flex justify-center">
																<button
																	onClick={() => {
																		setInput(
																			"Có mẫu nào khác không?"
																		);
																		if (
																			typeof window !==
																				"undefined" &&
																			window.innerWidth >=
																				1024
																		) {
																			inputRef.current?.focus();
																		}
																	}}
																	className="px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 hover:scale-105 cursor-pointer"
																	style={{
																		backgroundColor: `${themeColor}10`,
																		borderColor:
																			themeColor,
																		color: themeColor,
																	}}
																>
																	Xem thêm
																</button>
															</div>
														)}
													</div>
												) : msg.products ? (
													<div>
														{/* Render multiple product cards in a grid */}
														<div className="flex gap-2">
															{msg.products.map(
																(
																	product,
																	idx
																) => (
																	<ProductCard
																		key={
																			idx
																		}
																		product={
																			product
																		}
																		themeColor={
																			themeColor
																		}
																	/>
																)
															)}
														</div>
														{/* "Xem thêm" button inside the products message */}
														{msg.showMoreButton && (
															<div className="mt-3 flex justify-center">
																<button
																	onClick={() => {
																		setInput(
																			"Có mẫu nào khác không?"
																		);
																		if (
																			typeof window !==
																				"undefined" &&
																			window.innerWidth >=
																				1024
																		) {
																			inputRef.current?.focus();
																		}
																	}}
																	className="px-4 py-2 text-sm font-medium rounded-lg border transition-all duration-200 hover:scale-105 cursor-pointer"
																	style={{
																		backgroundColor: `${themeColor}10`,
																		borderColor:
																			themeColor,
																		color: themeColor,
																	}}
																>
																	Xem thêm
																</button>
															</div>
														)}
													</div>
												) : msg.attachment ? (
													<div
														className={`${getMessageClasses(
															msg.sender
														)} flex items-center gap-2`}
														style={
															msg.sender ===
															"user"
																? {
																		backgroundColor:
																			themeColor,
																  }
																: {}
														}
														onClick={() =>
															toggleTimestamp(idx)
														}
														tabIndex={0}
														aria-label="Show message time"
													>
														<FaPaperclip className="inline" />
														<a
															href={
																msg.attachment
																	.url
															}
															download={
																msg.attachment
																	.name
															}
															target="_blank"
															rel="noopener noreferrer"
															className="underline break-all"
															onClick={(e) =>
																e.stopPropagation()
															}
														>
															{
																msg.attachment
																	.name
															}
														</a>
													</div>
												) : (
													<div
														className={getMessageClasses(
															msg.sender
														)}
														style={
															msg.sender ===
															"user"
																? {
																		backgroundColor:
																			themeColor,
																  }
																: {}
														}
														onClick={() =>
															toggleTimestamp(idx)
														}
														tabIndex={0}
														aria-label="Show message time"
													>
														{msg.sender ===
														"bot" ? (
															<div className="prose prose-sm max-w-none">
																<ReactMarkdown
																	components={
																		markdownComponents
																	}
																	remarkPlugins={[
																		remarkGfm,
																	]}
																>
																	{preprocessText(
																		msg.text ||
																			""
																	)}
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
														visibleTimestampIdx ===
														idx
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
																marginBottom:
																	"-2px",
															}}
														/>
														<span
															className="text-white text-xs font-semibold rounded-xl px-6 py-2 shadow-lg tracking-wide select-none"
															style={{
																backgroundColor:
																	themeColor,
															}}
														>
															{new Date(
																msg.timestamp
															).toLocaleTimeString(
																[],
																{
																	hour: "numeric",
																	minute: "2-digit",
																}
															)}
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
												unoptimized
												style={{ objectFit: "cover" }}
											/>
										</div>
										<div className="flex flex-col items-start max-w-full min-w-0 w-full">
											<div className="px-4 py-2 rounded-2xl text-sm shadow bg-white text-gray-800 border border-gray-200 rounded-bl-sm flex items-center gap-2">
												<span
													className={
														styles["dot-typing"]
													}
												>
													<span
														className={styles.dot}
													></span>
													<span
														className={styles.dot}
													></span>
													<span
														className={styles.dot}
													></span>
												</span>
											</div>
										</div>
									</div>
								)}
								<div ref={messagesEndRef} />
							</div>

							{/* Pending files display - only show when there are pending files */}
							{pendingFiles.length > 0 && (
								<div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
									<div className="flex items-center gap-2 mb-2">
										<div
											className="w-1 h-4 rounded-full"
											style={{
												backgroundColor: themeColor,
											}}
										></div>
										<span className="text-xs font-medium text-gray-600">
											{pendingFiles.length} file
											{pendingFiles.length > 1
												? "s"
												: ""}{" "}
											ready
											{uploadedFilesCount > 0 && (
												<span className="text-gray-500">
													({uploadedFilesCount}/
													{MAX_TOTAL_FILES} total
													uploaded)
												</span>
											)}
										</span>
									</div>
									<div className="space-y-1">
										{pendingFiles.map(
											(pendingFile, idx) => (
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
														onClick={() =>
															removePendingFile(
																idx
															)
														}
														className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-100 hover:bg-red-100 flex items-center justify-center transition-colors group"
														title="Remove file"
													>
														<FaTimes className="w-2.5 h-2.5 text-gray-400 group-hover:text-red-500" />
													</button>
												</div>
											)
										)}
									</div>
								</div>
							)}

							{/* Input */}
							<div className="p-3 border-t border-gray-100 bg-white flex items-center gap-2 md:rounded-b-2xl">
								<div className="relative">
									<button
										className={`p-2 rounded-lg transition-all duration-200 ${
											pendingFiles.length >= 3 ||
											uploadedFilesCount >=
												MAX_TOTAL_FILES
												? "opacity-40 cursor-not-allowed bg-gray-50"
												: "hover:bg-gray-50 cursor-pointer"
										}`}
										onClick={() => {
											if (
												pendingFiles.length < 3 &&
												uploadedFilesCount <
													MAX_TOTAL_FILES
											) {
												fileInputRef.current?.click();
												// Ensure focus returns to text input after file dialog closes
												setTimeout(() => {
													if (inputRef.current) {
														inputRef.current.focus();
													}
												}, 100);
											}
										}}
										aria-label="Attach file"
										type="button"
										disabled={
											pendingFiles.length >= 3 ||
											uploadedFilesCount >=
												MAX_TOTAL_FILES
										}
										title={
											uploadedFilesCount >=
											MAX_TOTAL_FILES
												? `Maximum ${MAX_TOTAL_FILES} files allowed for entire conversation`
												: pendingFiles.length >= 3
												? "Maximum 3 files allowed per message"
												: "Attach file (max 3 per message, 5 total)"
										}
									>
										<FaPaperclip
											className="w-5 h-5 transition-colors"
											style={{
												color:
													pendingFiles.length >= 3 ||
													uploadedFilesCount >=
														MAX_TOTAL_FILES
														? "#9ca3af"
														: themeColor,
											}}
										/>
									</button>
									{pendingFiles.length >= 3 && (
										<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap z-50 shadow-lg">
											{pendingFiles.length >= 3
												? "Max 3 files per message"
												: uploadedFilesCount >=
												  MAX_TOTAL_FILES
												? `Max ${MAX_TOTAL_FILES} files for entire conversation`
												: "Max 3 files allowed"}
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
									onKeyDown={(e) =>
										handleInputKeyDown(e, handleSend)
									}
									aria-label="Type a message"
								/>
								<button
									className={`text-white p-2.5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md ${
										!input.trim()
											? "opacity-50 cursor-not-allowed"
											: "cursor-pointer hover:scale-105 active:scale-95"
									}`}
									style={{ backgroundColor: themeColor }}
									onClick={handleSend}
									disabled={!input.trim()}
									aria-label="Send message"
								>
									<FaPaperPlane className="w-4 h-4" />
								</button>
							</div>
						</div>
					)}
				</div>
			)}
		</>
	);
}
