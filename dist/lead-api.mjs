export class LeadSubmissionError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'LeadSubmissionError';
  }
}

export function getLeadEndpoint() {
  return [...document.querySelectorAll('meta[name="lead-endpoint"]')]
    .map(meta=>meta.content.trim())
    .find(Boolean) || '';
}

export async function submitLead(payload, options = {}) {
  const endpoint = options.endpoint ?? getLeadEndpoint();
  const fetchImpl = options.fetchImpl ?? window.fetch?.bind(window);
  if (!endpoint) throw new LeadSubmissionError('Lead API endpoint is not configured');
  if (!fetchImpl) throw new LeadSubmissionError('Fetch API is unavailable');
  const response = await fetchImpl(endpoint, {
    method: 'POST',
    headers: {'Content-Type':'application/json','Accept':'application/json'},
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new LeadSubmissionError('Lead API request failed: ' + response.status);
  let result;
  try { result = await response.json(); }
  catch (error) { throw new LeadSubmissionError('Lead API returned invalid JSON', {cause:error}); }
  if (result?.success !== true) throw new LeadSubmissionError('Lead API did not confirm success');
  return result;
}
