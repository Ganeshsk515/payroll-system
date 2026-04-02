import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeeAPI } from '../services/api';

const AddEmployee = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    position: '',
    salary: '',
    hire_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await employeeAPI.create(formData);
      navigate('/');
    } catch (err) {
      setError('Failed to add employee');
      setLoading(false);
    }
  };

  return (
    <div className="add-employee">
      <section className="page-intro">
        <span className="eyebrow">Employee onboarding</span>
        <h2>Add a new employee record</h2>
        <p>Create a complete workforce record so payroll, access, and payslip workflows remain accurate from day one.</p>
      </section>
      <div className="workspace-grid">
        <aside className="card info-panel">
          <span className="eyebrow">Record quality</span>
          <h3>What this profile supports</h3>
          <ul className="info-list">
            <li>Employee directory visibility for payroll and HR teams.</li>
            <li>Accurate monthly salary references for payslip preparation.</li>
            <li>Consistent join-date history for employment records.</li>
          </ul>
          <div className="info-note">
            Enter official business values only. These details will be used in downstream payroll workflows.
          </div>
        </aside>
        <div className="card">
          <div className="section-head section-head-stack">
            <div>
              <span className="eyebrow">Employee profile</span>
              <h3>Capture workforce details</h3>
            </div>
            <p className="section-note">Every field here feeds your employee directory and future payslip records.</p>
          </div>
          {error && <div className="alert alert-error"><strong>Unable to save employee.</strong><p>{error}</p></div>}
          <div className="form-container">
            <form onSubmit={handleSubmit} className="employee-form form-grid">
              <div className="form-group form-group-wide">
                <label>Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter employee's full name"
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
                placeholder="employee@company.com"
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
                placeholder="Engineering"
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
                placeholder="Software Engineer"
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
                placeholder="50000"
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
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Adding Employee...' : 'Save Employee Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEmployee;
