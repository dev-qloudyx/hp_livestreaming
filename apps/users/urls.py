from django.urls import path
from apps.users.views import ProfileView, CustomSignupView
from django.views.generic.base import RedirectView

app_name = "users"

urlpatterns = [
    path('', RedirectView.as_view(url='accounts/login/', permanent=False)),
    path('accounts/profile/', ProfileView.as_view(), name='profile'),
    path('accounts/signup/', CustomSignupView.as_view(), name='account_signup'),
]
