from django.forms.widgets import ClearableFileInput

class LoadPhotoWidget(ClearableFileInput):
    template_name = "profile/load_photo.html"