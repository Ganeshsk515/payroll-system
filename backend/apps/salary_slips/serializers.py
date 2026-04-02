from rest_framework import serializers
from .models import PayrollActivity, SalarySlip


class PayrollActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    action_label = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = PayrollActivity
        fields = ['id', 'payslip', 'action', 'action_label', 'message', 'actor_name', 'created_at']

    def get_actor_name(self, obj):
        if not obj.actor:
            return 'System'
        full_name = obj.actor.get_full_name()
        return full_name or obj.actor.username

class SalarySlipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    status_label = serializers.CharField(source='get_status_display', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    issued_by_name = serializers.CharField(source='issued_by.get_full_name', read_only=True)
    activities = PayrollActivitySerializer(many=True, read_only=True)

    class Meta:
        model = SalarySlip
        fields = '__all__'
