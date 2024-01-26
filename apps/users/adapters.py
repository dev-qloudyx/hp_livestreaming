from allauth.account.adapter import DefaultAccountAdapter
from django.urls import reverse

    
class CustomAccountAdapter(DefaultAccountAdapter):
 
    def get_login_redirect_url(self, request):
        print('I am entering get_login_redirect_url')
        if 'team_membership_project_id' in request.session:
            parameters = {}
            parameters['invitation_id'] = request.session['invitation_id']
            path = reverse('action:accept_invitation', urlconf=None, args=None, kwargs=parameters)
            return path

        path = '/'

        return path