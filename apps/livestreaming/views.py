from typing import Any
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse, reverse_lazy
from django.views.generic import CreateView, ListView, DetailView, UpdateView, DeleteView
from django.contrib.auth.mixins import UserPassesTestMixin
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from apps.livestreaming.filters import DroneFilter, UserDroneFilter
from apps.livestreaming.forms import DroneForm, UserDroneForm
from apps.livestreaming.models import Drone, UserDrone
from apps.users.models import User
from apps.users.roles import roles_required
from django.db import IntegrityError
from django.contrib import messages
from django_filters.views import FilterView

# Create your views here.

@method_decorator([login_required, roles_required(['admin', 'user'])], name='dispatch')
class DroneView(DetailView):
    model = Drone
    template_name = 'drone_view.html'

    
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

@method_decorator([login_required, roles_required(['admin'])], name='dispatch')  
class DroneListView(FilterView):
    model = Drone
    template_name = 'drone_list.html'
    filterset_class = DroneFilter
    paginate_by = 5

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
class UserDroneListView(UserPassesTestMixin, FilterView):
    model = UserDrone
    template_name = 'user_drone_list.html'
    context_object_name = 'user_drone'
    filterset_class = UserDroneFilter
    paginate_by = 5

    def get_queryset(self):
        if 'user_id' in self.kwargs:
            user_id = self.kwargs['user_id']
            query_Set = UserDrone.objects.filter(user__pk=user_id)
            return query_Set
        if self.request.user.role.role_name == 'admin':
            return UserDrone.objects.all()
    
    def test_func(self):
        user = None
        if 'user_id' in self.kwargs:
            user = get_object_or_404(User, pk=self.kwargs['user_id'])
        if user:
            if user.role.role_name == 'admin':
                return True
            return self.request.user == user
        if self.request.user.role.role_name == 'admin':
            return True
        else:
            return False

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
        return reverse_lazy('livestreaming:user_drone_list')


