import hashlib
from django.db import models

class BlueprintUploadCache(models.Model):
    image_hash = models.CharField(max_length=64, unique=True, db_index=True)
    file_name = models.CharField(max_length=255, blank=True)
    site_name = models.CharField(max_length=255, default='Industrial Facility')
    image_width = models.IntegerField(default=1200)
    image_height = models.IntegerField(default=900)
    analysis_json = models.JSONField(default=dict)
    confidence = models.FloatField(default=0.90)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.site_name} ({self.image_hash[:8]})"

class HumanCorrectionLog(models.Model):
    """Stores human verification overrides for future ML fine-tuning & model retraining."""
    image_hash = models.CharField(max_length=64, db_index=True)
    asset_id = models.CharField(max_length=64)
    bbox_json = models.JSONField(default=dict)
    raw_prediction = models.CharField(max_length=64)
    corrected_class = models.CharField(max_length=64)
    ocr_context = models.TextField(blank=True)
    confidence = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Correction {self.asset_id}: {self.raw_prediction} -> {self.corrected_class}"
