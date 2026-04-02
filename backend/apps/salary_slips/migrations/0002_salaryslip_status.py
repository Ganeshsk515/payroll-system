from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('salary_slips', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='salaryslip',
            name='status',
            field=models.CharField(
                choices=[('draft', 'Draft'), ('approved', 'Approved'), ('issued', 'Issued')],
                default='draft',
                max_length=20,
            ),
        ),
    ]
