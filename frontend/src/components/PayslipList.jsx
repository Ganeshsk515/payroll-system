import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { extractCollection, payslipAPI } from '../services/api';
import { isAdminUser } from '../utils/permissions';

const PAGE_SIZE = 8;

const PayslipList = ({ user }) => {
  const [payslips, setPayslips] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPayslips, setSelectedPayslips] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  const isAdmin = isAdminUser(user);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    loadPayslips(page, appliedSearch, statusFilter, monthFilter);
  }, [page, appliedSearch, statusFilter, monthFilter]);

  const loadPayslips = async (
    nextPage = page,
    nextSearch = appliedSearch,
    nextStatus = statusFilter,
    nextMonth = monthFilter,
  ) => {
    try {
      setLoading(true);
      const response = await payslipAPI.getAll({
        page: nextPage,
        page_size: PAGE_SIZE,
        search: nextSearch,
        status: nextStatus,
        month: nextMonth,
      });
      const collection = extractCollection(response.data);
      setPayslips(collection.items);
      setTotalCount(collection.count);
      setSelectedPayslips([]);
      setError(null);
    } catch (requestError) {
      setError('Unable to load the payroll register right now.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });

  const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const allVisibleSelected = payslips.length > 0 && payslips.every((payslip) => selectedPayslips.includes(payslip.id));

  const togglePayslipSelection = (payslipId) => {
    setSelectedPayslips((currentSelection) => (
      currentSelection.includes(payslipId)
        ? currentSelection.filter((id) => id !== payslipId)
        : [...currentSelection, payslipId]
    ));
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedPayslips([]);
      return;
    }
    setSelectedPayslips(payslips.map((payslip) => payslip.id));
  };

  const handleBulkAction = async (operation) => {
    if (selectedPayslips.length === 0) {
      setError('Select one or more payslips before running a bulk action.');
      return;
    }

    try {
      setBulkLoading(true);
      setError(null);
      setSuccess('');
      const response = await payslipAPI.bulkUpdate({
        operation,
        payslip_ids: selectedPayslips,
      });

      const updatedIds = new Set(response.data.processed_ids || []);
      const updatedMap = new Map((response.data.updated_payslips || []).map((payslip) => [payslip.id, payslip]));
      setPayslips((currentPayslips) => currentPayslips.map((payslip) => updatedIds.has(payslip.id) ? updatedMap.get(payslip.id) : payslip));
      setSelectedPayslips([]);

      const processedCount = response.data.processed_ids?.length || 0;
      const skippedCount = response.data.skipped?.length || 0;
      const actionLabel = operation === 'approve' ? 'approved' : 'issued';
      setSuccess(`Bulk update complete: ${processedCount} payslip(s) ${actionLabel}${skippedCount ? `, ${skippedCount} skipped.` : '.'}`);
      if (skippedCount && processedCount === 0) {
        setError(response.data.skipped[0]?.reason || 'The selected payslips could not be updated.');
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Bulk payroll action failed.');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setError(null);
      const response = await payslipAPI.exportRegister({
        search: appliedSearch,
        status: statusFilter,
        month: monthFilter,
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'payroll-register.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSuccess('Payroll register exported successfully.');
    } catch (requestError) {
      setError('Unable to export the payroll register right now.');
    }
  };

  if (loading) return <div className="loading">Loading payroll register...</div>;

  if (error && payslips.length === 0) {
    return (
      <div className="alert alert-error">
        <div>
          <strong>Payroll register unavailable.</strong>
          <p>{error}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => loadPayslips()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="payslip-list-page">
      <section className="page-intro">
        <span className="eyebrow">Payroll register</span>
        <h2>{isAdmin ? 'Review, filter, and monitor issued payroll records' : 'Review your payroll history'}</h2>
        <p>
          A searchable register for payroll teams and employees, built to scan statuses, months,
          and payment outcomes without opening every document individually.
        </p>
      </section>

      <div className="card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Payslip records</span>
            <h3>Operational payroll ledger</h3>
            <p className="section-note section-note-wide">
              Filter by employee, month, or workflow stage to reach the right document faster.
            </p>
          </div>
          <div className="toolbar-actions">
            {isAdmin && (
              <button type="button" className="btn btn-ghost" onClick={handleExport}>
                Export CSV
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => loadPayslips()}>
              Refresh
            </button>
          </div>
        </div>

        {success && (
          <div className="alert alert-success">
            <div>
              <strong>Payroll action completed.</strong>
              <p>{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <div>
              <strong>Payroll action needs attention.</strong>
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="filter-bar">
          <form
            className="filter-search"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setAppliedSearch(searchTerm.trim());
            }}
          >
            <input
              type="search"
              placeholder={isAdmin ? 'Search employee, email, or pay period' : 'Search by pay period'}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>

          <div className="filter-selects">
            <select
              value={statusFilter}
              onChange={(event) => {
                setPage(1);
                setStatusFilter(event.target.value);
              }}
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="issued">Issued</option>
            </select>
            <input
              type="month"
              value={monthFilter}
              onChange={(event) => {
                setPage(1);
                setMonthFilter(event.target.value);
              }}
            />
            {(appliedSearch || statusFilter || monthFilter) && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSearchTerm('');
                  setAppliedSearch('');
                  setStatusFilter('');
                  setMonthFilter('');
                  setPage(1);
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="directory-meta">
          <span>{totalCount} payslip records</span>
          <span>{isAdmin ? 'Company-wide register' : 'Employee-scoped register'}</span>
          <span>Showing {payslips.length} on this page</span>
        </div>

        {isAdmin && payslips.length > 0 && (
          <div className="bulk-toolbar">
            <label className="bulk-checkbox">
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} />
              <span>Select all on this page</span>
            </label>
            <div className="bulk-actions">
              <span>{selectedPayslips.length} selected</span>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={bulkLoading || selectedPayslips.length === 0}
                onClick={() => handleBulkAction('approve')}
              >
                {bulkLoading ? 'Updating...' : 'Bulk Approve'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={bulkLoading || selectedPayslips.length === 0}
                onClick={() => handleBulkAction('issue')}
              >
                {bulkLoading ? 'Updating...' : 'Bulk Issue'}
              </button>
            </div>
          </div>
        )}

        {payslips.length === 0 ? (
          <div className="empty-state">
            <h3>No payslips match this view</h3>
            <p>Try widening your filters or generate a new payslip to populate the register.</p>
          </div>
        ) : (
          <>
            <div className="directory-table directory-table-payslips">
              <div className={`directory-head directory-head-payslips ${isAdmin ? 'directory-head-payslips-admin' : ''}`}>
                {isAdmin && <span>Select</span>}
                <span>Document</span>
                <span>Employee</span>
                <span>Status</span>
                <span>Generated</span>
                <span>Net salary</span>
              </div>
              {payslips.map((payslip) => (
                <div
                  key={payslip.id}
                  className={`directory-row directory-row-payslips ${isAdmin ? 'directory-row-payslips-admin' : ''}`}
                >
                  {isAdmin && (
                    <label className="row-checkbox" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedPayslips.includes(payslip.id)}
                        onChange={() => togglePayslipSelection(payslip.id)}
                      />
                    </label>
                  )}
                  <Link to={`/payslips/${payslip.id}`} className="directory-row-link directory-row-main">
                    <div className="directory-primary">
                      <div>
                        <span className="employee-subtle">Payslip</span>
                        <h3>{payslip.month}</h3>
                        <p>Document ID PS-{String(payslip.id).padStart(5, '0')}</p>
                      </div>
                    </div>
                  </Link>
                  <Link to={`/payslips/${payslip.id}`} className="directory-row-link directory-row-cell">
                    <span>{payslip.employee_name}</span>
                  </Link>
                  <Link to={`/payslips/${payslip.id}`} className="directory-row-link directory-row-cell">
                    <span className={`status-badge status-${payslip.status}`}>{payslip.status_label || payslip.status}</span>
                  </Link>
                  <Link to={`/payslips/${payslip.id}`} className="directory-row-link directory-row-cell">
                    <span>{formatDate(payslip.generated_at)}</span>
                  </Link>
                  <Link to={`/payslips/${payslip.id}`} className="directory-row-link directory-row-cell">
                    <span className="salary-figure">₹{formatCurrency(payslip.net_salary)}</span>
                  </Link>
                </div>
              ))}
            </div>

            <div className="pagination-bar">
              <span>Page {page} of {totalPages}</span>
              <div className="pagination-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PayslipList;
