import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { employeeAPI, extractCollection } from '../services/api';
import { canManageEmployees, canViewEmployeeProfile, isAdminUser } from '../utils/permissions';

const PAGE_SIZE = 8;

const EmployeeList = ({ user }) => {
  const [employees, setEmployees] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEmployees(page, appliedSearch, departmentFilter);
    }, 100);
    return () => clearTimeout(timer);
  }, [page, appliedSearch, departmentFilter]);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await employeeAPI.summary();
        setSummary(response.data);
      } catch (summaryError) {
        setSummary(null);
      }
    };

    loadSummary();
  }, []);

  const fetchEmployees = async (nextPage = page, nextSearch = appliedSearch, nextDepartment = departmentFilter) => {
    try {
      const response = await employeeAPI.getAll({
        page: nextPage,
        page_size: PAGE_SIZE,
        search: nextSearch,
        department: nextDepartment,
      });
      const collection = extractCollection(response.data);
      setEmployees(collection.items);
      setTotalCount(collection.count);
      setError(null);
    } catch (err) {
      let errorMessage = 'Failed to fetch employees';
      if (err.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
      } else if (err.code === 'ENOTFOUND') {
        errorMessage = 'Server not found. Please check the API URL.';
      } else if (err.response) {
        errorMessage = `Server error: ${err.response.status} ${err.response.statusText}`;
      } else if (err.request) {
        errorMessage = 'Network error: No response from server';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const totalPayroll = Number(summary?.total_payroll || employees.reduce((sum, employee) => sum + Number(employee.salary || 0), 0));
  const departments = summary?.departments?.length || new Set(employees.map((employee) => employee.department).filter(Boolean)).size;
  const departmentOptions = summary?.departments || [...new Set(employees.map((employee) => employee.department).filter(Boolean))].sort();

  const formatCurrency = (value) => (
    Number(value || 0).toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    })
  );

  const formatDate = (value) => {
    if (!value) return 'Not provided';
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) return <div className="loading">Loading employees...</div>;

  if (error) {
    return (
      <div className="alert alert-error">
        <div>
          <strong>We couldn't load the employee directory.</strong>
          <p>{error}</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => {
            setLoading(true);
            fetchEmployees(page, appliedSearch, departmentFilter);
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="employee-list">
      <section className="page-intro">
        <span className="eyebrow">Workforce directory</span>
        <h2>Inspect every employee record in one place</h2>
        <p>
          Browse payroll-linked employee data, review hiring details, and move into individual profile views when needed.
        </p>
      </section>

      <div className="card">
        <div className="section-head">
          <div>
            <span className="eyebrow">Employee directory</span>
            <h3>Current workforce records</h3>
            <p className="section-note section-note-wide">
              Review live employee information used across onboarding, payroll preparation, and payslip generation.
            </p>
          </div>
          <div className="toolbar-actions">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setLoading(true);
                fetchEmployees(page, appliedSearch, departmentFilter);
              }}
            >
              Refresh
            </button>
          </div>
        </div>

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
              placeholder="Search by employee, email, department, or role"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
            <button type="submit" className="btn btn-primary">Search</button>
          </form>

          <div className="filter-selects">
            <select
              value={departmentFilter}
              onChange={(event) => {
                setPage(1);
                setDepartmentFilter(event.target.value);
              }}
            >
              <option value="">All departments</option>
              {departmentOptions.map((department) => (
                <option key={department} value={department}>{department}</option>
              ))}
            </select>
            {(appliedSearch || departmentFilter) && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setSearchTerm('');
                  setAppliedSearch('');
                  setDepartmentFilter('');
                  setPage(1);
                }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="directory-meta">
          <span>{totalCount} employee records</span>
          <span>{departments} departments</span>
          <span>Monthly salary base: ₹{formatCurrency(totalPayroll)}</span>
        </div>

        {employees.length === 0 ? (
          <div className="empty-state">
            <h3>No employees found yet</h3>
            <p>Start by creating your first employee profile and this workspace will populate automatically.</p>
            {canManageEmployees(user) && <Link to="/add-employee" className="btn btn-primary">Add First Employee</Link>}
          </div>
        ) : (
          <>
            <div className="directory-table">
              <div className="directory-head">
                <span>Employee</span>
                <span>Department</span>
                <span>Position</span>
                <span>Joined</span>
                <span>Salary</span>
              </div>
              {employees
                .filter((employee) => !user || isAdminUser(user) || canViewEmployeeProfile(user, employee.id))
                .map((employee) => (
                  <Link key={employee.id} to={`/employees/${employee.id}`} className="directory-row directory-row-link">
                    <div className="directory-primary">
                      <div>
                        <span className="employee-subtle">Employee profile</span>
                        <h3>{employee.name}</h3>
                        <p>{employee.email}</p>
                      </div>
                    </div>
                    <span className="department-badge">{employee.department}</span>
                    <span>{employee.position}</span>
                    <span>{formatDate(employee.hire_date)}</span>
                    <span className="salary-figure">₹{formatCurrency(employee.salary)}</span>
                  </Link>
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

export default EmployeeList;
