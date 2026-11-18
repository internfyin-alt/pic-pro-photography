export async function photoRequest<T>(url: string, method = 'POST', body?: unknown): Promise<T> {
  const options: RequestInit = { method, cache: 'no-store' };
  if (body instanceof FormData) options.body = body;
  else if (body !== undefined) {
    options.headers = { 'Content-Type': 'application/json' };
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  const result = await response.json().catch(() => null);
  if (!response.ok) throw new Error(result?.error || 'Unable to complete this request.');
  return result as T;
}

export function photoMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

export function startDownload(url: string, name?: string) {
  const link = document.createElement('a');
  link.href = url;
  link.referrerPolicy = 'no-referrer';
  if (name) link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
