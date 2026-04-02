import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { payslipAPI } from '../services/api';
import { canRunPayroll } from '../utils/permissions';

const PayslipDetail = ({ user }) => {
  const { payslipId } = useParams();
  const [payslip, setPayslip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  useEffect(() => {
    const loadPayslip = async () => {
      try {
        const response = await payslipAPI.get(payslipId);
        setPayslip(response.data);
      } catch (err) {
        setError('Unable to load the payslip preview.');
      } finally {
        setLoading(false);
      }
    };

    loadPayslip();
  }, [payslipId]);

  const formatCurrency = (value) => Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatMonth = (value) => {
    const [year, month] = (value || '').split('-');
    if (!year || !month) return value;
    return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const formatDateTime = (value) => {
    if (!value) return 'Pending';
    return new Date(value).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const response = await payslipAPI.download(payslipId);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip-${payslip.employee_name}-${payslip.month}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError('Unable to download the payslip PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleStatusChange = async (action) => {
    try {
      setStatusUpdating(true);
      setError(null);
      const response = action === 'approve'
        ? await payslipAPI.approve(payslipId)
        : await payslipAPI.issue(payslipId);
      setPayslip(response.data);
    } catch (statusError) {
      setError(statusError.response?.data?.error || 'Unable to update payslip status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const statusClass = `status-badge status-${payslip?.status || 'draft'}`;

  if (loading) return <div className="loading">Loading payslip preview...</div>;

  if (error || !payslip) {
    return (
      <div className="alert alert-error">
        <div>
          <strong>Payslip preview unavailable.</strong>
          <p>{error || 'The requested payslip could not be found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payslip-detail-page">
      <section className="page-intro no-print">
        <span className="eyebrow">Payslip preview</span>
        <h2>Professional payroll document</h2>
        <p>Review the salary breakdown, validate the document, and print when ready.</p>
      </section>

      <div className="payslip-actions no-print">
        {canRunPayroll(user) && <Link to="/generate-payslip" className="btn btn-secondary">Generate Another</Link>}
        <button type="button" className="btn btn-secondary" onClick={handleDownload} disabled={downloading}>
          {downloading ? 'Preparing PDF...' : 'Download PDF'}
        </button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>Print Payslip</button>
      </div>

      <div className="payslip-status-row no-print">
        <span className={statusClass}>{payslip.status_label || payslip.status}</span>
        {canRunPayroll(user) && payslip.status === 'draft' && (
          <button type="button" className="btn btn-secondary" onClick={() => handleStatusChange('approve')} disabled={statusUpdating}>
            {statusUpdating ? 'Updating...' : 'Approve Payslip'}
          </button>
        )}
        {canRunPayroll(user) && payslip.status === 'approved' && (
          <button type="button" className="btn btn-primary" onClick={() => handleStatusChange('issue')} disabled={statusUpdating}>
            {statusUpdating ? 'Updating...' : 'Issue Payslip'}
          </button>
        )}
      </div>

      <article className="payslip-document">
        <header className="payslip-header">
          <div>
            <span className="eyebrow">Issued payslip</span>
            <h3>Payslip Management System</h3>
            <p className="document-subtitle">Payroll statement for {formatMonth(payslip.month)}</p>
          </div>
          <div className="document-meta">
            <div>
              <span>Document ID</span>
              <strong>PS-{String(payslip.id).padStart(5, '0')}</strong>
            </div>
            <div>
              <span>Generated on</span>
              <strong>{formatDate(payslip.generated_at)}</strong>
            </div>
          </div>
        </header>

        <section className="document-section">
          <div className="detail-grid">
            <div className="detail-card">
              <span>Employee name</span>
              <strong>{payslip.employee_name}</strong>
            </div>
            <div className="detail-card">
              <span>Pay period</span>
              <strong>{formatMonth(payslip.month)}</strong>
            </div>
            <div className="detail-card">
              <span>Gross structure</span>
              <strong>₹{formatCurrency(
                Number(payslip.basic_salary) +
                Number(payslip.hra) +
                Number(payslip.conveyance) +
                Number(payslip.medical) +
                Number(payslip.lta)
              )}</strong>
            </div>
            <div className="detail-card">
              <span>Net payable</span>
              <strong>₹{formatCurrency(payslip.net_salary)}</strong>
            </div>
          </div>
        </section>

        <section className="document-section">
          <div className="audit-grid">
            <div className="detail-card">
              <span>Approval status</span>
              <strong>{payslip.status_label || payslip.status}</strong>
            </div>
            <div className="detail-card">
              <span>Approved by</span>
              <strong>{payslip.approved_by_name || 'Pending'}</strong>
            </div>
            <div className="detail-card">
              <span>Approved at</span>
              <strong>{formatDateTime(payslip.approved_at)}</strong>
            </div>
            <div className="detail-card">
              <span>Issued by</span>
              <strong>{payslip.issued_by_name || 'Pending'}</strong>
            </div>
            <div className="detail-card">
              <span>Issued at</span>
              <strong>{formatDateTime(payslip.issued_at)}</strong>
            </div>
          </div>
        </section>

        <section className="document-section no-print">
          <div className="section-head section-head-stack">
            <div>
              <span className="eyebrow">Activity log</span>
              <h3>Payroll event history</h3>
            </div>
            <p className="section-note">Every material action taken on this payslip is recorded below.</p>
          </div>
          <div className="stack-list">
            {(payslip.activities || []).length === 0 ? (
              <p className="section-note">No activity events recorded yet.</p>
            ) : payslip.activities.map((activity) => (
              <div key={activity.id} className="stack-item stack-item-detail">
                <div>
                  <strong>{activity.action_label}</strong>
                  <span>{activity.message}</span>
                </div>
                <div className="payslip-summary">
                  <span>{activity.actor_name}</span>
                  <span>{formatDateTime(activity.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="document-section">
          <div className="document-table">
            <div className="document-table-head">
              <span>Earnings</span>
              <span>Amount (₹)</span>
            </div>
            <div className="document-row">
              <span>Basic Salary</span>
              <strong>{formatCurrency(payslip.basic_salary)}</strong>
            </div>
            <div className="document-row">
              <span>House Rent Allowance</span>
              <strong>{formatCurrency(payslip.hra)}</strong>
            </div>
            <div className="document-row">
              <span>Conveyance</span>
              <strong>{formatCurrency(payslip.conveyance)}</strong>
            </div>
            <div className="document-row">
              <span>Medical</span>
              <strong>{formatCurrency(payslip.medical)}</strong>
            </div>
            <div className="document-row">
              <span>LTA</span>
              <strong>{formatCurrency(payslip.lta)}</strong>
            </div>
          </div>

          <div className="document-table">
            <div className="document-table-head">
              <span>Deductions</span>
              <span>Amount (₹)</span>
            </div>
            <div className="document-row">
              <span>Total deductions</span>
              <strong>{formatCurrency(payslip.deductions)}</strong>
            </div>
            <div className="document-row document-row-total">
              <span>Net salary</span>
              <strong>{formatCurrency(payslip.net_salary)}</strong>
            </div>
          </div>
        </section>

        <footer className="document-footer">
          <p>This is a system-generated payroll document intended for internal company use.</p>
          <p>No signature is required for digitally issued copies.</p>
        </footer>
      </article>
    </div>
  );
};

export default PayslipDetail;
