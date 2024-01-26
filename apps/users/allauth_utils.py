from allauth.account import app_settings, signals
from allauth.core.exceptions import ImmediateHttpResponse
from allauth.account.models import Login
from allauth.account.utils import send_email_confirmation
from django.shortcuts import redirect

def perform_login(
    request,
    user,
    email_verification,
    redirect_url=None,
    signal_kwargs=None,
    signup=False,
    email=None,
):
    login = Login(
        user=user,
        email_verification=email_verification,
        redirect_url=redirect_url,
        signal_kwargs=signal_kwargs,
        signup=signup,
        email=email,
    )
    return _perform_login(request, login)


def _perform_login(request, login):
    hook_kwargs = _get_login_hook_kwargs(login)
    send_email_confirmation(request, login.user, signup=hook_kwargs['signup'], email=login.user.email)
    return redirect('users:profile')


def _get_login_hook_kwargs(login):
    return dict(
        email_verification=login.email_verification,
        redirect_url=login.redirect_url,
        signal_kwargs=login.signal_kwargs,
        signup=login.signup,
        email=login.email,
    )


def complete_signup(request, user, email_verification, success_url, signal_kwargs=None):
    if signal_kwargs is None:
        signal_kwargs = {}
    signals.user_signed_up.send(
        sender=user.__class__, request=request, user=user, **signal_kwargs
    )
    return perform_login(
        request,
        user,
        email_verification=email_verification,
        signup=False,
        redirect_url=success_url,
        signal_kwargs=signal_kwargs,
        email=user.email,
    )

def custom_form_valid(self, form):
        self.user, resp = form.try_save(self.request)
        if resp:
            return resp
        try:
            return complete_signup(
                self.request,
                self.user,
                app_settings.EMAIL_VERIFICATION,
                self.get_success_url(),
            )
        except ImmediateHttpResponse as e:
            return e.response