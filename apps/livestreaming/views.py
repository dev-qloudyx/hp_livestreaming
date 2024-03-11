import os

from apps.livestreaming.filters import DroneFilter, UserDroneFilter
from apps.livestreaming.forms import DroneForm, UserDroneForm
from apps.livestreaming.models import Drone, UserDrone
from apps.livestreaming.utils import Drone_Helper
from apps.users.roles import roles_required

from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse, reverse_lazy
from django.views.generic import CreateView, DetailView, UpdateView, DeleteView
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.db import IntegrityError
from django.contrib import messages
from django_filters.views import FilterView
from django.utils.html import format_html


# Create your views here.

@method_decorator([login_required, roles_required(['admin', 'user'])], name='dispatch')
class DroneView(DetailView):
    model = Drone
    template_name = 'drone_view_vue_oven.html'

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['url'] = f"{os.getenv('OME_URL')}{context['object'].key}"
        return context

@method_decorator([login_required, roles_required(['admin'])], name='dispatch')
class DroneCreateView(CreateView):
    model = Drone
    form_class = DroneForm
    template_name = 'drone.html'
    
    def get_success_url(self):
        return reverse('livestreaming:drone_list')

@method_decorator([login_required, roles_required(['admin'])], name='dispatch')  
class DroneUpdateView(UpdateView):
    model = Drone
    template_name = 'drone_update.html'
    fields = ['name', 'key']

    def get_success_url(self):
        return reverse('livestreaming:drone_list')

@method_decorator([login_required], name='dispatch')  
class DroneListView(FilterView):
    model = Drone
    template_name = 'drone_list.html'
    filterset_class = DroneFilter
    paginate_by = 5

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return Drone.objects.all()
        else:
            return Drone.objects.filter(userdrone__user=self.request.user)
        
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        drone_helper = Drone_Helper()
        drone_list = []

        for drone in context['object_list']:
            url = os.getenv('OME_URL')
            drone = drone_helper.get_and_set_status(url, drone)

            if drone.status:
                drone.status = format_html('<div class="online-indicator">Live</div>')
            else:
                drone.status = format_html('<div class="offline-indicator">Offline</div>')

            drone_list.append(drone)

        context['object_list'] = drone_list
        return context

@method_decorator([login_required, roles_required(['admin'])], name='dispatch')
class UserDroneCreateView(CreateView):
    model = UserDrone
    form_class = UserDroneForm
    template_name = 'user_drone.html'
    
    def get_context_data(self, **kwargs):
        kwargs['drone'] = get_object_or_404(Drone, pk=self.kwargs['drone_id'])
        return super().get_context_data(**kwargs)
    
    def form_valid(self, form):
        form = form.save(commit=False)
        form.drone = get_object_or_404(Drone, pk=self.kwargs['drone_id'])
        try:
            form.save()
        except IntegrityError:
            messages.error(self.request, 'This combination of user and drone already exists.')
            return redirect('livestreaming:user_drone_create', drone_id=self.kwargs['drone_id'])
        return super().form_valid(form)
    
    def get_success_url(self):
        return reverse('livestreaming:drone_list')

@method_decorator([login_required, roles_required(['admin'])], name='dispatch')
class UserDroneListView(FilterView):
    model = UserDrone
    template_name = 'user_drone_list.html'
    context_object_name = 'user_drone'
    filterset_class = UserDroneFilter
    paginate_by = 5

@method_decorator([login_required, roles_required(['admin'])], name='dispatch')
class UserDroneUpdateView(UpdateView):
    model = UserDrone
    template_name = 'user_drone_update.html'
    fields = ['user', 'drone']

    def get_success_url(self):
        return reverse_lazy('livestreaming:user_drone_list')

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['user'] = get_object_or_404(UserDrone, id=self.kwargs['user_id'])
        return context

    def form_valid(self, form):
        form.instance.user = get_object_or_404(UserDrone, id=self.kwargs['user_id'])
        return super().form_valid(form)

@method_decorator([login_required, roles_required(['admin'])], name='dispatch')
class UserDroneDeleteView(DeleteView):
    model = UserDrone

    def get_success_url(self):
        return reverse('livestreaming:drone_list')


