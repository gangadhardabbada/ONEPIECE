export function shareToX(text: string, url?: string) {
  const intentUrl = new URL('https://twitter.com/intent/tweet');
  intentUrl.searchParams.set('text', text);
  if (url) {
    intentUrl.searchParams.set('url', url);
  }
  window.open(intentUrl.toString(), '_blank', 'noopener,noreferrer');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Clean up object URL after a short delay to ensure download starts
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
