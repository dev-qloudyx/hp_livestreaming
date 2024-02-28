

from apps.users.allauth_utils import custom_form_valid
from .forms import CustomSignupForm, UserUpdateForm, ProfileUpdateForm
from apps.users.roles import roles_required
from django.utils.decorators import method_decorator
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render
from django.views import View
from django.utils.decorators import method_decorator
from allauth.account.views import PasswordResetView
from allauth.account.views import  SignupView
from allauth.account.views import RedirectAuthenticatedUserMixin

# Create your views here.

class CustomRedirectMixin(RedirectAuthenticatedUserMixin):
    def dispatch(self, request, *args, **kwargs):
        if request.user.is_authenticated:
            return super(RedirectAuthenticatedUserMixin, self).dispatch(request, *args, **kwargs)
        else:
            return super().dispatch(request, *args, **kwargs)
        
@method_decorator(roles_required(['admin']), name='dispatch')
class CustomSignupView(CustomRedirectMixin, SignupView):
    template_name = "account/signup.html"
    form_class = CustomSignupForm
    
    def form_valid(self, form):
        custom_form_valid(self, form)
        PasswordResetView.as_view()(self.request)
        msg = f"Conta criada com sucesso para username: {form.cleaned_data['username']}"
        messages.success(self.request, msg)
        return redirect('users:account_signup')

    
@method_decorator(login_required, name='dispatch')
class ProfileView(View):

    def get(self, request):
        u_form = UserUpdateForm(instance=request.user)
        p_form = ProfileUpdateForm(instance=request.user.profile)
        context = {
            'u_form': u_form,
            'p_form': p_form
        }
        return render(request, 'profile/profile.html', context)

    def post(self, request):
        u_form = UserUpdateForm(request.POST, instance=request.user)
        p_form = ProfileUpdateForm(
            request.POST, request.FILES, instance=request.user.profile)
        if u_form.is_valid() and p_form.is_valid():
            u_form.save()
            p_form.save()
            messages.success(request, 'A sua conta foi atualizada!')
        else:
            messages.error(request,
                'Problemas em atualizar a sua conta, veja erros em baixo...')
        context = {
            'u_form': u_form,
            'p_form': p_form
        }
        return render(request, 'profile/profile.html', context)