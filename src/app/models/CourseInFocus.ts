import { Observable } from 'rxjs';

export class CourseInFocus {
  id?: string;
  name: string;
  offeredBy: string;
  platform: string;
  duration: string;
  approxCost: string;
  keyTopics: string;
  description: string;
  image: string;
  image$: Observable<string> | null = null;
  link: string;
  creationDate?: Date;
  creationId?: string;
  updateDate?: Date;
  updateId?: string;
  category: string;
  status: string;
  submitDate: number;
  publishDate: number;
  unpublishDate: number;

  constructor(
    id: string,
    name: string,
    offeredBy: string,
    platform: string,
    duration: string,
    approxCost: string,
    keyTopics: string,
    link: string,
    description: string,
    category: string,
    image: string,
    status: string,
    submitDate: number
  ) {
    this.id = id;
    this.name = name;
    this.offeredBy = offeredBy;
    this.platform = platform;
    this.duration = duration;
    this.approxCost = approxCost;
    this.keyTopics = keyTopics;
    this.link = link;
    this.description = description;
    this.category = category;
    this.image = image;
    this.status = status;
    this.submitDate = submitDate;
  }
}
