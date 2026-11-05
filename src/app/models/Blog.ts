import { Observable } from 'rxjs';
import { RelatedRef } from './RelatedContent';

export class Blog {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  content: string;
  contentDelta?: any;
  imageName: string;
  image$: Observable<string>;
  externalUrl: string;
  author: string;
  aboutAuthor: string;
  category: string;
  subCategory: string;
  timeToRead: number;
  submitDate: Date;
  publishDate: Date;
  // Explore next links (see RelatedContent.ts).
  relatedContent?: RelatedRef[];
  relatedKeys?: string[];

  constructor(
    id: string,
    title: string,
    authorName: string,
    aboutAuthor: string,
    category: string,
    subCategory: string,
    imageName: string,
    shortDescription: string,
    content: string
  ) {
    this.id = id;
    this.title = title;
    this.slug = Blog.generateSlug(title);
    this.author = authorName;
    this.aboutAuthor = aboutAuthor;
    this.category = category;
    this.subCategory = subCategory;
    this.imageName = imageName;
    this.shortDescription = shortDescription;
    this.content = content;
    this.contentDelta = null;
  }

  /**
   * A stored blog date (submitDate/publishDate) as epoch millis, or null.
   * The editor stores epoch millis, but tolerate a Date/Firestore Timestamp/
   * date string in hand-edited or imported docs.
   */
  static toMillis(raw: unknown): number | null {
    if (raw === null || raw === undefined || raw === '') return null;
    if (typeof raw === 'number') return raw;
    if (typeof (raw as any).toDate === 'function') return (raw as any).toDate().getTime();
    const ms = new Date(raw as any).getTime();
    return isNaN(ms) ? null : ms;
  }

  /** The date a blog is listed under: publishDate, else submitDate, else 0 (sorts last). */
  static sortDate(blog: Pick<Blog, 'publishDate' | 'submitDate'>): number {
    return Blog.toMillis(blog.publishDate) ?? Blog.toMillis(blog.submitDate) ?? 0;
  }

  /**
   * Generate a URL-friendly slug from a title
   */
  static generateSlug(title: string): string {
    if (!title) return '';
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 80);
  }
}
