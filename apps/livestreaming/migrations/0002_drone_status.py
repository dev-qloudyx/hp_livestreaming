# Generated by Django 4.2.9 on 2024-03-11 11:05

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('livestreaming', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='drone',
            name='status',
            field=models.BooleanField(default=False),
        ),
    ]
