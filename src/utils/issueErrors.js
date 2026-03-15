/**
 * Maps raw issue/return/renew service errors to user-friendly messages.
 */
export function friendlyIssueError(err) {
  const msg = (err?.message || '').toLowerCase();

  if (msg.includes('borrow limit exceeded'))
    return 'This member has reached their maximum borrow limit. They must return a book before borrowing another.';
  if (msg.includes('membership expired'))
    return 'This member\'s library membership has expired. Please renew their membership before issuing books.';
  if (msg.includes('book not available') || msg.includes('no copies available'))
    return 'No copies of this book are currently available for borrowing.';
  if (msg.includes('book not found'))
    return 'Book not found. Please check the barcode or code and try again.';
  if (msg.includes('member not found'))
    return 'Member not found. Please check the ID card or code and try again.';
  if (msg.includes('already returned'))
    return 'This book has already been returned.';
  if (msg.includes('cannot renew returned'))
    return 'Cannot renew a book that has already been returned.';
  if (msg.includes('renewal is not enabled'))
    return 'Book renewal is currently disabled. Contact your administrator.';
  if (msg.includes('issue not found'))
    return 'Lending record not found. It may have already been processed.';
  if (msg.includes('does not have this book issued'))
    return 'This member does not have that book checked out.';
  if (msg.includes('not currently issued'))
    return 'This book is not currently checked out to anyone.';

  // Fallback — clean up any "Error: " prefix from IPC
  const cleaned = (err?.message || 'An unexpected error occurred.').replace(/^Error:\s*/i, '');
  return cleaned;
}
