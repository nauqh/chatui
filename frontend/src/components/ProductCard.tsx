import React from "react";
import Image from "next/image";

export interface TierraProduct {
	id: string;
	name: string;
	price: string;
	image: string;
	ringSize?: string;
	ringStyle?: string;
	ringType?: string;
	material?: string; // Simplified from purity array
	url?: string;
}

interface ProductCardProps {
	product: TierraProduct;
	themeColor?: string;
}

export default function ProductCard({
	product,
	themeColor = "#b48c72",
}: ProductCardProps) {
	const handleCardClick = () => {
		// Link directly to the product page on Tierra website
		const productUrl = `https://www.tierra.vn/search/?keyword=${product.id}`;
		window.open(productUrl, "_blank");
	};

	// Format price with Vietnamese currency format
	const formatPrice = (price: string) => {
		// Remove .0 suffix and parse to integer
		const cleanPrice = price.replace(".0", "");
		const numPrice = parseInt(cleanPrice);
		if (isNaN(numPrice)) return "0đ";

		// Format with Vietnamese locale (dots as thousand separators)
		return numPrice.toLocaleString("vi-VN") + "đ";
	};

	// Get the first 4 key details to display
	const keyDetails = [
		{ label: "Ni tay", value: product.ringSize },
		{ label: "Kiểu dáng", value: product.ringStyle },
		{ label: "Loại nhẫn", value: product.ringType },
		{ label: "Chất liệu", value: product.material },
	].filter((detail) => detail.value); // Only show details that have values

	return (
		<div
			className="bg-white rounded-xl shadow-md overflow-hidden w-38 border border-gray-100 flex-shrink-0 flex flex-col cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
			onClick={handleCardClick}
		>
			{/* Product Image */}
			<div className="relative bg-gray-50">
				<div className="relative w-full h-25">
					<Image
						src={product.image}
						alt={product.name}
						fill
						style={{ objectFit: "cover" }}
					/>
				</div>
			</div>

			{/* Product Info */}
			<div className="p-3 flex flex-col flex-grow">
				{/* Product Name & Price */}
				<div className="mb-3">
					<h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
						{product.id}
					</h3>
					<div
						className="text-sm font-bold"
						style={{ color: themeColor }}
					>
						{formatPrice(product.price)}
					</div>
				</div>

				{/* Key Details */}
				<div className="space-y-1">
					{keyDetails.slice(1, 4).map((detail, idx) => (
						<div key={idx} className="flex justify-between text-xs">
							<span className="text-gray-500">
								{detail.label}:
							</span>
							<span className="text-gray-700">
								{detail.value}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

