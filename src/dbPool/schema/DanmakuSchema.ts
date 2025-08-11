import { Schema } from 'mongoose'

/**
 * Danmaku data
 */
class DanmakuSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** KVID video ID - non-null */
		videoId: { type: Number, required: true },
		/** Danmaku sender's UUID, associated with user security collection UUID - non-null */
		UUID: { type: String, required: true },
		/** Danmaku sender's UID - non-null */
		uid: { type: Number, required: true },
		/** Danmaku send timing, unit: seconds (supports decimals) - non-null  */
		time: { type: Number, required: true },
		/** Danmaku text - non-null */
		text: { type: String, required: true },
		/** Danmaku color - non-null */
		color: { type: String, required: true },
		/** Danmaku font size - non-null */ /** Backend only stores three types of data, frontend maps to CSS-usable pixels based on type */ /** Default 'medium' - medium size */
		fontSize: { type: String, enum: ['small', 'medium', 'large'], required: true, default: 'medium' },
		/** Danmaku launch mode - non-null */ /** Default 'rtl' - launch from right to left */
		mode: { type: String, enum: ['ltr', 'rtl', 'top', 'bottom'], required: true, default: 'rtl' },
		/** Whether to enable rainbow danmaku - non-null */ /** Default false - not enabled */
		enableRainbow: { type: Boolean, required: false, default: false },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'danmaku'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}

export const DanmakuSchema = new DanmakuSchemaFactory()
