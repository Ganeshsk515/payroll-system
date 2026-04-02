from django.contrib import admin
from .models import Employee


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'department', 'position', 'hire_date', 'salary')
    search_fields = ('name', 'email', 'department', 'position')
    list_filter = ('department', 'hire_date')
