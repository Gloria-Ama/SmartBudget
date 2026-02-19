from django.db import models
import uuid
# Create your models here.
class Transaction(models.Model):
    id=models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    text=models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at=models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering=['-created_at']

    def __str__(self):
        return f"{self.text}: {self.amount}"
    

class MonthlyPlanItem(models.Model):
    category = models.CharField(max_length=100)
    amount = models.FloatField(default=0)

    def __str__(self):
        return self.category
