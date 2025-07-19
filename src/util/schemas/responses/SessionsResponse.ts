export interface SessionsResponse {
	user_sessions: UserSession[];
}

export interface UserSession {
	id_hash: string; // standard base64, decoding gives 32 bytes (maybe sha256)
	approx_last_used_time: string; // update on last login or request ITS A DATE BTW
	client_info: {
		os: string; // X-Super-Properties os
		platform: string; // X-Super-Properties platform
		location: string; // get location from IP, its City, State, Country
	};
}
