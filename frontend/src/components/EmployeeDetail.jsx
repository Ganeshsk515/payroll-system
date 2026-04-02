import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { employeeAPI, extractCollection, payslipAPI } from '../services/api';
import { canManageEmployees, canRunPayroll, canViewEmployeeProfile } from '../utils/permissions';

const EmployeeDetail = ({ user }) => {
  const { employeeId } = useParams();
  const [employee, setEmployee] = useState(null);
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadEmployee = async () => {
      try {
        const [employeeResponse, payslipResponse] = await Promise.all([
          employeeAPI.get(employeeId),
          payslipAPI.getAll({ employee_id: employeeId, page_size: 6 }),
        ]);

        setEmployee(employeeResponse.data);
        setPayslips(extractCollection(payslipResponse.data).items);
      } catch (err) {
        setError('Unable to load employee details.');
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [employeeId]);

  const formatCurrency = (value) => Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });

  const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (loading) return <div className="loading">Loading employee profile...</div>;

  if (error || !employee) {
    return (
      <div className="alert alert-error">
        <div>
          <strong>Employee profile unavailable.</strong>
          <p>{error || 'The requested employee could not be found.'}</p>
        </div>
      </div>
    );
  }

  if (user && !canViewEmployeeProfile(user, employeeId)) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="employee-detail-page">
      <section className="page-intro">
        <span className="eyebrow">Employee profile</span>
        <h2>{employee.name}</h2>
        <p>Review core employee information and the latest generated payroll documents for this record.</p>
      </section>

      <div className="workspace-grid">
        <aside className="card info-panel">
          <span className="eyebrow">Core information</span>
          <h3>Record summary</h3>
          <ul className="info-list">
            <li><strong>Email:</strong> {employee.email}</li>
            <li><strong>Department:</strong> {employee.department}</li>
            <li><strong>Position:</strong> {employee.position}</li>
            <li><strong>Hire date:</strong> {formatDate(employee.hire_date)}</li>
            <li><strong>Monthly salary:</strong> ₹{formatCurrency(employee.salary)}</li>
          </ul>
          <div className="info-actions">
            {canManageEmployees(user) && (
              <Link to={`/employees/${employee.id}/edit`} className="btn btn-secondary">Edit Profile</Link>
            )}
            {canRunPayroll(user) && <Link to="/generate-payslip" className="btn btn-primary">Generate Payslip</Link>}
          </div>
        </aside>

        <section className="card">
          <div className="section-head section-head-stack">
            <div>
              <span className="eyebrow">Payroll history</span>
              <h3>Generated payslips</h3>
            </div>
            <p className="section-note">Historical payroll outputs generated for this employee record.</p>
          </div>

          {payslips.length === 0 ? (
            <div className="empty-state">
              <h3>No payslips generated</h3>
              <p>This employee does not have any payroll documents yet.</p>
              {canRunPayroll(user) && <Link to="/generate-payslip" className="btn btn-primary">Generate First Payslip</Link>}
            </div>
          ) : (
            <div className="stack-list">
              {payslips.map((payslip) => (
                <div key={payslip.id} className="stack-item stack-item-detail">
                  <div>
                    <strong>{payslip.month}</strong>
                    <span>Generated {formatDate(payslip.generated_at)} • {payslip.status_label || payslip.status}</span>
                  </div>
                  <div className="payslip-summary">
                    <span>Basic ₹{formatCurrency(payslip.basic_salary)}</span>
                    <span>Net ₹{formatCurrency(payslip.net_salary)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default EmployeeDetail;
