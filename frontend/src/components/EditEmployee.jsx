import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { employeeAPI } from '../services/api';

const EditEmployee = () => {
  const { employeeId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    position: '',
    salary: '',
    hire_date: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadEmployee = async () => {
      try {
        const response = await employeeAPI.get(employeeId);
        const employee = response.data;
        setFormData({
          name: employee.name || '',
          email: employee.email || '',
          department: employee.department || '',
          position: employee.position || '',
          salary: employee.salary || '',
          hire_date: employee.hire_date || '',
        });
      } catch (err) {
        setError('Unable to load employee record for editing.');
      } finally {
        setLoading(false);
      }
    };

    loadEmployee();
  }, [employeeId]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await employeeAPI.update(employeeId, formData);
      navigate(`/employees/${employeeId}`);
    } catch (err) {
      setError('Failed to update employee record.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading employee record...</div>;

  return (
    <div className="edit-employee-page">
      <section className="page-intro">
        <span className="eyebrow">Employee record maintenance</span>
        <h2>Edit employee profile</h2>
        <p>Update workforce information to keep payroll records, directory data, and HR operations current.</p>
      </section>

      <div className="workspace-grid">
        <aside className="card info-panel">
          <span className="eyebrow">Change guidance</span>
          <h3>Before you save</h3>
          <ul className="info-list">
            <li>Confirm the salary reflects the active monthly payroll amount.</li>
            <li>Use the employee's official business email and current department.</li>
            <li>Review role titles carefully because they surface in directory and payroll views.</li>
          </ul>
          <Link to={`/employees/${employeeId}`} className="btn btn-secondary">Back to Profile</Link>
        </aside>

        <div className="card">
          <div className="section-head section-head-stack">
            <div>
              <span className="eyebrow">Employee profile</span>
              <h3>Update workforce details</h3>
            </div>
            <p className="section-note">Changes here take effect across directory views and future payslip workflows.</p>
          </div>

          {error && <div className="alert alert-error"><strong>Unable to save changes.</strong><p>{error}</p></div>}

          <div className="form-container">
            <form onSubmit={handleSubmit} className="employee-form form-grid">
              <div className="form-group form-group-wide">
                <label>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group form-group-wide">
                <label>Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Department</label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Position</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Monthly Salary (₹)</label>
                <input
                  type="number"
                  name="salary"
                  value={formData.salary}
                  onChange={handleChange}
                  min="0"
                  step="1000"
                  required
                />
              </div>

              <div className="form-group">
                <label>Hire Date</label>
                <input
                  type="date"
                  name="hire_date"
                  value={formData.hire_date}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="form-actions form-group-wide">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditEmployee;
