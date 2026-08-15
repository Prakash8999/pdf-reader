export function generateCitation(
  format: 'APA' | 'MLA' | 'Chicago',
  metadata: { title: string; author: string; year?: string; publisher?: string },
  highlightText: string,
  pageNumber?: number
): string {
  const author = metadata.author || 'Unknown Author';
  const title = metadata.title || 'Unknown Title';
  const year = metadata.year || new Date().getFullYear().toString();
  const publisher = metadata.publisher || 'Unknown Publisher';
  const pageStr = pageNumber ? `p. ${pageNumber}` : '';

  let citation = '';

  switch (format) {
    case 'APA':
      // APA Format: Author, A. A. (Year). Title of work. Publisher.
      citation = `${author}. (${year}). *${title}*. ${publisher}.`;
      if (pageStr) citation += ` (${pageStr}).`;
      break;
    case 'MLA':
      // MLA Format: Author. Title. Publisher, Year.
      citation = `${author}. *${title}*. ${publisher}, ${year}.`;
      break;
    case 'Chicago':
      // Chicago Format: Author. Title. Publisher, Year.
      citation = `${author}. *${title}*. ${publisher}, ${year}.`;
      break;
  }

  return `"${highlightText}"\n\n- ${citation}`;
}
