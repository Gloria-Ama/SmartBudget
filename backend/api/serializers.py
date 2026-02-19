from rest_framework import serializers
from .models import MonthlyPlanItem, Transaction

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model= Transaction
        fields = ["id" , "text" , "amount" , "created_at"]
        read_only_fields = ["id" , "created_at"]

class MonthlyPlanItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyPlanItem
        fields = ['id', 'category', 'amount']
