// Connection Status Component
// Provides comprehensive connection status indicators and user feedback

import React from "react";
import { Badge } from "./badge";
import { Button } from "./button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "./tooltip";
import {
	Wifi,
	WifiOff,
	RefreshCw,
	AlertTriangle,
	CheckCircle,
	Clock,
	Zap,
} from "lucide-react";

export interface ConnectionStatusProps {
	isWebSocketConnected: boolean;
	isPollingActive?: boolean;
	lastUpdateTime?: Date;
	reconnectAttempts?: number;
	maxReconnectAttempts?: number;
	onManualRefresh?: () => void;
	onReconnect?: () => void;
	className?: string;
	showDetails?: boolean;
}

export type ConnectionQuality = "excellent" | "good" | "poor" | "disconnected";

export function getConnectionQuality(
	isWebSocketConnected: boolean,
	isPollingActive: boolean,
	lastUpdateTime?: Date
): ConnectionQuality {
	if (isWebSocketConnected) {
		return "excellent";
	} else if (isPollingActive) {
		if (lastUpdateTime) {
			const timeSinceUpdate = Date.now() - lastUpdateTime.getTime();
			if (timeSinceUpdate < 5000) {
				// Less than 5 seconds
				return "good";
			} else if (timeSinceUpdate < 30000) {
				// Less than 30 seconds
				return "poor";
			}
		}
		return "poor";
	}
	return "disconnected";
}

export function getConnectionStatusConfig(quality: ConnectionQuality) {
	switch (quality) {
		case "excellent":
			return {
				color: "bg-green-500",
				textColor: "text-green-700",
				bgColor: "bg-green-50",
				borderColor: "border-green-200",
				icon: CheckCircle,
				label: "Real-time updates active",
				description: "WebSocket connected - instant updates",
				variant: "default" as const,
			};
		case "good":
			return {
				color: "bg-blue-500",
				textColor: "text-blue-700",
				bgColor: "bg-blue-50",
				borderColor: "border-blue-200",
				icon: Zap,
				label: "Polling mode active",
				description: "Updates every 2 seconds via polling",
				variant: "secondary" as const,
			};
		case "poor":
			return {
				color: "bg-yellow-500",
				textColor: "text-yellow-700",
				bgColor: "bg-yellow-50",
				borderColor: "border-yellow-200",
				icon: AlertTriangle,
				label: "Connection issues",
				description: "Updates may be delayed",
				variant: "outline" as const,
			};
		case "disconnected":
			return {
				color: "bg-red-500",
				textColor: "text-red-700",
				bgColor: "bg-red-50",
				borderColor: "border-red-200",
				icon: WifiOff,
				label: "Disconnected",
				description: "No real-time updates",
				variant: "destructive" as const,
			};
	}
}

