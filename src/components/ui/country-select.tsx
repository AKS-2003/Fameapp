"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronDown, Search, X, Globe } from "lucide-react";
import { countries, Country, defaultCountry } from "@/lib/country-codes";

interface CountrySelectProps {
	id?: string;
	label?: string;
	value: string; // Country code (e.g., "US", "AE")
	onChange: (countryCode: string) => void;
	placeholder?: string;
	required?: boolean;
	className?: string;
}

export function CountrySelect({
	id,
	label,
	value,
	onChange,
	placeholder = "Select country",
	required = false,
	className = "",
}: CountrySelectProps) {
	const [showDropdown, setShowDropdown] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const dropdownRef = useRef<HTMLDivElement>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Find selected country
	const selectedCountry = useMemo(() => {
		return countries.find((c) => c.code === value);
	}, [value]);

	// Filter countries based on search
	const filteredCountries = useMemo(() => {
		if (!searchQuery) return countries;
		const query = searchQuery.toLowerCase();
		return countries.filter(
			(country) =>
				country.name.toLowerCase().includes(query) ||
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
				setShowDropdown(false);
				setSearchQuery("");
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	// Focus search input when dropdown opens
	useEffect(() => {
		if (showDropdown && searchInputRef.current) {
			searchInputRef.current.focus();
		}
	}, [showDropdown]);

	const handleCountrySelect = (country: Country) => {
		onChange(country.code);
		setShowDropdown(false);
		setSearchQuery("");
	};

	return (
		<div className={`space-y-2 ${className}`}>
			{label && (
				<Label htmlFor={id}>
					{label} {required && "*"}
				</Label>
			)}
			<div className="relative" ref={dropdownRef}>
				<button
					type="button"
					id={id}
					onClick={() => setShowDropdown(!showDropdown)}
					className={`w-full flex items-center justify-between gap-2 h-10 px-3 border rounded-md bg-white hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 ${
						!selectedCountry ? "text-gray-500" : "text-gray-900"
					}`}
				>
					<div className="flex items-center gap-2 truncate">
						{selectedCountry ? (
							<>
								<span className="text-lg">
									{selectedCountry.flag}
								</span>
								<span className="truncate">
									{selectedCountry.name}
								</span>
							</>
						) : (
							<>
								<Globe className="h-4 w-4 text-gray-400" />
								<span>{placeholder}</span>
							</>
						)}
					</div>
					<ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
				</button>

				{/* Country Dropdown */}
				{showDropdown && (
					<div className="absolute z-50 top-full left-0 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-80 overflow-hidden">
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
											value === country.code
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
									</button>
								))
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

// Member info interface for duo/trio
export interface MemberInfo {
	name: string;
	countryLiving: string;
	homeCountry: string;
}

interface NationalityInputProps {
	performanceType: string;
	// For solo/group/band/other - single values
	countryLiving: string;
	homeCountry: string;
	onCountryLivingChange: (value: string) => void;
	onHomeCountryChange: (value: string) => void;
	// For duo/trio - array of members
	members?: MemberInfo[];
	onMembersChange?: (members: MemberInfo[]) => void;
}

export function NationalityInput({
	performanceType,
	countryLiving,
	homeCountry,
	onCountryLivingChange,
	onHomeCountryChange,
	members = [],
	onMembersChange,
}: NationalityInputProps) {
	// Determine number of member fields based on performance type
	const getMemberCount = () => {
		switch (performanceType) {
			case "solo":
				return 1;
			case "duo":
				return 2;
			case "trio":
				return 3;
			default:
				return 0; // group, band, other - use single field
		}
	};

	const memberCount = getMemberCount();
	const showMemberFields = memberCount > 0;

	// Initialize members array if needed
	useEffect(() => {
		if (showMemberFields && onMembersChange) {
			if (members.length !== memberCount) {
				const newMembers: MemberInfo[] = [];
				for (let i = 0; i < memberCount; i++) {
					newMembers.push(
						members[i] || {
							name: "",
							countryLiving: "",
							homeCountry: "",
						}
					);
				}
				onMembersChange(newMembers);
			}
		}
	}, [memberCount, showMemberFields]);

	const updateMember = (
		index: number,
		field: keyof MemberInfo,
		value: string
	) => {
		if (onMembersChange) {
			const newMembers = [...members];
			if (!newMembers[index]) {
				newMembers[index] = {
					name: "",
					countryLiving: "",
					homeCountry: "",
				};
			}
			newMembers[index] = { ...newMembers[index], [field]: value };
			onMembersChange(newMembers);
		}
	};

	const getMemberLabel = (index: number) => {
		if (performanceType === "solo") return "";
		if (performanceType === "duo") {
			return index === 0 ? "Member 1" : "Member 2";
		}
		if (performanceType === "trio") {
			return `Member ${index + 1}`;
		}
		return "";
	};

	// For group/band/other - show single country field
	if (!showMemberFields) {
		return (
			<div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
				<h4 className="text-md font-semibold text-blue-800 flex items-center gap-2">
					<Globe className="h-5 w-5" />
					Team/Group Location
				</h4>
				<p className="text-sm text-gray-600">
					Please provide the country where your team/group is based.
				</p>
				<CountrySelect
					label="Country You're Living In"
					value={countryLiving}
					onChange={onCountryLivingChange}
					placeholder="Select country"
					required
				/>
			</div>
		);
	}

	// For solo - show single person fields
	if (performanceType === "solo") {
		return (
			<div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
				<h4 className="text-md font-semibold text-blue-800 flex items-center gap-2">
					<Globe className="h-5 w-5" />
					Nationality Information
				</h4>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="space-y-2">
						<Label>Your Name *</Label>
						<Input
							value={members[0]?.name || ""}
							onChange={(e) =>
								updateMember(0, "name", e.target.value)
							}
							placeholder="Enter your name"
							required
						/>
					</div>
					<CountrySelect
						label="Country You're Living In"
						value={members[0]?.countryLiving || ""}
						onChange={(value) =>
							updateMember(0, "countryLiving", value)
						}
						placeholder="Select country"
						required
					/>
					<CountrySelect
						label="Home Country (Nationality)"
						value={members[0]?.homeCountry || ""}
						onChange={(value) =>
							updateMember(0, "homeCountry", value)
						}
						placeholder="Select country"
						required
					/>
				</div>
			</div>
		);
	}

	// For duo/trio - show multiple member fields
	return (
		<div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
			<h4 className="text-md font-semibold text-blue-800 flex items-center gap-2">
				<Globe className="h-5 w-5" />
				Nationality Information (
				{performanceType === "duo" ? "Duo" : "Trio"})
			</h4>
			<p className="text-sm text-gray-600">
				Please provide information for each member of your{" "}
				{performanceType}.
			</p>

			{Array.from({ length: memberCount }).map((_, index) => (
				<div
					key={index}
					className="p-3 bg-white rounded-lg border border-blue-100 space-y-3"
				>
					<h5 className="font-medium text-gray-700">
						{getMemberLabel(index)}
					</h5>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						<div className="space-y-2">
							<Label>Name *</Label>
							<Input
								value={members[index]?.name || ""}
								onChange={(e) =>
									updateMember(index, "name", e.target.value)
								}
								placeholder="Enter name"
								required
							/>
						</div>
						<CountrySelect
							label="Country Living In"
							value={members[index]?.countryLiving || ""}
							onChange={(value) =>
								updateMember(index, "countryLiving", value)
							}
							placeholder="Select country"
							required
						/>
						<CountrySelect
							label="Home Country"
							value={members[index]?.homeCountry || ""}
							onChange={(value) =>
								updateMember(index, "homeCountry", value)
							}
							placeholder="Select country"
							required
						/>
					</div>
				</div>
			))}
		</div>
	);
}

// Helper to get country name from code
export function getCountryName(code: string): string {
	const country = countries.find((c) => c.code === code);
	return country ? country.name : code;
}

// Helper to get country flag from code
export function getCountryFlag(code: string): string {
	const country = countries.find((c) => c.code === code);
	return country ? country.flag : "🌍";
}
