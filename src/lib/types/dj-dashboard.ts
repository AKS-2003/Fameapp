// Enhanced data models for DJ Dashboard functionality

export interface MusicTrack {
	id: string;
	artist_id: string;
	song_title: string;
	duration: number;
	file_url: string | null;
	file_path?: string;
	is_main_track: boolean;
	tempo?: string;
	notes?: string;
	dj_notes?: string;
	file_size?: number;
	mime_type?: string;
	created_at?: string;
	updated_at?: string;
}

export interface EnhancedArtist {
	id: string;
	artist_name: string;
	real_name?: string | null;
	style: string;
	biography?: string | null;
	artist_notes?: string | null;
	performance_duration: number;
	quality_rating: number | null;
	performance_order: number | null;
	rehearsal_completed: boolean;
	performance_status?: string | null;
	performance_date?: string | null;
	actual_duration?: number;
	musicTracks: MusicTrack[];
	dj_notes?: string;
	hasMusic: boolean;
	phone?: string | null;
	email?: string | null;
}

export interface DJDashboardState {
	selectedArtist: EnhancedArtist | null;
	isDetailViewOpen: boolean;
	isDownloading: boolean;
	downloadProgress: number;
	audioPlayer: {
		currentTrack: MusicTrack | null;
		isPlaying: boolean;
		currentTime: number;
		duration: number;
		volume: number;
		playbackRate: number;
	};
	uploadState: {
		isUploading: boolean;
		progress: number;
		artistId: string | null;
		fileName: string | null;
	};
}

export interface EnhancedShowOrderItem {
	id: string;
	type: "artist" | "cue";
	artist?: EnhancedArtist;
	cue?: {
		id: string;
		type:
			| "mc_break"
			| "video_break"
			| "cleaning_break"
			| "speech_break"
			| "opening"
			| "countdown"
			| "artist_ending"
			| "animation";
		title: string;
		duration?: number;
		performance_order: number;
		notes?: string;
		start_time?: string;
		end_time?: string;
		is_completed?: boolean;
		completed_at?: string;
		dj_notes?: string;
	};
	performance_order: number;
	status?:
		| "not_started"
		| "next_on_deck"
		| "next_on_stage"
		| "currently_on_stage"
		| "completed";
}

export interface MusicUpdateEvent {
	eventId: string;
	artistId: string;
	action:
		| "track_uploaded"
		| "track_deleted"
		| "dj_notes_updated"
		| "track_updated";
	data: {
		trackId?: string;
		track?: MusicTrack;
		dj_notes?: string;
		timestamp: string;
	};
}

export interface BulkDownloadOptions {
	eventId: string;
	performanceDate: string;
	includeArtistNotes?: boolean;
	includeDJNotes?: boolean;
	format?: "zip" | "tar";
}

export interface FileUploadProgress {
	loaded: number;
	total: number;
	percentage: number;
	speed?: number;
	timeRemaining?: number;
}

export interface AudioPlayerState {
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	volume: number;
	playbackRate: number;
	isLoading: boolean;
	error: string | null;
}
