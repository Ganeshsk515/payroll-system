"""URL configuration for the Django API and React frontend."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include([
        path('auth/', include('apps.users.urls')),
        path('employees/', include('apps.employees.urls')),
        path('payslips/', include('apps.salary_slips.urls')),
    ])),
    re_path(r'^(?!api/|admin/).*$',
            TemplateView.as_view(template_name='index.html'),
            name='frontend'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.BASE_DIR / 'static')
