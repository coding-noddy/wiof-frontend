/**
 * The HTML an ngx-quill editor saves into its form control (use as the
 * editor's `[valueGetter]`).
 *
 * ngx-quill builds it with Quill 2's `getSemanticHTML()`, which in Quill
 * 2.0.x writes every space between words as `&nbsp;`. Saved like that, text
 * shown outside the editor (news, coffee conversations, blog HTML) can't wrap
 * at spaces. This turns each lone `&nbsp;` back into a normal space and keeps
 * runs of two or more, which are deliberate extra spaces. An empty editor
 * saves null, as ngx-quill's own getter does.
 */
export function quillSemanticHtml(quill: { getSemanticHTML(): string }): string | null {
  const html = quill.getSemanticHTML();
  if (['<p></p>', '<div></div>', '<p><br></p>', '<div><br></div>'].includes(html)) {
    return null;
  }
  // No lookbehind in the regex: Safari only supports it from 16.4.
  return html.replace(/(?:&nbsp;)+/g, (run) => (run.length === '&nbsp;'.length ? ' ' : run));
}
