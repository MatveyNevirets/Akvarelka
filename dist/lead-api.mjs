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

function submitMockLead(payload) {
  const complete = Boolean(
    payload?.parentName?.trim() &&
    Number.isInteger(payload?.childAge) &&
    payload.childAge >= 1 && payload.childAge <= 18 &&
    /^\+7\d{10}$/.test(payload?.phone ?? '') &&
    payload?.direction
  );
  if (!complete) throw new LeadSubmissionError('Mock lead API received incomplete data');
  return Promise.resolve({success:true, id:`mock-${Date.now()}`, mock:true});
}

export async function submitLead(payload, options = {}) {
  const endpoint = options.endpoint ?? getLeadEndpoint();
  const fetchImpl = options.fetchImpl ?? window.fetch?.bind(window);
  if (!endpoint) return submitMockLead(payload);
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
