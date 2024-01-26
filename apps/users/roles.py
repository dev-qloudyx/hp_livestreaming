from django.shortcuts import redirect
from django.contrib import messages
from apps.users.models import UserRole
from django.utils.translation import gettext as _

def roles_required(roles):

    def _outer(func):

        def _inner(request, *args, **kwargs):
            user = request.user
            if user.is_authenticated:
                user_roles = UserRole.objects.filter(role_name__in=roles)
                if user_roles and user.role in user_roles:
                    return func(request, *args, **kwargs)

            messages.error(request, _('Permission denied. You do not have the required role(s).'))
            return redirect('account_login')

        return _inner

    return _outer