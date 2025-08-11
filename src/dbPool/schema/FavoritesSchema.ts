import { Schema } from 'mongoose'

/**
 * Favorites data
 */
class FavoritesSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** Favorites unique ID - non-null - unique */
		favoritesId: { type: Number, required: true, unique: true },
		/** Favorites creator - non-null */
		creator: { type: Number, required: true },
		/** Favorites other maintainers */
		editor: { type: [Number] },
		/** Favorites title - non-null */
		favoritesTitle: { type: String, required: true },
		/** Favorites bio */
		favoritesBio: { type: String },
		/** Favorites cover */
		favoritesCover: { type: String },
		/** Favorites visibility - non-null - 1 public, 0 followers only, -1 private */
		favoritesVisibility: { type: Number, required: true },
		/** Favorites creation time - non-null */
		favoritesCreateDateTime: { type: Number, required: true },
		/** System field - creation time - non-null */
		createDateTime: { type: Number, required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'favorites'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const FavoritesSchema = new FavoritesSchemaFactory()

/**
 * Favorites detail data
 */
class FavoritesDetailSchemaFactory {
	/** MongoDB Schema */
	schema = {
		/** Favorites unique ID - non-null */
		favoritesListId: { type: Number, required: true },
		/** Who added this content to favorites - non-null */
		operator: { type: Number, required: true },
		/** Content type, such as video, photo, etc. - non-null */
		category: { type: String, required: true },
		/** Content unique ID - non-null */
		id: { type: String, required: true },
		/** Time added to favorites - non-null */
		addedDateTime: { type: Number, required: true },
		/** System field - last edit time - non-null */
		editDateTime: { type: Number, required: true },
	}
	/** MongoDB collection name */
	collectionName = 'favorites-detail'
	/** Mongoose Schema instance */
	schemaInstance = new Schema(this.schema)
}
export const FavoritesDetailSchema = new FavoritesDetailSchemaFactory()
