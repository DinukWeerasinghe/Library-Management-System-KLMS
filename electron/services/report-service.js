/**
 * Report Service – data for Reports UI.
 * Issued, Returned, Overdue, Member-wise. Gated by enable_reports in UI.
 */
const issueService = require('./issue-service');

function getIssuedReport() {
  return issueService.getAll({ status: 'ISSUED' });
}

function getReturnedReport() {
  return issueService.getAll({ status: 'RETURNED' });
}

function getOverdueReport() {
  return issueService.getOverdue();
}

function getMemberWiseReport(memberId) {
  if (!memberId) return issueService.getAll({});
  return issueService.getAll({ memberId });
}

/**
 * Get report data by type. For UI that checks enable_reports before calling.
 */
function getReport(type, memberId) {
  switch (type) {
    case 'issued':
      return getIssuedReport();
    case 'returned':
      return getReturnedReport();
    case 'overdue':
      return getOverdueReport();
    case 'member':
      return getMemberWiseReport(memberId);
    default:
      return [];
  }
}

module.exports = {
  getReport,
  getIssuedReport,
  getReturnedReport,
  getOverdueReport,
  getMemberWiseReport,
};
