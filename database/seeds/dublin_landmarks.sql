-- ===========================================
-- Seed Data: Dublin Landmarks
-- ===========================================
-- 20+ Dublin landmarks with real coordinates, categories, and accessibility info

INSERT INTO landmarks (name, latitude, longitude, category, accessibility_level, is_indoor, description, points, avg_visit_duration_min, tier, tags) VALUES

-- Historical Landmarks
('Trinity College Dublin', 53.3440, -6.2545, 'historical', 5, false, 'Irelands oldest university, founded in 1592.', 20, 60, 'public', ARRAY['iconic', 'popular', 'morning-vibe']),
('Dublin Castle', 53.3428, -6.2673, 'historical', 3, true, 'Historic castle dating back to 1204.', 25, 45, 'public', ARRAY['landmark', 'historic']),
('GPO (General Post Office)', 53.3492, -6.2601, 'historical', 5, true, 'Iconic building on OConnell Street.', 15, 30, 'public', ARRAY['historic', 'landmark']),
('Kilmainham Gaol', 53.3419, -6.3101, 'historical', 2, true, 'Former prison turned museum.', 25, 60, 'discovered', ARRAY['iconic', 'shelter', 'morning-vibe']),
('Christ Church Cathedral', 53.3433, -6.2712, 'historical', 2, true, 'Medieval cathedral founded c. 1030.', 20, 45, 'discovered', ARRAY['landmark', 'historic', 'morning-vibe']),
('St. Patricks Cathedral', 53.3392, -6.2714, 'historical', 2, true, 'Irelands largest cathedral, founded in 1191.', 20, 40, 'public', ARRAY['landmark', 'historic']),

-- Cultural Landmarks
('Temple Bar', 53.3454, -6.2642, 'cultural', 5, false, 'Dublins cultural quarter known for its vibrant nightlife.', 15, 45, 'public', ARRAY['food', 'popular', 'nightlife']),
('Guinness Storehouse', 53.3418, -6.2867, 'cultural', 5, true, 'Irelands top visitor attraction.', 30, 90, 'discovered', ARRAY['iconic', 'popular', 'landmark']),
('EPIC The Irish Emigration Museum', 53.3478, -6.2476, 'cultural', 5, true, 'Award-winning interactive museum.', 20, 60, 'discovered', ARRAY['interactive', 'shelter']),
('National Gallery of Ireland', 53.3407, -6.2523, 'cultural', 5, true, 'Houses an extensive collection of Irish and European art.', 15, 60, 'public', ARRAY['art', 'landmark', 'shelter']),
('Jameson Distillery Bow St.', 53.3482, -6.2773, 'cultural', 5, true, 'Interactive whiskey experience.', 25, 60, 'discovered', ARRAY['food', 'interactive', 'popular']),
('National Museum of Ireland', 53.3405, -6.2551, 'cultural', 5, true, 'Free museum showcasing Irish archaeology.', 15, 45, 'public', ARRAY['historical', 'shelter', 'landmark']),

-- Nature Landmarks
('St. Stephens Green', 53.3377, -6.2591, 'nature', 5, false, 'Beautiful Victorian public park.', 10, 30, 'public', ARRAY['outdoor', 'accessible', 'nature']),
('Phoenix Park', 53.3561, -6.3294, 'nature', 5, false, 'One of Europes largest enclosed city parks.', 20, 90, 'public', ARRAY['outdoor', 'nature', 'popular']),
('Merrion Square', 53.3392, -6.2487, 'nature', 5, false, 'Georgian square with beautiful gardens.', 10, 20, 'public', ARRAY['scenic', 'art', 'quiet']),

-- Shopping
('Grafton Street', 53.3415, -6.2593, 'shopping', 5, false, 'Dublins premier shopping street.', 10, 30, 'public', ARRAY['food', 'popular', 'interactive']),

-- Sports
('Croke Park', 53.3606, -6.2515, 'sports', 5, false, 'Irelands largest sports stadium.', 20, 60, 'discovered', ARRAY['landmark', 'iconic']),

-- Architecture
('Custom House', 53.3481, -6.2526, 'architecture', 5, false, 'Stunning 18th-century neoclassical building.', 10, 15, 'discovered', ARRAY['scenic', 'architecture']),

-- Landmark
('Hapenny Bridge', 53.3464, -6.2634, 'landmark', 5, false, 'Iconic pedestrian bridge over the River Liffey.', 10, 10, 'public', ARRAY['scenic', 'landmark', 'popular']),

-- Campus / Docklands
('Canvas Point Campus', 53.3492999, -6.2317608, 'architecture', 5, true, 'Modern campus hub in the Dublin Docklands, blending creative workspace and urban design.', 15, 30, 'discovered', ARRAY['modern', 'architecture', 'campus', 'docklands']);
