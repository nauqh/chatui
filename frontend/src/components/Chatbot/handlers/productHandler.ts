import { TierraProduct } from "../../ProductCard";
import { Message } from "../types";

export interface ProductHandlerConfig {
	apiBaseUrl: string;
}

/**
 * Fetches multiple products by their IDs from the API
 */
export const fetchProductsByIds = async (
	productIds: string[],
	apiBaseUrl: string
): Promise<Record<string, TierraProduct>> => {
	try {
		console.log("Fetching products from API:", `${apiBaseUrl}/products`, productIds);
		const response = await fetch(`${apiBaseUrl}/products`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ product_ids: productIds }),
		});

		if (response.ok) {
			const data = await response.json();
			console.log("Products API response:", data);
			const productMap: Record<string, TierraProduct> = {};

			if (data.results) {
				data.results.forEach(
					(result: {
						found: boolean;
						product_id: string;
						product: TierraProduct;
					}) => {
						if (result.found && result.product) {
							productMap[result.product_id] = result.product;
						}
					}
				);
			}

			console.log("Product map created:", productMap);
			return productMap;
		}

		console.warn("Products API response not OK:", response.status, response.statusText);
		return {};
	} catch (error) {
		console.error("Error fetching products:", error);
		return {};
	}
};

/**
 * Fetches a single product by ID
 */
export const getProductById = async (
	productId: string,
	apiBaseUrl: string
): Promise<TierraProduct | null> => {
	const productMap = await fetchProductsByIds([productId], apiBaseUrl);
	return productMap[productId] || null;
};

/**
 * Handles product display in messages with staggered timing
 */
export const handleProductsInResponse = async (
	productIds: string[],
	apiBaseUrl: string,
	addMessage: (msg: Message) => void,
	staggerDelay: number = 1000,
	originalMessage?: Message
): Promise<void> => {
	console.log("handleProductsInResponse called with:", {
		productIds,
		apiBaseUrl,
		staggerDelay,
	});

	if (!productIds || productIds.length === 0) {
		console.log("No product IDs provided, returning early");
		return;
	}

	// Fetch all products at once
	const productMap = await fetchProductsByIds(productIds, apiBaseUrl);
	console.log("Fetched product map:", productMap);

	// Group products into pairs and add as messages with staggered timing
	const productPairs: TierraProduct[][] = [];
	for (let i = 0; i < productIds.length; i += 2) {
		const pair: TierraProduct[] = [];
		const product1 = productMap[productIds[i]];
		const product2 = productMap[productIds[i + 1]];

		if (product1) pair.push(product1);
		if (product2) pair.push(product2);

		if (pair.length > 0) {
			productPairs.push(pair);
		}
	}

	console.log("Product pairs created:", productPairs);

	// Add each pair as a separate message with staggered timing
	productPairs.forEach((pair, pairIndex) => {
		const delay = (pairIndex + 1) * staggerDelay;
		const isLastPair = pairIndex === productPairs.length - 1;

		console.log(`Scheduling product pair ${pairIndex} with delay ${delay}ms`);

		setTimeout(() => {
			console.log(`Adding product message for pair ${pairIndex}:`, pair);
			addMessage({
				sender: "bot",
				products: pair,
				timestamp: new Date().toISOString(),
				showMoreButton:
					isLastPair && originalMessage?.action === "shortlist"
						? true
						: undefined,
			});
		}, delay);
	});
};

/**
 * Creates a consultation message for a product
 */
export const createConsultationMessage = (product: TierraProduct): string => {
	return `Tư vấn thêm về sản phẩm ${product.name} (${product.id})`;
};
