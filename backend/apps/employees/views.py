from django.db.models import Avg, Q, Sum
from django.db.models.functions import Lower
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Employee
from .serializers import EmployeeSerializer
from core.permissions import IsAdminUserRole

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUserRole()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = Employee.objects.all()

        if getattr(user, 'role', None) != 'admin':
            if getattr(user, 'employee_profile_id', None):
                queryset = queryset.filter(id=user.employee_profile_id)
            else:
                return Employee.objects.none()

        search = self.request.query_params.get('search', '').strip()
        department = self.request.query_params.get('department', '').strip()
        ordering = self.request.query_params.get('ordering', 'name').strip()

        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(department__icontains=search)
                | Q(position__icontains=search)
            )

        if department:
            queryset = queryset.filter(department__iexact=department)

        if ordering == 'latest':
            return queryset.order_by('-created_at', '-id')

        if ordering == 'oldest':
            return queryset.order_by('created_at', 'id')

        return queryset.order_by(Lower('name'), 'id')

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def public_list(self, request):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def summary(self, request):
        queryset = self.get_queryset()
        aggregates = queryset.aggregate(
            total_payroll=Sum('salary'),
            average_salary=Avg('salary'),
        )
        departments = list(
            queryset.exclude(department__exact='')
            .values_list('department', flat=True)
            .distinct()
        )
        return Response({
            'total_employees': queryset.count(),
            'total_payroll': aggregates.get('total_payroll') or 0,
            'average_salary': aggregates.get('average_salary') or 0,
            'departments': sorted(departments),
        })
