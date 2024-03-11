from django import forms
from apps.livestreaming.models import Drone, UserDrone
import django_filters as filters
from django.db.models import Q 


class DroneFilter(filters.FilterSet):
    STATUS_CHOICES = (
        (True, 'Live'),
        (False, 'Offline')
    )

    status = filters.ChoiceFilter(
        method='filter_status',
        choices=STATUS_CHOICES,
        label='',
        widget=forms.Select(attrs={'class': 'form-select'})  # You can add additional attributes as needed
    )
    search = filters.CharFilter(method='filter_search', label='')
    
    
    class Meta:
        model = Drone
        fields = []

    def filter_status(self, queryset, name, value):
        return queryset.filter(status=value)
    
    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(name__icontains=value) |
            Q(key__icontains=value) 
        )

class UserDroneFilter(filters.FilterSet):
    search = filters.CharFilter(method='filter_search', label='')

    class Meta:
        model = UserDrone
        fields = []

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(user__username__icontains=value) |
            Q(user__email__icontains=value) |
            Q(drone__name__icontains=value) |
            Q(drone__key__icontains=value)
        )