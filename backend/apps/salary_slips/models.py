from django.db import models
from apps.employees.models import Employee

class SalarySlip(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_APPROVED = 'approved'
    STATUS_ISSUED = 'issued'
    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Draft'),
        (STATUS_APPROVED, 'Approved'),
        (STATUS_ISSUED, 'Issued'),
    ]

    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    month = models.CharField(max_length=7)  # YYYY-MM
    basic_salary = models.DecimalField(max_digits=10, decimal_places=2)
    hra = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    conveyance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    medical = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    lta = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    approved_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_payslips',
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    issued_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='issued_payslips',
    )
    issued_at = models.DateTimeField(null=True, blank=True)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['employee', 'month']

    def __str__(self):
        return f"{self.employee.name} - {self.month}"


class PayrollActivity(models.Model):
    ACTION_CREATED = 'created'
    ACTION_APPROVED = 'approved'
    ACTION_ISSUED = 'issued'
    ACTION_DOWNLOADED = 'downloaded'
    ACTION_CHOICES = [
        (ACTION_CREATED, 'Created'),
        (ACTION_APPROVED, 'Approved'),
        (ACTION_ISSUED, 'Issued'),
        (ACTION_DOWNLOADED, 'Downloaded'),
    ]

    payslip = models.ForeignKey(SalarySlip, on_delete=models.CASCADE, related_name='activities')
    actor = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='payroll_activities')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    message = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.payslip} - {self.get_action_display()}"
