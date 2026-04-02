from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.employees.models import Employee
from apps.salary_slips.models import PayrollActivity, SalarySlip
from apps.users.models import User


class Command(BaseCommand):
    help = "Seed demo users, employees, and payslips for local testing."

    @transaction.atomic
    def handle(self, *args, **options):
        admin_employee, _ = Employee.objects.update_or_create(
            email="anita.rao@company.com",
            defaults={
                "name": "Anita Rao",
                "department": "Finance",
                "position": "Payroll Manager",
                "hire_date": "2022-04-14",
                "salary": Decimal("98000.00"),
            },
        )

        employee_profile, _ = Employee.objects.update_or_create(
            email="rahul.mehta@company.com",
            defaults={
                "name": "Rahul Mehta",
                "department": "Engineering",
                "position": "Software Engineer",
                "hire_date": "2023-07-10",
                "salary": Decimal("72000.00"),
            },
        )

        Employee.objects.update_or_create(
            email="maria.joseph@company.com",
            defaults={
                "name": "Maria Joseph",
                "department": "Human Resources",
                "position": "HR Business Partner",
                "hire_date": "2021-11-03",
                "salary": Decimal("86000.00"),
            },
        )

        admin_user, created = User.objects.get_or_create(
            username="demo.admin",
            defaults={
                "email": "demo.admin@company.com",
                "first_name": "Anita",
                "last_name": "Rao",
                "role": "admin",
                "is_staff": True,
                "is_superuser": True,
                "employee_profile": admin_employee,
            },
        )
        admin_user.email = "demo.admin@company.com"
        admin_user.first_name = "Anita"
        admin_user.last_name = "Rao"
        admin_user.role = "admin"
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.employee_profile = admin_employee
        admin_user.set_password("Admin@123")
        admin_user.save()

        employee_user, created = User.objects.get_or_create(
            username="demo.employee",
            defaults={
                "email": "demo.employee@company.com",
                "first_name": "Rahul",
                "last_name": "Mehta",
                "role": "employee",
                "employee_profile": employee_profile,
            },
        )
        employee_user.email = "demo.employee@company.com"
        employee_user.first_name = "Rahul"
        employee_user.last_name = "Mehta"
        employee_user.role = "employee"
        employee_user.employee_profile = employee_profile
        employee_user.is_staff = False
        employee_user.is_superuser = False
        employee_user.set_password("Employee@123")
        employee_user.save()

        self._upsert_payslip(employee_profile, "2026-01", Decimal("72000.00"))
        self._upsert_payslip(employee_profile, "2026-02", Decimal("72000.00"))
        self._upsert_payslip(employee_profile, "2026-03", Decimal("74500.00"))
        self._upsert_payslip(admin_employee, "2026-03", Decimal("98000.00"))

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully."))
        self.stdout.write("Admin login: demo.admin / Admin@123")
        self.stdout.write("Employee login: demo.employee / Employee@123")

    def _upsert_payslip(self, employee, month, basic_salary):
        hra = basic_salary * Decimal("0.40")
        conveyance = Decimal("19200.00")
        medical = Decimal("5000.00")
        lta = basic_salary * Decimal("0.083")
        deductions = basic_salary * Decimal("0.10")
        net_salary = basic_salary + hra + conveyance + medical + lta - deductions
        admin_user = User.objects.get(username="demo.admin")
        timestamp = timezone.now()

        payslip, _ = SalarySlip.objects.update_or_create(
            employee=employee,
            month=month,
            defaults={
                "basic_salary": basic_salary,
                "hra": hra,
                "conveyance": conveyance,
                "medical": medical,
                "lta": lta,
                "deductions": deductions,
                "net_salary": net_salary,
                "status": "issued",
                "approved_by": admin_user,
                "approved_at": timestamp,
                "issued_by": admin_user,
                "issued_at": timestamp,
            },
        )
        PayrollActivity.objects.get_or_create(
            payslip=payslip,
            action=PayrollActivity.ACTION_CREATED,
            defaults={
                "actor": admin_user,
                "message": f"Payslip created for {employee.name} for {month}.",
            },
        )
        PayrollActivity.objects.get_or_create(
            payslip=payslip,
            action=PayrollActivity.ACTION_APPROVED,
            defaults={
                "actor": admin_user,
                "message": f"Payslip approved by {admin_user.get_full_name()}.",
            },
        )
        PayrollActivity.objects.get_or_create(
            payslip=payslip,
            action=PayrollActivity.ACTION_ISSUED,
            defaults={
                "actor": admin_user,
                "message": f"Payslip issued by {admin_user.get_full_name()}.",
            },
        )
