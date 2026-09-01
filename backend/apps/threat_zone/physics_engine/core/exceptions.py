"""
RESQ-ENG-SPEC-2026-001 — Domain-Specific Typed Exceptions
"""

class PhysicsEngineException(Exception):
    """Base class for all physics kernel domain exceptions."""
    pass


class InvalidCoordinatesException(PhysicsEngineException):
    """Raised when geographic or Cartesian coordinates fall outside physical validity limits."""
    pass


class InvalidWindDirectionException(PhysicsEngineException):
    """Raised when wind direction angle is outside valid angular domains."""
    pass


class UnitConversionException(PhysicsEngineException):
    """Raised when unit conversion fails or unsupported units are requested."""
    pass


class DomainException(PhysicsEngineException):
    """Raised when a mathematical operation encounters an invalid parameter domain."""
    pass


class SingularityException(PhysicsEngineException):
    """Raised when a calculation approaches a geometric or numerical singularity."""
    pass


class SchemaValidationException(PhysicsEngineException):
    """Raised when scenario input schema validation fails."""
    pass


class UnknownMaterialException(PhysicsEngineException):
    """Raised when an unlisted fuel or chemical material is queried."""
    pass


class InconsistentGeometryException(PhysicsEngineException):
    """Raised when physical geometries are mutually inconsistent."""
    pass


class InvalidSourceParameterException(PhysicsEngineException):
    """Raised when source parameters are outside physically viable ranges."""
    pass


class NegativeConsequenceException(PhysicsEngineException):
    """Raised when an unphysical negative thermal flux or overpressure is evaluated."""
    pass


class EnergyConservationException(PhysicsEngineException):
    """Raised when radiative flux violates energy conservation principles."""
    pass
