from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('employee', 'Employee'),
    ]

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='employee',
        help_text=_('User role in the system')
    )

    # Link to employee profile if user is an employee
    employee_profile = models.OneToOneField(
        'employees.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_account'
    )

    class Meta:
        verbose_name = _('User')
        verbose_name_plural = _('Users')

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

    def is_admin(self):
        return self.role == 'admin'

    def is_employee(self):
        return self.role == 'employee'
