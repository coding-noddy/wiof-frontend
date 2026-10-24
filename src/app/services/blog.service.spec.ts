import { TestBed } from '@angular/core/testing';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { firstValueFrom, of } from 'rxjs';
import { BlogService } from './blog.service';
import { AdminWriteGuardService } from './admin-write-guard.service';

/** A minimal stand-in for a compat QuerySnapshot of the given docs. */
const snapshot = (docs: { id: string; data: any }[]) => ({
  empty: docs.length === 0,
  docs: docs.map((d) => ({ id: d.id, data: () => ({ ...d.data }) }))
});

describe('BlogService', () => {
  let service: BlogService;
  let collections: { [name: string]: any };
  let storage: jasmine.SpyObj<AngularFireStorage>;

  beforeEach(() => {
    collections = {};
    const firestore = {
      collection: (name: string) => ({ get: () => of(collections[name] || snapshot([])) })
    };
    storage = jasmine.createSpyObj('AngularFireStorage', ['ref']);
    storage.ref.and.callFake((path: string) => ({ getDownloadURL: () => of(`looked-up:${path}`) }) as any);

    TestBed.configureTestingModule({
      providers: [
        { provide: AngularFirestore, useValue: firestore },
        { provide: AngularFireStorage, useValue: storage },
        { provide: AdminWriteGuardService, useValue: {} }
      ]
    });
    service = TestBed.inject(BlogService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getBlogSummaries', () => {
    it('uses the stored cover URL, and looks one up only when a summary has none', async () => {
      collections['blog_summaries'] = snapshot([
        { id: 'a', data: { title: 'A', imageName: 'a.webp', imageUrl: 'https://stored/a', publishDate: 2 } },
        { id: 'b', data: { title: 'B', imageName: 'b.webp', imageUrl: null, publishDate: 1 } }
      ]);

      const blogs = await firstValueFrom(service.getBlogSummaries());

      expect(await firstValueFrom(blogs[0].image$)).toBe('https://stored/a');
      expect(await firstValueFrom(blogs[1].image$)).toBe('looked-up:/blog-images/b.webp');
      expect(storage.ref).toHaveBeenCalledTimes(1);
    });

    it('sorts newest first, by publishDate then submitDate', async () => {
      collections['blog_summaries'] = snapshot([
        { id: 'old', data: { publishDate: 100 } },
        { id: 'new', data: { publishDate: 300 } },
        { id: 'draft', data: { submitDate: 200 } }
      ]);

      const blogs = await firstValueFrom(service.getBlogSummaries());

      expect(blogs.map((b) => b.id)).toEqual(['new', 'draft', 'old']);
    });

    it('falls back to the full Blogs docs while blog_summaries is empty', async () => {
      collections['Blogs'] = snapshot([
        { id: 'full', data: { title: 'Full', content: 'one two three', imageName: 'f.webp' } }
      ]);

      const blogs = await firstValueFrom(service.getBlogSummaries());

      expect(blogs.map((b) => b.id)).toEqual(['full']);
      expect(blogs[0].timeToRead).toBe(1);
    });
  });
});
