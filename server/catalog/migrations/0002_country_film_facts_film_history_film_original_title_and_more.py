import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Country',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('slug', models.SlugField(unique=True)),
            ],
            options={
                'verbose_name_plural': 'countries',
                'ordering': ['name'],
            },
        ),
        migrations.AddField(
            model_name='film',
            name='facts',
            field=models.JSONField(blank=True, default=list, help_text='Интересные факты: список строк'),
        ),
        migrations.AddField(
            model_name='film',
            name='history',
            field=models.TextField(blank=True, help_text='История создания'),
        ),
        migrations.AddField(
            model_name='film',
            name='original_title',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='film',
            name='summary',
            field=models.TextField(blank=True, help_text='О мультфильме'),
        ),
        migrations.AddField(
            model_name='studio',
            name='closed',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='studio',
            name='history',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='studio',
            name='logo',
            field=models.ImageField(blank=True, upload_to='studios/'),
        ),
        migrations.AddField(
            model_name='studio',
            name='logo_source',
            field=models.URLField(blank=True),
        ),
        migrations.AlterField(
            model_name='film',
            name='description',
            field=models.TextField(blank=True, help_text='Короткая аннотация для карточки'),
        ),
        migrations.AlterField(
            model_name='film',
            name='search_title',
            field=models.CharField(db_index=True, editable=False, max_length=520),
        ),
        migrations.AddField(
            model_name='film',
            name='countries',
            field=models.ManyToManyField(blank=True, related_name='films', to='catalog.country'),
        ),
        migrations.AddField(
            model_name='studio',
            name='country',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='studios', to='catalog.country'),
        ),
        migrations.CreateModel(
            name='TimelineEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('year', models.PositiveSmallIntegerField(db_index=True)),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('kind', models.CharField(choices=[('milestone', 'Веха'), ('technology', 'Технология'), ('studio', 'Студия'), ('premiere', 'Премьера'), ('award', 'Награда')], default='milestone', max_length=20)),
                ('major', models.BooleanField(default=False)),
                ('country', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='events', to='catalog.country')),
                ('films', models.ManyToManyField(blank=True, related_name='events', to='catalog.film')),
                ('studio', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='events', to='catalog.studio')),
            ],
            options={
                'ordering': ['year', 'id'],
            },
        ),
    ]
