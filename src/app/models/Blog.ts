import { Observable } from 'rxjs';

export class Blog {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  content: string;
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
