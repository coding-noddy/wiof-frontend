import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats a SCREAMING_SNAKE_CASE enum value (e.g. ACTION_DIFFICULTY,
 * EVIDENCE_LEVEL) for display: 'VERY_EASY' -> 'Very Easy'. Angular's
 * built-in `titlecase` pipe only capitalizes at whitespace, so it leaves
 * the underscore in place ('VERY_EASY' -> 'Very_easy') — this is the fix
 * for that, not a cosmetic duplicate of titlecase.
 */
@Pipe({ name: 'enumLabel' })
export class EnumLabelPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    return value
      .split('_')
      .map((word) => (word.toLowerCase() === 'wiof' ? 'WIOF' : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()))
      .join(' ');
  }
}
