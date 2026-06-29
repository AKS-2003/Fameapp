"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronDown, Search, X } from "lucide-react";
import {
	countries,
	Country,
	defaultCountry,
	extractCountryFromPhone,
} from "@/lib/country-codes";

// WhatsApp icon component
export const WhatsAppIcon = ({
	className = "h-4 w-4",
}: {
	className?: string;
}) => (
	<svg
		className={className}
		viewBox="0 0 24 24"
		fill="currentColor"
		xmlns="http://www.w3.org/2000/svg"
	>
		<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
	</svg>
);

interface WhatsAppInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	id?: string;
	required?: boolean;
}

export function WhatsAppInput({
	value,
	onChange,
	placeholder = "528411575",
	className = "",
	id = "whatsapp",
	required = false,
}: WhatsAppInputProps) {
	const [showWarningDialog, setShowWarningDialog] = useState(false);
	const [hasSeenWarning, setHasSeenWarning] = useState(false);
	const [showCountryDropdown, setShowCountryDropdown] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCountry, setSelectedCountry] =
		useState<Country>(defaultCountry);
	const [localNumber, setLocalNumber] = useState("");
	const dropdownRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Parse existing value on mount
	useEffect(() => {
		if (value) {
			const { country, localNumber: extracted } =
				extractCountryFromPhone(value);
			if (country) {
				setSelectedCountry(country);
				setLocalNumber(extracted);
			} else if (value.startsWith("+")) {
				// Has + but no matching country, keep as is
				setLocalNumber(value.replace(/^\+/, ""));
			} else {
				setLocalNumber(value);
			}
		}
	}, []);

	// Filter countries based on search
	const filteredCountries = useMemo(() => {
		if (!searchQuery) return countries;
		const query = searchQuery.toLowerCase();
		return countries.filter(
			(country) =>
				country.name.toLowerCase().includes(query) ||
				country.dialCode.includes(query) ||
				country.code.toLowerCase().includes(query)
		);
	}, [searchQuery]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(event.target as Node)
			) {
				setShowCountryDropdown(false);
				setSearchQuery("");
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Focus search input when dropdown opens
	useEffect(() => {
		if (showCountryDropdown && searchInputRef.current) {
			searchInputRef.current.focus();
		}
	}, [showCountryDropdown]);

	const handleFocus = () => {
		if (!hasSeenWarning) {
			setShowWarningDialog(true);
		}
	};

	const handleConfirm = () => {
		setHasSeenWarning(true);
		setShowWarningDialog(false);
	};

	const handleCountrySelect = (country: Country) => {
		setSelectedCountry(country);
		setShowCountryDropdown(false);
		setSearchQuery("");
		// Update the full phone number
		onChange(country.dialCode + localNumber);
	};

	const handleLocalNumberChange = (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const newLocalNumber = e.target.value.replace(/[^\d]/g, "");
		setLocalNumber(newLocalNumber);
		onChange(selectedCountry.dialCode + newLocalNumber);
	};

	return (
		<>
			<div className="flex">
				{/* Country Code Selector */}
				<div className="relative" ref={dropdownRef}>
					<button
						suppressHydrationWarning
						type="button"
						onClick={() =>
							setShowCountryDropdown(!showCountryDropdown)
						}
						className="flex items-center gap-1 h-10 px-3 border border-r-0 rounded-l-md bg-gray-50 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
					>
						<span className="text-lg">{selectedCountry.flag}</span>
						<span className="text-sm font-medium text-gray-700">
							{selectedCountry.dialCode}
						</span>
						<ChevronDown className="h-4 w-4 text-gray-500" />
					</button>

					{/* Country Dropdown */}
					{showCountryDropdown && (
						<div className="absolute z-50 top-full left-0 mt-1 w-72 bg-white border rounded-lg shadow-lg max-h-80 overflow-hidden">
							{/* Search Input */}
							<div className="p-2 border-b sticky top-0 bg-white">
								<div className="relative">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
									<input
										ref={searchInputRef}
										type="text"
										value={searchQuery}
										onChange={(e) =>
											setSearchQuery(e.target.value)
										}
										placeholder="Search country..."
										className="w-full pl-9 pr-8 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
									/>
									{searchQuery && (
										<button
											type="button"
											onClick={() => setSearchQuery("")}
											className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
										>
											<X className="h-4 w-4" />
										</button>
									)}
								</div>
							</div>

							{/* Country List */}
							<div className="overflow-y-auto max-h-60">
								{filteredCountries.length === 0 ? (
									<div className="p-4 text-center text-gray-500 text-sm">
										No countries found
									</div>
								) : (
									filteredCountries.map((country) => (
										<button
											key={country.code}
											type="button"
											onClick={() =>
												handleCountrySelect(country)
											}
											className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-purple-50 transition-colors text-left ${
												selectedCountry.code ===
												country.code
													? "bg-purple-100"
													: ""
											}`}
										>
											<span className="text-xl">
												{country.flag}
											</span>
											<span className="flex-1 text-sm truncate">
												{country.name}
											</span>
											<span className="text-sm text-gray-500 font-medium">
												{country.dialCode}
											</span>
										</button>
									))
								)}
							</div>
						</div>
					)}
				</div>

				{/* Phone Number Input */}
				<Input
					id={id}
					type="tel"
					value={localNumber}
					onChange={handleLocalNumberChange}
					onFocus={handleFocus}
					placeholder={placeholder}
					className={`rounded-l-none ${className}`}
					required={required}
				/>
			</div>

			<Dialog
				open={showWarningDialog}
				onOpenChange={setShowWarningDialog}
			>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 text-amber-600">
							<AlertTriangle className="h-5 w-5" />
							Important: WhatsApp Number Format
						</DialogTitle>
					</DialogHeader>
					<DialogDescription asChild>
						<div className="space-y-4">
							<div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
								<p className="font-semibold text-amber-900 mb-2">
									MAKE SURE TO FIRST CHOOSE YOUR COUNTRY CODE
									AND THEN FILL IN YOUR NUMBER
								</p>
								<div className="text-sm text-amber-800 space-y-1">
									<p className="text-green-700">
										✅ Correct: Select 🇦🇪 +971 then enter
										528411575
									</p>
									<p className="text-red-700">
										❌ Wrong: Just entering 8124518263
										without country code
									</p>
								</div>
							</div>

							<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
								<p className="font-semibold text-blue-900 mb-2">
									⚠️ IMPORTANT
								</p>
								<p className="text-sm text-blue-800">
									Please fill in your WhatsApp number or any
									form of contact where we can communicate
									with you in case of an emergency.
								</p>
								<p className="text-sm text-blue-800 mt-2">
									If you do not have WhatsApp, ask a friend or
									share in the notes how we can contact you.
								</p>
							</div>

							<Button onClick={handleConfirm} className="w-full">
								I Understand
							</Button>
						</div>
					</DialogDescription>
				</DialogContent>
			</Dialog>
		</>
	);
}

// Clickable WhatsApp link component
interface WhatsAppLinkProps {
	phoneNumber: string | null | undefined;
	className?: string;
	showIcon?: boolean;
}

export function WhatsAppLink({
	phoneNumber,
	className = "",
	showIcon = true,
}: WhatsAppLinkProps) {
	if (!phoneNumber) {
		return <span className={className}>Not provided</span>;
	}

	// Clean the phone number - remove spaces, dashes, etc. but keep the + sign
	const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, "");

	// Create WhatsApp URL
	const whatsappUrl = `https://wa.me/${cleanNumber.replace("+", "")}`;

	return (
		<a
			href={whatsappUrl}
			target="_blank"
			rel="noopener noreferrer"
			className={`inline-flex items-center gap-1 text-green-600 hover:text-green-700 hover:underline ${className}`}
		>
			{showIcon && <WhatsAppIcon className="h-4 w-4" />}
			{phoneNumber}
		</a>
	);
}

// Clickable Email link component
interface EmailLinkProps {
	email: string | null | undefined;
	className?: string;
}

export function EmailLink({ email, className = "" }: EmailLinkProps) {
	if (!email) {
		return <span className={className}>Not provided</span>;
	}

	return (
		<a
			href={`mailto:${email}`}
			className={`text-blue-600 hover:text-blue-700 hover:underline ${className}`}
		>
			{email}
		</a>
	);
}
