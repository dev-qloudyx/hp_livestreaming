from django.urls import path

from apps.livestreaming.views import DroneCreateView, DroneListView, UserDroneCreateView, DroneUpdateView, DroneView, UserDroneDeleteView, UserDroneListView

app_name = "livestreaming"

urlpatterns = [
    path('drone/create/', DroneCreateView.as_view(), name='drone_create'),
    path('drone/list/', DroneListView.as_view(), name='drone_list'),
    path('drone/<int:pk>/', DroneView.as_view(), name='drone_view'),
    path('drone/<int:pk>/update/', DroneUpdateView.as_view(), name='drone_update'),
    path('user/drone/list/', UserDroneListView.as_view(), name='user_drone_list'),
    path('user/drone/<int:drone_id>/create/', UserDroneCreateView.as_view(), name='user_drone_create'),
    path('user/drone/<int:pk>/delete/', UserDroneDeleteView.as_view(), name='user_drone_delete_by_user'),

]