import { CustomerInfo } from "../types";

export interface CustomerHandlerConfig {
	sessionStorageKey?: string;
}

const DEFAULT_SESSION_STORAGE_KEY = "customer_info";

/**
 * Saves customer information to session storage
 */
export const saveCustomerInfo = (
	customerInfo: CustomerInfo,
	sessionStorageKey: string = DEFAULT_SESSION_STORAGE_KEY
): void => {
	if (typeof window !== "undefined") {
		sessionStorage.setItem(sessionStorageKey, JSON.stringify(customerInfo));
	}
};

/**
 * Retrieves customer information from session storage
 */
export const getCustomerInfo = (
	sessionStorageKey: string = DEFAULT_SESSION_STORAGE_KEY
): CustomerInfo | null => {
	if (typeof window === "undefined") return null;

	const stored = sessionStorage.getItem(sessionStorageKey);
	if (!stored) return null;

	try {
		return JSON.parse(stored);
	} catch (error) {
		console.error(
			"Error parsing customer info from session storage:",
			error
		);
		return null;
	}
};

/**
 * Removes customer information from session storage
 */
export const clearCustomerInfo = (
	sessionStorageKey: string = DEFAULT_SESSION_STORAGE_KEY
): void => {
	if (typeof window !== "undefined") {
		sessionStorage.removeItem(sessionStorageKey);
	}
};

/**
 * Validates customer information
 */
export const validateCustomerInfo = (customerInfo: CustomerInfo): boolean => {
	return !!(customerInfo.name?.trim() && customerInfo.phone?.trim());
};

/**
 * Handles customer form submission
 */
export const handleCustomerSubmit = (
	e: React.FormEvent,
	customerInfo: CustomerInfo,
	setCustomerRegistered: (registered: boolean) => void,
	setShowCustomerModal: (show: boolean) => void,
	setOpen: (open: boolean) => void,
	sessionStorageKey: string = DEFAULT_SESSION_STORAGE_KEY
): void => {
	e.preventDefault();

	if (!validateCustomerInfo(customerInfo)) {
		return;
	}

	setCustomerRegistered(true);
	saveCustomerInfo(customerInfo, sessionStorageKey);
	setShowCustomerModal(false);
	setOpen(true);
};

/**
 * Handles closing customer modal
 */
export const handleCloseCustomerModal = (
	setShowCustomerModal: (show: boolean) => void,
	setCustomerInfo: (info: CustomerInfo) => void
): void => {
	setShowCustomerModal(false);
	setCustomerInfo({ name: "", phone: "" });
};

/**
 * Resets customer registration state
 */
export const resetCustomerRegistration = (
	setCustomerRegistered: (registered: boolean) => void,
	setCustomerInfo: (info: CustomerInfo) => void,
	sessionStorageKey: string = DEFAULT_SESSION_STORAGE_KEY
): void => {
	setCustomerRegistered(false);
	setCustomerInfo({ name: "", phone: "" });
	clearCustomerInfo(sessionStorageKey);
};
