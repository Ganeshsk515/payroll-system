from decimal import Decimal, InvalidOperation
import csv

from django.db.models import Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

from .models import PayrollActivity, SalarySlip
from .serializers import PayrollActivitySerializer, SalarySlipSerializer
from apps.employees.models import Employee
from core.permissions import IsAdminUserRole

class SalarySlipViewSet(viewsets.ModelViewSet):
    queryset = SalarySlip.objects.all()
    serializer_class = SalarySlipSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'approve', 'issue', 'bulk_update', 'export']:
            return [IsAdminUserRole()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = SalarySlip.objects.select_related('employee', 'approved_by', 'issued_by').prefetch_related('activities__actor')

        if getattr(user, 'role', None) == 'admin':
            pass
        elif getattr(user, 'employee_profile_id', None):
            queryset = queryset.filter(employee_id=user.employee_profile_id)
        else:
            return SalarySlip.objects.none()

        search = self.request.query_params.get('search', '').strip()
        employee_id = self.request.query_params.get('employee_id', '').strip()
        status_filter = self.request.query_params.get('status', '').strip()
        month = self.request.query_params.get('month', '').strip()

        if search:
            queryset = queryset.filter(
                Q(employee__name__icontains=search)
                | Q(employee__email__icontains=search)
                | Q(month__icontains=search)
            )

        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if month:
            queryset = queryset.filter(month=month)

        return queryset.order_by('-generated_at', '-id')

    def create(self, request, *args, **kwargs):
        employee_id = request.data.get('employee_id')
        month = request.data.get('month')
        salary = request.data.get('salary')

        try:
            employee = Employee.objects.get(id=employee_id)
        except Employee.DoesNotExist:
            return Response({'error': 'Employee not found'}, status=status.HTTP_404_NOT_FOUND)

        try:
            basic_salary = Decimal(str(salary))
        except (InvalidOperation, TypeError, ValueError):
            return Response({'error': 'Invalid salary value'}, status=status.HTTP_400_BAD_REQUEST)

        # Simple calculation - in real app, more complex
        hra = basic_salary * Decimal('0.40')  # 40% HRA
        conveyance = Decimal('19200.00')
        medical = Decimal('5000.00')
        lta = basic_salary * Decimal('0.083')
        deductions = basic_salary * Decimal('0.10')
        net_salary = basic_salary + hra + conveyance + medical + lta - deductions

        slip = SalarySlip.objects.create(
            employee=employee,
            month=month,
            basic_salary=basic_salary,
            hra=hra,
            conveyance=conveyance,
            medical=medical,
            lta=lta,
            deductions=deductions,
            net_salary=net_salary,
            status=SalarySlip.STATUS_DRAFT,
        )
        self._log_activity(
            payslip=slip,
            actor=request.user,
            action=PayrollActivity.ACTION_CREATED,
            message=f"Payslip created for {employee.name} for {month}.",
        )

        serializer = self.get_serializer(slip)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def recent_activity(self, request):
        payslip_ids = self.get_queryset().values_list('id', flat=True)
        limit = self.request.query_params.get('limit', '12')
        try:
            limit = max(1, min(int(limit), 30))
        except ValueError:
            limit = 12
        activities = PayrollActivity.objects.select_related('actor', 'payslip__employee').filter(
            payslip_id__in=payslip_ids
        )[:limit]
        serializer = PayrollActivitySerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        payslip_ids = request.data.get('payslip_ids', [])
        operation = request.data.get('operation')

        if not isinstance(payslip_ids, list) or not payslip_ids:
            return Response({'error': 'Select at least one payslip.'}, status=status.HTTP_400_BAD_REQUEST)

        payslips = list(self.get_queryset().filter(id__in=payslip_ids))
        if not payslips:
            return Response({'error': 'No valid payslips were found for this action.'}, status=status.HTTP_404_NOT_FOUND)

        processed = []
        skipped = []
        current_time = timezone.now()

        for payslip in payslips:
            if operation == 'approve':
                if payslip.status == SalarySlip.STATUS_DRAFT:
                    payslip.status = SalarySlip.STATUS_APPROVED
                    payslip.approved_by = request.user
                    payslip.approved_at = current_time
                    payslip.save(update_fields=['status', 'approved_by', 'approved_at'])
                    self._log_activity(
                        payslip=payslip,
                        actor=request.user,
                        action=PayrollActivity.ACTION_APPROVED,
                        message=f"Payslip approved in bulk by {request.user.get_full_name() or request.user.username}.",
                    )
                    processed.append(payslip.id)
                else:
                    skipped.append({'id': payslip.id, 'reason': f'Cannot approve payslip in {payslip.status} state.'})
            elif operation == 'issue':
                if payslip.status == SalarySlip.STATUS_APPROVED:
                    payslip.status = SalarySlip.STATUS_ISSUED
                    payslip.issued_by = request.user
                    payslip.issued_at = current_time
                    payslip.save(update_fields=['status', 'issued_by', 'issued_at'])
                    self._log_activity(
                        payslip=payslip,
                        actor=request.user,
                        action=PayrollActivity.ACTION_ISSUED,
                        message=f"Payslip issued in bulk by {request.user.get_full_name() or request.user.username}.",
                    )
                    processed.append(payslip.id)
                else:
                    skipped.append({'id': payslip.id, 'reason': f'Only approved payslips can be issued. Current state: {payslip.status}.'})
            else:
                return Response({'error': 'Unsupported bulk operation.'}, status=status.HTTP_400_BAD_REQUEST)

        refreshed_payslips = self.get_queryset().filter(id__in=processed)
        serializer = self.get_serializer(refreshed_payslips, many=True)
        return Response({
            'processed_ids': processed,
            'skipped': skipped,
            'updated_payslips': serializer.data,
        })

    @action(detail=False, methods=['get'])
    def export(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="payroll-register.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Payslip ID',
            'Employee',
            'Email',
            'Month',
            'Status',
            'Basic Salary',
            'Net Salary',
            'Approved By',
            'Approved At',
            'Issued By',
            'Issued At',
            'Generated At',
        ])

        for payslip in queryset:
            writer.writerow([
                payslip.id,
                payslip.employee.name,
                payslip.employee.email,
                payslip.month,
                payslip.get_status_display(),
                self._format_currency(payslip.basic_salary),
                self._format_currency(payslip.net_salary),
                payslip.approved_by.get_full_name() if payslip.approved_by else '',
                payslip.approved_at.strftime('%Y-%m-%d %H:%M:%S') if payslip.approved_at else '',
                payslip.issued_by.get_full_name() if payslip.issued_by else '',
                payslip.issued_at.strftime('%Y-%m-%d %H:%M:%S') if payslip.issued_at else '',
                payslip.generated_at.strftime('%Y-%m-%d %H:%M:%S'),
            ])

        return response

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        payslip = self.get_object()
        if payslip.status == SalarySlip.STATUS_ISSUED:
            return Response({'error': 'Issued payslips cannot be moved back to approved.'}, status=status.HTTP_400_BAD_REQUEST)

        payslip.status = SalarySlip.STATUS_APPROVED
        payslip.approved_by = request.user
        payslip.approved_at = timezone.now()
        payslip.save(update_fields=['status', 'approved_by', 'approved_at'])
        self._log_activity(
            payslip=payslip,
            actor=request.user,
            action=PayrollActivity.ACTION_APPROVED,
            message=f"Payslip approved by {request.user.get_full_name() or request.user.username}.",
        )
        return Response(self.get_serializer(payslip).data)

    @action(detail=True, methods=['post'])
    def issue(self, request, pk=None):
        payslip = self.get_object()
        if payslip.status != SalarySlip.STATUS_APPROVED:
            return Response({'error': 'Only approved payslips can be issued.'}, status=status.HTTP_400_BAD_REQUEST)

        payslip.status = SalarySlip.STATUS_ISSUED
        payslip.issued_by = request.user
        payslip.issued_at = timezone.now()
        if not payslip.approved_at:
            payslip.approved_by = request.user
            payslip.approved_at = timezone.now()
            payslip.save(update_fields=['status', 'issued_by', 'issued_at', 'approved_by', 'approved_at'])
        else:
            payslip.save(update_fields=['status', 'issued_by', 'issued_at'])
        self._log_activity(
            payslip=payslip,
            actor=request.user,
            action=PayrollActivity.ACTION_ISSUED,
            message=f"Payslip issued by {request.user.get_full_name() or request.user.username}.",
        )
        return Response(self.get_serializer(payslip).data)

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        payslip = self.get_object()
        response = HttpResponse(content_type='application/pdf')
        response['Content-Disposition'] = (
            f'attachment; filename="payslip-{payslip.employee.name}-{payslip.month}.pdf"'
        )

        pdf = canvas.Canvas(response, pagesize=A4)
        width, height = A4
        self._active_payslip = payslip
        self._log_activity(
            payslip=payslip,
            actor=request.user,
            action=PayrollActivity.ACTION_DOWNLOADED,
            message=f"Payslip downloaded by {request.user.get_full_name() or request.user.username}.",
        )

        self._draw_header(pdf, payslip, width, height)
        self._draw_summary(pdf, payslip, width, height)
        self._draw_breakdown(pdf, payslip, width, height)
        self._draw_footer(pdf, width)

        pdf.showPage()
        pdf.save()
        return response

    def _draw_header(self, pdf, payslip, width, height):
        pdf.setFont("Helvetica-Bold", 20)
        pdf.drawString(25 * mm, height - 28 * mm, "Payslip Management System")
        pdf.setFont("Helvetica", 10)
        pdf.setFillColor(colors.HexColor("#4B5B6B"))
        pdf.drawString(25 * mm, height - 35 * mm, f"Payroll statement for {payslip.month}")
        pdf.drawRightString(width - 25 * mm, height - 28 * mm, f"Document ID: PS-{str(payslip.id).zfill(5)}")
        pdf.drawRightString(width - 25 * mm, height - 35 * mm, f"Generated on: {payslip.generated_at:%d %b %Y}")
        pdf.setFillColor(colors.black)

    def _draw_summary(self, pdf, payslip, width, height):
        top = height - 58 * mm
        cards = [
            ("Employee Name", payslip.employee.name),
            ("Pay Period", payslip.month),
            ("Gross Salary", self._format_currency(
                payslip.basic_salary + payslip.hra + payslip.conveyance + payslip.medical + payslip.lta
            )),
            ("Net Salary", self._format_currency(payslip.net_salary)),
        ]

        card_width = (width - 60 * mm) / 2
        card_height = 18 * mm
        for index, (label, value) in enumerate(cards):
            x = 25 * mm + (index % 2) * (card_width + 10 * mm)
            y = top - (index // 2) * (card_height + 8 * mm)
            pdf.setStrokeColor(colors.HexColor("#D9E1EA"))
            pdf.roundRect(x, y, card_width, card_height, 4 * mm, stroke=1, fill=0)
            pdf.setFont("Helvetica", 9)
            pdf.setFillColor(colors.HexColor("#5F6B7A"))
            pdf.drawString(x + 4 * mm, y + 12 * mm, label)
            pdf.setFont("Helvetica-Bold", 12)
            pdf.setFillColor(colors.black)
            pdf.drawString(x + 4 * mm, y + 6 * mm, str(value))

    def _draw_breakdown(self, pdf, payslip, width, height):
        start_y = height - 120 * mm
        table_width = width - 50 * mm
        row_height = 10 * mm

        earnings = [
            ("Basic Salary", payslip.basic_salary),
            ("House Rent Allowance", payslip.hra),
            ("Conveyance", payslip.conveyance),
            ("Medical", payslip.medical),
            ("LTA", payslip.lta),
        ]

        deductions = [
            ("Total Deductions", payslip.deductions),
            ("Net Salary", payslip.net_salary),
        ]

        self._draw_table(pdf, 25 * mm, start_y, table_width, "Earnings", earnings, row_height)
        self._draw_table(pdf, 25 * mm, start_y - (len(earnings) + 3) * row_height, table_width, "Deductions", deductions, row_height)

    def _draw_table(self, pdf, x, y, width, title, rows, row_height):
        pdf.setFillColor(colors.HexColor("#EEF4FB"))
        pdf.rect(x, y, width, row_height, stroke=0, fill=1)
        pdf.setFillColor(colors.HexColor("#15202B"))
        pdf.setFont("Helvetica-Bold", 10)
        pdf.drawString(x + 4 * mm, y + 3.5 * mm, title)
        pdf.drawRightString(x + width - 4 * mm, y + 3.5 * mm, "Amount (INR)")

        current_y = y - row_height
        for label, value in rows:
            pdf.setFillColor(colors.white)
            pdf.rect(x, current_y, width, row_height, stroke=1, fill=1)
            pdf.setFillColor(colors.black)
            pdf.setFont("Helvetica", 10)
            pdf.drawString(x + 4 * mm, current_y + 3.5 * mm, str(label))
            pdf.drawRightString(x + width - 4 * mm, current_y + 3.5 * mm, self._format_currency(value))
            current_y -= row_height

    def _draw_footer(self, pdf, width):
        pdf.setFont("Helvetica", 9)
        pdf.setFillColor(colors.HexColor("#5F6B7A"))
        pdf.drawString(25 * mm, 18 * mm, "System-generated payroll document for internal company use.")
        pdf.drawRightString(width - 25 * mm, 18 * mm, "No signature required for digital copies.")
        if hasattr(self, "_active_payslip") and self._active_payslip:
            payslip = self._active_payslip
            approved_by = payslip.approved_by.get_full_name() if payslip.approved_by else "Pending"
            issued_by = payslip.issued_by.get_full_name() if payslip.issued_by else "Pending"
            approved_at = payslip.approved_at.strftime("%d %b %Y %H:%M") if payslip.approved_at else "Pending"
            issued_at = payslip.issued_at.strftime("%d %b %Y %H:%M") if payslip.issued_at else "Pending"
            pdf.drawString(25 * mm, 12 * mm, f"Approved by: {approved_by} on {approved_at}")
            pdf.drawRightString(width - 25 * mm, 12 * mm, f"Issued by: {issued_by} on {issued_at}")

    def _format_currency(self, value):
        return f"{Decimal(value):,.2f}"

    def _log_activity(self, payslip, actor, action, message):
        PayrollActivity.objects.create(
            payslip=payslip,
            actor=actor if getattr(actor, 'is_authenticated', False) else None,
            action=action,
            message=message,
        )
