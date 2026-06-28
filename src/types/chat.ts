/**
 * Chat Types for Stage Manager to Artist Communication
 */

export interface ChatMessage {
	id: string;
	eventId: string;
	showDate: string; // The performance date this message is for
	senderId: string; // Stage manager ID or Artist ID
	senderName: string;
	senderRole: "stage_manager" | "artist";
	message: string;
	timestamp: string;
	read: boolean;
	readBy: string[]; // Array of artist IDs who have read the message (for stage manager messages) or stage manager IDs (for artist messages)
	isPersonal?: boolean; // True if this is a personal message to a single artist
	targetArtistId?: string; // The specific artist this personal message is for
	targetArtistName?: string; // The name of the target artist for display
}

export interface ChatConversation {
	eventId: string;
	showDate: string;
	messages: ChatMessage[];
	artistIds: string[]; // Artists assigned to this date
	lastMessageAt: string;
	unreadCount: number; // Per artist
}

export interface PersonalMessage {
	id: string;
	eventId: string;
	artistId: string;
	artistName: string;
	senderId: string;
	senderName: string;
	senderRole: "stage_manager" | "artist";
	message: string;
	timestamp: string;
	read: boolean;
	readByStageManager?: boolean;
}

export interface PersonalMessageData {
	eventId: string;
	messages: PersonalMessage[];
	updatedAt: string;
}

export interface ChatNotification {
	artistId: string;
	artistEmail: string;
	artistName: string;
	eventId: string;
	eventName: string;
	showDate: string;
	message: string;
	senderName: string;
	timestamp: string;
	isPersonal?: boolean;
}
