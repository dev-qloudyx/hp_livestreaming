from apps.livestreaming.models import Drone, UserDrone
import django_filters
from django.db.models import Q 


class DroneFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method='filter_search', label='')

    class Meta:
        model = Drone
        fields = []

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(name__icontains=value) |
            Q(key__icontains=value)
        )

class UserDroneFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method='filter_search', label='')

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