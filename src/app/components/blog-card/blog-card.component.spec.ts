import { BlogCardComponent } from './blog-card.component';

describe('BlogCardComponent', () => {
  const card = (element: string | undefined, blog: any) => {
    const c = new BlogCardComponent(null as any);
    c.element = element;
    c.blog = blog;
    return c;
  };

  it('links to the full post path when the element is known', () => {
    expect(card('earth', { id: 'id1', slug: 'my-story' }).link).toEqual(['/element', 'earth', 'blog', 'my-story']);
    expect(card('water', { id: 'id2' }).link).toEqual(['/element', 'water', 'blog', 'id2']);
  });

  it('keeps the relative link without an element', () => {
    expect(card(undefined, { id: 'id1', slug: 'my-story' }).link).toEqual(['blog', 'my-story']);
  });
});
