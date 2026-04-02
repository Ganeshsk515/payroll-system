import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { employeeAPI, extractCollection, payslipAPI } from '../services/api';
import { canManageEmployees, canRunPayroll, isEmployeeUser } from '../utils/permissions';

const Dashboard = ({ user }) => {
  const [employees, setEmployees] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [summary, setSummary] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadDashboard = async () => {
      try {
        const requests = [
          employeeAPI.getAll({ page: 1, page_size: isEmployeeUser(user) ? 1 : 4, ordering: 'latest' }),
          payslipAPI.getAll({ page: 1, page_size: 5 }),
          payslipAPI.recentActivity({ limit: 6 }),
        ];

        if (!isEmployeeUser(user)) {
          requests.push(employeeAPI.summary());
        }

        const [employeeResponse, payslipResponse, activityResponse, summaryResponse] = await Promise.all(requests);
        setEmployees(extractCollection(employeeResponse.data).items);
        setPayslips(extractCollection(payslipResponse.data).items);
        setRecentActivities(activityResponse.data);
        setSummary(summaryResponse?.data || null);
      } catch (err) {
        setError('Unable to load dashboard data right now.');
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user]);

  const totalEmployees = Number(summary?.total_employees || employees.length);
  const totalPayroll = Number(summary?.total_payroll || employees.reduce((sum, employee) => sum + Number(employee.salary || 0), 0));
  const averageSalary = Number(summary?.average_salary || (totalEmployees ? totalPayroll / totalEmployees : 0));
  const departments = summary?.departments || [...new Set(employees.map((employee) => employee.department).filter(Boolean))];
  const latestEmployees = employees.slice(0, 4);
  const recentPayslips = payslips.slice(0, 5);

  const formatCurrency = (value) => Number(value || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });

  const formatDate = (value) => new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const employeeRecord = employees[0] || null;
  const latestPayslip = recentPayslips[0] || null;
  const statusLabel = (payslip) => payslip?.status_label || payslip?.status || 'Unknown';

  if (!user) {
    return (
      <div className="dashboard-page">
        <section className="hero-panel">
          <div className="hero-copy">
            <span className="eyebrow">Secure payroll workspace</span>
            <h2>Internal payroll and employee records, designed for controlled company access.</h2>
            <p>
              Sign in to review workforce records, manage payroll operations, and issue payslips
              inside a secure internal workflow.
            </p>
            <div className="hero-actions">
              <Link to="/login" className="btn btn-primary">Login to Continue</Link>
              <a href="/admin/" className="btn btn-ghost">Open Admin</a>
            </div>
          </div>
          <div className="hero-stats">
            <div className="stat-card">
              <span className="stat-label">Security</span>
              <strong>Role based</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Access</span>
              <strong>Authenticated</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Records</span>
              <strong>Employee scoped</strong>
            </div>
            <div className="stat-card stat-card-accent">
              <span className="stat-label">Payroll</span>
              <strong>Admin controlled</strong>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (loading) return <div className="loading">Loading dashboard...</div>;

  if (error) {
    return (
      <div className="alert alert-error">
        <div>
          <strong>Dashboard unavailable.</strong>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (isEmployeeUser(user)) {
    return (
      <div className="dashboard-page">
        <section className="hero-panel">
          <div className="hero-copy">
            <span className="eyebrow">Employee self-service</span>
            <h2>Review your profile information and payroll documents from one secure workspace.</h2>
            <p>
              This dashboard is tailored to your account, giving you quick access to your employee
              record and your most recent payslip history.
            </p>
            <div className="hero-actions">
              <Link to="/employees" className="btn btn-primary">Open My Profile</Link>
              {latestPayslip && <Link to={`/payslips/${latestPayslip.id}`} className="btn btn-ghost">View Latest Payslip</Link>}
            </div>
          </div>
          <div className="hero-stats">
            <div className="stat-card">
              <span className="stat-label">Role</span>
              <strong>{user.role}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Department</span>
              <strong>{employeeRecord?.department || 'Pending'}</strong>
            </div>
            <div className="stat-card">
              <span className="stat-label">Position</span>
              <strong>{employeeRecord?.position || 'Pending'}</strong>
            </div>
            <div className="stat-card stat-card-accent">
              <span className="stat-label">Monthly salary</span>
              <strong>₹{formatCurrency(employeeRecord?.salary || 0)}</strong>
            </div>
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="card">
            <div className="section-head section-head-stack">
              <div>
                <span className="eyebrow">My profile</span>
                <h3>Employment record summary</h3>
              </div>
              <p className="section-note">The information below is the record currently linked to your company account.</p>
            </div>
            {employeeRecord ? (
              <div className="stack-list">
                <div className="stack-item">
                  <div>
                    <strong>Full name</strong>
                    <span>{employeeRecord.name}</span>
                  </div>
                </div>
                <div className="stack-item">
                  <div>
                    <strong>Email address</strong>
                    <span>{employeeRecord.email}</span>
                  </div>
                </div>
                <div className="stack-item">
                  <div>
                    <strong>Department and role</strong>
                    <span>{employeeRecord.department} • {employeeRecord.position}</span>
                  </div>
                </div>
                <div className="stack-item">
                  <div>
                    <strong>Hire date</strong>
                    <span>{formatDate(employeeRecord.hire_date)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="section-note">Your user account is not yet linked to an employee profile.</p>
            )}
          </section>

          <section className="card">
            <div className="section-head section-head-stack">
              <div>
                <span className="eyebrow">My payslips</span>
                <h3>Recent payroll documents</h3>
              </div>
              <p className="section-note">Review the latest salary statements issued to your employee record.</p>
            </div>
            <div className="stack-list">
              {recentPayslips.length === 0 ? (
                <p className="section-note">No payslips have been issued to your profile yet.</p>
              ) : recentPayslips.map((payslip) => (
                <Link key={payslip.id} to={`/payslips/${payslip.id}`} className="stack-item">
                  <div>
                    <strong>{payslip.month}</strong>
                    <span>{payslip.employee_name} • {statusLabel(payslip)}</span>
                  </div>
                  <span>₹{formatCurrency(payslip.net_salary)}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Executive overview</span>
          <h2>See workforce health, payroll scale, and recent payroll activity at a glance.</h2>
          <p>
            Built for real operations teams who need fast visibility into employee records,
            monthly payroll exposure, and issued payslips.
          </p>
          <div className="hero-actions">
            <Link to="/employees" className="btn btn-primary">View Workforce Directory</Link>
            {canRunPayroll(user)
              ? <Link to="/generate-payslip" className="btn btn-ghost">Run Payroll</Link>
              : <Link to="/login" className="btn btn-ghost">Open Secure Access</Link>}
          </div>
        </div>
        <div className="hero-stats">
          <div className="stat-card">
            <span className="stat-label">Headcount</span>
            <strong>{totalEmployees}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Departments</span>
            <strong>{departments.length}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Average salary</span>
            <strong>₹{formatCurrency(averageSalary)}</strong>
          </div>
          <div className="stat-card stat-card-accent">
            <span className="stat-label">Monthly payroll</span>
            <strong>₹{formatCurrency(totalPayroll)}</strong>
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="card">
          <div className="section-head section-head-stack">
            <div>
              <span className="eyebrow">Recent employees</span>
              <h3>Latest workforce additions</h3>
            </div>
            <p className="section-note">Track newly created employee records and move into their detailed profile when needed.</p>
          </div>
          <div className="stack-list">
            {latestEmployees.length === 0 ? (
              <p className="section-note">No employee records have been added yet.</p>
            ) : latestEmployees.map((employee) => (
              <Link key={employee.id} to={`/employees/${employee.id}`} className="stack-item">
                <div>
                  <strong>{employee.name}</strong>
                  <span>{employee.position} • {employee.department}</span>
                </div>
                <span>{formatDate(employee.hire_date)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="section-head section-head-stack">
            <div>
              <span className="eyebrow">Recent payroll output</span>
              <h3>Latest generated payslips</h3>
            </div>
            <p className="section-note">Review the latest payroll documents issued across the organization.</p>
          </div>
          <div className="stack-list">
            {recentPayslips.length === 0 ? (
              <p className="section-note">No payslips have been generated yet.</p>
            ) : recentPayslips.map((payslip) => (
              <Link key={payslip.id} to={`/payslips/${payslip.id}`} className="stack-item">
                <div>
                  <strong>{payslip.employee_name}</strong>
                  <span>{payslip.month} • {statusLabel(payslip)}</span>
                </div>
                <span>₹{formatCurrency(payslip.net_salary)}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <div className="dashboard-grid">
        <section className="card">
          <div className="section-head section-head-stack">
            <div>
              <span className="eyebrow">Activity stream</span>
              <h3>Recent payroll events</h3>
            </div>
            <p className="section-note">A running operational trail of payroll creation, approval, issuance, and download events.</p>
          </div>
          <div className="stack-list">
            {recentActivities.length === 0 ? (
              <p className="section-note">No payroll activity has been recorded yet.</p>
            ) : recentActivities.map((activity) => (
              <Link key={activity.id} to={`/payslips/${activity.payslip}`} className="stack-item stack-item-detail">
                <div>
                  <strong>{activity.action_label}</strong>
                  <span>{activity.message}</span>
                </div>
                <div className="payslip-summary">
                  <span>{activity.actor_name}</span>
                  <span>{formatDate(activity.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="section-head section-head-stack">
            <div>
              <span className="eyebrow">Department footprint</span>
              <h3>Current organization spread</h3>
            </div>
          </div>
          <div className="chip-grid">
            {departments.length === 0 ? (
              <p className="section-note">No departments available yet.</p>
            ) : departments.map((department) => (
              <span key={department} className="department-badge">{department}</span>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="section-head section-head-stack">
            <div>
              <span className="eyebrow">Quick actions</span>
              <h3>Common operational flows</h3>
            </div>
          </div>
          <div className="action-grid">
            {canManageEmployees(user) && (
              <Link to="/add-employee" className="action-tile">
                <strong>Onboard employee</strong>
                <span>Create a new workforce record and prepare the employee for payroll operations.</span>
              </Link>
            )}
            {canRunPayroll(user) && (
              <Link to="/generate-payslip" className="action-tile">
                <strong>Generate payslip</strong>
                <span>Run the current payroll cycle and issue the employee payslip for a target month.</span>
              </Link>
            )}
            <Link to="/employees" className="action-tile">
              <strong>Review directory</strong>
              <span>Inspect records, salaries, join dates, and employee-specific details.</span>
            </Link>
            {!canManageEmployees(user) && (
              <div className="action-tile action-tile-passive">
                <strong>Employee access</strong>
                <span>Your account is configured for secure viewing rather than administrative changes.</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
