-- ============================================================================
-- MATCHOP V3: SEED with GEODATA
-- Run AFTER seed_v2.sql and matching_engine.sql
-- ============================================================================

-- 1. UPDATE EXISTING (If they exist from seed_v2)
-- ============================================================================

-- InstaDeep (Tunis Centre)
UPDATE companies 
SET location_point = gis.ST_SetSRID(gis.ST_MakePoint(10.1815, 36.8065), 4326) -- Long, Lat
WHERE company_name = 'InstaDeep';

-- Vermeg (Les Berges du Lac)
UPDATE companies 
SET location_point = gis.ST_SetSRID(gis.ST_MakePoint(10.2300, 36.8300), 4326) 
WHERE company_name = 'Vermeg';

-- Student Ahmed (Ariana)
UPDATE students
SET location_point = gis.ST_SetSRID(gis.ST_MakePoint(10.1800, 36.8600), 4326)
WHERE display_name = 'Ahmed Tounsi';


-- 2. ADD NEW OFFERS with LOCATIONS
-- ============================================================================
DO $$
DECLARE
    comp_id UUID;
    offer_id UUID;
BEGIN
    SELECT id INTO comp_id FROM companies WHERE company_name = 'Vermeg' LIMIT 1;
    
    IF comp_id IS NOT NULL THEN
        -- Sousse Offer (Far from Ahmed in Tunis)
        INSERT INTO offers (company_id, title, req_skills, location, location_point, status)
        VALUES (
            comp_id, 
            'Java Dev (Sousse)', 
            ARRAY['Java', 'Spring'], 
            'Sousse', 
            gis.ST_SetSRID(gis.ST_MakePoint(10.6084, 35.8256), 4326),
            'active'
        );

        -- Tunis Offer (Near Ahmed)
        INSERT INTO offers (company_id, title, req_skills, location, location_point, status)
        VALUES (
            comp_id, 
            'Java Dev (Tunis - Lac)', 
            ARRAY['Java', 'Spring'], 
            'Tunis', 
            gis.ST_SetSRID(gis.ST_MakePoint(10.2300, 36.8300), 4326),
            'active'
        );
    END IF;
END $$;


SELECT '✅ V3 Seed Data Applied (Geospatial coordinates)' as status;
