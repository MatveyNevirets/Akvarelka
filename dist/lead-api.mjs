export class LeadSubmissionError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'LeadSubmissionError';
  }
}

export function getLeadEndpoint() {
  // Confirmation is handled locally.
  return '';
}

function confirmLead(payload) {
  const complete = Boolean(
    payload?.parentName?.trim() &&
    Number.isInteger(payload?.childAge) &&
    payload.childAge >= 1 && payload.childAge <= 18 &&
    /^\+7\d{10}$/.test(payload?.phone ?? '') &&
    payload?.direction && payload?.personalDataConsent === true
  );
  if (!complete) throw new LeadSubmissionError('Lead confirmation received incomplete data');
  return Promise.resolve({success:true, id:`local-${Date.now()}`, local:true});
}

export async function submitLead(payload) {
  // Validate and confirm in memory only: no network requests or persistence.
  return confirmLead(payload);
}
