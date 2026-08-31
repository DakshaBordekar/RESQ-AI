from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.accounts.models import User
from apps.accounts.serializers import UserSerializer

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=False, methods=['get'])
    def me(self, request):
        if request.user.is_authenticated:
            return Response(UserSerializer(request.user).data)
        # Return default coordinator demo profile for anonymous demo sessions
        demo_user = User.objects.filter(role=User.Role.COORDINATOR).first()
        if demo_user:
            return Response(UserSerializer(demo_user).data)
        return Response({
            'username': 'coordinator_rajesh',
            'role': 'COORDINATOR',
            'department': 'Chennai Emergency Command Center'
        })
