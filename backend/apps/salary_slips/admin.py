from django.contrib import admin
from .models import SalarySlip


@admin.register(SalarySlip)
class SalarySlipAdmin(admin.ModelAdmin):
    list_display = ('employee', 'month', 'basic_salary', 'deductions', 'net_salary', 'generated_at')
    search_fields = ('employee__name', 'month')
    list_filter = ('month', 'generated_at')
