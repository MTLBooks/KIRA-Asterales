import { Schema } from 'mongoose'

/**
 * Chapter entity schema
 * Mirrors key fields from novel-api Prisma `chapters` with Mongo-friendly types
 */
class ChapterSchemaFactory {
  /** MongoDB Schema */
  schema = {
    /** Chapter numeric ID - unique */
    chapterId: { type: Number, required: true, unique: true },
    /** Parent novel id (numeric, optional) */
    novelId: { type: Number, required: false },
   
    /** Chapter number (order) */
    chapterNumber: { type: Number, required: true, default: 0 },
    /** Chapter title */
    chapterTitle: { type: String, required: true },

    /** Content (markdown or HTML) */
    content: { type: String, required: false },

    /** Engagement counters */
    watchedCount: { type: Number, required: true, default: 0 },
    commentCount: { type: Number, required: true, default: 0 },
    /** Upvote count - required */
    upvoteCount: { type: Number, default: 0, required: true },
    /** Downvote count - required */
    downvoteCount: { type: Number, default: 0, required: true },

    /** System timestamps */
    createDateTime: { type: Number, required: true },
    editDateTime: { type: Number, required: true },
  }

  /** MongoDB collection name */
  collectionName = 'chapter'
  /** Mongoose Schema instance */
  schemaInstance = new Schema(this.schema)
}

export const ChapterSchema = new ChapterSchemaFactory()

/**
 * Removed chapter collection, keeps operator audit fields
 */
class RemovedChapterSchemaFactory {
  /** MongoDB Schema */
  schema = {
    ...ChapterSchema.schema,
    /** Operator UUID - required */
    _operatorUUID_: { type: String, required: true },
    /** Operator UID - required */
    _operatorUid_: { type: Number, required: true },
  }
  /** MongoDB collection name */
  collectionName = 'removed-chapter'
  /** Mongoose Schema instance */
  schemaInstance = new Schema(this.schema)
}

export const RemovedChapterSchema = new RemovedChapterSchemaFactory() 