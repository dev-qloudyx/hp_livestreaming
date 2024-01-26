from django import forms

from django.contrib.auth.forms import UserCreationForm
from apps.livestreaming.models import Drone, UserDrone
from apps.users.models import User

class DroneForm(forms.ModelForm):
    
    class Meta:
        model = Drone
        fields = '__all__'


class UserDroneForm(forms.ModelForm):
        
    class Meta:
        model = UserDrone
        fields = ['user']




