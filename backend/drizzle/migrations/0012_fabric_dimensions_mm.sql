ALTER TABLE "fabrics" RENAME COLUMN "image_width_cm" TO "image_width_mm";
--> statement-breakpoint
ALTER TABLE "fabrics" RENAME COLUMN "image_height_cm" TO "image_height_mm";
--> statement-breakpoint
ALTER TABLE "fabrics" RENAME COLUMN "area" TO "area_mm2";
--> statement-breakpoint
-- Older API-created rows stored centimeter geometry and raw cm² area; seeded
-- rows already use millimeter geometry but stored area in m².
UPDATE "fabrics"
SET
  "boundary" = CASE
    WHEN "area_mm2" = ST_Area("boundary")
      THEN ST_ForcePolygonCCW(ST_Scale("boundary", 10, 10))
    ELSE ST_ForcePolygonCCW("boundary")
  END,
  "image_width_mm" = CASE
    WHEN "area_mm2" = ST_Area("boundary")
      THEN ROUND("image_width_mm" * 10)::integer
    ELSE ROUND("image_width_mm")::integer
  END,
  "image_height_mm" = CASE
    WHEN "area_mm2" = ST_Area("boundary")
      THEN ROUND("image_height_mm" * 10)::integer
    ELSE ROUND("image_height_mm")::integer
  END,
  "area_mm2" = CASE
    WHEN "area_mm2" = ST_Area("boundary")
      THEN ST_Area(ST_Scale("boundary", 10, 10))
    ELSE "area_mm2" * 1000000.0
  END;
--> statement-breakpoint
ALTER TABLE "fabrics"
  ALTER COLUMN "image_width_mm" TYPE integer USING ROUND("image_width_mm")::integer,
  ALTER COLUMN "image_height_mm" TYPE integer USING ROUND("image_height_mm")::integer,
  ALTER COLUMN "area_mm2" TYPE bigint USING ROUND("area_mm2")::bigint;