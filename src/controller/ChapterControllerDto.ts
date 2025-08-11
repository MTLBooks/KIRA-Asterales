/** Chapter DTOs */

/** Upload chapter request payload */
export type UploadChapterRequestDto = {
  /** Parent novel ID */
  novelId: number;
  /** Chapter order number (starting from 1) */
  chapterNumber: number;
  /** Chapter title */
  chapterTitle: string;
  /** Chapter raw content (markdown / html) */
  content: string;
  /** Uploader UID */
  uploaderId: number;
}

/** Upload chapter response */
export type UploadChapterResponseDto = { success: boolean; message?: string; chapterId?: number };

/** Request to fetch a single chapter */
export type GetChapterByIdRequestDto = { chapterId: number };

/** Get chapter response */
export type GetChapterByIdResponseDto = {
  success: boolean;
  message?: string;
  chapter?: {
    /** Chapter numeric ID */
    chapterId: number;
    /** Parent novel ID */
    novelId?: number;
    /** Chapter number (order) */
    chapterNumber: number;
    /** Chapter title */
    chapterTitle: string;
    /** Chapter content */
    content?: string;
    /** View count */
    watchedCount?: number;
    /** Comment count */
    commentCount?: number;
    /** Upvote count */
    upvoteCount?: number;
    /** Downvote count */
    downvoteCount?: number;
    /** Create date timestamp */
    createDateTime?: number;
  };
};

/** Request payload to list all chapters of a novel */
export type GetChaptersByNovelIdRequestDto = { novelId: number };

/** List chapters response */
export type GetChaptersByNovelIdResponseDto = {
  success: boolean;
  message?: string;
  chapters: {
    /** Chapter numeric ID */
    chapterId: number;
    /** Chapter number */
    chapterNumber: number;
    /** Chapter title */
    chapterTitle: string;
  }[];
};

/** Delete chapter request */
export type DeleteChapterRequestDto = { chapterId: number };

/** Delete chapter response */
export type DeleteChapterResponseDto = { success: boolean; message?: string }; 