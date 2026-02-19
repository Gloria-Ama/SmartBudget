from django.urls import path 
from . import views
from .views import MonthlyPlanListCreateView, MonthlyPlanUpdateView

urlpatterns = [
    path('transactions/', views.TransactionListCreateView.as_view(), name='transaction-list'),
    path('transactions/<uuid:id>/', views.TransactionRetrieveUpdateDestroyView.as_view(), name='transaction-detail'),
    path('monthly-plan/', MonthlyPlanListCreateView.as_view(), name='monthly-plan-list-create'),
    path('monthly-plan/<int:id>/', MonthlyPlanUpdateView.as_view(), name='monthly-plan-update'),
]

