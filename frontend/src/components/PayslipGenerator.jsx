import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeeAPI, payslipAPI } from '../services/api';

const PayslipGenerator = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({
    employee_id: '',
    month: '',
    salary: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getAll();
      setEmployees(response.data);
    } catch (err) {
      setError('Failed to fetch employees');
    }
  };

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
    setSuccess(null);

    try {
      const response = await payslipAPI.create(formData);
      setSuccess('Payslip generated successfully!');
      setFormData({ employee_id: '', month: '', salary: '' });
      navigate(`/payslips/${response.data.id}`);
    } catch (err) {
      setError('Failed to generate payslip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payslip-generator">
      <section className="page-intro">
        <span className="eyebrow">Monthly payroll issuance</span>
        <h2>Generate a polished monthly payslip</h2>
        <p>Select the employee, confirm the pay period, and prepare the payroll document from a controlled workflow.</p>
      </section>
      <div className="workspace-grid">
        <aside className="card info-panel">
          <span className="eyebrow">Calculation summary</span>
          <h3>Included in every generated payslip</h3>
          <ul className="info-list">
            <li>Automatic salary structure breakdown with HRA, conveyance, medical, and LTA.</li>
            <li>Built-in deductions model from the submitted salary base.</li>
            <li>Employee-linked monthly record saved to the system.</li>
          </ul>
          <div className="info-note">
            Use the same month format across payroll cycles to keep reporting and record history consistent.
          </div>
        </aside>
        <div className="card">
          <div className="section-head section-head-stack">
            <div>
              <span className="eyebrow">Payslip studio</span>
              <h3>Run the payroll document</h3>
            </div>
            <p className="section-note">The system will calculate allowances and deductions from the submitted salary.</p>
          </div>
          {error && <div className="alert alert-error"><strong>Payslip generation failed.</strong><p>{error}</p></div>}
          {success && <div className="alert alert-success"><strong>Success.</strong><p>{success}</p></div>}

          <div className="form-container">
            <form onSubmit={handleSubmit} className="payslip-form form-grid">
              <div className="form-group form-group-wide">
                <label>Select Employee</label>
              <select
                name="employee_id"
                value={formData.employee_id}
                onChange={handleChange}
                required
              >
                <option value="">Choose an employee...</option>
                {employees.map(employee => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} - {employee.department} ({employee.position})
                  </option>
                ))}
              </select>
            </div>

              <div className="form-group">
                <label>Pay Period (YYYY-MM)</label>
              <input
                type="text"
                name="month"
                value={formData.month}
                onChange={handleChange}
                placeholder="2024-01"
                pattern="\d{4}-\d{2}"
                title="Format: YYYY-MM (e.g., 2024-01)"
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

              <div className="form-actions form-group-wide">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Generating Payslip...' : 'Generate Payslip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayslipGenerator;
