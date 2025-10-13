"use client";

import SyntaxHighlighter from "react-syntax-highlighter";
import { nord as theme } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
	language: string;
	codeContent: string;
	className?: string;
}

export default function CodeBlock({
	language,
	codeContent,
	className,
}: CodeBlockProps) {
	return (
		<div
			className={cn(
				"rounded-lg my-4 bg-[#2e3440] overflow-hidden",
				className
			)}
		>
			<SyntaxHighlighter
				language={language}
				style={theme}
				className="text-sm rounded-lg"
				customStyle={{
					margin: 0,
					borderRadius: "0.5rem",
				}}
			>
				{codeContent}
			</SyntaxHighlighter>
		</div>
	);
}
