from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
        ('salary_slips', '0002_salaryslip_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='salaryslip',
            name='approved_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='salaryslip',
            name='approved_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='approved_payslips', to='users.user'),
        ),
        migrations.AddField(
            model_name='salaryslip',
            name='issued_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='salaryslip',
            name='issued_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='issued_payslips', to='users.user'),
        ),
    ]
