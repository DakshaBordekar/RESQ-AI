import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        response.data['status_code'] = response.status_code
        if 'detail' in response.data:
            response.data['error'] = response.data['detail']
    else:
        logger.error(f"Unhandled exception in API context: {context}", exc_info=exc)
        response = Response(
            {
                'error': 'Internal server error occurred.',
                'detail': str(exc),
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response
