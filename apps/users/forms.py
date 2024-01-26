from django import forms

from apps.users.models import Profile, User
from .load_photo_widget import LoadPhotoWidget
from allauth.account.forms import SignupForm

class CustomSignupForm(SignupForm):
    
    def __init__(self, *args, **kwargs):
        super(CustomSignupForm, self).__init__(*args, **kwargs)
        self.fields.pop('password1')
        self.fields.pop('password2')
    
class UserUpdateForm(forms.ModelForm):
    email = forms.EmailField()

    class Meta:
        model = User
        fields = ['email', 'username']


class ProfileUpdateForm(forms.ModelForm):
    image = forms.ImageField(widget=LoadPhotoWidget)
    class Meta:
        model = Profile
        fields = ['image', 'full_name', 'about']
