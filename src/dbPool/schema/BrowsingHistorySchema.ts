import { Schema } from 'mongoose'

/**
 * User browsing history data
 */
class BrowsingHistorySchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** User's UUID - non-null */
		UUID: { type: String, required: true },
		/** User's UID - non-null */
		uid: { type: Number, required: true },
		/** Type of browsed content, such as video, photo, etc. - non-null */
		category: { type: String, required: true },
		/** Unique ID of browsed content - non-null */
		id: { type: String, required: true },
		/** Browsing position anchor, if video then playback time, if album then last browsed image number, using String for compatibility */
		anchor: { type: String },
		/** Last view time, for user history page sorting, in principle same as the system field last edit time below - non-null */
		lastUpdateDateTime: { type: Number, required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'browsing-history'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const BrowsingHistorySchema = new BrowsingHistorySchemaFactory()
