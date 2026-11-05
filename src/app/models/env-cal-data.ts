import { Observable } from 'rxjs';
import { RelatedRef } from './RelatedContent';

export class EnvDay {
  id: string;
  month: number;
  day: string;
  occasion: string;
  imageName: string;
  image: Observable<String>;
  description: string;
  showMoreLink: string;
  category: string;
  // Explore next links (see RelatedContent.ts).
  relatedContent?: RelatedRef[];
  relatedKeys?: string[];
  // "Today on WIOF" fact (8.8.0): one short fact, its source once reviewed,
  // and whether an admin has checked it ('draft' until then).
  fact?: string | null;
  factSource?: string | null;
  factStatus?: 'draft' | 'reviewed' | null;

  constructor(id, day, month, occasion, imageName, description, showMoreLink) {
    this.id = id;
    this.day = day;
    this.month = month;
    this.occasion = occasion;
    this.imageName = imageName;
    this.description = description;
    this.showMoreLink = showMoreLink;
  }
}
