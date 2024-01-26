from apps.users.models import Profile, User, UserRole
from django.contrib import admin
from django.contrib.auth import admin as auth_admin

# Register your models here.
class UserAdmin(auth_admin.UserAdmin):
    list_display = (
        'email', 'username', 'role', 'date_joined', 'last_login', 'is_admin', 'is_staff'
        )
    search_fields = ('email', 'username')
    readonly_fields = ('date_joined', 'last_login')
    filter_horizontal = ()
    list_filter = ()
    fieldsets = ()

admin.site.register(User, UserAdmin)
admin.site.register(UserRole)
admin.site.register(Profile)