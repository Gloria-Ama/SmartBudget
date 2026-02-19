from django.shortcuts import render
from rest_framework import generics
from .models  import Transaction
from .serializers import TransactionSerializer
from .models import MonthlyPlanItem
from .serializers import MonthlyPlanItemSerializer

class TransactionListCreateView(generics.ListCreateAPIView):
    queryset= Transaction.objects.all()
    serializer_class=TransactionSerializer

class TransactionRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset= Transaction.objects.all()
    serializer_class=TransactionSerializer
    lookup_field = "id"


class MonthlyPlanListCreateView(generics.ListCreateAPIView):
    queryset = MonthlyPlanItem.objects.all()
    serializer_class = MonthlyPlanItemSerializer

class MonthlyPlanUpdateView(generics.RetrieveUpdateDestroyAPIView):
    queryset = MonthlyPlanItem.objects.all()
    serializer_class = MonthlyPlanItemSerializer
    lookup_field = 'id'
