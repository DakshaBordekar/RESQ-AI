from rest_framework import serializers
from apps.accounts.models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'badge_number', 'phone_number', 'department']
