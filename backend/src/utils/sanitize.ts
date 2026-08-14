import sanitizeHtml from 'sanitize-html';

/**
 * sanitize-html strips tags/scripts but also HTML-entity-encodes the
 * remaining text (& < > -> &amp; &lt; &gt;), since it assumes its output will
 * be re-embedded in HTML. Every caller here stores the result as plain text
 * and renders it through React JSX interpolation, which already escapes on
 * its own — without this, a title like "Degree & PG" is stored (and shown)
 * as "Degree &amp; PG". Order matters: decode &amp; last, so a literal
 * "&lt;" in the original text (itself escaped to "&amp;lt;") never gets
 * partially re-interpreted.
 */
function decodeEntities(input: string): string {
  return input.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

export function sanitizeText(input: string): string {
  return decodeEntities(
    sanitizeHtml(input, {
      allowedTags: [],
      allowedAttributes: {},
    }),
  ).trim();
}
