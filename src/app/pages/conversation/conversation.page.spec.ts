import { savedContentLabel, savedContentLink } from 'src/app/services/saved-content.service';
import { pageInfo } from 'src/app/models/PageInfo';
import { conversationElement, conversationGuest } from './conversation.page';

describe('Coffee Conversation page (8.12.0)', () => {
  it('belongs to its element, when the category is one', () => {
    expect(conversationElement({ category: 'Water' } as any)).toBe('water');
    expect(conversationElement({ category: ' spirit ' } as any)).toBe('spirit');
    expect(conversationElement({ category: 'Home' } as any)).toBeNull();
    expect(conversationElement(null)).toBeNull();
  });

  it('names the guest, unless there is none ("NA")', () => {
    expect(conversationGuest({ intervieweeName: 'Shiv' } as any)).toBe('Shiv');
    expect(conversationGuest({ intervieweeName: 'na' } as any)).toBeNull();
    expect(conversationGuest({ intervieweeName: '' } as any)).toBeNull();
  });

  it('a saved conversation opens its own page, with a "Conversation" badge', () => {
    expect(savedContentLink({ contentType: 'conversation', contentId: 'cc1' })).toBe('/conversation/cc1');
    expect(savedContentLink({ contentType: 'blog', contentId: 'rain' })).toBe('/element/earth/blog/rain');
    expect(savedContentLink({ contentType: 'video', contentId: 'abc' })).toBe('/element/earth/video/abc');
    expect(savedContentLabel({ contentType: 'conversation' })).toBe('Conversation');
    expect(savedContentLabel({ contentType: 'blog' })).toBe('Blog');
  });

  it('is its own page group in Google Analytics, waiting for the topic', () => {
    const info = pageInfo('/conversation/cc1');
    expect(info.group).toBe('conversation');
    expect(info.waitsForContent).toBeTrue();
  });
});
