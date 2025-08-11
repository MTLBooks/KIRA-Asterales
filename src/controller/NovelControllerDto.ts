import { NovelTag } from './NovelTagControllerDto.js'
import { NovelGenre } from './NovelGenreControllerDto.js'

/** Upload novel request */
export type UploadNovelRequestDto = {
  /** Title */
  title: string
  /** Slug (unique) */
  slug: string
  /** Cover image url */
  image: string
  /** Uploader UID */
  uploaderId: number
  /** Estimated reading time in ms */
  duration: number
  /** Description */
  description?: string
  /** Copyright */
  copyright: string
  /** Original author */
  originalAuthor?: string
  /** Original link */
  originalLink?: string
  /** Push to feed */
  pushToFeed: boolean
  /** Declare as original */
  ensureOriginal: boolean
  /** Tag list */
  novelTagList: NovelTag[]
  /** Genre list */
  novelGenreList: NovelGenre[]
}

/** Upload novel response */
export type UploadNovelResponseDto = {
  success: boolean
  message?: string
  novelId?: number
}

/** Thumb novel response (similar to ThumbVideo) */
export type ThumbNovelResponseDto = {
  success: boolean
  message?: string
  novelsCount: number
  novels: {
    novelId: number
    title: string
    image?: string
    uploadDate?: number
    watchedCount?: number
    uploader?: string
    uploaderNickname?: string
    uploaderId?: number
    duration?: number
    description?: string
    isBlockedByOther?: boolean
  }[]
}

export type GetNovelByIdRequestDto = { novelId: number }

export type GetNovelByIdResponseDto = {
  success: boolean
  message?: string
  novel?: {
    novelId: number
    title: string
    image?: string
    uploadDate?: number
    watchedCount?: number
    uploader?: string
    uploaderUUID?: string
    uploaderId?: number
    duration?: number
    description?: string
    copyright: string
    novelTagList: NovelTag[]
    novelGenreList: NovelGenre[]
  }
} & { isBlockedByOther: boolean, isBlocked: boolean, isHidden: boolean }

/**
 * Request payload to get novels uploaded by a UID
 */
export type GetNovelByUidRequestDto = {
  /** Uploader UID */
  uid: number;
}
export type GetNovelByUidResponseDto = ThumbNovelResponseDto & { isBlockedByOther: boolean, isBlocked: boolean, isHidden: boolean }

/**
 * Keywords search request
 */
export type SearchNovelByKeywordRequestDto = {
  /** Search keyword */
  keyword: string;
}
export type SearchNovelByKeywordResponseDto = ThumbNovelResponseDto

/**
 * Request payload to search novels by TAG ID list
 */
export type SearchNovelByTagIdRequestDto = {
  /** Novel TAG IDs */
  tagId: NovelTag['tagId'][];
}
export type SearchNovelByTagIdResponseDto = ThumbNovelResponseDto

/**
 * Request to delete a novel by ID
 */
export type DeleteNovelRequestDto = {
  /** Novel ID */
  novelId: number;
}

/** Delete novel response */
export type DeleteNovelResponseDto = {
  /** Execution result */
  success: boolean;
  /** Extra message */
  message?: string;
}

/**
 * Response for pending-review novel list (admin)
 */
export type PendingReviewNovelResponseDto = ThumbNovelResponseDto;

/**
 * Request payload to approve a pending novel (admin)
 */
export type ApprovePendingReviewNovelRequestDto = {
  /** Novel ID */
  novelId: number;
}

/** Approve pending novel response */
export type ApprovePendingReviewNovelResponseDto = {
  /** Execution result */
  success: boolean;
  /** Extra message */
  message?: string;
} 