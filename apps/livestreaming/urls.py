from django.urls import path

from apps.livestreaming.views import DroneCreateView, DroneListView, UserDroneListView, UserDroneCreateView, DroneUpdateView, DroneView, UserDroneDeleteView
app_name = "livestreaming"

urlpatterns = [
    path('drone/create/', DroneCreateView.as_view(), name='drone_create'),
    path('drone/list/', DroneListView.as_view(), name='drone_list'),
    path('drone/<int:pk>/', DroneView.as_view(), name='drone_view'),
    path('drone/update/<int:pk>/', DroneUpdateView.as_view(), name='drone_update'),
    path('user/drone/list/', UserDroneListView.as_view(), name='user_drone_list'),
    path('user/drone/list/user_id/<int:user_id>/', UserDroneListView.as_view(), name='user_drone_list_by_user'),
    path('user/drone/create/<int:drone_id>/', UserDroneCreateView.as_view(), name='user_drone_create'),
    path('user/drone/delete/<int:pk>/', UserDroneDeleteView.as_view(), name='user_drone_delete_by_user'),

]