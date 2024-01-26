from collections.abc import Iterable
from django.db import models

from apps.users.models import User

# Create your models here.

class Drone(models.Model):
    name = models.CharField(max_length=255, unique=True)
    key = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.key
    
class UserDrone(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    drone = models.ForeignKey(Drone, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('user', 'drone')

   

