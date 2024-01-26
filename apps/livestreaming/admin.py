from django.contrib import admin

from apps.livestreaming.models import Drone, UserDrone
 
# Register your models here.

admin.site.register(Drone)
admin.site.register(UserDrone)

