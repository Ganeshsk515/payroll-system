from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
        ('salary_slips', '0003_salaryslip_audit_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='PayrollActivity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('created', 'Created'), ('approved', 'Approved'), ('issued', 'Issued'), ('downloaded', 'Downloaded')], max_length=20)),
                ('message', models.CharField(max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('actor', models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='payroll_activities', to='users.user')),
                ('payslip', models.ForeignKey(on_delete=models.CASCADE, related_name='activities', to='salary_slips.salaryslip')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