export function ConnectionStatus({
	isWebSocketConnected,
	isPollingActive = true,
	lastUpdateTime,
	reconnectAttempts = 0,
	maxReconnectAttempts = 5,
	onManualRefresh,
	onReconnect,
	className = "",
	showDetails = false,
}: ConnectionStatusProps) {
	const quality = getConnectionQuality(
		isWebSocketConnected,
		isPollingActive,
		lastUpdateTime
	);
	const config = getConnectionStatusConfig(quality);
	const IconComponent = config.icon;

	const formatLastUpdate = (date: Date) => {
		const now = new Date();
		const diff = now.getTime() - date.getTime();

		if (diff < 1000) return "just now";
		if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		return date.toLocaleTimeString();
	};

	const getReconnectionStatus = () => {
		if (reconnectAttempts === 0) return null;
		if (reconnectAttempts >= maxReconnectAttempts) {
			return "Max reconnection attempts reached";
		}
		return `Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`;
	};

	if (!showDetails) {
		// Compact version - just indicator dot and label
		return (
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<div className={`flex items-center gap-2 ${className}`}>
							<div
								className={`w-2 h-2 rounded-full ${config.color}`}
							/>
							<span className="text-xs text-muted-foreground">
								{config.label}
							</span>
						</div>
					</TooltipTrigger>
					<TooltipContent>
						<div className="text-sm">
							<div className="font-medium">{config.label}</div>
							<div className="text-muted-foreground">
								{config.description}
							</div>
							{lastUpdateTime && (
								<div className="text-xs mt-1">
									Last update:{" "}
									{formatLastUpdate(lastUpdateTime)}
								</div>
							)}
							{getReconnectionStatus() && (
								<div className="text-xs mt-1 text-yellow-600">
									{getReconnectionStatus()}
								</div>
							)}
						</div>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	// Detailed version - full status card
	return (
		<div
			className={`rounded-lg border p-3 ${config.bgColor} ${config.borderColor} ${className}`}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<IconComponent className={`h-4 w-4 ${config.textColor}`} />
					<div>
						<div
							className={`text-sm font-medium ${config.textColor}`}
						>
							{config.label}
						</div>
						<div className="text-xs text-muted-foreground">
							{config.description}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{lastUpdateTime && (
						<div className="text-xs text-muted-foreground flex items-center gap-1">
							<Clock className="h-3 w-3" />
							{formatLastUpdate(lastUpdateTime)}
						</div>
					)}

					{onManualRefresh && (
						<Button
							variant="ghost"
							size="sm"
							onClick={onManualRefresh}
							className="h-6 px-2"
						>
							<RefreshCw className="h-3 w-3" />
						</Button>
					)}

					{quality === "disconnected" && onReconnect && (
						<Button
							variant="outline"
							size="sm"
							onClick={onReconnect}
							className="h-6 px-2"
						>
							<Wifi className="h-3 w-3 mr-1" />
							Reconnect
						</Button>
					)}
				</div>
			</div>

			{getReconnectionStatus() && (
				<div className="mt-2 text-xs text-yellow-600 flex items-center gap-1">
					<RefreshCw className="h-3 w-3 animate-spin" />
					{getReconnectionStatus()}
				</div>
			)}

			{/* Connection quality indicator */}
			<div className="mt-2 flex items-center gap-1">
				<div className="text-xs text-muted-foreground">Connection:</div>
				<Badge variant={config.variant} className="text-xs">
					{quality.charAt(0).toUpperCase() + quality.slice(1)}
				</Badge>
			</div>
		</div>
	);
}

// Hook for managing connection status
export function useConnectionStatus(wsManager: any) {
	const [isConnected, setIsConnected] = React.useState(false);
	const [lastUpdateTime, setLastUpdateTime] = React.useState<Date>();
	const [reconnectAttempts, setReconnectAttempts] = React.useState(0);

	React.useEffect(() => {
		if (!wsManager) return;

		// Monitor connection status
		const checkConnection = () => {
			const connected = wsManager.isWebSocketConnected();
			setIsConnected(connected);

			if (connected) {
				setReconnectAttempts(0);
			}
		};

		// Update last update time when data changes
		const handleDataUpdate = () => {
			setLastUpdateTime(new Date());
		};

		// Monitor reconnection attempts
		const handleReconnectAttempt = () => {
			setReconnectAttempts((prev) => prev + 1);
		};

		// Set up monitoring
		const interval = setInterval(checkConnection, 1000);

		// Listen for data updates (if wsManager supports it)
		if (wsManager.on) {
			wsManager.on("data-update", handleDataUpdate);
			wsManager.on("reconnect-attempt", handleReconnectAttempt);
		}

		// Initial check
		checkConnection();

		return () => {
			clearInterval(interval);
			if (wsManager.off) {
				wsManager.off("data-update", handleDataUpdate);
				wsManager.off("reconnect-attempt", handleReconnectAttempt);
			}
		};
	}, [wsManager]);

	return {
		isConnected,
		lastUpdateTime,
		reconnectAttempts,
		refresh: () => setLastUpdateTime(new Date()),
	};
}

// Simplified connection indicator for headers
export function ConnectionIndicator({
	isConnected,
	className = "",
}: {
	isConnected: boolean;
	className?: string;
}) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className={`flex items-center gap-2 ${className}`}>
						<div
							className={`w-2 h-2 rounded-full ${
								isConnected ? "bg-green-500" : "bg-red-500"
							}`}
						/>
						<span className="text-xs text-muted-foreground">
							{isConnected ? "Live" : "Offline"}
						</span>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<div className="text-sm">
						{isConnected
							? "Real-time updates active"
							: "Using polling mode"}
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

// Network quality indicator
export function NetworkQualityIndicator({
	quality,
	className = "",
}: {
	quality: ConnectionQuality;
	className?: string;
}) {
	const config = getConnectionStatusConfig(quality);
	const IconComponent = config.icon;

	return (
		<div className={`flex items-center gap-1 ${className}`}>
			<IconComponent className={`h-3 w-3 ${config.textColor}`} />
			<span className={`text-xs ${config.textColor}`}>
				{config.label}
			</span>
		</div>
	);
}
