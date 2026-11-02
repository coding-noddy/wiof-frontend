import { quillSemanticHtml } from './quill-html.util';

const quillReturning = (html: string) => ({ getSemanticHTML: () => html });

describe('quillSemanticHtml', () => {
  it('turns the &nbsp; Quill 2 writes between words back into normal spaces', () => {
    const html = '<p>Hello&nbsp;world&nbsp;from&nbsp;Quill.</p><ul><li>First&nbsp;item</li></ul>';
    expect(quillSemanticHtml(quillReturning(html))).toBe('<p>Hello world from Quill.</p><ul><li>First item</li></ul>');
  });

  it('keeps runs of two or more &nbsp; (deliberate extra spaces)', () => {
    expect(quillSemanticHtml(quillReturning('<p>a&nbsp;&nbsp;&nbsp;b&nbsp;c</p>'))).toBe('<p>a&nbsp;&nbsp;&nbsp;b c</p>');
  });

  it('leaves HTML without &nbsp; unchanged', () => {
    expect(quillSemanticHtml(quillReturning('<p>Plain <strong>text</strong></p>'))).toBe('<p>Plain <strong>text</strong></p>');
  });

  it('returns null for an empty editor', () => {
    expect(quillSemanticHtml(quillReturning('<p></p>'))).toBeNull();
    expect(quillSemanticHtml(quillReturning('<p><br></p>'))).toBeNull();
  });
});
