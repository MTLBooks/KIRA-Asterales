/**
 * Basic danmaku data
 */
type BasicDanmakuDto = {
	/** Required - KVID */
	videoId: number;
	/** Required - timestamp (seconds, supports decimals) */
	time: number;
	/** Required - text */
	text: string;
	/** Required - color */
	color: string;
	/** Required - font size; backend stores three enum values, mapped to px on frontend */
	fontSize: 'small' | 'medium' | 'large';
	/** Required - mode; default 'rtl' */
	mode: 'ltr' | 'rtl' | 'top' | 'bottom';
	/** Required - enable rainbow effect */
	enableRainbow: boolean;
}

/**
 * Emit danmaku request
 */
export type EmitDanmakuRequestDto = BasicDanmakuDto & {}

/**
 * Emit danmaku response
 */
export type EmitDanmakuResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Echo of sent danmaku when success */
	danmaku?: EmitDanmakuRequestDto;
}

/**
 * Get danmaku list request
 */
export type GetDanmakuByKvidRequestDto = {
	/** Required - KVID */
	videoId: number;
}

/**
 * Danmaku item in response
 */
export type GetDanmakuByKvidDto = BasicDanmakuDto & {
	/** Last edit time */
	editDateTime: number;
}

/**
 * Get danmaku list response
 */
export type GetDanmakuByKvidResponseDto = {
	/** Execution result */
	success: boolean;
	/** Extra message */
	message?: string;
	/** Danmaku list (without user id; includes last edit time) */
	danmaku?: (GetDanmakuByKvidDto & { isBlockedByOther?: boolean })[];
}
